/**
 * Unit tests for src/lib/api/overlap.js
 *
 * Strategy: the module uses a Supabase client only to build a chained query.
 * We build a minimal fluent mock that captures the final call and returns
 * whatever we configure per test scenario.
 *
 * The module also imports `conflict` and `internalError` from
 * '@/lib/api/response' which use NextResponse.  We stub next/server so
 * the tests run outside the Next.js runtime.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Stub next/server before importing the module under test
// ---------------------------------------------------------------------------
vi.mock('next/server', () => {
  const NextResponse = {
    json: (body, init) => ({ body, status: init?.status ?? 200, _isNextResponse: true }),
  }
  return { NextResponse }
})

// Import after mock is in place
const { checkOverlap } = await import('@/lib/api/overlap.js')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a fluent Supabase mock.
 *
 * The checkOverlap implementation chains as:
 *   .select().in().lt().gt().limit(1)  [then optionally .neq()]  → await
 *
 * So .limit() must return the chain (not a resolved Promise), and the chain
 * itself must be awaitable (thenable) so `const { data, error } = await query`
 * works whether or not .neq() is called afterwards.
 */
function makeSupabaseMock({ data = [], error = null } = {}) {
  const terminal = Promise.resolve({ data, error })

  const query = {
    select: vi.fn().mockReturnThis(),
    in:     vi.fn().mockReturnThis(),
    lt:     vi.fn().mockReturnThis(),
    gt:     vi.fn().mockReturnThis(),
    neq:    vi.fn().mockReturnThis(),
    limit:  vi.fn().mockReturnThis(),
    // Make the chain awaitable
    then:    terminal.then.bind(terminal),
    catch:   terminal.catch.bind(terminal),
    finally: terminal.finally.bind(terminal),
  }

  const supabase = {
    from: vi.fn().mockReturnValue(query),
    _query: query,
  }

  return supabase
}

/** Fixed times used across tests (ISO 8601 UTC strings). */
const T = {
  '09:00': '2026-04-15T09:00:00Z',
  '10:00': '2026-04-15T10:00:00Z',
  '10:30': '2026-04-15T10:30:00Z',
  '11:00': '2026-04-15T11:00:00Z',
  '12:00': '2026-04-15T12:00:00Z',
  '13:00': '2026-04-15T13:00:00Z',
}

const EXISTING_APPT = {
  id:         'existing-uuid-1',
  patient_id: 'patient-uuid-1',
  starts_at:  T['10:00'],
  ends_at:    T['11:00'],
  status:     'scheduled',
  service:    'Kinesiotaping',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('checkOverlap', () => {
  // ── No conflict scenarios ─────────────────────────────────────────────────

  describe('when there is no conflicting appointment', () => {
    it('returns null for a non-overlapping slot (completely before)', async () => {
      const supabase = makeSupabaseMock({ data: [] })
      const result = await checkOverlap({
        supabase,
        startsAt: T['09:00'],
        endsAt:   T['10:00'],
      })
      expect(result).toBeNull()
    })

    it('returns null for a non-overlapping slot (completely after)', async () => {
      const supabase = makeSupabaseMock({ data: [] })
      const result = await checkOverlap({
        supabase,
        startsAt: T['11:00'],
        endsAt:   T['12:00'],
      })
      expect(result).toBeNull()
    })

    it('returns null for back-to-back appointments (10:00-11:00 then 11:00-12:00)', async () => {
      // Proposed: 11:00-12:00. Existing: 10:00-11:00.
      // Overlap condition: existing.starts_at < proposed.ends_at (10:00 < 12:00 = true)
      //                AND existing.ends_at   > proposed.starts_at (11:00 > 11:00 = false)
      // The query would return empty because the DB filter uses strict GT.
      // Our mock simulates the DB returning nothing.
      const supabase = makeSupabaseMock({ data: [] })
      const result = await checkOverlap({
        supabase,
        startsAt: T['11:00'],
        endsAt:   T['12:00'],
      })
      expect(result).toBeNull()
    })

    it('returns null when the only conflicting row is excluded via excludeId', async () => {
      // Simulates editing an existing appointment to the same time slot.
      // The DB filter excludes the appointment being updated so data = [].
      const supabase = makeSupabaseMock({ data: [] })
      const result = await checkOverlap({
        supabase,
        startsAt:  T['10:00'],
        endsAt:    T['11:00'],
        excludeId: EXISTING_APPT.id,
      })
      expect(result).toBeNull()
    })
  })

  // ── Conflict scenarios ────────────────────────────────────────────────────

  describe('when there IS a conflicting appointment', () => {
    it('returns a 409 response when new slot starts inside an existing one', async () => {
      // Proposed: 10:30-12:00 — starts inside 10:00-11:00
      const supabase = makeSupabaseMock({ data: [EXISTING_APPT] })
      const result = await checkOverlap({
        supabase,
        startsAt: T['10:30'],
        endsAt:   T['12:00'],
      })
      expect(result).not.toBeNull()
      expect(result.response.status).toBe(409)
      expect(result.response.body.code).toBe('APPOINTMENT_OVERLAP')
    })

    it('returns a 409 response when new slot ends inside an existing one', async () => {
      // Proposed: 09:00-10:30 — ends inside 10:00-11:00
      const supabase = makeSupabaseMock({ data: [EXISTING_APPT] })
      const result = await checkOverlap({
        supabase,
        startsAt: T['09:00'],
        endsAt:   T['10:30'],
      })
      expect(result).not.toBeNull()
      expect(result.response.status).toBe(409)
    })

    it('returns a 409 when new slot fully contains an existing one', async () => {
      // Proposed: 09:00-13:00 wraps around 10:00-11:00
      const supabase = makeSupabaseMock({ data: [EXISTING_APPT] })
      const result = await checkOverlap({
        supabase,
        startsAt: T['09:00'],
        endsAt:   T['13:00'],
      })
      expect(result).not.toBeNull()
      expect(result.response.status).toBe(409)
    })

    it('returns a 409 when new slot is fully contained within an existing one', async () => {
      // Proposed: 10:00-11:00 is exactly the existing slot (without excludeId)
      const supabase = makeSupabaseMock({ data: [EXISTING_APPT] })
      const result = await checkOverlap({
        supabase,
        startsAt: T['10:00'],
        endsAt:   T['11:00'],
      })
      expect(result).not.toBeNull()
      expect(result.response.status).toBe(409)
    })

    it('includes the conflicting appointment in the response body', async () => {
      const supabase = makeSupabaseMock({ data: [EXISTING_APPT] })
      const result = await checkOverlap({
        supabase,
        startsAt: T['10:30'],
        endsAt:   T['12:00'],
      })
      expect(result.response.body.conflict).toMatchObject({
        id:      EXISTING_APPT.id,
        status:  'scheduled',
      })
    })
  })

  // ── Cancelled / completed appointments do not conflict ───────────────────

  describe('cancelled and completed appointments', () => {
    it('does not conflict with a cancelled appointment (empty DB result)', async () => {
      // The query filters status IN ('scheduled','confirmed') so cancelled rows
      // are never returned by the DB. We simulate this by returning empty data.
      const supabase = makeSupabaseMock({ data: [] })
      const result = await checkOverlap({
        supabase,
        startsAt: T['10:00'],
        endsAt:   T['11:00'],
      })
      expect(result).toBeNull()
    })

    it('verifies the query chains .in("status", ["scheduled","confirmed"])', async () => {
      const supabase = makeSupabaseMock({ data: [] })
      await checkOverlap({ supabase, startsAt: T['10:00'], endsAt: T['11:00'] })

      // The `.in()` call on the query builder must receive the active statuses.
      const inCall = supabase._query.in.mock.calls[0]
      expect(inCall[0]).toBe('status')
      expect(inCall[1]).toEqual(['scheduled', 'confirmed'])
    })
  })

  // ── excludeId wiring ──────────────────────────────────────────────────────

  describe('excludeId', () => {
    it('does NOT add .neq() filter when excludeId is omitted', async () => {
      const supabase = makeSupabaseMock({ data: [] })
      await checkOverlap({ supabase, startsAt: T['10:00'], endsAt: T['11:00'] })
      expect(supabase._query.neq).not.toHaveBeenCalled()
    })

    it('adds .neq("id", excludeId) filter when excludeId is provided', async () => {
      const supabase = makeSupabaseMock({ data: [] })
      await checkOverlap({
        supabase,
        startsAt:  T['10:00'],
        endsAt:    T['11:00'],
        excludeId: 'some-uuid',
      })
      expect(supabase._query.neq).toHaveBeenCalledWith('id', 'some-uuid')
    })
  })

  // ── Database error handling ───────────────────────────────────────────────

  describe('when the database returns an error', () => {
    it('returns a 500 response and does not throw', async () => {
      const supabase = makeSupabaseMock({ data: null, error: { message: 'connection refused' } })
      const result = await checkOverlap({
        supabase,
        startsAt: T['10:00'],
        endsAt:   T['11:00'],
      })
      expect(result).not.toBeNull()
      expect(result.response.status).toBe(500)
      expect(result.response.body.code).toBe('OVERLAP_CHECK_ERROR')
    })
  })
})
