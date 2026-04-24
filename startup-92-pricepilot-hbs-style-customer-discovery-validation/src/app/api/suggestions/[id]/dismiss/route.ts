import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase.from('suggestions').update({ status: 'rejected', rejected_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
