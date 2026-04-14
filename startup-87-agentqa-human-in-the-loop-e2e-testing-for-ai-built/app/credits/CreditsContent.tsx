'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface CreditPack {
  id: string
  name: string
  credits: number
  price_cents: number
  description: string
  badge?: string
}

interface Transaction {
  id: string
  amount: number
  balance_after: number
  kind: string
  description: string | null
  created_at: string
  job_id: string | null
}

interface CreditsData {
  balance: number
  held: number
  available: number
  transactions: Transaction[]
  packs: CreditPack[]
  tier_costs: Record<string, number>
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function kindLabel(kind: string) {
  const labels: Record<string, string> = {
    purchase: '💳 Purchase',
    job_hold: '🔒 Hold',
    job_spend: '✅ Spent',
    job_release: '🔓 Release',
    refund: '↩️ Refund',
    bonus: '🎁 Bonus',
    adjustment: '⚙️ Adjustment',
  }
  return labels[kind] ?? kind
}

export default function CreditsContent() {
  const params = useSearchParams()
  const success = params.get('success') === '1'
  const cancelled = params.get('cancelled') === '1'

  const [data, setData] = useState<CreditsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/credits')
    if (res.ok) {
      setData(await res.json())
    } else if (res.status === 401) {
      setError('Please sign in to view your credits.')
    } else {
      setError('Failed to load credits.')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function startCheckout(packId: string) {
    setCheckoutLoading(packId)
    setError(null)
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pack: packId }),
    })
    const json = await res.json()
    if (res.ok && json.url) {
      window.location.href = json.url
    } else {
      setError(json.error ?? 'Failed to start checkout.')
      setCheckoutLoading(null)
    }
  }

  return (
    <div data-testid="credits-page" style={{ maxWidth: 720, margin: '40px auto', padding: '0 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Credits</h1>
      <p style={{ color: '#64748b', marginBottom: 32 }}>
        Buy credits to publish test jobs. Credits are held when you publish and spent when the test completes.
      </p>

      {success && (
        <div data-testid="success-banner" style={{
          background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8,
          padding: '12px 16px', marginBottom: 24, color: '#166534'
        }}>
          ✅ Payment successful! Your credits have been added to your balance.
        </div>
      )}

      {cancelled && (
        <div data-testid="cancelled-banner" style={{
          background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8,
          padding: '12px 16px', marginBottom: 24, color: '#854d0e'
        }}>
          ⚠️ Checkout was cancelled. No charges were made.
        </div>
      )}

      {error && (
        <div data-testid="error-banner" style={{
          background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8,
          padding: '12px 16px', marginBottom: 24, color: '#991b1b'
        }}>
          {error}
        </div>
      )}

      {loading && (
        <div data-testid="credits-loading" style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
          Loading…
        </div>
      )}

      {!loading && data && (
        <>
          {/* Balance card */}
          <div data-testid="balance-card" style={{
            background: '#1e293b', color: 'white', borderRadius: 12,
            padding: 24, marginBottom: 32
          }}>
            <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 4 }}>Available credits</div>
            <div data-testid="balance-available" style={{ fontSize: 48, fontWeight: 800, marginBottom: 16 }}>
              {data.available}
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Total balance</div>
                <div data-testid="balance-total" style={{ fontSize: 20, fontWeight: 600 }}>{data.balance}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Held for active jobs</div>
                <div data-testid="balance-held" style={{ fontSize: 20, fontWeight: 600, color: '#fbbf24' }}>{data.held}</div>
              </div>
            </div>
            {data.tier_costs && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #334155' }}>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Cost per test tier</div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {Object.entries(data.tier_costs).map(([tier, cost]) => (
                    <span key={tier} style={{ fontSize: 13, color: '#cbd5e1' }}>
                      {tier.charAt(0).toUpperCase() + tier.slice(1)}: <strong>{cost} credits</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Credit packs */}
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Buy Credits</h2>
          <div data-testid="packs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 40 }}>
            {data.packs.map(pack => (
              <div key={pack.id} data-testid={`pack-${pack.id}`} style={{
                border: pack.badge === 'Popular' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                borderRadius: 12, padding: 20, position: 'relative', background: 'white'
              }}>
                {pack.badge && (
                  <div data-testid={`pack-${pack.id}-badge`} style={{
                    position: 'absolute', top: -10, right: 16,
                    background: pack.badge === 'Best value' ? '#7c3aed' : '#3b82f6',
                    color: 'white', fontSize: 11, fontWeight: 700,
                    padding: '2px 10px', borderRadius: 999
                  }}>
                    {pack.badge}
                  </div>
                )}
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{pack.name}</div>
                <div data-testid={`pack-${pack.id}-credits`} style={{ fontSize: 32, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>
                  {pack.credits} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>credits</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6', marginBottom: 8 }}>
                  {formatCents(pack.price_cents)}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>{pack.description}</div>
                <button
                  data-testid={`buy-${pack.id}`}
                  onClick={() => startCheckout(pack.id)}
                  disabled={checkoutLoading !== null}
                  style={{
                    width: '100%', padding: '10px 0', background: '#3b82f6', color: 'white',
                    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                    cursor: checkoutLoading ? 'wait' : 'pointer',
                    opacity: checkoutLoading && checkoutLoading !== pack.id ? 0.5 : 1,
                  }}
                >
                  {checkoutLoading === pack.id ? 'Redirecting…' : `Buy ${pack.name}`}
                </button>
              </div>
            ))}
          </div>

          {/* Transaction history */}
          {data.transactions.length > 0 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Transaction History</h2>
              <div data-testid="transactions-list" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                {data.transactions.map((tx, i) => (
                  <div
                    key={tx.id}
                    data-testid="transaction-row"
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 16px',
                      borderBottom: i < data.transactions.length - 1 ? '1px solid #f1f5f9' : 'none',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{kindLabel(tx.kind)}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{tx.description}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: 16, fontWeight: 700,
                        color: tx.amount > 0 ? '#16a34a' : '#dc2626'
                      }}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>bal: {tx.balance_after}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.transactions.length === 0 && (
            <div data-testid="no-transactions" style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>
              No transactions yet. Buy credits to get started!
            </div>
          )}
        </>
      )}
    </div>
  )
}
