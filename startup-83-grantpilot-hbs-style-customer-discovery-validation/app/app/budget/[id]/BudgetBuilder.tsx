'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  BUDGET_CATEGORIES, computeTotals, generateJustification, newLineItem, recompute,
  type BudgetState, type BudgetLineItem, type CategoryKey, type BudgetTotals,
} from '@/lib/budget-engine'

interface Props {
  applicationId: string
  funderName?: string | null
  existingBudget?: { id: string; state: BudgetState } | null
  maxAwardUsd?: number | null
}

const FRINGE_RATE_DEFAULT = 28   // typical nonprofit fringe rate

export default function BudgetBuilder({ applicationId, funderName, existingBudget, maxAwardUsd }: Props) {
  const [state, setState] = useState<BudgetState>(() => existingBudget?.state || {
    application_id: applicationId,
    periods: 1,
    period_months: 12,
    indirect_rate_pct: 10,
    indirect_method: 'MTDC',
    indirect_base_custom: null,
    line_items: [],
    version: 0,
    locked: false,
  })
  const [budgetId, setBudgetId] = useState<string | undefined>(existingBudget?.id)
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('personnel')
  const [totals, setTotals] = useState<BudgetTotals>(() => computeTotals(state))
  const [justification, setJustification] = useState<string>('')
  const [showJustification, setShowJustification] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [exportLoading, setExportLoading] = useState<string | null>(null)
  const [autoFringeEnabled, setAutoFringeEnabled] = useState(true)
  const [fringeRate, setFringeRate] = useState(FRINGE_RATE_DEFAULT)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Recompute totals on state change
  useEffect(() => {
    const t = computeTotals(state)
    setTotals(t)
  }, [state])

  // Auto-fringe: keep fringe items in sync with personnel
  useEffect(() => {
    if (!autoFringeEnabled) return
    setState(prev => {
      const personnelItems = prev.line_items.filter(li => li.category === 'personnel')
      const personnelTotal = personnelItems.reduce((s, li) => s + li.total, 0)
      if (personnelTotal === 0) return prev

      // Remove existing auto-fringe items and replace with one
      const withoutFringe = prev.line_items.filter(li => li.category !== 'fringe' || li.description !== '(Auto) Fringe Benefits')
      const fringeAmount = Math.round(personnelTotal * (fringeRate / 100))
      if (fringeAmount === 0) return { ...prev, line_items: withoutFringe }
      const fringeItem: BudgetLineItem = {
        id: 'auto-fringe',
        category: 'fringe',
        description: '(Auto) Fringe Benefits',
        quantity: 1,
        unit: 'lump sum',
        unit_cost: fringeAmount,
        total: fringeAmount,
        notes: `${fringeRate}% of personnel ($${personnelTotal.toLocaleString()}). Includes FICA, health, retirement.`,
        is_federal: true,
        sort_order: 0,
      }
      return { ...prev, line_items: [...withoutFringe, fringeItem] }
    })
  }, [state.line_items.filter(li => li.category === 'personnel').map(li => li.total).join(','), fringeRate, autoFringeEnabled])

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(save, 3000)
  }, [])

  const updateState = (patch: Partial<BudgetState>) => {
    setState(prev => ({ ...prev, ...patch }))
    scheduleAutoSave()
  }

  const addLineItem = (category: CategoryKey) => {
    const sortOrder = state.line_items.filter(li => li.category === category).length
    const item = newLineItem(category, sortOrder)
    setState(prev => ({ ...prev, line_items: [...prev.line_items, item] }))
  }

  const updateItem = (id: string, patch: Partial<BudgetLineItem>) => {
    setState(prev => ({
      ...prev,
      line_items: prev.line_items.map(li => {
        if (li.id !== id) return li
        const updated = { ...li, ...patch }
        return recompute(updated)
      }),
    }))
    scheduleAutoSave()
  }

  const removeItem = (id: string) => {
    setState(prev => ({ ...prev, line_items: prev.line_items.filter(li => li.id !== id) }))
    scheduleAutoSave()
  }

  const save = async () => {
    setSaving(true)
    const r = await fetch('/api/budget/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, budget_id: budgetId }),
    })
    if (r.ok) {
      const d = await r.json()
      if (d.id) setBudgetId(d.id)
      setState(prev => ({ ...prev, version: d.version }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  const exportBudget = async (format: 'csv' | 'docx') => {
    setExportLoading(format)
    const r = await fetch('/api/budget/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, format, funder_name: funderName }),
    })
    if (r.ok) {
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `budget.${format}`
      a.click()
      URL.revokeObjectURL(url)
    }
    setExportLoading(null)
  }

  const generateJust = () => {
    const text = generateJustification(state, totals, funderName || undefined)
    setJustification(text)
    setShowJustification(true)
  }

  const catItems = (cat: CategoryKey) => state.line_items.filter(li => li.category === cat)
  const catTotal = (cat: CategoryKey) => totals.by_category.find(c => c.key === cat)?.total || 0
  const overBudget = maxAwardUsd && totals.grand_total > maxAwardUsd

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Budget Builder</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {funderName && <span className="text-indigo-700 font-medium">{funderName} · </span>}
            Version {state.version || 1} · {state.periods} period{state.periods > 1 ? 's' : ''} × {state.period_months} months
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => exportBudget('csv')} disabled={!!exportLoading} className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            {exportLoading === 'csv' ? '⟳' : '⬇'} CSV
          </button>
          <button onClick={() => exportBudget('docx')} disabled={!!exportLoading} className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            {exportLoading === 'docx' ? '⟳' : '⬇'} DOCX
          </button>
          <button onClick={generateJust} className="text-sm border border-indigo-300 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50">
            📝 Justification
          </button>
          <button onClick={save} disabled={saving} className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? '...' : saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Over-budget warning */}
      {overBudget && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          ⚠️ Budget total (${totals.grand_total.toLocaleString()}) exceeds max award (${maxAwardUsd!.toLocaleString()})
        </div>
      )}

      {/* Budget settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 text-sm">⚙️ Budget Settings</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Periods</label>
            <select value={state.periods} onChange={e => updateState({ periods: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {[1,2,3,4,5].map(p => <option key={p} value={p}>{p} {p===1?'period':'periods'}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Months / Period</label>
            <select value={state.period_months} onChange={e => updateState({ period_months: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
              <option value={18}>18 months</option>
              <option value={24}>24 months</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Indirect Rate %</label>
            <input type="number" min={0} max={100} step={0.5} value={state.indirect_rate_pct}
              onChange={e => updateState({ indirect_rate_pct: parseFloat(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Indirect Method</label>
            <select value={state.indirect_method} onChange={e => updateState({ indirect_method: e.target.value as BudgetState['indirect_method'] })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="MTDC">MTDC</option>
              <option value="TDC">TDC</option>
              <option value="personnel_fringe">Personnel + Fringe</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={autoFringeEnabled} onChange={e => setAutoFringeEnabled(e.target.checked)} className="rounded" />
            Auto-calculate fringe benefits
          </label>
          {autoFringeEnabled && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Rate:</span>
              <input type="number" min={0} max={100} step={1} value={fringeRate}
                onChange={e => setFringeRate(parseInt(e.target.value))}
                className="w-16 border border-gray-300 rounded px-2 py-1 text-xs text-center" />
              <span className="text-xs text-gray-500">%</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Category nav + line items */}
        <div className="md:col-span-2 space-y-4">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-1">
            {BUDGET_CATEGORIES.filter(c => c.key !== 'indirect').map(cat => {
              const total = catTotal(cat.key)
              const count = catItems(cat.key).length
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${activeCategory === cat.key ? 'bg-indigo-600 text-white' : 'border border-gray-200 text-gray-600 hover:border-indigo-300 bg-white'}`}
                >
                  {cat.icon} {cat.label.split('.')[1]?.trim() || cat.label}
                  {total > 0 && <span className="ml-1 opacity-70">${(total/1000).toFixed(0)}k</span>}
                  {count > 0 && <span className="ml-1 bg-white/20 rounded-full px-1">{count}</span>}
                </button>
              )
            })}
          </div>

          {/* Line items for active category */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <span className="font-medium text-sm text-gray-900">
                {BUDGET_CATEGORIES.find(c => c.key === activeCategory)?.label}
              </span>
              <span className="font-bold text-sm text-indigo-700">${catTotal(activeCategory).toLocaleString()}</span>
            </div>

            {catItems(activeCategory).length === 0 && (
              <div className="p-6 text-center text-sm text-gray-400">No line items yet — add one below</div>
            )}

            <div className="divide-y divide-gray-100">
              {catItems(activeCategory).map(item => (
                <LineItemRow key={item.id} item={item} category={activeCategory} onUpdate={updateItem} onRemove={removeItem} />
              ))}
            </div>

            <div className="px-4 py-3 border-t border-gray-100">
              <button
                onClick={() => addLineItem(activeCategory)}
                className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"
              >
                <span className="text-lg leading-none">+</span> Add line item
              </button>
            </div>
          </div>
        </div>

        {/* Summary sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Budget Summary</h3>

            {maxAwardUsd && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Used</span>
                  <span>{Math.min(Math.round((totals.grand_total/maxAwardUsd)*100), 100)}% of ${(maxAwardUsd/1000).toFixed(0)}k</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`h-2 rounded-full ${totals.grand_total > maxAwardUsd ? 'bg-red-500' : 'bg-indigo-500'}`}
                    style={{ width: `${Math.min((totals.grand_total/maxAwardUsd)*100, 100)}%` }} />
                </div>
              </div>
            )}

            <div className="space-y-1.5 text-sm">
              {totals.by_category.filter(c => c.total > 0).map(c => (
                <div key={c.key} className="flex justify-between">
                  <span className="text-gray-600 truncate text-xs">{c.label}</span>
                  <span className="text-gray-900 font-medium text-xs">${c.total.toLocaleString()}</span>
                </div>
              ))}
              {totals.total_direct > 0 && (
                <div className="flex justify-between border-t border-gray-100 pt-1.5 mt-1.5">
                  <span className="text-gray-700 text-xs font-medium">Total Direct</span>
                  <span className="font-medium text-xs">${totals.total_direct.toLocaleString()}</span>
                </div>
              )}
              {totals.indirect_amount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Indirect ({state.indirect_rate_pct}%)</span>
                  <span>${totals.indirect_amount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                <span className="font-bold text-gray-900 text-sm">TOTAL</span>
                <span className={`font-bold text-sm ${overBudget ? 'text-red-600' : 'text-indigo-700'}`}>${totals.grand_total.toLocaleString()}</span>
              </div>
              {totals.match_total > 0 && (
                <>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Federal request</span>
                    <span>${totals.federal_total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Match ({totals.match_pct}%)</span>
                    <span>${totals.match_total.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <button onClick={() => exportBudget('csv')} disabled={!!exportLoading} className="w-full text-xs border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                ⬇ Export CSV
              </button>
              <button onClick={() => exportBudget('docx')} disabled={!!exportLoading} className="w-full text-xs border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                ⬇ Export DOCX
              </button>
              <button onClick={generateJust} className="w-full text-xs border border-indigo-300 text-indigo-700 py-2 rounded-lg hover:bg-indigo-50">
                📝 Generate Narrative
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Justification panel */}
      {showJustification && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Budget Narrative / Justification</h3>
            <div className="flex gap-2">
              <button
                onClick={() => { navigator.clipboard.writeText(justification) }}
                className="text-xs border border-gray-300 px-3 py-1 rounded-lg hover:bg-gray-50"
              >
                Copy
              </button>
              <button onClick={() => setShowJustification(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
          </div>
          <textarea
            value={justification}
            onChange={e => setJustification(e.target.value)}
            className="w-full h-96 resize-y text-sm text-gray-800 font-mono border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}
    </div>
  )
}

// ─── Line item row ─────────────────────────────────────────────────────────────
function LineItemRow({ item, category, onUpdate, onRemove }: {
  item: BudgetLineItem
  category: CategoryKey
  onUpdate: (id: string, patch: Partial<BudgetLineItem>) => void
  onRemove: (id: string) => void
}) {
  const isAutoFringe = item.id === 'auto-fringe'
  const unitOptions = {
    personnel: ['annual salary', 'hourly', 'daily', 'monthly'],
    fringe: ['lump sum', '%'],
    travel: ['trip', 'mile', 'day', 'lump sum'],
    equipment: ['unit', 'lump sum'],
    supplies: ['lump sum', 'unit', 'month'],
    contractual: ['lump sum', 'month', 'unit'],
    construction: ['lump sum', 'sq ft'],
    other: ['lump sum', 'unit', 'month', 'event'],
    indirect: ['lump sum'],
  } as Record<CategoryKey, string[]>

  return (
    <div className="px-4 py-3">
      <div className="grid grid-cols-12 gap-2 items-center">
        <input
          value={item.description}
          onChange={e => onUpdate(item.id, { description: e.target.value })}
          disabled={isAutoFringe}
          placeholder="Description"
          className="col-span-4 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
        />
        <input
          type="number" min={0} step={0.01} value={item.quantity || ''}
          onChange={e => onUpdate(item.id, { quantity: parseFloat(e.target.value) || 0 })}
          disabled={isAutoFringe}
          placeholder="Qty"
          className="col-span-2 border border-gray-200 rounded px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50"
        />
        <select value={item.unit} onChange={e => onUpdate(item.id, { unit: e.target.value })}
          disabled={isAutoFringe}
          className="col-span-2 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50">
          {(unitOptions[category] || ['lump sum']).map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <input
          type="number" min={0} step={1} value={item.unit_cost || ''}
          onChange={e => onUpdate(item.id, { unit_cost: parseFloat(e.target.value) || 0 })}
          disabled={isAutoFringe}
          placeholder="Unit $"
          className="col-span-2 border border-gray-200 rounded px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50"
        />
        <div className="col-span-1 text-xs font-medium text-right text-gray-900">${(item.total).toLocaleString()}</div>
        <button onClick={() => onRemove(item.id)} disabled={isAutoFringe} className="col-span-1 text-gray-300 hover:text-red-500 text-center text-sm disabled:opacity-0">×</button>
      </div>
      {/* Second row: notes + federal/match toggle */}
      <div className="grid grid-cols-12 gap-2 mt-1.5 items-center">
        <input
          value={item.notes || ''}
          onChange={e => onUpdate(item.id, { notes: e.target.value })}
          disabled={isAutoFringe}
          placeholder="Notes (shown in justification)"
          className="col-span-8 border border-gray-100 rounded px-2 py-1 text-xs text-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:bg-transparent disabled:border-transparent"
        />
        <div className="col-span-3 flex items-center gap-1.5">
          <button
            onClick={() => onUpdate(item.id, { is_federal: true })}
            className={`text-xs px-2 py-0.5 rounded ${item.is_federal ? 'bg-blue-100 text-blue-800' : 'text-gray-400 border border-gray-200'}`}
          >Federal</button>
          <button
            onClick={() => onUpdate(item.id, { is_federal: false })}
            className={`text-xs px-2 py-0.5 rounded ${!item.is_federal ? 'bg-orange-100 text-orange-800' : 'text-gray-400 border border-gray-200'}`}
          >Match</button>
        </div>
      </div>
    </div>
  )
}
