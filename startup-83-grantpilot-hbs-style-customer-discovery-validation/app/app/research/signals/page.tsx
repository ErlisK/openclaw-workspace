import { createAdminClient } from '@/lib/supabase'
import type { ResearchItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function getSignals(): Promise<ResearchItem[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('research_items')
    .select('*')
    .order('signal_type')
    .order('created_at', { ascending: false })
  return data ?? []
}

const SIGNAL_STYLES: Record<string, string> = {
  pain_point: 'bg-red-100 text-red-700',
  opportunity: 'bg-green-100 text-green-700',
  competitor_mention: 'bg-orange-100 text-orange-700',
  persona_signal: 'bg-purple-100 text-purple-700',
}
const SENTIMENT_STYLES: Record<string, string> = {
  positive: 'text-green-600',
  negative: 'text-red-600',
  mixed: 'text-yellow-600',
  neutral: 'text-gray-500',
}

export default async function SignalsPage() {
  const signals = await getSignals()
  const byType = signals.reduce((acc, s) => {
    if (!acc[s.signal_type]) acc[s.signal_type] = []
    acc[s.signal_type].push(s)
    return acc
  }, {} as Record<string, ResearchItem[]>)
  const typeOrder = ['pain_point', 'persona_signal', 'opportunity', 'competitor_mention']

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm">
            <a href="/" className="text-gray-500 hover:text-gray-700">GrantPilot</a>
            <span className="text-gray-300">/</span>
            <a href="/research" className="text-gray-500 hover:text-gray-700">Research</a>
            <span className="text-gray-300">/</span>
            <span className="font-medium text-gray-900">Signals</span>
          </div>
        </div>
      </header>
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { href: '/research', label: 'Overview' },
              { href: '/research/personas', label: 'Personas' },
              { href: '/research/hypotheses', label: 'Hypotheses' },
              { href: '/research/competitors', label: 'Competitors' },
              { href: '/research/signals', label: `Signals (${signals.length})`, active: true },
            ].map(n => (
              <a key={n.href} href={n.href} className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${n.active ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
                {n.label}
              </a>
            ))}
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Public Signal Feed</h1>
          <p className="text-sm text-gray-500 mt-1">{signals.length} items tagged from Reddit, LinkedIn, G2, Capterra, job boards, news, and industry reports.</p>
        </div>
        {/* Type summary */}
        <div className="flex flex-wrap gap-3 mb-6">
          {Object.entries(byType).map(([type, items]) => (
            <span key={type} className={`text-sm px-3 py-1.5 rounded-full font-medium ${SIGNAL_STYLES[type] ?? 'bg-gray-100 text-gray-700'}`}>
              {type.replace('_', ' ')}: {items.length}
            </span>
          ))}
        </div>

        <div className="space-y-8">
          {typeOrder.filter(t => byType[t]).map(type => (
            <div key={type}>
              <h2 className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full uppercase tracking-wide ${SIGNAL_STYLES[type]}`}>{type.replace('_', ' ')}</span>
                <span className="text-xs text-gray-400">{byType[type].length} items</span>
              </h2>
              <div className="space-y-3">
                {byType[type].map(item => (
                  <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-400 font-medium">{item.source}</span>
                          <span className={`text-xs font-medium ${SENTIMENT_STYLES[item.sentiment] ?? ''}`}>
                            {item.sentiment === 'positive' ? '↑' : item.sentiment === 'negative' ? '↓' : '–'} {item.sentiment}
                          </span>
                        </div>
                        <a href={item.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-900 hover:text-indigo-600">
                          {item.title}
                        </a>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{item.content}</p>
                    <div className="flex flex-wrap gap-1">
                      {item.tags?.map((t, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">#{t}</span>
                      ))}
                      {item.persona_relevance?.map((pr, i) => (
                        <span key={i} className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">@{pr}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
