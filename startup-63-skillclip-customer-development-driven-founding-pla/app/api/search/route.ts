import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/search
 *   Full-text + filter search across tradesperson portfolios.
 *
 * Query params:
 *   q          - free-text (searches name, bio, badge titles, skill tags)
 *   trade      - trade slug (electrician, plumber, etc.)
 *   region     - region_code (US-TX, US-CA, etc.)
 *   skill_tag  - specific skill tag
 *   code_ref   - code section e.g. "NEC 2020 210.8"
 *   compliance - "pass" | "any"
 *   skill_level - "apprentice" | "journeyman" | "master"
 *   min_badges - minimum badge count
 *   min_rating - minimum average review rating
 *   sort       - "badges" | "rating" | "recent" | "experience"
 *   limit      - default 20
 *   offset     - default 0
 *
 * GET /api/search?profile_id=...
 *   Full portfolio for a single tradesperson (clips, reviews, badges, ledger).
 */

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)

  const profile_id = searchParams.get('profile_id')
  const q = searchParams.get('q') || ''
  const trade = searchParams.get('trade') || ''
  const region = searchParams.get('region') || ''
  const skill_tag = searchParams.get('skill_tag') || ''
  const code_ref = searchParams.get('code_ref') || ''
  const compliance = searchParams.get('compliance') || 'any'
  const skill_level = searchParams.get('skill_level') || ''
  const min_badges = parseInt(searchParams.get('min_badges') || '0')
  const min_rating = parseFloat(searchParams.get('min_rating') || '0')
  const sort = searchParams.get('sort') || 'badges'
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const offset = parseInt(searchParams.get('offset') || '0')

  // ── Single profile portfolio ──────────────────────────────────────────────
  if (profile_id) {
    const [
      { data: profile },
      { data: badges },
      { data: clips },
      { data: ledger },
    ] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, years_experience, bio, signup_source, onboarding_completed, created_at').eq('id', profile_id).single(),
      supabase.from('badges').select(`
        id, title, badge_type, skill_tags, region_name, code_standard, issued_at,
        is_revoked, metadata,
        trade:trades!badges_trade_id_fkey(name, slug),
        region:regions!badges_region_id_fkey(name, region_code),
        review:reviews!badges_review_id_fkey(overall_rating, skill_level, feedback_text, timestamped_notes, code_compliance_pass, jurisdiction_notes, completed_at),
        clip:clips!badges_clip_id_fkey(title, duration_seconds, challenge_prompt)
      `).eq('profile_id', profile_id).eq('is_revoked', false).order('issued_at', { ascending: false }),
      supabase.from('clips').select(`
        id, title, description, duration_seconds, status, challenge_prompt, skill_tags, created_at,
        trade:trades!clips_trade_id_fkey(name, slug),
        region:regions!clips_region_id_fkey(name, region_code, code_standard),
        review:reviews!reviews_clip_id_fkey(overall_rating, skill_level, feedback_text, code_compliance_pass, completed_at, timestamped_notes)
      `).eq('uploader_id', profile_id).eq('status', 'reviewed').order('created_at', { ascending: false }).limit(20),
      supabase.from('badges_ledger').select('id, event_type, actor_type, created_at, notes').eq('profile_id', profile_id).order('created_at', { ascending: false }).limit(50),
    ])

    return NextResponse.json({ profile, badges: badges || [], clips: clips || [], ledger: ledger || [] })
  }

  // ── Portfolio search ──────────────────────────────────────────────────────
  // Build SQL via RPC or direct query — use Supabase PostgREST with filters
  // Strategy: query clips joined to reviews+badges, aggregate by tradesperson

  // Get trade_id and region_id from slugs
  let trade_id: string | null = null
  let region_id: string | null = null

  if (trade) {
    const { data } = await supabase.from('trades').select('id').eq('slug', trade).single()
    trade_id = data?.id || null
  }
  if (region) {
    const { data } = await supabase.from('regions').select('id').eq('region_code', region).single()
    region_id = data?.id || null
  }

  // Build profile query with aggregated stats via joined tables
  // Use a view-like approach: get profiles matching criteria
  let profileQuery = supabase
    .from('profiles')
    .select(`
      id, full_name, years_experience, bio,
      badges!badges_profile_id_fkey(
        id, title, badge_type, skill_tags, region_name, code_standard, issued_at, is_revoked,
        trade:trades!badges_trade_id_fkey(name, slug),
        region:regions!badges_region_id_fkey(name, region_code)
      ),
      clips!clips_uploader_id_fkey(
        id, title, skill_tags, status, created_at,
        trade:trades!clips_trade_id_fkey(id, name, slug),
        region:regions!clips_region_id_fkey(id, name, region_code, code_standard),
        review:reviews!reviews_clip_id_fkey(overall_rating, skill_level, code_compliance_pass, completed_at)
      )
    `)
    .eq('role', 'tradesperson')
    .eq('onboarding_completed', true)
    .limit(limit + 20)  // fetch extra, filter in JS

  const { data: rawProfiles, error } = await profileQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Post-process: compute stats and apply filters
  type ResultProfile = {
    id: string
    full_name: string
    years_experience: number
    bio: string
    badges: any[]
    clips: any[]
    badge_count: number
    reviewed_clip_count: number
    avg_rating: number | null
    trades: string[]
    regions: string[]
    skill_tags: string[]
    has_live_verification: boolean
    compliance_pass_rate: number
    top_skill_level: string
  }

  const profiles: ResultProfile[] = (rawProfiles || []).map((p: any) => {
    const activeBadges = (p.badges || []).filter((b: any) => !b.is_revoked)
    const reviewedClips = (p.clips || []).filter((c: any) => c.status === 'reviewed')
    const allReviews = reviewedClips.flatMap((c: any) => Array.isArray(c.review) ? c.review : c.review ? [c.review] : [])
    const ratings = allReviews.map((r: any) => r.overall_rating).filter(Boolean)
    const avgRating = ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : null
    const compliancePassed = allReviews.filter((r: any) => r.code_compliance_pass).length
    const complianceRate = allReviews.length ? compliancePassed / allReviews.length : 0

    const allTrades = [...new Set([
      ...activeBadges.map((b: any) => b.trade?.slug).filter(Boolean),
      ...reviewedClips.map((c: any) => c.trade?.slug).filter(Boolean),
    ])]
    const allRegions = [...new Set([
      ...activeBadges.map((b: any) => b.region?.region_code).filter(Boolean),
      ...reviewedClips.map((c: any) => c.region?.region_code).filter(Boolean),
    ])]
    const allSkillTags = [...new Set([
      ...activeBadges.flatMap((b: any) => b.skill_tags || []),
      ...reviewedClips.flatMap((c: any) => c.skill_tags || []),
    ])]

    const skillLevels = allReviews.map((r: any) => r.skill_level).filter(Boolean)
    const topLevel = skillLevels.includes('master') ? 'master' : skillLevels.includes('journeyman') ? 'journeyman' : skillLevels.includes('apprentice') ? 'apprentice' : ''

    return {
      ...p,
      badges: activeBadges,
      clips: reviewedClips,
      badge_count: activeBadges.length,
      reviewed_clip_count: reviewedClips.length,
      avg_rating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      trades: allTrades,
      regions: allRegions,
      skill_tags: allSkillTags,
      has_live_verification: false,
      compliance_pass_rate: Math.round(complianceRate * 100),
      top_skill_level: topLevel,
    }
  })

  // Apply filters
  let filtered = profiles.filter(p => {
    if (p.badge_count < min_badges) return false
    if (min_rating > 0 && (!p.avg_rating || p.avg_rating < min_rating)) return false
    if (trade && !p.trades.includes(trade)) return false
    if (region && !p.regions.includes(region)) return false
    if (skill_level && p.top_skill_level !== skill_level) return false
    if (compliance === 'pass' && p.compliance_pass_rate < 80) return false
    if (skill_tag) {
      const tagMatch = p.skill_tags.some((t: string) => t.toLowerCase().includes(skill_tag.toLowerCase()))
      const badgeTitleMatch = p.badges.some((b: any) => b.title?.toLowerCase().includes(skill_tag.toLowerCase()))
      if (!tagMatch && !badgeTitleMatch) return false
    }
    if (code_ref) {
      const codeMatch = p.badges.some((b: any) => b.code_standard?.includes(code_ref))
      if (!codeMatch) return false
    }
    if (q) {
      const qLower = q.toLowerCase()
      const nameMatch = p.full_name?.toLowerCase().includes(qLower)
      const bioMatch = p.bio?.toLowerCase().includes(qLower)
      const badgeMatch = p.badges.some((b: any) => b.title?.toLowerCase().includes(qLower))
      const tagMatch = p.skill_tags.some((t: string) => t.toLowerCase().includes(qLower))
      if (!nameMatch && !bioMatch && !badgeMatch && !tagMatch) return false
    }
    return true
  })

  // Sort
  filtered.sort((a, b) => {
    switch (sort) {
      case 'rating': return (b.avg_rating || 0) - (a.avg_rating || 0)
      case 'recent': return b.reviewed_clip_count - a.reviewed_clip_count
      case 'experience': return b.years_experience - a.years_experience
      default: return b.badge_count - a.badge_count // 'badges'
    }
  })

  const paginated = filtered.slice(offset, offset + limit)

  return NextResponse.json({
    results: paginated,
    total: filtered.length,
    limit,
    offset,
    filters: { q, trade, region, skill_tag, code_ref, compliance, skill_level, min_badges, min_rating, sort },
  })
}
