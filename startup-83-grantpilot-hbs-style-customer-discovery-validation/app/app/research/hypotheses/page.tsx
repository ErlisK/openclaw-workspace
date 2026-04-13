import { createAdminClient } from '@/lib/supabase'
import type { Hypothesis } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function getHypotheses(): Promise<Hypothesis[]> {
  const admin = createAdminClient()
  const { data } = await admin.from('hypotheses').select('*').order('category').order('created_at')
  return data ?? []
}

const STATUS_STYLES: Record<string, string> = {
  untested: 'bg-gray-100 text-gray-700 border-gray-300',
  validated: 'bg-green-100 text-green-700 border-green-300',
  invalidated: 'bg-red-100 text-red-700 border-red-300',
  partial: 'bg-yellow-100 text-yellow-700 border-yellow-300',
}
const CAT_STYLES: Record<string, string> = {
  customer: 'bg-purple-100 text-purple-800',
  problem: 'bg-red-100 text-red-800',
  solution: 'bg-blue-100 text-blue-800',
  channel: 'bg-green-100 text-green-800',
  revenue: 'bg-yellow-100 text-yellow-800',
}

export default async function HypothesesPage() {
  const hypotheses = await getHypotheses()
  const byCategory = hypotheses.reduce((acc, h) => {
    if (!acc[h.category]) acc[h.category] = []
    acc[h.category].push(h)
    return acc
  }, {} as Record<string, Hypothesis[]>)
  const catOrder = ['customer', 'problem', 'solution', 'channel', 'revenue']

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm">
            <a href="/" className="text-gray-500 hover:text-gray-700">GrantPilot</a>
            <span className="text-gray-300">/</span>
            <a href="/research" className="text-gray-500 hover:text-gray-700">Research</a>
            <span className="text-gray-300">/</span>
            <span className="font-medium text-gray-900">Hypotheses</span>
          </div>
        </div>
      </header>
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { href: '/research', label: 'Overview' },
              { href: '/research/personas', label: 'Personas' },
              { href: '/research/hypotheses', label: `Hypotheses (${hypotheses.length})`, active: true },
              { href: '/research/competitors', label: 'Competitors' },
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
          <h1 className="text-xl font-semibold text-gray-900">Hypotheses</h1>
          <p className="text-sm text-gray-500 mt-1">Versioned hypotheses across HBS customer discovery dimensions. All start as &ldquo;untested&rdquo; — to be validated through interviews.</p>
        </div>
        {/* Status legend */}
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(STATUS_STYLES).map(([s, cls]) => (
            <span key={s} className={`text-xs px-2 py-1 rounded border font-medium ${cls}`}>{s}</span>
          ))}
        </div>

        <div className="space-y-8">
          {catOrder.filter(c => byCategory[c]).map(cat => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2 py-1 rounded uppercase tracking-wide ${CAT_STYLES[cat]}`}>{cat}</span>
                <span className="text-xs text-gray-400">{byCategory[cat].length} hypothesis{byCategory[cat].length !== 1 ? 'es' : ''}</span>
              </div>
              <div className="space-y-3">
                {byCategory[cat].map((h, i) => (
                  <div key={h.id} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <p className="font-medium text-gray-900">{h.hypothesis}</p>
                      <div className="flex gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-400">v{h.version}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_STYLES[h.status]}`}>{h.status}</span>
                      </div>
                    </div>
                    {h.assumptions && h.assumptions.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-500 mb-1">KEY ASSUMPTIONS</p>
                        <ul className="space-y-0.5">
                          {h.assumptions.map((a, j) => (
                            <li key={j} className="text-xs text-gray-600 flex gap-1">
                              <span className="text-orange-400">◦</span>{a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {h.validation_method && (
                      <div className="bg-blue-50 rounded-lg px-3 py-2">
                        <p className="text-xs font-semibold text-blue-700 mb-0.5">VALIDATION METHOD</p>
                        <p className="text-xs text-blue-600">{h.validation_method}</p>
                      </div>
                    )}
                    {h.evidence && (
                      <div className="mt-2 bg-green-50 rounded-lg px-3 py-2">
                        <p className="text-xs font-semibold text-green-700 mb-0.5">EVIDENCE</p>
                        <p className="text-xs text-green-600">{h.evidence}</p>
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
