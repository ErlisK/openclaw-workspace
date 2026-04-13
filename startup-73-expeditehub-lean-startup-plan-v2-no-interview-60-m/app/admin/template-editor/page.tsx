'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────
interface TemplateField {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea'
  options?: string[]
  autofill_rule?: string
  autofill_source?: 'gis' | 'homeowner' | 'rule' | 'calculated' | 'account' | 'pro'
  required: boolean
  value: string
}

interface Template {
  id: string
  jurisdiction: string
  form_type: string
  version: number
  label: string
  zoning_context: string
  fields: TemplateField[]
  autofill_rules: Record<string, unknown>
  accuracy_score: number | null
  notes: string | null
  updated_at: string
}

const ADMIN_SECRET = 'xh-admin-192bc149cb4377f9955b461a'

const ZONING_RULES: Record<string, { maxImpervious: number; maxAduSqft: number; maxAduFar: number; setbackFront: number; setbackRear: number; setbackSide: number }> = {
  'SF-3': { maxImpervious: 45, maxAduSqft: 1100, maxAduFar: 0.15, setbackFront: 25, setbackRear: 10, setbackSide: 5 },
  'SF-2': { maxImpervious: 45, maxAduSqft: 1100, maxAduFar: 0.15, setbackFront: 25, setbackRear: 10, setbackSide: 5 },
  'SF-4A': { maxImpervious: 50, maxAduSqft: 850, maxAduFar: 0.15, setbackFront: 25, setbackRear: 10, setbackSide: 5 },
  'MF-3': { maxImpervious: 60, maxAduSqft: 1100, maxAduFar: 0.20, setbackFront: 10, setbackRear: 10, setbackSide: 5 },
}

const SOURCE_COLORS: Record<string, string> = {
  gis:        'bg-green-100 text-green-800 border-green-300',
  rule:       'bg-blue-100 text-blue-800 border-blue-300',
  calculated: 'bg-purple-100 text-purple-800 border-purple-300',
  account:    'bg-teal-100 text-teal-800 border-teal-300',
  pro:        'bg-indigo-100 text-indigo-800 border-indigo-300',
  homeowner:  'bg-amber-100 text-amber-800 border-amber-300',
}

const SOURCE_LABELS: Record<string, string> = {
  gis: '🌍 GIS auto',
  rule: '📋 LDC rule',
  calculated: '🔢 calculated',
  account: '👤 account',
  pro: '🔑 pro profile',
  homeowner: '⚠️ homeowner input',
}

function computeAccuracy(fields: TemplateField[]): { score: number; autoCount: number; totalRequired: number } {
  const required = fields.filter(f => f.required)
  const autoFilled = required.filter(f => f.autofill_source && f.autofill_source !== 'homeowner')
  return {
    score: required.length > 0 ? Math.round((autoFilled.length / required.length) * 100) : 0,
    autoCount: autoFilled.length,
    totalRequired: required.length,
  }
}

export default function TemplateEditorPage() {
  const [template, setTemplate]     = useState<Template | null>(null)
  const [fields, setFields]         = useState<TemplateField[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [error, setError]           = useState('')
  const [activeTab, setActiveTab]   = useState<'fields' | 'rules' | 'preview' | 'audit'>('fields')
  const [showNewField, setShowNewField] = useState(false)
  const [newField, setNewField]     = useState<Partial<TemplateField>>({ key: '', label: '', type: 'text', required: false, autofill_source: 'homeowner' })
  const [auditLog, setAuditLog]     = useState<Array<{ field: string; label: string; source: string; auto: boolean; note: string }>>([])
  const [testAddress, setTestAddress] = useState('1234 E Cesar Chavez St, Austin, TX 78702')
  const [testResults, setTestResults] = useState<Record<string, string>>({})
  const [running, setRunning]       = useState(false)

  // Fetch template from Supabase
  const loadTemplate = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/templates?jurisdiction=Austin, TX&form_type=ADU_BP001')
      if (!res.ok) throw new Error('Template not found')
      const t: Template = await res.json()
      setTemplate(t)
      setFields(t.fields)
      buildAuditLog(t.fields)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTemplate() }, [loadTemplate])

  function buildAuditLog(flds: TemplateField[]) {
    setAuditLog(flds.map(f => ({
      field: f.key,
      label: f.label,
      source: f.autofill_source || 'homeowner',
      auto: !!f.autofill_source && f.autofill_source !== 'homeowner',
      note: f.autofill_rule || '',
    })))
  }

  // Run accuracy test against a real address
  const runAccuracyTest = async () => {
    setRunning(true)
    try {
      const res = await fetch(`/api/parcel?address=${encodeURIComponent(testAddress)}`)
      const gis = await res.json()
      const results: Record<string, string> = {}
      if (gis.zoning)        results['zoning'] = gis.zoning
      if (gis.lot_size_sqft) results['lot_area_sqft'] = String(gis.lot_size_sqft)
      if (gis.year_built)    results['year_built_main'] = String(gis.year_built)
      // Rule-based
      const zone = gis.zoning || 'SF-3'
      const rules = ZONING_RULES[zone] || ZONING_RULES['SF-3']
      results['setback_front'] = String(rules.setbackFront)
      results['setback_rear']  = String(rules.setbackRear)
      results['setback_side']  = String(rules.setbackSide)
      results['max_height_ft'] = '30'
      setTestResults(results)
    } catch {
      setTestResults({ error: 'GIS lookup failed' })
    } finally {
      setRunning(false)
    }
  }

  const updateField = (idx: number, patch: Partial<TemplateField>) => {
    setFields(prev => {
      const updated = prev.map((f, i) => i === idx ? { ...f, ...patch } : f)
      buildAuditLog(updated)
      return updated
    })
    setSaved(false)
  }

  const addField = () => {
    if (!newField.key || !newField.label) return
    const f: TemplateField = {
      key: newField.key!,
      label: newField.label!,
      type: (newField.type as TemplateField['type']) || 'text',
      required: newField.required ?? false,
      value: '',
      autofill_source: newField.autofill_source as TemplateField['autofill_source'],
      autofill_rule: newField.autofill_rule || '',
    }
    setFields(prev => { const u = [...prev, f]; buildAuditLog(u); return u })
    setNewField({ key: '', label: '', type: 'text', required: false, autofill_source: 'homeowner' })
    setShowNewField(false)
    setSaved(false)
  }

  const removeField = (idx: number) => {
    setFields(prev => { const u = prev.filter((_, i) => i !== idx); buildAuditLog(u); return u })
    setSaved(false)
  }

  const saveTemplate = async () => {
    if (!template) return
    setSaving(true)
    const { score } = computeAccuracy(fields)
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
        body: JSON.stringify({ id: template.id, fields, accuracy_score: score }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const { score: accuracy, autoCount, totalRequired } = computeAccuracy(fields)

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-500">Loading template...</div></div>
  if (error && !template) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-red-600">Error: {error}</div></div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-700 text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <div className="font-bold text-xl">ExpediteHub — Template Editor</div>
            <div className="text-blue-200 text-sm">{template?.label} · v{template?.version} · Last saved: {template ? new Date(template.updated_at).toLocaleDateString() : '—'}</div>
          </div>
          <div className="flex items-center gap-6">
            {/* Accuracy gauge */}
            <div className="text-center">
              <div className={`text-3xl font-bold ${accuracy >= 75 ? 'text-green-300' : accuracy >= 60 ? 'text-yellow-300' : 'text-red-300'}`}>{accuracy}%</div>
              <div className="text-xs text-blue-200">auto-fill rate</div>
              <div className="text-xs text-blue-300">{autoCount}/{totalRequired} required</div>
            </div>
            {/* Progress bar */}
            <div className="w-32">
              <div className="h-2 bg-blue-900 rounded-full">
                <div className={`h-2 rounded-full transition-all ${accuracy >= 75 ? 'bg-green-400' : accuracy >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${accuracy}%` }}></div>
              </div>
              <div className="text-xs text-blue-300 mt-1">Target: 75%</div>
            </div>
            <button
              onClick={saveTemplate}
              disabled={saving}
              className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${saved ? 'bg-green-500 text-white' : 'bg-white text-blue-700 hover:bg-blue-50'}`}
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save to DB'}
            </button>
            <Link href="/admin" className="text-blue-200 text-sm hover:text-white">← Admin</Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Accuracy alert */}
        {accuracy < 75 && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6 flex gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-semibold text-amber-800">Auto-fill accuracy below 75% target ({accuracy}%)</div>
              <div className="text-sm text-amber-700 mt-1">
                {fields.filter(f => f.required && f.autofill_source === 'homeowner').map(f => f.label).join(', ')} — marked as homeowner input.
                Move any that can be derived from GIS or rules to the appropriate source.
              </div>
            </div>
          </div>
        )}
        {accuracy >= 75 && (
          <div className="bg-green-50 border border-green-300 rounded-lg p-3 mb-6 text-green-800 text-sm font-medium">
            ✅ Auto-fill accuracy target met ({accuracy}%) — {autoCount} of {totalRequired} required fields auto-filled
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-200 p-1 rounded-lg w-fit">
          {(['fields', 'rules', 'preview', 'audit'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded text-sm font-medium capitalize transition-colors ${activeTab === t ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-800'}`}>
              {t === 'audit' ? '🔬 Accuracy Test' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── FIELDS TAB ─────────────────────────────────────────────────────── */}
        {activeTab === 'fields' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 text-lg">Form Fields ({fields.length})</h2>
              <button onClick={() => setShowNewField(!showNewField)}
                className="text-sm bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 font-medium">
                + Add Field
              </button>
            </div>

            {showNewField && (
              <div className="bg-white border-2 border-blue-300 rounded-lg p-4 mb-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Field Key</label>
                  <input value={newField.key || ''} onChange={e => setNewField(p => ({ ...p, key: e.target.value }))} placeholder="eg. owner_phone" className="mt-1 border rounded px-2 py-1.5 text-sm w-full" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Label</label>
                  <input value={newField.label || ''} onChange={e => setNewField(p => ({ ...p, label: e.target.value }))} placeholder="Owner Phone Number" className="mt-1 border rounded px-2 py-1.5 text-sm w-full" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Type</label>
                  <select value={newField.type || 'text'} onChange={e => setNewField(p => ({ ...p, type: e.target.value as TemplateField['type'] }))} className="mt-1 border rounded px-2 py-1.5 text-sm w-full">
                    <option value="text">Text</option><option value="number">Number</option><option value="select">Select</option><option value="textarea">Textarea</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Auto-fill Source</label>
                  <select value={newField.autofill_source || 'homeowner'} onChange={e => setNewField(p => ({ ...p, autofill_source: e.target.value as TemplateField['autofill_source'] }))} className="mt-1 border rounded px-2 py-1.5 text-sm w-full">
                    <option value="gis">🌍 GIS</option><option value="rule">📋 LDC Rule</option><option value="calculated">🔢 Calculated</option><option value="account">👤 Account</option><option value="pro">🔑 Pro Profile</option><option value="homeowner">⚠️ Homeowner Input</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600">Auto-fill Rule / Note</label>
                  <input value={newField.autofill_rule || ''} onChange={e => setNewField(p => ({ ...p, autofill_rule: e.target.value }))} placeholder="e.g. LDC §25-2-492 → 25 ft" className="mt-1 border rounded px-2 py-1.5 text-sm w-full" />
                </div>
                <div className="col-span-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newField.required ?? false} onChange={e => setNewField(p => ({ ...p, required: e.target.checked }))} /> Required field</label>
                  <div className="flex gap-2">
                    <button onClick={() => setShowNewField(false)} className="px-3 py-1.5 border rounded text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                    <button onClick={addField} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700">Add Field</button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {fields.map((field, idx) => {
                const src = field.autofill_source || 'homeowner'
                const colorClass = SOURCE_COLORS[src] || SOURCE_COLORS.homeowner
                return (
                  <div key={field.key} className={`bg-white border rounded-lg p-4 ${field.autofill_source === 'homeowner' ? 'border-amber-300' : 'border-gray-200'}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900">{field.label}</span>
                          {field.required && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">required</span>}
                          <span className={`text-xs px-2 py-0.5 rounded border ${colorClass}`}>{SOURCE_LABELS[src]}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">key: <code className="bg-gray-100 px-1 rounded">{field.key}</code> · type: {field.type}</div>
                        {field.autofill_rule && <div className="text-xs text-gray-500 mt-1 italic">↳ {field.autofill_rule}</div>}
                      </div>
                      <div className="flex gap-2 items-center shrink-0">
                        <select
                          value={field.autofill_source || 'homeowner'}
                          onChange={e => updateField(idx, { autofill_source: e.target.value as TemplateField['autofill_source'] })}
                          className="text-xs border rounded px-1.5 py-1"
                        >
                          <option value="gis">GIS</option>
                          <option value="rule">Rule</option>
                          <option value="calculated">Calc</option>
                          <option value="account">Account</option>
                          <option value="pro">Pro</option>
                          <option value="homeowner">Homeowner</option>
                        </select>
                        <label className="text-xs flex items-center gap-1">
                          <input type="checkbox" checked={field.required} onChange={e => updateField(idx, { required: e.target.checked })} /> req
                        </label>
                        <button onClick={() => removeField(idx)} className="text-xs text-red-400 hover:text-red-600 px-1">✕</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── RULES TAB ─────────────────────────────────────────────────────── */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="bg-white border rounded-lg p-6">
              <h2 className="font-semibold text-gray-800 text-lg mb-4">Auto-fill Rule Matrix — Austin ADU BP-001</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-3 py-2 text-left">Field</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">Source</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">Rule / Method</th>
                      <th className="border border-gray-200 px-3 py-2 text-center">Required</th>
                      <th className="border border-gray-200 px-3 py-2 text-center">Auto?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map(field => {
                      const src = field.autofill_source || 'homeowner'
                      const isAuto = src !== 'homeowner'
                      return (
                        <tr key={field.key} className={!isAuto && field.required ? 'bg-amber-50' : ''}>
                          <td className="border border-gray-200 px-3 py-2 font-medium">{field.label}</td>
                          <td className="border border-gray-200 px-3 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs border ${SOURCE_COLORS[src]}`}>{SOURCE_LABELS[src]}</span>
                          </td>
                          <td className="border border-gray-200 px-3 py-2 text-gray-600 text-xs">{field.autofill_rule || '—'}</td>
                          <td className="border border-gray-200 px-3 py-2 text-center">{field.required ? '●' : '○'}</td>
                          <td className="border border-gray-200 px-3 py-2 text-center">{isAuto ? '✅' : '⚠️'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                {Object.entries(ZONING_RULES).map(([zone, rules]) => (
                  <div key={zone} className="border rounded-lg p-4">
                    <div className="font-semibold text-gray-800 mb-2">{zone} Zoning Rules</div>
                    <div className="text-xs space-y-1 text-gray-600">
                      <div>Max impervious cover: {rules.maxImpervious}%</div>
                      <div>Max ADU size: {rules.maxAduSqft.toLocaleString()} sq ft</div>
                      <div>Max ADU FAR: {rules.maxAduFar}</div>
                      <div>Setbacks: {rules.setbackFront}ft front / {rules.setbackRear}ft rear / {rules.setbackSide}ft side</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PREVIEW TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'preview' && (
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="bg-blue-700 text-white px-6 py-4">
              <div className="font-bold text-lg">City of Austin — Building Permit Application BP-001</div>
              <div className="text-blue-200 text-sm">Accessory Dwelling Unit (ADU) · AI-Generated Draft Packet</div>
              <div className="text-xs text-blue-300 mt-1">Auto-filled: {autoCount}/{totalRequired} required fields · {accuracy}% accuracy</div>
            </div>
            <div className="divide-y divide-gray-100">
              {fields.filter(f => f.required).map(field => {
                const src = field.autofill_source || 'homeowner'
                const isAuto = src !== 'homeowner'
                return (
                  <div key={field.key} className="flex gap-4 px-6 py-3 items-start">
                    <div className="w-56 text-sm font-medium text-gray-700 shrink-0 pt-0.5">{field.label}</div>
                    <div className="flex-1">
                      {field.value ? (
                        <span className="text-sm text-gray-900 bg-green-50 px-2 py-0.5 rounded font-mono">{field.value}</span>
                      ) : isAuto ? (
                        <span className="text-xs text-gray-400 italic">Auto-filled from {SOURCE_LABELS[src]}</span>
                      ) : (
                        <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded">⚠️ Homeowner must provide</span>
                      )}
                    </div>
                    <div><span className={`text-xs px-1.5 py-0.5 rounded border ${SOURCE_COLORS[src]}`}>{SOURCE_LABELS[src]}</span></div>
                  </div>
                )
              })}
            </div>
            <div className="bg-gray-50 px-6 py-4 text-xs text-gray-500">
              This draft is generated by ExpediteHub AI. A licensed permit expediter will review and finalize before submission to the City of Austin DSD.
            </div>
          </div>
        )}

        {/* ── ACCURACY TEST TAB ─────────────────────────────────────────────── */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="bg-white border rounded-lg p-6">
              <h2 className="font-semibold text-gray-800 text-lg mb-4">Live Accuracy Test</h2>
              <p className="text-sm text-gray-600 mb-4">Run the auto-fill pipeline against a real Austin address to measure which fields populate correctly.</p>
              <div className="flex gap-3 mb-4">
                <input
                  value={testAddress}
                  onChange={e => setTestAddress(e.target.value)}
                  placeholder="Enter Austin address..."
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={runAccuracyTest}
                  disabled={running}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {running ? 'Running…' : 'Run Test'}
                </button>
              </div>

              {Object.keys(testResults).length > 0 && (
                <div>
                  <div className="font-medium text-gray-800 mb-2">Results:</div>
                  <div className="space-y-1">
                    {auditLog.map(entry => {
                      const result = testResults[entry.field]
                      const isError = entry.field === 'error'
                      return (
                        <div key={entry.field} className={`flex items-center gap-3 py-1.5 px-3 rounded text-sm ${result ? 'bg-green-50' : entry.auto ? 'bg-gray-50' : 'bg-amber-50'}`}>
                          <span className="w-4 text-center">{result ? '✅' : entry.auto ? '⏳' : '⚠️'}</span>
                          <span className="w-48 font-medium text-gray-700">{entry.label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${SOURCE_COLORS[entry.source]}`}>{SOURCE_LABELS[entry.source]}</span>
                          {result && <span className="text-gray-600 font-mono">{result}</span>}
                          {!result && entry.auto && <span className="text-gray-400 italic text-xs">waiting for real data</span>}
                          {!result && !entry.auto && <span className="text-amber-600 text-xs">needs homeowner</span>}
                        </div>
                      )
                    })}
                  </div>
                  {testResults.error && <div className="text-red-600 text-sm mt-2">GIS Error: {testResults.error}</div>}
                </div>
              )}

              {Object.keys(testResults).length === 0 && (
                <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500 text-sm">
                  Enter a real Austin address and click Run Test to see which fields auto-fill from GIS data.
                </div>
              )}
            </div>

            {/* Field-by-field audit table */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="font-semibold text-gray-800 mb-3">Field-by-Field Source Audit</h3>
              <div className="space-y-2">
                {auditLog.map(entry => (
                  <div key={entry.field} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                    <span className="text-lg mt-0.5">{entry.auto ? '✅' : '⚠️'}</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-800">{entry.label}</div>
                      <div className="text-xs text-gray-500">{entry.note}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded border shrink-0 ${SOURCE_COLORS[entry.source]}`}>{SOURCE_LABELS[entry.source]}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t text-sm text-gray-600 flex justify-between items-center">
                <span>Overall auto-fill: <strong>{autoCount}/{totalRequired}</strong> required fields</span>
                <span className={`font-bold text-lg ${accuracy >= 75 ? 'text-green-600' : 'text-amber-600'}`}>{accuracy}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
