'use client'

import React, { useEffect, useState, useCallback, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import type { TestJob, Project } from '@/lib/types'
import { TIER_CONFIG } from '@/lib/types'
import dynamic from 'next/dynamic'

const OnboardingChecklist = dynamic(
  () => import('@/components/onboarding/OnboardingChecklist'),
  { ssr: false }
)
const OnboardingTour = dynamic(
  () => import('@/components/onboarding/OnboardingTour'),
  { ssr: false }
)

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  published: 'bg-blue-100 text-blue-700',
  assigned: 'bg-yellow-100 text-yellow-700',
  complete: 'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isWelcome = searchParams?.get('welcome') === '1'
  const [userEmail, setUserEmail] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [jobs, setJobs] = useState<TestJob[]>([])
  const [activeTab, setActiveTab] = useState<'jobs' | 'projects'>('jobs')
  const [loading, setLoading] = useState(true)

  // New project form
  const [showNewProject, setShowNewProject] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectUrl, setProjectUrl] = useState('')
  const [projectDesc, setProjectDesc] = useState('')
  const [projectSaving, setProjectSaving] = useState(false)

  // New job form
  const [showNewJob, setShowNewJob] = useState(false)
  const [jobTitle, setJobTitle] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [jobTier, setJobTier] = useState<'quick' | 'standard' | 'deep'>('quick')
  const [jobInstructions, setJobInstructions] = useState('')
  const [jobProjectId, setJobProjectId] = useState('')
  const [jobSaving, setJobSaving] = useState(false)

  const [error, setError] = useState('')
  const [credits, setCredits] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [pRes, jRes, cRes] = await Promise.all([
      fetch('/api/projects'),
      fetch('/api/jobs'),
      fetch('/api/credits'),
    ])
    if (pRes.ok) { const d = await pRes.json(); setProjects(d.projects ?? []) }
    if (jRes.ok) { const d = await jRes.json(); setJobs(d.jobs ?? []) }
    if (cRes.ok) { const d = await cRes.json(); setCredits(d.available ?? d.balance ?? 0) }
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email ?? '')
      loadData()
    })
  }, [supabase, router, loadData])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault()
    setProjectSaving(true); setError('')
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: projectName, url: projectUrl, description: projectDesc }),
    })
    const d = await res.json()
    if (!res.ok) { setError(d.error); setProjectSaving(false); return }
    setProjects(prev => [d.project, ...prev])
    setShowNewProject(false); setProjectName(''); setProjectUrl(''); setProjectDesc('')
    setProjectSaving(false)
  }

  async function deleteProject(id: string) {
    if (!confirm('Delete this project? Jobs will not be deleted.')) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  async function createJob(e: React.FormEvent) {
    e.preventDefault()
    setJobSaving(true); setError('')
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: jobTitle, url: jobUrl, tier: jobTier,
        instructions: jobInstructions, project_id: jobProjectId || undefined,
      }),
    })
    const d = await res.json()
    if (!res.ok) { setError(d.error); setJobSaving(false); return }
    setJobs(prev => [d.job, ...prev])
    setShowNewJob(false); setJobTitle(''); setJobUrl(''); setJobTier('quick'); setJobInstructions(''); setJobProjectId('')
    setJobSaving(false)
  }

  async function deleteJob(id: string) {
    if (!confirm('Delete this draft job?')) return
    const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' })
    if (res.ok) setJobs(prev => prev.filter(j => j.id !== id))
    else { const d = await res.json(); setError(d.error) }
  }

  async function publishJob(id: string) {
    const res = await fetch(`/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'published' }),
    })
    if (res.ok) {
      const d = await res.json()
      setJobs(prev => prev.map(j => j.id === id ? d.job : j))
      // Mark onboarding step complete
      window.dispatchEvent(new CustomEvent('betawindow:step_complete', { detail: { step: 'publish_job' } }))
    }
  }

  function handleOnboardingAction(action: string) {
    if (action === 'open_new_project') {
      setActiveTab('projects')
      setShowNewProject(true)
      window.dispatchEvent(new CustomEvent('betawindow:step_complete', { detail: { step: 'create_project' } }))
    } else if (action === 'open_new_job') {
      setActiveTab('jobs')
      setShowNewJob(true)
      window.dispatchEvent(new CustomEvent('betawindow:step_complete', { detail: { step: 'draft_job' } }))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Welcome banner for new signups */}
      {isWelcome && (
        <div className="bg-green-600 text-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎉</span>
            <div>
              <span className="font-semibold">Welcome to BetaWindow!</span>
              <span className="ml-2 text-green-100 text-sm">Your free Quick test credit ($5) has been added to your account. Submit your first test job below.</span>
            </div>
          </div>
          <a href="/jobs/new" className="px-4 py-1.5 bg-white text-green-700 font-semibold text-sm rounded-lg hover:bg-green-50">Start first test →</a>
        </div>
      )}
      {/* Onboarding */}
      <OnboardingChecklist onAction={handleOnboardingAction} />
      <OnboardingTour autoStart={true} />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-gray-900">BetaWindow</span>
          <span className="text-sm text-gray-400">Dashboard</span>
          <a href="/marketplace" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium ml-2">🧪 Find Test Jobs</a>
        </div>
        <div className="flex items-center gap-4">
          <a href="/dashboard/api-keys"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
            <span>🔑</span>
            <span>API Keys</span>
          </a>
          <a href="/billing"
            data-testid="billing-link"
            className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
            <span>💳</span>
            <span>{credits === null ? '…' : credits} credits</span>
          </a>
          <span className="text-sm text-gray-600">{userEmail}</span>
          <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-900">Sign out</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-gray-100 p-1 rounded-lg w-fit">
          {(['jobs', 'projects'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize
                ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab} {tab === 'jobs' ? `(${jobs.length})` : `(${projects.length})`}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" data-testid="dashboard-error">
            {error}
          </div>
        )}

        {/* JOBS TAB */}
        {activeTab === 'jobs' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Test Jobs</h2>
              <button onClick={() => setShowNewJob(true)} data-testid="new-job-button"
                data-onboarding-target="new-job-btn"
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
                + New Job
              </button>
            </div>

            {/* New Job Form */}
            {showNewJob && (
              <form onSubmit={createJob} data-testid="new-job-form"
                className="mb-6 p-5 bg-white border border-gray-200 rounded-xl shadow-sm space-y-3">
                <h3 className="font-medium text-gray-900 text-sm">New Test Job</h3>
                <input required value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                  placeholder="Job title" data-testid="job-title-input"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input required value={jobUrl} onChange={e => setJobUrl(e.target.value)}
                  placeholder="App URL (https://...)" data-testid="job-url-input"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <select value={jobTier} onChange={e => setJobTier(e.target.value as typeof jobTier)}
                  data-testid="job-tier-select"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {Object.entries(TIER_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label} — ${v.price_cents / 100} (~{v.duration_min} min)</option>
                  ))}
                </select>
                {projects.length > 0 && (
                  <select value={jobProjectId} onChange={e => setJobProjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">No project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
                <textarea value={jobInstructions} onChange={e => setJobInstructions(e.target.value)}
                  placeholder="Testing instructions (optional)" rows={3} data-testid="job-instructions-input"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <div className="flex gap-2">
                  <button type="submit" disabled={jobSaving} data-testid="job-save-button"
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                    {jobSaving ? 'Saving…' : 'Create Draft'}
                  </button>
                  <button type="button" onClick={() => setShowNewJob(false)}
                    className="px-4 py-2 text-gray-600 text-sm hover:text-gray-900">Cancel</button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-16" data-testid="jobs-empty">
                <div className="text-5xl mb-4">🧪</div>
                <p className="text-lg font-semibold text-gray-800 mb-2">No test jobs yet</p>
                <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                  Submit your app URL and a real human will test it in a live Chrome session — network logs, console errors, and a plain-English bug report included.
                </p>
                <a href="/jobs/new"
                  className="inline-block px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors text-sm">
                  Start your first test — from $5
                </a>
                <p className="mt-3 text-xs text-gray-400">Use code <strong>LAUNCH</strong> for a free Quick test this week</p>
                {/* Referral nudge */}
                <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl max-w-sm mx-auto">
                  <p className="text-sm font-semibold text-amber-800 mb-1">🎁 Earn free test credits</p>
                  <p className="text-xs text-amber-700">Invite a fellow developer — when they submit their first test, you both get <strong>$5 in credits</strong>.</p>
                  <button
                    onClick={() => { const el = document.querySelector('[data-testid="referral-share-button"]') as HTMLButtonElement; el?.click() }}
                    className="mt-2 text-xs text-amber-800 font-semibold underline hover:no-underline"
                  >
                    Get your referral link →
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3" data-testid="jobs-list">
                {jobs.map(job => (
                  <div key={job.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between"
                    data-testid={`job-row-${job.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 text-sm truncate">{job.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[job.status]}`}>
                          {job.status}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                          {TIER_CONFIG[job.tier]?.label ?? job.tier} — ${job.price_cents / 100}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">{job.url}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {job.status === 'draft' && (
                        <>
                          <button onClick={() => publishJob(job.id)}
                            className="text-xs px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md font-medium"
                            data-onboarding-target="publish-job-btn"
                            data-testid={`publish-job-${job.id}`}>
                            Publish
                          </button>
                          <button onClick={() => deleteJob(job.id)}
                            className="text-xs px-3 py-1 text-red-500 hover:bg-red-50 rounded-md"
                            data-testid={`delete-job-${job.id}`}>
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PROJECTS TAB */}
        {activeTab === 'projects' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
              <button onClick={() => setShowNewProject(true)} data-testid="new-project-button"
                data-onboarding-target="new-project-btn"
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
                + New Project
              </button>
            </div>

            {/* New Project Form */}
            {showNewProject && (
              <form onSubmit={createProject} data-testid="new-project-form"
                className="mb-6 p-5 bg-white border border-gray-200 rounded-xl shadow-sm space-y-3">
                <h3 className="font-medium text-gray-900 text-sm">New Project</h3>
                <input required value={projectName} onChange={e => setProjectName(e.target.value)}
                  placeholder="Project name" data-testid="project-name-input"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input value={projectUrl} onChange={e => setProjectUrl(e.target.value)}
                  placeholder="App base URL (optional)" data-testid="project-url-input"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <textarea value={projectDesc} onChange={e => setProjectDesc(e.target.value)}
                  placeholder="Description (optional)" rows={2} data-testid="project-desc-input"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <div className="flex gap-2">
                  <button type="submit" disabled={projectSaving} data-testid="project-save-button"
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                    {projectSaving ? 'Saving…' : 'Create Project'}
                  </button>
                  <button type="button" onClick={() => setShowNewProject(false)}
                    className="px-4 py-2 text-gray-600 text-sm hover:text-gray-900">Cancel</button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>
            ) : projects.length === 0 ? (
              <div className="text-center py-16 text-gray-400" data-testid="projects-empty">
                <p className="text-lg mb-2">No projects yet</p>
                <p className="text-sm">Organize your test jobs into projects</p>
              </div>
            ) : (
              <div className="space-y-3" data-testid="projects-list">
                {projects.map(project => (
                  <div key={project.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between"
                    data-testid={`project-row-${project.id}`}>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{project.name}</p>
                      {project.url && <p className="text-xs text-gray-400 mt-0.5">{project.url}</p>}
                      {project.description && <p className="text-xs text-gray-500 mt-1">{project.description}</p>}
                    </div>
                    <button onClick={() => deleteProject(project.id)}
                      className="text-xs px-3 py-1 text-red-500 hover:bg-red-50 rounded-md"
                      data-testid={`delete-project-${project.id}`}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Referral share widget — sticky bottom-left */}
      <ReferralWidget />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Referral share widget
// ─────────────────────────────────────────────────────────────────────────────
function ReferralWidget() {
  const [open, setOpen] = React.useState(false)
  const [referralLink, setReferralLink] = React.useState('')
  const [copied, setCopied] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  async function loadLink() {
    if (referralLink) { setOpen(true); return }
    setLoading(true)
    const res = await fetch('/api/referrals')
    if (res.ok) {
      const d = await res.json()
      setReferralLink(d.link)
    }
    setLoading(false)
    setOpen(true)
  }

  function copyLink() {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="fixed bottom-6 left-6 z-40" data-testid="referral-widget">
      {open && referralLink && (
        <div className="mb-3 bg-white border border-indigo-200 rounded-xl shadow-lg p-4 w-72">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm text-gray-900">🎁 Invite a friend</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-xs">✕</button>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Share your link — both of you get <strong>+3 credits</strong> when they make their first purchase.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={referralLink}
              data-testid="referral-link-input"
              className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 font-mono truncate"
            />
            <button
              onClick={copyLink}
              data-testid="copy-referral-link"
              className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 font-medium whitespace-nowrap"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}
      <button
        onClick={loadLink}
        disabled={loading}
        data-testid="referral-share-button"
        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 disabled:opacity-50"
      >
        🎁 {loading ? 'Loading…' : 'Share & earn credits'}
      </button>
    </div>
  )
}
