import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { getABTestResults, type ABTestResult } from '@/lib/ab'

function SignificanceBadge({ result }: { result: ABTestResult }) {
  if (result.significant) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25 font-medium">
        ✓ Significant (p={result.pValue})
      </span>
    )
  }
  if (result.confidence >= 85) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
        Directional ({result.confidence}% conf.)
      </span>
    )
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-500 border border-white/10">
      Inconclusive
    </span>
  )
}

function WinnerBadge({ variant, winner }: { variant: 'a' | 'b'; winner: 'a' | 'b' | 'tie' }) {
  if (winner === 'tie') return null
  if (variant !== winner) return null
  return <span className="text-[10px] text-orange-400 font-bold ml-1">← Winner</span>
}

function ConvBar({ rate, maxRate, variant, winner }: { rate: number; maxRate: number; variant: 'a' | 'b'; winner: 'a' | 'b' | 'tie' }) {
  const isWinner = variant === winner
  return (
    <div className="w-full bg-white/5 rounded-full h-2 mt-1.5">
      <div
        className={`h-2 rounded-full transition-all ${isWinner ? 'bg-orange-400' : 'bg-blue-400/50'}`}
        style={{ width: `${maxRate > 0 ? (rate / maxRate) * 100 : 0}%` }}
      />
    </div>
  )
}

function TestCard({ result }: { result: ABTestResult }) {
  const maxRate = Math.max(result.variantA.rate, result.variantB.rate)
  const testLabel = result.testName
    .replace(/_v\d+$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())

  return (
    <div className="bg-white/4 border border-white/10 rounded-2xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-base">{testLabel}</h3>
          <p className="text-xs text-gray-500 mt-0.5 font-mono">{result.testName}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">{result.sampleSize} total</span>
          <SignificanceBadge result={result} />
        </div>
      </div>

      {/* Variant comparison */}
      <div className="grid sm:grid-cols-2 gap-4">
        {(['a', 'b'] as const).map(v => {
          const vd = v === 'a' ? result.variantA : result.variantB
          const isWinner = result.winner === v
          return (
            <div
              key={v}
              className={`rounded-xl p-4 border ${
                isWinner && result.winner !== 'tie'
                  ? 'border-orange-500/30 bg-orange-500/5'
                  : 'border-white/8 bg-white/2'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  isWinner && result.winner !== 'tie' ? 'bg-orange-500/20 text-orange-400' : 'bg-white/8 text-gray-400'
                }`}>
                  Variant {v.toUpperCase()}
                  {isWinner && result.winner !== 'tie' ? ' ★' : ''}
                </span>
                <span className={`text-xl font-bold ${
                  isWinner && result.winner !== 'tie' ? 'text-orange-300' : 'text-white'
                }`}>
                  {vd.rate}%
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-2 leading-relaxed">"{vd.label}"</p>
              <ConvBar rate={vd.rate} maxRate={maxRate} variant={v} winner={result.winner} />
              <p className="text-[11px] text-gray-600 mt-1.5">{vd.conversions} / {vd.n} converted</p>
            </div>
          )
        })}
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-5 text-sm border-t border-white/5 pt-4">
        <div>
          <div className={`font-bold ${result.diffPp > 0 ? 'text-green-400' : result.diffPp < 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {result.diffPp > 0 ? '+' : ''}{result.diffPp}pp
          </div>
          <div className="text-xs text-gray-500">B vs A diff</div>
        </div>
        <div>
          <div className={`font-bold ${result.relativeLift > 0 ? 'text-green-400' : result.relativeLift < 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {result.relativeLift > 0 ? '+' : ''}{result.relativeLift}%
          </div>
          <div className="text-xs text-gray-500">Relative lift</div>
        </div>
        <div>
          <div className="font-bold text-white">z={result.zScore}</div>
          <div className="text-xs text-gray-500">Z-score</div>
        </div>
        <div>
          <div className="font-bold text-white">p={result.pValue}</div>
          <div className="text-xs text-gray-500">p-value</div>
        </div>
        <div>
          <div className="font-bold text-white">[{result.ci95.lo > 0 ? '+' : ''}{result.ci95.lo}, {result.ci95.hi > 0 ? '+' : ''}{result.ci95.hi}]pp</div>
          <div className="text-xs text-gray-500">95% CI</div>
        </div>
        <div>
          <div className="font-bold text-gray-400">{result.minNFor80pct} / variant</div>
          <div className="text-xs text-gray-500">Min n (80% power)</div>
        </div>
      </div>

      {/* Interpretation */}
      <div className={`text-xs rounded-xl px-4 py-3 border ${
        result.significant
          ? 'bg-green-500/5 border-green-500/15 text-green-300'
          : result.confidence >= 85
          ? 'bg-yellow-500/5 border-yellow-500/15 text-yellow-300'
          : 'bg-white/3 border-white/8 text-gray-500'
      }`}>
        {result.significant
          ? `✓ Variant ${result.winner.toUpperCase()} wins with statistical significance (p < 0.05). Deploy ${result.winner.toUpperCase()} as the default.`
          : result.confidence >= 85
          ? `Variant ${result.winner.toUpperCase()} shows a directional advantage (${result.confidence}% confidence). Continue running to reach significance. Need ~${Math.max(result.minNFor80pct - Math.max(result.variantA.n, result.variantB.n), 0)} more per variant.`
          : `No clear winner yet. ${result.minNFor80pct - Math.max(result.variantA.n, result.variantB.n) > 0 ? `Need ~${result.minNFor80pct} per variant (currently ${Math.max(result.variantA.n, result.variantB.n)}).` : 'Effect may be near zero.'}`
        }
      </div>
    </div>
  )
}

export default async function ABTestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const results = await getABTestResults()

  const significantTests = results.filter(r => r.significant)
  const directionalTests = results.filter(r => !r.significant && r.confidence >= 85)
  const totalAssignments = results.reduce((s, r) => s + r.sampleSize, 0)

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">A/B Tests</h1>
          <p className="text-gray-400 text-sm mt-1">
            {results.length} active tests · {totalAssignments.toLocaleString()} total assignments
          </p>
        </div>
        <div className="flex gap-3">
          {significantTests.length > 0 && (
            <span className="text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1.5 rounded-lg">
              {significantTests.length} significant result{significantTests.length > 1 ? 's' : ''}
            </span>
          )}
          {directionalTests.length > 0 && (
            <span className="text-xs bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-3 py-1.5 rounded-lg">
              {directionalTests.length} directional
            </span>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/4 border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold">{results.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Active tests</div>
        </div>
        <div className="bg-white/4 border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold">{totalAssignments}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total assignments</div>
        </div>
        <div className="bg-white/4 border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-400">{significantTests.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Significant (p&lt;0.05)</div>
        </div>
        <div className="bg-white/4 border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-yellow-400">{directionalTests.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Directional (≥85%)</div>
        </div>
      </div>

      {/* Test cards */}
      <div className="space-y-6">
        {results.map(result => (
          <TestCard key={result.testId} result={result} />
        ))}
      </div>

      {/* Sample size note */}
      <div className="text-xs text-gray-600 bg-white/2 border border-white/5 rounded-xl p-4">
        <strong className="text-gray-500">Note on sample sizes:</strong> Statistical significance at p&lt;0.05 requires approximately 1,100–1,300 visitors per variant at a 5pp minimum detectable effect. Current tests are directional but underpowered. Continue running tests to reach conclusive results.
      </div>
    </div>
  )
}
