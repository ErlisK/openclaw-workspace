import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { extractClaims } from '@/lib/claim-extractor'

// POST /api/sessions — create session, extract text, extract claims
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const text = formData.get('text') as string | null
    const audienceLevel = (formData.get('audienceLevel') as string) || 'journalist'
    const title = (formData.get('title') as string) || 'Untitled Document'

    let documentText = ''
    let documentType = 'txt'

    if (file) {
      documentType = file.name.split('.').pop()?.toLowerCase() || 'txt'
      if (documentType === 'txt') {
        documentText = await file.text()
      } else if (documentType === 'pdf') {
        // For alpha: read as text (real PDF parsing via pdf-parse in server)
        documentText = await file.text()
      } else {
        documentText = await file.text()
      }
    } else if (text) {
      documentText = text
    } else {
      return NextResponse.json({ error: 'No file or text provided' }, { status: 400 })
    }

    if (documentText.length < 50) {
      return NextResponse.json({ error: 'Document too short (minimum 50 characters)' }, { status: 400 })
    }

    // Extract claims
    const startTime = Date.now()
    const extracted = extractClaims(documentText)
    const extractionMs = Date.now() - startTime

    // Create session in DB
    const { data: session, error: sessionError } = await getSupabaseAdmin()
      .from('cc_sessions')
      .insert({
        title,
        audience_level: audienceLevel,
        status: 'draft',
        document_type: documentType,
        word_count: documentText.split(/\s+/).length,
        claim_count: extracted.length,
      })
      .select('id, title, status, claim_count, created_at')
      .single()

    if (sessionError || !session) {
      console.error('Session insert error:', sessionError)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    // Insert claims
    if (extracted.length > 0) {
      const claimRows = extracted.map(c => ({
        session_id: session.id,
        text: c.text,
        normalized_text: c.normalizedText,
        position_index: c.positionIndex,
        status: 'pending',
        evidence_count: 0,
      }))

      const { error: claimError } = await getSupabaseAdmin()
        .from('claims')
        .insert(claimRows)

      if (claimError) {
        console.error('Claims insert error:', claimError)
      }
    }

    // Log audit event
    await getSupabaseAdmin().from('audit_events').insert({
      session_id: session.id,
      event_type: 'session.created',
      event_data: {
        title,
        document_type: documentType,
        word_count: documentText.split(/\s+/).length,
        claims_extracted: extracted.length,
        extraction_ms: extractionMs,
      },
    })

    return NextResponse.json({
      session: {
        ...session,
        claimsExtracted: extracted.length,
        extractionMs,
        audienceLevel,
      },
      claims: extracted.map((c, i) => ({
        index: i,
        text: c.text,
        claimType: c.claimType,
        confidence: c.confidence,
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
    .select('id, title, status, claim_count, audience_level, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sessions: data })
}
