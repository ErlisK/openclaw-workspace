'use client'
import { useState } from 'react'

type ChannelFormat = 'twitter_thread' | 'linkedin_post' | 'explainer_blog' | 'slide_copy' | 'email_newsletter'
type ReadingLevel = 'grade_6' | 'grade_10' | 'grade_14' | 'grade_16'
type Territory = 'general' | 'fda_us' | 'ema_eu'

interface CitationItem {
  claimId: string
  claimText: string
  confidenceBand: string
  confidenceScore: number
  sources: Array<{
    title: string
    authors: string[]
    year?: number
    doi?: string
    doiUrl?: string
    journal?: string
    studyType?: string
    plainLanguageSummary?: string
  }>
}

interface CMSMetadata {
  title: string
  slug: string
  excerpt: string
  tags: string[]
}

interface ChannelOutput {
  outputId: string
  sessionId: string
  format: ChannelFormat
  readingLevel: ReadingLevel
  territory: Territory
  content: string
  disclaimer: string
  fullOutput: string
  wordCount: number
  tweetCount?: number
  citationBundle: CitationItem[]
  claimsUsed: string[]
  generatedAt: string
  model: string
  tokensUsed: number
  cmsMetadata: CMSMetadata
}

const FORMAT_OPTIONS: { value: ChannelFormat; label: string; icon: string; desc: string }[] = [
  { value: 'twitter_thread', label: 'Twitter/X Thread',  icon: '𝕏', desc: '10-14 tweets, evidence-linked' },
  { value: 'linkedin_post',  label: 'LinkedIn Post',     icon: 'in', desc: '~800 words, thought-leadership' },
  { value: 'explainer_blog', label: 'Explainer Blog',    icon: '✍️', desc: '~700 words, H2-structured HTML' },
  { value: 'slide_copy',     label: 'Slide Copy',        icon: '📊', desc: '8-10 slides, bullet points' },
  { value: 'email_newsletter', label: 'Email Newsletter', icon: '✉️', desc: '~600 words, digest format' },
]

const LEVEL_OPTIONS: { value: ReadingLevel; label: string; badge: string; desc: string }[] = [
  { value: 'grade_6',  label: 'Grade 6',  badge: 'Patient',      desc: 'Simple, everyday language' },
  { value: 'grade_10', label: 'Grade 10', badge: 'Journalist',   desc: 'Light terminology, accessible' },
  { value: 'grade_14', label: 'Grade 14', badge: 'Clinician',    desc: 'Technical, statistical' },
  { value: 'grade_16', label: 'Grade 16', badge: 'Researcher',   desc: 'Dense, citation-heavy' },
]

const TERRITORY_OPTIONS: { value: Territory; label: string }[] = [
  { value: 'general', label: 'General (FTC)' },
  { value: 'fda_us',  label: 'FDA (US)' },
  { value: 'ema_eu',  label: 'EMA (EU)' },
]

const CMS_TARGETS = [
  { id: 'copy',       icon: '📋', label: 'Copy to clipboard' },
  { id: 'txt',        icon: '📄', label: 'Download .txt' },
  { id: 'md',         icon: '⬇️', label: 'Download .md' },
  { id: 'html',       icon: '🌐', label: 'Download .html' },
  { id: 'json',       icon: '{}', label: 'Export JSON' },
  { id: 'wordpress',  icon: '🔵', label: 'WordPress (draft)' },
  { id: 'webflow',    icon: '⚡', label: 'Webflow CMS' },
  { id: 'contentful', icon: '🟡', label: 'Contentful' },
]

const CONFIDENCE_COLORS: Record<string, string> = {
  high:     'text-emerald-400',
  moderate: 'text-amber-400',
  low:      'text-red-400',
  none:     'text-gray-600',
}
const CONFIDENCE_EMOJI: Record<string, string> = { high: '🟢', moderate: '🟡', low: '🔴', none: '⚫' }

// ─── Demo session for quick testing ────────────────────────────────────────
const DEMO_SESSION = '5257b126-25f7-4db3-9d5c-8379b1fb0913'

export default function OutputsPage() {
  const [sessionId, setSessionId] = useState(DEMO_SESSION)
  const [format, setFormat] = useState<ChannelFormat>('twitter_thread')
  const [readingLevel, setReadingLevel] = useState<ReadingLevel>('grade_10')
  const [territory, setTerritory] = useState<Territory>('general')
  const [topicContext, setTopicContext] = useState('')
  const [includeDisclaimers, setIncludeDisclaimers] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [output, setOutput] = useState<ChannelOutput | null>(null)
  const [activeTab, setActiveTab] = useState<'output' | 'citations' | 'cms'>('output')
  const [copied, setCopied] = useState(false)
  const [exportStatus, setExportStatus] = useState<string | null>(null)

  // CMS config forms
  const [wpConfig, setWpConfig] = useState({ siteUrl: '', username: '', password: '' })
  const [wfConfig, setWfConfig] = useState({ apiToken: '', collectionId: '', siteId: '' })
  const [cfConfig, setCfConfig] = useState({ spaceId: '', accessToken: '', contentTypeId: '' })

  async function generate() {
    if (!sessionId) { setError('Session ID required'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/outputs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId, format, readingLevel, territory,
          topicContext: topicContext || undefined,
          includeDisclaimers,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOutput(data.output)
      setActiveTab('output')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  async function copyOutput() {
    if (!output) return
    await navigator.clipboard.writeText(output.fullOutput)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function downloadOutput(fmt: string) {
    if (!output) return
    const res = await fetch(`/api/outputs/${output.outputId}?format=${fmt}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `citebundle_${output.format}_${output.cmsMetadata.slug}.${fmt}`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportToCMS(target: string) {
    if (!output) return
    setExportStatus(`Exporting to ${target}…`)
    try {
      let config: Record<string, unknown> | undefined
      if (target === 'wordpress') config = wpConfig
      else if (target === 'webflow') config = wfConfig
      else if (target === 'contentful') config = cfConfig

      const res = await fetch(`/api/outputs/${output.outputId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmsType: target, config }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setExportStatus(`✅ ${target} export successful! ${data.postUrl || data.slug || data.entryId || ''}`)
    } catch (e) {
      setExportStatus(`❌ ${e instanceof Error ? e.message : 'Export failed'}`)
    }
  }

  // Format output for display
  function renderContent(content: string, fmt: ChannelFormat) {
    if (fmt === 'explainer_blog') {
      return <div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
    }
    if (fmt === 'twitter_thread') {
      const tweets = content.split(/\n\n/).filter(t => t.trim())
      return (
        <div className="space-y-3">
          {tweets.map((tweet, i) => (
            <div key={i} className="border border-gray-700 rounded-xl p-3 bg-gray-800/50">
              <p className="text-sm text-gray-200 whitespace-pre-wrap">{tweet}</p>
              <div className="text-xs text-gray-600 mt-1">{tweet.length} chars</div>
            </div>
          ))}
        </div>
      )
    }
    return <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">{content}</pre>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Channel Outputs</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          LLM-powered content generation · Grade-level controls · Auto-disclaimers · CMS export
        </p>
      </div>

      {/* Config panel */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-5">
        {/* Session ID */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Session ID</label>
          <input value={sessionId} onChange={e => setSessionId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-600"
            placeholder="Session UUID with extracted claims" />
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* Format */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Channel Format</label>
            <div className="space-y-1.5">
              {FORMAT_OPTIONS.map(opt => (
                <label key={opt.value} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                  format === opt.value ? 'border-blue-600/60 bg-blue-950/20' : 'border-gray-800 hover:border-gray-700'
                }`}>
                  <input type="radio" name="format" value={opt.value} checked={format === opt.value}
                    onChange={() => setFormat(opt.value)} className="accent-blue-500" />
                  <div>
                    <div className="text-xs font-medium text-white flex items-center gap-1.5">
                      <span className="w-5 text-center text-xs">{opt.icon}</span>
                      {opt.label}
                    </div>
                    <div className="text-xs text-gray-600 pl-6">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Reading level */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Reading Level</label>
            <div className="space-y-1.5">
              {LEVEL_OPTIONS.map(opt => (
                <label key={opt.value} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                  readingLevel === opt.value ? 'border-purple-600/60 bg-purple-950/20' : 'border-gray-800 hover:border-gray-700'
                }`}>
                  <input type="radio" name="readingLevel" value={opt.value} checked={readingLevel === opt.value}
                    onChange={() => setReadingLevel(opt.value)} className="accent-purple-500" />
                  <div>
                    <div className="text-xs font-medium text-white flex items-center gap-1.5">
                      {opt.label}
                      <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 text-[10px]">{opt.badge}</span>
                    </div>
                    <div className="text-xs text-gray-600">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Territory / Disclaimers</label>
              <div className="space-y-1.5">
                {TERRITORY_OPTIONS.map(opt => (
                  <label key={opt.value} className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                    territory === opt.value ? 'border-amber-600/50 bg-amber-950/20' : 'border-gray-800 hover:border-gray-700'
                  }`}>
                    <input type="radio" name="territory" value={opt.value} checked={territory === opt.value}
                      onChange={() => setTerritory(opt.value)} className="accent-amber-500" />
                    <span className="text-xs text-white">{opt.label}</span>
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input type="checkbox" checked={includeDisclaimers} onChange={e => setIncludeDisclaimers(e.target.checked)}
                  className="accent-blue-500 w-4 h-4" />
                <span className="text-xs text-gray-400">Auto-insert compliance disclaimers</span>
              </label>
            </div>

            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Topic context (optional)</label>
              <textarea value={topicContext} onChange={e => setTopicContext(e.target.value)} rows={3}
                placeholder="e.g. pembrolizumab in advanced lung cancer"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600 resize-none" />
            </div>
          </div>
        </div>

        {error && <div className="text-sm text-red-300 bg-red-950/30 border border-red-700/40 rounded-lg px-3 py-2">{error}</div>}

        <button onClick={generate} disabled={loading || !sessionId}
          className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors">
          {loading ? '⟳ Generating with Claude…' : '✨ Generate Channel Output →'}
        </button>
      </div>

      {/* Output panel */}
      {output && (
        <div className="space-y-4">
          {/* Stats bar */}
          <div className="flex items-center gap-4 px-4 py-3 rounded-xl border border-gray-800 bg-gray-900 text-xs">
            <span className="text-gray-400">
              📝 <span className="text-white font-medium">{output.wordCount}</span> words
            </span>
            {output.tweetCount && (
              <span className="text-gray-400">
                𝕏 <span className="text-white font-medium">{output.tweetCount}</span> tweets
              </span>
            )}
            <span className="text-gray-400">
              📚 <span className="text-white font-medium">{output.citationBundle.length}</span> claims with sources
            </span>
            <span className="text-gray-400">
              🔢 <span className="text-white font-medium">{output.tokensUsed}</span> tokens
            </span>
            <span className="text-gray-600 ml-auto">
              {output.cmsMetadata.title?.slice(0, 50)}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={copyOutput}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                copied ? 'border-emerald-600 text-emerald-400' : 'border-gray-700 text-gray-400 hover:text-gray-200'
              }`}>
              {copied ? '✅ Copied!' : '📋 Copy'}
            </button>
            {['txt', 'md', 'html'].map(fmt => (
              <button key={fmt} onClick={() => downloadOutput(fmt)}
                className="px-3 py-1.5 rounded-lg text-xs border border-gray-700 text-gray-400 hover:text-gray-200 transition-colors">
                ↓ .{fmt}
              </button>
            ))}
            <span className="text-gray-700 text-xs">|</span>
            <span className="text-xs text-gray-600">Export to CMS:</span>
            {['wordpress', 'webflow', 'contentful', 'json'].map(cms => (
              <button key={cms} onClick={() => exportToCMS(cms)}
                className="px-3 py-1.5 rounded-lg text-xs border border-gray-700 text-gray-500 hover:text-gray-200 transition-colors capitalize">
                {cms}
              </button>
            ))}
          </div>

          {exportStatus && (
            <div className={`text-xs px-3 py-2 rounded-lg border ${
              exportStatus.startsWith('✅') ? 'border-emerald-700/40 bg-emerald-950/20 text-emerald-300' :
              exportStatus.startsWith('❌') ? 'border-red-700/40 bg-red-950/20 text-red-300' :
              'border-gray-700 bg-gray-800/50 text-gray-400'
            }`}>
              {exportStatus}
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-1">
            {(['output', 'citations', 'cms'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  activeTab === t ? 'border-blue-600 bg-blue-950/50 text-blue-300' : 'border-gray-700 text-gray-500 hover:border-gray-600'
                }`}>
                {t === 'output' && 'Generated Content'}
                {t === 'citations' && `Citation Bundle (${output.citationBundle.length})`}
                {t === 'cms' && 'CMS Metadata & Config'}
              </button>
            ))}
          </div>

          {/* Output tab */}
          {activeTab === 'output' && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="text-white font-medium">{FORMAT_OPTIONS.find(f => f.value === output.format)?.label}</span>
                  <span>·</span>
                  <span>{LEVEL_OPTIONS.find(l => l.value === output.readingLevel)?.badge}</span>
                  <span>·</span>
                  <span>{output.territory.toUpperCase()}</span>
                </div>
                <span className="text-xs text-gray-600">{new Date(output.generatedAt).toLocaleString()}</span>
              </div>
              <div className="p-5">
                {renderContent(output.content, output.format)}
                {output.disclaimer && (
                  <div className="mt-6 pt-4 border-t border-gray-800">
                    <p className="text-xs text-gray-500 italic leading-relaxed">{output.disclaimer}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Citation bundle tab */}
          {activeTab === 'citations' && (
            <div className="space-y-3">
              {output.citationBundle.map((item, i) => (
                <div key={i} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-sm">{CONFIDENCE_EMOJI[item.confidenceBand]}</span>
                    <div>
                      <p className="text-sm text-gray-200 leading-snug">{item.claimText}</p>
                      <span className={`text-xs font-medium mt-0.5 inline-block ${CONFIDENCE_COLORS[item.confidenceBand]}`}>
                        {item.confidenceBand} confidence · {(item.confidenceScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  {item.sources.length > 0 && (
                    <div className="space-y-1.5 pl-6">
                      {item.sources.map((src, si) => (
                        <div key={si} className="text-xs text-gray-500 border-l-2 border-gray-800 pl-3">
                          <span className="text-gray-300">{src.title?.slice(0, 80)}</span>
                          {src.authors?.[0] && <span className="ml-1">— {src.authors[0].split(',')[0]} et al. ({src.year})</span>}
                          {src.doi && (
                            <a href={src.doiUrl} target="_blank" rel="noopener noreferrer"
                              className="ml-2 text-blue-500 hover:text-blue-400">
                              doi:{src.doi}
                            </a>
                          )}
                          {src.studyType && <span className="ml-2 px-1 py-0.5 bg-gray-800 rounded text-gray-600">{src.studyType}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* CMS metadata tab */}
          {activeTab === 'cms' && (
            <div className="space-y-4">
              {/* Metadata preview */}
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Generated Metadata</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-gray-600">Title:</span> <span className="text-gray-200">{output.cmsMetadata.title}</span></div>
                  <div><span className="text-gray-600">Slug:</span> <span className="text-gray-400 font-mono">{output.cmsMetadata.slug}</span></div>
                  <div className="col-span-2"><span className="text-gray-600">Excerpt:</span> <span className="text-gray-300">{output.cmsMetadata.excerpt}</span></div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Tags:</span>{' '}
                    {output.cmsMetadata.tags?.map(t => (
                      <span key={t} className="ml-1 px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{t}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* CMS configs */}
              <div className="grid grid-cols-3 gap-4">
                {/* WordPress */}
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                  <h3 className="text-xs font-semibold text-blue-400 mb-3">🔵 WordPress</h3>
                  <div className="space-y-2">
                    {[
                      { key: 'siteUrl', placeholder: 'https://your-blog.com' },
                      { key: 'username', placeholder: 'admin' },
                      { key: 'password', placeholder: 'application-password' },
                    ].map(f => (
                      <input key={f.key} placeholder={f.placeholder}
                        value={wpConfig[f.key as keyof typeof wpConfig]}
                        onChange={e => setWpConfig(p => ({ ...p, [f.key]: e.target.value }))}
                        type={f.key === 'password' ? 'password' : 'text'}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600" />
                    ))}
                    <button onClick={() => exportToCMS('wordpress')}
                      className="w-full px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs transition-colors">
                      Export as Draft →
                    </button>
                  </div>
                </div>

                {/* Webflow */}
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                  <h3 className="text-xs font-semibold text-purple-400 mb-3">⚡ Webflow</h3>
                  <div className="space-y-2">
                    {[
                      { key: 'apiToken', placeholder: 'Webflow API Token' },
                      { key: 'collectionId', placeholder: 'Collection ID' },
                      { key: 'siteId', placeholder: 'Site ID' },
                    ].map(f => (
                      <input key={f.key} placeholder={f.placeholder}
                        value={wfConfig[f.key as keyof typeof wfConfig]}
                        onChange={e => setWfConfig(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-600" />
                    ))}
                    <button onClick={() => exportToCMS('webflow')}
                      className="w-full px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs transition-colors">
                      Export to Webflow →
                    </button>
                  </div>
                </div>

                {/* Contentful */}
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                  <h3 className="text-xs font-semibold text-yellow-400 mb-3">🟡 Contentful</h3>
                  <div className="space-y-2">
                    {[
                      { key: 'spaceId', placeholder: 'Space ID' },
                      { key: 'accessToken', placeholder: 'Management Token' },
                      { key: 'contentTypeId', placeholder: 'Content Type ID' },
                    ].map(f => (
                      <input key={f.key} placeholder={f.placeholder}
                        value={cfConfig[f.key as keyof typeof cfConfig]}
                        onChange={e => setCfConfig(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-yellow-600" />
                    ))}
                    <button onClick={() => exportToCMS('contentful')}
                      className="w-full px-3 py-1.5 bg-yellow-700 hover:bg-yellow-600 text-white rounded text-xs transition-colors">
                      Export to Contentful →
                    </button>
                  </div>
                </div>
              </div>

              {exportStatus && (
                <div className={`text-xs px-3 py-2 rounded-lg border ${
                  exportStatus.startsWith('✅') ? 'border-emerald-700/40 bg-emerald-950/20 text-emerald-300' :
                  exportStatus.startsWith('❌') ? 'border-red-700/40 bg-red-950/20 text-red-300' :
                  'border-gray-700 bg-gray-800/50 text-gray-400'
                }`}>
                  {exportStatus}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
