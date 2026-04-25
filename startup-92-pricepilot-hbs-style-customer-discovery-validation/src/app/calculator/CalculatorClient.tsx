'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

export default function CalculatorClient() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Initialize from URL query params so results are shareable
  const [currentPrice,  setCurrentPrice]  = useState(() => Number(searchParams.get('p') ?? 29))
  const [currentSales,  setCurrentSales]  = useState(() => Number(searchParams.get('s') ?? 50))
  const [elasticity,    setElasticity]    = useState(() => Number(searchParams.get('e') ?? -1.0))
  const [trialPrice,    setTrialPrice]    = useState(() => Number(searchParams.get('t') ?? 39))
  const [copied, setCopied] = useState(false)
  const [engineResult, setEngineResult] = useState<null | { action: string; confidence_label: string; why_text: string; caveats: string[] }>(null)
  const [engineLoading, setEngineLoading] = useState(false)

  // Keep URL in sync so links are shareable
  useEffect(() => {
    const params = new URLSearchParams({
      p: String(currentPrice),
      s: String(currentSales),
      e: String(elasticity),
      t: String(trialPrice),
    })
    router.replace(`/calculator?${params.toString()}`, { scroll: false })
  }, [currentPrice, currentSales, elasticity, trialPrice, router])

  const results = useMemo(() => {
    const cp = Math.max(currentPrice, 0.01)
    const cs = Math.max(currentSales, 1)
    const tp = Math.max(trialPrice, 0.01)
    const ratio = tp / cp
    const projectedSales = cs * Math.pow(ratio, elasticity)
    const currentRevenue = cp * cs
    const projectedRevenue = tp * projectedSales
    const revenueChangePct = ((projectedRevenue - currentRevenue) / currentRevenue) * 100
    const demandChangePct = ((projectedSales - cs) / cs) * 100
    const priceChangePct = ((tp - cp) / cp) * 100
    const breakEvenSales = currentRevenue / tp
    const breakEvenDemandDrop = ((breakEvenSales - cs) / cs) * 100
    // Simulate p05 and p95 (±0.5 elasticity uncertainty)
    const p05Revenue = tp * cs * Math.pow(ratio, elasticity - 0.5)
    const p95Revenue = tp * cs * Math.pow(ratio, elasticity + 0.5)
    const downsideVsCurrent = ((p05Revenue - currentRevenue) / currentRevenue) * 100
    const passesDownsideFloor = downsideVsCurrent >= -5

    return {
      projectedSales: Math.round(projectedSales * 10) / 10,
      projectedRevenue: Math.round(projectedRevenue * 100) / 100,
      currentRevenue: Math.round(currentRevenue * 100) / 100,
      revenueChangePct: Math.round(revenueChangePct * 10) / 10,
      demandChangePct: Math.round(demandChangePct * 10) / 10,
      priceChangePct: Math.round(priceChangePct * 10) / 10,
      breakEvenSales: Math.round(breakEvenSales * 10) / 10,
      breakEvenDemandDrop: Math.round(breakEvenDemandDrop * 10) / 10,
      p05Revenue: Math.round(p05Revenue * 100) / 100,
      p95Revenue: Math.round(p95Revenue * 100) / 100,
      downsideVsCurrent: Math.round(downsideVsCurrent * 10) / 10,
      passesDownsideFloor,
    }
  }, [currentPrice, currentSales, elasticity, trialPrice])

  const copyShareLink = useCallback(() => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }, [])

  // Run the actual Bayesian engine with synthetic data derived from manual inputs
  const runBayesianEngine = useCallback(async () => {
    setEngineLoading(true)
    setEngineResult(null)
    try {
      const resp = await fetch('/api/calculator/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPrice,
          currentSales,
          elasticity,
          trialPrice,
        }),
      })
      if (resp.ok) {
        setEngineResult(await resp.json())
      }
    } catch { /* non-critical */ }
    setEngineLoading(false)
  }, [currentPrice, currentSales, elasticity, trialPrice])

  const winColor = results.revenueChangePct >= 0 ? '#166534' : '#991b1b'
  const winBg    = results.revenueChangePct >= 0 ? '#dcfce7' : '#fee2e2'
  const floorColor = results.passesDownsideFloor ? '#166534' : '#991b1b'

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Inputs */}
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Your Numbers</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            <label>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.4rem', color: '#374151' }}>Current price ($)</p>
              <input
                data-testid="input-current-price"
                type="number" min={1} step={1} value={currentPrice}
                onChange={e => setCurrentPrice(Math.max(1, Number(e.target.value) || 1))}
                style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '1rem' }}
              />
            </label>

            <label>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.4rem', color: '#374151' }}>Monthly sales (units)</p>
              <input
                data-testid="input-current-sales"
                type="number" min={1} step={1} value={currentSales}
                onChange={e => setCurrentSales(Math.max(1, Number(e.target.value) || 1))}
                style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '1rem' }}
              />
            </label>

            <label>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.4rem', color: '#374151' }}>Price to test ($)</p>
              <input
                data-testid="input-trial-price"
                type="number" min={1} step={1} value={trialPrice}
                onChange={e => setTrialPrice(Math.max(1, Number(e.target.value) || 1))}
                style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '1rem' }}
              />
            </label>

            <label>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.4rem', color: '#374151' }}>
                Price elasticity: <strong>{elasticity.toFixed(1)}</strong>
              </p>
              <input
                data-testid="input-elasticity"
                type="range" min={-3.0} max={-0.5} step={0.1} value={elasticity}
                onChange={e => setElasticity(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                <span>-3.0 (very elastic)</span>
                <span>-0.5 (inelastic)</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem', lineHeight: 1.5 }}>
                {elasticity <= -2.0 && 'Very elastic — demand drops sharply with price increases.'}
                {elasticity > -2.0 && elasticity <= -1.2 && 'Moderately elastic — demand is fairly price-sensitive.'}
                {elasticity > -1.2 && elasticity <= -0.8 && 'Near unit elasticity — revenue stays roughly flat with price changes.'}
                {elasticity > -0.8 && 'Inelastic — price increases help revenue; demand barely changes.'}
              </p>
            </label>

            {/* Share link */}
            <button
              data-testid="btn-share"
              onClick={copyShareLink}
              style={{
                padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: 6,
                background: '#f9fafb', cursor: 'pointer', fontSize: '0.875rem',
                color: '#374151', textAlign: 'left',
              }}
            >
              {copied ? '✅ Copied!' : '🔗 Copy shareable link'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Projected Outcome</h2>

          <div style={{ background: winBg, borderRadius: 10, padding: '1.25rem', marginBottom: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', color: winColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Expected revenue change</p>
            <p data-testid="output-revenue-change" style={{ fontSize: '2.5rem', fontWeight: 800, color: winColor, margin: 0 }}>
              {results.revenueChangePct >= 0 ? '+' : ''}{results.revenueChangePct}%
            </p>
            <p style={{ fontSize: '0.8rem', color: winColor, marginTop: '0.25rem' }}>
              ${results.currentRevenue.toLocaleString()} → ${results.projectedRevenue.toLocaleString()}/mo
            </p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginBottom: '1rem' }}>
            <tbody>
              {[
                ['Price change',          `${results.priceChangePct >= 0 ? '+' : ''}${results.priceChangePct}%`],
                ['Projected demand change', `${results.demandChangePct.toFixed(1)}%`],
                ['Projected sales/mo',    `${results.projectedSales} units`],
                ['Break-even sales (flat revenue)', `${results.breakEvenSales} units`],
                ['Max demand drop (break-even)', `${results.breakEvenDemandDrop.toFixed(1)}%`],
                ['p05 scenario revenue',  `$${results.p05Revenue.toLocaleString()}`],
                ['p95 scenario revenue',  `$${results.p95Revenue.toLocaleString()}`],
              ].map(([label, val], i) => (
                <tr key={label} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                  <td style={{ padding: '0.5rem 0.75rem', color: '#6b7280', fontSize: '0.8rem' }}>{label}</td>
                  <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, textAlign: 'right', fontSize: '0.875rem' }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Downside floor indicator */}
          <div style={{ padding: '0.75rem 1rem', background: results.passesDownsideFloor ? '#f0fdf4' : '#fef2f2', borderRadius: 8, fontSize: '0.8rem', color: floorColor, marginBottom: '1rem' }}>
            <strong>{results.passesDownsideFloor ? '✅ Passes safety floor' : '⚠️ Fails safety floor'}</strong> — In the p05 (pessimistic) scenario, revenue would be {results.downsideVsCurrent >= 0 ? '+' : ''}{results.downsideVsCurrent}% vs current.
            {!results.passesDownsideFloor && ' PricePilot would not recommend this test — downside exceeds 5%.'}
          </div>

          <div data-testid="output-explanation" style={{ padding: '0.875rem 1rem', background: '#eff6ff', borderRadius: 8, fontSize: '0.8rem', color: '#1e40af', lineHeight: 1.6 }}>
            <strong>Plain English:</strong> At ε = {elasticity.toFixed(1)}, a {results.priceChangePct >= 0 ? '+' : ''}{results.priceChangePct}% price change (${currentPrice} → ${trialPrice}) decreases demand by ~{Math.abs(results.demandChangePct).toFixed(0)}%. Revenue goes {results.revenueChangePct >= 0 ? 'up' : 'down'} {Math.abs(results.revenueChangePct)}%. You need demand to drop no more than {Math.abs(results.breakEvenDemandDrop).toFixed(0)}% to break even.
          </div>
        </div>
      </div>

      {/* Bayesian engine section */}
      <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fafafa' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>Run the Bayesian Engine on These Inputs</h3>
            <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              Generates a synthetic dataset from your inputs and runs the same engine PricePilot uses internally.
            </p>
          </div>
          <button
            data-testid="btn-run-engine"
            onClick={runBayesianEngine}
            disabled={engineLoading}
            style={{
              padding: '0.5rem 1.25rem', background: '#4f46e5', color: '#fff',
              border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer',
              fontSize: '0.875rem', opacity: engineLoading ? 0.7 : 1, flexShrink: 0,
            }}
          >
            {engineLoading ? 'Running…' : 'Run engine →'}
          </button>
        </div>

        {engineResult && (
          <div data-testid="engine-result" style={{ padding: '1rem', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
            <p style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 700 }}>Action: </span>
              <span style={{
                background: engineResult.action === 'test_higher' ? '#dcfce7' : engineResult.action === 'stable' ? '#fef3c7' : '#f3f4f6',
                color: engineResult.action === 'test_higher' ? '#166534' : engineResult.action === 'stable' ? '#92400e' : '#6b7280',
                padding: '0.15rem 0.5rem', borderRadius: 4, fontWeight: 600, fontSize: '0.8rem',
              }}>{engineResult.action}</span>
            </p>
            <p style={{ marginBottom: '0.5rem' }}><strong>Confidence:</strong> {engineResult.confidence_label}</p>
            <p style={{ color: '#4b5563', lineHeight: 1.6 }}>{engineResult.why_text}</p>
            {engineResult.caveats.length > 0 && (
              <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                ⚠️ {engineResult.caveats.join(' · ')}
              </p>
            )}
          </div>
        )}
      </div>

      <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '1rem', lineHeight: 1.5 }}>
        This calculator uses a point estimate. Real outcomes have uncertainty. PricePilot&apos;s full engine computes a posterior distribution from your actual transaction history — giving you p05/p50/p95 outcomes calibrated to your specific buyers.
      </p>
    </div>
  )
}
