'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminTransaction } from './page'

interface Pagination { page: number; limit: number; total: number; pages: number }
interface Summary { [kind: string]: { count: number; total_cents: number } }
interface Platform {
  total_users: number
  total_credits_outstanding: number
  total_credits_held: number
  total_credits_available: number
}
interface Filters { kind: string; user_id: string; job_id: string; from: string; to: string }

const KIND_STYLES: Record<string, { label: string; icon: string; bg: string; color: string }> = {
  purchase:    { label: 'Purchase',   icon: '💳', bg: '#dcfce7', color: '#166534' },
  job_hold:    { label: 'Hold',       icon: '🔒', bg: '#fef3c7', color: '#92400e' },
  job_spend:   { label: 'Spent',      icon: '✅', bg: '#fee2e2', color: '#991b1b' },
  job_release: { label: 'Released',   icon: '🔓', bg: '#dbeafe', color: '#1e40af' },
  refund:      { label: 'Refund',     icon: '↩️', bg: '#dcfce7', color: '#166534' },
  bonus:       { label: 'Bonus',      icon: '🎁', bg: '#ede9fe', color: '#5b21b6' },
  adjustment:  { label: 'Adjustment', icon: '⚙️', bg: '#f3f4f6', color: '#374151' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function StatCard({ label, value, sub, testid }: { label: string; value: string | number; sub?: string; testid: string }) {
  return (
    <div data-testid={testid} style={{
      background: 'white', border: '1px solid #e2e8f0', borderRadius: 12,
      padding: '20px 24px',
    }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function AdminCreditsClient({
  transactions, pagination, summary, platform, filters,
}: {
  transactions: AdminTransaction[]
  pagination: Pagination
  summary: Summary
  platform: Platform
  filters: Filters
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [localFilters, setLocalFilters] = useState(filters)

  function applyFilters() {
    const params = new URLSearchParams()
    params.set('page', '1')
    if (localFilters.kind)    params.set('kind',    localFilters.kind)
    if (localFilters.user_id) params.set('user_id', localFilters.user_id)
    if (localFilters.job_id)  params.set('job_id',  localFilters.job_id)
    if (localFilters.from)    params.set('from',    localFilters.from)
    if (localFilters.to)      params.set('to',      localFilters.to)
    startTransition(() => router.push(`/admin/credits?${params}`))
  }

  function clearFilters() {
    setLocalFilters({ kind: '', user_id: '', job_id: '', from: '', to: '' })
    startTransition(() => router.push('/admin/credits'))
  }

  const inputStyle: React.CSSProperties = {
    padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 7,
    fontSize: 13, outline: 'none', background: 'white', color: '#0f172a',
    width: '100%',
  }

  const totalRevenueCents = Object.entries(summary)
    .filter(([k]) => k === 'purchase')
    .reduce((s, [, v]) => s + v.total_cents, 0)

  return (
    <div data-testid="admin-credits-page" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ background: '#0f172a', color: 'white', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            Admin
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Credit Audit</h1>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a href="/dashboard" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>← Dashboard</a>
          <a href="/billing" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>Billing</a>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>
        {/* Platform stats */}
        <div data-testid="platform-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          <StatCard label="Total Users" value={platform.total_users} testid="stat-total-users" />
          <StatCard label="Total Revenue (credits sold)" value={`${totalRevenueCents / 100}`} sub="credits purchased" testid="stat-revenue" />
          <StatCard label="Credits Outstanding" value={platform.total_credits_outstanding} sub={`${platform.total_credits_held} held`} testid="stat-outstanding" />
          <StatCard label="Total Transactions" value={pagination.total} testid="stat-tx-count" />
        </div>

        {/* Kind breakdown */}
        <div data-testid="kind-breakdown" style={{
          background: 'white', border: '1px solid #e2e8f0', borderRadius: 12,
          padding: '20px 24px', marginBottom: 24,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px', color: '#0f172a' }}>Transaction Breakdown</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {Object.entries(KIND_STYLES).map(([kind, style]) => {
              const stat = summary[kind]
              if (!stat) return null
              return (
                <div key={kind} data-testid={`breakdown-${kind}`} style={{
                  padding: '10px 16px', borderRadius: 10,
                  background: style.bg, color: style.color,
                  minWidth: 120,
                }}>
                  <div style={{ fontSize: 18, marginBottom: 2 }}>{style.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{style.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, margin: '2px 0' }}>{stat.count}</div>
                  <div style={{ fontSize: 11 }}>
                    {stat.total_cents >= 0 ? '+' : ''}{Math.round(stat.total_cents / 100)} cr
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Filters */}
        <div data-testid="filters-panel" style={{
          background: 'white', border: '1px solid #e2e8f0', borderRadius: 12,
          padding: '16px 24px', marginBottom: 20,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto auto', gap: 10, alignItems: 'end' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Kind</div>
              <select
                data-testid="filter-kind"
                value={localFilters.kind}
                onChange={e => setLocalFilters(f => ({ ...f, kind: e.target.value }))}
                style={{ ...inputStyle }}
              >
                <option value="">All kinds</option>
                {Object.entries(KIND_STYLES).map(([k, s]) => (
                  <option key={k} value={k}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>User ID</div>
              <input
                data-testid="filter-user-id"
                placeholder="uuid..."
                value={localFilters.user_id}
                onChange={e => setLocalFilters(f => ({ ...f, user_id: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Job ID</div>
              <input
                data-testid="filter-job-id"
                placeholder="uuid..."
                value={localFilters.job_id}
                onChange={e => setLocalFilters(f => ({ ...f, job_id: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>From</div>
              <input
                type="date"
                data-testid="filter-from"
                value={localFilters.from?.split('T')[0] ?? ''}
                onChange={e => setLocalFilters(f => ({ ...f, from: e.target.value ? `${e.target.value}T00:00:00Z` : '' }))}
                style={inputStyle}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>To</div>
              <input
                type="date"
                data-testid="filter-to"
                value={localFilters.to?.split('T')[0] ?? ''}
                onChange={e => setLocalFilters(f => ({ ...f, to: e.target.value ? `${e.target.value}T23:59:59Z` : '' }))}
                style={inputStyle}
              />
            </div>
            <button
              data-testid="apply-filters"
              onClick={applyFilters}
              style={{
                padding: '8px 18px', background: '#1e293b', color: 'white',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Apply
            </button>
            <button
              data-testid="clear-filters"
              onClick={clearFilters}
              style={{
                padding: '8px 14px', background: 'transparent', color: '#64748b',
                border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Transaction table */}
        <div data-testid="transactions-table" style={{
          background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 24px', borderBottom: '1px solid #f1f5f9',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              Transactions
              <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 400, color: '#64748b' }}>
                {pagination.total} total
                {filters.kind || filters.user_id || filters.job_id ? ' (filtered)' : ''}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Page {pagination.page} / {pagination.pages || 1}
            </div>
          </div>

          {transactions.length === 0 && (
            <div data-testid="empty-transactions" style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <div style={{ fontWeight: 600 }}>No transactions found</div>
              {(filters.kind || filters.user_id || filters.job_id) && (
                <div style={{ fontSize: 13, marginTop: 4 }}>Try clearing the filters</div>
              )}
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              {transactions.length > 0 && (
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Date', 'User', 'Kind', 'Credits', 'Balance After', 'Description', 'Job ID'].map(h => (
                      <th key={h} style={{
                        padding: '10px 16px', textAlign: 'left',
                        fontSize: 11, fontWeight: 700, color: '#64748b',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                        borderBottom: '1px solid #f1f5f9',
                        whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {transactions.map((tx, i) => {
                  const style = KIND_STYLES[tx.kind] ?? KIND_STYLES.adjustment
                  const credits = Math.round(tx.amount_cents / 100)
                  return (
                    <tr
                      key={tx.id}
                      data-testid="admin-tx-row"
                      data-kind={tx.kind}
                      style={{
                        borderBottom: i < transactions.length - 1 ? '1px solid #f8fafc' : 'none',
                      }}
                    >
                      <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {fmtDate(tx.created_at)}
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: 180 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tx.users?.email ?? tx.user_id.slice(0, 8)}
                        </div>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>
                          {tx.user_id.slice(0, 8)}…
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                          background: style.bg, color: style.color,
                        }}>
                          {style.icon} {style.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                        color: credits >= 0 ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap' }}>
                        {credits >= 0 ? '+' : ''}{credits}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#374151', fontVariantNumeric: 'tabular-nums' }}>
                        {tx.balance_after}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.description ?? '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>
                        {tx.job_id ? tx.job_id.slice(0, 8) + '…' : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div data-testid="pagination" style={{
              padding: '16px 24px', borderTop: '1px solid #f1f5f9',
              display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center',
            }}>
              {Array.from({ length: Math.min(pagination.pages, 10) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  data-testid={`page-btn-${p}`}
                  onClick={() => {
                    const params = new URLSearchParams()
                    params.set('page', String(p))
                    if (filters.kind)    params.set('kind',    filters.kind)
                    if (filters.user_id) params.set('user_id', filters.user_id)
                    if (filters.job_id)  params.set('job_id',  filters.job_id)
                    startTransition(() => router.push(`/admin/credits?${params}`))
                  }}
                  style={{
                    width: 36, height: 36, borderRadius: 8,
                    border: p === pagination.page ? 'none' : '1px solid #e2e8f0',
                    background: p === pagination.page ? '#1e293b' : 'white',
                    color: p === pagination.page ? 'white' : '#374151',
                    fontWeight: p === pagination.page ? 700 : 400,
                    cursor: 'pointer', fontSize: 13,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
