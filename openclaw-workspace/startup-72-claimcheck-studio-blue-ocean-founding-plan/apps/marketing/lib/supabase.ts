import { createClient } from '@supabase/supabase-js'

export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Keep named exports for convenience
export const supabase = { from: (...args: unknown[]) => { throw new Error('use getSupabaseClient()') } }
export const supabaseAdmin = { from: (...args: unknown[]) => { throw new Error('use getSupabaseAdmin()') } }
