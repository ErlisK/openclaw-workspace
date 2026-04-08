import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { searchEvidence } from '@/lib/evidence-search'
import { computeProvenanceScore } from '@/lib/provenance-scorer'
import { assessRiskFlags, aggregateRiskLevel } from '@/lib/risk-flagger'

// POST /api/sessions/[id]/evidence — search + score + risk-flag all claims
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params

  try {
    // Fetch session for territory setting
    const { data: sessionRow } = await getSupabaseAdmin()
      .from('cc_sessions')
      .select('territory, audience_level')
      .eq('id', sessionId)
      .single()

    const territory = sessionRow?.territory || 'general'

    // Get pending claims (process up to 10 per call)
    const { data: claims, error: claimsError } = await getSupabaseAdmin()
      .from('claims')
      .select('id, text, status, confidence_score, risk_detail')
      .eq('session_id', sessionId)
      .eq('status', 'pending')
      .limit(10)

    if (claimsError) return NextResponse.json({ error: claimsError.message }, { status: 500 })
    if (!claims || claims.length === 0) {
      return NextResponse.json({ message: 'No pending claims', processed: 0 })
    }

    const results = []
    const startTime = Date.now()

    for (const claim of claims) {
      try {
        // 1. Search evidence (PubMed + CrossRef + Unpaywall + Scite approx)
        const sources = await searchEvidence(claim.text)

        // 2. Compute provenance score v2
        const score = computeProvenanceScore(sources)

        // 3. Risk flagging
        const extractionConfidence = (claim.risk_detail as { span?: object; earlyRiskFlags?: string[]; extractedByLLM?: boolean } | null)?.extractedByLLM
          ? (claim.confidence_score || 0.7)
          : 0.7
        const riskFlags = assessRiskFlags(claim.text, sources, score, territory, extractionConfidence)
        const overallRisk = aggregateRiskLevel(riskFlags)

        // 4. Save evidence sources to DB
        if (sources.length > 0) {
          const sourceRows = sources.map(s => ({
            claim_id: claim.id,
            doi: s.doi || null,
            title: s.title,
            authors: s.authors,
            year: s.year || null,
            journal: s.journal || null,
            pmid: s.pmid || null,
            source_db: s.sourceDb,
            abstract_snippet: s.abstractSnippet || null,
            oa_full_text_url: s.oaFullTextUrl || null,
            study_type: s.studyType,
            citation_count: s.citationCount || null,
            retracted: s.isRetracted,
            access_status: s.accessStatus,
            // v2 fields
            scite_support: s.sciteSupport || 0,
            scite_contrast: s.sciteContrast || 0,
            scite_mention: s.sciteMention || 0,
            relevance_score: null,  // future: cosine sim with claim embedding
          }))
          await getSupabaseAdmin().from('evidence_sources').insert(sourceRows)
        }

        // 5. Save provenance score event
        await getSupabaseAdmin().from('provenance_score_events').insert({
          claim_id: claim.id,
          source_count: sources.length,
          avg_recency_score: score.recencyScore,
          study_type_score: score.studyTypeScore,
          scite_sentiment_score: score.sciteSentimentScore,
          retraction_penalty: score.retractionPenalty,
          raw_score: score.finalScore,
          final_score: score.finalScore,
          confidence_band: score.confidenceBand,
          scorer_version: 'v2',
        })

        // 6. Save risk flags to cc_risk_flags table
        if (riskFlags.length > 0) {
          const flagRows = riskFlags.map(f => ({
            claim_id: claim.id,
            flag_type: f.flagType,
            severity: f.severity,
            source: f.source,
            detail: f.detail,
            suggestion: f.suggestion,
          }))
          await getSupabaseAdmin().from('cc_risk_flags').insert(flagRows)
        }

        // 7. Update claim with score, evidence count, and risk flag
        const topFlag = riskFlags[0]
        await getSupabaseAdmin()
          .from('claims')
          .update({
            status: 'scored',
            evidence_count: sources.length,
            confidence_score: score.finalScore,
            confidence_band: score.confidenceBand,
            risk_flag: topFlag?.flagType || null,
            risk_detail: {
              ...(claim.risk_detail as Record<string, unknown> || {}),
              overallRisk,
              flagCount: riskFlags.length,
              scoreBreakdown: score.breakdown,
              topSource: score.topSource,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', claim.id)

        results.push({
          claimId: claim.id,
          text: claim.text,
          sourcesFound: sources.length,
          confidenceScore: score.finalScore,
          confidenceBand: score.confidenceBand,
          scoreBreakdown: score.breakdown,
          riskFlags: riskFlags.map(f => ({ type: f.flagType, severity: f.severity, detail: f.detail })),
          overallRisk,
        })

        // Rate limit: 350ms between claims
        await new Promise(r => setTimeout(r, 350))
      } catch (claimErr) {
        console.error(`Error processing claim ${claim.id}:`, claimErr)
        results.push({ claimId: claim.id, text: claim.text, error: 'Processing failed' })
      }
    }

    const elapsed = Date.now() - startTime

    // Update session status
    await getSupabaseAdmin()
      .from('cc_sessions')
      .update({ status: 'complete' })
      .eq('id', sessionId)

    // Audit log
    await getSupabaseAdmin().from('cc_audit_log').insert({
      session_id: sessionId,
      actor_type: 'system',
      event_type: 'evidence.search_completed',
      event_data: { claims_processed: results.length, elapsed_ms: elapsed, territory },
    })

    return NextResponse.json({
      processed: results.length,
      results,
      elapsedMs: elapsed,
      territory,
    })
  } catch (err) {
    console.error('Evidence search error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
