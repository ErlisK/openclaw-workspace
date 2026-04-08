import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ClaimCheck Studio — Evidence-Backed Content Studio',
  description: 'Turn manuscripts, slides, and transcripts into channel-ready content where every claim earns its citation. Compliance-grade peer review, auditable trail, CMS export.',
  metadataBase: new URL('https://citebundle.com'),
  openGraph: {
    title: 'ClaimCheck Studio — Every Claim Earns Its Citation',
    description: 'The evidence-grounded content studio for medical writers, health agencies, and life sciences communications teams.',
    url: 'https://citebundle.com',
    siteName: 'ClaimCheck Studio',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'ClaimCheck Studio' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ClaimCheck Studio — Evidence-Backed Content Studio',
    description: 'Every claim earns its citation. Compliance-grade health content at scale.',
    images: ['/og.png'],
  },
  keywords: [
    'health content', 'medical writing', 'compliance content', 'citation verification',
    'evidence-based content', 'pharma content', 'FDA compliance', 'content studio',
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} bg-gray-950 text-gray-100 antialiased`}>
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
