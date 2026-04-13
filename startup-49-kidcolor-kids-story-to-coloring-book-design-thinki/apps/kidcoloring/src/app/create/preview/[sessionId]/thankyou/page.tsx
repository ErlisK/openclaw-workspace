'use client'

/**
 * /create/preview/[sessionId]/thankyou
 *
 * Post-export thank-you page shown after PDF is generated.
 * Surfaces: PDF download, CSAT widget, optional micro-survey, upsell reminder.
 *
 * Flow:
 *   PDF export → paywall (fake-door) → "just download" → this page
 *   OR PDF export → this page directly (if paywall flag off)
 *
 * Query params:
 *   pdf  — URL of the generated PDF (passed from paywall/export)
 *   book — book/session name (optional, for personalisation)
 */
import { useState, useEffect, useRef, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const CSATWidget = dynamic(() => import('@/components/CSATWidget'), { ssr: false })

function ThankYouContent() {
  const params = useParams() as { sessionId: string }
  const search = useSearchParams()
  const { sessionId } = params
  const pdfUrl  = search.get('pdf')  ?? ''
  const bookName = search.get('book') ?? 'Your Coloring Book'

  const [downloaded, setDownloaded] = useState(false)
  const [csatDone,   setCsatDone]   = useState(false)
  const trackedView = useRef(false)

  // Log page view
  useEffect(() => {
    if (trackedView.current) return
    trackedView.current = true
    fetch('/api/v1/event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'page_view', sessionId,
        props: { page: 'thankyou', has_pdf: !!pdfUrl },
      }),
    }).catch(() => {})
  }, [sessionId, pdfUrl])


  const handleDownload = () => {
    setDownloaded(true)
    fetch('/api/v1/event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'pdf_download_clicked', sessionId,
        props: { source: 'thankyou_page' },
      }),
    }).catch(() => {})
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-gray-50 px-4 py-12">
      <div className="max-w-lg mx-auto space-y-6">

        {/* ── Success header ──────────────────────────────────────────── */}
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-1">
            {bookName} is ready!
          </h1>
          <p className="text-gray-500">
            Your personalized coloring book is saved and ready to print.
          </p>
        </div>

        {/* ── Primary download CTA ─────────────────────────────────────── */}
        {pdfUrl ? (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleDownload}
            className={`flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-extrabold
                        text-lg shadow-md hover:shadow-lg transition-all
                        ${downloaded
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-violet-600 hover:bg-violet-700 text-white'
                        }`}
          >
            <span className="text-2xl">{downloaded ? '✅' : '⬇️'}</span>
            <span>{downloaded ? 'Download again' : 'Download my coloring book PDF'}</span>
          </a>
        ) : (
          <Link
            href={`/create/preview/${sessionId}`}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-violet-600
                       text-white font-extrabold text-lg hover:bg-violet-700 transition-colors"
          >
            ← Back to my book
          </Link>
        )}

        {/* ── Print tip ────────────────────────────────────────────────── */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
          <span className="text-2xl flex-shrink-0">🖨️</span>
          <div className="text-sm">
            <p className="font-semibold text-blue-800 mb-0.5">Printing tip</p>
            <p className="text-blue-600">
              Print on US Letter (8.5×11&quot;) at 100% scale, one-sided.
              Thicker paper (24lb+) works best for coloring.
            </p>
          </div>
        </div>

        {/* ── CSAT widget — always shown ───────────────────────────────── */}
        <CSATWidget
          sessionId={sessionId}
          source="post_export_thankyou"
          onDone={() => setCsatDone(true)}
        />

        {/* ── Share + make another ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/create"
            className="text-center py-3.5 rounded-2xl border-2 border-violet-200 text-violet-700
                       font-bold hover:bg-violet-50 transition-colors text-sm"
          >
            ✨ Make another book
          </Link>
          <button
            onClick={() => {
              if (pdfUrl) {
                try {
                  navigator.share?.({
                    title: bookName,
                    text: 'Check out the personalized coloring book I made!',
                    url: window.location.href,
                  })
                } catch {
                  navigator.clipboard?.writeText(window.location.href)
                }
              }
            }}
            className="py-3.5 rounded-2xl border-2 border-gray-200 text-gray-700
                       font-bold hover:bg-gray-50 transition-colors text-sm"
          >
            🔗 Share this
          </button>
        </div>

        {/* ── Upgrade upsell (soft) — shown after CSAT ─────────────────── */}
        {csatDone && (
          <div className="bg-gradient-to-r from-violet-600 to-blue-600 rounded-2xl p-5 text-white text-center">
            <p className="font-extrabold text-lg mb-1">Want all 12 pages?</p>
            <p className="text-violet-200 text-sm mb-3">
              Full book · custom cover · print-quality PDF from $6.99
            </p>
            <Link
              href={`/create/preview/${sessionId}/paywall${pdfUrl ? `?pdf=${encodeURIComponent(pdfUrl)}` : ''}`}
              className="inline-block bg-white text-violet-700 font-bold px-6 py-2.5 rounded-xl
                         hover:bg-violet-50 transition-colors text-sm"
            >
              See full book options →
            </Link>
            <p className="text-xs text-violet-300 mt-2">No subscription · one-time payment</p>
          </div>
        )}

        {/* ── Footer nav ───────────────────────────────────────────────── */}
        <div className="flex justify-center gap-6 pt-2 pb-8">
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">Home</Link>
          <Link href="/account" className="text-xs text-gray-400 hover:text-gray-600">My books</Link>
          <Link href={`/create/preview/${sessionId}`} className="text-xs text-gray-400 hover:text-gray-600">Edit book</Link>
        </div>
      </div>
    </div>
  )
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin"/>
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  )
}
