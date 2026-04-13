import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { trackServer } from '@/lib/analytics'

type Params = { params: Promise<{ id: string }> }

// POST /api/templates/[id]/upvote — toggle upvote for a template
export async function POST(_request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check if already upvoted
  const { data: existing } = await supabase
    .from('template_upvotes')
    .select('id')
    .eq('user_id', user.id)
    .eq('template_id', id)
    .single()

  const { data: tmpl } = await supabase
    .from('templates')
    .select('upvotes_count')
    .eq('id', id)
    .single()

  const currentCount = tmpl?.upvotes_count || 0

  if (existing) {
    // Remove upvote
    await supabase.from('template_upvotes').delete().eq('id', existing.id)
    await supabase.from('templates')
      .update({ upvotes_count: Math.max(0, currentCount - 1) })
      .eq('id', id)
    return NextResponse.json({ upvoted: false, upvotes_count: Math.max(0, currentCount - 1) })
  } else {
    // Add upvote
    await supabase.from('template_upvotes').insert({ user_id: user.id, template_id: id })
    await supabase.from('templates')
      .update({ upvotes_count: currentCount + 1 })
      .eq('id', id)

    trackServer(user.id, 'template_upvoted', { template_id: id })
    return NextResponse.json({ upvoted: true, upvotes_count: currentCount + 1 })
  }
}

// GET /api/templates/[id]/upvote — check if current user upvoted
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ upvoted: false })

  const { data } = await supabase
    .from('template_upvotes')
    .select('id')
    .eq('user_id', user.id)
    .eq('template_id', id)
    .single()

  return NextResponse.json({ upvoted: !!data })
}
