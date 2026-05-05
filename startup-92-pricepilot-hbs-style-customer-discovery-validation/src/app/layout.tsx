import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { CookieConsent } from '@/components/CookieConsent'
import { PlausibleTrackerWrapper } from '@/components/PlausibleTrackerWrapper'
import { UTMCapture } from '@/components/UTMCapture'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://pricingsim.com'

export const metadata: Metadata = {
  title: { default: 'PricingSim — Safe pricing experiments for solo founders', template: '%s — PricingSim' },
  description: 'Test higher prices safely. Bayesian A/B pricing experiments for creators and micro-SaaS founders doing $500–$10k MRR.',
  metadataBase: new URL(BASE_URL),
  icons: { icon: '/favicon.ico' },
  openGraph: {
    type: 'website',
    siteName: 'PricingSim',
    title: 'PricingSim — Safe pricing experiments for solo founders',
    description: 'Test higher prices safely. Bayesian A/B pricing experiments for Stripe, Gumroad, and Shopify sellers.',
    url: BASE_URL,
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: 'PricingSim — Safe pricing experiments for solo founders' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PricingSim — Safe pricing experiments for solo founders',
    description: 'Bayesian A/B pricing experiments for creators and micro-SaaS founders.',
    images: [`${BASE_URL}/og-image.png`],
  },
  keywords: ['pricing experiments', 'A/B testing', 'pricing strategy', 'Stripe', 'Gumroad', 'Shopify', 'micro-SaaS', 'solo founder'],
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const redditPixelId = process.env.NEXT_PUBLIC_REDDIT_PIXEL_ID
  const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID

  return (
    <html lang="en">
      <body>
        <PlausibleTrackerWrapper />
        <UTMCapture />
        {children}
        <CookieConsent />
        {/* Plausible Analytics — respects DNT, no cookies, GDPR-friendly */}
        <Script
          defer
          data-domain="pricingsim.com"
          src="https://plausible.io/js/script.tagged-events.js"
          strategy="afterInteractive"
        />
        {/* Reddit Pixel — only loads when NEXT_PUBLIC_REDDIT_PIXEL_ID is set */}
        {redditPixelId && (
          <Script id="reddit-pixel" strategy="afterInteractive">
            {`
              !function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};p.callQueue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/v2.js",t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);
              rdt('init','${redditPixelId}', {"optOut":false,"useDecimalCurrencyValues":true});
              rdt('track', 'PageVisit');
            `}
          </Script>
        )}
        {/* Google Ads — only loads when NEXT_PUBLIC_GOOGLE_ADS_ID is set */}
        {googleAdsId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`} strategy="afterInteractive" />
            <Script id="google-gtag" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAdsId}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}
