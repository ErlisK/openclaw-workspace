'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Segments ordered by target priority
const SEGMENTS = [
  {
    id: 'solo_podcaster',
    label: '🎙️ Solo Podcaster',
    subtitle: 'Weekly show, no editor',
    desc: 'You record solo or with guests. You want clips on YouTube Shorts, TikTok, and LinkedIn without spending hours in editing software.',
    defaultTemplate: 'podcast-pro-v02',
    defaultPlatforms: ['YouTube Shorts', 'LinkedIn', 'Instagram Reels'],
    exampleClipDesc: '"The most counterintuitive lesson I learned building my business"',
    heuristicProfile: 'podcast',
    highlight: true,
  },
  {
    id: 'founder_podcaster',
    label: '🚀 Founder / Builder',
    subtitle: 'Podcast while building your startup',
    desc: 'Founder updates, AMAs, behind-the-scenes. LinkedIn clips drive deal flow and hires.',
    defaultTemplate: 'linkedin-pro-v02',
    defaultPlatforms: ['LinkedIn', 'YouTube Shorts'],
    exampleClipDesc: '"Why we pivoted and what we learned"',
    heuristicProfile: 'founder',
    highlight: false,
  },
  {
    id: 'coach_educator',
    label: '🎯 Coach / Educator',
    subtitle: 'Webinars, courses, live calls',
    desc: 'Your calls are full of frameworks and insights. Turn teaching moments into clips people share.',
    defaultTemplate: 'podcast-pro-v02',
    defaultPlatforms: ['Instagram Reels', 'TikTok', 'YouTube Shorts'],
    exampleClipDesc: '"The 3-step framework that changed everything for my clients"',
    heuristicProfile: 'coach',
    highlight: false,
  },
  {
    id: 'content_creator',
    label: '🎬 Content Creator',
    subtitle: 'YouTube, Twitch, live streams',
    desc: 'Long streams and interviews. You need clips fast without watching everything back.',
    defaultTemplate: 'tiktok-native-v02',
    defaultPlatforms: ['TikTok', 'YouTube Shorts', 'Instagram Reels'],
    exampleClipDesc: '"That wild moment at 1:23:45 your audience is talking about"',
    heuristicProfile: 'creator',
    highlight: false,
  },
]

const EPISODE_FREQUENCIES = [
  { id: 'weekly', label: 'Weekly or more' },
  { id: 'biweekly', label: 'Every 2 weeks' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'sporadic', label: 'When I can' },
]

const CURRENT_TOOLS = [
  { id: 'nothing', label: 'Nothing yet' },
  { id: 'opus_clip', label: 'Opus Clip' },
  { id: 'descript', label: 'Descript' },
  { id: 'capcut', label: 'CapCut' },
  { id: 'manual', label: 'Manual editing' },
  { id: 'other', label: 'Something else' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    creator_segment: 'solo_podcaster',
    episode_frequency: 'weekly',
    current_repurpose_tool: 'nothing',
    analytics_consent: true,
    onboarding_version: 'v2',
  })

  const selectedSegment = SEGMENTS.find(s => s.id === form.creator_segment) || SEGMENTS[0]

  async function finish() {
    setLoading(true)

    // Map segment → legacy creator_type + niche fields for backward compat
    const legacyMap: Record<string, { creator_type: string; creator_niche: string; persona: string }> = {
      solo_podcaster:   { creator_type: 'podcaster', creator_niche: 'business_podcast', persona: 'podcaster' },
      founder_podcaster:{ creator_type: 'founder',   creator_niche: 'founder_podcast',  persona: 'founder' },
      coach_educator:   { creator_type: 'coach',     creator_niche: 'coaching',         persona: 'coach' },
      content_creator:  { creator_type: 'streamer',  creator_niche: 'other',            persona: 'creator' },
    }
    const legacy = legacyMap[form.creator_segment] || legacyMap.solo_podcaster

    await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: form.full_name,
        creator_segment: form.creator_segment,
        creator_type: legacy.creator_type,
        creator_niche: legacy.creator_niche,
        persona: legacy.persona,
        episode_frequency: form.episode_frequency,
        current_repurpose_tool: form.current_repurpose_tool,
        analytics_consent: form.analytics_consent,
        onboarding_done: true,
        onboarding_version: 'v2',
      }),
    })

    // Store segment defaults for first upload
    if (typeof window !== 'undefined') {
      localStorage.setItem('cs_segment_defaults', JSON.stringify({
        template_id: selectedSegment.defaultTemplate,
        target_platforms: selectedSegment.defaultPlatforms,
        segment: form.creator_segment,
      }))
    }

    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'onboarding_completed_v2',
        properties: {
          creator_segment: form.creator_segment,
          episode_frequency: form.episode_frequency,
          current_tool: form.current_repurpose_tool,
          analytics_consent: form.analytics_consent,
          persona: legacy.persona,
          onboarding_version: 'v2',
        },
      }),
    }).catch(() => {})

    router.push('/dashboard?first_run=1')
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-950">
      <div className="w-full max-w-lg space-y-8">

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-indigo-500' : 'bg-gray-800'}`} />
          ))}
        </div>

        {/* ── Step 1: Who are you? ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Welcome to ClipSpark ⚡</h1>
              <p className="text-gray-400 mt-1">Quick setup so we can tailor your clips. 60 seconds.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-gray-400">What should we call you?</label>
              <input
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Alex Johnson"
                autoFocus
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 placeholder-gray-600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">What best describes you?</label>
              <div className="space-y-2">
                {SEGMENTS.map(seg => (
                  <button
                    key={seg.id}
                    onClick={() => setForm(f => ({ ...f, creator_segment: seg.id }))}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all ${
                      form.creator_segment === seg.id
                        ? 'bg-indigo-950/40 border-indigo-600 text-white ring-1 ring-indigo-700/40'
                        : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{seg.label}</span>
                        <span className="ml-2 text-xs text-gray-500">{seg.subtitle}</span>
                      </div>
                      {seg.highlight && (
                        <span className="text-xs bg-indigo-900/50 text-indigo-300 border border-indigo-800/40 px-2 py-0.5 rounded-full ml-2 shrink-0">
                          Most popular
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!form.full_name}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Next →
            </button>
          </div>
        )}

        {/* ── Step 2: Context questions ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">A couple quick questions</h1>
              <p className="text-gray-400 mt-1">Helps us pick the right defaults for your clips.</p>
            </div>

            {/* Segment preview card */}
            <div className="bg-indigo-950/30 border border-indigo-800/30 rounded-xl p-4 text-sm">
              <div className="font-medium text-white mb-1">{selectedSegment.label}</div>
              <div className="text-gray-400 text-xs leading-relaxed">{selectedSegment.desc}</div>
              <div className="mt-2 text-xs text-indigo-300">
                📌 Example highlight: <em>{selectedSegment.exampleClipDesc}</em>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">How often do you publish?</label>
              <div className="grid grid-cols-2 gap-2">
                {EPISODE_FREQUENCIES.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setForm(ff => ({ ...ff, episode_frequency: f.id }))}
                    className={`px-3 py-2.5 rounded-xl text-sm border text-left transition-colors ${
                      form.episode_frequency === f.id
                        ? 'bg-indigo-600/20 border-indigo-600 text-white'
                        : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">What do you use now to repurpose content?</label>
              <div className="grid grid-cols-3 gap-2">
                {CURRENT_TOOLS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setForm(ff => ({ ...ff, current_repurpose_tool: t.id }))}
                    className={`px-3 py-2 rounded-xl text-xs border text-center transition-colors ${
                      form.current_repurpose_tool === t.id
                        ? 'bg-indigo-600/20 border-indigo-600 text-white'
                        : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 border border-gray-700 text-gray-400 py-3 rounded-xl hover:border-gray-500 transition-colors text-sm">
                Back
              </button>
              <button onClick={() => setStep(3)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors">
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Confirm defaults + consent ── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">You&rsquo;re all set! 🎉</h1>
              <p className="text-gray-400 mt-1">Here&rsquo;s what we&rsquo;ve set up for you.</p>
            </div>

            {/* Tailored defaults preview */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="text-sm text-gray-400">Default template</div>
                <div className="text-sm font-medium text-white">
                  {selectedSegment.defaultTemplate === 'podcast-pro-v02' ? '🎙️ Podcast Pro' :
                   selectedSegment.defaultTemplate === 'linkedin-pro-v02' ? '💼 LinkedIn Pro' :
                   selectedSegment.defaultTemplate === 'tiktok-native-v02' ? '🎵 TikTok Native' :
                   selectedSegment.defaultTemplate}
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="text-sm text-gray-400">Platforms</div>
                <div className="text-sm font-medium text-white">
                  {selectedSegment.defaultPlatforms.join(', ')}
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="text-sm text-gray-400">Clip heuristic</div>
                <div className="text-sm font-medium text-white">
                  v0.2 · {selectedSegment.heuristicProfile} mode
                </div>
              </div>
            </div>

            {/* Analytics consent */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="analytics"
                  checked={form.analytics_consent}
                  onChange={e => setForm(f => ({ ...f, analytics_consent: e.target.checked }))}
                  className="mt-0.5 rounded border-gray-600 bg-gray-800 accent-indigo-500"
                />
                <label htmlFor="analytics" className="text-sm cursor-pointer">
                  <span className="text-gray-300 font-medium">Share performance data</span>
                  <span className="block text-gray-500 text-xs mt-0.5">
                    Let ClipSpark learn from your clip view counts (anonymized) to improve AI highlight scoring for everyone. You can change this anytime.
                  </span>
                </label>
              </div>
            </div>

            {/* Alpha note */}
            <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-xl p-4">
              <p className="text-sm text-emerald-300">
                🎁 <strong>Alpha access:</strong> You get <strong>5 free clips/month</strong> to start.
                No credit card needed. Upgrade anytime for unlimited.
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 border border-gray-700 text-gray-400 py-3 rounded-xl hover:border-gray-500 transition-colors text-sm">
                Back
              </button>
              <button
                onClick={finish}
                disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {loading ? 'Setting up...' : 'Start making clips 🚀'}
              </button>
            </div>

            <p className="text-xs text-center text-gray-700">
              By signing up you agree to our{' '}
              <Link href="/legal/terms" className="underline hover:text-gray-500">Terms</Link>{' '}
              and{' '}
              <Link href="/legal/privacy" className="underline hover:text-gray-500">Privacy Policy</Link>.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
