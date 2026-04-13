import { createAdminClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { generateChecklist, checklistProgress, CATEGORY_META } from '@/lib/checklist-engine'
import ChecklistClient from './ChecklistClient'

export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ id: string }> }

async function getData(id: string) {
  const admin = createAdminClient()
  const { data: app } = await admin.from('grant_applications').select('*').eq('id', id).single()
  if (!app) return null

  let rfpParsed: Record<string, unknown> | null = null
  if (app.rfp_document_id) {
    const { data: rfp } = await admin.from('rfp_documents').select('*').eq('id', app.rfp_document_id).single()
    rfpParsed = rfp?.parsed_data || null
  }

  // Saved checklist status
  const { data: savedChecklist } = await admin
    .from('checklists')
    .select('items')
    .eq('application_id', id)
    .single()

  // Narratives count
  const { count: narrativeCount } = await admin
    .from('narratives')
    .select('*', { count: 'exact', head: true })
    .eq('application_id', id)

  const { data: budget } = await admin
    .from('budgets')
    .select('id, total_usd, version')
    .eq('application_id', id)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  return { app, rfpParsed, savedChecklist, narrativeCount: narrativeCount || 0, budget }
}

export default async function ExportPage({ params }: PageProps) {
  const { id } = await params
  const result = await getData(id)
  if (!result) return notFound()
  const { app, rfpParsed, savedChecklist, narrativeCount, budget } = result

  // Generate checklist from RFP data
  const generatedItems = generateChecklist({
    funder_type: (rfpParsed?.funder_type as string) || app.funder_name?.includes('SAMHSA') ? 'federal' : 'federal',
    rfp_requirements: rfpParsed?.required_sections as Parameters<typeof generateChecklist>[0]['rfp_requirements'] || [],
    rfp_attachments: rfpParsed?.attachments as Parameters<typeof generateChecklist>[0]['rfp_attachments'] || [],
    rfp_scoring: rfpParsed?.scoring_rubric as Parameters<typeof generateChecklist>[0]['rfp_scoring'] || [],
    cfda_number: app.cfda_number || rfpParsed?.cfda_number as string || null,
    deadline: app.deadline,
  })

  // Merge with saved statuses
  const savedItems = (savedChecklist?.items || []) as Array<{ id: string; status: string; notes?: string }>
  const savedMap = new Map(savedItems.map(s => [s.id, s]))
  const mergedItems = generatedItems.map(item => ({
    ...item,
    ...(savedMap.get(item.id) ? { status: savedMap.get(item.id)!.status as typeof item.status, notes: savedMap.get(item.id)!.notes } : {}),
  }))

  const progress = checklistProgress(mergedItems)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/dashboard" className="hover:text-indigo-600">Dashboard</Link>
            <span>›</span>
            <Link href={`/application/${id}`} className="hover:text-indigo-600">{app.title}</Link>
            <span>›</span>
            <span>Export</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Export & Compliance Checklist</h1>
              <div className="flex gap-3 mt-1 text-sm text-gray-500">
                {app.funder_name && <span className="text-indigo-700">{app.funder_name}</span>}
                {app.deadline && <span>⏰ Due {app.deadline}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Status bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Narratives', value: narrativeCount, icon: '✍️', link: `/application/${id}`, ok: narrativeCount > 0 },
            { label: 'Budget', value: budget ? `$${Number(budget.total_usd).toLocaleString()}` : 'Not built', icon: '💰', link: `/budget/${id}`, ok: !!budget },
            { label: 'Checklist', value: `${progress.complete}/${progress.required}`, icon: '✅', link: null, ok: progress.pct >= 80 },
            { label: 'Ready', value: progress.pct >= 80 && narrativeCount > 0 && !!budget ? 'Yes' : 'Incomplete', icon: '🚀', link: null, ok: progress.pct >= 80 && narrativeCount > 0 && !!budget },
          ].map(item => (
            <div key={item.label} className={`bg-white rounded-xl border-2 p-4 text-center ${item.ok ? 'border-green-200' : 'border-gray-200'}`}>
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className={`font-bold ${item.ok ? 'text-green-700' : 'text-gray-700'}`}>{item.value}</div>
              <div className="text-xs text-gray-400">{item.label}</div>
              {item.link && <Link href={item.link} className="text-xs text-indigo-600 hover:underline">{item.ok ? 'View' : 'Complete →'}</Link>}
            </div>
          ))}
        </div>

        <ChecklistClient
          applicationId={id}
          items={mergedItems}
          progress={progress}
          categoryMeta={CATEGORY_META}
        />
      </div>
    </div>
  )
}
