import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Austin ADU Permit Expediter | $199 Flat Fee — ExpediteHub',
  description: 'Get your Austin ADU permit packet in 5 business days. $199 flat fee. AI auto-fills DSD forms. Licensed local expediters. SF-3, SF-2 zones. City of Austin specialists.',
  keywords: 'Austin ADU permit, Austin permit expediter ADU, City of Austin ADU permit, Austin ADU plans permit, permit expediting Austin TX',
  alternates: {
    canonical: 'https://startup-73-expeditehub-lean-startup.vercel.app/lp/adu-permit-austin',
  },
  robots: 'noindex', // exclude paid landing from organic index
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
