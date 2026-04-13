import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/review?clip_id=...
 *   Fetch clip details + existing review + code references for trade/region
 *
 * POST /api/review
 *   Submit or update a review, optionally issuing a badge with ledger entry
 */

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const clip_id = searchParams.get('clip_id')
  const review_id = searchParams.get('review_id')
  const mentor_id = searchParams.get('mentor_id')

  if (clip_id) {
    // Get clip with related data
    const { data: clip, error: clipErr } = await supabase
      .from('clips')
      .select(`
        id, title, description, challenge_prompt, challenge_prompt_id,
        prompt_issued_at, duration_seconds, file_size_bytes, storage_path,
        storage_bucket, status, skill_tags, created_at,
        uploader:profiles!clips_uploader_id_fkey(id, full_name, email, years_experience, bio),
        trade:trades!clips_trade_id_fkey(id, slug, name),
        region:regions!clips_region_id_fkey(id, region_code, name, code_standard)
      `)
      .eq('id', clip_id)
      .single()

    if (clipErr) return NextResponse.json({ error: clipErr.message }, { status: 404 })

    // Get code references for this trade/region
    const { data: codeRefs } = await supabase
      .from('code_references')
      .select('id, code_standard, section, title, description, severity, skill_tags')
      .eq('active', true)
      .eq('trade_id', (clip as any).trade?.id)
      .or(
        `region_id.eq.${(clip as any).region?.id},region_id.is.null`
      )
      .order('severity', { ascending: true }) // violation first
      .limit(20)

    // Get existing review if any
    let review = null
    if (mentor_id) {
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('clip_id', clip_id)
        .eq('reviewer_id', mentor_id)
        .single()
      review = data
    }

    // Get video URL from storage
    const { data: urlData } = supabase.storage
      .from(clip.storage_bucket || 'clips')
      .getPublicUrl(clip.storage_path)

    return NextResponse.json({ clip, code_refs: codeRefs || [], review, video_url: urlData?.publicUrl })
  }

  if (review_id) {
    const { data, error } = await supabase.from('reviews').select('*').eq('id', review_id).single()
    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    return NextResponse.json(data)
  }

  // List pending reviews for a mentor
  if (mentor_id) {
    const { data } = await supabase
      .from('reviews')
      .select(`
        id, status, assigned_at, created_at,
        clip:clips!reviews_clip_id_fkey(
          id, title, challenge_prompt, duration_seconds, created_at,
          trade:trades!clips_trade_id_fkey(name, slug),
          region:regions!clips_region_id_fkey(name, region_code, code_standard),
          uploader:profiles!clips_uploader_id_fkey(full_name)
        )
      `)
      .eq('reviewer_id', mentor_id)
      .in('status', ['assigned', 'pending'])
      .order('assigned_at', { ascending: true })
      .limit(20)
    return NextResponse.json(data || [])
  }

  return NextResponse.json({ error: 'clip_id, review_id, or mentor_id required' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()
  const {
    review_id,
    clip_id,
    reviewer_id,
    overall_rating,
    skill_level,
    feedback_text,
    code_compliance_pass,
    jurisdiction_notes,
    timestamped_notes,
    code_reference_ids,
    recommended_skill_level,
    challenge_prompt_addressed,
    review_duration_seconds,
    issue_badge,
    badge_title,
    badge_type,
    is_public,
  } = body

  if (!reviewer_id) return NextResponse.json({ error: 'reviewer_id required' }, { status: 400 })

  const now = new Date().toISOString()

  // Get clip for badge issuance
  const { data: clip } = await supabase
    .from('clips')
    .select('id, uploader_id, trade_id, region_id, title')
    .eq('id', clip_id)
    .single()

  if (!clip) return NextResponse.json({ error: 'clip not found' }, { status: 404 })

  // Upsert review
  const reviewData = {
    clip_id,
    reviewer_id,
    status: 'completed' as const,
    overall_rating,
    skill_level,
    feedback_text,
    code_compliance_pass,
    jurisdiction_notes,
    timestamped_notes: timestamped_notes || [],
    code_reference_ids: code_reference_ids || [],
    recommended_skill_level: recommended_skill_level || skill_level,
    challenge_prompt_addressed: challenge_prompt_addressed ?? true,
    review_duration_seconds,
    is_public: is_public !== false,
    completed_at: now,
    updated_at: now,
  }

  let savedReview: any
  if (review_id) {
    const { data, error } = await supabase.from('reviews').update(reviewData).eq('id', review_id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    savedReview = data
  } else {
    const { data, error } = await supabase.from('reviews').insert({ ...reviewData, assigned_at: now }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    savedReview = data
  }

  // Update clip status → reviewed
  await supabase.from('clips').update({ status: 'reviewed', updated_at: now }).eq('id', clip_id)

  let badge = null
  let ledgerEntry = null

  // Issue badge if requested and code compliance passed
  if (issue_badge && code_compliance_pass && overall_rating >= 3) {
    // Get trade and region info for badge
    const { data: tradeData } = await supabase.from('trades').select('name, slug').eq('id', clip.trade_id).single()
    const { data: regionData } = await supabase.from('regions').select('name, region_code, code_standard').eq('id', clip.region_id || '').single()

    const badgeTitle = badge_title ||
      `${tradeData?.name || 'Trade'} — ${skill_level?.charAt(0).toUpperCase() + skill_level?.slice(1) || 'Journeyman'} Level${regionData ? ` · ${regionData.region_code}` : ''}`

    const { data: newBadge, error: badgeErr } = await supabase
      .from('badges')
      .insert({
        profile_id: clip.uploader_id,
        clip_id: clip.id,
        review_id: savedReview.id,
        trade_id: clip.trade_id,
        region_id: clip.region_id,
        badge_type: badge_type || 'skill_verification',
        title: badgeTitle,
        description: `Verified by ${reviewer_id}. ${feedback_text?.slice(0, 100) || ''}`,
        issued_by: reviewer_id,
        issued_at: now,
        is_revoked: false,
        code_standard: regionData?.code_standard || null,
        region_name: regionData?.name || null,
        skill_tags: body.skill_tags || [],
        code_reference_ids: code_reference_ids || [],
        metadata: {
          overall_rating,
          skill_level,
          code_compliance_pass,
          jurisdiction_notes,
          clip_title: clip.title,
        },
      })
      .select()
      .single()

    if (badgeErr) {
      console.error('Badge error:', badgeErr.message)
    } else {
      badge = newBadge

      // Update review with badge_id
      await supabase.from('reviews').update({ badge_issued: true, badge_id: newBadge.id }).eq('id', savedReview.id)

      // Append-only ledger entry
      const req_headers = req.headers
      const { data: ledger, error: ledgerErr } = await supabase
        .from('badges_ledger')
        .insert({
          badge_id: newBadge.id,
          profile_id: clip.uploader_id,
          event_type: 'issued',
          actor_id: reviewer_id,
          actor_type: 'mentor',
          ip_address: req_headers.get('x-forwarded-for') || req_headers.get('x-real-ip') || 'unknown',
          user_agent: req_headers.get('user-agent')?.slice(0, 200) || 'unknown',
          notes: `Issued via review ${savedReview.id}. Rating: ${overall_rating}/5. Skill level: ${skill_level}. Code compliance: ${code_compliance_pass ? 'PASS' : 'FAIL'}.`,
          metadata: {
            review_id: savedReview.id,
            clip_id: clip.id,
            overall_rating,
            skill_level,
            code_compliance_pass,
            code_reference_ids,
            timestamped_notes_count: (timestamped_notes || []).length,
          },
        })
        .select()
        .single()

      if (!ledgerErr) ledgerEntry = ledger
    }
  }

  return NextResponse.json({
    review: savedReview,
    badge,
    ledger_entry: ledgerEntry,
    badge_issued: !!badge,
  })
}
