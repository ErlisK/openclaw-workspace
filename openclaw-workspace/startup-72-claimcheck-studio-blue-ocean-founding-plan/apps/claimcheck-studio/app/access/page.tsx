'use client'
import { useState, useEffect } from 'react'

interface ConnectorTemplate {
  id: string
  connector_type: string
  display_name: string
  description: string
  auth_type: string
  rate_limit_rpm: number
  supports_fulltext: boolean
  config_schema: {
    required?: string[]
    properties: Record<string, { type: string; description: string }>
  }
}

interface Connector {
  id: string
  connector_type: string
  display_name: string
  enabled: boolean
  priority: number
  auth_type: string
  status: 'active' | 'disabled' | 'error'
  last_error?: string
  last_success_at?: string
  total_requests: number
  error_rate: number
  metadata_only: boolean
  allowed_storage: boolean
  license_type: string
}

interface AccessResult {
  doi: string
  licenseType: string
  licensePermitsStorage: boolean
  isOA: boolean
  accessType: string
  abstract?: string
  pdfUrl?: string
  title?: string
  connectorType?: string
  snapshotId?: string
  snapshotPath?: string
  errorMessage?: string
}

const AUTH_BADGES: Record<string, string> = {
  none: 'bg-gray-800 text-gray-400',
  email_param: 'bg-blue-900/40 text-blue-300',
  proxy_url: 'bg-purple-900/40 text-purple-300',
  bearer: 'bg-amber-900/40 text-amber-300',
  api_key: 'bg-green-900/40 text-green-300',
}

const STATUS_DOT: Record<string, string> = {
  active: 'bg-emerald-500',
  disabled: 'bg-gray-600',
  error: 'bg-red-500',
}

const LICENSE_COLOR: Record<string, string> = {
  cc_by: 'text-emerald-400',
  cc0: 'text-emerald-400',
  cc_by_nc: 'text-emerald-400',
  open_access: 'text-blue-400',
  subscriber: 'text-amber-400',
  paywalled: 'text-red-400',
  unknown: 'text-gray-500',
}

const LICENSE_ICON: Record<string, string> = {
  cc_by: '🟢', cc0: '🟢', cc_by_nc: '🟢',
  open_access: '🔵', subscriber: '🟡', paywalled: '🔴', unknown: '⚫',
}

// Demo org for UI testing
const DEMO_ORG = 'demo-org'
const DEMO_USER = 'demo-user'

export default function AccessPage() {
  const [templates, setTemplates] = useState<ConnectorTemplate[]>([])
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'connectors' | 'test' | 'audit'>('connectors')

  // Add connector
  const [addingType, setAddingType] = useState<string | null>(null)
  const [configValues, setConfigValues] = useState<Record<string, string>>({})
  const [connLabel, setConnLabel] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // DOI test
  const [testDoi, setTestDoi] = useState('10.1038/s41591-019-0695-9')
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<AccessResult | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [preferFullText, setPreferFullText] = useState(false)

  // Connector-level test
  const [testingConnId, setTestingConnId] = useState<string | null>(null)
  const [connTestResults, setConnTestResults] = useState<Record<string, { success: boolean; message: string; responseMs: number }>>({})

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/connectors?userId=${DEMO_USER}`)
      const data = await res.json()
      setTemplates(data.templates || [])
      setConnectors(data.connectors || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function addConnector() {
    const template = templates.find(t => t.connector_type === addingType)
    if (!template) return
    setAddLoading(true); setAddError(null)
    try {
      const res = await fetch('/api/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: DEMO_USER,
          connectorType: addingType,
          displayName: connLabel || template.display_name,
          config: configValues,
          metadataOnly: false,
          allowedStorage: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setConnectors(prev => [...prev, data.connector])
      setAddingType(null)
      setConfigValues({})
      setConnLabel('')
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Failed to add connector')
    } finally {
      setAddLoading(false)
    }
  }

  async function toggleConnector(id: string, enabled: boolean) {
    await fetch(`/api/connectors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !enabled }),
    })
    setConnectors(prev => prev.map(c => c.id === id ? { ...c, enabled: !enabled } : c))
  }

  async function removeConnector(id: string) {
    await fetch(`/api/connectors/${id}`, { method: 'DELETE' })
    setConnectors(prev => prev.filter(c => c.id !== id))
  }

  async function testConnectorById(id: string) {
    setTestingConnId(id)
    try {
      const res = await fetch(`/api/connectors/${id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testDoi: '10.1038/nature12373' }),
      })
      const data = await res.json()
      setConnTestResults(prev => ({ ...prev, [id]: data.testResult }))
      // Update status in list
      setConnectors(prev => prev.map(c => c.id === id
        ? { ...c, status: data.testResult.success ? 'active' : 'error', last_error: data.testResult.success ? undefined : data.testResult.message }
        : c))
    } finally {
      setTestingConnId(null)
    }
  }

  async function testDOI() {
    setTestLoading(true); setTestError(null); setTestResult(null)
    try {
      const res = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doi: testDoi, userId: DEMO_USER, preferFullText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTestResult(data.result)
    } catch (e) {
      setTestError(e instanceof Error ? e.message : 'Access failed')
    } finally {
      setTestLoading(false)
    }
  }

  const activeTemplate = templates.find(t => t.connector_type === addingType)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Access Layer</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Institutional connectors · License-gated storage · Versioned snapshots · Full audit trail
        </p>
      </div>

      {/* Built-in coverage banner */}
      <div className="rounded-xl border border-blue-700/30 bg-blue-950/20 p-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">🔓</span>
          <div>
            <div className="text-sm font-medium text-blue-300">Always-on: Open Access via Unpaywall + Semantic Scholar</div>
            <div className="text-xs text-gray-500 mt-0.5">
              All DOI lookups automatically check Unpaywall for OA PDFs and Semantic Scholar for free abstracts — no configuration needed.
              Add connectors below for institutional (paywalled) access.
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1">
        {(['connectors', 'test', 'audit'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              activeTab === t ? 'border-blue-600 bg-blue-950/50 text-blue-300' : 'border-gray-700 text-gray-500 hover:border-gray-600'
            }`}>
            {t === 'connectors' && `My Connectors (${connectors.length})`}
            {t === 'test' && 'Test DOI Access'}
            {t === 'audit' && 'Access Audit'}
          </button>
        ))}
      </div>

      {/* ── Connectors tab ── */}
      {activeTab === 'connectors' && (
        <div className="space-y-4">
          {/* Active connectors */}
          {connectors.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Configured Connectors</h2>
              {connectors.map(c => {
                const testRes = connTestResults[c.id]
                return (
                  <div key={c.id} className={`rounded-xl border p-4 transition-colors ${
                    c.enabled ? 'border-gray-700 bg-gray-900' : 'border-gray-800 bg-gray-950 opacity-60'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${STATUS_DOT[c.status]}`} />
                        <div>
                          <div className="text-sm font-medium text-white">{c.display_name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500">{c.connector_type}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${AUTH_BADGES[c.auth_type] || AUTH_BADGES.none}`}>
                              {c.auth_type}
                            </span>
                            {c.metadata_only && <span className="text-xs text-amber-500">metadata only</span>}
                            {c.allowed_storage && <span className="text-xs text-emerald-600">storage✓</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {testRes && (
                          <span className={`text-xs ${testRes.success ? 'text-emerald-400' : 'text-red-400'}`}>
                            {testRes.success ? `✅ ${testRes.responseMs}ms` : '❌ error'}
                          </span>
                        )}
                        <button onClick={() => testConnectorById(c.id)}
                          disabled={testingConnId === c.id}
                          className="px-2.5 py-1 text-xs border border-gray-700 rounded-lg text-gray-400 hover:text-gray-200 transition-colors">
                          {testingConnId === c.id ? '⟳' : 'Test'}
                        </button>
                        <button onClick={() => toggleConnector(c.id, c.enabled)}
                          className="px-2.5 py-1 text-xs border border-gray-700 rounded-lg text-gray-400 hover:text-gray-200 transition-colors">
                          {c.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => removeConnector(c.id)}
                          className="px-2.5 py-1 text-xs border border-red-900/40 rounded-lg text-red-500 hover:text-red-300 transition-colors">
                          Remove
                        </button>
                      </div>
                    </div>
                    {c.last_error && (
                      <div className="mt-2 text-xs text-red-400 bg-red-950/20 rounded px-2 py-1">{c.last_error}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Add connector */}
          {!addingType ? (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Add Connector</h2>
              {loading ? (
                <div className="text-xs text-gray-600">Loading templates…</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {templates.map(t => (
                    <button key={t.id} onClick={() => setAddingType(t.connector_type)}
                      className="text-left rounded-xl border border-gray-800 bg-gray-900 hover:border-gray-600 p-4 transition-colors group">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">
                            {t.display_name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{t.description}</div>
                        </div>
                        <div className="shrink-0 ml-2 flex flex-col items-end gap-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${AUTH_BADGES[t.auth_type] || AUTH_BADGES.none}`}>
                            {t.auth_type}
                          </span>
                          {t.supports_fulltext && (
                            <span className="text-xs text-emerald-600">full-text</span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 mt-2">{t.rate_limit_rpm} req/min</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Add connector form */
            <div className="rounded-xl border border-blue-700/40 bg-blue-950/15 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-blue-300">
                  Configure: {activeTemplate?.display_name}
                </h3>
                <button onClick={() => { setAddingType(null); setConfigValues({}); setAddError(null) }}
                  className="text-xs text-gray-500 hover:text-gray-300">✕ Cancel</button>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Display name</label>
                  <input value={connLabel} onChange={e => setConnLabel(e.target.value)}
                    placeholder={activeTemplate?.display_name}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-600" />
                </div>
                {activeTemplate && Object.entries(activeTemplate.config_schema.properties || {}).map(([key, prop]) => (
                  <div key={key}>
                    <label className="text-xs text-gray-500 mb-1 block">
                      {key}
                      {activeTemplate.config_schema.required?.includes(key) && (
                        <span className="text-red-400 ml-1">*</span>
                      )}
                      <span className="text-gray-600 ml-1">— {prop.description}</span>
                    </label>
                    <input
                      type={key.includes('key') || key.includes('password') || key.includes('token') || key.includes('secret') ? 'password' : 'text'}
                      value={configValues[key] || ''}
                      onChange={e => setConfigValues(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={prop.description.slice(0, 60)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600 font-mono" />
                  </div>
                ))}
              </div>

              {/* License notice */}
              <div className="mb-4 rounded-lg border border-amber-700/30 bg-amber-950/20 p-3 text-xs text-amber-300">
                ⚖️ <strong>License compliance:</strong> ClaimCheck will only store content permitted by the article license.
                CC-BY/CC0 content may be cached; subscriber/paywalled content: abstract + metadata only.
                Full-text snapshots are stored in private Supabase Storage with object versioning.
              </div>

              {addError && <div className="text-xs text-red-300 mb-3 bg-red-950/30 rounded px-2 py-1">{addError}</div>}

              <button onClick={addConnector} disabled={addLoading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg text-sm transition-colors">
                {addLoading ? 'Adding…' : 'Add Connector'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── DOI test tab ── */}
      {activeTab === 'test' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-300">Test DOI Access Resolution</h2>
            <div className="flex gap-3">
              <input value={testDoi} onChange={e => setTestDoi(e.target.value)}
                placeholder="e.g. 10.1038/nature12373"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-600" />
              <label className="flex items-center gap-2 text-xs text-gray-400">
                <input type="checkbox" checked={preferFullText} onChange={e => setPreferFullText(e.target.checked)}
                  className="accent-blue-500" />
                Full text
              </label>
              <button onClick={testDOI} disabled={testLoading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg text-sm transition-colors">
                {testLoading ? '⟳ Resolving…' : 'Resolve →'}
              </button>
            </div>

            {/* Quick test DOIs */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-600">Quick tests:</span>
              {[
                { doi: '10.1038/s41591-019-0695-9', label: 'Nature Medicine (OA)' },
                { doi: '10.1056/NEJMoa2034577', label: 'NEJM' },
                { doi: '10.1016/j.cell.2022.11.022', label: 'Cell' },
                { doi: '10.1101/2023.04.17.537199', label: 'bioRxiv preprint' },
              ].map(({ doi, label }) => (
                <button key={doi} onClick={() => setTestDoi(doi)}
                  className="text-xs px-2 py-1 border border-gray-700 rounded text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors">
                  {label}
                </button>
              ))}
            </div>

            {testError && <div className="text-sm text-red-300 bg-red-950/30 border border-red-700/40 rounded px-3 py-2">{testError}</div>}
          </div>

          {testResult && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
              {/* Access verdict */}
              <div className="flex items-center gap-4">
                <span className="text-3xl">{LICENSE_ICON[testResult.licenseType] || '⚫'}</span>
                <div>
                  <div className="text-sm font-bold text-white">
                    {testResult.accessType.toUpperCase()} — {testResult.isOA ? 'Open Access' : 'Restricted'}
                  </div>
                  <div className={`text-xs font-medium mt-0.5 ${LICENSE_COLOR[testResult.licenseType] || 'text-gray-500'}`}>
                    License: {testResult.licenseType.replace(/_/g, ' ')}
                    {testResult.licensePermitsStorage && ' · Storage permitted ✓'}
                  </div>
                  {testResult.connectorType && (
                    <div className="text-xs text-gray-500 mt-0.5">Connector: {testResult.connectorType}</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="border border-gray-800 rounded-lg p-2.5">
                  <div className="text-gray-600 mb-0.5">Access type</div>
                  <div className="text-white font-medium">{testResult.accessType}</div>
                </div>
                <div className="border border-gray-800 rounded-lg p-2.5">
                  <div className="text-gray-600 mb-0.5">License</div>
                  <div className={`font-medium ${LICENSE_COLOR[testResult.licenseType] || 'text-gray-400'}`}>
                    {testResult.licenseType}
                  </div>
                </div>
                <div className="border border-gray-800 rounded-lg p-2.5">
                  <div className="text-gray-600 mb-0.5">Storage</div>
                  <div className={testResult.licensePermitsStorage ? 'text-emerald-400' : 'text-red-400'}>
                    {testResult.licensePermitsStorage ? '✓ Permitted' : '✗ Not permitted'}
                  </div>
                </div>
              </div>

              {testResult.pdfUrl && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">OA PDF URL</div>
                  <a href={testResult.pdfUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 break-all">{testResult.pdfUrl}</a>
                </div>
              )}

              {testResult.abstract && (
                <div>
                  <div className="text-xs text-gray-500 mb-1.5">Abstract</div>
                  <p className="text-xs text-gray-300 bg-gray-800/50 rounded-lg p-3 leading-relaxed">
                    {testResult.abstract}
                  </p>
                </div>
              )}

              {testResult.snapshotId && (
                <div className="text-xs bg-emerald-950/20 border border-emerald-700/30 rounded-lg p-2.5">
                  <span className="text-emerald-400 font-medium">📦 Snapshot stored</span>
                  <span className="text-gray-500 ml-2 font-mono">{testResult.snapshotPath}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Audit tab ── */}
      {activeTab === 'audit' && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Access Audit Log</h2>
          <p className="text-xs text-gray-500 mb-4">
            Every access attempt — successful or not — is logged with DOI, connector used, license type, and whether content was stored.
            This audit trail is available for compliance reporting and institutional accountability.
          </p>
          <div className="space-y-2">
            <div className="grid grid-cols-5 gap-2 text-xs text-gray-600 px-2 border-b border-gray-800 pb-2">
              <span>Time</span>
              <span>DOI</span>
              <span>Access type</span>
              <span>License</span>
              <span>Stored</span>
            </div>
            <div className="text-xs text-gray-600 text-center py-6">
              Access audit entries will appear here as you use the system.
              All DOI resolutions and connector calls are logged automatically.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
