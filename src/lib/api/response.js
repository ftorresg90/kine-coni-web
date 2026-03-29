import { NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Canonical success envelope
// ---------------------------------------------------------------------------

/**
 * Single-resource or arbitrary-data success response.
 * @param {unknown} data
 * @param {number} [status=200]
 */
export function ok(data, status = 200) {
  return NextResponse.json(data, { status })
}

/**
 * Paginated list response.
 * @param {unknown[]} data
 * @param {{ count: number, page: number, pageSize: number }} meta
 */
export function paginated(data, { count, page, pageSize }) {
  return NextResponse.json({ data, count, page, pageSize }, { status: 200 })
}

// ---------------------------------------------------------------------------
// Canonical error envelope — always { error: string, code: string }
// ---------------------------------------------------------------------------

export function badRequest(message, code = 'BAD_REQUEST') {
  return NextResponse.json({ error: message, code }, { status: 400 })
}

export function unauthorized(message = 'No autenticado.', code = 'UNAUTHORIZED') {
  return NextResponse.json({ error: message, code }, { status: 401 })
}

export function forbidden(message = 'Acceso denegado.', code = 'FORBIDDEN') {
  return NextResponse.json({ error: message, code }, { status: 403 })
}

export function notFound(message = 'Recurso no encontrado.', code = 'NOT_FOUND') {
  return NextResponse.json({ error: message, code }, { status: 404 })
}

/**
 * 409 Conflict — used specifically for scheduling overlaps.
 * @param {string} message
 * @param {unknown} conflictingAppointment  Raw DB row of the conflicting appointment
 */
export function conflict(message, conflictingAppointment = null) {
  return NextResponse.json(
    {
      error: message,
      code:  'APPOINTMENT_OVERLAP',
      conflict: conflictingAppointment,
    },
    { status: 409 }
  )
}

export function internalError(message = 'Error interno del servidor.', code = 'INTERNAL_ERROR') {
  return NextResponse.json({ error: message, code }, { status: 500 })
}

// ---------------------------------------------------------------------------
// Zod validation helper
// Returns { data } on success or a 400 NextResponse on failure.
// ---------------------------------------------------------------------------
export function parseBody(schema, raw) {
  const result = schema.safeParse(raw)
  if (!result.success) {
    const messages = result.error.issues
      .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      .join('; ')
    return { response: badRequest(messages, 'VALIDATION_ERROR') }
  }
  return { data: result.data }
}
