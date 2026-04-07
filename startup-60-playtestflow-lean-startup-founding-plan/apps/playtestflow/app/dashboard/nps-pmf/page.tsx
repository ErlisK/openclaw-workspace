import { createClient, createServiceClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface NPSRow {
  id: string
  nps_score: number
  reason: string | null
  created_at: string
}

interface PMFRow {
  id: string
  disappointment: string
  main_benefit: string | null
  benefit_to: string | null
  improvement: string | null
  created_at: string
}

function ScoreCircle({ score, label, sub, color }: { score: number | string; label: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white/4 border border-white/10 rounded-xl p-5 text-center">
      <div className={`text-3xl font-black mb-0.5 ${color ?? 'text-white'}`}>{score}</div>
      <div className="text-xs font-medium text-gray-400">{label}</div>
      {sub && <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>}
    </div>
  )
}

function NPSBar({ promoters, passives, detractors, total }: { promoters: number; passives: number; detractors: number; total: number }) {
  const pPct = total > 0 ? (promoters / total) * 100 : 0
  const aPct = total > 0 ? (passives / total) * 100 : 0
  const dPct = total > 0 ? (detractors / total) * 100 : 0
  return (
    <div>
      <div className="flex rounded-full overflow-hidden h-3 gap-0.5 mb-2">
        <div className="bg-green-400" style={{ width: `${pPct}%` }} title={`Promoters: ${promoters}`} />
        <div className="bg-yellow-400" style={{ width: `${aPct}%` }} title={`Passives: ${passives}`} />
        <div className="bg-red-400" style={{ width: `${dPct}%` }} title={`Detractors: ${detractors}`} />
      </div>
      <div className="flex gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />Promoters {promoters} ({pPct.toFixed(0)}%)</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />Passives {passives} ({aPct.toFixed(0)}%)</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />Detractors {detractors} ({dPct.toFixed(0)}%)</span>
      </div>
    </div>
  )
}

function PMFBar({ very, somewhat, not, total }: { very: number; somewhat: number; not: number; total: number }) {
  const vPct = total > 0 ? (very / total) * 100 : 0
  const sPct = total > 0 ? (somewhat / total) * 100 : 0
  const nPct = total > 0 ? (not / total) * 100 : 0
  return (
    <div>
      <div className="flex rounded-full overflow-hidden h-3 gap-0.5 mb-2">
        <div className="bg-orange-400" style={{ width: `${vPct}%` }} />
        <div className="bg-yellow-400/70" style={{ width: `${sPct}%` }} />
        <div className="bg-white/20" style={{ width: `${nPct}%` }} />
      </div>
      <div className="flex gap-4 text-xs text-gray-400 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />Very disappointed {very} ({vPct.toFixed(0)}%)</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70 inline-block" />Somewhat {somewhat} ({sPct.toFixed(0)}%)</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-white/20 inline-block" />Not disappointed {not} ({nPct.toFixed(0)}%)</span>
      </div>
    </div>
  )
}

export default async function NPSPMFPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const svc = createServiceClient()

  // NPS data
  const { data: npsRows } = await svc
    .from('nps_responses')
    .select('id, nps_score, reason, created_at')
    .order('created_at', { ascending: false })

  const npsData = (npsRows ?? []) as NPSRow[]
  const npsTotal = npsData.length
  const promoters = npsData.filter(r => r.nps_score >= 9).length
  const passives = npsData.filter(r => r.nps_score >= 7 && r.nps_score <= 8).length
  const detractors = npsData.filter(r => r.nps_score <= 6).length
  const npsScore = npsTotal > 0 ? Math.round(((promoters - detractors) / npsTotal) * 100) : 0
  const avgNPS = npsTotal > 0 ? (npsData.reduce((s, r) => s + r.nps_score, 0) / npsTotal).toFixed(1) : '—'
  const npsColor = npsScore >= 50 ? 'text-green-400' : npsScore >= 30 ? 'text-yellow-400' : 'text-red-400'

  // PMF data
  const { data: pmfRows } = await svc
    .from('pmf_responses')
    .select('id, disappointment, main_benefit, benefit_to, improvement, created_at')
    .order('created_at', { ascending: false })

  const pmfData = (pmfRows ?? []) as PMFRow[]
  const pmfTotal = pmfData.length
  const very = pmfData.filter(r => r.disappointment === 'very_disappointed').length
  const somewhat = pmfData.filter(r => r.disappointment === 'somewhat_disappointed').length
  const notDisapp = pmfData.filter(r => r.disappointment === 'not_disappointed').length
  const pmfPct = pmfTotal > 0 ? Math.round((very / pmfTotal) * 100) : 0
  const pmfColor = pmfPct >= 40 ? 'text-green-400' : pmfPct >= 30 ? 'text-yellow-400' : 'text-red-400'

  // Open-text quotes (NPS reasons)
  const promoterQuotes = npsData.filter(r => r.nps_score >= 9 && r.reason).slice(0, 4)
  const detractorQuotes = npsData.filter(r => r.nps_score <= 6 && r.reason).slice(0, 3)
  const benefitQuotes = pmfData.filter(r => r.main_benefit).slice(0, 5)
  const improvements = pmfData.filter(r => r.improvement).slice(0, 6)

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">NPS & PMF Surveys</h1>
          <p className="text-gray-400 text-sm mt-1">{npsTotal} NPS · {pmfTotal} PMF · Designer cohort</p>
        </div>
        <div className="flex gap-2">
          <Link href="/survey/nps" className="text-xs px-4 py-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/15 transition-colors">
            Take NPS Survey →
          </Link>
          <Link href="/survey/pmf" className="text-xs px-4 py-2 bg-white/5 border border-white/10 text-gray-300 rounded-lg hover:bg-white/8 transition-colors">
            Take PMF Survey →
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ScoreCircle score={npsScore} label="NPS Score" sub={`Target ≥30 ${npsScore >= 30 ? '✓' : '✗'}`} color={npsColor} />
        <ScoreCircle score={`${pmfPct}%`} label="Very Disappointed" sub={`Target ≥30% ${pmfPct >= 30 ? '✓' : '✗'}`} color={pmfColor} />
        <ScoreCircle score={avgNPS} label="Avg NPS Score" sub={`n=${npsTotal} responses`} />
        <ScoreCircle score={`${promoters}/${npsTotal}`} label="NPS Promoters" sub="Score 9–10" color="text-green-400" />
      </div>

      {/* NPS breakdown */}
      <div className="bg-white/4 border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-bold">NPS Breakdown</h2>
          <div className={`text-2xl font-black ${npsColor}`}>
            NPS {npsScore >= 0 ? `+${npsScore}` : npsScore}
          </div>
        </div>
        <NPSBar promoters={promoters} passives={passives} detractors={detractors} total={npsTotal} />

        <div className="grid grid-cols-11 gap-1 mt-3">
          {Array.from({ length: 11 }, (_, i) => {
            const count = npsData.filter(r => r.nps_score === i).length
            const maxCount = Math.max(...Array.from({ length: 11 }, (_, j) => npsData.filter(r => r.nps_score === j).length), 1)
            const heightPct = (count / maxCount) * 100
            const color = i >= 9 ? 'bg-green-400' : i >= 7 ? 'bg-yellow-400' : 'bg-red-400'
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="h-10 w-full flex items-end">
                  <div className={`w-full rounded-sm ${color} opacity-80`} style={{ height: `${heightPct}%`, minHeight: count > 0 ? '4px' : '0' }} />
                </div>
                <div className="text-[10px] text-gray-600">{i}</div>
                <div className="text-[10px] text-gray-400">{count > 0 ? count : ''}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* PMF breakdown */}
      <div className="bg-white/4 border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-bold">Product-Market Fit</h2>
            <p className="text-xs text-gray-500 mt-0.5">"How would you feel if you could no longer use PlaytestFlow?"</p>
          </div>
          <div className={`text-2xl font-black ${pmfColor}`}>
            {pmfPct}% <span className="text-sm font-normal text-gray-400">very disappointed</span>
          </div>
        </div>
        <PMFBar very={very} somewhat={somewhat} not={notDisapp} total={pmfTotal} />
        {pmfPct >= 40 && (
          <div className="bg-green-500/8 border border-green-500/15 rounded-xl px-4 py-3 text-sm text-green-300">
            ✓ Strong PMF signal — {pmfPct}% of designers would be "very disappointed" without PlaytestFlow. Target threshold for PMF is 40%.
          </div>
        )}
        {pmfPct >= 30 && pmfPct < 40 && (
          <div className="bg-yellow-500/8 border border-yellow-500/15 rounded-xl px-4 py-3 text-sm text-yellow-300">
            Directional PMF signal ({pmfPct}%). You've passed the Superhuman threshold (40%+ not yet reached). Continue building and gathering responses.
          </div>
        )}
      </div>

      {/* Qualitative: NPS promoter quotes */}
      {promoterQuotes.length > 0 && (
        <div className="bg-white/4 border border-white/10 rounded-2xl p-6">
          <h2 className="font-bold mb-4 text-green-300">Promoter Voices (score 9–10)</h2>
          <div className="space-y-3">
            {promoterQuotes.map(r => (
              <div key={r.id} className="flex gap-3 items-start">
                <span className="text-green-400 text-lg mt-0.5">★</span>
                <div>
                  <p className="text-sm text-gray-200 leading-relaxed">"{r.reason}"</p>
                  <p className="text-[11px] text-gray-600 mt-1">Score: {r.nps_score} · {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Qualitative: PMF main benefits */}
      {benefitQuotes.length > 0 && (
        <div className="bg-white/4 border border-white/10 rounded-2xl p-6">
          <h2 className="font-bold mb-4">Main Benefits (PMF open text)</h2>
          <div className="space-y-2">
            {benefitQuotes.map(r => (
              <div key={r.id} className="flex gap-3 items-start">
                <span className="text-orange-400">→</span>
                <p className="text-sm text-gray-300">"{r.main_benefit}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top improvements */}
      {improvements.length > 0 && (
        <div className="bg-white/4 border border-white/10 rounded-2xl p-6">
          <h2 className="font-bold mb-4">Top Improvement Requests</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {improvements.map((r, i) => (
              <div key={r.id} className="bg-white/3 rounded-xl px-4 py-3 text-sm text-gray-300 flex gap-2">
                <span className="text-gray-600">{i + 1}.</span>
                <span>"{r.improvement}"</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detractor voices */}
      {detractorQuotes.length > 0 && (
        <div className="bg-white/4 border border-red-500/10 rounded-2xl p-6">
          <h2 className="font-bold mb-4 text-red-300">Detractor Feedback (score ≤6)</h2>
          <div className="space-y-3">
            {detractorQuotes.map(r => (
              <div key={r.id} className="flex gap-3 items-start">
                <span className="text-red-400 text-lg mt-0.5">✕</span>
                <div>
                  <p className="text-sm text-gray-300">"{r.reason}"</p>
                  <p className="text-[11px] text-gray-600 mt-1">Score: {r.nps_score}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Benchmark context */}
      <div className="text-xs text-gray-600 bg-white/2 border border-white/5 rounded-xl p-4 space-y-1">
        <div className="font-medium text-gray-500 mb-2">Benchmark Context</div>
        <div>NPS: B2B SaaS median ≈ +30. Early-stage products typically 0–30. Above 50 = exceptional.</div>
        <div>PMF: Superhuman threshold = 40% "very disappointed". Sean Ellis (surveyed 100+ startups).</div>
        <div>Strong early-stage signal: NPS {npsScore >= 30 ? '✓' : '✗'} (≥30) | PMF {pmfPct >= 30 ? '✓' : '✗'} (≥30%)</div>
      </div>
    </div>
  )
}
