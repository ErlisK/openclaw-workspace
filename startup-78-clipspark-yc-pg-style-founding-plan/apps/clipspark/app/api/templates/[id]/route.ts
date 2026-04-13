import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { trackServer } from '@/lib/analytics'

type Params = { params: Promise<{ id: string }> }

// GET /api/templates/[id] — get a single template with user context
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tmpl, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (error || !tmpl) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Get user's relation to this template
  let is_saved = false
  let is_upvoted = false
  let creator_name: string | null = null

  if (user) {
    const [saveResult, upvoteResult] = await Promise.all([
      supabase.from('template_saves').select('id').eq('user_id', user.id).eq('template_id', id).single(),
      supabase.from('template_upvotes').select('id').eq('user_id', user.id).eq('template_id', id).single(),
    ])
    is_saved = !!saveResult.data
    is_upvoted = !!upvoteResult.data
  }

  // Get creator name if community template
  if (tmpl.created_by_user) {
    const { data: creator } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', tmpl.created_by_user)
      .single()
    creator_name = creator?.full_name || creator?.email?.split('@')[0] || 'Creator'
  }

  return NextResponse.json({ ...tmpl, is_saved, is_upvoted, creator_name })
}

// PATCH /api/templates/[id] — upvote (any user) or update (owner only)
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))

  // Upvote action — any authenticated user
  if (body.action === 'upvote') {
    const svc = (await import('@/lib/supabase/service')).createServiceClient()
    // Check not already upvoted
    const { data: existing } = await svc
      .from('template_upvotes')
      .select('id')
      .eq('template_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (existing) return NextResponse.json({ ok: true, already_upvoted: true })
    await svc.from('template_upvotes').insert({ template_id: id, user_id: user.id })
    // Increment upvotes_count and update trending_score
    const rpcRes = await svc.rpc('increment_template_upvote', { tmpl_id: id })
    if (rpcRes.error) {
      // fallback: direct update
      const { data: t } = await svc.from('templates').select('upvotes_count,times_used,saves_count,tip_count').eq('id', id).single()
      if (t) {
        const newUpvotes = (t.upvotes_count || 0) + 1
        const score = (t.times_used || 0) * 1.0 + (t.saves_count || 0) * 2.5 + newUpvotes * 3.0 + (t.tip_count || 0) * 8.0
        await svc.from('templates').update({ upvotes_count: newUpvotes, trending_score: score }).eq('id', id)
      }
    }
    return NextResponse.json({ ok: true, upvoted: true })
  }

  // Verify ownership for other updates
  const { data: existing } = await supabase
    .from('templates')
    .select('created_by_user, is_system')
    .eq('id', id)
    .single()

  if (!existing || existing.is_system || existing.created_by_user !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const allowed = ['name', 'description', 'use_cases', 'platforms', 'tags', 'config', 'is_public', 'preview_clip_url', 'thumbnail_url', 'category']
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }
  update.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('templates')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/templates/[id] — remove community template (owner only)
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase
    .from('templates')
    .select('created_by_user, is_system')
    .eq('id', id)
    .single()

  if (!existing || existing.is_system || existing.created_by_user !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await supabase.from('templates').delete().eq('id', id)
  trackServer(user.id, 'template_deleted', { template_id: id })
  return NextResponse.json({ deleted: true })
}
