import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  let supabaseStatus: 'ok' | 'fail' = 'fail'
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    // Prefer service role for healthz (no RLS issues); fall back to anon
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (url && key) {
      const supabase = createClient(url, key)
      const { error } = await supabase.from('waitlist').select('id').limit(1)
      if (!error) supabaseStatus = 'ok'
    }
  } catch {
    // supabaseStatus remains 'fail'
  }

  return NextResponse.json({
    ok: true,
    supabase: supabaseStatus,
    timestamp: new Date().toISOString(),
  })
}
