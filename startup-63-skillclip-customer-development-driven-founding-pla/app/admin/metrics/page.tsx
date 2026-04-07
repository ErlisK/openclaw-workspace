'use client'

import { useEffect, useState } from 'react'

type Metrics = {
  platform: Record<string, number>
  revenue: Record<string, any>
  quality: Record<string, any>
  distribution: { plans: Record<string, number> }
  success_criteria: Record<string, any>
}

const MetricCard = ({ label, value, sub, met }: { label: string; value: string | number; sub?: string; met?: boolean }) => (
  <div className={`bg-white rounded-xl border-2 p-5 ${met === true ? 'border-green-400' : met === false ? 'border-red-300' : 'border-gray-200'}`}>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    <div className="text-gray-500 text-sm mt-0.5">{label}</div>
    {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    {met !== undefined && (
      <div className={`text-xs font-medium mt-2 ${met ? 'text-green-600' : 'text-red-500'}`}>
        {met ? '✓ Target met' : '✗ Below target'}
      </div>
    )}
  </div>
)

export default function AdminMetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin').then(r => r.json()).then(d => { setMetrics(d); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500">Loading metrics…</div>
    </div>
  )

  if (!metrics) return null

  const { platform, revenue, quality, distribution, success_criteria: sc } = metrics

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">CertClip MVP — Platform Dashboard</h1>
            <p className="text-gray-500 mt-1">Phase 3 · Customer Validation A · Single-Region Pilot</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-700">${revenue.total_dollars}</div>
            <div className="text-gray-500 text-sm">Total Revenue</div>
          </div>
        </div>

        {/* Success Criteria */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">✅ Phase 3 Success Criteria</h2>
          <div className="grid grid-cols-3 gap-4">
            <MetricCard
              label="Total Clip Uploads" value={sc.clips_actual}
              sub={`Target: ≥${sc.clips_target}`} met={sc.clips_met}
            />
            <MetricCard
              label="Mentor-Reviewed Clips" value={sc.reviews_actual}
              sub={`Target: ≥${sc.reviews_target} completed reviews`} met={sc.reviews_met}
            />
            <MetricCard
              label="Live Verifications" value={sc.verifications_actual}
              sub={`Target: ≥${sc.verifications_target} completed`} met={sc.verifications_met}
            />
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">💳 Revenue</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-gray-900">${revenue.total_dollars}</div>
              <div className="text-gray-500 text-sm">Total Collected</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-700">${revenue.mrr_dollars}</div>
              <div className="text-gray-500 text-sm">Monthly Recurring</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-700">${(revenue.assessment_cents / 100).toFixed(2)}</div>
              <div className="text-gray-500 text-sm">Assessment/Verification Rev</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-700">{Object.keys(distribution.plans).length}</div>
              <div className="text-gray-500 text-sm">Paying Orgs</div>
            </div>
          </div>

          {/* Plan distribution */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-2">Plan distribution:</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(distribution.plans).map(([plan, count]) => (
                <span key={plan} className="bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full border border-blue-200 font-medium">
                  {plan}: {count} org{count > 1 ? 's' : ''}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Platform health */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard label="Total Clips" value={platform.total_clips} sub="All trades, all regions" />
          <MetricCard label="Reviewed Clips" value={platform.reviewed_clips} sub={`${Math.round((platform.reviewed_clips / (platform.total_clips || 1)) * 100)}% review rate`} />
          <MetricCard label="Total Badges" value={platform.total_badges} sub="Issued to wallets" />
          <MetricCard label="Avg Review Rating" value={`${quality.avg_review_rating}/5`} sub={`${quality.review_sample_size} reviews`} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard label="Tradesperson Profiles" value={platform.total_profiles} sub="Registered users" />
          <MetricCard label="Employer Orgs" value={platform.total_orgs} sub="Organizations onboarded" />
          <MetricCard label="Pending Clips" value={platform.pending_clips} sub="Awaiting review" />
          <MetricCard label="Completed Verifications" value={platform.completed_verifications} sub="Live sessions done" />
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: '/admin/queue', label: '📋 Review Queue', desc: 'Assign mentor reviews' },
            { href: '/search', label: '🔍 Portfolio Search', desc: 'Employer portfolio browse' },
            { href: '/verify', label: '📅 Schedule Verification', desc: 'Book live sessions' },
            { href: '/issue-badge', label: '🏅 Issue Badge', desc: 'Mentor badge issuance' },
            { href: '/wallet', label: '💼 Credential Wallet', desc: 'Tradesperson wallet' },
            { href: '/pricing', label: '💳 Pricing Page', desc: 'Plan selection + LOI' },
            { href: '/upload', label: '⬆️ Upload Clip', label2: 'Tradesperson upload', desc: 'Upload work sample' },
            { href: '/org/onboarding', label: '🏢 Org Onboarding', desc: 'Employer setup flow' },
          ].map(({ href, label, desc }) => (
            <a key={href} href={href}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all">
              <div className="font-medium text-gray-800 text-sm mb-1">{label}</div>
              <div className="text-gray-400 text-xs">{desc}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
