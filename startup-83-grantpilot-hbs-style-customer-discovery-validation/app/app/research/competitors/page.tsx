import { createAdminClient } from '@/lib/supabase'
import type { Competitor } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function getCompetitors(): Promise<Competitor[]> {
  const admin = createAdminClient()
  const { data } = await admin.from('competitors').select('*').order('category')
  return data ?? []
}

export default async function CompetitorsPage() {
  const competitors = await getCompetitors()
  const byCategory = competitors.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = []
    acc[c.category].push(c)
    return acc
  }, {} as Record<string, Competitor[]>)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm">
            <a href="/" className="text-gray-500 hover:text-gray-700">GrantPilot</a>
            <span className="text-gray-300">/</span>
            <a href="/research" className="text-gray-500 hover:text-gray-700">Research</a>
            <span className="text-gray-300">/</span>
            <span className="font-medium text-gray-900">Competitors</span>
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
              { href: '/research/competitors', label: `Competitors (${competitors.length})`, active: true },
              { href: '/research/signals', label: 'Signals' },
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
          <h1 className="text-xl font-semibold text-gray-900">Competitor Landscape</h1>
          <p className="text-sm text-gray-500 mt-1">{competitors.length} products scanned. Key gap: no applicant-focused, AI-assisted, full-lifecycle tool exists.</p>
        </div>

        <div className="space-y-8">
          {Object.entries(byCategory).sort().map(([cat, comps]) => (
            <div key={cat}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{cat}</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {comps.map(c => (
                  <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <a href={c.url} target="_blank" rel="noreferrer" className="font-semibold text-gray-900 hover:text-indigo-600">{c.name} ↗</a>
                        <p className="text-xs text-gray-500">{c.target_segment}</p>
                      </div>
                      <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">{c.pricing_model}</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{c.description}</p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="font-semibold text-green-700 mb-1">✓ Strengths</p>
                        <ul className="space-y-0.5">
                          {c.strengths?.map((s, i) => <li key={i} className="text-gray-600">• {s}</li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-red-700 mb-1">✗ Weaknesses</p>
                        <ul className="space-y-0.5">
                          {c.weaknesses?.map((w, i) => <li key={i} className="text-gray-600">• {w}</li>)}
                        </ul>
                      </div>
                    </div>
                    {c.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-indigo-700 bg-indigo-50 rounded px-2 py-1">💡 {c.notes}</p>
                      </div>
                    )}
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
