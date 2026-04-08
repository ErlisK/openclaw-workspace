import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

/**
 * POST /api/beta/invite — send invite to a beta user
 * Body: { userId?, email?, sendEmail? }
 */
export async function POST(request: NextRequest) {
  const body = await request.json() as { userId?: string; email?: string; sendEmail?: boolean }
  const { userId, email, sendEmail = false } = body

  if (!userId && !email) return NextResponse.json({ error: 'userId or email required' }, { status: 400 })

  const supabase = getSupabaseAdmin()

  // Build query dynamically
  const base = supabase.from('cc_beta_users').update({
    status: 'invited',
    invited_at: new Date().toISOString(),
  })

  const { data, error } = await (userId
    ? base.eq('id', userId)
    : base.eq('email', email!)
  ).select('id, email, name, invite_code, org_name').single()

  if (error || !data) return NextResponse.json({ error: error?.message || 'User not found' }, { status: 404 })

  const inviteUrl = `https://citebundle.com/join?code=${(data as Record<string, string>).invite_code}`

  // If sendEmail requested, we would use AgentMail here
  // For now, return the invite URL
  return NextResponse.json({
    invited: true,
    inviteCode: (data as Record<string, string>).invite_code,
    inviteUrl,
    email: (data as Record<string, string>).email,
    name: (data as Record<string, string>).name,
  })
}
