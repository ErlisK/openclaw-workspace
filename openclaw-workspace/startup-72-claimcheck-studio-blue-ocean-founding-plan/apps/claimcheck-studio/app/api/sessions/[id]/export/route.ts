import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET /api/sessions/[id]/export — generate CiteBundle data
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params

  try {
    // Get session
    const { data: session } = await getSupabaseAdmin()
      .from('cc_sessions')
      .select('id, title, audience_level, claim_count, created_at')
      .eq('id', sessionId)
      .single()

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    // Get scored claims
    const { data: claims } = await getSupabaseAdmin()
      .from('claims')
      .select('id, text, confidence_score, confidence_band, evidence_count')
      .eq('session_id', sessionId)
      .order('confidence_score', { ascending: false })

    // Get all evidence sources
    const { data: sources } = await getSupabaseAdmin()
      .from('evidence_sources')
      .select('*')
      .in('claim_id', (claims || []).map(c => c.id))

    // Build CSV
    const csvHeader = 'DOI,Title,Authors,Year,Journal,PMID,Study Type,Access Status,Claim\n'
    const csvRows = (sources || []).map(s => {
      const relatedClaim = claims?.find(c => c.id === s.claim_id)
      const claimText = relatedClaim?.text?.slice(0, 80)?.replace(/,/g, ';') || ''
      return [
        s.doi || '',
        `"${(s.title || '').replace(/"/g, "'")}"`,
        `"${(s.authors || []).join('; ')}"`,
        s.year || '',
        `"${(s.journal || '').replace(/"/g, "'")}"`,
        s.pmid || '',
        s.study_type || '',
        s.access_status || '',
        `"${claimText}"`,
      ].join(',')
    })
    const csv = csvHeader + csvRows.join('\n')

    // Build BibTeX
    const bibtex = (sources || []).map((s, i) => {
      const key = `ref${i + 1}_${(s.authors?.[0] || 'unknown').split(',')[0].toLowerCase().replace(/\s/g, '')}${s.year || ''}`
      return `@article{${key},\n  title={${s.title || ''}},\n  author={${(s.authors || []).join(' and ')}},\n  year={${s.year || ''}},\n  journal={${s.journal || ''}},\n  doi={${s.doi || ''}}\n}`
    }).join('\n\n')

    // Build Vancouver references
    const vancouver = (sources || []).map((s, i) => {
      const authors = (s.authors || []).slice(0, 3).join(', ') + ((s.authors?.length || 0) > 3 ? ', et al.' : '.')
      const doi = s.doi ? ` doi:${s.doi}` : ''
      return `${i + 1}. ${authors} ${s.title}. ${s.journal || ''}. ${s.year || ''};${doi}`
    }).join('\n')

    // Confidence report text
    const confidenceReport = [
      `CITEBUNDLE CONFIDENCE REPORT`,
      `Session: ${session.title}`,
      `Generated: ${new Date().toISOString()}`,
      `Source: https://citebundle.com`,
      '',
      '=== CLAIM CONFIDENCE SCORES ===',
      ...(claims || []).map(c =>
        `[${c.confidence_band?.toUpperCase() || 'NONE'} | Score: ${c.confidence_score?.toFixed(3) || 'N/A'}] ${c.text?.slice(0, 120)}`
      ),
      '',
      `Total claims: ${claims?.length || 0}`,
      `Total sources: ${sources?.length || 0}`,
      `High confidence claims: ${claims?.filter(c => c.confidence_band === 'high').length || 0}`,
      `Moderate confidence claims: ${claims?.filter(c => c.confidence_band === 'moderate').length || 0}`,
      `Low/No confidence claims: ${claims?.filter(c => ['low', 'none'].includes(c.confidence_band || '')).length || 0}`,
    ].join('\n')

    // Log citebundle export
    await getSupabaseAdmin().from('citebundle_exports').insert({
      session_id: sessionId,
      includes_csv: true,
      includes_bibtex: true,
      includes_vancouver: true,
      includes_excerpts: false,
      includes_confidence_report: true,
      source_count: sources?.length || 0,
      claim_count: claims?.length || 0,
      expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    })

    await getSupabaseAdmin().from('audit_events').insert({
      session_id: sessionId,
      event_type: 'citebundle.exported',
      event_data: { source_count: sources?.length || 0, claim_count: claims?.length || 0 },
    })

    return NextResponse.json({
      session: { id: session.id, title: session.title },
      summary: {
        totalClaims: claims?.length || 0,
        totalSources: sources?.length || 0,
        highConfidence: claims?.filter(c => c.confidence_band === 'high').length || 0,
        moderateConfidence: claims?.filter(c => c.confidence_band === 'moderate').length || 0,
      },
      bundle: {
        csv,
        bibtex,
        vancouver,
        confidenceReport,
      },
    })
  } catch (err) {
    console.error('Export error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
