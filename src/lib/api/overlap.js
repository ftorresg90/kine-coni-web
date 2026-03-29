import { conflict, internalError } from './response'

/**
 * Check whether a proposed [starts_at, ends_at) window overlaps any existing
 * active appointment for the single resource (the kinesiologist).
 *
 * Overlap condition (half-open intervals):
 *   existing.starts_at < proposed.ends_at
 *   AND existing.ends_at > proposed.starts_at
 *
 * This covers all overlap cases:
 *   - new appointment starts inside existing
 *   - new appointment ends inside existing
 *   - new appointment fully contains existing
 *   - new appointment is fully contained by existing
 *
 * @param {object} params
 * @param {import('@supabase/supabase-js').SupabaseClient} params.supabase
 *   An already-authenticated Supabase server client.
 * @param {string}      params.startsAt  ISO 8601 start datetime
 * @param {string}      params.endsAt    ISO 8601 end datetime
 * @param {string|null} [params.excludeId]
 *   UUID of the appointment being updated — excluded from the check so an
 *   appointment can be rescheduled to its own current time slot without
 *   triggering a self-conflict.
 *
 * @returns {Promise<{ response: import('next/server').NextResponse } | null>}
 *   Returns null when there is no conflict.
 *   Returns { response } containing a 409 NextResponse when conflict found.
 *   Returns { response } containing a 500 NextResponse on DB error.
 */
export async function checkOverlap({ supabase, startsAt, endsAt, excludeId = null }) {
  // Build a PostgREST query that checks half-open interval overlap.
  // The filter uses raw PostgREST operators because Supabase JS client does
  // not expose a native "overlaps" operator for timestamptz ranges.
  //
  // SQL equivalent:
  //   SELECT * FROM appointments
  //   WHERE status IN ('scheduled', 'confirmed')
  //     AND starts_at < $endsAt
  //     AND ends_at   > $startsAt
  //     AND id <> $excludeId       -- only when updating
  //   LIMIT 1

  let query = supabase
    .from('appointments')
    .select('id, patient_id, starts_at, ends_at, status, service')
    .in('status', ['scheduled', 'confirmed'])
    .lt('starts_at', endsAt)    // existing starts before proposed end
    .gt('ends_at', startsAt)    // existing ends after proposed start
    .limit(1)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[checkOverlap] Supabase error:', error)
    return { response: internalError('Error al verificar disponibilidad del horario.', 'OVERLAP_CHECK_ERROR') }
  }

  if (data && data.length > 0) {
    const existing = data[0]
    const formattedStart = new Date(existing.starts_at).toLocaleString('es-CL', {
      timeZone: 'America/Santiago',
      dateStyle: 'short',
      timeStyle: 'short',
    })
    const formattedEnd = new Date(existing.ends_at).toLocaleString('es-CL', {
      timeZone: 'America/Santiago',
      timeStyle: 'short',
    })
    // Expose only non-sensitive fields — never return patient_id to the client.
    const safeConflict = {
      id:         existing.id,
      starts_at:  existing.starts_at,
      ends_at:    existing.ends_at,
      status:     existing.status,
      service:    existing.service,
    }
    return {
      response: conflict(
        `El horario solicitado se superpone con una cita existente (${formattedStart} – ${formattedEnd}).`,
        safeConflict
      ),
    }
  }

  return null  // no conflict
}
