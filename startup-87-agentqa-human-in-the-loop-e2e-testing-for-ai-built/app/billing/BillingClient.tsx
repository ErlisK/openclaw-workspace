'use client'

import { useState, useTransition } from 'react'
import type { CreditPack } from '@/lib/stripe'

interface Transaction {
  id: string
  amount_cents: number
  balance_after: number
  kind: string
  description: string | null
  job_id: string | null
  stripe_payment_intent_id: string | null
  created_at: string
}

interface UserProfile {
  credits_balance: number
  credits_held: number
  stripe_customer_id: string | null
}

interface BillingClientProps {
  profile: UserProfile
  transactions: Transaction[]
  packs: CreditPack[]
  tierCosts: Record<string, number>
  isSuccess: boolean
  isCancelled: boolean
  sessionId: string | null
  userEmail: string
}

const KIND_STYLES: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  purchase:    { label: 'Purchase',    icon: '💳', color: '#166534', bg: '#dcfce7' },
  job_hold:    { label: 'Hold',        icon: '🔒', color: '#92400e', bg: '#fef3c7' },
  job_spend:   { label: 'Spent',       icon: '✅', color: '#991b1b', bg: '#fee2e2' },
  job_release: { label: 'Released',    icon: '🔓', color: '#1e40af', bg: '#dbeafe' },
  refund:      { label: 'Refund',      icon: '↩️', color: '#166534', bg: '#dcfce7' },
  bonus:       { label: 'Bonus',       icon: '🎁', color: '#5b21b6', bg: '#ede9fe' },
  adjustment:  { label: 'Adjustment',  icon: '⚙️', color: '#374151', bg: '#f3f4f6' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function Credits({ n, size = 'md' }: { n: number; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const fs = { sm: 14, md: 18, lg: 28, xl: 48 }[size]
  const positive = n >= 0
  return (
    <span style={{ fontSize: fs, fontWeight: 700, color: positive ? '#16a34a' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
      {positive ? '+' : ''}{n}
    </span>
  )
}

export default function BillingClient({
  profile,
  transactions,
  packs,
  tierCosts,
  isSuccess,
  isCancelled,
  userEmail,
}: BillingClientProps) {
  const available = profile.credits_balance - profile.credits_held
  const [checkoutPending, setCheckoutPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'pricing'>('overview')

  async function handleBuy(packId: string) {
    setCheckoutPending(packId)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack: packId }),
      })
      const json = await res.json()
      if (res.ok && json.url) {
        window.location.href = json.url
      } else {
        setError(json.error ?? 'Failed to start checkout. Please try again.')
        setCheckoutPending(null)
      }
    } catch {
      setError('Network error. Please try again.')
      setCheckoutPending(null)
    }
  }

  // Group transactions by month
  const grouped: Record<string, Transaction[]> = {}
  for (const tx of transactions) {
    const month = new Date(tx.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!grouped[month]) grouped[month] = []
    grouped[month].push(tx)
  }

  const purchaseTotal = transactions
    .filter(t => t.kind === 'purchase')
    .reduce((sum, t) => sum + (t.amount_cents / 100), 0)

  const spentTotal = transactions
    .filter(t => t.kind === 'job_spend')
    .reduce((sum, t) => sum + Math.abs(t.amount_cents / 100), 0)

  return (
    <div data-testid="billing-page" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '24px 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Billing</h1>
              <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>{userEmail}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['overview', 'history', 'pricing'] as const).map(tab => (
                <button
                  key={tab}
                  data-testid={`tab-${tab}`}
                  onClick={() => startTransition(() => setActiveTab(tab))}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    background: activeTab === tab ? '#1e293b' : 'transparent',
                    color: activeTab === tab ? 'white' : '#64748b',
                  }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {/* Banners */}
        {isSuccess && (
          <div data-testid="success-banner" style={{
            background: '#dcfce7', border: '1px solid #86efac', borderRadius: 10,
            padding: '14px 18px', marginBottom: 24, color: '#166534',
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div>
              <strong>Payment successful!</strong> Your credits have been added to your balance.
            </div>
          </div>
        )}

        {isCancelled && (
          <div data-testid="cancelled-banner" style={{
            background: '#fef9c3', border: '1px solid #fde047', borderRadius: 10,
            padding: '14px 18px', marginBottom: 24, color: '#854d0e',
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>Checkout was cancelled. No charges were made.</div>
          </div>
        )}

        {error && (
          <div data-testid="error-banner" style={{
            background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10,
            padding: '14px 18px', marginBottom: 24, color: '#991b1b',
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <span style={{ fontSize: 20 }}>❌</span>
            <div>{error}</div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div data-testid="tab-overview-content">
            {/* Credit balance hero */}
            <div data-testid="balance-hero" style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              borderRadius: 16, padding: 32, marginBottom: 24, color: 'white',
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24,
            }}>
              <div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Available credits</div>
                <div data-testid="balance-available" style={{ fontSize: 52, fontWeight: 900, lineHeight: 1 }}>
                  {available}
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>ready to use</div>
              </div>
              <div style={{ borderLeft: '1px solid #334155', paddingLeft: 24 }}>
                <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Total balance</div>
                <div data-testid="balance-total" style={{ fontSize: 32, fontWeight: 700 }}>
                  {profile.credits_balance}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  {profile.credits_held > 0 && (
                    <span data-testid="balance-held" style={{ color: '#fbbf24' }}>
                      {profile.credits_held} held for active jobs
                    </span>
                  )}
                  {profile.credits_held === 0 && <span>no active holds</span>}
                </div>
              </div>
              <div style={{ borderLeft: '1px solid #334155', paddingLeft: 24 }}>
                <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>Cost per tier</div>
                {Object.entries(tierCosts).map(([tier, cost]) => (
                  <div key={tier} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: '#94a3b8', textTransform: 'capitalize' }}>{tier}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{cost} cr</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 32 }}>
              {[
                { label: 'Total purchased', value: `${purchaseTotal} cr`, sub: `across ${transactions.filter(t => t.kind === 'purchase').length} purchases`, testid: 'stat-purchased' },
                { label: 'Total spent', value: `${spentTotal} cr`, sub: `on ${transactions.filter(t => t.kind === 'job_spend').length} completed tests`, testid: 'stat-spent' },
                { label: 'Tests run', value: String(transactions.filter(t => t.kind === 'job_spend').length), sub: 'jobs completed', testid: 'stat-tests' },
              ].map(stat => (
                <div key={stat.label} data-testid={stat.testid} style={{
                  background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px'
                }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{stat.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{stat.value}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{stat.sub}</div>
                </div>
              ))}
            </div>

            {/* Quick buy */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Buy Credits</h2>
                <button
                  onClick={() => setActiveTab('pricing')}
                  style={{ fontSize: 13, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  See full details →
                </button>
              </div>
              <div data-testid="packs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {packs.map(pack => (
                  <div
                    key={pack.id}
                    data-testid={`pack-card-${pack.id}`}
                    style={{
                      border: pack.badge === 'Popular' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                      borderRadius: 12, padding: 20, position: 'relative',
                      transition: 'box-shadow 0.15s',
                    }}
                  >
                    {pack.badge && (
                      <div data-testid={`pack-badge-${pack.id}`} style={{
                        position: 'absolute', top: -11, right: 14,
                        background: pack.badge === 'Best value' ? '#7c3aed' : '#3b82f6',
                        color: 'white', fontSize: 11, fontWeight: 700,
                        padding: '3px 10px', borderRadius: 999,
                      }}>
                        {pack.badge}
                      </div>
                    )}
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{pack.name}</div>
                    <div data-testid={`pack-credits-${pack.id}`} style={{ fontSize: 30, fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
                      {pack.credits}
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}> cr</span>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6', margin: '6px 0 8px' }}>
                      ${(pack.price_cents / 100).toFixed(0)}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 14 }}>{pack.description}</div>
                    <button
                      data-testid={`buy-btn-${pack.id}`}
                      onClick={() => handleBuy(pack.id)}
                      disabled={checkoutPending !== null}
                      style={{
                        width: '100%', padding: '10px 0',
                        background: pack.badge === 'Popular' ? '#3b82f6' : '#1e293b',
                        color: 'white', border: 'none', borderRadius: 8,
                        fontSize: 14, fontWeight: 600, cursor: checkoutPending ? 'wait' : 'pointer',
                        opacity: checkoutPending && checkoutPending !== pack.id ? 0.5 : 1,
                      }}
                    >
                      {checkoutPending === pack.id ? 'Redirecting…' : `Buy ${pack.name}`}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div data-testid="tab-history-content">
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Transaction History</h2>
                <span style={{ fontSize: 13, color: '#64748b' }}>{transactions.length} transactions</span>
              </div>

              {transactions.length === 0 && (
                <div data-testid="no-transactions" style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>No transactions yet</div>
                  <div style={{ fontSize: 14 }}>Buy credits to get started</div>
                </div>
              )}

              {Object.entries(grouped).map(([month, txs]) => (
                <div key={month}>
                  <div style={{
                    padding: '10px 24px', background: '#f8fafc',
                    fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'
                  }}>
                    {month}
                  </div>
                  {txs.map((tx, i) => {
                    const style = KIND_STYLES[tx.kind] ?? KIND_STYLES.adjustment
                    const credits = Math.round(tx.amount_cents / 100)
                    return (
                      <div
                        key={tx.id}
                        data-testid="transaction-row"
                        data-kind={tx.kind}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 16,
                          padding: '14px 24px',
                          borderBottom: i < txs.length - 1 ? '1px solid #f8fafc' : 'none',
                        }}
                      >
                        <div style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: style.bg, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 18, flexShrink: 0,
                        }}>
                          {style.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                            <span style={{
                              display: 'inline-block', padding: '1px 8px', borderRadius: 999,
                              fontSize: 11, fontWeight: 700, background: style.bg, color: style.color,
                              marginRight: 8,
                            }}>
                              {style.label}
                            </span>
                            {tx.description}
                          </div>
                          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                            {formatDate(tx.created_at)}
                            {tx.stripe_payment_intent_id && (
                              <span style={{ marginLeft: 8, fontFamily: 'monospace' }}>
                                {tx.stripe_payment_intent_id.slice(0, 20)}…
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <Credits n={credits} size="md" />
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                            bal: {tx.balance_after}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing Tab */}
        {activeTab === 'pricing' && (
          <div data-testid="tab-pricing-content">
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Credit Packs</h2>
              <p style={{ color: '#64748b' }}>
                Credits are held when you publish a job and spent when testing completes.
                Unused credits are released if a job expires.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 }}>
              {packs.map(pack => {
                const perCredit = (pack.price_cents / pack.credits / 100).toFixed(2)
                return (
                  <div
                    key={pack.id}
                    data-testid={`pricing-card-${pack.id}`}
                    style={{
                      background: 'white',
                      border: pack.badge === 'Popular' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                      borderRadius: 16, padding: 28, position: 'relative',
                    }}
                  >
                    {pack.badge && (
                      <div style={{
                        position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                        background: pack.badge === 'Best value' ? '#7c3aed' : '#3b82f6',
                        color: 'white', fontSize: 12, fontWeight: 700,
                        padding: '4px 16px', borderRadius: 999, whiteSpace: 'nowrap',
                      }}>
                        {pack.badge}
                      </div>
                    )}
                    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{pack.name}</div>
                    <div style={{ fontSize: 42, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                      ${(pack.price_cents / 100).toFixed(0)}
                    </div>
                    <div style={{ fontSize: 13, color: '#94a3b8', margin: '6px 0 16px' }}>
                      ${perCredit}/credit
                    </div>
                    <div style={{
                      fontSize: 28, fontWeight: 800, color: '#3b82f6',
                      padding: '12px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9',
                      marginBottom: 16, textAlign: 'center',
                    }}>
                      {pack.credits} credits
                    </div>
                    <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>{pack.description}</p>
                    <button
                      data-testid={`pricing-buy-${pack.id}`}
                      onClick={() => handleBuy(pack.id)}
                      disabled={checkoutPending !== null}
                      style={{
                        width: '100%', padding: '12px 0',
                        background: pack.badge === 'Popular' ? '#3b82f6' : '#1e293b',
                        color: 'white', border: 'none', borderRadius: 10,
                        fontSize: 15, fontWeight: 700, cursor: checkoutPending ? 'wait' : 'pointer',
                        opacity: checkoutPending && checkoutPending !== pack.id ? 0.5 : 1,
                      }}
                    >
                      {checkoutPending === pack.id ? 'Redirecting to Stripe…' : `Get ${pack.name}`}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Tier pricing table */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Credits per test tier</h3>
              </div>
              <table data-testid="tier-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Tier', 'Duration', 'Credits', 'Equiv. $'].map(h => (
                      <th key={h} style={{ padding: '12px 24px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { tier: 'Quick', duration: '~10 min', key: 'quick' },
                    { tier: 'Standard', duration: '~20 min', key: 'standard' },
                    { tier: 'Deep', duration: '~30 min', key: 'deep' },
                  ].map((row, i) => {
                    const cost = tierCosts[row.key] ?? 0
                    const usd = cost.toFixed(2)  // 1 credit = $1 USD
                    return (
                      <tr key={row.key} style={{ borderBottom: i < 2 ? '1px solid #f1f5f9' : 'none' }}>
                        <td style={{ padding: '14px 24px', fontWeight: 600 }}>{row.tier}</td>
                        <td style={{ padding: '14px 24px', color: '#64748b' }}>{row.duration}</td>
                        <td style={{ padding: '14px 24px', fontWeight: 700, color: '#3b82f6' }}>{cost} credits</td>
                        <td style={{ padding: '14px 24px', color: '#64748b' }}>~${usd}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
