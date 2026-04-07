import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminQueuePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    // Allow mentor access too for simplicity in pilot
    if (profile?.role !== 'mentor') redirect('/dashboard')
  }

  // Fetch all clips with review status
  const { data: clips } = await supabase
    .from('clips')
    .select(`
      id, title, status, created_at, duration_seconds, file_size_bytes,
      profiles ( full_name, email, role ),
      trades ( name ),
      reviews ( id, status, reviewer_id, overall_rating, completed_at,
        profiles ( full_name )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  const statusCounts = {
    total: clips?.length || 0,
    pending: clips?.filter(c => c.status === 'pending').length || 0,
    under_review: clips?.filter(c => c.status === 'under_review').length || 0,
    reviewed: clips?.filter(c => c.status === 'reviewed').length || 0,
    rejected: clips?.filter(c => c.status === 'rejected').length || 0,
  }

  const statusColors: Record<string, string> = {
    pending: 'text-yellow-400 bg-yellow-400/10',
    under_review: 'text-blue-400 bg-blue-400/10',
    reviewed: 'text-green-400 bg-green-400/10',
    rejected: 'text-red-400 bg-red-400/10',
    archived: 'text-gray-400 bg-white/5',
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Link href="/" className="text-xl font-black">Cert<span className="text-yellow-400">Clip</span></Link>
        <div className="flex gap-4">
          <Link href="/review" className="text-sm text-yellow-400 hover:underline">Review queue →</Link>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-black mb-2">Admin Queue</h1>
        <p className="text-gray-400 mb-8">All clip submissions and review status</p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          {Object.entries(statusCounts).map(([key, val]) => (
            <div key={key} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-yellow-400">{val}</div>
              <div className="text-xs text-gray-500 capitalize mt-1">{key.replace('_', ' ')}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Clip</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Uploader</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Trade</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Duration</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Size</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Reviewer</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Rating</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {!clips || clips.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-500">No clips yet</td>
                  </tr>
                ) : clips.map((clip: any) => {
                  const review = clip.reviews?.[0]
                  return (
                    <tr key={clip.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium truncate max-w-xs">{clip.title}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-300">{clip.profiles?.full_name || '—'}</div>
                        <div className="text-xs text-gray-600">{clip.profiles?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{clip.trades?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{clip.duration_seconds ? `${clip.duration_seconds}s` : '—'}</td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                        {clip.file_size_bytes ? `${(clip.file_size_bytes / 1024 / 1024).toFixed(1)}MB` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${statusColors[clip.status] || 'text-gray-400'}`}>
                          {clip.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{review?.profiles?.full_name || '—'}</td>
                      <td className="px-4 py-3">
                        {review?.overall_rating ? (
                          <span className="text-yellow-400 font-bold">{review.overall_rating}/5</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(clip.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
