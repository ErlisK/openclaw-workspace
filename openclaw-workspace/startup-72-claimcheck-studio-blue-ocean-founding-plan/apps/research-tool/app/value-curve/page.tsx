'use client'
import { useState } from 'react'

const FACTORS = [
  'Output format breadth',
  'Ease / onboarding',
  'Pricing accessibility',
  'Brand/tone customization',
  'Evidence depth (biomedical)',
  'Per-claim provenance scoring',
  'Hallucination risk mitigation',
  'Paywall / full-text access',
  'Compliance / MLR tools',
  'Audit trail',
  'Human peer review',
  'Citation bundle export',
]

const ARCHETYPES = [
  {
    id: 'ai_content',
    name: 'A. AI Content Machine',
    examples: 'Jasper, Copy.ai, Writesonic, ChatGPT',
    color: 'rgb(96, 165, 250)',
    scores: [5, 5, 4, 4, 1, 1, 1, 1, 1, 1, 1, 1],
  },
  {
    id: 'evidence_research',
    name: 'B. Evidence Research Engine',
    examples: 'Scite, Elicit, Consensus',
    color: 'rgb(167, 139, 250)',
    scores: [1, 3, 4, 1, 5, 3, 4, 3, 1, 1, 1, 2],
  },
  {
    id: 'citation_manager',
    name: 'C. Citation Manager',
    examples: 'Zotero, Paperpile, Mendeley',
    color: 'rgb(52, 211, 153)',
    scores: [1, 3, 4, 1, 3, 1, 1, 3, 1, 1, 1, 4],
  },
  {
    id: 'social_content',
    name: 'D. Social Content Tool',
    examples: 'Buffer, Hootsuite, Taplio',
    color: 'rgb(251, 191, 36)',
    scores: [4, 5, 4, 3, 1, 1, 1, 1, 1, 2, 1, 1],
  },
  {
    id: 'enterprise_mlr',
    name: 'E. Enterprise MLR / Compliance',
    examples: 'Veeva PromoMats, IQVIA OCE',
    color: 'rgb(251, 113, 133)',
    scores: [2, 1, 1, 2, 3, 3, 4, 3, 5, 5, 4, 3],
  },
  {
    id: 'claimcheck',
    name: '★ ClaimCheck Studio',
    examples: 'New value curve — unoccupied blue ocean',
    color: 'rgb(34, 211, 238)',
    scores: [4, 4, 4, 2, 5, 5, 5, 4, 4, 5, 5, 5],
    isTarget: true,
  },
]

const H = 220
const W = 900
const PADDING = { top: 20, bottom: 40, left: 20, right: 20 }
const CHART_H = H - PADDING.top - PADDING.bottom
const CHART_W = W - PADDING.left - PADDING.right

function getPath(scores: number[], highlighted: boolean) {
  const step = CHART_W / (FACTORS.length - 1)
  const points = scores.map((s, i) => {
    const x = PADDING.left + i * step
    const y = PADDING.top + CHART_H - ((s - 1) / 4) * CHART_H
    return [x, y]
  })
  const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
  return { d, points }
}

export default function ValueCurvePage() {
  const [highlighted, setHighlighted] = useState<string | null>('claimcheck')
  const [hoverFactor, setHoverFactor] = useState<number | null>(null)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">New Value Curve</h1>
        <p className="text-gray-400 text-sm mt-1">
          ClaimCheck Studio vs. 5 competitor archetypes across 12 key factors · Click a legend item to highlight
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {ARCHETYPES.map((a) => (
          <button
            key={a.id}
            onClick={() => setHighlighted(highlighted === a.id ? null : a.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-all ${
              highlighted === a.id
                ? 'border-white/30 bg-white/10 text-white'
                : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600'
            }`}
          >
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: a.color, minWidth: 12 }} />
            {a.isTarget ? <strong>{a.name}</strong> : a.name}
          </button>
        ))}
      </div>

      {/* SVG Chart */}
      <div className="rounded-xl border border-gray-800 bg-gray-950 p-4 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 600 }}>
          {/* Grid lines */}
          {[1, 2, 3, 4, 5].map((score) => {
            const y = PADDING.top + CHART_H - ((score - 1) / 4) * CHART_H
            return (
              <g key={score}>
                <line x1={PADDING.left} y1={y} x2={W - PADDING.right} y2={y} stroke="#1f2937" strokeWidth="1" />
                <text x={PADDING.left - 4} y={y + 4} fontSize="9" fill="#4b5563" textAnchor="end">{score}</text>
              </g>
            )
          })}

          {/* Factor hover zones */}
          {FACTORS.map((f, i) => {
            const step = CHART_W / (FACTORS.length - 1)
            const x = PADDING.left + i * step
            return (
              <rect
                key={i}
                x={x - step / 2}
                y={PADDING.top}
                width={step}
                height={CHART_H}
                fill={hoverFactor === i ? 'rgba(255,255,255,0.02)' : 'transparent'}
                onMouseEnter={() => setHoverFactor(i)}
                onMouseLeave={() => setHoverFactor(null)}
              />
            )
          })}

          {/* Value curves */}
          {ARCHETYPES.map((a) => {
            const isHL = highlighted === null || highlighted === a.id
            const { d, points } = getPath(a.scores, isHL)
            return (
              <g key={a.id} opacity={isHL ? 1 : 0.15}>
                <path
                  d={d}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={a.isTarget ? 3 : 1.5}
                  strokeDasharray={a.isTarget ? undefined : '4 2'}
                />
                {points.map(([x, y], i) => (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={a.isTarget ? 4 : 3}
                    fill={a.color}
                    opacity={0.9}
                  />
                ))}
              </g>
            )
          })}

          {/* Factor labels */}
          {FACTORS.map((f, i) => {
            const step = CHART_W / (FACTORS.length - 1)
            const x = PADDING.left + i * step
            return (
              <text
                key={i}
                x={x}
                y={H - 5}
                fontSize="8"
                fill={hoverFactor === i ? '#e5e7eb' : '#6b7280'}
                textAnchor="middle"
              >
                {f.length > 12 ? f.substring(0, 11) + '…' : f}
              </text>
            )
          })}
        </svg>
      </div>

      {/* Archetype descriptions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ARCHETYPES.map((a) => (
          <div
            key={a.id}
            className={`rounded-xl border p-4 cursor-pointer transition-all ${
              highlighted === a.id ? 'border-white/20 bg-gray-800/60' : 'border-gray-800 bg-gray-900 hover:border-gray-700'
            }`}
            onClick={() => setHighlighted(highlighted === a.id ? null : a.id)}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: a.color }} />
              <span className={`text-sm font-semibold ${a.isTarget ? 'text-cyan-300' : 'text-white'}`}>
                {a.name}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">{a.examples}</p>
            <div className="grid grid-cols-3 gap-1">
              {a.scores.map((s, i) => (
                <div key={i} className="text-center">
                  <div className={`text-xs font-mono ${s >= 5 ? 'text-emerald-400' : s >= 4 ? 'text-blue-400' : s >= 3 ? 'text-amber-400' : 'text-gray-600'}`}>
                    {s}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Blue Ocean insight */}
      <div className="rounded-xl border border-cyan-700/30 bg-cyan-950/20 p-5">
        <h3 className="text-sm font-semibold text-cyan-300 mb-3">The Blue Ocean Gap — Focus, Divergence, Tagline</h3>
        <div className="grid md:grid-cols-3 gap-4 text-xs">
          <div>
            <div className="font-medium text-white mb-1">✅ Focus</div>
            <p className="text-gray-400 leading-relaxed">ClaimCheck Studio does NOT try to win on everything. Deliberately reduces brand customization (2), social scheduling (handoff only), format breadth (7 formats vs 80). This focus enables the accessible price point.</p>
          </div>
          <div>
            <div className="font-medium text-white mb-1">✅ Divergence</div>
            <p className="text-gray-400 leading-relaxed">The curve shape is fundamentally different from all 5 archetypes. NOT a repositioned AI writer or a content-enabled literature tool. High scores on BOTH content ease AND evidence rigor — never seen before.</p>
          </div>
          <div>
            <div className="font-medium text-white mb-1">✅ Tagline</div>
            <p className="text-gray-400 leading-relaxed italic">"The only content studio where every claim earns its citation."</p>
            <p className="text-gray-500 mt-1">Communicates the value innovation, implies what's eliminated, and is compelling enough to make a skeptic act.</p>
          </div>
        </div>
      </div>

      {/* Competitive response scenarios */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Competitive Response Scenarios</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Scenario</th>
                <th className="text-center py-2 px-3 text-gray-500 font-medium w-24">Likelihood</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Timeline</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">ClaimCheck Response</th>
              </tr>
            </thead>
            <tbody>
              {[
                { scenario: 'Elicit adds content generation layer', likelihood: 'Medium', timeline: '12–18mo', response: 'By then, peer review network moat + compliance agent running' },
                { scenario: 'Jasper/Copy.ai adds "source citations"', likelihood: 'High', timeline: '6–12mo', response: 'Surface citations ≠ per-claim provenance scoring (PubMed/CrossRef/Scite integration is non-trivial)' },
                { scenario: 'Veeva launches SMB tier', likelihood: 'Low', timeline: '36mo+', response: 'Structural cost/sales motion makes this commercially unviable for Veeva' },
                { scenario: 'New AI entrant builds directly in this quadrant', likelihood: 'Medium', timeline: '12–24mo', response: 'First-mover + peer review network + compliance lock-in creates 18–24mo lead' },
              ].map(({ scenario, likelihood, timeline, response }, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-950/50' : ''}>
                  <td className="py-2 px-3 text-gray-300">{scenario}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${likelihood === 'High' ? 'bg-red-900/40 text-red-300' : likelihood === 'Medium' ? 'bg-amber-900/40 text-amber-300' : 'bg-green-900/40 text-green-300'}`}>
                      {likelihood}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-gray-500 font-mono">{timeline}</td>
                  <td className="py-2 px-3 text-gray-400">{response}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
