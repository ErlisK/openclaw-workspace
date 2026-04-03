'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Page { id: string; page_number: number; sort_order: number; subject: string | null; prompt?: string; image_url: string | null; status: string; latency_ms: number | null }
interface Session { id: string; session_token: string; share_slug: string; concept: string; config: Record<string, unknown>; status: string; page_count: number; preview_image_url: string | null }

// ── Pollinations URL builder ──────────────────────────────────────────────────
function buildPollinationsUrl(prompt: string, seed: number): string {
  const enc = encodeURIComponent(prompt)
  return `https://image.pollinations.ai/prompt/${enc}?model=flux&width=768&height=1024&nologo=true&seed=${seed}`
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PreviewPage() {
  const params   = useParams() as { sessionId: string }
  const { sessionId } = params

  const [session,     setSession]     = useState<Session | null>(null)
  const [pages,       setPages]       = useState<Page[]>([])
  const [generating,  setGenerating]  = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [loadError,   setLoadError]   = useState('')
  const [copied,      setCopied]      = useState(false)
  const [shareUrl,    setShareUrl]    = useState('')
  const generatingRef = useRef(false)

  // ── Load session ──────────────────────────────────────────────────────────
  const loadSession = useCallback(async () => {
    const resp = await fetch(`/api/v1/session/${sessionId}`)
    if (!resp.ok) { setLoadError('Session not found'); return null }
    const data = await resp.json() as { session: Session; pages: Page[] }
    setSession(data.session)
    setPages(data.pages)
    return data
  }, [sessionId])

  // ── Generate one page (client-side via Pollinations) ──────────────────────
  const generatePage = useCallback(async (page: Page, seed: number): Promise<string | null> => {
    const url = buildPollinationsUrl(page.prompt || page.subject || 'coloring page', seed)
    const t0  = Date.now()
    return new Promise(resolve => {
      const img = new Image()
      img.onload = () => {
        const ms = Date.now() - t0
        // Save to backend
        fetch('/api/v1/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, pageNumber: page.page_number, imageUrl: url, latencyMs: ms, subject: page.subject }),
        })
        resolve(url)
      }
      img.onerror = () => resolve(null)
      img.src = url
    })
  }, [sessionId])

  // ── Generation loop ───────────────────────────────────────────────────────
  const generateAll = useCallback(async (sess: Session, pgs: Page[]) => {
    if (generatingRef.current) return
    generatingRef.current = true
    setGenerating(true)

    // Mark session as started
    await fetch(`/api/v1/session/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ started_generating_at: new Date().toISOString(), status: 'generating' }),
    })
    await fetch('/api/v1/event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'generation_started', sessionId, props: { concept: sess.concept, page_count: pgs.length } }),
    })

    for (let i = 0; i < pgs.length; i++) {
      const page = pgs[i]
      setCurrentPage(i + 1)
      const seed = Math.abs(Math.floor(Math.random() * 100000))
      const imageUrl = await generatePage(page, seed)

      if (imageUrl) {
        setPages(prev => prev.map(p =>
          p.page_number === page.page_number ? { ...p, image_url: imageUrl, status: 'complete' } : p
        ))
        if (i === 0) {
          await fetch('/api/v1/event', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'first_page_ready', sessionId }),
          })
        }
      } else {
        setPages(prev => prev.map(p =>
          p.page_number === page.page_number ? { ...p, status: 'failed' } : p
        ))
      }

      // Small delay between pages to avoid rate limiting
      if (i < pgs.length - 1) await new Promise(r => setTimeout(r, 2000))
    }

    setGenerating(false)
    generatingRef.current = false

    // Mark complete
    await fetch(`/api/v1/session/${sessionId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ complete_at: new Date().toISOString(), status: 'complete' }),
    })
    await fetch('/api/v1/event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'book_complete', sessionId, props: { page_count: pgs.length } }),
    })
    setSession(prev => prev ? { ...prev, status: 'complete' } : prev)
  }, [sessionId, generatePage])

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const data = await loadSession()
      if (cancelled || !data) return

      setShareUrl(`${window.location.origin}/share/${data.session.share_slug}`)

      // Mark preview opened
      await fetch(`/api/v1/session/${sessionId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview_opened_at: new Date().toISOString() }),
      })
      await fetch('/api/v1/event', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'preview_opened', sessionId }),
      })

      // If not yet generated, start generation
      const notStarted = data.pages.every(p => p.status === 'pending')
      if (notStarted && !generatingRef.current) {
        await generateAll(data.session, data.pages)
      }
    })()
    return () => { cancelled = true }
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Move page ─────────────────────────────────────────────────────────────
  const movePage = (idx: number, dir: -1 | 1) => {
    const newPages = [...pages]
    const target = idx + dir
    if (target < 0 || target >= newPages.length) return
    ;[newPages[idx], newPages[target]] = [newPages[target], newPages[idx]]
    setPages(newPages)
  }

  // ── Export (print) ────────────────────────────────────────────────────────
  const handleExport = async () => {
    await fetch(`/api/v1/session/${sessionId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exported_at: new Date().toISOString(), status: 'exported' }),
    })
    await fetch('/api/v1/event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'export_clicked', sessionId }),
    })
    window.open(`/create/preview/${sessionId}/print`, '_blank')
  }

  // ── Share ─────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    await fetch(`/api/v1/session/${sessionId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ share_clicked_at: new Date().toISOString() }),
    })
    await fetch('/api/v1/event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'share_clicked', sessionId, props: { share_url: shareUrl } }),
    })
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      prompt('Copy this link to share:', shareUrl)
    }
  }

  const donePages  = pages.filter(p => p.status === 'complete')
  const failPages  = pages.filter(p => p.status === 'failed')
  const allDone    = !generating && pages.length > 0 && donePages.length + failPages.length === pages.length
  const concept    = session?.concept === 'story-to-book' ? '📖 Story' : '🎯 Interest Pack'
  const heroName   = (session?.config as Record<string, unknown>)?.heroName as string | undefined

  if (loadError) return (
    <div className="min-h-screen flex items-center justify-center text-center px-4">
      <div>
        <p className="text-4xl mb-4">😔</p>
        <p className="text-xl font-bold text-gray-800 mb-2">Session not found</p>
        <a href="/create" className="text-violet-600 underline">Start over →</a>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm px-4 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900">
              {heroName ? `${heroName}'s Coloring Book` : 'Your Coloring Book'}
            </h1>
            <p className="text-xs text-gray-400">{concept} · {session?.page_count || 4} pages</p>
          </div>
          <div className="flex gap-2">
            {allDone && donePages.length > 0 && (
              <>
                <button onClick={handleShare}
                  className={`text-sm px-4 py-2 rounded-xl border font-medium transition-all ${
                    copied ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}>
                  {copied ? '✅ Copied!' : '🔗 Share'}
                </button>
                <button onClick={handleExport}
                  className="text-sm px-4 py-2 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition-colors">
                  🖨️ Print / Save PDF
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Generation progress */}
        {generating && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 text-center">
            <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin mx-auto mb-4"/>
            <p className="font-bold text-gray-800 text-lg mb-1">
              Generating page {currentPage} of {session?.page_count || 4}…
            </p>
            <p className="text-sm text-gray-400 mb-4">Pages appear below as they&apos;re ready • ~30s each</p>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="bg-violet-400 h-full rounded-full transition-all duration-1000"
                style={{ width: `${Math.round((donePages.length / (session?.page_count || 4)) * 100)}%` }}/>
            </div>
            <p className="text-xs text-gray-400 mt-2">{donePages.length}/{session?.page_count || 4} complete</p>
          </div>
        )}

        {/* Completion banner */}
        {allDone && donePages.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-bold text-green-800">Book ready!</p>
                <p className="text-xs text-green-600">{donePages.length} pages generated · Ready to print</p>
              </div>
            </div>
            <button onClick={handleExport}
              className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-700">
              Print / PDF →
            </button>
          </div>
        )}

        {/* Pages grid */}
        <div className="space-y-4">
          {pages.map((page, idx) => (
            <div key={page.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                page.status === 'complete' ? 'border-gray-100' : 'border-dashed border-gray-200'
              }`}>
              <div className="flex items-start gap-4 p-4">

                {/* Page number + reorder */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <span className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg text-sm font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  {allDone && (
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => movePage(idx, -1)} disabled={idx === 0}
                        className="text-xs text-gray-300 hover:text-gray-500 disabled:opacity-20 leading-none">▲</button>
                      <button onClick={() => movePage(idx, 1)} disabled={idx === pages.length - 1}
                        className="text-xs text-gray-300 hover:text-gray-500 disabled:opacity-20 leading-none">▼</button>
                    </div>
                  )}
                </div>

                {/* Image / placeholder */}
                <div className="flex-shrink-0 w-24 h-32 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
                  {page.status === 'complete' && page.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={page.image_url} alt={page.subject || `Page ${page.page_number}`}
                      className="w-full h-full object-cover"/>
                  ) : page.status === 'failed' ? (
                    <span className="text-2xl">⚠️</span>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-6 h-6 border-2 border-gray-300 border-t-violet-400 rounded-full animate-spin"/>
                      <span className="text-xs text-gray-400">generating</span>
                    </div>
                  )}
                </div>

                {/* Meta */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 mb-1 capitalize">{page.subject || `Page ${page.page_number}`}</p>
                  <p className={`text-xs font-medium ${
                    page.status === 'complete' ? 'text-green-600' :
                    page.status === 'failed'   ? 'text-red-500' :
                    'text-gray-400'
                  }`}>
                    {page.status === 'complete' ? `✅ Ready${page.latency_ms ? ` · ${(page.latency_ms/1000).toFixed(1)}s` : ''}` :
                     page.status === 'failed'   ? '⚠️ Failed — will retry' :
                     currentPage === page.page_number ? '⏳ Generating…' : '⏸ Waiting'}
                  </p>
                  {page.status === 'complete' && page.image_url && (
                    <a href={page.image_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-violet-500 hover:underline mt-1 block">View full size ↗</a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state while loading */}
        {pages.length === 0 && !generating && (
          <div className="text-center py-16 text-gray-400">
            <div className="w-10 h-10 border-3 border-gray-200 border-t-violet-400 rounded-full animate-spin mx-auto mb-4"/>
            <p>Loading your book…</p>
          </div>
        )}

        {/* Trial upsell */}
        {allDone && (
          <div className="mt-8 bg-gradient-to-r from-violet-600 to-blue-600 rounded-2xl p-6 text-white text-center">
            <p className="text-lg font-bold mb-1">Love your 4 pages? Get all 12! 🎨</p>
            <p className="text-violet-200 text-sm mb-4">Full 12-page book with custom cover · Digital download</p>
            <button className="bg-white text-violet-700 font-bold px-6 py-3 rounded-xl hover:bg-violet-50 transition-colors">
              Get full book — $9.99 →
            </button>
            <p className="text-xs text-violet-300 mt-2">Coming soon · Join waitlist</p>
          </div>
        )}

      </div>
    </div>
  )
}
