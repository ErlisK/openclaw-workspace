import { NextRequest, NextResponse } from 'next/server'
import { generateChannelOutput, type ChannelFormat, type ReadingLevel, type Territory } from '@/lib/channel-generator'
import { getSupabaseAdmin } from '@/lib/supabase'
import { emitTelemetry } from '@/lib/jobs'

/**
 * POST /api/outputs — generate channel-ready content for a session
 *
 * Body:
 *   { sessionId, format, readingLevel, territory?, wordCountTarget?, includeDisclaimers? }
 *
 * GET /api/outputs?sessionId=xxx — list outputs for session
 */

export async function POST(request: NextRequest) {
  const t0 = Date.now()
  try {
    const body = await request.json() as {
      sessionId: string
      format: ChannelFormat
      readingLevel: ReadingLevel
      territory?: Territory
      topicContext?: string
      wordCountTarget?: number
      includeDisclaimers?: boolean
      claimIds?: string[]
    }

    const {
      sessionId, format, readingLevel,
      territory = 'general',
      wordCountTarget,
      includeDisclaimers = true,
      claimIds,
    } = body

    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
    if (!format) return NextResponse.json({ error: 'format required' }, { status: 400 })
    if (!readingLevel) return NextResponse.json({ error: 'readingLevel required' }, { status: 400 })

    const supabase = getSupabaseAdmin()

    // Get session context
    const { data: session } = await supabase
      .from('cc_sessions')
      .select('id, title, audience_level, territory')
      .eq('id', sessionId)
      .single()
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const topicContext = body.topicContext || session.title || 'research findings'

    // Fetch claims with sources
    let claimQuery = supabase
      .from('claims')
      .select('id, text, claim_type, confidence_band, confidence_score')
      .eq('session_id', sessionId)
      .order('confidence_score', { ascending: false })

    if (claimIds?.length) {
      claimQuery = claimQuery.in('id', claimIds)
    }

    const { data: claimsRaw } = await claimQuery.limit(10)

    if (!claimsRaw?.length) {
      return NextResponse.json({ error: 'No claims found for session' }, { status: 404 })
    }

    // Fetch evidence sources for these claims
    const claimIdList = claimsRaw.map(c => c.id)
    const { data: sourcesRaw } = await supabase
      .from('evidence_sources')
      .select('claim_id, title, authors, year, doi, journal, abstract_snippet, study_type')
      .in('claim_id', claimIdList)
      .limit(50)

    const sourcesByClaimId: Record<string, typeof sourcesRaw> = {}
    for (const src of sourcesRaw || []) {
      if (!sourcesByClaimId[src.claim_id]) sourcesByClaimId[src.claim_id] = []
      sourcesByClaimId[src.claim_id]!.push(src)
    }

    // Shape claims for generator
    const claims = claimsRaw.map(c => ({
      id: c.id,
      text: c.text,
      confidenceBand: (c.confidence_band || 'low') as 'high' | 'moderate' | 'low' | 'none',
      confidenceScore: c.confidence_score || 0.5,
      sources: (sourcesByClaimId[c.id] || []).map(s => ({
        title: s.title,
        authors: s.authors || [],
        year: s.year || undefined,
        doi: s.doi || undefined,
        journal: s.journal || undefined,
        abstractSnippet: s.abstract_snippet || undefined,
        studyType: s.study_type || undefined,
      })),
    }))

    // Generate
    const result = await generateChannelOutput({
      sessionId,
      claims,
      format,
      readingLevel,
      territory: (territory || session.territory || 'general') as Territory,
      topicContext,
      wordCountTarget,
      includeDisclaimers,
    })

    await emitTelemetry({
      eventType: 'output.generated',
      sessionId,
      metadata: {
        outputId: result.outputId,
        format,
        readingLevel,
        wordCount: result.wordCount,
        claimsUsed: result.claimsUsed.length,
        tokensUsed: result.tokensUsed,
        elapsedMs: Date.now() - t0,
      },
    })

    return NextResponse.json({
      output: result,
      elapsedMs: Date.now() - t0,
    })

  } catch (err) {
    console.error('Output generation error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const { data, error } = await getSupabaseAdmin()
    .from('generated_outputs')
    .select('id, format, reading_level, territory, word_count, tweet_count, model, generated_at, cms_metadata')
    .eq('session_id', sessionId)
    .order('generated_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ outputs: data || [] })
}
