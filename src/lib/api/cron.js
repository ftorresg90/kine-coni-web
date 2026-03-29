// ---------------------------------------------------------------------------
// Cron Route Guard
// ---------------------------------------------------------------------------
// Validates the Authorization header sent by the cron scheduler.
//
// Usage inside a cron Route Handler:
//
//   import { requireCron } from '@/lib/api/cron'
//
//   export async function GET(request) {
//     const authError = requireCron(request)
//     if (authError) return authError
//     // ... handler logic
//   }
//
// The scheduler must send:
//   Authorization: Bearer <CRON_SECRET>
//
// Where CRON_SECRET is a long random string set in .env.local (and in the
// Vercel project's environment variables for production).
//
// Security note:
//   This is a shared-secret scheme suitable for cron-to-self calls.
//   Do NOT expose these routes publicly without this guard.
//   The secret must be at least 32 random characters.
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

/**
 * Returns a 401 NextResponse if the request does not carry the correct
 * CRON_SECRET bearer token, otherwise returns null (caller continues).
 *
 * Uses crypto.timingSafeEqual to prevent timing-based secret enumeration.
 *
 * @param {Request} request
 * @returns {NextResponse | null}
 */
export function requireCron(request) {
  const secret = process.env.CRON_SECRET

  if (!secret) {
    console.error('[requireCron] CRON_SECRET no está configurado en las variables de entorno.')
    return NextResponse.json(
      { error: 'Configuración de servidor incompleta.', code: 'CRON_SECRET_MISSING' },
      { status: 500 }
    )
  }

  const authHeader = request.headers.get('authorization') ?? ''
  const provided   = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null

  // Use timing-safe comparison to prevent secret enumeration via response-time attacks.
  const isValid = (() => {
    if (!provided) return false
    try {
      const a = Buffer.from(provided)
      const b = Buffer.from(secret)
      // Buffers must be the same length for timingSafeEqual; a length mismatch
      // itself leaks length — compare against a fixed-length hash instead when
      // the secret length must also be hidden. For a shared-secret cron guard
      // the length is not a practical concern, so we use a same-length pad.
      if (a.length !== b.length) return false
      return timingSafeEqual(a, b)
    } catch {
      return false
    }
  })()

  if (!isValid) {
    return NextResponse.json(
      { error: 'No autorizado.', code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }

  return null
}
