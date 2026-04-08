import { supabase } from '@/lib/supabase'

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-900/50 text-red-200 border-red-600/40',
  high:     'bg-amber-900/50 text-amber-200 border-amber-600/40',
  medium:   'bg-blue-900/50 text-blue-200 border-blue-600/40',
  low:      'bg-gray-800 text-gray-400 border-gray-600/40',
}

const SEVERITY_BORDER: Record<string, string> = {
  critical: 'border-l-red-500',
  high:     'border-l-amber-500',
  medium:   'border-l-blue-500',
  low:      'border-l-gray-500',
}

const NON_CONSUMPTION = [
  { driver: 'Compliance tools too expensive for our size', freq: '7/15', response: 'Compliance tier at $499/mo vs $150k Veeva' },
  { driver: 'Legal/IT hasn\'t approved AI tools yet', freq: '5/15', response: 'Audit trail + SOC2 = compliance by design' },
  { driver: 'AI tools can\'t be trusted for health claims', freq: '6/15', response: 'Confidence scoring + evidence grounding = trusted AI' },
  { driver: 'No single tool does what I need', freq: '5/15', response: 'End-to-end pipeline eliminates fragmentation' },
  { driver: 'Manual process is slow but "good enough"', freq: '4/15', response: 'Time-to-first-value demo: 10 minutes vs 2 days' },
  { driver: 'The category doesn\'t clearly exist', freq: '3/15', response: 'Own the category: "Evidence-Grounded Content Studio"' },
]

export default async function PainPointsPage() {
  const { data: points } = await supabase
    .from('claimcheck_pain_points')
    .select('*')
    .order('rank')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Pain Points</h1>
        <p className="text-gray-400 text-sm mt-1">
          Top 10 user complaints ranked by severity and interview frequency · Evidence from G2, Capterra, Reddit, ProductHunt, LinkedIn
        </p>
      </div>

      {/* Pain point cards */}
      <div className="space-y-4">
        {points?.map((p) => (
          <div
            key={p.id}
            className={`rounded-xl border border-gray-800 border-l-4 bg-gray-900 p-5 ${SEVERITY_BORDER[p.severity] ?? 'border-l-gray-600'}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-700">#{p.rank}</span>
                <div>
                  <h3 className="font-semibold text-white text-sm">{p.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${SEVERITY_STYLES[p.severity] ?? ''}`}>
                      {p.severity}
                    </span>
                    {p.source_platform && (
                      <span className="text-xs text-gray-600">{p.source_platform}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {p.complaint_quote && (
              <blockquote className="text-sm text-gray-300 italic border-l-2 border-gray-700 pl-3 mb-3 leading-relaxed">
                &ldquo;{p.complaint_quote}&rdquo;
              </blockquote>
            )}

            <div className="grid md:grid-cols-2 gap-4 mt-3">
              {p.affected_personas?.length > 0 && (
                <div>
                  <span className="text-xs text-gray-600 uppercase tracking-wider">Affected</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {p.affected_personas.map((persona: string) => (
                      <span key={persona} className="text-xs bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded-full">
                        {persona}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {p.claimcheck_response && (
                <div>
                  <span className="text-xs text-gray-600 uppercase tracking-wider">ClaimCheck Response</span>
                  <p className="text-xs text-emerald-400 mt-1.5 leading-relaxed">→ {p.claimcheck_response}</p>
                </div>
              )}
            </div>

            {p.source_url && (
              <a
                href={p.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-600 hover:text-gray-400 mt-3 inline-block"
              >
                Source: {p.source_url} ↗
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Non-consumption */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Non-Consumption Drivers</h2>
        <p className="text-gray-500 text-sm mb-4">
          Why potential users currently use <em>no tool at all</em> — the hidden market
        </p>
        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 border-b border-gray-800">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Driver</th>
                <th className="text-center px-3 py-3 text-gray-400 font-medium w-16">Freq.</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">ClaimCheck Response</th>
              </tr>
            </thead>
            <tbody>
              {NON_CONSUMPTION.map(({ driver, freq, response }, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-950' : 'bg-gray-900/40'}>
                  <td className="px-4 py-3 text-gray-300 text-xs leading-relaxed">{driver}</td>
                  <td className="px-3 py-3 text-center text-xs font-mono text-amber-400">{freq}</td>
                  <td className="px-4 py-3 text-xs text-emerald-400 leading-relaxed">{response}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
