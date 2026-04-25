'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

// ── Types ──────────────────────────────────────────────────────────────────
type CohortField = 'all' | 'product_id' | 'coupon' | 'channel'

const CHANNEL_OPTIONS = ['all', 'organic', 'appsumo', 'affiliate', 'paid', 'email']
const COHORT_FIELD_LABELS: Record<CohortField, string> = {
  all: 'All transactions',
  product_id: 'By product',
  coupon: 'By coupon cohort',
  channel: 'By acquisition channel',
}

export default function CalculatorClient() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // ── Core inputs ────────────────────────────────────────────────────────
  const [currentPrice,  setCurrentPrice]  = useState(() => Number(searchParams.get('p') ?? 29))
  const [currentSales,  setCurrentSales]  = useState(() => Number(searchParams.get('s') ?? 50))
  const [elasticity,    setElasticity]    = useState(() => Number(searchParams.get('e') ?? -1.0))
  const [trialPrice,    setTrialPrice]    = useState(() => Number(searchParams.get('t') ?? 39))

  // ── Cohort toggles ─────────────────────────────────────────────────────
  const [cohortField,   setCohortField]   = useState<CohortField>(() => (searchParams.get('cf') as CohortField) ?? 'all')
  const [cohortValue,   setCohortValue]   = useState(() => searchParams.get('cv') ?? '')
  const [channelFilter, setChannelFilter] = useState(() => searchParams.get('ch') ?? 'all')
  // Cohort-specific sales multiplier (simulates segment being a fraction of total)
  const [cohortFraction, setCohortFraction] = useState(() => Number(searchParams.get('frac') ?? 1.0))

  // ── Risk guardrails ────────────────────────────────────────────────────
  // Downside cap: minimum acceptable p05 revenue change (e.g. -10 means allow up to -10%)
  const [downsideCap,   setDownsideCap]   = useState(() => Number(searchParams.get('dc') ?? -5))
  // Min confidence: minimum prob_above_current threshold before recommending
  const [minConfidence, setMinConfidence] = useState(() => Number(searchParams.get('mc') ?? 70))

  // ── UI state ───────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false)
  const [showCohortPanel, setShowCohortPanel] = useState(false)
  const [showRiskPanel, setShowRiskPanel] = useState(false)
  const [engineResult, setEngineResult] = useState<null | { action: string; confidence_label: string; why_text: string; caveats: string[] }>(null)
  const [engineLoading, setEngineLoading] = useState(false)

  // ── Sync URL ────────────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams({
      p:    String(currentPrice),
      s:    String(currentSales),
      e:    String(elasticity),
      t:    String(trialPrice),
      cf:   cohortField,
      cv:   cohortValue,
      ch:   channelFilter,
      frac: String(cohortFraction),
      dc:   String(downsideCap),
      mc:   String(minConfidence),
    })
    router.replace(`/calculator?${params.toString()}`, { scroll: false })
  }, [currentPrice, currentSales, elasticity, trialPrice, cohortField, cohortValue, channelFilter, cohortFraction, downsideCap, minConfidence, router])

  // ── Core calculation (cohort-aware) ────────────────────────────────────
  const results = useMemo(() => {
    const cp = Math.max(currentPrice, 0.01)
    // Effective sales adjust for cohort fraction (segment-specific)
    const cs = Math.max(currentSales * cohortFraction, 1)
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

    // ±0.5 elasticity uncertainty → p05/p95
    const p05Revenue = tp * cs * Math.pow(ratio, elasticity - 0.5)
    const p95Revenue = tp * cs * Math.pow(ratio, elasticity + 0.5)
    const downsideVsCurrent = ((p05Revenue - currentRevenue) / currentRevenue) * 100

    // Risk guardrail checks
    const passesDownsideCap = downsideVsCurrent >= downsideCap
    // Simulated confidence: based on projected revenue uplift relative to elasticity uncertainty
    const upliftRange = p95Revenue - p05Revenue
    const simulatedConfidence = upliftRange > 0
      ? Math.min(99, Math.round(50 + 50 * (projectedRevenue - p05Revenue) / upliftRange))
      : 50
    const passesConfidence = simulatedConfidence >= minConfidence
    const passesAllGuardrails = passesDownsideCap && passesConfidence

    // Cohort label for display
    let cohortLabel = 'All transactions'
    if (cohortField === 'channel' && channelFilter !== 'all') cohortLabel = `Channel: ${channelFilter}`
    else if (cohortField === 'coupon' && cohortValue) cohortLabel = `Coupon cohort: ${cohortValue}`
    else if (cohortField === 'product_id' && cohortValue) cohortLabel = `Product: ${cohortValue}`

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
      passesDownsideCap,
      passesConfidence,
      passesAllGuardrails,
      simulatedConfidence,
      cohortLabel,
      effectiveSales: Math.round(cs),
    }
  }, [currentPrice, currentSales, elasticity, trialPrice, cohortField, cohortValue, channelFilter, cohortFraction, downsideCap, minConfidence])

  const winColor = results.revenueChangePct >= 0 ? '#166534' : '#991b1b'
  const winBg    = results.revenueChangePct >= 0 ? '#dcfce7' : '#fee2e2'

  const copyShareLink = useCallback(() => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }, [])

  const runBayesianEngine = useCallback(async () => {
    setEngineLoading(true)
    setEngineResult(null)
    try {
      const resp = await fetch('/api/calculator/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPrice, currentSales: results.effectiveSales, elasticity, trialPrice,
          cohortField, cohortValue: cohortField === 'channel' ? channelFilter : cohortValue,
          downsideCap, minConfidence,
        }),
      })
      const data = await resp.json()
      setEngineResult(data)
    } catch {
      setEngineResult({ action: 'error', confidence_label: 'n/a', why_text: 'Engine request failed.', caveats: [] })
    } finally {
      setEngineLoading(false)
    }
  }, [currentPrice, results.effectiveSales, elasticity, trialPrice, cohortField, cohortValue, channelFilter, downsideCap, minConfidence])

  return (
    <div>
      {/* Cohort + Risk toggle bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          data-testid="btn-toggle-cohort"
          onClick={() => setShowCohortPanel(v => !v)}
          style={{
            padding: '0.4rem 0.875rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600,
            border: `1px solid ${showCohortPanel ? '#4f46e5' : '#d1d5db'}`,
            background: showCohortPanel ? '#ede9fe' : '#f9fafb', color: showCohortPanel ? '#4f46e5' : '#374151',
            cursor: 'pointer',
          }}
        >
          🎯 Cohort filter {cohortField !== 'all' ? `· ${cohortField}` : ''}
        </button>
        <button
          data-testid="btn-toggle-risk"
          onClick={() => setShowRiskPanel(v => !v)}
          style={{
            padding: '0.4rem 0.875rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600,
            border: `1px solid ${showRiskPanel ? '#dc2626' : '#d1d5db'}`,
            background: showRiskPanel ? '#fef2f2' : '#f9fafb', color: showRiskPanel ? '#dc2626' : '#374151',
            cursor: 'pointer',
          }}
        >
          🛡️ Risk guardrails · cap {downsideCap}% · conf {minConfidence}%
        </button>
        <span style={{ padding: '0.4rem 0.75rem', background: '#f0fdf4', color: '#166534', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, border: '1px solid #bbf7d0' }}>
          {results.cohortLabel}
        </span>
      </div>

      {/* Cohort panel */}
      {showCohortPanel && (
        <div data-testid="cohort-panel" style={{ padding: '1.25rem', background: '#faf5ff', borderRadius: 10, border: '1px solid #e9d5ff', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.35rem', color: '#374151' }}>Segment by</label>
            <select
              data-testid="select-cohort-field"
              value={cohortField}
              onChange={e => { setCohortField(e.target.value as CohortField); setCohortValue('') }}
              style={{ width: '100%', padding: '0.5rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', background: '#fff' }}
            >
              {(Object.entries(COHORT_FIELD_LABELS) as [CohortField, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {cohortField === 'channel' && (
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.35rem', color: '#374151' }}>Channel</label>
              <select
                data-testid="select-channel"
                value={channelFilter}
                onChange={e => setChannelFilter(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', background: '#fff' }}
              >
                {CHANNEL_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {(cohortField === 'coupon' || cohortField === 'product_id') && (
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.35rem', color: '#374151' }}>
                {cohortField === 'coupon' ? 'Coupon code / tag' : 'Product ID or name'}
              </label>
              <input
                data-testid="input-cohort-value"
                type="text"
                placeholder={cohortField === 'coupon' ? 'e.g. LAUNCH50' : 'e.g. ebook-v2'}
                value={cohortValue}
                onChange={e => setCohortValue(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>
          )}

          {cohortField !== 'all' && (
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.35rem', color: '#374151' }}>
                Cohort share of total sales: <strong>{Math.round(cohortFraction * 100)}%</strong>
              </label>
              <input
                data-testid="input-cohort-fraction"
                type="range" min={0.05} max={1.0} step={0.05} value={cohortFraction}
                onChange={e => setCohortFraction(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                Effective sales for this cohort: <strong>{results.effectiveSales} units/mo</strong>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Risk guardrails panel */}
      {showRiskPanel && (
        <div data-testid="risk-panel" style={{ padding: '1.25rem', background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.35rem', color: '#374151' }}>
              Downside cap (p05 floor): <strong>{downsideCap}%</strong>
            </label>
            <input
              data-testid="input-downside-cap"
              type="range" min={-30} max={-5} step={5} value={downsideCap}
              onChange={e => setDownsideCap(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.2rem' }}>
              <span>-30% (permissive)</span><span>-5% (strict)</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.4rem', lineHeight: 1.5 }}>
              Reject experiments where the p05 pessimistic scenario loses more than {Math.abs(downsideCap)}% of revenue.
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.35rem', color: '#374151' }}>
              Min confidence threshold: <strong>{minConfidence}%</strong>
            </label>
            <input
              data-testid="input-min-confidence"
              type="range" min={50} max={95} step={5} value={minConfidence}
              onChange={e => setMinConfidence(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.2rem' }}>
              <span>50% (exploratory)</span><span>95% (conservative)</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.4rem', lineHeight: 1.5 }}>
              Only recommend when simulated confidence that revenue improves exceeds {minConfidence}%.
            </p>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <p style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 600, marginBottom: '0.35rem' }}>Current guardrail status</p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600, background: results.passesDownsideCap ? '#dcfce7' : '#fee2e2', color: results.passesDownsideCap ? '#166534' : '#991b1b' }}>
                {results.passesDownsideCap ? '✅' : '❌'} Downside cap ({results.downsideVsCurrent}% vs {downsideCap}% limit)
              </span>
              <span style={{ padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600, background: results.passesConfidence ? '#dcfce7' : '#fee2e2', color: results.passesConfidence ? '#166534' : '#991b1b' }}>
                {results.passesConfidence ? '✅' : '❌'} Confidence ({results.simulatedConfidence}% vs {minConfidence}% threshold)
              </span>
              <span style={{ padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700, background: results.passesAllGuardrails ? '#ede9fe' : '#fef3c7', color: results.passesAllGuardrails ? '#5b21b6' : '#92400e' }}>
                {results.passesAllGuardrails ? '🟢 All guardrails pass' : '🟡 Experiment blocked'}
              </span>
            </div>
          </div>
        </div>
      )}

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
            </label>

            <button
              data-testid="btn-share"
              onClick={copyShareLink}
              style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: 6, background: '#f9fafb', cursor: 'pointer', fontSize: '0.875rem', color: '#374151', textAlign: 'left' }}
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
            {cohortField !== 'all' && (
              <p style={{ fontSize: '0.75rem', color: winColor, marginTop: '0.2rem', opacity: 0.8 }}>
                ({results.cohortLabel} · {results.effectiveSales} units)
              </p>
            )}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginBottom: '1rem' }}>
            <tbody>
              {[
                ['Price change',           `${results.priceChangePct >= 0 ? '+' : ''}${results.priceChangePct}%`],
                ['Projected demand change', `${results.demandChangePct.toFixed(1)}%`],
                ['Projected sales/mo',      `${results.projectedSales} units`],
                ['Break-even demand drop',  `${results.breakEvenDemandDrop.toFixed(1)}%`],
                ['p05 revenue (pessimistic)',`$${results.p05Revenue.toLocaleString()}`],
                ['p95 revenue (optimistic)', `$${results.p95Revenue.toLocaleString()}`],
                ['Simulated confidence',    `${results.simulatedConfidence}%`],
              ].map(([label, val], i) => (
                <tr key={label} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                  <td style={{ padding: '0.5rem 0.75rem', color: '#6b7280', fontSize: '0.8rem' }}>{label}</td>
                  <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, textAlign: 'right', fontSize: '0.875rem' }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Guardrail summary */}
          <div data-testid="guardrail-summary" style={{
            padding: '0.75rem 1rem',
            background: results.passesAllGuardrails ? '#f0fdf4' : '#fef2f2',
            borderRadius: 8, fontSize: '0.8rem',
            color: results.passesAllGuardrails ? '#166534' : '#991b1b',
            marginBottom: '1rem',
          }}>
            <strong>{results.passesAllGuardrails ? '✅ All guardrails pass' : '⚠️ Guardrail blocked'}</strong>
            {' — '}p05 downside: {results.downsideVsCurrent}% (cap: {downsideCap}%) · confidence: {results.simulatedConfidence}% (min: {minConfidence}%)
          </div>

          <div data-testid="output-explanation" style={{ padding: '0.875rem 1rem', background: '#eff6ff', borderRadius: 8, fontSize: '0.8rem', color: '#1e40af', lineHeight: 1.6 }}>
            <strong>Plain English:</strong> At ε = {elasticity.toFixed(1)}, a {results.priceChangePct >= 0 ? '+' : ''}{results.priceChangePct}% price change decreases demand ~{Math.abs(results.demandChangePct).toFixed(0)}%. Revenue goes {results.revenueChangePct >= 0 ? 'up' : 'down'} {Math.abs(results.revenueChangePct)}%.
            {cohortField !== 'all' && ` (Filtered to ${results.cohortLabel}.)`}
          </div>
        </div>
      </div>

      {/* Bayesian engine */}
      <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fafafa' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>Run the Bayesian Engine</h3>
            <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              Generates synthetic data from your inputs (with cohort + guardrail settings) and runs the real PricePilot engine.
            </p>
          </div>
          <button
            data-testid="btn-run-engine"
            onClick={runBayesianEngine}
            disabled={engineLoading}
            style={{ padding: '0.5rem 1.25rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem', opacity: engineLoading ? 0.7 : 1, flexShrink: 0 }}
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
              <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '0.5rem' }}>⚠️ {engineResult.caveats.join(' · ')}</p>
            )}
          </div>
        )}
      </div>

      <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '1rem', lineHeight: 1.5 }}>
        Results vary. This calculator uses a point estimate with ±0.5 elasticity uncertainty for p05/p95 bounds.
        PricePilot&apos;s full engine computes a proper Bayesian posterior from your transaction history.
      </p>
    </div>
  )
}
