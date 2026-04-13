import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Austin ADU Permit — Beta Pricing $99 | ExpediteHub',
  description: 'Limited beta: Get your Austin ADU permit packet for $99. AI auto-fills DSD forms. Licensed local expediters. Only 50 spots available.',
  robots: 'noindex',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
