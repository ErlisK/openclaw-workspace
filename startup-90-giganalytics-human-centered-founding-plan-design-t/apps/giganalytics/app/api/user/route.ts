import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, plan, created_at')
    .eq('id', session.user.id)
    .single()
  return NextResponse.json({
    id: session.user.id,
    email: session.user.email,
    plan: profile?.plan ?? 'free',
    createdAt: profile?.created_at ?? session.user.created_at,
  })
}
