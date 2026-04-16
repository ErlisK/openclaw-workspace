'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { BrowserEvent } from '@/lib/browser-session-manager'

interface Props {
  sessionId: string
  jobUrl: string
  onEvent: (event: BrowserEvent) => void
  onStatusChange?: (status: 'starting' | 'running' | 'error' | 'stopped') => void
  onUrlChange?: (url: string) => void
}

const POLL_INTERVAL_MS = 800 // ~1.25fps screenshot refresh
const VIEWPORT_W = 1280
const VIEWPORT_H = 800

export default function BrowserViewer({ sessionId, jobUrl, onEvent, onStatusChange, onUrlChange }: Props) {
  const [status, setStatus] = useState<'starting' | 'running' | 'error' | 'stopped'>('starting')
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [currentUrl, setCurrentUrl] = useState(jobUrl)
  const [addressBar, setAddressBar] = useState(jobUrl)
  const [error, setError] = useState<string | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedRef = useRef(false)

  const updateStatus = useCallback((s: typeof status) => {
    setStatus(s)
    onStatusChange?.(s)
  }, [onStatusChange])

  // ── Start browser session ───────────────────────────────────────────
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    async function start() {
      try {
        const res = await fetch('/api/browser/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, jobUrl, viewportWidth: VIEWPORT_W, viewportHeight: VIEWPORT_H }),
        })
        const data = await res.json()
        if (!res.ok || !data.ok) {
          setError(data.error ?? 'Failed to start browser session')
          updateStatus('error')
          return
        }
        updateStatus('running')
      } catch (err) {
        setError(String(err))
        updateStatus('error')
      }
    }

    start()

    return () => {
      // Stop browser session when component unmounts
      fetch('/api/browser/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch(() => { /* best-effort */ })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Screenshot polling ─────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'running') return

    async function poll() {
      try {
        const res = await fetch(`/api/browser/screenshot?sessionId=${encodeURIComponent(sessionId)}`)
        if (!res.ok) return
        const data = await res.json()

        if (data.screenshot) {
          setScreenshot(data.screenshot)
        }
        if (data.url && data.url !== currentUrl) {
          setCurrentUrl(data.url)
          setAddressBar(data.url)
          onUrlChange?.(data.url)
        }
        if (data.events?.length) {
          for (const ev of data.events) {
            onEvent(ev)
          }
        }
      } catch {
        // ignore transient errors
      }
    }

    pollRef.current = setInterval(poll, POLL_INTERVAL_MS)
    poll() // immediate first poll
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, sessionId])

  // ── Click handler — maps to browser coordinates ────────────────────
  const handleClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    if (status !== 'running') return
    const rect = e.currentTarget.getBoundingClientRect()
    const scaleX = VIEWPORT_W / rect.width
    const scaleY = VIEWPORT_H / rect.height
    const x = Math.round((e.clientX - rect.left) * scaleX)
    const y = Math.round((e.clientY - rect.top) * scaleY)

    await fetch('/api/browser/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, action: { type: 'click', x, y } }),
    })
  }, [sessionId, status])

  // ── Scroll handler ─────────────────────────────────────────────────
  const handleWheel = useCallback(async (e: React.WheelEvent<HTMLDivElement>) => {
    if (status !== 'running') return
    e.preventDefault()
    await fetch('/api/browser/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, action: { type: 'scroll', deltaX: e.deltaX, deltaY: e.deltaY } }),
    })
  }, [sessionId, status])

  // ── Address bar navigation ─────────────────────────────────────────
  async function handleNavigate(e: React.FormEvent) {
    e.preventDefault()
    if (status !== 'running') return
    let url = addressBar.trim()
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`
    setIsNavigating(true)
    await fetch('/api/browser/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, action: { type: 'navigate', url } }),
    })
    setIsNavigating(false)
  }

  async function handleBack() {
    await fetch('/api/browser/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, action: { type: 'back' } }),
    })
  }

  async function handleForward() {
    await fetch('/api/browser/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, action: { type: 'forward' } }),
    })
  }

  async function handleReload() {
    await fetch('/api/browser/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, action: { type: 'reload' } }),
    })
  }

  return (
    <div className="flex flex-col h-full bg-gray-950" data-testid="browser-viewer">
      {/* ── Browser chrome bar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border-b border-gray-700 shrink-0">
        {/* Nav buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleBack}
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Back"
            aria-label="Navigate back"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleForward}
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Forward"
            aria-label="Navigate forward"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={handleReload}
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Reload"
            aria-label="Reload page"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Address bar */}
        <form onSubmit={handleNavigate} className="flex-1 flex items-center gap-2 min-w-0">
          <div className="flex-1 flex items-center bg-gray-900 border border-gray-600 rounded-md px-3 py-1 gap-2 min-w-0">
            {/* Lock icon */}
            <svg className="w-3 h-3 text-green-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              value={addressBar}
              onChange={(e) => setAddressBar(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-200 outline-none min-w-0"
              data-testid="address-bar"
              aria-label="URL address bar"
            />
          </div>
          <button
            type="submit"
            disabled={isNavigating}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-md transition-colors disabled:opacity-50"
          >
            Go
          </button>
        </form>

        {/* Status indicator */}
        <div className="shrink-0 flex items-center gap-1.5">
          {status === 'starting' && (
            <span className="flex items-center gap-1 text-xs text-yellow-400">
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              Starting…
            </span>
          )}
          {status === 'running' && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              Live
            </span>
          )}
          {status === 'error' && (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <span className="w-2 h-2 bg-red-400 rounded-full" />
              Error
            </span>
          )}
        </div>
      </div>

      {/* ── Viewport area ─────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden bg-gray-900" ref={containerRef}>
        {/* Starting overlay */}
        {status === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-20">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-gray-400">Launching browser…</p>
            <p className="text-xs text-gray-600 mt-1">{jobUrl}</p>
          </div>
        )}

        {/* Error overlay */}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-20 px-6 text-center">
            <div className="text-4xl mb-3">🚫</div>
            <p className="text-sm font-semibold text-red-300 mb-1">Browser session failed</p>
            <p className="text-xs text-gray-400">{error}</p>
          </div>
        )}

        {/* Screenshot display — interactive div acting as remote browser viewport */}
        {screenshot && (
          <div
            className="w-full h-full cursor-pointer"
            style={{ lineHeight: 0 }}
            onClick={handleClick}
            onWheel={handleWheel}
            data-testid="browser-viewport"
            role="presentation"
            aria-label="Remote browser viewport — click to interact"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/jpeg;base64,${screenshot}`}
              alt="Live browser screenshot"
              className="w-full h-full object-contain"
              draggable={false}
              data-testid="browser-screenshot"
            />
          </div>
        )}

        {/* No screenshot yet but running */}
        {!screenshot && status === 'running' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-500">Loading page…</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
