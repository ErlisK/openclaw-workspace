import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'SLA Runbooks — ClaimCheck Studio',
  description: 'Incident response runbooks and SLA breach procedures for ClaimCheck Studio operations.',
}

const RUNBOOKS = [
  {
    id: 'sla-latency',
    severity: 'P1',
    title: 'API Latency Spike (>2s p95)',
    trigger: 'p95 API latency exceeds 2,000ms for 3+ consecutive checks (15 min window)',
    slaImpact: 'Enterprise SLA: uptime 99.5% — latency spike counts as degraded',
    steps: [
      { phase: 'Detect (T+0)', actions: ['Uptime monitor fires alert to hello@citebundle.com + Slack #incidents', 'Check cc_uptime_checks: SELECT * FROM cc_uptime_checks WHERE service=\'api\' ORDER BY checked_at DESC LIMIT 10', 'Log incident: POST /api/sla with severity=p1, incident_type=api_latency'] },
      { phase: 'Acknowledge (T+15min)', actions: ['ACK in Slack #incidents', 'PATCH /api/sla {id, status: "investigating", acknowledged_at: now}', 'Check Vercel dashboard for edge function cold starts', 'Check Supabase dashboard for query performance'] },
      { phase: 'Investigate (T+15–60min)', actions: ['Check top slow queries: SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10', 'Check for missing indexes on cc_claims, cc_microtasks (most-read tables)', 'Check Vercel function logs for timeouts', 'Isolate: is it one endpoint or all? (/api/claims vs /api/review vs /api/export)'] },
      { phase: 'Mitigate (T+60min)', actions: ['If cold starts: enable Vercel fluid compute / increase function memory', 'If DB queries: add index or query hint', 'If traffic spike: Supabase connection pooling (PgBouncer) is on — check pool exhaustion', 'If edge function OOM: increase max duration limit'] },
      { phase: 'Resolve (T+0–8h)', actions: ['PATCH /api/sla {id, status: "resolved", resolved_at: now}', 'Log resolution to cc_audit_log_v2: event_type=incident_resolved', 'Send status update to affected enterprise customers (within 2h of resolution)', 'Document in postmortem if TTR >4h'] },
    ],
    creditTrigger: 'If latency >2s sustained for >30 minutes: 10% monthly credit per enterprise SLA',
  },
  {
    id: 'sla-review-breach',
    severity: 'P2',
    title: 'Review SLA Near-Breach or Breach (48h / 72h)',
    trigger: 'Any microtask reaches 80% of SLA window (38h for 48h SLA) without reviewer assignment or verdict',
    slaImpact: 'Enterprise SLA: all tasks completed within 48h. Consumer SLA: 72h best-effort.',
    steps: [
      { phase: 'Detect (T+0)', actions: ['Cron job runs every 30min: SELECT * FROM cc_sla_events WHERE breached=false AND due_at < now()+interval\'10 hours\'', 'Alert fires if any task is within 10h of SLA', 'Log: POST /api/sla {severity: "p2", incident_type: "review_sla", title: "Review SLA near-breach"}'] },
      { phase: 'Acknowledge (T+30min)', actions: ['Check task context: SELECT t.*, a.reviewer_id FROM cc_microtasks t LEFT JOIN cc_task_assignments a ON t.id=a.task_id WHERE t.id=\'TASK_ID\'', 'Is task assigned? Is reviewer active?', 'PATCH /api/sla {acknowledged_at: now, status: "investigating"}'] },
      { phase: 'Escalate (T+30–2h)', actions: ['If assigned but reviewer unresponsive: re-assign to standby reviewer pool', 'Update cc_task_assignments: mark old assignment as expired, create new', 'Send escalation email to standby reviewer', 'Log: INSERT INTO cc_audit_log_v2 (event_type=\'sla_escalated\', entity=\'task\', entity_id=TASK_ID)'] },
      { phase: 'Resolve', actions: ['Once review submitted: UPDATE cc_sla_events SET completed_at=now(), breached=false WHERE task_id=TASK_ID (if within window)', 'PATCH /api/sla {status: "resolved", resolved_at: now}', 'If actually breached (>48h): notify enterprise customer within 1h, issue credit'] },
    ],
    creditTrigger: 'If task exceeds 48h SLA: 10% monthly credit for enterprise customer. Log in cc_sla_events breached=true.',
  },
  {
    id: 'service-down',
    severity: 'P0',
    title: 'Service Down (Vercel or Supabase outage)',
    trigger: '3+ consecutive "down" checks on /api/health OR Supabase REST returning 5xx',
    slaImpact: 'Full SLA breach. Enterprise credits trigger immediately after 30-min window.',
    steps: [
      { phase: 'Detect (T+0)', actions: ['Monitor fires P0 alert: email + SMS (PagerDuty if configured)', 'Check Vercel status: https://www.vercel-status.com/', 'Check Supabase status: https://status.supabase.com/', 'Log: POST /api/sla {severity: "p0", incident_type: "service_down"}'] },
      { phase: 'Acknowledge (T+5min)', actions: ['Reply-all to incident thread', 'Post to status page (citebundle.com/status or Vercel deployment)', 'If Vercel issue: check dashboard, attempt redeploy from last good commit', 'If Supabase issue: enable read-replica if available, check connection limit'] },
      { phase: 'Communicate (T+15min)', actions: ['Email enterprise customers: "We are aware of an issue affecting ClaimCheck Studio. Our team is actively investigating. ETA for resolution: [X]. We will update every 30 minutes."', 'Update status page every 30min'] },
      { phase: 'Resolve (T+0–4h)', actions: ['Once service restored: post all-clear to customers', 'PATCH /api/sla {status: "resolved", resolved_at: now}', 'Calculate downtime: count cc_uptime_checks WHERE status=\'down\' in window × 15min', 'Issue credits automatically if >30min downtime: 10% monthly credit per enterprise SLA'] },
    ],
    creditTrigger: 'Downtime >30min: 10% credit. >2h: 25% credit. >4h: 50% credit. (per enterprise contract terms)',
  },
  {
    id: 'data-breach',
    severity: 'P0',
    title: 'Suspected Data Breach or Unauthorized Access',
    trigger: 'Anomalous access pattern in cc_access_audit, cc_audit_log_v2, or external report',
    slaImpact: 'GDPR Article 33: must notify supervisory authority within 72h of breach detection',
    steps: [
      { phase: 'Detect (T+0)', actions: ['Review cc_access_audit for anomalous IPs, bulk downloads, off-hours access', 'Review cc_audit_log_v2 for unexpected actor_types or event_types', 'Log: POST /api/sla {severity: "p0", incident_type: "data_breach"}'] },
      { phase: 'Contain (T+0–1h)', actions: ['Rotate Supabase service role key immediately', 'Rotate Vercel env variables (SUPABASE_SERVICE_ROLE_KEY)', 'Enable RLS lockdown mode (revoke anon access if needed)', 'Preserve evidence: DO NOT delete any cc_audit_log_v2 rows'] },
      { phase: 'Assess (T+1–4h)', actions: ['What data was accessed? (content only, or PII?)', 'Which orgs/users are affected?', 'Was access from inside or outside the platform?', 'Supabase Support: support@supabase.io — request audit logs'] },
      { phase: 'Notify (T+72h max for GDPR)', actions: ['If EU users affected: notify relevant data protection authority (DPA)', 'Notify affected enterprise customers within 24h', 'Prepare incident report with: what happened, data affected, containment steps, remediation'] },
    ],
    creditTrigger: 'Credits per enterprise contract. Legal notification obligations independent of SLA credits.',
  },
  {
    id: 'reviewer-quality-drop',
    severity: 'P2',
    title: 'Reviewer Quality Drop (acceptance <85% or dispute >5%)',
    trigger: 'Weekly cc_reviewer_quality snapshot shows pool avg acceptance <85% or dispute rate >5%',
    slaImpact: 'Phase 6 success criteria at risk. Enterprise review quality SLA threatened.',
    steps: [
      { phase: 'Detect (weekly)', actions: ['Cron runs Monday 09:00: SELECT avg(acceptance_rate), avg(dispute_rate) FROM cc_reviewer_quality WHERE period_start >= now()-interval\'30 days\'', 'If acceptance <0.85 or dispute >0.05: trigger runbook'] },
      { phase: 'Investigate', actions: ['Identify which reviewers are dragging metrics: SELECT reviewer_id, acceptance_rate, dispute_rate FROM cc_reviewer_quality ORDER BY acceptance_rate ASC LIMIT 5', 'Review their recent tasks and dispute reasons in cc_disputes', 'Check for specific claim types or segments causing issues'] },
      { phase: 'Remediate', actions: ['Low-acceptance reviewers: pause queue assignment, send calibration batch (10 pre-verified tasks)', 'High-dispute reviewers: review disputed verdicts with senior reviewer', 'Tier downgrade if persistent: UPDATE cc_reviewer_quality SET tier=\'bronze\' WHERE reviewer_id=X', 'Recruit replacement reviewers if pool <90 active'] },
    ],
    creditTrigger: 'Not a direct credit trigger. If quality affects enterprise deliverables, activate review_sla runbook.',
  },
]

const SEV_STYLE: Record<string, string> = {
  P0: 'bg-red-900/40 text-red-300 border-red-700/40',
  P1: 'bg-orange-900/40 text-orange-300 border-orange-700/40',
  P2: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
}

export default function RunbooksPage() {
  return (
    <div className="pt-14">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-10">
          <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-2">Phase 6 — Operations</div>
          <h1 className="text-2xl font-bold text-white mb-3">SLA Incident Runbooks</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Step-by-step response procedures for SLA events and service incidents.
            All incidents logged in <code className="text-blue-300 bg-gray-800 px-1 rounded">cc_sla_incidents</code> and
            <code className="text-blue-300 bg-gray-800 px-1 ml-1 rounded">cc_audit_log_v2</code>.
            Dashboard: <Link href="/admin" className="text-blue-400">citebundle.com/admin</Link>
          </p>
          <div className="mt-4 flex gap-3 text-xs">
            {[['P0','Critical — service down or breach'], ['P1','Major — SLA at risk, enterprise-visible'], ['P2','Moderate — near-breach or quality']].map(([s,d]) => (
              <div key={s} className={`px-2 py-1 rounded border ${SEV_STYLE[s]}`}>{s}: {d}</div>
            ))}
          </div>
        </div>

        {/* Quick nav */}
        <div className="flex flex-wrap gap-2 mb-10">
          {RUNBOOKS.map(r => (
            <a key={r.id} href={`#${r.id}`}
              className={`text-xs px-2.5 py-1 rounded border ${SEV_STYLE[r.severity]}`}>
              {r.severity} · {r.title.split('(')[0].trim()}
            </a>
          ))}
        </div>

        <div className="space-y-12">
          {RUNBOOKS.map(r => (
            <div key={r.id} id={r.id} className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-xs px-2 py-0.5 rounded border font-mono ${SEV_STYLE[r.severity]}`}>{r.severity}</span>
                <h2 className="text-lg font-bold text-white">{r.title}</h2>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
                  <div className="text-xs text-gray-500 mb-1">Trigger</div>
                  <div className="text-xs text-gray-300">{r.trigger}</div>
                </div>
                <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
                  <div className="text-xs text-gray-500 mb-1">SLA Impact</div>
                  <div className="text-xs text-gray-300">{r.slaImpact}</div>
                </div>
              </div>

              <div className="space-y-3">
                {r.steps.map((step, i) => (
                  <div key={step.phase} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 rounded-full bg-blue-950 border border-blue-700 text-blue-400 text-xs flex items-center justify-center font-bold">{i+1}</span>
                      <span className="text-sm font-semibold text-white">{step.phase}</span>
                    </div>
                    <ul className="space-y-1.5 ml-7">
                      {step.actions.map((a, j) => (
                        <li key={j} className="text-xs text-gray-400 flex gap-2">
                          <span className="text-gray-700 shrink-0">›</span>
                          <code className="text-gray-300 whitespace-pre-wrap font-mono text-xs">{a}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-lg border border-amber-900/40 bg-amber-950/20 p-3">
                <div className="text-xs text-amber-400"><span className="font-semibold">Credit trigger: </span>{r.creditTrigger}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 border-t border-gray-800 pt-8">
          <h2 className="text-sm font-semibold text-white mb-3">Standard References</h2>
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
            <div>
              <div className="text-gray-400 font-medium mb-1">Monitoring</div>
              <div>• Vercel: vercel.com/dashboard</div>
              <div>• Supabase: app.supabase.com</div>
              <div>• Uptime data: <Link href="/admin" className="text-blue-500">citebundle.com/admin</Link></div>
            </div>
            <div>
              <div className="text-gray-400 font-medium mb-1">Escalation</div>
              <div>• On-call: hello@citebundle.com</div>
              <div>• Enterprise customers: per contract SLA</div>
              <div>• Data breach: GDPR 72h rule</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
