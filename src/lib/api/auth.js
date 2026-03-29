import { createClient } from '@/lib/supabase/server'
import { unauthorized } from './response'

/**
 * Verify the session via Supabase server client.
 *
 * Usage inside a Route Handler:
 *
 *   const { user, response } = await requireAuth()
 *   if (response) return response          // 401 if not authenticated
 *
 * Returns { user, supabase } on success so callers can reuse the already-
 * created client and avoid a second cookie parse.
 */
export async function requireAuth() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { response: unauthorized() }
  }

  return { user, supabase }
}
