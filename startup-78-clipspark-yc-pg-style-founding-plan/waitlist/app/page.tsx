'use client'

import { useState, FormEvent } from 'react'

const PLATFORMS = ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'LinkedIn', 'Twitter/X', 'Facebook']
const CREATOR_TYPES = ['Solo Podcaster', 'Livestream Host', 'Coach', 'Founder', 'Other']
const TOOLS = ['Opus Clip', 'Descript', 'CapCut', 'Riverside', 'iMovie / Manual', 'VA / Editor', 'Nothing yet']
const FREQUENCIES = [
  'Daily',
  'A few times a week',
  'Weekly',
  'Every 2 weeks',
  'Monthly',
  'Rarely / trying to start',
]

export default function Home() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    creator_type: '',
    platform_focus: [] as string[],
    episodes_per_week: '',
    biggest_pain_point: '',
    current_workflow: '',
    channels_used: [] as string[],
    current_tooling: [] as string[],
    use_frequency: '',
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const toggle = (field: 'platform_focus' | 'channels_used' | 'current_tooling', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value],
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong')
        setStatus('error')
        return
      }
      setStatus('success')
    } catch {
      setErrorMsg('Network error. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950 flex items-center justify-center px-4">
        <div className="max-w-lg text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-3xl font-bold text-white mb-4">You&apos;re on the list!</h2>
          <p className="text-gray-300 text-lg mb-6">
            We&apos;ll be in touch as we approach launch. Early members get{' '}
            <strong className="text-purple-300">3 months free</strong>.
          </p>
          <div className="bg-purple-900/40 border border-purple-700/50 rounded-2xl p-6">
            <p className="text-purple-300 font-medium">🚀 Expected launch: Summer 2025</p>
            <p className="text-gray-400 text-sm mt-2">
              We&apos;ll also share research insights and ask for your feedback to shape the product.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            ⚡
          </div>
          <span className="text-white font-bold text-lg">ClipSpark</span>
        </div>
        <a
          href="#waitlist"
          className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Join Waitlist
        </a>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-purple-900/50 border border-purple-700/50 rounded-full px-4 py-2 text-purple-300 text-sm mb-8">
          <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
          Now accepting early access signups
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6">
          Turn Your Podcast Into{' '}
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            10 Clips in 10 Minutes
          </span>
        </h1>

        <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8 leading-relaxed">
          ClipSpark helps nano-creators repurpose long-form audio and video into platform-ready short
          clips — AI timestamps, auto-captions, title suggestions, one-click export to TikTok, Reels,
          Shorts, and LinkedIn. All for just{' '}
          <strong className="text-white">$5/month flat. No credits. No surprises.</strong>
        </p>

        {/* Social Proof */}
        <div className="flex items-center justify-center gap-6 mb-12 flex-wrap">
          <div className="flex -space-x-2">
            {['🎙️', '📱', '💼', '🎬', '🚀'].map((emoji, i) => (
              <div
                key={i}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 border-2 border-gray-900 flex items-center justify-center text-base"
              >
                {emoji}
              </div>
            ))}
          </div>
          <p className="text-gray-300">
            <strong className="text-white">500+ creators</strong> already on the waitlist
          </p>
        </div>

        {/* Pain → Solution */}
        <div className="grid md:grid-cols-3 gap-4 mb-16 text-left">
          {[
            { emoji: '⏰', problem: 'Hours per episode', solution: 'Under 10 minutes', desc: 'Upload your episode and ClipSpark finds, captions, and exports your best moments.' },
            { emoji: '💸', problem: '$15–30/mo tools', solution: '$5/month flat', desc: 'No credit system. No hidden fees. No surprise billing. Cancel anytime.' },
            { emoji: '🎯', problem: 'AI picks bad clips', solution: 'Community-proven templates', desc: 'Templates backed by real creator performance data, updated as trends shift.' },
          ].map(({ emoji, problem, solution, desc }) => (
            <div key={problem} className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-5">
              <div className="text-2xl mb-3">{emoji}</div>
              <div className="text-gray-500 text-sm line-through mb-1">{problem}</div>
              <div className="text-white font-bold text-lg mb-2">{solution}</div>
              <p className="text-gray-400 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Waitlist Form */}
      <section id="waitlist" className="max-w-2xl mx-auto px-6 pb-24">
        <div className="bg-gray-900/80 border border-gray-700/50 rounded-3xl p-8 md:p-10">
          <h2 className="text-2xl font-bold text-white mb-2">Join the Waitlist</h2>
          <p className="text-gray-400 mb-8">
            Early members get <strong className="text-purple-300">3 months free</strong> at launch.
            Your answers help us build exactly what you need.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name + Email */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2 font-medium">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="Alex Johnson"
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2 font-medium">Email *</label>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  placeholder="alex@example.com"
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            {/* Creator Type */}
            <div>
              <label className="block text-sm text-gray-300 mb-2 font-medium">I am a… *</label>
              <select
                required
                value={formData.creator_type}
                onChange={e => setFormData(p => ({ ...p, creator_type: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="">Select creator type</option>
                {CREATOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Channels Used */}
            <div>
              <label className="block text-sm text-gray-300 mb-2 font-medium">
                Channels I post on (select all that apply)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map(platform => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => toggle('channels_used', platform)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border text-left ${
                      formData.channels_used.includes(platform)
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-purple-600'
                    }`}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform Focus (for clip format preference) */}
            <div>
              <label className="block text-sm text-gray-300 mb-2 font-medium">
                Platforms I want to export clips to
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['TikTok', 'Instagram Reels', 'YouTube Shorts', 'LinkedIn'].map(platform => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => toggle('platform_focus', platform)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border text-left ${
                      formData.platform_focus.includes(platform)
                        ? 'bg-pink-600 border-pink-500 text-white'
                        : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-pink-600'
                    }`}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Tooling */}
            <div>
              <label className="block text-sm text-gray-300 mb-2 font-medium">
                Tools I currently use for clips (select all that apply)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TOOLS.map(tool => (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => toggle('current_tooling', tool)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border text-left ${
                      formData.current_tooling.includes(tool)
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-blue-600'
                    }`}
                  >
                    {tool}
                  </button>
                ))}
              </div>
            </div>

            {/* Use Frequency */}
            <div>
              <label className="block text-sm text-gray-300 mb-2 font-medium">
                How often do you publish content?
              </label>
              <select
                value={formData.use_frequency}
                onChange={e => setFormData(p => ({ ...p, use_frequency: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="">Select frequency</option>
                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            {/* Episodes per week */}
            <div>
              <label className="block text-sm text-gray-300 mb-2 font-medium">
                Episodes / videos per week
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={formData.episodes_per_week}
                onChange={e => setFormData(p => ({ ...p, episodes_per_week: e.target.value }))}
                placeholder="1"
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Biggest Pain Point */}
            <div>
              <label className="block text-sm text-gray-300 mb-2 font-medium">
                What&apos;s your biggest frustration with repurposing content today?
              </label>
              <textarea
                rows={3}
                maxLength={1000}
                value={formData.biggest_pain_point}
                onChange={e => setFormData(p => ({ ...p, biggest_pain_point: e.target.value }))}
                placeholder="e.g. It takes too long, tools are too expensive, AI picks the wrong moments…"
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
              />
            </div>

            {/* Current Workflow */}
            <div>
              <label className="block text-sm text-gray-300 mb-2 font-medium">
                How do you currently repurpose content? (tools, VA, manual?)
              </label>
              <textarea
                rows={2}
                maxLength={1000}
                value={formData.current_workflow}
                onChange={e => setFormData(p => ({ ...p, current_workflow: e.target.value }))}
                placeholder="e.g. I use Opus Clip + Canva manually — takes about 3 hours per episode…"
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
              />
            </div>

            {/* Error */}
            {status === 'error' && (
              <div className="bg-red-900/40 border border-red-700/50 rounded-xl px-4 py-3 text-red-300 text-sm">
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg transition-all transform hover:scale-[1.01]"
            >
              {status === 'loading' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Joining…
                </span>
              ) : (
                "⚡ Join the Waitlist — It's Free"
              )}
            </button>

            <p className="text-center text-gray-500 text-xs">
              No spam, ever. Unsubscribe anytime. Early access + product updates only.
            </p>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-2xl">⚡</span>
          <span className="text-white font-bold">ClipSpark</span>
        </div>
        <p className="text-gray-500 text-sm">Built for nano-creators who record weekly and grow slowly.</p>
      </footer>
    </div>
  )
}
