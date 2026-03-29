/**
 * Unit tests for GET /api/notifications/remind/route.js
 *
 * Critical invariant:
 *   A reminder is sent only when the appointment starts in the [now+23h, now+25h]
 *   window AND notification_sent_at IS NULL AND status is active.
 *
 * Strategy:
 *   All I/O is stubbed via vi.mock() before importing the route handler.
 *   The Supabase mock factory is recreated per test via the mock implementation
 *   so each test gets its own fresh chain with isolated state.
 *
 * NOTE on Response.json:
 *   The route uses the global Response.json (Node 18+), not NextResponse.json.
 *   We normalise both shapes in the `parseRes()` helper below.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// next/server — used by requireCron (imports NextResponse)
// ---------------------------------------------------------------------------
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body, init) => ({
      _isNextResponse: true,
      body,
      status: init?.status ?? 200,
    }),
  },
}))

// ---------------------------------------------------------------------------
// Per-test Supabase mock state
// ---------------------------------------------------------------------------
// The route calls supabase.from('appointments') three times per appointment:
//   1. Main select query  (.in().gte().lte().is())       → appointments list
//   2. Count sub-query    (.select().eq().not().lt())    → { count }
//   3. Update             (.update().eq())               → { error }
//
// We model this with a call-sequence approach: each .from() call returns the
// next mock in a queue.

let supabaseCallQueue = []

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn((_table) => {
      const next = supabaseCallQueue.shift()
      if (!next) throw new Error('supabaseCallQueue exhausted — add more entries in the test')
      return next
    }),
  })),
}))

// ---------------------------------------------------------------------------
// cron guard
// ---------------------------------------------------------------------------
vi.mock('@/lib/api/cron', () => ({
  requireCron: vi.fn(() => null), // authorised by default
}))

// ---------------------------------------------------------------------------
// Senders
// ---------------------------------------------------------------------------
const mockSendWhatsApp = vi.fn().mockResolvedValue({ ok: true, messageId: 'WA-001' })
const mockSendEmail    = vi.fn().mockResolvedValue({ ok: true, messageId: 'EM-001' })

vi.mock('@/lib/notifications/senders', () => ({
  sendWhatsApp: (...args) => mockSendWhatsApp(...args),
  sendEmail:    (...args) => mockSendEmail(...args),
}))

// ---------------------------------------------------------------------------
// dateUtils
// ---------------------------------------------------------------------------
vi.mock('@/lib/dateUtils', () => ({
  formatFechaCita: vi.fn(() => 'miércoles 15 de abril'),
  formatHoraCita:  vi.fn(() => '10:00'),
}))

// ---------------------------------------------------------------------------
// Import handler AFTER all mocks
// ---------------------------------------------------------------------------
const { GET } = await import('@/app/api/notifications/remind/route.js')

// ---------------------------------------------------------------------------
// Chain builders
// ---------------------------------------------------------------------------

/** Main appointments select query — terminal method is .is() */
function mainSelectChain(appointments, queryError = null) {
  return {
    select: vi.fn().mockReturnThis(),
    in:     vi.fn().mockReturnThis(),
    gte:    vi.fn().mockReturnThis(),
    lte:    vi.fn().mockReturnThis(),
    is:     vi.fn().mockResolvedValue({ data: appointments, error: queryError }),
  }
}

/** Count sub-query — .select().eq().not().lt() terminal */
function countChain(count = 0, error = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    not:    vi.fn().mockReturnThis(),
    lt:     vi.fn().mockResolvedValue({ count, error }),
  }
}

/** Update query — .update().eq() terminal */
function updateChain(error = null) {
  return {
    update: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockResolvedValue({ error }),
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest() {
  return {
    headers: { get: (h) => (h === 'authorization' ? 'Bearer test-secret' : null) },
  }
}

function makeAppt(overrides = {}) {
  return {
    id:         'appt-uuid-1',
    starts_at:  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ends_at:    new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
    service:    'Neurorehabilitación',
    location:   null,
    status:     'scheduled',
    patient_id: 'patient-uuid-1',
    patients: {
      id:        'patient-uuid-1',
      full_name: 'María González',
      phone:     '+56982927833',
      email:     'maria@example.com',
      address:   'Av. Libertad 1234',
    },
    ...overrides,
  }
}

/**
 * Normalise the raw route return value to { status, body }.
 * Handles both our NextResponse mock (plain object) and the real
 * global Response (Node 18+).
 */
async function parseRes(raw) {
  if (raw && raw._isNextResponse) return { status: raw.status, body: raw.body }
  const body = await raw.json()
  return { status: raw.status, body }
}

beforeEach(() => {
  supabaseCallQueue = []
  mockSendWhatsApp.mockClear()
  mockSendEmail.mockClear()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/notifications/remind', () => {

  // ── Authorization ─────────────────────────────────────────────────────────

  describe('authorization', () => {
    it('returns 401 when requireCron rejects', async () => {
      const { requireCron } = await import('@/lib/api/cron')
      requireCron.mockReturnValueOnce({
        _isNextResponse: true,
        body:   { error: 'No autorizado.', code: 'UNAUTHORIZED' },
        status: 401,
      })
      // No DB calls needed — handler returns before querying
      const raw = await GET(makeRequest())
      const res = await parseRes(raw)
      expect(res.status).toBe(401)
    })
  })

  // ── No appointments ───────────────────────────────────────────────────────

  describe('when no appointments are in the window', () => {
    it('returns notificationsSent:0 and makes no sender calls', async () => {
      supabaseCallQueue.push(mainSelectChain([]))

      const raw = await GET(makeRequest())
      const res = await parseRes(raw)

      expect(res.body.notificationsSent).toBe(0)
      expect(res.body.appointmentsProcessed).toBe(0)
      expect(res.body.errors).toEqual([])
      expect(mockSendWhatsApp).not.toHaveBeenCalled()
      expect(mockSendEmail).not.toHaveBeenCalled()
    })
  })

  // ── Happy path ────────────────────────────────────────────────────────────

  describe('when one appointment is in the 23h-25h window', () => {
    it('sends WhatsApp and email; returns notificationsSent:2', async () => {
      supabaseCallQueue.push(
        mainSelectChain([makeAppt()]),
        countChain(0),    // isFirstSession check
        updateChain(),    // mark notification_sent_at
      )
      const raw = await GET(makeRequest())
      const res = await parseRes(raw)

      expect(mockSendWhatsApp).toHaveBeenCalledOnce()
      expect(mockSendEmail).toHaveBeenCalledOnce()
      expect(res.body.notificationsSent).toBe(2)
      expect(res.body.errors).toHaveLength(0)
    })

    it('passes "recordatorio_24h" as the template key', async () => {
      supabaseCallQueue.push(mainSelectChain([makeAppt()]), countChain(0), updateChain())
      await GET(makeRequest())

      expect(mockSendWhatsApp.mock.calls[0][1]).toBe('recordatorio_24h')
      expect(mockSendEmail.mock.calls[0][1]).toBe('recordatorio_24h')
    })

    it('sets isFirstSession=true when prevCount is 0', async () => {
      supabaseCallQueue.push(mainSelectChain([makeAppt()]), countChain(0), updateChain())
      await GET(makeRequest())

      const opts = mockSendWhatsApp.mock.calls[0][3]
      expect(opts.isFirstSession).toBe(true)
    })

    it('sets isFirstSession=false when prevCount > 0', async () => {
      supabaseCallQueue.push(mainSelectChain([makeAppt()]), countChain(5), updateChain())
      await GET(makeRequest())

      const opts = mockSendWhatsApp.mock.calls[0][3]
      expect(opts.isFirstSession).toBe(false)
    })
  })

  // ── Channel conditions ────────────────────────────────────────────────────

  describe('when patient has no phone', () => {
    it('skips WhatsApp but sends email', async () => {
      const appt = makeAppt()
      appt.patients.phone = null
      supabaseCallQueue.push(mainSelectChain([appt]), countChain(0), updateChain())
      const raw = await GET(makeRequest())
      const res = await parseRes(raw)

      expect(mockSendWhatsApp).not.toHaveBeenCalled()
      expect(mockSendEmail).toHaveBeenCalledOnce()
      expect(res.body.notificationsSent).toBe(1)
    })
  })

  describe('when patient has no email', () => {
    it('sends WhatsApp but skips email', async () => {
      const appt = makeAppt()
      appt.patients.email = null
      supabaseCallQueue.push(mainSelectChain([appt]), countChain(0), updateChain())
      const raw = await GET(makeRequest())
      const res = await parseRes(raw)

      expect(mockSendWhatsApp).toHaveBeenCalledOnce()
      expect(mockSendEmail).not.toHaveBeenCalled()
      expect(res.body.notificationsSent).toBe(1)
    })
  })

  describe('when patient has neither phone nor email', () => {
    it('returns notificationsSent:0 but appointmentsProcessed:1', async () => {
      const appt = makeAppt()
      appt.patients.phone = null
      appt.patients.email = null
      supabaseCallQueue.push(mainSelectChain([appt]), countChain(0), updateChain())
      const raw = await GET(makeRequest())
      const res = await parseRes(raw)

      expect(mockSendWhatsApp).not.toHaveBeenCalled()
      expect(mockSendEmail).not.toHaveBeenCalled()
      expect(res.body.notificationsSent).toBe(0)
      expect(res.body.appointmentsProcessed).toBe(1)
    })
  })

  // ── Fault tolerance ───────────────────────────────────────────────────────

  describe('fault tolerance', () => {
    it('records a whatsapp error and still attempts email', async () => {
      mockSendWhatsApp.mockResolvedValueOnce({ ok: false, error: 'Twilio 429' })
      supabaseCallQueue.push(mainSelectChain([makeAppt()]), countChain(0), updateChain())
      const raw = await GET(makeRequest())
      const res = await parseRes(raw)

      expect(mockSendEmail).toHaveBeenCalledOnce()
      expect(res.body.errors.some((e) => e.channel === 'whatsapp')).toBe(true)
    })

    it('records an email error; whatsapp success still counts', async () => {
      mockSendEmail.mockResolvedValueOnce({ ok: false, error: 'Resend 500' })
      supabaseCallQueue.push(mainSelectChain([makeAppt()]), countChain(0), updateChain())
      const raw = await GET(makeRequest())
      const res = await parseRes(raw)

      expect(res.body.errors.some((e) => e.channel === 'email')).toBe(true)
      expect(res.body.notificationsSent).toBe(1)
    })
  })

  // ── Missing patient ───────────────────────────────────────────────────────

  describe('when patients join returns null', () => {
    it('records an error and skips both senders', async () => {
      const appt = makeAppt()
      appt.patients = null
      // No count/update queries because the handler skips with `continue`
      supabaseCallQueue.push(mainSelectChain([appt]))
      const raw = await GET(makeRequest())
      const res = await parseRes(raw)

      expect(mockSendWhatsApp).not.toHaveBeenCalled()
      expect(mockSendEmail).not.toHaveBeenCalled()
      expect(res.body.errors.some((e) => e.appointmentId === appt.id)).toBe(true)
    })
  })

  // ── DB error ──────────────────────────────────────────────────────────────

  describe('when the main DB query fails', () => {
    it('returns 500 with code DB_ERROR', async () => {
      supabaseCallQueue.push(mainSelectChain(null, { message: 'connection timeout' }))
      const raw = await GET(makeRequest())
      const res = await parseRes(raw)

      expect(res.status).toBe(500)
      expect(res.body.code).toBe('DB_ERROR')
    })
  })
})
