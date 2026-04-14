import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AgentQA — Human Testing for AI-Built Apps',
  description: 'Get your AI-built app tested by a real human in under 4 hours. No SDK required.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
