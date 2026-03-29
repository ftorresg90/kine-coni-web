// ---------------------------------------------------------------------------
// GET /api/notifications/remind
// ---------------------------------------------------------------------------
// Cron-triggered endpoint that sends 24-hour reminder notifications to
// patients whose appointments are between now+23h and now+25h and have
// not yet received a reminder (notification_sent_at IS NULL).
//
// Schedule recommendation (Vercel Cron / external cron):
//   Run daily at 09:00 America/Santiago — this targets tomorrow's sessions.
//   Cron expression (UTC, accounting for Santiago UTC-4 summer): 0 13 * * *
//   (Adjust to 0 12 * * * in winter when Santiago is UTC-3.)
//
// Authorization:
//   Header: Authorization: Bearer <CRON_SECRET>
//
// Response:
//   200 { sent: N, errors: [{ appointmentId, channel, error }] }
//
// Fault tolerance:
//   Each channel failure is caught independently. If WhatsApp fails for a
//   patient, the email attempt still runs, and vice versa. The appointment's
//   notification_sent_at is marked regardless of channel failures so that
//   the cron does not retry the same appointment on the next run and produce
//   duplicate messages on whichever channels did succeed.
//
// Required environment variables:
//   CRON_SECRET             — Shared secret for cron route authorization
//   TWILIO_ACCOUNT_SID      — Twilio Account SID
//   TWILIO_AUTH_TOKEN       — Twilio Auth Token
//   TWILIO_WHATSAPP_FROM    — Twilio WhatsApp sender number
//   RESEND_API_KEY          — Resend API key
//   RESEND_FROM_EMAIL       — Verified sender address in Resend
// ---------------------------------------------------------------------------

import { createServiceClient } from '@/lib/supabase/service'
import { requireCron }         from '@/lib/api/cron'
import { sendWhatsApp, sendEmail } from '@/lib/notifications/senders'
import { formatFechaCita, formatHoraCita } from '@/lib/dateUtils'

export async function GET(request) {
  // ── 1. Authorize ──────────────────────────────────────────────────────────
  const authError = requireCron(request)
  if (authError) return authError

  // Service-role client bypasses RLS — cron has no user session cookie.
  const supabase = createServiceClient()

  // ── 2. Time window: appointments starting between now+23h and now+25h ─────
  const now       = new Date()
  const windowMin = new Date(now.getTime() + 23 * 60 * 60 * 1000)
  const windowMax = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  // ── 3. Query pending reminder appointments ────────────────────────────────
  const { data: appointments, error: queryError } = await supabase
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
    .in('status', ['scheduled', 'confirmed'])
    .gte('starts_at', windowMin.toISOString())
    .lte('starts_at', windowMax.toISOString())
    .is('notification_sent_at', null)

  if (queryError) {
    console.error('[GET /api/notifications/remind] DB query error:', queryError)
    return Response.json(
      { error: 'Error al consultar citas.', code: 'DB_ERROR' },
      { status: 500 }
    )
  }

  if (!appointments || appointments.length === 0) {
    return Response.json({ notificationsSent: 0, appointmentsProcessed: 0, errors: [], message: 'No hay citas en el rango.' })
  }

  // ── 4. Process each appointment ───────────────────────────────────────────
  // notificationsSent counts individual channel messages delivered (one patient
  // with both phone + email counts as 2). appointmentsProcessed counts distinct
  // appointments that were attempted, regardless of channel outcomes.
  let notificationsSent      = 0
  let appointmentsProcessed  = 0
  const errors = []

  for (const appt of appointments) {
    const patient = appt.patients

    if (!patient) {
      errors.push({ appointmentId: appt.id, channel: 'all', error: 'Paciente no encontrado.' })
      continue
    }

    appointmentsProcessed++

    // Determine if this is a first session for the patient.
    // Exclude both 'cancelled' and 'no_show' so they don't count as prior sessions.
    const { count: prevCount } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('patient_id', appt.patient_id)
      .not('status', 'in', '("cancelled","no_show")')
      .lt('starts_at', appt.starts_at)

    const isFirstSession = (prevCount ?? 0) === 0

    // Build template variables
    const nombreCorto = patient.full_name.split(' ')[0]
    const variables = {
      nombre_paciente_corto: nombreCorto,
      nombre_paciente:       patient.full_name,
      fecha_cita:            formatFechaCita(appt.starts_at),
      hora_cita:             formatHoraCita(appt.starts_at),
      hora_fin_cita:         formatHoraCita(appt.ends_at),
      servicio:              appt.service,
      direccion_paciente:    appt.location ?? patient.address ?? 'A confirmar',
    }

    const opts = { isFirstSession }

    // ── 4a. WhatsApp ─────────────────────────────────────────────────────
    if (patient.phone) {
      const result = await sendWhatsApp(patient.phone, 'recordatorio_24h', variables, opts)
      if (result.ok) {
        notificationsSent++
      } else {
        errors.push({ appointmentId: appt.id, channel: 'whatsapp', error: result.error })
      }
    }

    // ── 4b. Email ─────────────────────────────────────────────────────────
    if (patient.email) {
      const result = await sendEmail(patient.email, 'recordatorio_24h', variables, opts)
      if (result.ok) {
        notificationsSent++
      } else {
        errors.push({ appointmentId: appt.id, channel: 'email', error: result.error })
      }
    }

    // ── 4c. Mark notification as sent regardless of channel outcomes ──────
    // This prevents the cron from re-processing the same appointment and
    // sending duplicate notifications on channels that succeeded.
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ notification_sent_at: new Date().toISOString() })
      .eq('id', appt.id)

    if (updateError) {
      console.error(
        `[remind] Error al actualizar notification_sent_at para cita ${appt.id}:`,
        updateError
      )
      errors.push({
        appointmentId: appt.id,
        channel:       'db_update',
        error:         updateError.message,
      })
    }
  }

  // ── 5. Return summary ─────────────────────────────────────────────────────
  return Response.json({ notificationsSent, appointmentsProcessed, errors })
}
