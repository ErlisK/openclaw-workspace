'use client'

import { useState, useEffect } from 'react'

interface SessionEvent {
  id: string
  event_type: string
  ts: string
  payload?: Record<string, unknown>
}

interface Props {
  sessionId: string
}

export default function ScreenshotGallery({ sessionId }: Props) {
  const [screenshots, setScreenshots] = useState<SessionEvent[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/events?limit=500`)
      .then(r => r.json())
      .then(d => {
        const snaps = (d.events ?? []).filter(
          (e: SessionEvent) => e.event_type === 'dom_snapshot' &&
            (e.payload?.screenshot_url || e.payload?.data_url)
        )
        setScreenshots(snaps)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) return null
  if (screenshots.length === 0) return (
    <p className="text-xs text-gray-600 py-4 text-center" data-testid="gallery-empty">
      No screenshots captured
    </p>
  )

  return (
    <div data-testid="screenshot-gallery">
      <div className="grid grid-cols-3 gap-2">
        {screenshots.map((s, i) => {
          const src = (s.payload?.screenshot_url ?? s.payload?.data_url) as string
          return (
            <button
              key={s.id}
              onClick={() => setSelected(src)}
              className="relative aspect-video bg-gray-900 border border-gray-700 rounded overflow-hidden hover:border-indigo-500 transition-colors group"
              data-testid="gallery-thumb"
            >
              <img src={src} alt={`screenshot ${i + 1}`} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1.5 py-0.5 text-[9px] text-gray-300 group-hover:bg-black/80">
                {new Date(s.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </button>
          )
        })}
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setSelected(null)}
          data-testid="gallery-lightbox"
        >
          <img
            src={selected}
            alt="screenshot fullsize"
            className="max-w-[90vw] max-h-[90vh] rounded shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white text-2xl leading-none"
            onClick={() => setSelected(null)}
            data-testid="gallery-lightbox-close"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
