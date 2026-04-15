import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

type FeedbackRow = {
  id: string
  user_id: string | null
  rating: number | null
  comment: string | null
  category: string | null
  page: string | null
  url: string | null
  created_at: string
}

async function getFeedback(category?: string): Promise<{ rows: FeedbackRow[]; counts: Record<string, number> }> {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  // Get counts per category
  const { data: allRows } = await admin
    .from('platform_feedback')
    .select('category')

  const counts: Record<string, number> = { all: 0, bug: 0, feature: 0, general: 0, praise: 0 }
  ;(allRows ?? []).forEach((r: { category: string | null }) => {
    counts.all++
    const cat = r.category ?? 'general'
    counts[cat] = (counts[cat] ?? 0) + 1
  })

  // Get paginated rows
  let query = admin
    .from('platform_feedback')
    .select('id, user_id, rating, comment, category, page, url, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  const { data: rows } = await query
  return { rows: rows ?? [], counts }
}

const CATEGORY_COLORS: Record<string, string> = {
  bug: 'bg-red-100 text-red-700',
  feature: 'bg-blue-100 text-blue-700',
  general: 'bg-gray-100 text-gray-700',
  praise: 'bg-green-100 text-green-700',
}

const CATEGORY_EMOJI: Record<string, string> = {
  bug: '🐛', feature: '💡', general: '💬', praise: '🙌',
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-gray-300 text-xs">—</span>
  return (
    <span className="text-yellow-400 text-sm">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  )
}

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const activeCategory = params.category ?? 'all'
  const { rows, counts } = await getFeedback(activeCategory)

  const TABS = [
    { value: 'all', label: 'All' },
    { value: 'bug', label: '🐛 Bugs' },
    { value: 'feature', label: '💡 Features' },
    { value: 'general', label: '💬 General' },
    { value: 'praise', label: '🙌 Praise' },
  ]

  return (
    <div className="min-h-screen bg-gray-50" data-testid="admin-feedback-page">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">← Admin</Link>
          <h1 className="text-lg font-semibold text-gray-900">Platform Feedback</h1>
        </div>
        <span className="text-sm text-gray-500">{counts.all} total submissions</span>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {(['bug', 'feature', 'general', 'praise'] as const).map(cat => (
            <div key={cat} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span>{CATEGORY_EMOJI[cat]}</span>
                <span className="text-sm font-medium text-gray-700 capitalize">{cat}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900" data-testid={`stat-${cat}`}>
                {counts[cat] ?? 0}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map(tab => (
            <Link
              key={tab.value}
              href={`/admin/feedback?category=${tab.value}`}
              data-testid={`tab-${tab.value}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === tab.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-70">({counts[tab.value] ?? 0})</span>
            </Link>
          ))}
        </div>

        {/* Table */}
        {rows.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400 text-sm">No feedback yet in this category.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">When</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rating</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Comment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Page</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row: FeedbackRow) => (
                  <tr key={row.id} className="hover:bg-gray-50" data-testid="feedback-row">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(row.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[row.category ?? 'general']}`}>
                        {CATEGORY_EMOJI[row.category ?? 'general']} {row.category ?? 'general'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StarRating rating={row.rating} />
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {row.comment ? (
                        <p className="text-gray-700 truncate" title={row.comment}>{row.comment}</p>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.page ? (
                        <span className="text-xs text-gray-500 font-mono truncate max-w-[120px] block">{row.page}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                      {row.user_id ? row.user_id.slice(0, 8) + '…' : 'anon'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
