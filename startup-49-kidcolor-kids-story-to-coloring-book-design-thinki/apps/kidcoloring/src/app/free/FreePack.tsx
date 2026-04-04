'use client'
/**
 * FreePack.tsx — Client component for the free pack download widget.
 * Handles email capture, download count increment, and PDF generation.
 */
import { useState } from 'react'
import Link from 'next/link'

interface Pack {
  id: string
  theme: string
  title: string
  page_urls: string[]
  pdf_url: string | null
  download_count: number
}

const THEME_EMOJIS: Record<string, string> = {
  dinosaurs:'🦖', unicorns:'🦄', space:'🚀', robots:'🤖', dragons:'🐉',
  mermaids:'🧜', puppies:'🐶', kittens:'🐱', princesses:'👸',
  superheroes:'🦸', butterflies:'🦋', ocean:'🌊', fairies:'🧚',
  wizards:'🧙', trains:'🚂', cars:'🚗',
}

export default function FreePack({ pack }: { pack: Pack }) {
  const [email,       setEmail]       = useState('')
  const [subscribed,  setSubscribed]  = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloaded,  setDownloaded]  = useState(false)

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault()
    setDownloading(true)

    // Track download
    await fetch('/api/v1/free-pack', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packId: pack.id, email: email || null }),
    }).catch(() => {})

    if (email) setSubscribed(true)
    setDownloaded(true)
    setDownloading(false)
  }

  const emoji = THEME_EMOJIS[pack.theme] ?? '🎨'

  // Build individual page download links using Pollinations
  const pageImages = pack.page_urls.map((url, i) => {
    // If it's an SVG from /coloring/ folder, use it; otherwise generate via Pollinations
    if (url.startsWith('/coloring/')) return url
    const prompts = [
      `${pack.theme} adventure scene, children's coloring book`,
      `${pack.theme} playing in nature, kids coloring page`,
      `Cute ${pack.theme} character, simple coloring book`,
      `${pack.theme} family, black and white coloring page`,
      `${pack.theme} at home, printable coloring page for kids`,
    ]
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(
      (prompts[i] ?? prompts[0]) + ", black and white line art, thick outlines, no fill, G-rated, children's book style"
    )}?model=flux&width=612&height=792&nologo=true&seed=${i * 17 + 100}`
  })

  return (
    <div className="space-y-6">
      {/* Page previews */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {pageImages.map((url, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="aspect-[3/4] bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`${pack.theme} coloring page ${i + 1}`}
                className="w-full h-full object-contain p-2"
                loading={i === 0 ? 'eager' : 'lazy'} width={200} height={267}/>
            </div>
            <p className="text-xs text-center text-gray-400 p-2">Page {i + 1}</p>
          </div>
        ))}
      </div>

      {/* Download form */}
      {!downloaded ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{emoji}</span>
            <div>
              <p className="font-extrabold text-gray-900">Download {pageImages.length} free coloring pages</p>
              <p className="text-sm text-gray-500">No account needed · Print immediately · 100% free</p>
            </div>
          </div>

          <form onSubmit={handleDownload} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Email (optional — get notified of next week&apos;s pack)
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="parent@example.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              <p className="text-xs text-gray-400 mt-1">We&apos;ll only email about new free packs. Unsubscribe anytime.</p>
            </div>

            <button type="submit" disabled={downloading}
              className="w-full bg-orange-500 text-white font-extrabold py-4 rounded-2xl
                         hover:bg-orange-600 disabled:opacity-60 transition-colors text-lg
                         shadow-lg shadow-orange-200">
              {downloading ? 'Preparing download…' : `📥 Download ${pageImages.length} free pages`}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-3xl p-6 text-center">
          <p className="text-4xl mb-2">🎉</p>
          <p className="font-extrabold text-green-800 text-xl mb-1">Ready to print!</p>
          {subscribed && (
            <p className="text-sm text-green-700 mb-3">
              Thanks! We&apos;ll email you when next week&apos;s pack is live.
            </p>
          )}
          <p className="text-sm text-gray-600 mb-4">
            Right-click any image above to save it, or print this page directly.
            Each image is print-ready at A4 / Letter size.
          </p>
          {/* Print all button */}
          <div className="flex gap-2 justify-center">
            <button onClick={() => window.print()}
              className="bg-green-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-green-700 transition-colors text-sm">
              🖨️ Print all pages
            </button>
            <Link href="/create/interests"
              className="border border-green-300 text-green-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-green-100 transition-colors text-sm">
              Make personalised book →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
