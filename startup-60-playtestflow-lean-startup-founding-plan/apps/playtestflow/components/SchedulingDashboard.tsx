'use client'

import { useState } from 'react'

interface Session {
  id: string
  title: string
  status: string
  scheduled_at: string | null
  duration_minutes: number | null
  platform: string | null
  meeting_url: string | null
  max_testers: number
  signup_count: number
  availability_responses: number
  emails_sent: number
  projects: { name: string; id: string } | null
}

interface Props {
  sessions: Session[]
  siteUrl: string
}

const STATUS_COLORS: Record<string, string> = {
  recruiting: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  scheduled: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
  running: 'bg-green-500/15 text-green-300 border-green-500/25',
  completed: 'bg-gray-500/15 text-gray-400 border-gray-500/25',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/25',
  draft: 'bg-gray-500/15 text-gray-500 border-gray-500/20',
}

const EMAIL_TYPES = [
  { value: 'availability_request', label: '📅 Availability request', desc: 'Ask when testers are free' },
  { value: 'scheduling_update', label: '🗓 Scheduling update', desc: 'Session is confirmed — send calendar invite' },
  { value: 'confirmation', label: '✅ Confirmation', desc: 'Confirm attendance + consent reminder' },
  { value: 'reminder', label: '⏰ Reminder', desc: 'Day-before reminder with meeting link' },
  { value: 'post_session', label: '📝 Post-session', desc: 'Request feedback after session ends' },
]

export default function SchedulingDashboard({ sessions, siteUrl }: Props) {
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [emailType, setEmailType] = useState('confirmation')
  const [customMsg, setCustomMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)
  const [error, setError] = useState('')
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  async function sendEmails(sessionId: string) {
    setSending(true)
    setResult(null)
    setError('')

    try {
      const res = await fetch(`/api/sessions/${sessionId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailType, customMessage: customMsg || undefined }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message ?? 'Send failed')
      setResult({ sent: data.sent, failed: data.failed })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  async function copyLink(text: string, id: string) {
    await navigator.clipboard.writeText(text)
    setCopiedLink(id)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const session = selectedSession ? sessions.find(s => s.id === selectedSession) : null

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* Session list */}
      <div className="lg:col-span-2 space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Sessions</h2>
        {sessions.map(s => (
          <button
            key={s.id}
            onClick={() => { setSelectedSession(s.id); setResult(null); setError('') }}
            className={`w-full text-left bg-white/4 border rounded-xl p-4 transition-colors ${
              selectedSession === s.id ? 'border-orange-500/50 bg-orange-500/5' : 'border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="font-medium text-sm line-clamp-1">{s.title}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${STATUS_COLORS[s.status] ?? STATUS_COLORS.draft}`}>
                {s.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-2">{s.projects?.name}</p>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span>👥 {s.signup_count}/{s.max_testers}</span>
              <span>📅 {s.availability_responses} avail.</span>
              <span>📧 {s.emails_sent} sent</span>
            </div>
            {s.scheduled_at && (
              <p className="text-xs text-gray-600 mt-1">
                {new Date(s.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} UTC
              </p>
            )}
          </button>
        ))}
      </div>

      {/* Action panel */}
      <div className="lg:col-span-3 space-y-5">
        {!session ? (
          <div className="bg-white/4 border border-white/10 rounded-2xl p-8 text-center text-gray-500">
            Select a session to manage scheduling &amp; notifications
          </div>
        ) : (
          <>
            <div className="bg-white/4 border border-white/10 rounded-2xl p-5">
              <h2 className="font-bold mb-1">{session.title}</h2>
              <p className="text-gray-400 text-sm">{session.projects?.name}</p>
              {session.scheduled_at && (
                <p className="text-sm mt-2">
                  📅 {new Date(session.scheduled_at).toLocaleString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short'
                  })}
                </p>
              )}
            </div>

            {/* Quick links */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Quick Links</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {[
                  { label: '📅 Availability picker', url: `${siteUrl}/availability/${session.id}`, id: 'avail' },
                  { label: '📥 Download ICS', url: `${siteUrl}/api/sessions/${session.id}/ics`, id: 'ics' },
                  { label: '🔗 Recruit link', url: `${siteUrl}/recruit/${session.id}`, id: 'recruit' },
                  session.meeting_url ? { label: '📹 Meeting link', url: session.meeting_url, id: 'meeting' } : null,
                ].filter(Boolean).map((link: any) => (
                  <div key={link.id} className="flex items-center gap-2 bg-white/4 border border-white/10 rounded-xl px-3 py-2">
                    <span className="text-xs text-gray-300 flex-1 truncate">{link.label}</span>
                    <button
                      onClick={() => copyLink(link.url, link.id)}
                      className="text-xs text-orange-400 hover:text-orange-300 shrink-0"
                    >
                      {copiedLink === link.id ? '✓ Copied' : 'Copy'}
                    </button>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-gray-300">↗</a>
                  </div>
                ))}
              </div>
            </div>

            {/* Google Calendar deep link */}
            {session.scheduled_at && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Calendar Links</h3>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={buildGoogleCalLink(session)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-3 py-2 rounded-lg transition-colors"
                  >
                    📅 Add to Google Calendar
                  </a>
                  <a
                    href={buildOutlookCalLink(session)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-3 py-2 rounded-lg transition-colors"
                  >
                    📅 Add to Outlook
                  </a>
                  <a
                    href={`${siteUrl}/api/sessions/${session.id}/ics`}
                    className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-3 py-2 rounded-lg transition-colors"
                  >
                    📥 Download .ICS
                  </a>
                </div>
              </div>
            )}

            {/* Email sender */}
            <div className="bg-white/4 border border-white/10 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Send Email</h3>
              
              <div className="space-y-2">
                {EMAIL_TYPES.map(et => (
                  <label
                    key={et.value}
                    className={`flex items-start gap-3 cursor-pointer border rounded-xl p-3 transition-colors ${
                      emailType === et.value ? 'border-orange-500/40 bg-orange-500/5' : 'border-white/8 hover:border-white/15'
                    }`}
                  >
                    <input
                      type="radio"
                      value={et.value}
                      checked={emailType === et.value}
                      onChange={e => setEmailType(e.target.value)}
                      className="accent-orange-500 mt-0.5 shrink-0"
                    />
                    <div>
                      <span className="text-sm font-medium">{et.label}</span>
                      <p className="text-xs text-gray-500">{et.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              {(emailType === 'scheduling_update') && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Custom message (optional)</label>
                  <textarea
                    value={customMsg}
                    onChange={e => setCustomMsg(e.target.value)}
                    rows={2}
                    placeholder="e.g. We found a time that works for most of you!"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm resize-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Will send to {
                    emailType === 'post_session' ? 'attended testers' :
                    emailType === 'availability_request' ? 'registered + confirmed testers' :
                    'confirmed + registered testers'
                  }
                </p>
                <button
                  onClick={() => sendEmails(session.id)}
                  disabled={sending}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  {sending ? 'Sending…' : 'Send Emails'}
                </button>
              </div>

              {result && (
                <div className={`text-sm px-4 py-3 rounded-xl border ${
                  result.failed > 0 ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300' : 'bg-green-500/10 border-green-500/20 text-green-300'
                }`}>
                  ✓ {result.sent} sent{result.failed > 0 ? `, ${result.failed} failed` : ''}
                </div>
              )}
              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Calendar link builders (client-side) ─────────────────────────────────────

function buildGoogleCalLink(session: Session) {
  if (!session.scheduled_at) return '#'
  const start = new Date(session.scheduled_at)
  const end = new Date(start.getTime() + (session.duration_minutes || 90) * 60000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z')
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: `PlaytestFlow: ${session.title}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `Playtest session — Platform: ${session.platform || 'Online'}${session.meeting_url ? `\nJoin: ${session.meeting_url}` : ''}`,
    location: session.meeting_url || session.platform || 'Online',
  })
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

function buildOutlookCalLink(session: Session) {
  if (!session.scheduled_at) return '#'
  const start = new Date(session.scheduled_at)
  const end = new Date(start.getTime() + (session.duration_minutes || 90) * 60000)
  const p = new URLSearchParams({
    subject: `PlaytestFlow: ${session.title}`,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: `Playtest session via PlaytestFlow.${session.meeting_url ? `\nJoin: ${session.meeting_url}` : ''}`,
    location: session.meeting_url || session.platform || 'Online',
    path: '/calendar/action/compose',
    rru: 'addevent',
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p.toString()}`
}
