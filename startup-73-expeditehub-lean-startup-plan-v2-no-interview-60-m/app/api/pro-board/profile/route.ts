import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/pro-board/profile?email=...
export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const { data } = await supabase
    .from('pros')
    .select('id, name, email, specialty, status, license_number')
    .eq('email', email)
    .single()

  return NextResponse.json(data ?? {})
}
