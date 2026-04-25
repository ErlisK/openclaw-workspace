'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

export default function CalculatorClient() {
  const [currentPrice, setCurrentPrice] = useState(29)
  const [currentSales, setCurrentSales] = useState(50)
  const [elasticity, setElasticity] = useState(-1.0)
  const [trialPrice, setTrialPrice] = useState(39)

  const results = useMemo(() => {
    const ratio = trialPrice / currentPrice
    const projectedSales = currentSales * Math.pow(ratio, elasticity)
    const currentRevenue = currentPrice * currentSales
    const projectedRevenue = trialPrice * projectedSales
    const revenueChangePct = ((projectedRevenue - currentRevenue) / currentRevenue) * 100
    const demandChangePct = ((projectedSales - currentSales) / currentSales) * 100
    const priceChangePct = ((trialPrice - currentPrice) / currentPrice) * 100
    // Break-even elasticity: (1 + ε) * log(trialPrice/currentPrice) = 0 → ε = -1.0 always makes revenue flat
    // More precisely: revenue = currentPrice * currentSales * ratio^(1+ε)
    // Revenue neutral when ratio^(1+ε) = 1 → (1+ε) * log(ratio) = 0 → ε = -1 (for ratio ≠ 1)
    const breakEvenElasticity = -1.0
    // Revenue neutral price: trial price P* where P* * Q_ref * (P*/P_ref)^ε = current_revenue
    // → (P*/P_ref)^(1+ε) = 1 → P*/P_ref = 1 → P* = P_ref (unless ε=-1)
    // More usefully: what elasticity keeps revenue flat at the trial price?
    // trialPrice * currentSales * (trialPrice/currentPrice)^ε_be = currentRevenue
    // (trialPrice/currentPrice)^(1+ε_be) = 1
    // 1+ε_be = 0 → ε_be = -1 always (standard result)
    // More useful: what minimum demand (sales) at trial price keeps revenue flat?
    const breakEvenSales = currentRevenue / trialPrice
    const breakEvenDemandDrop = ((breakEvenSales - currentSales) / currentSales) * 100

    return {
      projectedSales: Math.round(projectedSales * 10) / 10,
      projectedRevenue: Math.round(projectedRevenue * 100) / 100,
      currentRevenue: Math.round(currentRevenue * 100) / 100,
      revenueChangePct: Math.round(revenueChangePct * 10) / 10,
      demandChangePct: Math.round(demandChangePct * 10) / 10,
      priceChangePct: Math.round(priceChangePct * 10) / 10,
      breakEvenElasticity,
      breakEvenSales: Math.round(breakEvenSales * 10) / 10,
      breakEvenDemandDrop: Math.round(breakEvenDemandDrop * 10) / 10,
    }
  }, [currentPrice, currentSales, elasticity, trialPrice])

  const winColor = results.revenueChangePct >= 0 ? '#166534' : '#991b1b'
  const winBg = results.revenueChangePct >= 0 ? '#dcfce7' : '#fee2e2'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
      {/* Inputs */}
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Your Numbers</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <label>
            <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.4rem', color: '#374151' }}>Current price ($)</p>
            <input
              data-testid="input-current-price"
              type="number"
              min={1}
              step={1}
              value={currentPrice}
              onChange={e => setCurrentPrice(Number(e.target.value) || 1)}
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '1rem' }}
            />
          </label>

          <label>
            <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.4rem', color: '#374151' }}>Monthly sales (units)</p>
            <input
              data-testid="input-current-sales"
              type="number"
              min={1}
              step={1}
              value={currentSales}
              onChange={e => setCurrentSales(Number(e.target.value) || 1)}
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '1rem' }}
            />
          </label>

          <label>
            <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.4rem', color: '#374151' }}>
              Price to test ($)
            </p>
            <input
              data-testid="input-trial-price"
              type="number"
              min={1}
              step={1}
              value={trialPrice}
              onChange={e => setTrialPrice(Number(e.target.value) || 1)}
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '1rem' }}
            />
          </label>

          <label>
            <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.4rem', color: '#374151' }}>
              Estimated price elasticity: <strong>{elasticity.toFixed(1)}</strong>
            </p>
            <input
              data-testid="input-elasticity"
              type="range"
              min={-3.0}
              max={-0.5}
              step={0.1}
              value={elasticity}
              onChange={e => setElasticity(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
              <span>-3.0 (very elastic)</span>
              <span>-0.5 (inelastic)</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>
              {elasticity <= -2.0 && 'Very elastic — small price increases significantly reduce demand.'}
              {elasticity > -2.0 && elasticity <= -1.2 && 'Moderately elastic — demand is fairly price-sensitive.'}
              {elasticity > -1.2 && elasticity <= -0.8 && 'Near unit elasticity — revenue stays roughly flat with price changes.'}
              {elasticity > -0.8 && 'Inelastic — demand is not very price-sensitive; price increases help revenue.'}
            </p>
          </label>
        </div>
      </div>

      {/* Results */}
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Projected Outcome</h2>

        <div style={{ background: winBg, borderRadius: 10, padding: '1.25rem', marginBottom: '1rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: winColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Revenue change</p>
          <p data-testid="output-revenue-change" style={{ fontSize: '2.5rem', fontWeight: 800, color: winColor, margin: 0 }}>
            {results.revenueChangePct >= 0 ? '+' : ''}{results.revenueChangePct}%
          </p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <tbody>
            {[
              ['Current revenue/mo', `$${results.currentRevenue.toLocaleString()}`],
              ['Projected revenue/mo', `$${results.projectedRevenue.toLocaleString()}`],
              ['Price change', `${results.priceChangePct >= 0 ? '+' : ''}${results.priceChangePct}%`],
              ['Projected demand change', `${results.demandChangePct.toFixed(1)}%`],
              ['Projected sales/mo', `${results.projectedSales} units`],
              ['Break-even sales (revenue-neutral)', `${results.breakEvenSales} units`],
              ['Max demand drop before you lose money', `${results.breakEvenDemandDrop.toFixed(1)}%`],
            ].map(([label, val], i) => (
              <tr key={label} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                <td style={{ padding: '0.625rem 0.75rem', color: '#6b7280' }}>{label}</td>
                <td style={{ padding: '0.625rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>{val}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#eff6ff', borderRadius: 8, fontSize: '0.875rem', color: '#1e40af', lineHeight: 1.6 }}>
          <strong>In plain English:</strong> At ε = {elasticity.toFixed(1)}, a {results.priceChangePct >= 0 ? '+' : ''}{results.priceChangePct}% price change ({`$${currentPrice}`} → {`$${trialPrice}`}) would decrease demand by approximately {Math.abs(results.demandChangePct).toFixed(0)}%, leaving revenue {results.revenueChangePct >= 0 ? 'up' : 'down'} {Math.abs(results.revenueChangePct)}%. You'd need demand to drop no more than {Math.abs(results.breakEvenDemandDrop).toFixed(0)}% to break even.
        </div>

        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.75rem', lineHeight: 1.5 }}>
          This is a point estimate. Real outcomes have uncertainty — use Bayesian inference on your actual data for a full probability distribution.
        </p>
      </div>
    </div>
  )
}
