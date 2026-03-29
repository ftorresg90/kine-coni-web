// ---------------------------------------------------------------------------
// Date utilities — America/Santiago timezone
// ---------------------------------------------------------------------------
// All helpers operate on ISO 8601 / TIMESTAMPTZ strings from Supabase and
// format them into human-readable Spanish strings for notification templates.
// ---------------------------------------------------------------------------

const TZ = 'America/Santiago'

/**
 * Format a TIMESTAMPTZ string into a Spanish long-date string.
 * Example: "2026-04-15T14:00:00+00:00" → "miércoles 15 de abril"
 *
 * @param {string} isoString  ISO 8601 date string.
 * @returns {string}
 */
export function formatFechaCita(isoString) {
  const date = new Date(isoString)
  return date.toLocaleDateString('es-CL', {
    timeZone: TZ,
    weekday: 'long',
    day:     'numeric',
    month:   'long',
  })
}

/**
 * Format a TIMESTAMPTZ string into an HH:MM time string (24-hour).
 * Example: "2026-04-15T14:00:00+00:00" → "14:00"
 *
 * @param {string} isoString  ISO 8601 date string.
 * @returns {string}
 */
export function formatHoraCita(isoString) {
  const date = new Date(isoString)
  return date.toLocaleTimeString('es-CL', {
    timeZone: TZ,
    hour:     '2-digit',
    minute:   '2-digit',
    hour12:   false,
  })
}

/**
 * Return the start and end of today (America/Santiago) as ISO strings.
 * These are used to query all appointments for the current day.
 *
 * @returns {{ startOfDay: string, endOfDay: string }}
 */
export function getTodayBoundsSantiago() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year:  'numeric',
    month: '2-digit',
    day:   '2-digit',
  })

  const todayStr = formatter.format(new Date())   // "YYYY-MM-DD"

  // Build a Date representing midnight in Santiago.
  // We rely on the offset notation rather than the tz abbreviation because
  // America/Santiago uses DST: UTC-4 in summer, UTC-3 in winter.
  // Using toISOString on a Date constructed at the exact offset handles DST
  // correctly because JS Date is always UTC internally.
  const startOfDayLocal = new Date(`${todayStr}T00:00:00`)
  const endOfDayLocal   = new Date(`${todayStr}T23:59:59`)

  // Now convert these "Santiago-local" naive dates to UTC by knowing the
  // actual UTC offset at that moment. We use Intl to get the current offset.
  const offsetMs = getSantiagoOffsetMs()

  const startOfDay = new Date(startOfDayLocal.getTime() - offsetMs).toISOString()
  const endOfDay   = new Date(endOfDayLocal.getTime()   - offsetMs).toISOString()

  return { startOfDay, endOfDay, todayStr }
}

/**
 * Returns the current UTC offset for America/Santiago in milliseconds.
 * Handles DST transitions correctly by using Intl.DateTimeFormat.
 *
 * America/Santiago is UTC-4 in summer (CLST) and UTC-3 in winter (CLT),
 * which are the Southern Hemisphere seasons (opposite of Northern).
 *
 * @returns {number}  Offset in milliseconds (positive = behind UTC).
 */
function getSantiagoOffsetMs() {
  const now = new Date()
  // Parse the same instant in UTC and in Santiago to find the gap.
  const utcParts = getDateParts(now, 'UTC')
  const tzParts  = getDateParts(now, TZ)

  const utcMs = Date.UTC(utcParts.year, utcParts.month - 1, utcParts.day, utcParts.hour, utcParts.minute)
  const tzMs  = Date.UTC(tzParts.year,  tzParts.month  - 1, tzParts.day,  tzParts.hour,  tzParts.minute)

  return utcMs - tzMs
}

/**
 * @param {Date} date
 * @param {string} timeZone
 * @returns {{ year: number, month: number, day: number, hour: number, minute: number }}
 */
function getDateParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year:   'numeric',
    month:  '2-digit',
    day:    '2-digit',
    hour:   '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = {}
  for (const { type, value } of fmt.formatToParts(date)) {
    if (type !== 'literal') parts[type] = Number(value)
  }

  return parts
}

/**
 * Format a Date or ISO string into a short day label for the daily summary.
 * Example: "2026-04-15T14:00:00+00:00" → "miércoles 15 de abril de 2026"
 *
 * @param {Date|string} date
 * @returns {string}
 */
export function formatFechaLarga(date) {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('es-CL', {
    timeZone: TZ,
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  })
}
