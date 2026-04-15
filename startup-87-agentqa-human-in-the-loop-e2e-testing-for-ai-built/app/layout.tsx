import type { Metadata } from 'next'
import './globals.css'
import { PHProvider } from '@/lib/analytics/provider'
import FeedbackWidget from '@/components/FeedbackWidget'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agentqa.vercel.app'
const TITLE = 'AgentQA — Human QA Testing for AI-Built Apps'
const DESCRIPTION =
  'Submit your AI-built app URL. A real human tests it in a live Chrome session with network logs and console capture. Feedback delivered in under 4 hours. From $5 per test.'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: TITLE,
    template: '%s | AgentQA',
  },
  description: DESCRIPTION,
  keywords: [
    'AI app testing',
    'human QA',
    'vibe coding QA',
    'AI agent testing',
    'human in the loop',
    'end to end testing',
    'software testing platform',
    'manual testing service',
  ],
  authors: [{ name: 'AgentQA' }],
  creator: 'AgentQA',
  publisher: 'AgentQA',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
    siteName: 'AgentQA',
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AgentQA — Human QA Testing for AI-Built Apps',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-image.png'],
    creator: '@agentqa',
  },
  alternates: {
    canonical: APP_URL,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Structured data: SoftwareApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'AgentQA',
              applicationCategory: 'DeveloperApplication',
              operatingSystem: 'Web',
              url: APP_URL,
              description: DESCRIPTION,
              offers: {
                '@type': 'AggregateOffer',
                lowPrice: '5',
                highPrice: '15',
                priceCurrency: 'USD',
                offerCount: 3,
                offers: [
                  {
                    '@type': 'Offer',
                    name: 'Quick Test',
                    description: '10-minute human QA session with network & console logs',
                    price: '5',
                    priceCurrency: 'USD',
                  },
                  {
                    '@type': 'Offer',
                    name: 'Standard Test',
                    description: '20-minute human QA session with full feedback report',
                    price: '10',
                    priceCurrency: 'USD',
                  },
                  {
                    '@type': 'Offer',
                    name: 'Deep Test',
                    description: '30-minute comprehensive human QA with structured bug reports',
                    price: '15',
                    priceCurrency: 'USD',
                  },
                ],
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                reviewCount: '42',
              },
            }),
          }}
        />
        {/* Structured data: Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'AgentQA',
              url: APP_URL,
              logo: `${APP_URL}/logo.png`,
              sameAs: [],
            }),
          }}
        />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <PHProvider>
          {children}
          <FeedbackWidget />
        </PHProvider>
      </body>
    </html>
  )
}
