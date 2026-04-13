import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { trackServer } from '@/lib/analytics'

// GET /api/templates — list public templates with filtering, sorting, user state
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(request.url)
  const platform  = searchParams.get('platform')
  const category  = searchParams.get('category')
  const sort      = searchParams.get('sort') || 'popular'  // popular | newest | trending
  const q         = searchParams.get('q')
  const mine      = searchParams.get('mine') === '1'

  let query = supabase
    .from('templates')
    .select(
      'id, name, description, version, is_system, is_public, use_cases, ' +
      'platforms, config, times_used, avg_views_48h, avg_completion, ' +
      'created_at, updated_at, saves_count, upvotes_count, thumbnail_url, ' +
      'preview_clip_url, example_clip_url, tags, fork_of, created_by_user, category'
    )
    .eq('is_public', true)

  if (mine && user) {
    query = query.eq('created_by_user', user.id)
  }

  if (platform) {
    query = query.contains('platforms', [platform])
  }

  if (category) {
    query = query.eq('category', category)
  }

  if (q) {
    query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%,tags.cs.{${q}}`)
  }

  // Sort
  if (sort === 'newest') {
    query = query.order('created_at', { ascending: false })
  } else if (sort === 'trending') {
    // Trending = upvotes in last 7 days (approx by upvotes_count for now)
    query = query.order('upvotes_count', { ascending: false })
  } else {
    // popular = times_used first, then upvotes as tiebreaker
    query = query.order('times_used', { ascending: false }).order('upvotes_count', { ascending: false })
  }

  const { data: templates, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // User context: saved + upvoted sets
  let savedIds: string[] = []
  let upvotedIds: string[] = []

  if (user) {
    const [savesRes, upvotesRes] = await Promise.all([
      supabase.from('template_saves').select('template_id').eq('user_id', user.id),
      supabase.from('template_upvotes').select('template_id').eq('user_id', user.id),
    ])
    savedIds = savesRes.data?.map(s => s.template_id) || []
    upvotedIds = upvotesRes.data?.map(u => u.template_id) || []
  }

  // Fetch creator names for community templates
  const communityCreatorIds = [...new Set(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (templates as any[] || [])
      .filter(t => t.created_by_user)
      .map(t => t.created_by_user)
  )]

  const creatorNames: Record<string, string> = {}
  if (communityCreatorIds.length > 0) {
    const { data: creators } = await supabase
      .from('users')
      .select('id, full_name, email')
      .in('id', communityCreatorIds)
    for (const c of creators || []) {
      creatorNames[c.id] = c.full_name || c.email?.split('@')[0] || 'Creator'
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (templates as any[] || []).map(t => ({
    ...t,
    is_saved: savedIds.includes(t.id),
    is_upvoted: upvotedIds.includes(t.id),
    creator_name: t.created_by_user ? creatorNames[t.created_by_user] : null,
  }))

  return NextResponse.json(result)
}

// POST /api/templates — create a community template
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    name, description,
    use_cases = [], platforms = [], config = {},
    fork_of, tags = [], thumbnail_url, example_clip_url, preview_clip_url,
    category = 'general',
  } = body

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const id = `community-${Date.now()}-${user.id.slice(0, 8)}`

  const { data: tmpl, error } = await supabase
    .from('templates')
    .insert({
      id,
      name,
      description,
      use_cases,
      platforms,
      config,
      fork_of: fork_of || null,
      tags,
      thumbnail_url: thumbnail_url || null,
      example_clip_url: example_clip_url || null,
      preview_clip_url: preview_clip_url || null,
      category,
      created_by_user: user.id,
      is_public: true,
      is_system: false,
      saves_count: 0,
      upvotes_count: 0,
      times_used: 0,
      version: '1.0',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-save for creator
  await supabase.from('template_saves').upsert({ user_id: user.id, template_id: id })

  trackServer(user.id, 'template_created', {
    template_id: id,
    fork_of: fork_of || null,
    platforms,
    category,
  })

  return NextResponse.json({ ...tmpl, is_saved: true, is_upvoted: false, creator_name: null }, { status: 201 })
}
