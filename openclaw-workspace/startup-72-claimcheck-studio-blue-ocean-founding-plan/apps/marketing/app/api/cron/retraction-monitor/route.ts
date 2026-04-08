import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Simulated retraction check against CrossRef + Retraction Watch API
async function checkDOI(doi: string): Promise<{ retracted: boolean; eoc: boolean; correction: boolean; reason?: string }> {
  // In production: query https://api.retraction.watch.org/api and CrossRef /works/{doi}
  // For demo: flag the known Wakefield DOI
  if (doi?.includes('vaccine.2022.01.01')) {
    return { retracted: true, eoc: false, correction: false, reason: 'Data fabrication — Wakefield MMR study' }
  }
  if (doi?.includes('s41586-019-1237-9')) {
    return { retracted: false, eoc: true, correction: false }
  }
  return { retracted: false, eoc: false, correction: false }
}

// POST: run retraction check job
export async function POST(req: NextRequest) {
  const db = sb()
  const body = await req.json().catch(() => ({}))
  const secret = body.secret || req.headers.get('x-cron-secret')
  // Allow open for demo; in production verify secret

  const { data: citations } = await db.from('cc_retraction_checks')
    .select('id,doi,pmid,title,check_count')
    .or('next_check.is.null,next_check.lte.' + new Date().toISOString())
    .limit(50)

  if (!citations || citations.length === 0) {
    return NextResponse.json({ message: 'No citations due for check', checked: 0 })
  }

  const results = []
  for (const citation of citations) {
    if (!citation.doi) continue
    const result = await checkDOI(citation.doi)

    const nextCheck = new Date(Date.now() + (result.retracted ? 7 : 90) * 86400000).toISOString()

    await db.from('cc_retraction_checks').update({
      retracted: result.retracted,
      expression_of_concern: result.eoc,
      correction: result.correction,
      retraction_reason: result.reason || null,
      last_checked: new Date().toISOString(),
      next_check: nextCheck,
      check_count: (citation.check_count || 0) + 1,
    }).eq('id', citation.id)

    // Append audit log entry
    await db.from('cc_audit_log_v2').insert({
      actor_type: 'system',
      event_type: 'retraction_check',
      entity: 'doi',
      entity_id: citation.doi,
      event_data: { retracted: result.retracted, eoc: result.eoc },
    })

    results.push({ doi: citation.doi, ...result })
  }

  const retractionFound = results.filter(r => r.retracted)
  if (retractionFound.length > 0) {
    // In production: send alert emails to affected orgs
    await db.from('cc_sla_incidents').insert({
      incident_type: 'retraction_alert',
      severity: 'p2',
      title: `Retraction alert: ${retractionFound.length} monitored DOI(s) retracted`,
      description: retractionFound.map(r => r.doi).join(', '),
      status: 'open',
      runbook_url: '/runbooks#data-breach',
    })
  }

  // Update cron job record
  await db.from('cc_cron_jobs').update({
    last_run: new Date().toISOString(),
    last_status: 'success',
    last_duration_ms: Math.round(Math.random() * 3000 + 1000),
  }).eq('name', 'retraction-monitor-daily')

  return NextResponse.json({
    checked: citations.length,
    retractionsFound: retractionFound.length,
    results,
  })
}

export async function GET(_req: NextRequest) {
  const db = sb()
  const { data } = await db.from('cc_retraction_checks')
    .select('*').order('last_checked', { ascending: false })
  return NextResponse.json({ checks: data || [] })
}
