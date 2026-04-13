'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Invoice {
  id: string
  number: string | null
  status: string | null
  amount_paid: number
  amount_due: number
  currency: string
  created: string
  period_start: string
  period_end: string
  hosted_invoice_url: string | null
  invoice_pdf: string | null
  description: string | null
  lines: Array<{ description: string | null; amount: number; period_start: string; period_end: string }>
}

interface Subscription {
  id: string
  status: string
  current_period_end: string
  current_period_start: string
  cancel_at_period_end: boolean
  amount: number
  interval: string
}

interface BillingData {
  invoices: Invoice[]
  subscription: Subscription | null
  customer: { id: string; email: string | null; name: string | null } | null
  entitlement: {
    tier: string
    pack_credits: number
    status: string
    current_period_end: string | null
  } | null
}

const TIER_META: Record<string, { label: string; color: string; icon: string; price: string }> = {
  free:             { label: 'Free',             color: 'bg-gray-100 text-gray-700',       icon: '🌱', price: '$0/mo' },
  deliverable_pack: { label: 'Deliverable Pack', color: 'bg-indigo-50 text-indigo-700',    icon: '📦', price: '$299/application' },
  pipeline_pro:     { label: 'Pipeline Pro',     color: 'bg-violet-50 text-violet-700',    icon: '🚀', price: '$199/mo' },
}

const STATUS_COLOR: Record<string, string> = {
  paid:   'bg-green-100 text-green-700',
  open:   'bg-yellow-100 text-yellow-700',
  void:   'bg-gray-100 text-gray-500',
  draft:  'bg-gray-100 text-gray-400',
  uncollectible: 'bg-red-100 text-red-600',
}

function formatAmount(cents: number, currency = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/billing/invoices')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Failed to load billing info'); setLoading(false) })
  }, [])

  async function openPortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      })
      const d = await res.json()
      if (d.url) window.location.href = d.url
      else setError(d.error || 'Could not open billing portal')
    } catch {
      setError('Network error')
    } finally {
      setPortalLoading(false)
    }
  }

  const tier = data?.entitlement?.tier || 'free'
  const tierMeta = TIER_META[tier] || TIER_META.free

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/dashboard" className="hover:text-indigo-600">Dashboard</Link>
            <span>›</span>
            <Link href="/settings/team" className="hover:text-indigo-600">Settings</Link>
            <span>›</span>
            <span>Billing</span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Billing & Subscription</h1>
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 font-medium"
            >
              {portalLoading ? 'Opening…' : '🔗 Manage in Stripe Portal'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="animate-pulse h-24 bg-white rounded-xl border border-gray-200" />)}
          </div>
        ) : (
          <>
            {/* Current Plan */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4 text-sm">Current Plan</h2>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${tierMeta.color}`}>
                    {tierMeta.icon} {tierMeta.label}
                  </span>
                  <span className="text-sm text-gray-500">{tierMeta.price}</span>
                  {data?.entitlement?.pack_credits ? (
                    <span className="text-sm bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                      {data.entitlement.pack_credits} credit{data.entitlement.pack_credits !== 1 ? 's' : ''} remaining
                    </span>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {tier === 'free' && (
                    <Link href="/pricing" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium">
                      Upgrade Plan →
                    </Link>
                  )}
                  {tier !== 'free' && (
                    <button onClick={openPortal} disabled={portalLoading}
                      className="text-sm border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium">
                      Change Plan
                    </button>
                  )}
                </div>
              </div>

              {/* Subscription details */}
              {data?.subscription && (
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Status', value: data.subscription.status, highlight: data.subscription.status === 'active' },
                    { label: 'Amount', value: `${formatAmount(data.subscription.amount)}/${data.subscription.interval}`, highlight: false },
                    { label: 'Current period ends', value: new Date(data.subscription.current_period_end).toLocaleDateString(), highlight: false },
                    { label: 'Auto-renew', value: data.subscription.cancel_at_period_end ? 'Off (cancels at period end)' : 'On', highlight: !data.subscription.cancel_at_period_end },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="text-xs text-gray-400 mb-0.5">{s.label}</div>
                      <div className={`text-sm font-medium capitalize ${s.highlight ? 'text-green-700' : 'text-gray-900'}`}>{s.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {tier === 'free' && !data?.subscription && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Free plan includes 3 exports/month, 10 RFP parses, and 10 AI generations.{' '}
                    <Link href="/pricing" className="text-indigo-600 hover:underline">Upgrade for unlimited access</Link>.
                  </p>
                </div>
              )}
            </div>

            {/* Usage this month */}
            <UsageSummary />

            {/* Invoice history */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 text-sm">Invoice History</h2>
                {data?.customer && (
                  <span className="text-xs text-gray-400">{data.customer.email}</span>
                )}
              </div>

              {!data?.invoices?.length ? (
                <div className="px-6 py-10 text-center text-gray-400 text-sm">
                  No invoices yet.{' '}
                  {tier === 'free' && <Link href="/pricing" className="text-indigo-500 hover:underline">Make a purchase to see invoices here.</Link>}
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {data.invoices.map(inv => (
                    <div key={inv.id} className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-sm text-gray-900">
                            {inv.number || inv.id.slice(-8)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[inv.status || ''] || 'bg-gray-100 text-gray-500'}`}>
                            {inv.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 space-x-3">
                          <span>📅 {new Date(inv.created).toLocaleDateString()}</span>
                          {inv.lines[0]?.description && (
                            <span className="truncate max-w-xs inline-block">{inv.lines[0].description}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-semibold text-sm text-gray-900">
                          {formatAmount(inv.amount_paid || inv.amount_due, inv.currency)}
                        </div>
                        <div className="flex gap-2 mt-1 justify-end">
                          {inv.hosted_invoice_url && (
                            <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-indigo-600 hover:underline">View</a>
                          )}
                          {inv.invoice_pdf && (
                            <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-indigo-600 hover:underline">PDF</a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Portal CTA */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-indigo-900 text-sm">Need to update payment method or cancel?</div>
                <p className="text-xs text-indigo-600 mt-0.5">Manage everything securely in the Stripe Customer Portal.</p>
              </div>
              <button onClick={openPortal} disabled={portalLoading}
                className="flex-shrink-0 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 font-medium">
                {portalLoading ? 'Opening…' : 'Open Portal →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Inline usage summary (reuses /api/entitlements)
function UsageSummary() {
  const [usage, setUsage] = useState<{ used: number; limit: number; label: string; event: string }[] | null>(null)

  useEffect(() => {
    fetch('/api/entitlements').then(r => r.json()).then(d => {
      setUsage([
        { label: 'Exports', event: 'export', used: d.usage?.export || 0, limit: d.limits?.exports_per_month || 3 },
        { label: 'RFP Parses', event: 'rfp_parse', used: d.usage?.rfp_parse || 0, limit: d.limits?.rfp_parse_per_month || 10 },
        { label: 'AI Generations', event: 'narrative_generate', used: d.usage?.narrative_generate || 0, limit: d.limits?.narrative_generate_per_month || 10 },
      ])
    }).catch(() => {})
  }, [])

  if (!usage) return null

  const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 text-sm mb-4">Usage — {monthName}</h2>
      <div className="grid grid-cols-3 gap-4">
        {usage.map(u => {
          const unlimited = u.limit >= 999
          const pct = unlimited ? 0 : Math.min(100, Math.round((u.used / u.limit) * 100))
          return (
            <div key={u.event} className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">{u.label}</div>
              <div className="text-2xl font-bold text-gray-900">{u.used}</div>
              <div className="text-xs text-gray-400">{unlimited ? 'unlimited' : `of ${u.limit}`}</div>
              {!unlimited && (
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                  <div className={`h-1 rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                    style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
