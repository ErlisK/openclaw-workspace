import { createAdminClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { ParsedRFP, RequiredSection, ScoringItem } from '@/lib/rfp-parser'
import WinScore from '@/components/WinScore'

export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ id: string }> }

async function getData(id: string) {
  const admin = createAdminClient()
  const { data: rfp } = await admin.from('rfp_documents').select('*').eq('id', id).single()
  if (!rfp) return null
  const { data: reqs } = await admin
    .from('rfp_requirements')
    .select('*')
    .eq('rfp_document_id', id)
    .order('sort_order')
  const { data: apps } = await admin
    .from('grant_applications')
    .select('id, title, status, deadline')
    .eq('rfp_document_id', id)
    .limit(1)
  return { rfp, reqs: reqs || [], app: apps?.[0] || null }
}

const CONFIDENCE_META = {
  high:   { label: 'High confidence', color: 'bg-green-100 text-green-800', icon: '✓' },
  medium: { label: 'Medium confidence', color: 'bg-yellow-100 text-yellow-800', icon: '~' },
  low:    { label: 'Low confidence', color: 'bg-red-100 text-red-800', icon: '!' },
}

const REQ_TYPE_COLORS: Record<string, string> = {
  narrative:    'bg-blue-50 text-blue-700',
  budget:       'bg-green-50 text-green-700',
  form:         'bg-purple-50 text-purple-700',
  attachment:   'bg-orange-50 text-orange-700',
  certification:'bg-gray-100 text-gray-700',
  other:        'bg-gray-50 text-gray-600',
}

export default async function RFPDetailPage({ params }: PageProps) {
  const { id } = await params
  const result = await getData(id)
  if (!result) return notFound()
  const { rfp, reqs, app } = result

  const parsed: ParsedRFP = rfp.parsed_data || {}
  const confidenceMeta = CONFIDENCE_META[parsed.confidence || 'low']
  const totalScoringPts = (parsed.scoring_rubric || []).reduce((s: number, i: ScoringItem) => s + i.points, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/dashboard" className="hover:text-indigo-600">Dashboard</Link>
            <span>›</span>
            <Link href="/rfp/new" className="hover:text-indigo-600">RFPs</Link>
            <span>›</span>
            <span>{rfp.title}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{rfp.title}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {rfp.funder_name && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{rfp.funder_name}</span>}
                {rfp.cfda_number && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">CFDA {rfp.cfda_number}</span>}
                {rfp.deadline && <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">⏰ Due {rfp.deadline}</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full ${confidenceMeta.color}`}>
                  {confidenceMeta.icon} {confidenceMeta.label}
                </span>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {app && (
                <Link
                  href={`/application/${app.id}`}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Start Draft →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Win Score */}
        <WinScore
          eligibilityConfidence={parsed.confidence || 'low'}
          hasNarrative={reqs.some((r: Record<string, unknown>) => r.req_type === 'narrative')}
          hasBudget={reqs.some((r: Record<string, unknown>) => r.req_type === 'budget')}
          hasChecklist={reqs.length > 0}
          sectionsCompleted={0}
          totalSections={reqs.filter((r: Record<string, unknown>) => r.req_type === 'narrative').length}
          hasEIN={false}
          hasLocation={false}
          hasExport={false}
          hasQA={false}
        />
        {/* Warnings */}
        {parsed.warnings && parsed.warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="font-medium text-yellow-800 text-sm mb-1">⚠️ Review needed</div>
            {parsed.warnings.map((w: string, i: number) => (
              <div key={i} className="text-sm text-yellow-700">{w}</div>
            ))}
          </div>
        )}

        {/* Key Facts Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Deadline', value: rfp.deadline ? new Date(rfp.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—', sub: parsed.deadline_time || '' },
            { label: 'Max Award', value: parsed.max_award_usd ? `$${parsed.max_award_usd.toLocaleString()}` : '—', sub: parsed.min_award_usd ? `Min: $${parsed.min_award_usd.toLocaleString()}` : '' },
            { label: 'Submission', value: rfp.portal_type || parsed.submission_portal || '—', sub: '' },
            { label: 'Period', value: parsed.period_of_performance_months ? `${parsed.period_of_performance_months} months` : '—', sub: '' },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">{item.label}</div>
              <div className="font-bold text-gray-900">{item.value}</div>
              {item.sub && <div className="text-xs text-gray-400 mt-0.5">{item.sub}</div>}
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Required Sections */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">
              📋 Required Sections <span className="text-gray-400 font-normal text-sm">({reqs.length})</span>
            </h2>
            {reqs.length === 0 ? (
              <p className="text-sm text-gray-400">No sections extracted — review RFP manually</p>
            ) : (
              <div className="space-y-2">
                {reqs.map((req: Record<string, unknown>) => (
                  <div key={String(req.id)} className="flex items-start gap-2 text-sm">
                    <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded mt-0.5 ${REQ_TYPE_COLORS[String(req.req_type)] || REQ_TYPE_COLORS.other}`}>
                      {String(req.req_type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{String(req.title)}</div>
                      <div className="text-gray-400 text-xs flex gap-2">
                        {req.word_limit && <span>{String(req.word_limit)} words</span>}
                        {req.page_limit && <span>{String(req.page_limit)} pages</span>}
                        {req.scoring_points && <span className="text-green-700 font-medium">{String(req.scoring_points)} pts</span>}
                        {!req.is_required && <span className="text-gray-300">(optional)</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scoring Rubric */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">
              🎯 Scoring Rubric {totalScoringPts > 0 && <span className="text-gray-400 font-normal text-sm">({totalScoringPts} pts total)</span>}
            </h2>
            {(!parsed.scoring_rubric || parsed.scoring_rubric.length === 0) ? (
              <p className="text-sm text-gray-400">No scoring rubric extracted — check Section 5 or Evaluation Criteria in the original RFP</p>
            ) : (
              <div className="space-y-2">
                {(parsed.scoring_rubric as ScoringItem[]).map((item: ScoringItem, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1 text-sm text-gray-700 truncate" title={item.criterion}>{item.criterion}</div>
                    <div className="flex-shrink-0 text-right">
                      <span className="text-sm font-bold text-gray-900">{item.points}</span>
                      <span className="text-xs text-gray-400 ml-1">pts</span>
                    </div>
                    {item.pct != null && (
                      <div className="w-16 bg-gray-100 rounded-full h-1.5 flex-shrink-0">
                        <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${item.pct}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Eligibility */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">✅ Eligibility</h2>
            {parsed.eligibility && parsed.eligibility.length > 0 ? (
              <div className="space-y-1">
                <div className="text-xs text-gray-500 mb-2">Eligible applicants:</div>
                {parsed.eligibility.map((e: string) => (
                  <div key={e} className="text-sm text-green-700 flex items-center gap-1.5">
                    <span>✓</span> {e}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Not extracted — review Section 2 (Eligibility) of the RFP</p>
            )}
            {parsed.ineligible && parsed.ineligible.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500 mb-2">Ineligible:</div>
                {parsed.ineligible.map((e: string) => (
                  <div key={e} className="text-sm text-red-600 flex items-center gap-1.5">
                    <span>✗</span> {e}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attachments */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">📎 Required Attachments</h2>
            {(!parsed.attachments || parsed.attachments.length === 0) ? (
              <p className="text-sm text-gray-400">No attachments extracted</p>
            ) : (
              <div className="space-y-1.5">
                {parsed.attachments.map((a: { name: string; is_required: boolean; format: string | null }, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={a.is_required ? 'text-red-500' : 'text-gray-300'}>
                      {a.is_required ? '●' : '○'}
                    </span>
                    <span className="text-gray-700">{a.name}</span>
                    {a.format && <span className="text-xs text-gray-400">.{a.format.toLowerCase()}</span>}
                    {!a.is_required && <span className="text-xs text-gray-300">(optional)</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Contact + Other Details */}
        {(parsed.contact_email || parsed.contact_name || parsed.matching_required || parsed.geography || parsed.portal_url) && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">📬 Additional Details</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              {parsed.contact_name && (
                <div><span className="text-gray-500">Contact: </span><span className="text-gray-900">{parsed.contact_name}</span></div>
              )}
              {parsed.contact_email && (
                <div><span className="text-gray-500">Email: </span><a href={`mailto:${parsed.contact_email}`} className="text-indigo-600 hover:underline">{parsed.contact_email}</a></div>
              )}
              {parsed.contact_phone && (
                <div><span className="text-gray-500">Phone: </span><span className="text-gray-900">{parsed.contact_phone}</span></div>
              )}
              {parsed.geography && (
                <div><span className="text-gray-500">Geography: </span><span className="text-gray-900">{parsed.geography}</span></div>
              )}
              {parsed.matching_required && (
                <div><span className="text-gray-500">Match: </span><span className="text-gray-900">
                  {parsed.matching_pct ? `${parsed.matching_pct}% required` : 'Required (amount TBD)'}
                </span></div>
              )}
              {parsed.portal_url && (
                <div><span className="text-gray-500">Portal: </span><a href={parsed.portal_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{parsed.portal_url}</a></div>
              )}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-indigo-900">Ready to start writing?</div>
            <div className="text-sm text-indigo-700 mt-0.5">
              {reqs.length > 0 ? `${reqs.length} sections detected — AI can generate first drafts for each.` : 'Application created — add sections and start drafting.'}
            </div>
          </div>
          {app ? (
            <Link href={`/application/${app.id}`} className="flex-shrink-0 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700">
              Open Application →
            </Link>
          ) : (
            <Link href="/rfp/new" className="flex-shrink-0 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700">
              Import Another RFP
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
