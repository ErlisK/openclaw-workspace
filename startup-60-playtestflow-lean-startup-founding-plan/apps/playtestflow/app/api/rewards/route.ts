import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { projectId, codes, rewardType, rewardValue } = body

  if (!projectId || !codes || !Array.isArray(codes) || codes.length === 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Verify project belongs to this user
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('designer_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const rows = codes.map((code: string) => ({
    project_id: projectId,
    code: code.trim(),
    reward_type: rewardType || 'gift_card',
    reward_value: rewardValue || null,
    status: 'available',
  }))

  const { data, error } = await supabase
    .from('reward_codes')
    .insert(rows)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, created: data?.length ?? 0 })
}

// Assign a reward code to a signup
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { codeId, signupId } = body

  const { error } = await supabase
    .from('reward_codes')
    .update({
      assigned_to_signup: signupId,
      assigned_at: new Date().toISOString(),
      status: 'assigned',
    })
    .eq('id', codeId)
    .eq('status', 'available')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
