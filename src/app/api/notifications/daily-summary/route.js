// ---------------------------------------------------------------------------
// GET /api/notifications/daily-summary
// ---------------------------------------------------------------------------
// Cron-triggered endpoint that sends the kinesiologist a Telegram message
// with the full agenda for the current day (America/Santiago).
//
// Schedule recommendation (Vercel Cron / external cron):
//   Run daily at 07:30 America/Santiago.
//   Cron expression (UTC, Santiago UTC-4 summer): 30 11 * * *
//   (Adjust to 30 10 * * * in winter when Santiago is UTC-3.)
//
// Authorization:
//   Header: Authorization: Bearer <CRON_SECRET>
//
// Response:
//   200 { ok: true, citasCount: N }
//
// Template selection:
//   - citasCount > 0  → uses TELEGRAM_TEMPLATES.resumen_diario
//   - citasCount === 0 → uses TELEGRAM_TEMPLATES.resumen_diario_vacio
//
// Each appointment line in the summary follows this format:
//   • 10:00 - 11:00 | María G. | Neurorehabilitación | Av. Libertad 1234
//
// Required environment variables:
//   CRON_SECRET          — Shared secret for cron route authorization
//   TELEGRAM_BOT_TOKEN   — Telegram bot token
//   TELEGRAM_CHAT_ID     — Coni's Telegram chat ID
// ---------------------------------------------------------------------------

import { createServiceClient } from '@/lib/supabase/service'
import { requireCron }         from '@/lib/api/cron'
import { sendTelegram }        from '@/lib/notifications/senders'
import {
  formatHoraCita,
  formatFechaLarga,
  getTodayBoundsSantiago,
} from '@/lib/dateUtils'

export async function GET(request) {
  // ── 1. Authorize ──────────────────────────────────────────────────────────
  const authError = requireCron(request)
  if (authError) return authError

  // Service-role client bypasses RLS — cron has no user session cookie.
  const supabase = createServiceClient()

  // ── 2. Compute today's date boundaries in America/Santiago ────────────────
  const { startOfDay, endOfDay, todayStr } = getTodayBoundsSantiago()

  // ── 3. Query today's appointments (non-cancelled, non-no_show) ────────────
  const { data: appointments, error: queryError } = await supabase
    .from('appointments')
    .select(`
      id,
      starts_at,
      ends_at,
      service,
      location,
      status,
      patients (
        id,
        full_name,
        address
      )
    `)
    .not('status', 'in', '("cancelled","no_show")')
    .gte('starts_at', startOfDay)
    .lte('starts_at', endOfDay)
    .order('starts_at', { ascending: true })

  if (queryError) {
    console.error('[GET /api/notifications/daily-summary] DB query error:', queryError)
    return Response.json(
      { error: 'Error al consultar citas.', code: 'DB_ERROR' },
      { status: 500 }
    )
  }

  const citasCount = appointments?.length ?? 0

  // ── 4a. No appointments today — send the empty variant ────────────────────
  if (citasCount === 0) {
    // Format a readable date label for today
    const todayDate   = new Date(`${todayStr}T12:00:00`)
    const fechaLegible = formatFechaLarga(todayDate)

    const result = await sendTelegram('resumen_diario_vacio', {
      fecha_cita: fechaLegible,
    })

    if (!result.ok) {
      return Response.json(
        { error: 'Error al enviar mensaje Telegram.', detail: result.error },
        { status: 500 }
      )
    }

    return Response.json({ ok: true, citasCount: 0 })
  }

  // ── 4b. Build the appointment list block ──────────────────────────────────
  //
  // Format per line:
  //   • 10:00 - 11:00 | María G. | Neurorehabilitación | Av. Libertad 1234
  //
  // Patient name is abbreviated to "Nombre A." to keep lines compact.
  const lines = appointments.map((appt) => {
    const patient       = appt.patients
    const fullName      = patient?.full_name ?? 'Paciente desconocido'
    const nameParts     = fullName.split(' ')
    // "María González Rojas" → "María G."
    const shortName     = nameParts.length >= 2
      ? `${nameParts[0]} ${nameParts[1][0]}.`
      : nameParts[0]

    const startTime  = formatHoraCita(appt.starts_at)
    const endTime    = formatHoraCita(appt.ends_at)
    const ubicacion  = appt.location ?? patient?.address ?? '—'

    return `• ${startTime} - ${endTime} | ${shortName} | ${appt.service} | ${ubicacion}`
  })

  // ── 4c. Format the date label for the template ────────────────────────────
  const todayDate    = new Date(`${todayStr}T12:00:00`)
  const fechaLegible = formatFechaLarga(todayDate)

  const variables = {
    fecha_cita:    fechaLegible,
    total_citas:   citasCount,
    citas_del_dia: lines.join('\n'),
  }

  // ── 4d. Send Telegram message ─────────────────────────────────────────────
  const result = await sendTelegram('resumen_diario', variables)

  if (!result.ok) {
    return Response.json(
      { error: 'Error al enviar mensaje Telegram.', detail: result.error },
      { status: 500 }
    )
  }

  return Response.json({ ok: true, citasCount })
}
