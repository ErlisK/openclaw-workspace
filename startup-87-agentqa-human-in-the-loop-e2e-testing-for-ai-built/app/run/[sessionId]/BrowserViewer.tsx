'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { BrowserEvent } from '@/lib/browser-session-manager'
import { encodeProxySubdomain, decodeProxySubdomain } from '@/lib/proxy-subdomain'

interface Props {
  sessionId: string
  jobUrl: string
  onEvent: (event: BrowserEvent) => void
  onStatusChange?: (status: 'starting' | 'running' | 'error' | 'stopped') => void
  onUrlChange?: (url: string) => void
}

/** Derive the proxy suffix from the current page's hostname. */
function getClientProxySuffix(): string {
  if (process.env.NEXT_PUBLIC_PROXY_DOMAIN) return process.env.NEXT_PUBLIC_PROXY_DOMAIN
  if (typeof window === 'undefined') return 'proxy.localhost'
  return `proxy.${window.location.hostname}`
}

/**
 * Build the proxy subdomain URL for a target URL.
 * Dynamically derives the proxy domain from the current page.
 * Dev:  http://snippetci-com.proxy.localhost:3000/
 * Prod: https://snippetci-com.proxy.betawindow.com/
 */
function toProxyUrl(targetUrl: string, sessionId: string): string {
  if (!targetUrl) return ''
  try {
    const parsed = new URL(targetUrl)
    const encoded = encodeProxySubdomain(parsed.hostname)
    const suffix = getClientProxySuffix()
    const proto = window.location.protocol
    const port = window.location.port ? `:${window.location.port}` : ''
    const path = parsed.pathname + parsed.search
    const sep = parsed.search ? '&' : '?'
    return `${proto}//${encoded}.${suffix}${port}${path}${sep}_bw_session=${encodeURIComponent(sessionId)}`
  } catch {
    return ''
  }
}

/** Extract the real target URL from the iframe's proxy subdomain URL. */
function extractTargetUrl(iframeHref: string, jobUrl: string): string {
  try {
    const iframe = new URL(iframeHref)
    const suffix = getClientProxySuffix()
    const hostOnly = iframe.hostname
    if (hostOnly.endsWith(`.${suffix}`)) {
      const sub = hostOnly.slice(0, -(suffix.length + 1))
      const targetHost = decodeProxySubdomain(sub)
      const targetProto = new URL(jobUrl).protocol
      const path = iframe.pathname + iframe.search.replace(/[?&]_bw_session=[^&]*/, '')
      return `${targetProto}//${targetHost}${path}`
    }
  } catch { /* ignore */ }
  return iframeHref
}

export default function BrowserViewer({ sessionId, jobUrl, onEvent, onStatusChange, onUrlChange }: Props) {
  const [status, setStatus] = useState<'starting' | 'running' | 'error' | 'stopped'>('starting')
  const [addressBar, setAddressBar] = useState(jobUrl)
  const [currentUrl, setCurrentUrl] = useState(jobUrl)
  const [proxyUrl, setProxyUrl] = useState('')  // empty on server, set on client
  const [isNavigating, setIsNavigating] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const startedRef = useRef(false)

  // Compute proxy URL on client only (needs window.location for protocol/port)
  useEffect(() => {
    if (!proxyUrl && jobUrl) {
      setProxyUrl(toProxyUrl(jobUrl, sessionId))
    }
  }, [jobUrl, sessionId, proxyUrl])

  const updateStatus = useCallback((s: typeof status) => {
    setStatus(s)
    onStatusChange?.(s)
  }, [onStatusChange])

  // Signal running as soon as we mount
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    const t = setTimeout(() => updateStatus('running'), 800)
    return () => clearTimeout(t)
  }, [updateStatus])

  // Listen for postMessage events from the iframe (injected logger)
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data?.type === 'betawindow_url_change' && e.data?.url) {
        const url = e.data.url as string
        setCurrentUrl(url)
        setAddressBar(url)
        onUrlChange?.(url)
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [onUrlChange])

  function handleIframeLoad() {
    updateStatus('running')
    try {
      const iwin = iframeRef.current?.contentWindow
      if (!iwin) return
      const iframeHref = iwin.location?.href ?? ''
      if (!iframeHref || iframeHref === 'about:blank') return

      // Extract the real target URL from the proxy subdomain URL
      const displayUrl = extractTargetUrl(iframeHref, jobUrl)

      if (displayUrl && displayUrl !== currentUrl) {
        setCurrentUrl(displayUrl)
        setAddressBar(displayUrl)
        onUrlChange?.(displayUrl)
      }
      onEvent({
        id: `ev-nav-${Date.now()}`,
        session_id: sessionId,
        event_type: 'navigation',
        ts: new Date().toISOString(),
        request_url: displayUrl,
        log_message: `Navigated to ${displayUrl}`,
      })
    } catch {
      // Cross-origin — can't read iframe URL (shouldn't happen with subdomain proxy)
      onEvent({
        id: `ev-nav-${Date.now()}`,
        session_id: sessionId,
        event_type: 'navigation',
        ts: new Date().toISOString(),
        request_url: currentUrl,
        log_message: 'Page loaded (cross-origin)',
      })
    }
  }

  function handleIframeError() {
    updateStatus('error')
  }

  async function navigateTo(url: string) {
    let safe = url.trim()
    if (!/^https?:\/\//i.test(safe)) safe = `https://${safe}`
    setIsNavigating(true)
    setCurrentUrl(safe)
    setAddressBar(safe)
    setProxyUrl(toProxyUrl(safe, sessionId))
    onUrlChange?.(safe)
    onEvent({
      id: `ev-nav-${Date.now()}`,
      session_id: sessionId,
      event_type: 'navigation',
      ts: new Date().toISOString(),
      request_url: safe,
      log_message: `Navigating to ${safe}`,
    })
    setIsNavigating(false)
  }

  async function handleNavigate(e: React.FormEvent) {
    e.preventDefault()
    await navigateTo(addressBar)
  }

  function sendCommand(command: 'back' | 'forward' | 'reload') {
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: 'betawindow_command', command }, '*')
    } catch { /* cross-origin fallback — shouldn't happen with postMessage */ }
  }

  function handleBack() { sendCommand('back') }
  function handleForward() { sendCommand('forward') }
  function handleReload() {
    sendCommand('reload')
    onEvent({
      id: `ev-reload-${Date.now()}`,
      session_id: sessionId,
      event_type: 'navigation',
      ts: new Date().toISOString(),
      request_url: currentUrl,
      log_message: 'Page reloaded',
    })
  }

  return (
    <div className="flex flex-col h-full bg-gray-950" data-testid="browser-viewer">
      {/* Browser chrome bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-1">
          <button onClick={handleBack} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title="Back" aria-label="Navigate back">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={handleForward} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title="Forward" aria-label="Navigate forward">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <button onClick={handleReload} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title="Reload" aria-label="Reload page">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>

        <form onSubmit={handleNavigate} className="flex-1 flex items-center gap-2 min-w-0">
          <div className="flex-1 flex items-center bg-gray-900 border border-gray-600 rounded-md px-3 py-1 gap-2 min-w-0">
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
          <button type="submit" disabled={isNavigating} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-md transition-colors disabled:opacity-50">Go</button>
        </form>

        <div className="shrink-0 flex items-center gap-1.5">
          {status === 'starting' && <span className="flex items-center gap-1 text-xs text-yellow-400"><span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />Starting...</span>}
          {status === 'running' && <span className="flex items-center gap-1 text-xs text-green-400"><span className="w-2 h-2 bg-green-400 rounded-full" />Live</span>}
          {status === 'error' && <span className="flex items-center gap-1 text-xs text-red-400"><span className="w-2 h-2 bg-red-400 rounded-full" />Error</span>}
        </div>
      </div>

      {/* Viewport — iframe */}
      <div className="flex-1 relative overflow-hidden bg-gray-900">
        {status === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-20">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-gray-400">Loading browser...</p>
            <p className="text-xs text-gray-600 mt-1">{jobUrl}</p>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-20 px-6 text-center">
            <p className="text-sm font-semibold text-red-300 mb-1">Could not load the app</p>
            <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-md transition-colors">Open in new tab</a>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={proxyUrl || undefined}
          className="w-full h-full border-0"
          title="App under test"
          data-testid="browser-viewport"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  )
}
