import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

export function createClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Supabase env not configured')
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
