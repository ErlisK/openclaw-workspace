import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { searchEvidence } from '@/lib/evidence-search'
import { computeProvenanceScore } from '@/lib/provenance-scorer'

// POST /api/sessions/[id]/evidence — search evidence for all claims in session
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params

  try {
    // Get all pending claims for this session
    const { data: claims, error: claimsError } = await getSupabaseAdmin()
      .from('claims')
      .select('id, text, status')
      .eq('session_id', sessionId)
      .eq('status', 'pending')
      .limit(10) // process max 10 claims per call

    if (claimsError) return NextResponse.json({ error: claimsError.message }, { status: 500 })
    if (!claims || claims.length === 0) {
      return NextResponse.json({ message: 'No pending claims to process', processed: 0 })
    }

    const results = []
    const startTime = Date.now()

    for (const claim of claims) {
      try {
        // Search evidence
        const sources = await searchEvidence(claim.text)

        // Compute provenance score
        const score = computeProvenanceScore(sources)

        // Save evidence sources
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
            retracted: false,
            access_status: s.accessStatus,
          }))

          await getSupabaseAdmin().from('evidence_sources').insert(sourceRows)
        }

        // Save provenance score event
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
          scorer_version: 'v1',
        })

        // Update claim status and score
        await getSupabaseAdmin()
          .from('claims')
          .update({
            status: 'scored',
            evidence_count: sources.length,
            confidence_score: score.finalScore,
            confidence_band: score.confidenceBand,
            updated_at: new Date().toISOString(),
          })
          .eq('id', claim.id)

        results.push({
          claimId: claim.id,
          text: claim.text.slice(0, 80) + '...',
          sourcesFound: sources.length,
          confidenceScore: score.finalScore,
          confidenceBand: score.confidenceBand,
        })

        // Rate limit: 300ms between claims to be polite to free APIs
        await new Promise(r => setTimeout(r, 300))
      } catch (claimErr) {
        console.error(`Error processing claim ${claim.id}:`, claimErr)
        results.push({ claimId: claim.id, error: 'Search failed' })
      }
    }

    const elapsed = Date.now() - startTime

    // Update session status
    await getSupabaseAdmin()
      .from('cc_sessions')
      .update({ status: 'complete' })
      .eq('id', sessionId)

    // Audit event
    await getSupabaseAdmin().from('audit_events').insert({
      session_id: sessionId,
      event_type: 'evidence.search_completed',
      event_data: { claims_processed: results.length, elapsed_ms: elapsed },
    })

    return NextResponse.json({ processed: results.length, results, elapsedMs: elapsed })
  } catch (err) {
    console.error('Evidence search error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
