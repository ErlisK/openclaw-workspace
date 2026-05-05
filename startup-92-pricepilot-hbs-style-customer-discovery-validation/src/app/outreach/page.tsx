import Link from 'next/link'
import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

export const metadata: Metadata = {
  title: 'Outreach Dashboard — PricingSim',
  description: 'Backlink outreach campaign tracker. 50 targets across blogs, newsletters, and directories.',
}
export const dynamic = 'force-dynamic'

interface OutreachTarget {
  id: string
  site_name: string
  site_url: string
  contact_name: string | null
  contact_email: string | null
  category: string
  relevance_reason: string
  suggested_guide: string
  suggested_url: string
  status: string
  email_subject: string | null
  sent_at: string | null
  replied_at: string | null
  notes: string | null
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:   { bg: '#f3f4f6', color: '#6b7280' },
  drafted:   { bg: '#fef3c7', color: '#92400e' },
  ready:     { bg: '#dbeafe', color: '#1e40af' },
  sent:      { bg: '#dcfce7', color: '#166534' },
  replied:   { bg: '#f0fdf4', color: '#15803d' },
  declined:  { bg: '#fee2e2', color: '#991b1b' },
  backlinked:{ bg: '#ede9fe', color: '#5b21b6' },
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.pending
  return (
    <span style={{ background: c.bg, color: c.color, padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>
      {status}
    </span>
  )
}

export default async function OutreachPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: targets } = await supabase
    .from('outreach_targets')
    .select('*')
    .order('category')
    .returns<OutreachTarget[]>()

  const all = targets ?? []

  const counts = all.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1; return acc
  }, {})

  const categories = [...new Set(all.map(t => t.category))].sort()

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <Link href="/" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem' }}>← PricingSim</Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0 0' }}>Backlink Outreach Dashboard</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a href="/api/outreach/status" target="_blank" style={{ padding: '0.4rem 0.875rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.8rem', textDecoration: 'none', color: '#374151' }}>
            API Status
          </a>
        </div>
      </div>

      {/* Status summary */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {[
          { label: 'Total', value: all.length, bg: '#f9fafb', color: '#374151' },
          { label: 'Pending', value: counts.pending ?? 0, bg: '#f3f4f6', color: '#6b7280' },
          { label: 'Drafted', value: counts.drafted ?? 0, bg: '#fef3c7', color: '#92400e' },
          { label: 'Sent', value: counts.sent ?? 0, bg: '#dcfce7', color: '#166534' },
          { label: 'Replied', value: counts.replied ?? 0, bg: '#f0fdf4', color: '#15803d' },
          { label: 'Backlinked', value: counts.backlinked ?? 0, bg: '#ede9fe', color: '#5b21b6' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '0.875rem 1.25rem', minWidth: 90, textAlign: 'center', border: '1px solid rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0.1rem 0 0' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* API instructions */}
      <div style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', fontSize: '0.875rem' }}>
        <p style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#166534' }}>Automation Endpoints</p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontFamily: 'monospace', fontSize: '0.8rem', color: '#374151' }}>
          <span><strong>Draft batch:</strong> POST /api/outreach/draft {`{"batch":true,"limit":10}`}</span>
          <span><strong>Send batch:</strong> POST /api/outreach/send {`{"batch":true,"limit":5}`}</span>
          <span><strong>Status:</strong> GET /api/outreach/status</span>
        </div>
      </div>

      {/* Targets table grouped by category */}
      {categories.map(cat => {
        const catTargets = all.filter(t => t.category === cat)
        return (
          <section key={cat} style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#374151', textTransform: 'capitalize' }}>
              {cat} ({catTargets.length})
            </h2>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '0.6rem 0.875rem', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>Site</th>
                    <th style={{ padding: '0.6rem 0.875rem', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>Contact</th>
                    <th style={{ padding: '0.6rem 0.875rem', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>Guide</th>
                    <th style={{ padding: '0.6rem 0.875rem', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>Status</th>
                    <th style={{ padding: '0.6rem 0.875rem', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>Subject</th>
                  </tr>
                </thead>
                <tbody>
                  {catTargets.map((t, i) => (
                    <tr key={t.id} style={{ borderBottom: i < catTargets.length - 1 ? '1px solid #f3f4f6' : 'none', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '0.6rem 0.875rem' }}>
                        <a href={t.site_url} target="_blank" rel="noopener" style={{ color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
                          {t.site_name}
                        </a>
                      </td>
                      <td style={{ padding: '0.6rem 0.875rem', color: '#6b7280' }}>
                        {t.contact_name ?? '—'}
                        {t.contact_email && <span style={{ display: 'block', color: '#9ca3af', fontSize: '0.75rem' }}>{t.contact_email}</span>}
                      </td>
                      <td style={{ padding: '0.6rem 0.875rem' }}>
                        <a href={t.suggested_url} target="_blank" rel="noopener" style={{ color: '#6b7280', fontSize: '0.75rem', textDecoration: 'none' }}>
                          {t.suggested_guide?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </a>
                      </td>
                      <td style={{ padding: '0.6rem 0.875rem' }}>
                        <StatusBadge status={t.status} />
                        {t.sent_at && <span style={{ display: 'block', color: '#9ca3af', fontSize: '0.7rem', marginTop: '0.2rem' }}>{new Date(t.sent_at).toLocaleDateString()}</span>}
                      </td>
                      <td style={{ padding: '0.6rem 0.875rem', color: '#6b7280', maxWidth: 220 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.email_subject ?? <em style={{ color: '#d1d5db' }}>not drafted</em>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </main>
  )
}
