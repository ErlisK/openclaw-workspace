import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const {
    clip_id,
    review_id,
    region_id,
    trade_id,
    code_reference_ids,
    skill_level,
    overall_rating,
    title,
    description,
    issued_by,
  } = body

  if (!clip_id || !region_id) {
    return NextResponse.json({ error: 'clip_id and region_id required' }, { status: 400 })
  }

  // Get clip uploader
  const { data: clip } = await supabase
    .from('clips')
    .select('uploader_id, title, trade_id')
    .eq('id', clip_id)
    .single()

  if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 })

  // Get region details for badge metadata
  const { data: region } = await supabase
    .from('regions')
    .select('name, code_standard, region_code')
    .eq('id', region_id)
    .single()

  // Get code references
  let codeRefs: any[] = []
  if (code_reference_ids?.length) {
    const { data } = await supabase
      .from('code_references')
      .select('id, code_standard, section, title, severity')
      .in('id', code_reference_ids)
    codeRefs = data || []
  }

  // Aggregate skill_tags from selected code refs
  const { data: tagData } = await supabase
    .from('code_references')
    .select('skill_tags')
    .in('id', code_reference_ids || [])
  const allTags = [...new Set((tagData || []).flatMap((r: any) => r.skill_tags || []))]

  // Create badge
  const { data: badge, error } = await supabase
    .from('badges')
    .insert({
      profile_id: clip.uploader_id,
      clip_id,
      review_id,
      trade_id: trade_id || clip.trade_id,
      region_id,
      region_name: region?.name,
      code_standard: region?.code_standard,
      code_reference_ids: code_reference_ids || [],
      skill_tags: allTags,
      badge_type: 'skill',
      title: title || `Verified: ${clip.title}`,
      description: description || `Reviewed at ${skill_level} level. Rating: ${overall_rating}/5. Jurisdiction: ${region?.name} (${region?.region_code}).`,
      issued_by: issued_by || 'CertClip Mentor',
      metadata: {
        skill_level,
        overall_rating,
        region_code: region?.region_code,
        code_refs: codeRefs,
        issued_at: new Date().toISOString(),
      },
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark clip as reviewed
  await supabase.from('clips').update({ status: 'reviewed' }).eq('id', clip_id)
  if (review_id) {
    await supabase.from('reviews').update({ status: 'completed' }).eq('id', review_id)
  }

  return NextResponse.json({ badge, code_refs: codeRefs })
}
