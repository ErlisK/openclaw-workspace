import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const db = getSupabaseAdmin()
  const body = await req.json()

  const { data, error } = await db
    .from('pros')
    .upsert(body, { onConflict: 'email' })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, id: data?.id })
}
