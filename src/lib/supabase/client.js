import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Fallback placeholders prevent createBrowserClient from throwing during
  // Next.js build-time prerender (effects don't run on the server, so no
  // real API calls are made with these values).
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'
  )
}
