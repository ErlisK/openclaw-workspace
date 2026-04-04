'use client'
/**
 * /admin/payments — Stripe Payments Dashboard
 *
 * Shows:
 *   - Revenue stats (total, 7d, by price tier)
 *   - Active subscriptions
 *   - Order history with status
 *   - Stripe environment status (test/live)
 *   - Setup guide for Stripe configuration
 */
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Stats {
  totalOrders:         number
  paidOrders:          number
  activeSubscriptions: number
  totalRevenueCents:   number
  totalRevenueUsd:     string
  conversionRate:      string
  recent7dCount:       number
  recent7dRevenue:     number
  priceBreakdown:      Record<string, { count: number; revenueCents: number }>
}

interface Order {
  id:               string
  stripe_session_id: string | null
  price_id:         string
  amount_cents:     number
  status:           string
  receipt_sent:     boolean
  receipt_email:    string | null
  country:          string | null
  tax_amount_cents: number
  created_at:       string
  paid_at:          string | null
  metadata:         { fake_door?: boolean; test_mode?: boolean }
}

const STATUS_COLORS: Record<string, string> = {
  paid:     'bg-green-100 text-green-700',
  pending:  'bg-yellow-100 text-yellow-700',
  failed:   'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-600',
  disputed: 'bg-orange-100 text-orange-700',
}

const PRICE_LABELS: Record<string, string> = {
  per_book_699:  '$6.99 / book',
  per_book_999:  '$9.99 / book',
  per_book_1299: '$12.99 / book',
  subscription:  '$7.99 / mo',
}

function ts(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function PaymentsDashboard() {
  const [stats,   setStats]   = useState<Stats | null>(null)
  const [orders,  setOrders]  = useState<Order[]>([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<'overview' | 'orders' | 'setup'>('overview')
  const [stripeStatus, setStripeStatus] = useState<'unknown' | 'configured' | 'not_configured'>('unknown')

  const load = useCallback(async () => {
    setLoading(true)
    const [statsRes, ordersRes, stripeRes] = await Promise.all([
      fetch('/api/admin/payments?view=stats'),
      fetch('/api/admin/payments?view=orders&limit=50'),
      fetch('/api/v1/checkout', { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: 'per_book_999', sessionId: 'health-check' }),
      }),
    ])
    if (statsRes.ok)  setStats(await statsRes.json() as Stats)
    if (ordersRes.ok) {
      const d = await ordersRes.json() as { orders: Order[]; total: number }
      setOrders(d.orders ?? [])
      setTotal(d.total ?? 0)
    }
    // Check if Stripe is configured based on response
    if (stripeRes.ok) {
      const d = await stripeRes.json() as { fakeDoor?: boolean; url?: string }
      setStripeStatus(d.fakeDoor ? 'not_configured' : 'configured')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const testCheckout = async () => {
    const r = await fetch('/api/v1/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId: 'per_book_999', sessionId: 'test-session' }),
    })
    const d = await r.json() as { url?: string; fakeDoor?: boolean; error?: string }
    if (d.url) window.open(d.url, '_blank')
    else if (d.error) alert(`Error: ${d.error}`)
    else alert(d.fakeDoor ? 'Fake-door mode: no Stripe key configured' : JSON.stringify(d))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-700 text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/admin" className="text-green-300 hover:text-white text-sm">← Admin</Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">💳 Payments Dashboard</h1>
            <p className="text-green-200 text-xs mt-0.5">
              Stripe checkout · per-book + subscription · test-mode ready · receipts via Agentmail
            </p>
          </div>
          <div className={`text-xs px-3 py-1.5 rounded-full font-semibold ${
            stripeStatus === 'configured' ? 'bg-green-600 text-white' :
            stripeStatus === 'not_configured' ? 'bg-red-600 text-white' :
            'bg-gray-600 text-white'
          }`}>
            Stripe: {stripeStatus === 'configured' ? '✓ Active' : stripeStatus === 'not_configured' ? '✗ Not configured' : '…'}
          </div>
          <button onClick={load} className="text-sm border border-green-500 px-3 py-1.5 rounded-lg hover:bg-green-600">
            ↻ Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto mt-3 flex gap-1">
          {(['overview', 'orders', 'setup'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
                tab === t ? 'bg-white/20 text-white' : 'text-green-200 hover:text-white hover:bg-green-600'
              }`}>
              {t === 'overview' ? '📊 Overview' : t === 'orders' ? '📋 Orders' : '⚙️ Setup Guide'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">

        {/* ── OVERVIEW ──────────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Stats cards */}
            {loading ? (
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-24"/>
                ))}
              </div>
            ) : stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total revenue', value: `$${stats.totalRevenueUsd}`, color: 'text-green-700' },
                  { label: 'Paid orders',   value: stats.paidOrders, color: 'text-blue-700' },
                  { label: 'Active subs',   value: stats.activeSubscriptions, color: 'text-violet-700' },
                  { label: 'Conversion rate', value: stats.conversionRate, color: 'text-orange-700' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 7-day highlight */}
            {stats && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-bold text-gray-800 mb-3">Last 7 days</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-2xl font-extrabold text-gray-800">{stats.recent7dCount}</p>
                    <p className="text-xs text-gray-500">Checkout sessions</p>
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-green-700">${stats.recent7dRevenue.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Revenue</p>
                  </div>
                </div>
              </div>
            )}

            {/* Revenue by price tier */}
            {stats?.priceBreakdown && Object.keys(stats.priceBreakdown).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-bold text-gray-800 mb-3">Revenue by price tier</h2>
                <div className="space-y-2">
                  {Object.entries(stats.priceBreakdown).map(([pid, data]) => (
                    <div key={pid} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-32">{PRICE_LABELS[pid] ?? pid}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="h-2 bg-green-500 rounded-full"
                          style={{ width: `${(data.count / stats.paidOrders) * 100}%` }}/>
                      </div>
                      <span className="text-xs font-bold text-gray-700 w-8 text-right">{data.count}</span>
                      <span className="text-xs text-green-700 w-16 text-right">
                        ${(data.revenueCents / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-3">Quick actions</h2>
              <div className="flex gap-2 flex-wrap">
                <button onClick={testCheckout}
                  className="text-sm bg-violet-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-violet-700 transition-colors">
                  🧪 Test checkout (per_book_999)
                </button>
                <a href="https://dashboard.stripe.com/test/payments" target="_blank" rel="noreferrer"
                  className="text-sm border border-gray-200 text-gray-600 font-semibold px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                  Stripe Dashboard ↗
                </a>
                <a href="https://dashboard.stripe.com/test/webhooks" target="_blank" rel="noreferrer"
                  className="text-sm border border-gray-200 text-gray-600 font-semibold px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                  Webhooks ↗
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ── ORDERS ────────────────────────────────────────────────────────── */}
        {tab === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{total} total orders</p>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <p className="text-3xl mb-2">💳</p>
                <p className="font-bold text-gray-700">No orders yet</p>
                <p className="text-sm text-gray-400">Orders will appear here once Stripe is configured and the first checkout completes.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Date', 'Price', 'Amount', 'Status', 'Receipt', 'Country', 'Session'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500">{ts(o.created_at)}</td>
                        <td className="px-3 py-2 text-gray-700">{PRICE_LABELS[o.price_id] ?? o.price_id}</td>
                        <td className="px-3 py-2 font-bold text-gray-800">
                          ${(o.amount_cents / 100).toFixed(2)}
                          {o.tax_amount_cents > 0 && (
                            <span className="text-gray-400 font-normal"> +${(o.tax_amount_cents/100).toFixed(2)} tax</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full font-bold ${STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {o.status}
                          </span>
                          {o.metadata?.fake_door && (
                            <span className="ml-1 text-gray-400 text-xs">(fake-door)</span>
                          )}
                          {o.metadata?.test_mode && (
                            <span className="ml-1 text-amber-600 text-xs">test</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {o.receipt_sent ? <span className="text-green-600">✓ sent</span> : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-2 text-gray-500">{o.country ?? '—'}</td>
                        <td className="px-3 py-2 font-mono text-gray-400">
                          {o.stripe_session_id?.slice(-8).toUpperCase() ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── SETUP GUIDE ───────────────────────────────────────────────────── */}
        {tab === 'setup' && (
          <div className="max-w-3xl space-y-6">
            {/* Stripe status */}
            <div className={`rounded-2xl p-5 border ${
              stripeStatus === 'configured' ? 'bg-green-50 border-green-200' :
              'bg-amber-50 border-amber-200'
            }`}>
              <h2 className={`font-bold mb-2 ${stripeStatus === 'configured' ? 'text-green-800' : 'text-amber-800'}`}>
                {stripeStatus === 'configured' ? '✅ Stripe is configured' : '⚠️ Stripe not yet configured'}
              </h2>
              <p className={`text-sm ${stripeStatus === 'configured' ? 'text-green-700' : 'text-amber-700'}`}>
                {stripeStatus === 'configured'
                  ? 'Checkout sessions are being created with real Stripe API. Test with card 4242 4242 4242 4242.'
                  : 'Currently using fake-door mode. All checkout clicks are tracked but no real payments process. Follow the setup guide below to enable Stripe.'
                }
              </p>
            </div>

            {/* Setup steps */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="font-bold text-gray-800">Stripe Setup Guide (Test Mode)</h2>
              {[
                {
                  step: '1',
                  title: 'Create Stripe account',
                  body: 'Visit https://dashboard.stripe.com/register and create a free account with scide-founder@agentmail.to (or your production email).',
                },
                {
                  step: '2',
                  title: 'Get test API keys',
                  body: 'Stripe Dashboard → Developers → API keys → Reveal test key. Copy the sk_test_... key.',
                },
                {
                  step: '3',
                  title: 'Set Vercel environment variables',
                  body: `Set these in Vercel Dashboard → kidcoloring-research → Settings → Environment Variables:
• STRIPE_SECRET_KEY = sk_test_...
• STRIPE_PUBLISHABLE_KEY = pk_test_...`,
                },
                {
                  step: '4',
                  title: 'Set up webhook',
                  body: `Stripe Dashboard → Developers → Webhooks → Add endpoint:
URL: https://kidcoloring-research.vercel.app/api/v1/checkout/webhook
Events: checkout.session.completed, payment_intent.payment_failed, customer.subscription.updated, customer.subscription.deleted
Copy the whsec_... secret → STRIPE_WEBHOOK_SECRET Vercel env var`,
                },
                {
                  step: '5',
                  title: 'Enable Stripe Tax (optional)',
                  body: 'Stripe Dashboard → Tax → Overview → Activate Stripe Tax. Set STRIPE_TAX_RATE_ID if using explicit rates.',
                },
                {
                  step: '6',
                  title: 'Test a payment',
                  body: 'Click "Test checkout" in the Overview tab. Use test card 4242 4242 4242 4242, any future date, any CVC. Verify order appears in Orders tab.',
                },
                {
                  step: '7',
                  title: 'Go live',
                  body: 'Replace sk_test_... with sk_live_... in Vercel. Update webhook to use live events. Enable in Stripe Dashboard.',
                },
              ].map(s => (
                <div key={s.step} className="flex gap-3">
                  <div className="w-7 h-7 bg-green-100 text-green-700 font-extrabold rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                    {s.step}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{s.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-line">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Test cards */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-3">Stripe Test Cards</h2>
              <div className="space-y-2 font-mono text-xs">
                {[
                  { card: '4242 4242 4242 4242', label: '✅ Success' },
                  { card: '4000 0000 0000 0002', label: '❌ Always declined' },
                  { card: '4000 0027 6000 3184', label: '🔐 3D Secure required' },
                  { card: '4000 0025 6000 0001', label: '🌍 International' },
                  { card: '4000 0000 0000 9995', label: '💰 Insufficient funds' },
                ].map(t => (
                  <div key={t.card} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">{t.card}</span>
                    <span className="text-gray-500">—</span>
                    <span className="text-gray-600">{t.label}</span>
                    <span className="text-gray-400 ml-auto">Any future date / any CVC</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Env vars reference */}
            <div className="bg-gray-900 text-green-400 rounded-2xl p-5 font-mono text-xs">
              <p className="text-gray-400 mb-3"># Required Vercel environment variables</p>
              <p>STRIPE_SECRET_KEY=sk_test_...</p>
              <p>STRIPE_PUBLISHABLE_KEY=pk_test_...</p>
              <p>STRIPE_WEBHOOK_SECRET=whsec_...</p>
              <p className="text-gray-600 mt-2"># Optional — pre-created price IDs</p>
              <p className="text-gray-500">STRIPE_PRICE_PER_BOOK_699=price_...</p>
              <p className="text-gray-500">STRIPE_PRICE_PER_BOOK_999=price_...</p>
              <p className="text-gray-500">STRIPE_PRICE_PER_BOOK_1299=price_...</p>
              <p className="text-gray-500">STRIPE_PRICE_SUBSCRIPTION=price_...</p>
              <p className="text-gray-500">STRIPE_TAX_RATE_ID=txr_... (optional)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
