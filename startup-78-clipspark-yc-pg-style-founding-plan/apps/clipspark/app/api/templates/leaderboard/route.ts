import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/templates/leaderboard
 * 
 * Returns ranked templates with trending scores.
 * Supports: sort (trending|uses|saves|upvotes|tips), period (all|7d|30d), limit
 * 
 * Trending score algorithm:
 *   score = (uses * 1.0) + (saves * 2.5) + (upvotes * 3.0) + (tips * 8.0)
 *   Decayed by age: score * (1 + 0.1 * days_since_featured)^-0.5
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const sort = searchParams.get('sort') || 'trending'
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const featured = searchParams.get('featured') === '1'

  const svc = createServiceClient()

  let query = svc
    .from('templates')
    .select(`
      id, name, description, version, is_system, platforms, use_cases, tags,
      times_used, saves_count, upvotes_count, tip_count, total_tips_received,
      trending_score, is_featured, featured_at,
      creator_display_name, thumbnail_url, avg_views_48h, fork_of,
      created_at
    `)
    .eq('is_public', true)

  if (featured) query = query.eq('is_featured', true)

  // Sort
  const sortMap: Record<string, string> = {
    trending: 'trending_score',
    uses: 'times_used',
    saves: 'saves_count',
    upvotes: 'upvotes_count',
    tips: 'tip_count',
  }
  const sortCol = sortMap[sort] || 'trending_score'
  query = query.order(sortCol, { ascending: false }).limit(limit)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Add rank + medal
  const ranked = (data || []).map((t, i) => ({
    ...t,
    rank: i + 1,
    medal: i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null,
  }))

  return NextResponse.json({ templates: ranked, sort, total: ranked.length })
}
