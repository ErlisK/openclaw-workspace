import { createClient } from '@supabase/supabase-js'

// Client-side (browser) - lazy singleton
let _client: ReturnType<typeof createClient> | null = null
export function getSupabaseClient() {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    _client = createClient(url, key)
  }
  return _client
}
// Convenience export for client components
export const supabase = {
  from: (table: string) => getSupabaseClient().from(table),
}

// Server-side (API routes only — lazy, evaluated at request time)
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Supabase env vars not set')
  return createClient(url, serviceKey, {
    auth: { persistSession: false }
  })
}
