import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Press Kit — TeachRepo',
  description: 'Logos, screenshots, product copy, and brand guidelines for TeachRepo.',
};

const ASSETS = [
  { name: 'Logo SVG', file: '/assets/logo.svg', desc: 'Scalable vector logo — all uses', ext: 'SVG' },
  { name: 'Logo 192px', file: '/assets/logo-192.png', desc: 'PNG for social profiles / PWA icons', ext: 'PNG' },
  { name: 'Logo 512px', file: '/assets/logo-512.png', desc: 'PNG for large displays / print', ext: 'PNG' },
  { name: 'OG Cover 1200×630', file: '/assets/og-cover.png', desc: 'Open Graph / Facebook card', ext: 'PNG' },
  { name: 'Twitter Card 1200×600', file: '/assets/twitter-card.png', desc: 'Twitter summary_large_image', ext: 'PNG' },
  { name: 'Demo GIF', file: '/assets/demo-flow.gif', desc: '~30s animated product walkthrough', ext: 'GIF' },
  { name: 'Screenshot — Homepage', file: '/assets/screenshot-homepage.png', desc: '1280×800 browser screenshot', ext: 'PNG' },
  { name: 'Screenshot — Marketplace', file: '/assets/screenshot-marketplace.png', desc: '1280×800 browser screenshot', ext: 'PNG' },
  { name: 'Screenshot — Course', file: '/assets/screenshot-course.png', desc: '1280×800 browser screenshot', ext: 'PNG' },
  { name: 'Screenshot — Lesson', file: '/assets/screenshot-lesson.png', desc: '1280×800 browser screenshot', ext: 'PNG' },
  { name: 'Screenshot — Docs', file: '/assets/screenshot-docs.png', desc: '1280×800 browser screenshot', ext: 'PNG' },
];

const COLORS = [
  { name: 'Violet Primary', hex: '#7C3AED', usage: 'CTAs, logo, links' },
  { name: 'Violet Dark', hex: '#6D28D9', usage: 'Hover states' },
  { name: 'Violet Light', hex: '#A78BFA', usage: 'Accents, highlights' },
  { name: 'Gray 900', hex: '#111827', usage: 'Body text, headings' },
  { name: 'Gray 500', hex: '#6B7280', usage: 'Secondary text' },
  { name: 'Green 500', hex: '#10B981', usage: 'Free / success badges' },
];

const FEATURES = [
  '📁 Markdown-native authoring — write lessons alongside your code',
  '🔒 Stripe checkout built-in — zero configuration',
  '🧩 Auto-graded quizzes via YAML frontmatter',
  '📦 Gated StackBlitz/CodeSandbox embeds unlocked on purchase',
  '🌿 Git-versioned — every push updates your course automatically',
  '🔗 Built-in affiliate tracking — share revenue with promoters',
  '🆓 Free tier: self-host and keep 100% of revenue',
  '☁️  Hosted SaaS: one-click Vercel deploy + marketplace listing',
];

export default function PressPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 to-violet-800 py-16 px-6 text-center">
        <h1 className="text-4xl font-black text-white mb-3">Press Kit</h1>
        <p className="text-violet-200 text-lg max-w-xl mx-auto">
          Logos, screenshots, brand colours, and product copy for TeachRepo.
          Use freely for editorial coverage.
        </p>
        <p className="mt-4 text-violet-300 text-sm">
          Questions? <a href="mailto:hello@teachrepo.com" className="underline text-white">hello@teachrepo.com</a>
        </p>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-14 space-y-16">

        {/* Taglines */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Taglines &amp; Copy</h2>
          <div className="space-y-4">
            {[
              { label: 'Headline', text: 'Turn any GitHub repo into a paywalled course — in minutes.' },
              { label: 'Sub-headline', text: 'Write lessons in Markdown, push to git, sell with Stripe. No drag-and-drop, no lock-in.' },
              { label: 'One-liner', text: 'Git-native course platform for engineers. Markdown → paywalled course in minutes.' },
              { label: 'Twitter bio', text: 'Ship courses like you ship code. Markdown + Git + Stripe. Free tier forever. teachrepo.com' },
            ].map(({ label, text }) => (
              <div key={label} className="rounded-xl border border-gray-200 p-4">
                <span className="text-xs font-semibold text-violet-600 uppercase tracking-wider">{label}</span>
                <p className="mt-1 text-gray-800 font-medium">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature bullets */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Feature Bullets</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <li key={f} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                {f}
              </li>
            ))}
          </ul>
        </section>

        {/* Colors */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Brand Colours</h2>
          <div className="flex flex-wrap gap-4">
            {COLORS.map(({ name, hex, usage }) => (
              <div key={hex} className="rounded-xl border border-gray-200 overflow-hidden w-44">
                <div className="h-16 w-full" style={{ background: hex }} />
                <div className="p-3">
                  <p className="font-semibold text-gray-900 text-sm">{name}</p>
                  <p className="text-xs font-mono text-gray-500 mt-0.5">{hex}</p>
                  <p className="text-xs text-gray-400 mt-1">{usage}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Demo GIF */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Demo</h2>
          <p className="text-gray-500 text-sm mb-4">~30 second walkthrough of the repo-to-course flow.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/demo-flow.gif"
            alt="TeachRepo demo — repo to course flow"
            className="rounded-2xl border border-gray-200 shadow-sm w-full max-w-3xl"
          />
          <a
            href="/assets/demo-flow.gif"
            download
            className="mt-3 inline-block rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            ↓ Download GIF
          </a>
        </section>

        {/* Screenshots */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Screenshots</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {ASSETS.filter((a) => a.name.startsWith('Screenshot')).map(({ name, file, desc }) => (
              <div key={file} className="rounded-2xl border border-gray-200 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={file} alt={name} className="w-full" />
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{name}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                  <a href={file} download className="text-violet-600 text-xs font-semibold hover:underline">↓ Download</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Asset downloads */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Logo &amp; Asset Downloads</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-semibold text-gray-700">Asset</th>
                  <th className="text-left py-2 pr-4 font-semibold text-gray-700">Format</th>
                  <th className="text-left py-2 font-semibold text-gray-700">Description</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {ASSETS.filter((a) => !a.name.startsWith('Screenshot')).map(({ name, file, desc, ext }) => (
                  <tr key={file} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 pr-4 font-medium text-gray-900">{name}</td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-600">{ext}</span>
                    </td>
                    <td className="py-3 text-gray-500">{desc}</td>
                    <td className="py-3 text-right">
                      <a href={file} download className="text-violet-600 text-xs font-semibold hover:underline">↓ Download</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-sm text-gray-400 pt-8 border-t border-gray-100">
          <p>All assets are free to use for editorial and press coverage of TeachRepo.</p>
          <p className="mt-1">
            Contact: <a href="mailto:hello@teachrepo.com" className="text-violet-600 hover:underline">hello@teachrepo.com</a>
            {' · '}<a href="https://teachrepo.com" className="text-violet-600 hover:underline">teachrepo.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
