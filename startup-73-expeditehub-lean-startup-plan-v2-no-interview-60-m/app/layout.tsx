import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { PostHogProvider } from '@/components/PostHogProvider'

const inter = Inter({ subsets: ['latin'] })

// Google Tag ID — set NEXT_PUBLIC_GOOGLE_TAG_ID in Vercel env once Ads account is created
const G_TAG_ID = process.env.NEXT_PUBLIC_GOOGLE_TAG_ID

export const metadata: Metadata = {
  title: 'ExpediteHub — Fast ADU Permits in Austin, TX',
  description: 'Get your Austin ADU permit packet in 5 business days. Licensed expediters + AI auto-fill saves weeks of back-and-forth.',
  openGraph: {
    title: 'ExpediteHub — Fast ADU Permits in Austin, TX',
    description: 'Licensed permit expediters + AI auto-fill. Get your ADU permit packet in 5 days.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {G_TAG_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${G_TAG_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-tag-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${G_TAG_ID}', {
                  page_path: window.location.pathname,
                  send_page_view: true
                });
              `}
            </Script>
          </>
        )}
      </head>
      <body className={inter.className}>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  )
}
