import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

interface Job {
  id: string
  url: string
  flow_description: string
  tier: string
  status: string
  created_at: string
  buyer_email: string
  ai_summary: string | null
  buyer_rating: number | null
}

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: job } = await supabase
    .from('test_jobs')
    .select('*')
    .eq('id', params.id)
    .eq('buyer_id', user.id)
    .single()

  if (!job) notFound()

  const { data: bugs } = await supabase
    .from('bugs')
    .select('*')
    .eq('job_id', job.id)
    .order('logged_at', { ascending: true })

  const { data: networkRequests } = await supabase
    .from('network_requests')
    .select('*')
    .eq('job_id', job.id)
    .order('captured_at', { ascending: true })

  const { data: consoleLogs } = await supabase
    .from('console_logs')
    .select('*')
    .eq('job_id', job.id)
    .order('captured_at', { ascending: true })

  const statusLabel: Record<string, string> = {
    queued: '⏳ Queued — waiting for tester assignment',
    assigned: '👤 Assigned — tester preparing',
    in_progress: '🔍 In progress — tester is running your app',
    tester_complete: '✅ Tester done — generating AI report',
    report_ready: '📋 Report ready',
  }

  const j = job as Job

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-indigo-600 font-bold text-lg">AgentQA</Link>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900 truncate max-w-lg">{j.url}</h1>
              <p className="text-sm text-gray-400 mt-1">Submitted {new Date(j.created_at).toLocaleString()}</p>
            </div>
            <span className={`text-xs font-medium px-3 py-1.5 rounded-full capitalize ${
              j.tier === 'quick' ? 'bg-green-100 text-green-700' :
              j.tier === 'standard' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
            }`}>{j.tier}</span>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">Test flows</p>
            <p className="text-sm text-gray-600">{j.flow_description}</p>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <div className="text-lg">{statusLabel[j.status]?.split(' ')[0]}</div>
            <p className="text-sm text-gray-600">{statusLabel[j.status]?.slice(2)}</p>
          </div>
        </div>

        {/* AI Summary */}
        {j.ai_summary && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 mb-6">
            <h2 className="font-semibold text-indigo-900 mb-3">🤖 AI Summary</h2>
            <p className="text-sm text-indigo-800 leading-relaxed">{j.ai_summary}</p>
            <button
              onClick={() => navigator.clipboard.writeText(j.ai_summary || '')}
              className="mt-4 text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-300 px-3 py-1.5 rounded-lg"
            >
              Copy for AI agent
            </button>
          </div>
        )}

        {/* Bugs */}
        {bugs && bugs.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">🐛 Bugs Found ({bugs.length})</h2>
            <div className="space-y-3">
              {bugs.map((bug: { id: string; severity: string; title: string; description: string }) => (
                <div key={bug.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      bug.severity === 'P0' ? 'bg-red-100 text-red-700' :
                      bug.severity === 'P1' ? 'bg-orange-100 text-orange-700' :
                      bug.severity === 'P2' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                    }`}>{bug.severity}</span>
                    <span className="text-sm font-medium text-gray-900">{bug.title}</span>
                  </div>
                  <p className="text-sm text-gray-600">{bug.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Network Requests */}
        {networkRequests && networkRequests.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">🌐 Network Requests ({networkRequests.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="text-left py-2 font-medium">Method</th>
                    <th className="text-left py-2 font-medium">URL</th>
                    <th className="text-left py-2 font-medium">Status</th>
                    <th className="text-left py-2 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {networkRequests.map((req: { id: string; method: string; url: string; status_code: number; response_time_ms: number }) => (
                    <tr key={req.id} className={`border-b border-gray-50 ${req.status_code >= 400 ? 'bg-red-50' : ''}`}>
                      <td className="py-1.5 font-mono">{req.method}</td>
                      <td className="py-1.5 font-mono truncate max-w-xs">{req.url}</td>
                      <td className={`py-1.5 font-mono font-bold ${req.status_code >= 400 ? 'text-red-600' : 'text-green-600'}`}>{req.status_code}</td>
                      <td className="py-1.5 text-gray-400">{req.response_time_ms}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Console Logs */}
        {consoleLogs && consoleLogs.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="font-semibold text-gray-900 mb-4">💻 Console Output ({consoleLogs.length})</h2>
            <div className="bg-gray-900 rounded-lg p-4 max-h-60 overflow-y-auto font-mono text-xs">
              {consoleLogs.map((log: { id: string; level: string; message: string; captured_at: string }) => (
                <div key={log.id} className={`mb-1 ${
                  log.level === 'error' ? 'text-red-400' :
                  log.level === 'warn' ? 'text-yellow-400' : 'text-gray-300'
                }`}>
                  <span className="text-gray-500">[{new Date(log.captured_at).toLocaleTimeString()}]</span>{' '}
                  <span className="uppercase font-bold text-xs">[{log.level}]</span>{' '}
                  {log.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {j.status === 'queued' && (
          <div className="mt-6 text-center text-sm text-gray-400">
            Your test is in the queue. You&apos;ll receive an email when the report is ready.
          </div>
        )}
      </main>
    </div>
  )
}
