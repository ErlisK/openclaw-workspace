'use client'

import { useState } from 'react'
import type { ChecklistItem, ChecklistCategory } from '@/lib/checklist-engine'

interface Props {
  applicationId: string
  items: ChecklistItem[]
  progress: { total: number; required: number; complete: number; pct: number }
  categoryMeta: Record<ChecklistCategory, { label: string; icon: string; color: string }>
}

export default function ChecklistClient({ applicationId, items: initialItems, progress: initialProgress, categoryMeta }: Props) {
  const [items, setItems] = useState(initialItems)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [filterCat, setFilterCat] = useState<ChecklistCategory | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'complete'>('all')

  const progress = {
    total: items.length,
    required: items.filter(i => i.is_required).length,
    complete: items.filter(i => i.is_required && i.status === 'complete').length,
    pct: 0,
  }
  progress.pct = progress.required > 0 ? Math.round((progress.complete / progress.required) * 100) : 0

  const updateStatus = async (itemId: string, status: ChecklistItem['status']) => {
    const updated = items.map(i => i.id === itemId ? { ...i, status } : i)
    setItems(updated)
    setSaving(true)
    await fetch('/api/checklist/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ application_id: applicationId, items: updated.map(i => ({ id: i.id, status: i.status, notes: i.notes })) }),
    })
    setSaving(false)
  }

  const downloadZip = async () => {
    setDownloading(true)
    const r = await fetch('/api/export/zip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ application_id: applicationId }),
    })
    if (r.ok) {
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `grant-bundle-${applicationId.slice(0, 8)}.zip`
      a.click()
      URL.revokeObjectURL(url)
    }
    setDownloading(false)
  }

  const downloadPDF = async (form: 'sf424' | 'sf424a') => {
    const r = await fetch('/api/forms/fill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ application_id: applicationId, form_type: form }),
    })
    if (r.ok) {
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${form}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const categories = [...new Set(items.map(i => i.category))] as ChecklistCategory[]
  const filteredItems = items.filter(i => {
    if (filterCat !== 'all' && i.category !== filterCat) return false
    if (filterStatus === 'pending' && i.status === 'complete') return false
    if (filterStatus === 'complete' && i.status !== 'complete') return false
    return true
  })

  const groupedByCategory: Record<string, ChecklistItem[]> = {}
  for (const item of filteredItems) {
    if (!groupedByCategory[item.category]) groupedByCategory[item.category] = []
    groupedByCategory[item.category].push(item)
  }

  return (
    <div className="space-y-6">
      {/* Export bundle */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold mb-1">📦 Export Grant Bundle</h2>
            <p className="text-indigo-100 text-sm">Download complete ZIP with narratives, budget CSV, SF-424/424A PDFs, compliance checklist, and attachments tracker.</p>
            <div className="flex gap-3 mt-3 flex-wrap">
              <button onClick={() => downloadPDF('sf424')} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg">⬇ SF-424 PDF</button>
              <button onClick={() => downloadPDF('sf424a')} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg">⬇ SF-424A PDF</button>
            </div>
          </div>
          <button
            onClick={downloadZip}
            disabled={downloading}
            className="flex-shrink-0 bg-white text-indigo-700 font-bold px-6 py-3 rounded-xl hover:bg-indigo-50 disabled:opacity-70 text-sm"
          >
            {downloading ? '⟳ Building ZIP...' : '⬇ Download ZIP'}
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Compliance Checklist</h2>
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-gray-400">Saving...</span>}
            <span className={`text-sm font-bold ${progress.pct >= 80 ? 'text-green-700' : 'text-yellow-700'}`}>{progress.pct}%</span>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
          <div className={`h-2 rounded-full transition-all ${progress.pct >= 80 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${progress.pct}%` }} />
        </div>
        <div className="text-xs text-gray-500">{progress.complete} of {progress.required} required items complete</div>

        {/* Filters */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <select value={filterCat} onChange={e => setFilterCat(e.target.value as ChecklistCategory | 'all')}
            className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none">
            <option value="all">All categories</option>
            {categories.map(c => <option key={c} value={c}>{categoryMeta[c]?.label || c}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
            className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none">
            <option value="all">All statuses</option>
            <option value="pending">Pending only</option>
            <option value="complete">Complete only</option>
          </select>
          <button onClick={() => items.filter(i => i.is_required).forEach(i => i.status !== 'complete' && updateStatus(i.id, 'complete'))}
            className="text-xs text-green-700 border border-green-300 px-2 py-1.5 rounded-lg hover:bg-green-50">
            Mark All Required Complete
          </button>
        </div>
      </div>

      {/* Checklist items by category */}
      {Object.entries(groupedByCategory).map(([cat, catItems]) => {
        const meta = categoryMeta[cat as ChecklistCategory]
        return (
          <div key={cat} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{meta?.icon}</span>
                <span className="font-semibold text-sm text-gray-900">{meta?.label || cat}</span>
                <span className="text-xs text-gray-400">({catItems.length})</span>
              </div>
              <span className="text-xs text-green-700">{catItems.filter(i => i.status === 'complete').length}/{catItems.length} done</span>
            </div>
            <div className="divide-y divide-gray-100">
              {catItems.map(item => (
                <div key={item.id} className={`flex items-start gap-3 px-5 py-3 ${item.status === 'complete' ? 'bg-green-50/30' : ''}`}>
                  <button
                    onClick={() => updateStatus(item.id, item.status === 'complete' ? 'pending' : 'complete')}
                    className={`flex-shrink-0 w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center transition-colors ${item.status === 'complete' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-indigo-400'}`}
                  >
                    {item.status === 'complete' && <span className="text-xs">✓</span>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${item.status === 'complete' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {item.title}
                      </span>
                      {item.is_required && item.status !== 'complete' && (
                        <span className="text-xs text-red-600 font-medium">Required</span>
                      )}
                      {item.format && <span className="text-xs text-gray-400">{item.format}</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        item.source === 'rfp' ? 'bg-blue-50 text-blue-700' :
                        item.source === 'federal_reg' ? 'bg-purple-50 text-purple-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>{item.source}</span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => updateStatus(item.id, 'na')}
                        className={`text-xs ${item.status === 'na' ? 'text-gray-500 font-medium' : 'text-gray-300 hover:text-gray-500'}`}
                      >
                        N/A
                      </button>
                      <button
                        onClick={() => updateStatus(item.id, 'in_progress')}
                        className={`text-xs ${item.status === 'in_progress' ? 'text-yellow-700 font-medium' : 'text-gray-300 hover:text-yellow-600'}`}
                      >
                        In Progress
                      </button>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-xs text-gray-400">
                    {item.due_phase === 'before_submit' ? 'Before submit' : item.due_phase === 'at_submit' ? 'At submit' : item.due_phase === 'after_award' ? 'Post-award' : 'Ongoing'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
