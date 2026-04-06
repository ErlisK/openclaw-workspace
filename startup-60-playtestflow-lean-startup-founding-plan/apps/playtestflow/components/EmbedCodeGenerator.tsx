'use client'
import { useState } from 'react'

interface Session {
  id: string
  title: string
  status: string
  max_testers: number
  platform: string | null
  projects: { name: string } | null
}

export default function EmbedCodeGenerator({ sessions }: { sessions: Session[] }) {
  const [selectedId, setSelectedId] = useState(sessions[0]?.id ?? '')
  const [copied, setCopied] = useState<'script' | 'iframe' | 'link' | null>(null)

  const origin = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://playtestflow.vercel.app'

  const selected = sessions.find((s) => s.id === selectedId)

  const scriptTag = `<div id="ptf-widget-${selectedId}"></div>
<script data-ptf-session="${selectedId}" src="${origin}/api/widget/${selectedId}" async></script>`

  const iframeTag = `<iframe
  src="${origin}/api/widget-preview/${selectedId}"
  width="100%"
  height="360"
  frameborder="0"
  style="border-radius:12px;border:none;"
  title="Sign up for: ${selected?.title ?? 'Playtest Session'}"
></iframe>`

  const directLink = `${origin}/recruit/${selectedId}`

  function copy(text: string, type: 'script' | 'iframe' | 'link') {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type)
      setTimeout(() => setCopied(null), 2500)
    })
  }

  return (
    <div className="space-y-6">
      {/* Session selector */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Choose a session to embed
        </label>
        <div className="space-y-2">
          {sessions.map((s) => (
            <label
              key={s.id}
              className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-colors border ${
                selectedId === s.id
                  ? 'bg-orange-500/10 border-orange-500/40'
                  : 'bg-white/[0.02] border-white/10 hover:border-white/20'
              }`}
            >
              <input
                type="radio"
                name="session"
                value={s.id}
                checked={selectedId === s.id}
                onChange={() => setSelectedId(s.id)}
                className="accent-orange-500"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{s.title}</div>
                <div className="text-xs text-gray-500">
                  {s.projects?.name}
                  {s.platform ? ` · ${s.platform}` : ''}
                  {` · ${s.max_testers} max testers`}
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${
                s.status === 'recruiting'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
              }`}>
                {s.status}
              </span>
            </label>
          ))}
        </div>
      </div>

      {selectedId && (
        <>
          {/* Option 1: Script tag */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h3 className="font-semibold text-sm">Option 1: Script Tag</h3>
                <p className="text-gray-500 text-xs mt-0.5">
                  Recommended. Renders inline, matches your page's width. Works on any HTML page.
                </p>
              </div>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">
                Recommended
              </span>
            </div>
            <div className="relative mt-3">
              <pre className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs text-orange-300 overflow-x-auto whitespace-pre">
                {scriptTag}
              </pre>
              <button
                onClick={() => copy(scriptTag, 'script')}
                className="absolute top-2 right-2 px-3 py-1 bg-orange-500/20 hover:bg-orange-500/40 border border-orange-500/30 text-orange-400 rounded text-xs font-medium transition-colors"
              >
                {copied === 'script' ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Paste before <code className="text-gray-500">&lt;/body&gt;</code> or anywhere in your page content.
            </p>
          </div>

          {/* Option 2: iframe */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="font-semibold text-sm mb-0.5">Option 2: iFrame Embed</h3>
            <p className="text-gray-500 text-xs mb-3">
              Safer for CMS platforms (WordPress, Squarespace, itch.io) that block script tags.
            </p>
            <div className="relative">
              <pre className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs text-blue-300 overflow-x-auto whitespace-pre">
                {iframeTag}
              </pre>
              <button
                onClick={() => copy(iframeTag, 'iframe')}
                className="absolute top-2 right-2 px-3 py-1 bg-orange-500/20 hover:bg-orange-500/40 border border-orange-500/30 text-orange-400 rounded text-xs font-medium transition-colors"
              >
                {copied === 'iframe' ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Option 3: Direct link */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="font-semibold text-sm mb-0.5">Option 3: Direct Link</h3>
            <p className="text-gray-500 text-xs mb-3">
              Share anywhere — email, Discord, newsletter, social. Opens the full signup page.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={directLink}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 font-mono focus:outline-none"
              />
              <button
                onClick={() => copy(directLink, 'link')}
                className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/40 border border-orange-500/30 text-orange-400 rounded-lg text-xs font-medium transition-colors"
              >
                {copied === 'link' ? '✓ Copied!' : 'Copy'}
              </button>
              <a
                href={directLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border border-white/20 hover:border-white/40 text-gray-400 hover:text-white rounded-lg text-xs font-medium transition-colors"
              >
                Open ↗
              </a>
            </div>
          </div>

          {/* Live preview */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="font-semibold text-sm mb-3">Live Preview</h3>
            <p className="text-gray-500 text-xs mb-4">
              This is exactly what testers will see when they visit your widget.
            </p>
            <div className="bg-gray-900 rounded-xl p-4">
              <iframe
                src={`${origin}/api/widget-preview/${selectedId}`}
                width="100%"
                height="400"
                frameBorder="0"
                title="Widget preview"
                className="rounded-xl"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
