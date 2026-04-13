import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { STATUS_LABELS, STATUS_COLORS, formatTAT } from '@/lib/utils'
import { FeedbackWidget } from '@/components/FeedbackWidget'
import { OnboardingChecklist } from '@/components/OnboardingChecklist'
import { UsageMeter } from '@/components/UsageMeter'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ first_run?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const sp = await searchParams
  const isFirstRun = sp?.first_run === '1'

  // Load user profile + subscription + usage
  const [
    { data: profile },
    { data: sub },
    { data: usage },
    { data: jobs },
  ] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).eq('status', 'active').single(),
    supabase.from('usage_ledger').select('*').eq('user_id', user.id)
      .eq('period_start', new Date().toISOString().slice(0, 7) + '-01').single(),
    supabase.from('processing_jobs').select(`
      id, status, created_at, queued_at, preview_ready_at, done_at, tat_sec,
      clips_requested, target_platforms, template_id,
      media_assets(title, duration_min, source_type),
      clip_outputs(id, render_status, platform, heuristic_score, preview_url)
    `).eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
  ])

  const clipsUsed = usage?.clips_used || 0
  const clipsQuota = (profile?.is_alpha ? 999 : sub?.clips_per_month) || 5
  const isAlpha = profile?.is_alpha || false

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-bold text-lg">
            <span className="text-indigo-400">⚡</span> ClipSpark
            {isAlpha && <span className="ml-2 text-xs bg-indigo-900/40 text-indigo-300 px-2 py-0.5 rounded-full">Alpha</span>}
          </Link>
          <Link href="/upload" className="text-gray-400 hover:text-white text-sm transition-colors">
            New Job
          </Link>
          <Link href="/templates" className="text-gray-400 hover:text-white text-sm transition-colors">
            Templates
          </Link>
          <Link href="/performance" className="text-gray-400 hover:text-white text-sm transition-colors">
            Performance
          </Link>
          <Link href="/pricing" className="text-gray-400 hover:text-white text-sm transition-colors">
            Pricing
          </Link>
          <Link href="/community/marketplace" className="text-gray-400 hover:text-white text-sm transition-colors">
            🏆 Marketplace
          </Link>
          <Link href="/community" className="text-gray-400 hover:text-white text-sm transition-colors">
            Help
          </Link>
          <Link href="/partners" className="text-gray-400 hover:text-white text-sm transition-colors">
            Import
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            {isAlpha ? (
              <span className="text-indigo-400">∞ Alpha</span>
            ) : (
              <span className={clipsUsed >= clipsQuota ? 'text-red-400' : 'text-gray-400'}>
                {clipsUsed}/{clipsQuota} clips
              </span>
            )}
          </div>
          <Link href="/settings" className="text-gray-500 hover:text-white text-sm">
            {profile?.full_name || user.email}
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 space-y-8">

        {/* First-run welcome banner */}
        {isFirstRun && (
          <div className="bg-gradient-to-r from-indigo-950/60 to-purple-950/40 border border-indigo-700/40 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">{profile?.creator_segment === 'founder_podcaster' ? '🚀' : profile?.creator_segment === 'coach_educator' ? '🎯' : profile?.creator_segment === 'content_creator' ? '🎬' : '🎙️'}</div>
              <div className="flex-1">
                <h2 className="font-bold text-lg mb-1">
                  Welcome{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}! Let&rsquo;s make your first clip.
                </h2>
                <p className="text-gray-400 text-sm mb-4">
                  {profile?.creator_segment === 'founder_podcaster'
                    ? 'Your defaults are set for LinkedIn + YouTube Shorts — perfect for founder updates and AMAs.'
                    : profile?.creator_segment === 'coach_educator'
                    ? 'Your defaults are set for Instagram Reels + TikTok — great for frameworks and teaching moments.'
                    : profile?.creator_segment === 'content_creator'
                    ? 'Your defaults are set for TikTok + YouTube Shorts — optimized for stream highlights.'
                    : 'Your defaults are set for YouTube Shorts + LinkedIn — the best combo for podcast clips.'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-4">
                  {[
                    { step: '1', label: 'Upload your episode', detail: 'MP3, MP4, or paste a YouTube link', done: false },
                    { step: '2', label: 'Review 5 auto-picked clips', detail: 'Trim, adjust captions, pick your favorite', done: false },
                    { step: '3', label: 'Publish to your platforms', detail: 'One click to LinkedIn, Shorts, or TikTok', done: false },
                  ].map(s => (
                    <div key={s.step} className="bg-white/5 rounded-xl p-3">
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold mb-2">{s.step}</div>
                      <div className="font-medium text-white">{s.label}</div>
                      <div className="text-gray-500 mt-0.5">{s.detail}</div>
                    </div>
                  ))}
                </div>
                <Link href="/upload" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
                  Upload my first episode →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Onboarding checklist — shown until complete */}
        {!profile?.onboarding_done && <OnboardingChecklist collapsed={!isFirstRun} />}

        {/* Usage meter — precise time accounting + credit pack CTA */}
        <UsageMeter compact />

        {/* CTA */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent jobs</h2>
          <Link
            href="/upload"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + New clip job
          </Link>
        </div>

        {/* Jobs */}
        {!jobs?.length ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-5xl mb-4">🎙️</p>
            <h3 className="text-lg font-semibold mb-2">No clips yet</h3>
            <p className="text-gray-500 text-sm mb-6">
              Upload an episode or paste a URL to get started.
            </p>
            <Link
              href="/upload"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl inline-block"
            >
              Create your first clip →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job: any) => {
              const asset = job.media_assets
              const clipCount = job.clip_outputs?.length || 0
              const readyCount = job.clip_outputs?.filter((c: any) => c.render_status === 'preview_ready' || c.render_status === 'exported').length || 0

              return (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4 hover:border-gray-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {asset?.title || 'Untitled episode'}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {asset?.duration_min ? `${Math.round(asset.duration_min)}min` : ''}
                      {asset?.source_type === 'url_import' ? ' · URL import' : ' · uploaded'}
                      {' · '}{new Date(job.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    {readyCount > 0 && (
                      <span className="text-green-400 font-medium">{readyCount} ready</span>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[job.status] || 'bg-gray-800 text-gray-400'}`}>
                      {STATUS_LABELS[job.status] || job.status}
                    </span>
                    {job.tat_sec && (
                      <span className="text-gray-600 text-xs">{formatTAT(job.tat_sec / 3600)}</span>
                    )}
                  </div>

                  <span className="text-gray-600">→</span>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      {/* Support footer bar */}
      <div className="border-t border-gray-900 px-6 py-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-4 text-gray-600">
            <Link href="/help" className="hover:text-white transition-colors">❓ Help & FAQ</Link>
            <Link href="/call" className="hover:text-white transition-colors">📞 Free onboarding call</Link>
            <a href="https://discord.gg/clipspark" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">💬 Discord</a>
            <a href="mailto:hello.clipspark@agentmail.to" className="hover:text-white transition-colors">✉️ Email support</a>
          </div>
          <Link href="/community" className="text-indigo-400 hover:text-indigo-300 text-xs transition-colors">
            Having trouble? We reply within 24h →
          </Link>
        </div>
      </div>

      <FeedbackWidget context="dashboard" />
    </div>
  )
}
