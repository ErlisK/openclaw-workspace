import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { PageAnalytics } from '@/components/PageAnalytics'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GrantSnap — Find Grants. Write Faster. Win More.',
  description:
    'GrantSnap helps small nonprofits and grassroots groups find matching grants and assemble polished proposals from reusable text blocks — in days, not weeks.',
  openGraph: {
    title: 'GrantSnap — Find Grants. Write Faster. Win More.',
    description:
      'Stop rewriting the same mission statement. GrantSnap gives small nonprofits a modular block library, curated grant matching, and simple team collaboration.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PageAnalytics source="direct" />
        {children}
      </body>
    </html>
  )
}
