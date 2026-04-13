import { createAdminClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import BudgetBuilder from './BudgetBuilder'
import type { BudgetState } from '@/lib/budget-engine'

export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ id: string }> }

async function getData(applicationId: string) {
  const admin = createAdminClient()
  const { data: app } = await admin.from('grant_applications').select('*').eq('id', applicationId).single()
  if (!app) return null

  const { data: budget } = await admin
    .from('budgets')
    .select('*')
    .eq('application_id', applicationId)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  let rfpParsed = null
  if (app.rfp_document_id) {
    const { data: rfp } = await admin.from('rfp_documents').select('parsed_data').eq('id', app.rfp_document_id).single()
    rfpParsed = rfp?.parsed_data || null
  }

  return { app, budget, rfpParsed }
}

export default async function BudgetPage({ params }: PageProps) {
  const { id } = await params
  const result = await getData(id)
  if (!result) return notFound()
  const { app, budget, rfpParsed } = result

  const existingBudget = budget ? {
    id: budget.id,
    state: {
      application_id: id,
      periods: budget.assumptions?.periods || 1,
      period_months: budget.assumptions?.period_months || 12,
      indirect_rate_pct: Number(budget.indirect_rate_pct) || 10,
      indirect_method: (budget.indirect_method || 'MTDC') as BudgetState['indirect_method'],
      indirect_base_custom: budget.assumptions?.indirect_base_custom || null,
      line_items: (budget.line_items as BudgetState['line_items']) || [],
      version: budget.version || 0,
      locked: !!budget.locked_at,
    } as BudgetState,
  } : null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/dashboard" className="hover:text-indigo-600">Dashboard</Link>
            <span>›</span>
            <Link href={`/application/${id}`} className="hover:text-indigo-600">{app.title}</Link>
            <span>›</span>
            <span>Budget</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{app.title} — Budget</h1>
              <div className="flex gap-3 mt-1 text-sm text-gray-500">
                {app.funder_name && <span className="text-indigo-700">{app.funder_name}</span>}
                {app.deadline && <span>⏰ Due {app.deadline}</span>}
                {rfpParsed?.max_award_usd && <span>💰 Max ${Number(rfpParsed.max_award_usd).toLocaleString()}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/application/${id}`} className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                ← Narratives
              </Link>
              <Link href={`/export/${id}`} className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700">
                Export All →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <BudgetBuilder
          applicationId={id}
          funderName={app.funder_name}
          existingBudget={existingBudget}
          maxAwardUsd={rfpParsed?.max_award_usd || app.ask_amount_usd || null}
        />
      </div>
    </div>
  )
}
