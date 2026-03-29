// ---------------------------------------------------------------------------
// POST /api/notifications/new-appointment
// ---------------------------------------------------------------------------
// Called from the admin frontend immediately after a new appointment is
// created. Sends two notifications in parallel:
//   1. WhatsApp confirmation → patient (if phone present)
//   2. Email confirmation    → patient (if email present)
//   3. Telegram alert        → kinesiologist (always)
//
// Authorization:
//   Requires an active Supabase session (admin only) via requireAuth.
//   This is NOT a cron endpoint — it is called interactively by the admin UI.
//
// Request body:
//   { appointmentId: string }   — UUID of the newly created appointment
//
// Response:
//   200 { ok: true, channels: { whatsapp?, email?, telegram? } }
//
// Fault tolerance:
//   Each channel is attempted independently. A failure in one channel does
//   NOT prevent the others from being sent, and does NOT return a 500.
//   The response always carries per-channel results so the caller can log
//   or surface channel-level failures in the UI.
//
// Note on notification_sent_at:
//   This field is intentionally NOT updated here. It is reserved exclusively
//   for the /api/notifications/remind cron to track which appointments have
//   received their 24-hour reminder. Confirmation notifications are a
//   different event and must not set that flag.
//
// Required environment variables:
//   TWILIO_ACCOUNT_SID      — Twilio Account SID
//   TWILIO_AUTH_TOKEN       — Twilio Auth Token
//   TWILIO_WHATSAPP_FROM    — Twilio WhatsApp sender number
//   RESEND_API_KEY          — Resend API key
//   RESEND_FROM_EMAIL       — Verified sender address in Resend
//   TELEGRAM_BOT_TOKEN      — Telegram bot token
//   TELEGRAM_CHAT_ID        — Coni's Telegram chat ID
// ---------------------------------------------------------------------------

import { requireAuth }               from '@/lib/api/auth'
import { badRequest, internalError } from '@/lib/api/response'
import { sendWhatsApp, sendEmail, sendTelegram } from '@/lib/notifications/senders'
import { formatFechaCita, formatHoraCita }       from '@/lib/dateUtils'

export async function POST(request) {
  // ── 1. Authorize (admin session required) ─────────────────────────────────
  const { supabase, response: authError } = await requireAuth()
  if (authError) return authError

  // ── 2. Parse and validate body ────────────────────────────────────────────
  let body
  try {
    body = await request.json()
  } catch {
    return badRequest('El cuerpo de la solicitud no es JSON válido.')
  }

  const { appointmentId } = body ?? {}

  if (!appointmentId || typeof appointmentId !== 'string' || !appointmentId.trim()) {
    return badRequest('El campo appointmentId es obligatorio.', 'VALIDATION_ERROR')
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(appointmentId.trim())) {
    return badRequest('El campo appointmentId debe ser un UUID válido.', 'VALIDATION_ERROR')
  }

  // ── 3. Fetch appointment + patient data ───────────────────────────────────
  const { data: appt, error: fetchError } = await supabase
    .from('appointments')
    .select(`
      id,
      starts_at,
      ends_at,
      service,
      location,
      status,
      patient_id,
      patients (
        id,
        full_name,
        phone,
        email,
        address
      )
    `)
    .eq('id', appointmentId.trim())
    .single()

  if (fetchError || !appt) {
    console.error('[POST /api/notifications/new-appointment] fetch error:', fetchError)
    return badRequest('Cita no encontrada.', 'APPOINTMENT_NOT_FOUND')
  }

  const patient = appt.patients

  if (!patient) {
    return internalError('Paciente asociado a la cita no encontrado.')
  }

  // ── 4. Determine session number ───────────────────────────────────────────
  // Count previous non-cancelled appointments for this patient that started
  // before the current appointment to compute the session ordinal.
  const { count: prevCount } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('patient_id', appt.patient_id)
    .neq('status', 'cancelled')
    .lt('starts_at', appt.starts_at)

  const sessionNumber  = (prevCount ?? 0) + 1
  const isFirstSession = sessionNumber === 1

  // ── 5. Build template variable maps ──────────────────────────────────────
  const firstName  = patient.full_name.split(' ')[0]
  const ubicacion  = appt.location ?? patient.address ?? 'A confirmar'

  // WhatsApp + Email share most variables
  const patientVars = {
    nombre_paciente_corto: firstName,
    nombre_paciente:       patient.full_name,
    fecha_cita:            formatFechaCita(appt.starts_at),
    hora_cita:             formatHoraCita(appt.starts_at),
    hora_fin_cita:         formatHoraCita(appt.ends_at),
    servicio:              appt.service,
    direccion_paciente:    ubicacion,
    numero_sesion:         sessionNumber,
  }

  // Telegram variables
  const telegramVars = {
    nombre_paciente:    patient.full_name,
    telefono_paciente:  patient.phone ?? '—',
    fecha_cita:         formatFechaCita(appt.starts_at),
    hora_cita:          formatHoraCita(appt.starts_at),
    hora_fin_cita:      formatHoraCita(appt.ends_at),
    servicio:           appt.service,
    direccion_paciente: ubicacion,
    numero_sesion:      sessionNumber,
  }

  const opts = { isFirstSession }

  // ── 6. Send notifications (all channels run independently) ────────────────
  const channels = {}

  // 6a. WhatsApp → patient
  if (patient.phone) {
    channels.whatsapp = await sendWhatsApp(patient.phone, 'confirmacion', patientVars, opts)
  }

  // 6b. Email → patient
  if (patient.email) {
    channels.email = await sendEmail(patient.email, 'confirmacion', patientVars, opts)
  }

  // 6c. Telegram → kinesiologist
  channels.telegram = await sendTelegram('nueva_cita', telegramVars, opts)

  // ── 7. Return results ─────────────────────────────────────────────────────
  return Response.json({ ok: true, channels })
}
