import { createClient, createServiceClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { getActivationStatus } from '@/lib/activation'
import { isAdmin } from '@/lib/admin'

const STEPS = [
  { key: 'A1', label: 'Create Project',         col: 'a1_signed_up_at',        desc: 'First project created' },
  { key: 'A2', label: 'Upload Rules',            col: 'a2_project_created_at',  desc: 'First rule PDF uploaded' },
  { key: 'A3', label: 'Publish Recruit Link',    col: 'a3_rules_uploaded_at',   desc: 'Session opened for recruiting' },
  { key: 'A4', label: 'Schedule Session',        col: 'a4_session_published_at',desc: 'First session scheduled' },
  { key: 'A5', label: 'First Session Complete',  col: 'a5_first_signup_at',     desc: 'First run completed' },
  { key: 'A6', label: 'Second Session Complete', col: 'a6_feedback_received_at',desc: 'Second run completed' },
]

function fmtDate(ts: string | null) {
  if (!ts) return null
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function daysBetween(a: string | null, b: string | null) {
  if (!a || !b) return null
  return ((new Date(b).getTime() - new Date(a).getTime()) / 86400000).toFixed(1)
}

export default async function ActivationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  if (!isAdmin(user.id)) redirect('/dashboard')

  const status = await getActivationStatus(user.id)
  const completed = Object.values(status).filter(Boolean).length
  const nextStep = STEPS.find(s => !status[s.key as keyof typeof status])

  // Time-to-milestone calculations
  const a1_to_a4_days = daysBetween(status.A1, status.A4)
  const a4_to_a6_days = daysBetween(status.A4, status.A6)

  // Cohort benchmarks from activation_summary view (service client for cross-designer aggregates)
  const svc = createServiceClient()
  const { data: summary } = await svc
    .from('activation_summary' as any)
    .select('*')
    .single()

  const benchmarks = summary as any ?? {}

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Your Activation Progress</h1>
        <p className="text-gray-400 text-sm mt-1">
          {completed} of 6 milestones completed
          {nextStep && <span className="text-orange-400"> — next: {nextStep.label}</span>}
        </p>
      </div>

      {/* Progress bar */}
      <div className="bg-white/4 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium">Overall progress</span>
          <span className="text-2xl font-bold text-orange-400">{completed}/6</span>
        </div>
        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-700"
            style={{ width: `${(completed / 6) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                status[s.key as keyof typeof status]
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : i === completed
                  ? 'bg-white/5 border-orange-500/50 text-orange-500/70'
                  : 'bg-white/5 border-white/15 text-gray-600'
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Step cards */}
      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const ts = status[step.key as keyof typeof status]
          const done = !!ts
          const isNext = !done && i === completed

          return (
            <div
              key={step.key}
              className={`flex items-start gap-4 rounded-2xl p-5 border transition-all ${
                done
                  ? 'bg-green-500/5 border-green-500/20'
                  : isNext
                  ? 'bg-orange-500/5 border-orange-500/30'
                  : 'bg-white/3 border-white/8'
              }`}
            >
              {/* Step badge */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                done ? 'bg-green-500/20 text-green-400' :
                isNext ? 'bg-orange-500/20 text-orange-400' :
                'bg-white/5 text-gray-600'
              }`}>
                {done ? '✓' : step.key}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className={`font-semibold ${done ? 'text-green-300' : isNext ? 'text-orange-300' : 'text-gray-500'}`}>
                    {step.label}
                  </span>
                  {ts && (
                    <span className="text-xs text-gray-500">{fmtDate(ts)}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>

                {/* Time delta hints */}
                {step.key === 'A4' && done && a1_to_a4_days && (
                  <p className="text-xs text-blue-400/70 mt-1">A1 → A4 in {a1_to_a4_days} days {parseFloat(a1_to_a4_days) <= 7 ? '✓ ≤7d target' : '(target: ≤7d)'}</p>
                )}
                {step.key === 'A6' && done && a4_to_a6_days && (
                  <p className="text-xs text-blue-400/70 mt-1">A4 → A6 in {a4_to_a6_days} days {parseFloat(a4_to_a6_days) <= 21 ? '✓ ≤21d target' : '(target: ≤21d)'}</p>
                )}

                {/* Next step CTA */}
                {isNext && (
                  <div className="mt-2">
                    {step.key === 'A1' && <a href="/dashboard/projects/new" className="text-xs text-orange-400 hover:underline">→ Create your first project</a>}
                    {step.key === 'A2' && <a href="/dashboard/projects" className="text-xs text-orange-400 hover:underline">→ Upload rule PDF to your project</a>}
                    {step.key === 'A3' && <a href="/dashboard/projects" className="text-xs text-orange-400 hover:underline">→ Create a session in your project</a>}
                    {step.key === 'A4' && <a href="/dashboard/sessions" className="text-xs text-orange-400 hover:underline">→ Schedule a date for your session</a>}
                    {step.key === 'A5' && <a href="/dashboard/sessions" className="text-xs text-orange-400 hover:underline">→ Run and complete your first session</a>}
                    {step.key === 'A6' && <a href="/dashboard/sessions" className="text-xs text-orange-400 hover:underline">→ Run and complete your second session</a>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Cohort benchmarks */}
      {Object.keys(benchmarks).length > 0 && (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-4">Beta Cohort Benchmarks</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xl font-bold text-white">{benchmarks.a1_to_a4_7d_pct ?? '—'}%</div>
              <div className="text-xs text-gray-500">Designers: A1→A4 within 7 days</div>
              <div className="text-xs text-green-500/60">Target ≥50%</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">{benchmarks.a4_to_a6_21d_pct ?? '—'}%</div>
              <div className="text-xs text-gray-500">Designers: A4→A6 within 21 days</div>
              <div className="text-xs text-green-500/60">Target ≥35%</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">{benchmarks.a4 ?? '—'}/{benchmarks.total_designers ?? '—'}</div>
              <div className="text-xs text-gray-500">Reached A4 (session published)</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">{benchmarks.a6 ?? '—'}/{benchmarks.total_designers ?? '—'}</div>
              <div className="text-xs text-gray-500">Reached A6 (second session done)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
