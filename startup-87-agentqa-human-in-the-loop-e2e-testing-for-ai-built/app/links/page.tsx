import type { Metadata } from 'next'
import { UTM_LINKS, BASE_URL, buildRedirectUrl } from '@/lib/utm/links'

export const metadata: Metadata = {
  title: 'UTM Link Registry | AgentQA',
  description: 'All UTM-tagged short links for attribution tracking.',
  robots: { index: false },  // don't index admin/internal page
}

const CATEGORIES = ['social', 'community', 'directory', 'email', 'press'] as const

export default function LinksPage() {
  const grouped = CATEGORIES.map((cat) => ({
    cat,
    links: UTM_LINKS.filter((l) => l.category === cat),
  })).filter((g) => g.links.length > 0)

  const catColors: Record<string, string> = {
    social:    'bg-sky-100 text-sky-800',
    community: 'bg-purple-100 text-purple-800',
    directory: 'bg-orange-100 text-orange-800',
    email:     'bg-green-100 text-green-800',
    press:     'bg-gray-100 text-gray-800',
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-10">
        <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
          Attribution
        </span>
        <h1 className="text-4xl font-bold mt-4 mb-2">UTM Short Links</h1>
        <p className="text-gray-600">
          All <code className="text-sm bg-gray-100 px-1 rounded">/r/[slug]</code> redirects with UTM parameters.
          Each click fires a <code className="text-sm bg-gray-100 px-1 rounded">short_link_click</code> event
          in PostHog — both server-side (all requests) and client-side (JS-enabled browsers).
        </p>
        <div className="mt-4 flex gap-3 flex-wrap text-sm">
          <a
            href="https://us.posthog.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-[#F54E00] text-white px-4 py-2 rounded-lg font-medium hover:opacity-90"
          >
            📊 Open PostHog dashboard →
          </a>
          <span className="text-gray-500 self-center">
            Filter by event: <code className="bg-gray-100 px-1 rounded">short_link_click</code>
          </span>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {grouped.map(({ cat, links }) => (
          <a
            key={cat}
            href={`#${cat}`}
            className="border border-gray-200 rounded-xl p-3 text-center hover:border-indigo-300 transition-colors"
          >
            <div className="text-2xl mb-1">
              {cat === 'social' ? '📣' : cat === 'community' ? '💬' : cat === 'directory' ? '📂' : cat === 'email' ? '✉️' : '📰'}
            </div>
            <div className="font-semibold capitalize text-sm">{cat}</div>
            <div className="text-xs text-gray-500">{links.length} links</div>
          </a>
        ))}
      </div>

      {grouped.map(({ cat, links }) => (
        <section key={cat} id={cat} className="mb-12">
          <h2 className="text-xl font-bold capitalize mb-4 flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${catColors[cat]}`}>
              {cat}
            </span>
            {links.length} links
          </h2>
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 w-32">Slug</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Label</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Campaign</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Short URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {links.map((link) => {
                  const short = `${BASE_URL}/r/${link.slug}`
                  const full = buildRedirectUrl(link)
                  return (
                    <tr key={link.slug} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-indigo-700 font-medium">
                        {link.slug}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{link.label}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden md:table-cell">
                        {link.utm_campaign}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <a
                            href={short}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline font-mono text-xs break-all"
                          >
                            /r/{link.slug}
                          </a>
                          <details className="text-xs">
                            <summary className="cursor-pointer text-gray-400 hover:text-gray-600">
                              full UTM URL
                            </summary>
                            <div className="mt-1 text-gray-500 font-mono break-all bg-gray-50 p-2 rounded">
                              {full}
                            </div>
                          </details>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 text-sm">
        <h3 className="font-bold text-indigo-900 mb-2">PostHog Queries to Try</h3>
        <ul className="space-y-2 text-indigo-800">
          <li>• <strong>Insights → Trends</strong>: event = <code>short_link_click</code>, breakdown by <code>utm_campaign</code></li>
          <li>• <strong>Insights → Funnels</strong>: <code>short_link_click</code> → <code>$pageview</code> (pricing) → <code>checkout_started</code></li>
          <li>• <strong>Insights → Paths</strong>: starting from <code>short_link_click</code></li>
          <li>• <strong>Cohorts</strong>: users where <code>utm_source = producthunt</code></li>
        </ul>
      </div>
    </div>
  )
}
