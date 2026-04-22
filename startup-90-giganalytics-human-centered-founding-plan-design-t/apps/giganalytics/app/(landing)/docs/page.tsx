import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'GigAnalytics help docs — CSV templates, ROI formulas, pricing experiments, and AI limitations.',
}

const DOCS = [
  {
    href: '/docs/csv-templates',
    icon: '📄',
    title: 'CSV Import Templates',
    desc: 'Download ready-to-use templates for Stripe, PayPal, Upwork, Fiverr, and generic freelance income.',
    badge: null,
  },
  {
    href: '/docs/roi-formulas',
    icon: '📐',
    title: 'ROI Formulas',
    desc: 'Exact formulas used to compute true hourly rate, net revenue, acquisition ROI, and platform fee impact.',
    badge: null,
  },
  {
    href: '/docs/pricing-experiments',
    icon: '🧪',
    title: 'Pricing Experiments',
    desc: 'How A/B pricing experiments work, what the Pricing Lab measures, and how to interpret results.',
    badge: null,
  },
  {
    href: '/docs/ai-limitations',
    icon: '🤖',
    title: 'AI Insights & Limitations',
    desc: 'What the AI can and cannot do, confidence levels, data quality thresholds, and when to trust it.',
    badge: 'Important',
  },
  {
    href: '/docs/heatmap-guide',
    icon: '🗓️',
    title: 'Earnings Heatmap Guide',
    desc: 'How the earnings heatmap is calculated, how to filter it, and how to act on the patterns it reveals.',
    badge: 'Advanced',
  },
  {
    href: '/docs/benchmark-data',
    icon: '📊',
    title: 'Benchmark Dataset',
    desc: 'How GigAnalytics collects, anonymizes, and surfaces the freelancer benchmark data that powers rate comparisons.',
    badge: 'Advanced',
  },
  {
    href: '/docs/roi-whitepaper',
    icon: '📋',
    title: 'ROI Methodology Whitepaper',
    desc: 'Complete mathematical framework: true hourly rate, acquisition ROI, comparison index, pricing projections, and statistical significance.',
    badge: 'Whitepaper',
  },
  {
    href: '/docs/privacy-benchmarking',
    icon: '🔒',
    title: 'Privacy & Benchmarking Explainer',
    desc: 'How GigAnalytics protects your data — k-anonymity (k=25), differential privacy (ε=0.5), data flows, and user controls.',
    badge: 'Privacy',
  },
  {
    href: '/docs/integration-roadmap',
    icon: '🔌',
    title: 'Integration Roadmap',
    desc: 'Live integrations, Stripe Connect OAuth, Google Calendar OAuth, and the full upcoming integration pipeline.',
    badge: 'Roadmap',
  },
]

export default function DocsIndexPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <div className="mb-10">
        <h1 className="text-2xl font-bold mb-2">Documentation</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Everything you need to get the most out of GigAnalytics.
        </p>
      </div>

      <div className="grid gap-4">
        {DOCS.map(doc => (
          <Link
            key={doc.href}
            href={doc.href}
            className="group flex items-start gap-4 p-5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all bg-white dark:bg-gray-900"
          >
            <span className="text-2xl mt-0.5">{doc.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {doc.title}
                </span>
                {doc.badge && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                    {doc.badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{doc.desc}</p>
            </div>
            <span className="text-gray-400 group-hover:text-blue-500 mt-1">→</span>
          </Link>
        ))}
      </div>

      <div className="mt-12 p-5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <h2 className="font-medium mb-2 text-sm">Still have questions?</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <a
            href="mailto:hello@hourlyroi.com?subject=GigAnalytics%20Support"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 hover:border-blue-400 transition-colors"
          >
            ✉️ Email support
          </a>
          <a
            href="https://github.com/ErlisK/openclaw-workspace/issues/new?template=bug_report.md&labels=giganalytics"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 hover:border-blue-400 transition-colors"
          >
            🐛 Report a bug
          </a>
          <a
            href="https://github.com/ErlisK/openclaw-workspace/issues/new?template=feature_request.md&labels=giganalytics,enhancement"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 hover:border-blue-400 transition-colors"
          >
            💡 Request a feature
          </a>
        </div>
      </div>

      <footer className="mt-12 pt-6 border-t text-xs text-gray-400">
        <Link href="/" className="underline">← Back to GigAnalytics</Link>
        {' · '}
        <Link href="/privacy" className="underline">Privacy Policy</Link>
      </footer>
    </main>
  )
}
