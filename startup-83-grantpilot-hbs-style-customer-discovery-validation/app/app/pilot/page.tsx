'use client'

import { useState, useEffect } from 'react'
import type { ToneOption, FunderProfile, OrgContext } from '@/lib/pilot-engine'
import { TONE_DESCRIPTIONS } from '@/lib/pilot-engine'

const FUNDER_TYPES = [
  { value: 'federal',     label: '🏛️ Federal', desc: 'DOJ, HUD, SAMHSA, EPA, USDA, NIH, NSF…' },
  { value: 'state',       label: '🏢 State',   desc: 'State agencies, state arts councils, LEAs…' },
  { value: 'foundation',  label: '🌱 Foundation', desc: 'RWJF, Gates, Ford, MacArthur, Kellogg…' },
  { value: 'community',   label: '🤝 Community', desc: 'Community foundations, local funders' },
  { value: 'corporate',   label: '🏦 Corporate', desc: 'Corporate CSR, employee giving programs' },
  { value: 'municipal',   label: '🏙️ Municipal', desc: 'City/county grant programs, CDBG, HOME' },
]

const FUNDER_PROFILES: Record<string, { priorities: string[]; preferences: string[] }> = {
  'HUD': { priorities: ['low-income benefit','community development','affordable housing','economic opportunity'], preferences: ['cite LMI percentage','reference Consolidated Plan','strong data documentation'] },
  'SAMHSA': { priorities: ['evidence-based treatment','underserved populations','SAMHSA priority populations','recovery support'], preferences: ['cite NSDUH data','reference CARF/JCAHO','address co-occurring disorders'] },
  'DOJ': { priorities: ['public safety','crime prevention','evidence-based policing','community partnerships'], preferences: ['cite BJS data','reference community input','address recidivism'] },
  'EPA': { priorities: ['environmental justice','EJ communities','pollution reduction','community-led solutions'], preferences: ['cite EJSCREEN data','emphasize community voice','reference cumulative impacts'] },
  'USDA': { priorities: ['rural communities','essential public purpose','rural eligibility','self-help'], preferences: ['document rural status','reference USDA eligibility','emphasize long-term sustainability'] },
  'NSF': { priorities: ['intellectual merit','broader impacts','diversity in STEM','open science'], preferences: ['cite research literature','include evaluation design','emphasize data sharing'] },
  'Robert Wood Johnson Foundation': { priorities: ['health equity','structural determinants','community power','policy change'], preferences: ['center community voice','address structural racism','ambitious theory of change'] },
  'National Endowment for the Arts': { priorities: ['artistic excellence','access and equity','geographic diversity','underserved communities'], preferences: ['articulate artistic vision','document community engagement','emphasize access'] },
  'National Endowment for the Humanities': { priorities: ['scholarly significance','public access','preservation','broad impact'], preferences: ['cite scholarly literature','emphasize public benefit','strong dissemination plan'] },
  'Gates Foundation': { priorities: ['systems change','evidence of impact','scale potential','health equity'], preferences: ['explicit theory of change','measurement plan','pathways to scale'] },
}

const SECTION_KEYS = [
  'project_narrative', 'executive_summary', 'problem_statement', 'goals_objectives',
  'program_design', 'evaluation_plan', 'organizational_capacity', 'sustainability',
  'budget_narrative', 'theory_of_change', 'broader_impacts', 'community_description',
  'project_abstract', 'training_plan', 'financial_health',
]

interface TemplatePreview {
  id: string; title: string; funder_name: string | null; section_key: string; score: number; reason: string
}

interface GenerateResult {
  prompt: { system_prompt: string; user_prompt: string; config_summary: string; estimated_tokens: number }
  generated_text: string | null
  has_llm: boolean
  config_summary: string
}

export default function PilotConfigPage() {
  const [activeTab, setActiveTab] = useState<'configure' | 'test' | 'templates'>('configure')

  // Config state
  const [name, setName] = useState('My Grant Pilot')
  const [funderType, setFunderType] = useState<string>('federal')
  const [funderName, setFunderName] = useState('')
  const [cfda, setCfda] = useState('')
  const [priorities, setPriorities] = useState<string[]>([])
  const [tone, setTone] = useState<ToneOption>('professional')
  const [orgName, setOrgName] = useState('')
  const [orgMission, setOrgMission] = useState('')
  const [orgServiceArea, setOrgServiceArea] = useState('')
  const [orgPopulation, setOrgPopulation] = useState('')
  const [orgBudget, setOrgBudget] = useState('')
  const [orgType, setOrgType] = useState('nonprofit')
  const [systemPromptOverride, setSystemPromptOverride] = useState('')
  const [maxTemplateTokens, setMaxTemplateTokens] = useState(2000)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Test state
  const [testSection, setTestSection] = useState('problem_statement')
  const [testGenerating, setTestGenerating] = useState(false)
  const [testResult, setTestResult] = useState<GenerateResult | null>(null)
  const [templatePreviews, setTemplatePreviews] = useState<TemplatePreview[]>([])

  // Template browser state
  const [allTemplates, setAllTemplates] = useState<Record<string, unknown>[]>([])
  const [templateFilter, setTemplateFilter] = useState('')

  // Auto-fill known funder profile
  useEffect(() => {
    const profile = FUNDER_PROFILES[funderName]
    if (profile) setPriorities(profile.priorities)
  }, [funderName])

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    const r = await fetch('/api/templates')
    if (r.ok) { const d = await r.json(); setAllTemplates(d.templates || []) }
  }

  const save = async () => {
    setSaving(true)
    const config = buildConfig()
    const r = await fetch('/api/pilot/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...config, is_default: true }),
    })
    setSaving(false)
    if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  }

  const buildConfig = () => ({
    name,
    funder_profile: {
      funder_name: funderName || undefined,
      funder_type: funderType,
      cfda_number: cfda || undefined,
      priorities: priorities.filter(Boolean),
      known_preferences: FUNDER_PROFILES[funderName]?.preferences || [],
    } as FunderProfile,
    tone,
    org_context: {
      org_name: orgName || undefined,
      org_type: orgType,
      mission: orgMission || undefined,
      service_area: orgServiceArea || undefined,
      population_served: orgPopulation || undefined,
      annual_budget: orgBudget ? parseInt(orgBudget.replace(/\D/g, '')) : undefined,
    } as OrgContext,
    system_prompt_override: systemPromptOverride || undefined,
    retrieve_templates: true,
    max_template_tokens: maxTemplateTokens,
    llm_model: 'gpt-4o-mini',
    temperature: 0.4,
  })

  const testGenerate = async () => {
    setTestGenerating(true)
    setTestResult(null)
    const r = await fetch('/api/pilot/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section_key: testSection,
        section_title: testSection.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        pilot_config_override: buildConfig(),
      }),
    })
    const d = await r.json()
    setTestGenerating(false)
    if (r.ok) {
      setTestResult(d)
      setTemplatePreviews(d.prompt?.matched_templates || [])
    }
  }

  const filteredTemplates = allTemplates.filter(t => {
    const q = templateFilter.toLowerCase()
    if (!q) return true
    return (String(t.title)+String(t.funder_name||'')+String(t.section_key||'')+((t.tags as string[])||[]).join(' ')).toLowerCase().includes(q)
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <a href="/dashboard" className="hover:text-indigo-600">Dashboard</a>
            <span>›</span>
            <span>Grant Pilot</span>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">⚡ Grant Pilot Configuration</h1>
              <p className="text-gray-500 mt-1 text-sm">Configure funder profile, tone, and org context to get tailored AI-generated narratives.</p>
            </div>
            <button
              onClick={save}
              disabled={saving}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 text-sm"
            >
              {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save as Default'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {([
            { id: 'configure', label: '⚙️ Configure' },
            { id: 'test',      label: '🧪 Test Pilot' },
            { id: 'templates', label: '📚 Template Library' },
          ] as { id: typeof activeTab; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === t.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {activeTab === 'configure' && (
          <>
            {/* Pilot name */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">Pilot Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Federal Human Services Pilot" />
            </div>

            {/* Funder Profile */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h2 className="font-semibold text-gray-900">🏛️ Funder Profile</h2>
              <p className="text-sm text-gray-500">Configure once per grant type, or override per application. Helps the pilot write in language the funder responds to.</p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {FUNDER_TYPES.map(ft => (
                  <button
                    key={ft.value}
                    onClick={() => setFunderType(ft.value)}
                    className={`text-left p-3 rounded-xl border-2 transition-colors ${funderType === ft.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="font-medium text-sm">{ft.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{ft.desc}</div>
                  </button>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Specific Funder Name</label>
                  <input value={funderName} onChange={e => setFunderName(e.target.value)}
                    list="funder-names"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. HUD, SAMHSA, Robert Wood Johnson Foundation" />
                  <datalist id="funder-names">
                    {Object.keys(FUNDER_PROFILES).map(f => <option key={f} value={f} />)}
                  </datalist>
                  {FUNDER_PROFILES[funderName] && (
                    <div className="text-xs text-green-700 mt-1">✓ Known profile auto-loaded</div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">CFDA Number (optional)</label>
                  <input value={cfda} onChange={e => setCfda(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. 14.218" />
                </div>
              </div>

              {/* Priorities */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Funder Priorities (auto-populated for known funders, editable)</label>
                <div className="flex flex-wrap gap-2">
                  {priorities.map((p, i) => (
                    <span key={i} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
                      {p}
                      <button onClick={() => setPriorities(priorities.filter((_, j) => j !== i))} className="text-blue-400 hover:text-blue-700 ml-0.5">×</button>
                    </span>
                  ))}
                  <input
                    className="text-xs border border-dashed border-gray-300 rounded-full px-3 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 w-32"
                    placeholder="+ add priority"
                    onKeyDown={e => { if (e.key === 'Enter' && e.currentTarget.value.trim()) { setPriorities([...priorities, e.currentTarget.value.trim()]); e.currentTarget.value = '' } }}
                  />
                </div>
              </div>
            </div>

            {/* Tone */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <h2 className="font-semibold text-gray-900">🎨 Narrative Tone</h2>
              <div className="grid gap-3">
                {(Object.entries(TONE_DESCRIPTIONS) as [ToneOption, typeof TONE_DESCRIPTIONS[ToneOption]][]).map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => setTone(key)}
                    className={`text-left p-4 rounded-xl border-2 transition-colors ${tone === key ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{meta.label}</span>
                      {tone === key && <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">Selected</span>}
                    </div>
                    <div className="text-xs text-gray-500 mb-1">{meta.description}</div>
                    <div className="text-xs text-gray-400 italic">{meta.example}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Org Context */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h2 className="font-semibold text-gray-900">🏢 Organization Context</h2>
              <p className="text-sm text-gray-500">Help the pilot write in your voice. The more context, the more personalized the output.</p>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Organization Name</label>
                  <input value={orgName} onChange={e => setOrgName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Legal name" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Organization Type</label>
                  <select value={orgType} onChange={e => setOrgType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {['nonprofit','municipal','neighborhood_assoc','academic','healthcare','tribal','school'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mission Statement</label>
                  <textarea value={orgMission} onChange={e => setOrgMission(e.target.value)} rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Our mission is to..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Service Area</label>
                  <input value={orgServiceArea} onChange={e => setOrgServiceArea(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. South Side Chicago, IL" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Population Served</label>
                  <input value={orgPopulation} onChange={e => setOrgPopulation(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. low-income families, youth 14–24" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Annual Operating Budget ($)</label>
                  <input value={orgBudget} onChange={e => setOrgBudget(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. 850000" type="number" />
                </div>
              </div>
            </div>

            {/* Advanced */}
            <details className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <summary className="px-5 py-4 font-semibold text-gray-700 cursor-pointer text-sm">⚙️ Advanced Settings</summary>
              <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">System Prompt Override (leave blank for default)</label>
                  <textarea value={systemPromptOverride} onChange={e => setSystemPromptOverride(e.target.value)} rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="You are an expert grant writer specializing in..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Max Template Tokens: {maxTemplateTokens.toLocaleString()}</label>
                  <input type="range" min={500} max={4000} step={100} value={maxTemplateTokens}
                    onChange={e => setMaxTemplateTokens(parseInt(e.target.value))}
                    className="w-full accent-indigo-600" />
                  <div className="flex justify-between text-xs text-gray-400 mt-1"><span>500 (fast)</span><span>4000 (thorough)</span></div>
                </div>
              </div>
            </details>
          </>
        )}

        {activeTab === 'test' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">🧪 Test Your Pilot</h2>
              <p className="text-sm text-gray-500 mb-4">See which templates get retrieved and preview the assembled prompt. If an OpenAI API key is configured, you'll get a generated draft.</p>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Section to Generate</label>
                  <select value={testSection} onChange={e => setTestSection(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {SECTION_KEYS.map(k => <option key={k} value={k}>{k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                  </select>
                </div>
                <button onClick={testGenerate} disabled={testGenerating}
                  className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 text-sm">
                  {testGenerating ? '⚡ Generating...' : '⚡ Run Pilot'}
                </button>
              </div>
            </div>

            {testResult && (
              <>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="text-sm font-medium text-green-800">✓ {testResult.config_summary}</div>
                  {!testResult.has_llm && <div className="text-xs text-green-600 mt-1">No OpenAI API key configured — showing prompt only. Set OPENAI_API_KEY in Vercel to enable AI generation.</div>}
                </div>

                {/* Matched templates */}
                {templatePreviews.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="font-semibold text-gray-900 mb-3 text-sm">📚 Retrieved Templates ({templatePreviews.length})</h3>
                    <div className="space-y-2">
                      {templatePreviews.map((t) => (
                        <div key={t.id} className="flex items-center gap-3 text-sm">
                          <div className="flex-shrink-0 w-12 text-center">
                            <div className="text-xs font-bold text-indigo-700">{Math.round(t.score * 100)}%</div>
                            <div className="w-full bg-gray-100 rounded-full h-1 mt-0.5">
                              <div className="bg-indigo-500 h-1 rounded-full" style={{ width: `${t.score * 100}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{t.title}</div>
                            <div className="text-xs text-gray-400">{t.reason} · {t.section_key}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Generated text */}
                {testResult.generated_text && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="font-semibold text-gray-900 mb-3 text-sm">✍️ Generated Draft</h3>
                    <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                      {testResult.generated_text}
                    </div>
                  </div>
                )}

                {/* Assembled prompt preview */}
                <details className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <summary className="px-5 py-3 text-sm font-medium text-gray-700 cursor-pointer">🔍 View Assembled Prompt (~{testResult.prompt.estimated_tokens.toLocaleString()} tokens)</summary>
                  <div className="px-5 pb-5 space-y-3 border-t border-gray-100 pt-4">
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">SYSTEM PROMPT</div>
                      <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg overflow-auto max-h-40 whitespace-pre-wrap">{testResult.prompt.system_prompt}</pre>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">USER PROMPT</div>
                      <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg overflow-auto max-h-60 whitespace-pre-wrap">{testResult.prompt.user_prompt}</pre>
                    </div>
                  </div>
                </details>
              </>
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="font-semibold text-gray-900">📚 Template Library — {allTemplates.length} Templates</h2>
                <input value={templateFilter} onChange={e => setTemplateFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
                  placeholder="Filter templates..." />
              </div>
              <div className="space-y-3">
                {filteredTemplates.map(t => (
                  <div key={String(t.id)} className="border border-gray-100 rounded-xl p-4 hover:border-indigo-200 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{String(t.title)}</div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {t.funder_name && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{String(t.funder_name)}</span>}
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{String(t.funder_type)}</span>
                          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{String(t.section_key)}</span>
                          {t.typical_word_limit && <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded">{String(t.typical_word_limit)} wds</span>}
                          {(t.tags as string[])?.slice(0,3).map((tag: string) => (
                            <span key={tag} className="text-xs text-gray-400">{tag}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 text-xs text-gray-400">
                        <div>Used {String(t.use_count)}×</div>
                        {Number(t.win_count) > 0 && <div className="text-green-700">{String(t.win_count)} wins</div>}
                      </div>
                    </div>
                    <details className="mt-2">
                      <summary className="text-xs text-indigo-600 cursor-pointer hover:underline">Preview content</summary>
                      <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap max-h-40 overflow-auto font-mono">
                        {String(t.content_md).slice(0, 600)}{String(t.content_md).length > 600 ? '...' : ''}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
