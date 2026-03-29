/**
 * Unit tests for POST/GET /api/admin/appointments/route.js
 *
 * Covers:
 *   POST — body validation, patient existence check, double-booking prevention
 *          (409), successful creation (201), DB insert error (500), auth guard.
 *   GET  — auth guard, query param validation, list response shape, DB error.
 *
 * Strategy:
 *   All external I/O (Supabase, overlap check, next/server) is stubbed with
 *   vi.mock() so the handlers execute synchronously in the Vitest Node.js
 *   environment without a real Next.js runtime.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// next/server mock
// ---------------------------------------------------------------------------
vi.mock('next/server', () => {
  const NextResponse = {
    json: (body, init) => ({
      body,
      status:          init?.status ?? 200,
      _isNextResponse: true,
    }),
  }
  return { NextResponse }
})

// ---------------------------------------------------------------------------
// Shared DB state
// ---------------------------------------------------------------------------
const db = {
  // patients select
  patient:      null,
  patientError: null,
  // appointments insert
  inserted:     null,
  insertError:  null,
  // appointments list (GET)
  list:    [],
  listCount: 0,
  listError:   null,
}

// ---------------------------------------------------------------------------
// Supabase mock factory
// ---------------------------------------------------------------------------

/**
 * Build a fluent Supabase mock whose behaviour depends on which table and
 * method sequence the route uses.
 *
 * - patients  → .select().eq().is().single()    resolves to patient select result
 * - appointments (POST) → .insert().select().single()  resolves to insert result
 * - appointments (GET)  → .select()...N filters...    thenable list result
 */
function makeSupabase() {
  function buildPatientChain() {
    return {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      is:     vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: db.patient, error: db.patientError }),
    }
  }

  function buildInsertChain() {
    return {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: db.inserted, error: db.insertError }),
    }
  }

  /**
   * Build a chain for the appointments GET list query.
   * The route does:
   *   supabase.from('appointments').select(...).order(...).range(...) → query
   *   if (from) query = query.gte(...)
   *   if (to)   query = query.lt(...)
   *   ...
   *   const { data, error, count } = await query
   *
   * Every chainable method must return a thenable object so that `await query`
   * works at any point in the chain.
   */
  function buildListChain() {
    const resolved = Promise.resolve({
      data:  db.list,
      error: db.listError,
      count: db.listCount,
    })

    const chain = {
      select:  vi.fn().mockReturnThis(),
      order:   vi.fn().mockReturnThis(),
      range:   vi.fn().mockReturnThis(),
      gte:     vi.fn().mockReturnThis(),
      lt:      vi.fn().mockReturnThis(),
      eq:      vi.fn().mockReturnThis(),
      in:      vi.fn().mockReturnThis(),
      // Make the chain itself awaitable
      then:    resolved.then.bind(resolved),
      catch:   resolved.catch.bind(resolved),
      finally: resolved.finally.bind(resolved),
    }

    // Each filter method must also return the same thenable chain
    for (const method of ['gte', 'lt', 'eq', 'in', 'order', 'range']) {
      chain[method] = vi.fn(() => chain)
    }

    return chain
  }

  let appointmentCallCount = 0

  const from = vi.fn((table) => {
    if (table === 'patients') return buildPatientChain()
    // appointments table is called once for insert (POST) or once for list (GET)
    appointmentCallCount++
    // During POST: first call is the insert chain (insert → select → single)
    // During GET:  first call is the list chain (select → order → range → ...)
    // We differentiate by whether db.inserted is set in context — but that's
    // fragile.  Instead, expose both method sets and let the route pick the
    // right one by method name.
    return buildCombinedApptChain()
  })

  /**
   * Combined chain that works for both insert (POST) and list (GET).
   * The .single() resolves to the insert result; the thenable resolves to
   * the list result.  The route always calls exactly one terminal.
   */
  function buildCombinedApptChain() {
    const listResolved = Promise.resolve({
      data:  db.list,
      error: db.listError,
      count: db.listCount,
    })

    const chain = {
      // insert path
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: db.inserted, error: db.insertError }),

      // select path (both GET list and insert's trailing .select())
      select: vi.fn().mockReturnThis(),
      order:  vi.fn().mockReturnThis(),
      range:  vi.fn().mockReturnThis(),
      gte:    vi.fn().mockReturnThis(),
      lt:     vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      in:     vi.fn().mockReturnThis(),
      is:     vi.fn().mockReturnThis(),

      // Make the chain awaitable for list query
      then:    listResolved.then.bind(listResolved),
      catch:   listResolved.catch.bind(listResolved),
      finally: listResolved.finally.bind(listResolved),
    }

    // All filter methods must also return the thenable chain
    for (const m of ['order', 'range', 'gte', 'lt', 'eq', 'in', 'is', 'select']) {
      chain[m] = vi.fn(() => chain)
    }

    return chain
  }

  return { from }
}

// ---------------------------------------------------------------------------
// requireAuth mock — returns a fresh supabase mock each time
// ---------------------------------------------------------------------------
vi.mock('@/lib/api/auth', () => ({
  requireAuth: vi.fn(async () => ({
    user:     { id: 'admin-user-id' },
    supabase: makeSupabase(),
  })),
}))

// ---------------------------------------------------------------------------
// checkOverlap mock
// ---------------------------------------------------------------------------
const mockCheckOverlap = vi.fn().mockResolvedValue(null)

vi.mock('@/lib/api/overlap', () => ({
  checkOverlap: (...args) => mockCheckOverlap(...args),
}))

// ---------------------------------------------------------------------------
// Import handlers after mocks
// ---------------------------------------------------------------------------
const { POST, GET } = await import('@/app/api/admin/appointments/route.js')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PATIENT_UUID = '660e8400-e29b-41d4-a716-446655440001'
const APPT_UUID    = '550e8400-e29b-41d4-a716-446655440000'

const VALID_PAYLOAD = {
  patient_id: PATIENT_UUID,
  starts_at:  '2026-06-10T10:00:00-04:00',
  ends_at:    '2026-06-10T11:00:00-04:00',
  service:    'Neurorehabilitación',
  status:     'scheduled',
}

const INSERTED_APPT = {
  id:         APPT_UUID,
  ...VALID_PAYLOAD,
  created_at: '2026-03-29T12:00:00Z',
  patients:   { id: PATIENT_UUID, full_name: 'María González', rut: null, phone: null },
}

function makePostRequest(body) {
  return {
    url:     'http://localhost/api/admin/appointments',
    method:  'POST',
    json:    vi.fn().mockResolvedValue(body),
    headers: { get: () => null },
  }
}

function makeGetRequest(searchParams = {}) {
  const url = new URL('http://localhost/api/admin/appointments')
  Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  return {
    url:     url.toString(),
    method:  'GET',
    headers: { get: () => null },
  }
}

beforeEach(() => {
  db.patient      = { id: PATIENT_UUID }
  db.patientError = null
  db.inserted     = INSERTED_APPT
  db.insertError  = null
  db.list         = []
  db.listCount    = 0
  db.listError    = null
  mockCheckOverlap.mockClear().mockResolvedValue(null)
})

// ---------------------------------------------------------------------------
// POST — input validation
// ---------------------------------------------------------------------------

describe('POST /api/admin/appointments', () => {

  describe('request body validation', () => {
    it('returns 400 when patient_id is missing', async () => {
      const req = makePostRequest({ starts_at: VALID_PAYLOAD.starts_at, ends_at: VALID_PAYLOAD.ends_at, service: 'Test' })
      const res = await POST(req)
      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    it('returns 400 when patient_id is not a valid UUID', async () => {
      const res = await POST(makePostRequest({ ...VALID_PAYLOAD, patient_id: 'not-a-uuid' }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when starts_at is not a valid ISO datetime', async () => {
      const res = await POST(makePostRequest({ ...VALID_PAYLOAD, starts_at: 'bad-date' }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when ends_at is before starts_at', async () => {
      const res = await POST(makePostRequest({
        ...VALID_PAYLOAD,
        starts_at: '2026-06-10T11:00:00-04:00',
        ends_at:   '2026-06-10T10:00:00-04:00',
      }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when duration is less than 15 minutes', async () => {
      const res = await POST(makePostRequest({
        ...VALID_PAYLOAD,
        starts_at: '2026-06-10T10:00:00-04:00',
        ends_at:   '2026-06-10T10:10:00-04:00',  // 10 minutes only
      }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when service field is absent', async () => {
      const { service: _removed, ...noService } = VALID_PAYLOAD
      const res = await POST(makePostRequest(noService))
      expect(res.status).toBe(400)
    })

    it('returns 400 when body is invalid JSON', async () => {
      const req = {
        ...makePostRequest(null),
        json: vi.fn().mockRejectedValue(new SyntaxError('bad json')),
      }
      const res = await POST(req)
      expect(res.status).toBe(400)
    })
  })

  // ── Patient existence check ───────────────────────────────────────────────

  describe('patient existence check', () => {
    it('returns 400 with PATIENT_NOT_FOUND when patient does not exist', async () => {
      db.patient      = null
      db.patientError = { message: 'no rows returned' }
      const res = await POST(makePostRequest(VALID_PAYLOAD))
      expect(res.status).toBe(400)
      expect(res.body.code).toBe('PATIENT_NOT_FOUND')
    })
  })

  // ── Double-booking prevention ─────────────────────────────────────────────

  describe('double-booking prevention', () => {
    it('returns 409 when checkOverlap finds a conflict', async () => {
      mockCheckOverlap.mockResolvedValueOnce({
        response: {
          body:   { error: 'Overlap', code: 'APPOINTMENT_OVERLAP', conflict: {} },
          status: 409,
        },
      })
      const res = await POST(makePostRequest(VALID_PAYLOAD))
      expect(res.status).toBe(409)
      expect(res.body.code).toBe('APPOINTMENT_OVERLAP')
    })

    it('calls checkOverlap with startsAt and endsAt from the payload', async () => {
      await POST(makePostRequest(VALID_PAYLOAD))
      const args = mockCheckOverlap.mock.calls[0][0]
      expect(args.startsAt).toBeDefined()
      expect(args.endsAt).toBeDefined()
    })

    it('does not pass excludeId for a new appointment creation', async () => {
      await POST(makePostRequest(VALID_PAYLOAD))
      const args = mockCheckOverlap.mock.calls[0][0]
      expect(args.excludeId).toBeUndefined()
    })

    it('returns 201 when the slot is free (no conflict)', async () => {
      mockCheckOverlap.mockResolvedValueOnce(null)
      const res = await POST(makePostRequest(VALID_PAYLOAD))
      expect(res.status).toBe(201)
    })
  })

  // ── Successful creation ───────────────────────────────────────────────────

  describe('successful creation', () => {
    it('returns 201 with the inserted appointment data', async () => {
      const res = await POST(makePostRequest(VALID_PAYLOAD))
      expect(res.status).toBe(201)
      expect(res.body.id).toBe(APPT_UUID)
    })

    it('accepts "confirmed" as a valid status', async () => {
      const res = await POST(makePostRequest({ ...VALID_PAYLOAD, status: 'confirmed' }))
      expect(res.status).toBe(201)
    })

    it('applies the default status "scheduled" when status is omitted', async () => {
      const { status: _s, ...noStatus } = VALID_PAYLOAD
      const res = await POST(makePostRequest(noStatus))
      expect(res.status).toBe(201)
    })
  })

  // ── Database insert error ─────────────────────────────────────────────────

  describe('database error on insert', () => {
    it('returns 500 when the DB insert fails', async () => {
      db.insertError = { message: 'duplicate key' }
      const res = await POST(makePostRequest(VALID_PAYLOAD))
      expect(res.status).toBe(500)
    })
  })

  // ── Auth guard ────────────────────────────────────────────────────────────

  describe('auth guard', () => {
    it('returns 401 when the user is not authenticated', async () => {
      const { requireAuth } = await import('@/lib/api/auth')
      requireAuth.mockResolvedValueOnce({
        response: {
          body:   { error: 'No autenticado.', code: 'UNAUTHORIZED' },
          status: 401,
        },
      })
      const res = await POST(makePostRequest(VALID_PAYLOAD))
      expect(res.status).toBe(401)
    })
  })
})

// ---------------------------------------------------------------------------
// GET — query param validation and listing
// ---------------------------------------------------------------------------

describe('GET /api/admin/appointments', () => {

  it('returns 200 with empty list when no appointments exist', async () => {
    db.list      = []
    db.listCount = 0
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
    expect(res.body.count).toBe(0)
  })

  it('returns pagination metadata (page, pageSize, count)', async () => {
    db.list      = [INSERTED_APPT]
    db.listCount = 1
    const res = await GET(makeGetRequest({ page: 1, pageSize: 10 }))
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('page')
    expect(res.body).toHaveProperty('pageSize')
    expect(res.body).toHaveProperty('count')
  })

  it('returns 400 when the status filter contains an invalid value', async () => {
    const res = await GET(makeGetRequest({ status: 'bad_status' }))
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('VALIDATION_ERROR')
  })

  it('accepts a comma-separated valid status filter', async () => {
    const res = await GET(makeGetRequest({ status: 'scheduled,confirmed' }))
    expect(res.status).toBe(200)
  })

  it('accepts all individual valid status values', async () => {
    for (const s of ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']) {
      const res = await GET(makeGetRequest({ status: s }))
      expect(res.status, `status '${s}' should be accepted`).toBe(200)
    }
  })

  it('accepts a valid patient_id UUID filter', async () => {
    const res = await GET(makeGetRequest({ patient_id: PATIENT_UUID }))
    expect(res.status).toBe(200)
  })

  it('returns 400 for a non-UUID patient_id', async () => {
    const res = await GET(makeGetRequest({ patient_id: 'not-a-uuid' }))
    expect(res.status).toBe(400)
  })

  it('returns 401 when the user is not authenticated', async () => {
    const { requireAuth } = await import('@/lib/api/auth')
    requireAuth.mockResolvedValueOnce({
      response: {
        body:   { error: 'No autenticado.', code: 'UNAUTHORIZED' },
        status: 401,
      },
    })
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(401)
  })

  it('returns 500 when the DB query fails', async () => {
    const { requireAuth } = await import('@/lib/api/auth')
    // Inject a supabase mock that resolves with an error
    requireAuth.mockResolvedValueOnce({
      user:     { id: 'admin-user-id' },
      supabase: {
        from: vi.fn(() => {
          const errResolved = Promise.resolve({
            data:  null,
            error: { message: 'DB timeout' },
            count: 0,
          })
          const chain = {
            select:  vi.fn().mockReturnThis(),
            order:   vi.fn().mockReturnThis(),
            gte:     vi.fn().mockReturnThis(),
            lt:      vi.fn().mockReturnThis(),
            eq:      vi.fn().mockReturnThis(),
            in:      vi.fn().mockReturnThis(),
            then:    errResolved.then.bind(errResolved),
            catch:   errResolved.catch.bind(errResolved),
            finally: errResolved.finally.bind(errResolved),
          }
          chain.range = vi.fn(() => chain)
          for (const m of ['gte', 'lt', 'eq', 'in', 'order', 'select']) {
            chain[m] = vi.fn(() => chain)
          }
          return chain
        }),
      },
    })
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(500)
  })
})
