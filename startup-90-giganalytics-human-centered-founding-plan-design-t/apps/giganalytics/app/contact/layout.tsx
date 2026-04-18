import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact — GigAnalytics',
  description: 'Get in touch with the GigAnalytics team.',
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
