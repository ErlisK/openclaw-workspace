'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import GuidedTour, { useTourState } from '@/components/GuidedTour'
import UsageMeter from '@/components/UsageMeter'
import OnboardingChecklist from '@/components/OnboardingChecklist'
import GrantPilotChat from '@/components/GrantPilotChat'

interface Application {
  id: string; title: string; status: string; deadline: string | null
  funder_name: string | null; ask_amount_usd: number | null; created_at: string
}

interface Props {
  firstName: string
  org: Record<string, unknown> | null
  members: unknown[]
  applications: Application[]
  showWelcome: boolean
  completedChecklistItems?: string[]
}

const STATUS_COLORS: Record<string, string> = {
  draft:        'bg-gray-100 text-gray-700',
  drafting:     'bg-gray-100 text-gray-700',
  in_review:    'bg-blue-100 text-blue-700',
  qa_pending:   'bg-yellow-100 text-yellow-700',
  qa_complete:  'bg-purple-100 text-purple-700',
  submitted:    'bg-indigo-100 text-indigo-700',
  awarded:      'bg-green-100 text-green-700',
  rejected:     'bg-red-100 text-red-700',
  withdrawn:    'bg-gray-100 text-gray-400',
}
const STATUS_LABELS: Record<string, string> = {
  draft:     'Draft', drafting: 'Drafting', in_review: 'In Review', qa_pending: 'QA Pending',
  qa_complete: 'QA Complete', submitted: 'Submitted', awarded: 'Awarded 🎉', rejected: 'Rejected', withdrawn: 'Withdrawn',
}

function formatUSD(n: number | null) {
  if (!n) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

export default function DashboardClient({ firstName, org, members, applications, showWelcome, completedChecklistItems = [] }: Props) {
  const { show: showTour, dismiss: dismissTour, restart: restartTour } = useTourState()
  const [welcomeDismissed, setWelcomeDismissed] = useState(false)
  const router = useRouter()

  const activeApps = applications.filter(a => !['awarded', 'rejected', 'withdrawn'].includes(a.status))
  const totalPipeline = applications.reduce((sum, a) => sum + (a.ask_amount_usd || 0), 0)
  const isNewUser = applications.length === 0

  const handleWelcomeDismiss = () => {
    setWelcomeDismissed(true)
    // Remove welcome param from URL
    router.replace('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Guided tour overlay */}
      {showTour && <GuidedTour onDismiss={dismissTour} />}

      {/* Top nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">GP</span>
            </div>
            <span className="font-semibold text-gray-900">{org?.name as string}</span>
          </div>
          <div className="flex items-center gap-4">
            <UsageMeter compact />
            <a href="/rfp/new" className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-indigo-700">
              + New Application
            </a>
            <a href="/settings/team" className="text-sm text-gray-500 hover:text-gray-900">Team</a>
            <a href="/settings/billing" className="text-sm text-gray-500 hover:text-gray-900">Billing</a>
            <a href="/grants/discover" className="text-sm text-gray-500 hover:text-gray-900">Discover Grants</a>
            <a href="/pilot" className="text-sm text-gray-500 hover:text-gray-900">Pilot Config</a>
            <a href="/audit" className="text-sm text-gray-500 hover:text-gray-900">Audit Log</a>
            <a href="/providers" className="text-sm text-gray-500 hover:text-gray-900">Providers</a>
            <a href="/orders" className="text-sm text-gray-500 hover:text-gray-900">Orders</a>
            <a href="/research" className="text-sm text-gray-500 hover:text-gray-900">Research</a>
            <button onClick={restartTour} className="text-xs text-gray-400 hover:text-indigo-600" title="Restart tour">
              🗺️ Tour
            </button>
            <form action="/auth/signout" method="POST">
              <button className="text-sm text-gray-400 hover:text-gray-600">Sign out</button>
            </form>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Welcome banner for new users */}
        {(showWelcome || isNewUser) && !welcomeDismissed && (
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold mb-1">👋 Welcome to GrantPilot, {firstName}!</h2>
                <p className="text-indigo-100 text-sm mb-4">
                  You&#39;re set up and ready to go. The fastest way to start: try a sample RFP — no upload needed.
                  Watch AI parse requirements, generate narratives, and build a budget in under 3 minutes.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a href="/rfp/new"
                    className="bg-white text-indigo-700 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-indigo-50">
                    🎯 Try Sample RFP
                  </a>
                  <button onClick={() => { dismissTour(); setTimeout(restartTour, 100) }}
                    className="text-white border border-white/40 text-sm px-4 py-2.5 rounded-xl hover:bg-white/10">
                    🗺️ Take the Tour
                  </button>
                </div>
              </div>
              <button onClick={handleWelcomeDismiss} className="text-white/60 hover:text-white flex-shrink-0 text-xl">✕</button>
            </div>

            {/* Mini flow diagram */}
            <div className="mt-5 grid grid-cols-5 gap-2 text-center text-xs text-indigo-100">
              {[
                { icon: '📄', label: 'Import RFP' },
                { icon: '✍️', label: 'AI Drafts' },
                { icon: '💰', label: 'Budget' },
                { icon: '🛡️', label: 'QA Review' },
                { icon: '📦', label: 'Export ZIP' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center text-base">{item.icon}</div>
                  <span>{item.label}</span>
                  {i < 4 && <div className="absolute mt-4 ml-10 text-white/40 text-xs">→</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Welcome header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isNewUser ? `Let's start, ${firstName} 🚀` : `Welcome back, ${firstName} 👋`}
            </h1>
            <p className="text-gray-500 mt-0.5">{org?.name as string} · {members.length} team member{members.length !== 1 ? 's' : ''}</p>
          </div>
          {!isNewUser && (
            <button onClick={restartTour} className="text-xs text-gray-400 hover:text-indigo-600 flex items-center gap-1">
              🗺️ Take the tour
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Active Applications', value: activeApps.length, color: 'text-indigo-600' },
            { label: 'Pipeline Value', value: formatUSD(totalPipeline), color: 'text-green-600' },
            { label: 'Team Members', value: members.length, color: 'text-purple-600' },
            { label: 'Org Plan', value: (org?.plan as string) || 'Free', color: 'text-gray-700' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Usage Meter */}
        <UsageMeter />

        {/* Onboarding Checklist — shown until all steps done */}
        <OnboardingChecklist completedItems={completedChecklistItems} />

        {/* Applications table */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Grant Applications</h2>
            <a href="/rfp/new" className="text-sm text-indigo-600 hover:underline">+ New →</a>
          </div>
          {applications.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-4xl mb-3">📋</div>
              <div className="font-medium text-gray-700">No applications yet</div>
              <p className="text-sm text-gray-500 mt-1 mb-5">
                Start with a sample RFP to see GrantPilot in action — no upload needed.
              </p>
              <div className="flex gap-3 justify-center">
                <a href="/rfp/new"
                  className="inline-flex bg-indigo-600 text-white text-sm px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700">
                  🎯 Try Sample RFP
                </a>
                <a href="/rfp/new"
                  className="inline-flex border border-gray-300 text-gray-700 text-sm px-5 py-2.5 rounded-lg font-medium hover:bg-gray-50">
                  📄 Upload RFP
                </a>
              </div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <th className="px-6 py-3">Grant / Funder</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Ask</th>
                  <th className="px-6 py-3">Deadline</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applications.map(app => {
                  const days = daysUntil(app.deadline)
                  return (
                    <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <a href={`/application/${app.id}`} className="font-medium text-gray-900 hover:text-indigo-600">{app.title}</a>
                        <div className="text-xs text-gray-400">{app.funder_name || '—'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[app.status] || app.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{formatUSD(app.ask_amount_usd)}</td>
                      <td className="px-6 py-4">
                        {app.deadline ? (
                          <div>
                            <div className="text-gray-700">{new Date(app.deadline).toLocaleDateString()}</div>
                            {days !== null && (
                              <div className={`text-xs ${days <= 7 ? 'text-red-600 font-medium' : days <= 30 ? 'text-orange-600' : 'text-gray-400'}`}>
                                {days < 0 ? 'Overdue' : days === 0 ? 'Today!' : `${days}d remaining`}
                              </div>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <a href={`/application/${app.id}`} className="text-xs text-indigo-600 hover:underline">Edit</a>
                          <a href={`/timeline/${app.id}`} className="text-xs text-gray-400 hover:text-gray-600">Timeline</a>
                          <a href={`/export/${app.id}`} className="text-xs text-gray-400 hover:text-gray-600">Export</a>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: '/rfp/new',    icon: '🎯', title: 'Sample RFP',       desc: 'Start in 1 click' },
            { href: '/providers',  icon: '👥', title: 'Specialists',       desc: 'Browse marketplace' },
            { href: '/audit',      icon: '🔒', title: 'Audit Log',         desc: 'Immutable history' },
            { href: '/research',   icon: '🔬', title: 'Research',          desc: 'Journey map, personas' },
          ].map(link => (
            <a key={link.href} href={link.href} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300 transition-colors group">
              <div className="text-2xl mb-2">{link.icon}</div>
              <div className="font-semibold text-sm text-gray-900 group-hover:text-indigo-600">{link.title}</div>
              <p className="text-xs text-gray-500 mt-0.5">{link.desc}</p>
            </a>
          ))}
        </div>
      </main>
      <GrantPilotChat context={{ page: 'dashboard', org: org }} />
    </div>
  )
}
