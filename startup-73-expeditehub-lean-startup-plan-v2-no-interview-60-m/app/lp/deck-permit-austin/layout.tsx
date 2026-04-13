import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Austin Deck Permit — Done Right | ExpediteHub',
  description:
    'Get your Austin deck permit fast. Licensed contractor, AI-drafted structural plans package, DSD submission. Fixed price. 7-day turnaround or deposit refunded.',
  openGraph: {
    title: 'Austin Deck Permit — Done Right',
    description: 'Licensed contractor. AI-drafted plans. $79 deposit. 7-day turnaround.',
    url: 'https://startup-73-expeditehub-lean-startup.vercel.app/lp/deck-permit-austin',
  },
}

export default function DeckLPLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
