import { createAdminClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import NarrativeWorkspace from './NarrativeWorkspace'
import type { Section } from './NarrativeWorkspace'

export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ id: string }> }

const DEFAULT_SECTIONS = [
  { section_key: 'executive_summary',       title: 'Executive Summary',          req_type: 'narrative', word_limit: 500,  scoring_points: null, sort_order: 0 },
  { section_key: 'problem_statement',       title: 'Statement of Need',           req_type: 'narrative', word_limit: 1000, scoring_points: 25,   sort_order: 1 },
  { section_key: 'program_design',          title: 'Program Design',              req_type: 'narrative', word_limit: 2000, scoring_points: 30,   sort_order: 2 },
  { section_key: 'goals_objectives',        title: 'Goals and Objectives',        req_type: 'narrative', word_limit: 750,  scoring_points: null, sort_order: 3 },
  { section_key: 'evaluation_plan',         title: 'Evaluation Plan',             req_type: 'narrative', word_limit: 1000, scoring_points: 15,   sort_order: 4 },
  { section_key: 'organizational_capacity', title: 'Organizational Capacity',     req_type: 'narrative', word_limit: 750,  scoring_points: 20,   sort_order: 5 },
  { section_key: 'sustainability',          title: 'Sustainability Plan',         req_type: 'narrative', word_limit: 500,  scoring_points: null, sort_order: 6 },
  { section_key: 'budget_narrative',        title: 'Budget Narrative',            req_type: 'budget',    word_limit: null, scoring_points: null, sort_order: 7 },
]

async function getData(id: string) {
  const admin = createAdminClient()
  const { data: app } = await admin.from('grant_applications').select('*').eq('id', id).single()
  if (!app) return null

  let rfp = null
  if (app.rfp_document_id) {
    const { data } = await admin.from('rfp_documents').select('*').eq('id', app.rfp_document_id).single()
    rfp = data
  }

  // Get RFP requirements (narrative sections)
  let reqs: Record<string, unknown>[] = []
  if (app.rfp_document_id) {
    const { data } = await admin
      .from('rfp_requirements')
      .select('*')
      .eq('rfp_document_id', app.rfp_document_id)
      .order('sort_order')
    reqs = (data || []).filter((r: Record<string, unknown>) => ['narrative', 'budget'].includes(r.req_type as string))
  }
  if (reqs.length === 0) reqs = DEFAULT_SECTIONS.map((s, i) => ({ ...s, id: `default-${i}` }))

  // Get existing narratives for this application
  const { data: narratives } = await admin
    .from('narratives')
    .select('*')
    .eq('application_id', id)
    .order('version', { ascending: false })

  // Get pilot config for org
  const { data: pilotConfig } = await admin
    .from('pilot_configs')
    .select('*')
    .eq('organization_id', app.organization_id)
    .eq('is_default', true)
    .single()

  return { app, rfp, reqs, narratives: narratives || [], pilotConfig }
}

export default async function ApplicationPage({ params }: PageProps) {
  const { id } = await params
  const result = await getData(id)
  if (!result) return notFound()
  const { app, rfp, reqs, narratives, pilotConfig } = result

  const parsed = rfp?.parsed_data || {}

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/dashboard" className="hover:text-indigo-600">Dashboard</Link>
            <span>›</span>
            {rfp && <><Link href={`/rfp/${rfp.id}`} className="hover:text-indigo-600">{rfp.title}</Link><span>›</span></>}
            <span>Application</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{app.title}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap text-sm text-gray-500">
                {app.funder_name && <span className="text-indigo-700 font-medium">{app.funder_name}</span>}
                {app.deadline && <span>⏰ {new Date(app.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                {app.ask_amount_usd && <span>💰 ${Number(app.ask_amount_usd).toLocaleString()}</span>}
                <span className={`px-2 py-0.5 rounded-full text-xs ${app.status === 'drafting' ? 'bg-yellow-100 text-yellow-800' : app.status === 'submitted' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {app.status}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/budget/${id}`} className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                Budget
              </Link>
              <Link href={`/rfp/${app.rfp_document_id}`} className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                View RFP
              </Link>
              <Link href={`/timeline/${id}`} className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                📅 Timeline
              </Link>
              <Link href={`/export/${id}`} className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700">
                Export →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <NarrativeWorkspace
        applicationId={id}
        rfpDocumentId={app.rfp_document_id || null}
        sections={reqs as unknown as Section[]}
        existingNarratives={narratives}
        pilotConfig={pilotConfig || null}
        rfpContext={{
          title: rfp?.title || app.title,
          funder_name: rfp?.funder_name || app.funder_name,
          deadline: app.deadline,
          scoring_rubric: parsed.scoring_rubric || [],
          max_award_usd: parsed.max_award_usd || app.ask_amount_usd,
        }}
      />
    </div>
  )
}
