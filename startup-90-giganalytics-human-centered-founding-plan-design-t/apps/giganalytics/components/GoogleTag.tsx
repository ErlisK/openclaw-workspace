'use client'
import Script from 'next/script'

/**
 * GoogleTag — loads GA4 / Google Ads conversion tag.
 * Only renders if NEXT_PUBLIC_GTAG_ID is set.
 *
 * Fire conversion events with:
 *   gtag('event', 'conversion', { send_to: 'AW-XXXXXXXXX/XXXX', value: 0, currency: 'USD' })
 */
export function GoogleTag() {
  const gtagId = process.env.NEXT_PUBLIC_GTAG_ID
  if (!gtagId) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gtagId}');
        `}
      </Script>
    </>
  )
}
