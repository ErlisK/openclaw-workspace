'use client'
import { useState } from 'react'

interface Session {
  id: string
  title: string
  status: string
}

export default function RecruitWidgetEmbed({
  projectId,
  projectName,
  sessions,
}: {
  projectId: string
  projectName: string
  sessions: Session[]
}) {
  const [copied, setCopied] = useState<'link' | 'embed' | null>(null)
  const activeSessions = sessions.filter((s) => s.status === 'recruiting' || s.status === 'scheduled')
  const firstSession = activeSessions[0]

  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://playtestflow.vercel.app'

  const recruitLink = firstSession
    ? `${baseUrl}/recruit/${firstSession.id}`
    : `${baseUrl}/recruit/project/${projectId}`

  const embedCode = `<!-- PlaytestFlow Recruit Widget -->
<iframe
  src="${recruitLink}?embed=1"
  width="100%"
  height="420"
  frameborder="0"
  style="border-radius:12px;border:1px solid rgba(255,255,255,0.1);"
  title="Playtest ${projectName}"
></iframe>`

  function copy(text: string, type: 'link' | 'embed') {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
      {activeSessions.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-400 text-sm">
            Create a session with status <strong className="text-white">recruiting</strong> to activate the recruit widget.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-green-400">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            {activeSessions.length} session{activeSessions.length > 1 ? 's' : ''} actively recruiting
          </div>

          {/* Recruit link */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Share link</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={recruitLink}
                className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-xs text-gray-300 font-mono focus:outline-none"
              />
              <button
                onClick={() => copy(recruitLink, 'link')}
                className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/40 border border-orange-500/30 text-orange-400 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
              >
                {copied === 'link' ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Embed code */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Embed on your site</label>
            <div className="relative">
              <pre className="bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
                {embedCode}
              </pre>
              <button
                onClick={() => copy(embedCode, 'embed')}
                className="absolute top-2 right-2 px-3 py-1 bg-orange-500/20 hover:bg-orange-500/40 border border-orange-500/30 text-orange-400 rounded text-xs font-medium transition-colors"
              >
                {copied === 'embed' ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Active sessions */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Widget points to</label>
            <div className="space-y-2">
              {activeSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
                >
                  <span className="text-sm text-white">{s.title}</span>
                  <code className="text-xs text-gray-500 font-mono">/recruit/{s.id.slice(0, 8)}…</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
