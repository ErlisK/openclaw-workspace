'use client'
import { useState } from 'react'

interface Reward {
  id: string
  code: string
  reward_type: string
  reward_value: string | null
  status: string
}

interface SessionActionsProps {
  sessionId: string
  sessionTitle: string
  meetingUrl?: string | null
  scheduledAt?: string | null
  status: string
  siteUrl: string
  confirmedCount: number
  attendedCount: number
  feedbackCount: number
}

export default function SessionActions({
  sessionId,
  sessionTitle,
  meetingUrl,
  scheduledAt,
  status,
  siteUrl,
  confirmedCount,
  attendedCount,
  feedbackCount,
}: SessionActionsProps) {
  const [sending, setSending] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, { sent: number; failed: number } | null>>({})
  const [copied, setCopied] = useState(false)

  const recruitUrl = `${siteUrl}/recruit/${sessionId}`

  async function sendEmails(type: 'confirmation' | 'reminder' | 'post_session') {
    setSending(type)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailType: type }),
      })
      const data = await res.json()
      setResults((prev) => ({ ...prev, [type]: data }))
    } catch {
      setResults((prev) => ({ ...prev, [type]: null }))
    } finally {
      setSending(null)
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(recruitUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white/4 border border-white/10 rounded-2xl p-5 space-y-5">
      <h2 className="font-semibold text-sm text-gray-300">Session Operations</h2>

      {/* Quick links row */}
      <div className="flex flex-wrap gap-2">
        <a
          href={`/api/sessions/${sessionId}/ics`}
          download
          className="flex items-center gap-1.5 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs px-3 py-2 rounded-lg transition-colors"
        >
          📅 Download .ics
        </a>
        {meetingUrl && (
          <a
            href={meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-300 text-xs px-3 py-2 rounded-lg transition-colors"
          >
            🎥 Open Meeting Link
          </a>
        )}
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-xs px-3 py-2 rounded-lg transition-colors"
        >
          {copied ? '✓ Copied!' : '🔗 Copy Recruit Link'}
        </button>
        <a
          href={`/recruit/${sessionId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 bg-white/8 hover:bg-white/12 border border-white/15 text-gray-300 text-xs px-3 py-2 rounded-lg transition-colors"
        >
          👁 Preview Recruit Page
        </a>
      </div>

      {/* Email actions */}
      <div>
        <p className="text-xs text-gray-500 mb-3">Email tester cohort via AgentMail:</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => sendEmails('confirmation')}
            disabled={sending !== null || confirmedCount === 0}
            className="flex items-center gap-1.5 bg-orange-500/15 hover:bg-orange-500/25 disabled:opacity-40 border border-orange-500/30 text-orange-300 text-xs px-4 py-2 rounded-lg transition-colors"
          >
            {sending === 'confirmation' ? '⏳ Sending…' : `✉️ Send Confirmations (${confirmedCount})`}
          </button>
          <button
            onClick={() => sendEmails('reminder')}
            disabled={sending !== null}
            className="flex items-center gap-1.5 bg-yellow-500/15 hover:bg-yellow-500/25 disabled:opacity-40 border border-yellow-500/30 text-yellow-300 text-xs px-4 py-2 rounded-lg transition-colors"
          >
            {sending === 'reminder' ? '⏳ Sending…' : '⏰ Send Reminder'}
          </button>
          <button
            onClick={() => sendEmails('post_session')}
            disabled={sending !== null || (attendedCount === 0)}
            className="flex items-center gap-1.5 bg-green-500/15 hover:bg-green-500/25 disabled:opacity-40 border border-green-500/30 text-green-300 text-xs px-4 py-2 rounded-lg transition-colors"
          >
            {sending === 'post_session' ? '⏳ Sending…' : `📝 Request Feedback (${attendedCount} attended)`}
          </button>
        </div>
      </div>

      {/* Results */}
      {Object.entries(results).map(([type, result]) =>
        result ? (
          <div key={type} className={`text-xs px-3 py-2 rounded-lg ${result.failed > 0 ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-300' : 'bg-green-500/10 border border-green-500/20 text-green-300'}`}>
            {type}: {result.sent} sent{result.failed > 0 ? `, ${result.failed} failed` : ' ✓'}
            {result.sent === 0 && ' (no eligible signups for this email type)'}
          </div>
        ) : null
      )}
    </div>
  )
}
