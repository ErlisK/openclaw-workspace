import type { Metadata } from 'next'
import './globals.css'
import { PostHogProvider } from '@/components/PostHogProvider'
import { PageView } from '@/components/PageView'

export const metadata: Metadata = {
  title: 'ClipSpark — Turn podcasts into short clips in minutes',
  description: 'AI-powered clip extraction for solo podcasters, coaches, and indie founders. $5/month.',
}

const PLAUSIBLE_DOMAIN = 'clipspark-tau.vercel.app'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Plausible analytics — lightweight, no cookies, GDPR-friendly */}
        <script
          defer
          data-domain={PLAUSIBLE_DOMAIN}
          src="https://plausible.io/js/script.js"
        />
      </head>
      <body className="bg-gray-950 text-white antialiased min-h-screen">
        <PostHogProvider>
          <PageView />
          {children}
        </PostHogProvider>
      </body>
    </html>
  )
}
