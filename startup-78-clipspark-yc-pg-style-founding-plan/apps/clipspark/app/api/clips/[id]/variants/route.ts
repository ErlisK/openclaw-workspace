import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { trackServer } from '@/lib/analytics'

// GET /api/clips/[id]/variants — list A/B variants with performance comparison
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get original clip data
  const { data: clip } = await supabase
    .from('clip_outputs')
    .select('id, title, hashtags, caption_style, platform, is_posted, posted_url, heuristic_score, avg_views_48h, avg_completion_rate')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 })

  // Get variants
  const { data: variants } = await supabase
    .from('ab_variants')
    .select('*')
    .eq('clip_id', id)
    .order('created_at', { ascending: true })

  // Get performance data for original clip
  const { data: perfData } = await supabase
    .from('clip_performance')
    .select('views, likes, completion_rate, impressions, data_source, measured_at, hours_after_publish')
    .eq('clip_id', id)
    .order('measured_at', { ascending: false })
    .limit(5)

  // Build winner logic: compare original vs best variant on views
  const originalViews = clip.avg_views_48h || (perfData?.[0]?.views ?? 0)
  const variantWithBestViews = (variants || [])
    .filter(v => v.views > 0)
    .sort((a, b) => (b.views || 0) - (a.views || 0))[0]

  const winner = variantWithBestViews && variantWithBestViews.views > originalViews
    ? { type: 'variant', id: variantWithBestViews.id, label: variantWithBestViews.variant_label }
    : originalViews > 0
      ? { type: 'original', id: clip.id, label: 'A (original)' }
      : null

  return NextResponse.json({
    original: {
      id: clip.id,
      title: clip.title,
      hashtags: clip.hashtags,
      caption_style: clip.caption_style,
      platform: clip.platform,
      heuristic_score: clip.heuristic_score,
      views: originalViews,
      completion_rate: clip.avg_completion_rate,
      performance_entries: perfData || [],
    },
    variants: variants || [],
    winner,
    total_variants: (variants || []).length,
  })
}

// POST /api/clips/[id]/variants — create a new A/B variant
// Body: { variant_type, value, variant_label?, posted_url?, platform? }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { variant_type, value, variant_label, posted_url, platform } = body

  if (!variant_type || !value) {
    return NextResponse.json({ error: 'variant_type and value required' }, { status: 400 })
  }
  if (!['title', 'caption_style', 'hashtags', 'thumbnail'].includes(variant_type)) {
    return NextResponse.json({ error: 'variant_type must be title, caption_style, hashtags, or thumbnail' }, { status: 400 })
  }

  // Verify clip ownership
  const { data: clip } = await supabase
    .from('clip_outputs')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 })

  // Auto-generate label if not provided (A, B, C...)
  const { count } = await supabase
    .from('ab_variants')
    .select('id', { count: 'exact', head: true })
    .eq('clip_id', id)
    .eq('variant_type', variant_type)

  const labels = ['B', 'C', 'D', 'E', 'F']
  const autoLabel = variant_label || labels[(count || 0)] || `V${(count || 0) + 2}`

  const { data: variant, error } = await supabase
    .from('ab_variants')
    .insert({
      clip_id: id,
      user_id: user.id,
      variant_type,
      variant_label: autoLabel,
      value,
      posted_url: posted_url || null,
      platform: platform || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  trackServer(user.id, 'ab_variant_created', {
    clip_id: id,
    variant_type,
    label: autoLabel,
  })

  return NextResponse.json(variant, { status: 201 })
}

// PATCH /api/clips/[id]/variants — update variant performance data
// Body: { variant_id, views?, likes?, completion_rate?, impressions?, posted_url? }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { variant_id, views, likes, completion_rate, impressions, posted_url, data_source } = body

  if (!variant_id) return NextResponse.json({ error: 'variant_id required' }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (views !== undefined) updates.views = parseInt(views)
  if (likes !== undefined) updates.likes = parseInt(likes)
  if (completion_rate !== undefined) updates.completion_rate = parseFloat(completion_rate)
  if (impressions !== undefined) updates.impressions = parseInt(impressions)
  if (posted_url !== undefined) updates.posted_url = posted_url
  if (data_source !== undefined) updates.data_source = data_source

  const { data, error } = await supabase
    .from('ab_variants')
    .update(updates)
    .eq('id', variant_id)
    .eq('clip_id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
