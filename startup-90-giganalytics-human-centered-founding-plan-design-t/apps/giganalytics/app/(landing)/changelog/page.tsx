import { Metadata } from 'next'
import Link from 'next/link'
import { CHANGELOG_ENTRIES } from '@/lib/changelog'

export const metadata: Metadata = {
  title: 'Changelog — GigAnalytics',
  description: 'Every new feature, fix, and improvement to GigAnalytics. Updated with each release.',
}


const tagColors: Record<string, string> = {
  feature: 'bg-blue-100 text-blue-700',
  fix: 'bg-red-100 text-red-700',
  improvement: 'bg-green-100 text-green-700',
  launch: 'bg-purple-100 text-purple-700',
}

export default function ChangelogPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Changelog</h1>
          <p className="text-gray-600 mb-4">Every new feature, fix, and improvement — newest first.</p>
          <a
            href="/api/rss"
            className="inline-flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 border border-orange-200 bg-orange-50 px-3 py-1.5 rounded-full"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19.01 7.38 20 6.18 20C4.98 20 4 19.01 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z"/>
            </svg>
            RSS Feed
          </a>
        </div>

        <div className="space-y-10">
          {CHANGELOG_ENTRIES.map((entry) => (
            <div key={entry.version} className="border-l-2 border-gray-200 pl-6 relative">
              <div className="absolute -left-2 top-1 w-4 h-4 bg-white border-2 border-blue-400 rounded-full"></div>
              <div className="flex items-center gap-3 mb-3">
                <span className="font-mono text-sm font-bold text-gray-900">v{entry.version}</span>
                <span className="text-xs text-gray-400">{entry.date}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tagColors[entry.tag] ?? 'bg-gray-100 text-gray-600'}`}>
                  {entry.tag}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">{entry.title}</h2>
              <ul className="space-y-2">
                {entry.items.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-600">
                    <span className="text-blue-400 flex-shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 border-t border-gray-200 pt-8 text-center text-sm text-gray-500">
          <p>Building in public. Follow <a href="https://twitter.com/giganalytics" className="text-blue-600 hover:underline">@giganalytics</a> for real-time updates.</p>
          <p className="mt-2"><a href="/api/rss" className="text-orange-600 hover:underline">Subscribe via RSS</a></p>
        </div>
      </div>
    </main>
  )
}
