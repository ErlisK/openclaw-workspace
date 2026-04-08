import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { extractClaimsLLM } from '@/lib/llm-extractor'

// POST /api/sessions — create session, extract text, extract claims via LLM+fallback
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const text = formData.get('text') as string | null
    const audienceLevel = (formData.get('audienceLevel') as string) || 'journalist'
    const title = (formData.get('title') as string) || 'Untitled Document'
    const territory = (formData.get('territory') as string) || 'general'

    let documentText = ''
    let documentType = 'txt'

    if (file) {
      documentType = file.name.split('.').pop()?.toLowerCase() || 'txt'
      documentText = await file.text()
    } else if (text) {
      documentText = text
    } else {
      return NextResponse.json({ error: 'No file or text provided' }, { status: 400 })
    }

    if (documentText.length < 50) {
      return NextResponse.json({ error: 'Document too short (minimum 50 characters)' }, { status: 400 })
    }

    // Extract claims — LLM-based with rule-based fallback
    const startTime = Date.now()
    const extracted = await extractClaimsLLM(documentText)
    const extractionMs = Date.now() - startTime

    const usedLLM = extracted.some(c => c.extractedByLLM)
    const extractionMethod = usedLLM ? 'llm_claude_haiku' : 'rule_v3'

    // Create session
    const { data: session, error: sessionError } = await getSupabaseAdmin()
      .from('cc_sessions')
      .insert({
        title,
        audience_level: audienceLevel,
        territory,
        status: 'draft',
        document_type: documentType,
        word_count: documentText.split(/\s+/).length,
        claim_count: extracted.length,
        processing_ms: extractionMs,
        source_type: file ? 'file' : 'paste',
      })
      .select('id, title, status, claim_count, created_at')
      .single()

    if (sessionError || !session) {
      console.error('Session insert error:', sessionError)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    // Insert claims with span offsets
    if (extracted.length > 0) {
      const claimRows = extracted.map(c => ({
        session_id: session.id,
        text: c.text,
        normalized_text: c.normalizedText,
        position_index: c.positionIndex,
        claim_type: c.claimType,
        extraction_method: extractionMethod,
        status: 'pending',
        evidence_count: 0,
        // Store span as JSON in risk_detail (no separate column yet)
        risk_detail: {
          span: c.span,
          earlyRiskFlags: c.earlyRiskFlags || [],
          rationale: c.rationale,
          extractedByLLM: c.extractedByLLM,
        },
      }))

      const { error: claimError } = await getSupabaseAdmin()
        .from('claims')
        .insert(claimRows)

      if (claimError) {
        console.error('Claims insert error:', claimError)
      }
    }

    // Audit event
    await getSupabaseAdmin().from('cc_audit_log').insert({
      session_id: session.id,
      actor_type: 'system',
      event_type: 'session.created',
      event_data: {
        title,
        document_type: documentType,
        word_count: documentText.split(/\s+/).length,
        claims_extracted: extracted.length,
        extraction_ms: extractionMs,
        extraction_method: extractionMethod,
        territory,
      },
    })

    return NextResponse.json({
      session: {
        ...session,
        claimsExtracted: extracted.length,
        extractionMs,
        extractionMethod,
        audienceLevel,
        territory,
      },
      claims: extracted.map((c, i) => ({
        index: i,
        text: c.text,
        claimType: c.claimType,
        confidence: c.confidence,
        span: c.span,
        extractedByLLM: c.extractedByLLM,
        earlyRiskFlags: c.earlyRiskFlags || [],
      })),
    })
  } catch (err) {
    console.error('POST /api/sessions error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/sessions — list recent sessions
export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from('cc_sessions')
    .select('id, title, status, claim_count, audience_level, territory, created_at, processing_ms')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sessions: data })
}
