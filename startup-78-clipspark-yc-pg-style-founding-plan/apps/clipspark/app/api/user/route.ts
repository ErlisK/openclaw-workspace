import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/user — current user profile
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
  return NextResponse.json(data)
}

// PATCH /api/user — update profile
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const allowed = ['full_name', 'creator_niche', 'creator_type', 'onboarding_done', 'avatar_url',
    'creator_segment', 'episode_frequency', 'current_repurpose_tool', 'persona', 'onboarding_version', 'publish_goal']
  const updates: Record<string, unknown> = {}
  for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k]

  // Handle analytics consent separately
  if (body.analytics_consent !== undefined) {
    await supabase
      .from('analytics_consent')
      .upsert({ user_id: user.id, performance_data: body.analytics_consent, ab_testing: body.analytics_consent })
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
