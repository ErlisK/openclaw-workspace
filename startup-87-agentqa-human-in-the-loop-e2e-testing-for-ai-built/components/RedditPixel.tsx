'use client'
/**
 * Reddit Pixel component — loads Reddit's rp.js pixel and fires
 * standard conversion events (PageVisit, SignUp, Lead).
 *
 * Usage: place <RedditPixel /> in app/layout.tsx inside <body>.
 * Set NEXT_PUBLIC_REDDIT_PIXEL_ID in Vercel env vars once you have it
 * from Reddit Ads → Tools → Reddit Pixel.
 */
import Script from 'next/script'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

declare global {
  interface Window {
    rdt: ((...args: unknown[]) => void) & { q?: unknown[] }
  }
}

const PIXEL_ID = process.env.NEXT_PUBLIC_REDDIT_PIXEL_ID

export function RedditPixel() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Fire PageVisit on route changes
  useEffect(() => {
    if (!PIXEL_ID || typeof window === 'undefined' || !window.rdt) return
    window.rdt('track', 'PageVisit')
  }, [pathname, searchParams])

  if (!PIXEL_ID) return null

  return (
    <>
      <Script
        id="reddit-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
!function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};p.callQueue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/v2/rp.js";t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}w.rdt("init","${PIXEL_ID}",{"optOut":false,"useDecimalCurrencyValues":true,"signalsMode":"all"}),w.rdt("track","PageVisit")}(window,document);
          `,
        }}
      />
    </>
  )
}

/**
 * Fire a Reddit conversion event from anywhere in the app.
 * Common events: 'SignUp', 'Lead', 'Purchase', 'AddToCart', 'Search'
 */
export function trackRedditEvent(
  event: 'SignUp' | 'Lead' | 'Purchase' | 'ViewContent' | 'Search' | 'AddToCart',
  params?: { value?: number; currency?: string; [key: string]: unknown }
) {
  if (typeof window === 'undefined' || !window.rdt) return
  window.rdt('track', event, params)
}
