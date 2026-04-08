import { NextRequest, NextResponse } from 'next/server'
import { runComplianceCheck, type Territory } from '@/lib/compliance-agent'
import { getSupabaseAdmin } from '@/lib/supabase'
import { emitTelemetry } from '@/lib/jobs'

/**
 * POST /api/compliance
 * Run compliance check on provided text or a session's generated outputs.
 *
 * Body:
 *   { text, sessionId, territory, audienceLevel?, outputFormat?, claimIds?, reviewerIds?, outputVersion? }
 *   OR
 *   { sessionId, territory } — auto-fetches latest generated output for the session
 *
 * Returns: ComplianceReport JSON
 *
 * GET /api/compliance?sessionId=xxx
 * List compliance reports for a session.
 */

export async function POST(request: NextRequest) {
  const t0 = Date.now()
  try {
    const body = await request.json() as {
      text?: string
      sessionId: string
      territory?: Territory
      audienceLevel?: string
      outputFormat?: string
      claimIds?: string[]
      reviewerIds?: string[]
      outputVersion?: number
    }

    const { sessionId, territory = 'general', audienceLevel, outputFormat, claimIds = [], reviewerIds = [], outputVersion = 1 } = body
    let { text } = body

    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

    const supabase = getSupabaseAdmin()

    // If no text provided, fetch from the session's latest generated output
    if (!text) {
      const { data: session } = await supabase
        .from('cc_sessions')
        .select('id, title, audience_level, territory')
        .eq('id', sessionId)
        .single()

      if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

      // Try to get generated outputs from the session
      const { data: genOutputs } = await supabase
        .from('generated_outputs')
        .select('content, format')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!genOutputs?.length) {
        return NextResponse.json({ error: 'No generated content found for session. Provide text in the request body.' }, { status: 404 })
      }

      text = genOutputs[0].content
    }

    if (!text?.trim()) return NextResponse.json({ error: 'text is required' }, { status: 400 })

    // Auto-fetch claim IDs for this session if not provided
    let effectiveClaimIds = claimIds
    if (effectiveClaimIds.length === 0) {
      const { data: claims } = await supabase
        .from('claims')
        .select('id')
        .eq('session_id', sessionId)
      effectiveClaimIds = (claims || []).map(c => c.id)
    }

    // Fetch reviewer IDs who reviewed claims for this session
    let effectiveReviewerIds = reviewerIds
    if (effectiveReviewerIds.length === 0 && effectiveClaimIds.length > 0) {
      const { data: assignments } = await supabase
        .from('cc_task_assignments')
        .select('reviewer_id')
        .in('task_id', 
          (await supabase.from('cc_microtasks').select('id').eq('session_id', sessionId)).data?.map(t => t.id) || []
        )
        .eq('status', 'submitted')
      effectiveReviewerIds = [...new Set((assignments || []).map(a => a.reviewer_id))]
    }

    // Run compliance check
    const report = await runComplianceCheck({
      text,
      territory: territory as Territory,
      sessionId,
      audienceLevel: audienceLevel || 'general',
      outputFormat: outputFormat || 'unknown',
      claimIds: effectiveClaimIds,
      reviewerIds: effectiveReviewerIds,
      outputVersion,
    })

    await emitTelemetry({
      eventType: 'compliance.check.completed',
      sessionId,
      metadata: {
        territory,
        isCompliant: report.isCompliant,
        criticalFlags: report.criticalFlags,
        warningFlags: report.warningFlags,
        score: report.complianceScore,
        elapsedMs: Date.now() - t0,
      },
    })

    return NextResponse.json({
      report,
      elapsedMs: Date.now() - t0,
    })

  } catch (err) {
    console.error('Compliance check error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const { data: reports, error } = await getSupabaseAdmin()
    .from('cc_compliance_reports')
    .select('id, territory, audience_level, output_format, total_flags, critical_flags, warning_flags, compliance_score, is_compliant, checked_at, output_version')
    .eq('session_id', sessionId)
    .order('checked_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reports: reports || [] })
}
