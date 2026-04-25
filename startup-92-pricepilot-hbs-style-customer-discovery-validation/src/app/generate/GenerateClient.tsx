'use client'

import { useState } from 'react'

type Pattern = 'steady' | 'growth' | 'launch_decay' | 'seasonal' | 'appsumo' | 'volatile'

const PATTERN_INFO: Record<Pattern, { label: string; desc: string; icon: string }> = {
  steady:       { label: 'Steady',        desc: 'Flat sales with random noise — good baseline', icon: '📊' },
  growth:       { label: 'Growth',        desc: 'Gradual MoM increase — typical growing product', icon: '📈' },
  launch_decay: { label: 'Launch + Decay',desc: '3× spike at launch, decay to steady state', icon: '🚀' },
  seasonal:     { label: 'Seasonal',      desc: 'Q4 peak, summer trough — planners & tools', icon: '🍂' },
  appsumo:      { label: 'AppSumo Deal',  desc: 'Large spike cohort, discounted, mid-history', icon: '⚡' },
  volatile:     { label: 'Volatile',      desc: 'High variance — consulting, premium 1:1', icon: '🌪️' },
}

const SCENARIOS = [
  { key: 'indie_template_pack', label: 'Notion Template Pack ($29, growth)' },
  { key: 'micro_saas_starter',  label: 'MicroSaaS Starter Kit ($49, steady)' },
  { key: 'appsumo_deal',        label: 'DataExport Pro ($97, AppSumo)' },
  { key: 'ebook_launch_decay',  label: 'Pricing Ebook ($19, launch decay)' },
  { key: 'saas_seasonal',       label: 'Year Planner Tool ($12, seasonal)' },
  { key: 'volatile_consulting', label: 'Strategy Session ($299, volatile)' },
]

interface GenResult {
  success?: boolean
  dry_run?: boolean
  product_name: string
  product_id?: string
  n_transactions: number
  n_months: number
  pattern: string
  price_schedule: Array<{ price: number; starts_month: number }>
  cohorts: Record<string, string | number>
  next_step?: string
  sample?: Array<{
    purchased_at: string
    amount_cents: number
    metadata: Record<string, string>
    is_spike_cohort: boolean
  }>
}

export default function GenerateDataPage() {
  const [mode, setMode] = useState<'scenario' | 'custom'>('scenario')
  const [scenario, setScenario] = useState('indie_template_pack')

  // Custom mode fields
  const [productName, setProductName] = useState('My Product')
  const [basePrice, setBasePrice] = useState(29)
  const [monthlySales, setMonthlySales] = useState(50)
  const [elasticity, setElasticity] = useState(-1.0)
  const [nMonths, setNMonths] = useState(12)
  const [priceChanges, setPriceChanges] = useState(2)
  const [noiseSd, setNoiseSd] = useState(0.15)
  const [pattern, setPattern] = useState<Pattern>('steady')
  const [coupon, setCoupon] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(20)

  const [dryRun, setDryRun] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GenResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const body = mode === 'scenario'
        ? { scenario, dry_run: dryRun }
        : {
            product_name: productName,
            base_price: basePrice,
            monthly_sales: monthlySales,
            elasticity,
            n_months: nMonths,
            price_changes: priceChanges,
            noise_sd: noiseSd,
            pattern,
            cohorts: {
              channel: 'organic',
              ...(coupon ? { coupon, coupon_discount_pct: couponDiscount / 100 } : {}),
            },
            dry_run: dryRun,
          }

      const resp = await fetch('/api/generate-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!resp.ok) {
        const err = await resp.json()
        setError(err.error ?? `HTTP ${resp.status}`)
      } else {
        setResult(await resp.json())
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const label = (s: string) => ({
    fontWeight: 600, fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: '0.3rem',
  })
  const input = {
    width: '100%', padding: '0.5rem 0.65rem', border: '1px solid #d1d5db',
    borderRadius: 6, fontSize: '0.875rem', boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>🧪 Synthetic Data Generator</h1>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Generate realistic transaction histories for demos, engine testing, or Playwright fixtures.
        Supports 6 demand patterns, coupon cohorts, multi-channel splits, and AppSumo spikes.
      </p>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {(['scenario', 'custom'] as const).map(m => (
          <button
            key={m}
            data-testid={`mode-${m}`}
            onClick={() => setMode(m)}
            style={{
              padding: '0.4rem 1rem', borderRadius: 6, fontWeight: 600, fontSize: '0.8rem',
              border: `1px solid ${mode === m ? '#4f46e5' : '#d1d5db'}`,
              background: mode === m ? '#ede9fe' : '#f9fafb',
              color: mode === m ? '#4f46e5' : '#374151', cursor: 'pointer',
            }}
          >
            {m === 'scenario' ? '📦 Pre-built scenario' : '⚙️ Custom config'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left: config form */}
        <div>
          {mode === 'scenario' ? (
            <div>
              <label style={label('')}>Choose scenario</label>
              <select
                data-testid="select-scenario"
                value={scenario}
                onChange={e => setScenario(e.target.value)}
                style={input}
              >
                {SCENARIOS.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
              <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.5rem', lineHeight: 1.6 }}>
                Pre-built scenarios include realistic price schedules, channel splits, and coupon cohorts.
                Perfect for demos and engine validation.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={label('')}>Product name</label>
                <input data-testid="input-product-name" style={input} type="text" value={productName} onChange={e => setProductName(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={label('')}>Base price ($)</label>
                  <input data-testid="input-base-price" style={input} type="number" min={1} value={basePrice} onChange={e => setBasePrice(Number(e.target.value))} />
                </div>
                <div>
                  <label style={label('')}>Monthly sales</label>
                  <input data-testid="input-monthly-sales" style={input} type="number" min={1} value={monthlySales} onChange={e => setMonthlySales(Number(e.target.value))} />
                </div>
                <div>
                  <label style={label('')}>Months of history</label>
                  <input data-testid="input-n-months" style={input} type="number" min={3} max={24} value={nMonths} onChange={e => setNMonths(Number(e.target.value))} />
                </div>
                <div>
                  <label style={label('')}>Price changes</label>
                  <input data-testid="input-price-changes" style={input} type="number" min={0} max={4} value={priceChanges} onChange={e => setPriceChanges(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label style={label('')}>Elasticity: {elasticity.toFixed(1)}</label>
                <input data-testid="input-elasticity" type="range" min={-3} max={-0.5} step={0.1} value={elasticity} onChange={e => setElasticity(Number(e.target.value))} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={label('')}>Noise SD: {noiseSd.toFixed(2)}</label>
                <input data-testid="input-noise-sd" type="range" min={0} max={0.5} step={0.05} value={noiseSd} onChange={e => setNoiseSd(Number(e.target.value))} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={label('')}>Demand pattern</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                  {(Object.entries(PATTERN_INFO) as [Pattern, { label: string; desc: string; icon: string }][]).map(([key, info]) => (
                    <button
                      key={key}
                      data-testid={`pattern-${key}`}
                      onClick={() => setPattern(key)}
                      style={{
                        padding: '0.5rem', borderRadius: 6, fontSize: '0.75rem', textAlign: 'left',
                        border: `1px solid ${pattern === key ? '#4f46e5' : '#e5e7eb'}`,
                        background: pattern === key ? '#ede9fe' : '#f9fafb', cursor: 'pointer',
                        color: pattern === key ? '#4f46e5' : '#374151',
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>{info.icon} {info.label}</span>
                      <br />
                      <span style={{ color: '#9ca3af', fontSize: '0.7rem' }}>{info.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={label('')}>Coupon code (optional)</label>
                <input data-testid="input-coupon" style={input} type="text" placeholder="e.g. LAUNCH20" value={coupon} onChange={e => setCoupon(e.target.value)} />
              </div>
              {coupon && (
                <div>
                  <label style={label('')}>Coupon discount: {couponDiscount}%</label>
                  <input type="range" min={5} max={60} step={5} value={couponDiscount} onChange={e => setCouponDiscount(Number(e.target.value))} style={{ width: '100%' }} />
                </div>
              )}
            </div>
          )}

          {/* Dry-run toggle */}
          <div style={{ marginTop: '1.25rem', padding: '0.875rem', background: dryRun ? '#fef3c7' : '#dcfce7', borderRadius: 8, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              id="dry-run-toggle"
              data-testid="toggle-dry-run"
              type="checkbox"
              checked={dryRun}
              onChange={e => setDryRun(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <label htmlFor="dry-run-toggle" style={{ fontSize: '0.85rem', cursor: 'pointer', color: dryRun ? '#92400e' : '#166534', fontWeight: 600 }}>
              {dryRun ? '🔍 Dry run — preview only, no DB writes' : '💾 Live mode — will insert transactions'}
            </label>
          </div>

          <button
            data-testid="btn-generate"
            onClick={run}
            disabled={loading}
            style={{
              marginTop: '1rem', width: '100%', padding: '0.75rem', background: '#4f46e5', color: '#fff',
              border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Generating…' : dryRun ? '🔍 Preview data' : '🚀 Generate & insert'}
          </button>
        </div>

        {/* Right: result */}
        <div>
          {error && (
            <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: '0.875rem', marginBottom: '1rem' }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {result && (
            <div data-testid="gen-result">
              <div style={{ padding: '1.25rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, marginBottom: '1rem' }}>
                <p style={{ fontWeight: 800, fontSize: '1.1rem', color: '#166534', margin: 0 }}>
                  {result.dry_run ? '🔍 Preview' : '✅ Generated'}: {result.n_transactions.toLocaleString()} transactions
                </p>
                <p style={{ color: '#4b7c59', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  {result.product_name} · {result.n_months} months · pattern: {result.pattern}
                </p>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>Price schedule</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left', color: '#6b7280' }}>Starts month</th>
                      <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: '#6b7280' }}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.price_schedule.map((p, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '0.4rem 0.6rem' }}>Month {p.starts_month + 1}</td>
                        <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 700 }}>${p.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {result.sample && result.sample.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>Sample transactions</h3>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', background: '#1e1e1e', color: '#d4d4d4', padding: '0.875rem', borderRadius: 8, overflowX: 'auto', maxHeight: 200, overflowY: 'auto' }}>
                    {result.sample.map((t, i) => (
                      <div key={i} style={{ marginBottom: '0.4rem', borderBottom: '1px solid #333', paddingBottom: '0.4rem' }}>
                        <span style={{ color: '#9cdcfe' }}>{new Date(t.purchased_at).toLocaleDateString()}</span>
                        {' · '}
                        <span style={{ color: '#4ec9b0' }}>${(t.amount_cents / 100).toFixed(2)}</span>
                        {' · '}
                        <span style={{ color: '#ce9178' }}>{t.metadata.channel ?? 'organic'}</span>
                        {t.metadata.coupon && t.metadata.coupon !== 'none' && (
                          <span style={{ color: '#dcdcaa' }}> · coupon:{t.metadata.coupon}</span>
                        )}
                        {t.is_spike_cohort && (
                          <span style={{ color: '#f44747' }}> · SPIKE</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!result.dry_run && result.next_step && (
                <a
                  href={result.next_step}
                  style={{ display: 'block', marginTop: '1rem', padding: '0.6rem 1rem', background: '#4f46e5', color: '#fff', borderRadius: 8, textAlign: 'center', textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem' }}
                >
                  Run Bayesian engine →
                </a>
              )}
            </div>
          )}

          {!result && !loading && (
            <div style={{ padding: '2rem', background: '#f9fafb', borderRadius: 10, border: '2px dashed #e5e7eb', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
              <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>🧪</p>
              <p>Click &quot;Preview data&quot; to see a sample of the generated transactions before committing them to the database.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
