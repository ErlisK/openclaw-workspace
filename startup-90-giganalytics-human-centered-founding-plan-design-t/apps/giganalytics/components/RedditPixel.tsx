'use client'
import Script from 'next/script'

/**
 * RedditPixel — loads the Reddit conversion pixel.
 * Only renders if NEXT_PUBLIC_REDDIT_PIXEL_ID is set.
 * Place in the root layout (or any page) once.
 *
 * Fire conversion events with:
 *   window.rdt?.('track', 'SignUp')
 *   window.rdt?.('track', 'Lead')
 *   window.rdt?.('track', 'Purchase', { value: 29, currency: 'USD' })
 */
export function RedditPixel() {
  const pixelId = process.env.NEXT_PUBLIC_REDDIT_PIXEL_ID
  if (!pixelId) return null

  return (
    <Script id="reddit-pixel" strategy="afterInteractive">
      {`
        !function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};p.callQueue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/v2.js",t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);
        rdt('init','${pixelId}', {"optOut":false,"useDecimalCurrencyValues":true});
        rdt('track', 'PageVisit');
      `}
    </Script>
  )
}
