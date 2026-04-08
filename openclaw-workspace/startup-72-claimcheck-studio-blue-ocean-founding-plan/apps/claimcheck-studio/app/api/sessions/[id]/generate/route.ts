import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { generateContent, type OutputFormat, type AudienceLevel, type ScoredClaim } from '@/lib/content-generator'
import { checkCompliance } from '@/lib/compliance-checker'

// POST /api/sessions/[id]/generate — generate content from scored claims
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params

  try {
    const body = await request.json()
    const formats: OutputFormat[] = body.formats || ['twitter_thread', 'linkedin_post', 'blog_section']
    const audienceLevel: AudienceLevel = body.audienceLevel || 'journalist'
    const territory = body.territory || 'general'

    // Fetch scored claims with their evidence
    const { data: claims, error: claimsError } = await getSupabaseAdmin()
      .from('claims')
      .select('id, text, confidence_score, confidence_band')
      .eq('session_id', sessionId)
      .not('confidence_score', 'is', null)
      .order('confidence_score', { ascending: false })
      .limit(10)

    if (claimsError) return NextResponse.json({ error: claimsError.message }, { status: 500 })
    if (!claims || claims.length === 0) {
      return NextResponse.json({ error: 'No scored claims found. Run evidence search first.' }, { status: 400 })
    }

    // Fetch evidence sources for each claim
    const { data: allSources, error: sourcesError } = await getSupabaseAdmin()
      .from('evidence_sources')
      .select('*')
      .in('claim_id', claims.map(c => c.id))

    if (sourcesError) console.warn('Sources fetch warning:', sourcesError)

    const sourcesByClaim = new Map<string, typeof allSources>()
    allSources?.forEach(s => {
      if (!sourcesByClaim.has(s.claim_id)) sourcesByClaim.set(s.claim_id, [])
      sourcesByClaim.get(s.claim_id)!.push(s)
    })

    // Build scored claims for generator
    const scoredClaims: ScoredClaim[] = claims.map(c => ({
      id: c.id,
      text: c.text,
      confidenceScore: c.confidence_score || 0,
      confidenceBand: c.confidence_band || 'none',
      sources: (sourcesByClaim.get(c.id) || []).map(s => ({
        doi: s.doi,
        title: s.title,
        authors: s.authors || [],
        year: s.year,
        journal: s.journal,
        pmid: s.pmid,
        sourceDb: s.source_db,
        studyType: s.study_type,
        citationCount: s.citation_count,
        oaFullTextUrl: s.oa_full_text_url,
        accessStatus: s.access_status || 'unknown',
      })),
    }))

    const outputs = []

    for (const format of formats) {
      const generated = generateContent(scoredClaims, format, audienceLevel)
      const complianceFlags = checkCompliance(generated.content, territory as 'general' | 'fda_us' | 'ema_eu')

      // Save to DB
      const { data: outputRow } = await getSupabaseAdmin()
        .from('generated_outputs')
        .insert({
          session_id: sessionId,
          format,
          audience_level: audienceLevel,
          content_json: { text: generated.content, attributions: generated.attributions },
          word_count: generated.wordCount,
          compliance_checked: true,
          compliance_clean: complianceFlags.length === 0,
        })
        .select('id')
        .single()

      // Save compliance checks if any
      if (complianceFlags.length > 0 && outputRow) {
        await getSupabaseAdmin().from('compliance_checks').insert(
          complianceFlags.map(f => ({
            output_id: outputRow.id,
            sentence_index: f.sentenceIndex,
            matched_text: f.matchedText,
            severity: f.severity,
            suggestion: f.suggestion,
            context_window: f.ruleCode,
            decision: null,
          }))
        )
      }

      outputs.push({
        format,
        audienceLevel,
        content: generated.content,
        wordCount: generated.wordCount,
        complianceFlags,
        complianceClean: complianceFlags.length === 0,
        attributionCount: generated.attributions.length,
      })
    }

    // Audit event
    await getSupabaseAdmin().from('audit_events').insert({
      session_id: sessionId,
      event_type: 'output.generated',
      event_data: {
        formats,
        audience_level: audienceLevel,
        territory,
        claims_used: scoredClaims.length,
        total_flags: outputs.reduce((n, o) => n + o.complianceFlags.length, 0),
      },
    })

    return NextResponse.json({ outputs })
  } catch (err) {
    console.error('Generate error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
