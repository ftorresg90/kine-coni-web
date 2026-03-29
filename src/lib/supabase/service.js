// ---------------------------------------------------------------------------
// Supabase Service-Role Client
// ---------------------------------------------------------------------------
// This client uses the SERVICE_ROLE key which bypasses Row Level Security.
//
// USE ONLY in server-side contexts where:
//   1. Authentication is handled by a different mechanism (e.g. CRON_SECRET)
//   2. You need to access data outside a user session (cron jobs, webhooks)
//
// NEVER expose this client to the browser or import it in Client Components.
// NEVER use NEXT_PUBLIC_ prefix for SUPABASE_SERVICE_ROLE_KEY.
//
// Required environment variables:
//   NEXT_PUBLIC_SUPABASE_URL       — Project URL (same as browser client)
//   SUPABASE_SERVICE_ROLE_KEY      — Service role key from:
//                                    Supabase Dashboard → Settings → API →
//                                    Project API keys → service_role
// ---------------------------------------------------------------------------

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client authenticated with the service role key.
 * Bypasses all Row Level Security policies.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function createServiceClient() {
  const url            = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'createServiceClient: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados.'
    )
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      // Prevent the service client from persisting sessions or refreshing tokens.
      // This client is stateless — each request creates a fresh instance.
      persistSession:    false,
      autoRefreshToken:  false,
      detectSessionInUrl: false,
    },
  })
}
