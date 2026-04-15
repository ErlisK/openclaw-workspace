import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  let db: 'connected' | 'error' = 'connected'
  try {
    await supabase.rpc('version').maybeSingle()
  } catch {
    db = 'error'
  }

  return NextResponse.json({ status: 'ok', db })
}
