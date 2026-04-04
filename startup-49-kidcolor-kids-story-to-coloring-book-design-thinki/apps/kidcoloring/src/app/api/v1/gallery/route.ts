import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/v1/gallery
 * Returns approved gallery items for public display.
 *
 * Query:
 *   featured=true   → only featured items
 *   theme=dinosaurs → filter by theme tag
 *   page=1          → pagination (20 per page)
 *
 * POST /api/v1/gallery
 * Opts a session's page into the public gallery.
 * Body: { sessionId, pageNumber, imageUrl, prompt, subject, ageRange, heroName, themeTags }
 */

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET(req: NextRequest) {
  const p        = req.nextUrl.searchParams
  const featured = p.get('featured') === 'true'
  const theme    = p.get('theme')
  const page     = Math.max(1, Number(p.get('page') ?? 1))
  const limit    = 20
  const offset   = (page - 1) * limit

  let query = sb()
    .from('gallery_items')
    .select('id, image_url, subject, hero_name, age_range, theme_tags, is_featured, view_count, created_at')
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (featured) query = query.eq('is_featured', true)
  if (theme)    query = query.contains('theme_tags', [theme])

  const { data, count, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Bump view counts async (fire-and-forget)
  if (data && data.length > 0) {
    void Promise.resolve(sb().rpc('increment_gallery_views', { item_ids: data.map(d => d.id) }))
      .then(() => null).catch(() => null)
  }

  return NextResponse.json({
    items: data ?? [],
    page,
    hasMore: (data?.length ?? 0) === limit,
    total:   count,
  })
}

export async function POST(req: NextRequest) {
  let body: {
    sessionId?:  string
    pageNumber?: number
    imageUrl?:   string
    prompt?:     string
    subject?:    string
    ageRange?:   string
    heroName?:   string
    themeTags?:  string[]
  }
  try { body = await req.json() as typeof body }
  catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const { sessionId, pageNumber = 1, imageUrl, prompt, subject, ageRange, heroName, themeTags = [] } = body

  if (!sessionId || !imageUrl) {
    return NextResponse.json({ error: 'sessionId + imageUrl required' }, { status: 400 })
  }

  // Basic safety: don't allow duplicate opts-in for same session+page
  const { data: existing } = await sb()
    .from('gallery_items')
    .select('id')
    .eq('session_id', sessionId)
    .eq('page_number', pageNumber)
    .single()

  if (existing) {
    return NextResponse.json({ id: existing.id, alreadyOptedIn: true })
  }

  const { data, error } = await sb()
    .from('gallery_items')
    .insert({
      session_id:  sessionId,
      page_number: pageNumber,
      image_url:   imageUrl,
      prompt:      prompt?.slice(0, 200) ?? null,
      subject:     subject?.slice(0, 100) ?? null,
      age_range:   ageRange ?? null,
      hero_name:   heroName?.slice(0, 50) ?? null,
      theme_tags:  themeTags.slice(0, 5),
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log event
  void Promise.resolve(sb().from('events').insert({
    event_name: 'gallery_opt_in',
    session_id: sessionId,
    properties: { pageNumber, subject },
  })).then(() => null).catch(() => null)

  return NextResponse.json({ id: data?.id, success: true })
}
