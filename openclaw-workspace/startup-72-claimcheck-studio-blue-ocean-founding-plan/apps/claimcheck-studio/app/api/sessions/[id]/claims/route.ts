import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET /api/sessions/[id]/claims — return claims with evidence sources and risk flags
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params

  const { data: claims, error } = await getSupabaseAdmin()
    .from('claims')
    .select('id, text, normalized_text, position_index, claim_type, extraction_method, confidence_score, confidence_band, evidence_count, risk_flag, risk_detail, status, human_verified')
    .eq('session_id', sessionId)
    .order('position_index', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch evidence sources for all claims
  const claimIds = (claims || []).map(c => c.id)
  let sourcesByClaim: Record<string, object[]> = {}

  if (claimIds.length > 0) {
    const { data: sources } = await getSupabaseAdmin()
      .from('evidence_sources')
      .select('*')
      .in('claim_id', claimIds)
      .order('created_at', { ascending: true })

    for (const s of sources || []) {
      if (!sourcesByClaim[s.claim_id]) sourcesByClaim[s.claim_id] = []
      sourcesByClaim[s.claim_id].push({
        doi: s.doi,
        title: s.title,
        authors: s.authors,
        year: s.year,
        journal: s.journal,
        pmid: s.pmid,
        sourceDb: s.source_db,
        studyType: s.study_type,
        citationCount: s.citation_count,
        oaFullTextUrl: s.oa_full_text_url,
        accessStatus: s.access_status,
        sciteSupport: s.scite_support,
        sciteContrast: s.scite_contrast,
        isPreprint: s.study_type === 'preprint',
        isAnimalStudy: false,
        isRetracted: s.retracted || false,
        journalCredibility: 'unknown',
      })
    }
  }

  // Fetch risk flags
  let flagsByClaim: Record<string, object[]> = {}
  if (claimIds.length > 0) {
    const { data: flags } = await getSupabaseAdmin()
      .from('cc_risk_flags')
      .select('claim_id, flag_type, severity, detail, suggestion, source')
      .in('claim_id', claimIds)
      .order('created_at', { ascending: true })

    for (const f of flags || []) {
      if (!flagsByClaim[f.claim_id]) flagsByClaim[f.claim_id] = []
      flagsByClaim[f.claim_id].push({
        type: f.flag_type,
        severity: f.severity,
        detail: f.detail,
        suggestion: f.suggestion,
      })
    }
  }

  const enriched = (claims || []).map(c => ({
    id: c.id,
    text: c.text,
    claimType: c.claim_type || 'general',
    confidence: c.confidence_score || 0.7,
    confidenceScore: c.confidence_score,
    confidenceBand: c.confidence_band,
    evidenceCount: c.evidence_count,
    extractedByLLM: c.extraction_method?.startsWith('llm') || false,
    earlyRiskFlags: (c.risk_detail as { earlyRiskFlags?: string[] } | null)?.earlyRiskFlags || [],
    span: (c.risk_detail as { span?: object } | null)?.span || { start: -1, end: -1, text: c.text },
    scoreBreakdown: (c.risk_detail as { scoreBreakdown?: string } | null)?.scoreBreakdown,
    overallRisk: (c.risk_detail as { overallRisk?: string } | null)?.overallRisk,
    status: c.status,
    sources: sourcesByClaim[c.id] || [],
    riskFlags: flagsByClaim[c.id] || [],
  }))

  return NextResponse.json({ claims: enriched })
}
