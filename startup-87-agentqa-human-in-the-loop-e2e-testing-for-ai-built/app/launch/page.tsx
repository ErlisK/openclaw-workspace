import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'BetaWindow — Press Kit & Launch Assets',
  description: 'Everything you need to cover BetaWindow: screenshots, copy, logo, and product details.',
}

const DEPLOYED = 'https://startup-87-betawindow-human-in-the-loop-e2e-testing-nfkznkrzm.vercel.app'

export default function LaunchPage() {
  const utmBase = `${DEPLOYED}`

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-10">
        <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Press Kit</span>
        <h1 className="text-4xl font-bold mt-4 mb-2">BetaWindow Launch</h1>
        <p className="text-xl text-gray-600">Human QA testing for AI-built apps — starting at $5/test</p>
      </div>

      {/* One-liner */}
      <section className="mb-10 p-6 bg-indigo-50 rounded-xl border border-indigo-100">
        <h2 className="font-bold text-lg mb-2">One-liner</h2>
        <blockquote className="text-xl italic text-indigo-900">
          "Real humans test what AI agents build."
        </blockquote>
      </section>

      {/* What it is */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">What is BetaWindow?</h2>
        <p className="text-gray-700 text-lg leading-relaxed mb-4">
          BetaWindow is a testing marketplace built for the agentic era. AI coding agents (Cursor, Devin, 
          Claude Code, GitHub Copilot Workspace) can now hire vetted human testers to run live end-to-end 
          sessions on apps they build — capturing network logs, console errors, and structured feedback.
        </p>
        <p className="text-gray-700 text-lg leading-relaxed">
          Submit a URL → a human tester claims the job in minutes → they run your app in a sandboxed 
          environment → you receive a timestamped bug report with network logs and console captures.
        </p>
      </section>

      {/* Key Facts */}
      <section className="mb-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Starting price', value: '$5/test' },
          { label: 'Session length', value: '10–30 min' },
          { label: 'Target users', value: 'AI agents + devs' },
          { label: 'Status', value: 'Live 🟢' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-indigo-600">{value}</div>
            <div className="text-sm text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Pricing</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-3 px-4 font-semibold border-b">Tier</th>
                <th className="py-3 px-4 font-semibold border-b">Duration</th>
                <th className="py-3 px-4 font-semibold border-b">Price</th>
                <th className="py-3 px-4 font-semibold border-b">What's included</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3 px-4 font-medium">Quick</td>
                <td className="py-3 px-4">10 minutes</td>
                <td className="py-3 px-4 font-bold">$5</td>
                <td className="py-3 px-4 text-sm text-gray-600">Network log, console errors, 1-page summary</td>
              </tr>
              <tr className="border-b bg-indigo-50">
                <td className="py-3 px-4 font-medium">Standard ⭐</td>
                <td className="py-3 px-4">20 minutes</td>
                <td className="py-3 px-4 font-bold">$10</td>
                <td className="py-3 px-4 text-sm text-gray-600">Full feature walkthrough, annotated screenshots, bug report</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4 font-medium">Deep</td>
                <td className="py-3 px-4">30 minutes</td>
                <td className="py-3 px-4 font-bold">$15</td>
                <td className="py-3 px-4 text-sm text-gray-600">Comprehensive QA, accessibility spot-check, mobile notes, priority SLA</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Tech Stack</h2>
        <div className="flex flex-wrap gap-2">
          {['Next.js 15', 'TypeScript', 'Supabase', 'Stripe', 'PostHog', 'Vercel', 'Playwright E2E'].map(t => (
            <span key={t} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">{t}</span>
          ))}
        </div>
      </section>

      {/* Screenshots */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Screenshots</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { src: '/assets/screenshot-homepage.png', label: 'Homepage' },
            { src: '/assets/screenshot-pricing.png', label: 'Pricing' },
            { src: '/assets/screenshot-marketplace.png', label: 'Marketplace' },
            { src: '/assets/screenshot-docs.png', label: 'Documentation' },
          ].map(({ src, label }) => (
            <a key={src} href={src} target="_blank" rel="noopener noreferrer">
              <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={label} className="w-full h-auto" />
                <div className="p-2 text-sm text-center text-gray-600 bg-gray-50">{label} — click to download</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Logo */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Logo & Brand</h2>
        <div className="flex gap-4 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="BetaWindow Logo" className="h-12" />
          <a href="/logo.svg" download className="text-indigo-600 hover:underline text-sm">Download SVG</a>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="w-full h-10 rounded" style={{ background: '#4F46E5' }} />
            <p className="mt-1 text-gray-600">Primary: #4F46E5</p>
          </div>
          <div>
            <div className="w-full h-10 rounded" style={{ background: '#10B981' }} />
            <p className="mt-1 text-gray-600">Accent: #10B981</p>
          </div>
          <div>
            <div className="w-full h-10 bg-gray-900 rounded" />
            <p className="mt-1 text-gray-600">Dark: #111827</p>
          </div>
        </div>
      </section>

      {/* UTM Links */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Tracked Links</h2>
        <div className="space-y-2 text-sm font-mono bg-gray-50 p-4 rounded-lg">
          {[
            ['Product Hunt', '?utm_source=producthunt&utm_medium=launch&utm_campaign=ph_launch'],
            ['Hacker News', '?utm_source=hackernews&utm_medium=community&utm_campaign=hn_launch'],
            ['Twitter/X', '?utm_source=twitter&utm_medium=social&utm_campaign=twitter_launch'],
            ['Reddit', '?utm_source=reddit&utm_medium=community&utm_campaign=reddit_launch'],
            ['IndieHackers', '?utm_source=indiehackers&utm_medium=community&utm_campaign=ih_launch'],
            ['DEV.to', '?utm_source=devto&utm_medium=article&utm_campaign=devto_launch'],
          ].map(([label, qs]) => (
            <div key={label} className="flex gap-3">
              <span className="text-gray-500 w-28 shrink-0">{label}:</span>
              <a href={`${utmBase}${qs}`} target="_blank" rel="noopener noreferrer" 
                 className="text-indigo-600 hover:underline break-all">
                {DEPLOYED}{qs}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="mb-10 p-6 bg-gray-50 rounded-xl">
        <h2 className="text-xl font-bold mb-2">Media Inquiries</h2>
        <p className="text-gray-600">For press inquiries, partnerships, or coverage: <a href="mailto:scide-founder@agentmail.to" className="text-indigo-600 hover:underline">scide-founder@agentmail.to</a></p>
        <div className="mt-4 flex gap-3">
          <a href={`${utmBase}?utm_source=press&utm_medium=kit&utm_campaign=press_kit`}
             className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
            Visit Live App →
          </a>
          <a href="/docs/how-it-works"
             className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
            Read Docs
          </a>
        </div>
      </section>
    </div>
  )
}
