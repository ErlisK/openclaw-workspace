import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { renderReportText, type ComplianceReport } from '@/lib/compliance-agent'

/**
 * GET /api/compliance/[reportId]           — report JSON
 * GET /api/compliance/[reportId]?format=text — plain text audit report
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params
  const format = request.nextUrl.searchParams.get('format')

  const { data, error } = await getSupabaseAdmin()
    .from('cc_compliance_reports')
    .select('*')
    .eq('id', reportId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  if (format === 'text') {
    // Render as plain-text audit report for download
    const report = (data.report_json || data) as ComplianceReport
    const text = renderReportText(report)
    const filename = `compliance_report_${reportId.slice(0, 8)}_${new Date(data.checked_at).toISOString().slice(0, 10)}.txt`
    return new NextResponse(text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  // Return full JSON report
  return NextResponse.json({
    report: data.report_json || data,
    meta: {
      id: data.id,
      sessionId: data.session_id,
      territory: data.territory,
      checkedAt: data.checked_at,
      isCompliant: data.is_compliant,
      complianceScore: data.compliance_score,
      totalFlags: data.total_flags,
    },
  })
}

/**
 * PATCH /api/compliance/[reportId] — sign off on report
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params
  const body = await request.json() as { reviewerId: string; notes?: string }
  const { reviewerId, notes } = body

  if (!reviewerId) return NextResponse.json({ error: 'reviewerId required' }, { status: 400 })

  const { error } = await getSupabaseAdmin()
    .from('cc_compliance_reports')
    .update({
      signed_off_by: reviewerId,
      signed_off_at: new Date().toISOString(),
      sign_off_notes: notes || null,
    })
    .eq('id', reportId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit log entry
  await getSupabaseAdmin().from('cc_audit_log').insert({
    action: 'compliance.report.signed_off',
    actor_type: 'reviewer',
    event_type: 'compliance.signed_off',
    compliance_report_id: reportId,
    event_data: { reviewerId, notes, signedOffAt: new Date().toISOString() },
  })

  return NextResponse.json({ signedOff: true })
}
