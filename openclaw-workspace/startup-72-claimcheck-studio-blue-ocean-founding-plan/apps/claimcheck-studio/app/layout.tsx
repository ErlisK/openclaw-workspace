import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ClaimCheck Studio — Evidence-Grounded Content',
  description: 'Turn manuscripts and research into evidence-backed, channel-ready content. Every claim earns its citation.',
  metadataBase: new URL('https://citebundle.com'),
  openGraph: {
    title: 'ClaimCheck Studio',
    description: 'The only content studio where every claim earns its citation.',
    url: 'https://citebundle.com',
    siteName: 'ClaimCheck Studio',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-gray-950 text-gray-100 min-h-screen`}>
        <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 font-semibold text-white">
              <span className="text-blue-400 text-xl">◈</span>
              <span>ClaimCheck Studio</span>
              <span className="text-xs text-blue-400 bg-blue-950/50 border border-blue-800/50 rounded px-1.5 py-0.5 ml-1">alpha</span>
            </a>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <a href="/review" className="hover:text-gray-300">Review</a>
              <a href="/compliance" className="hover:text-gray-300">Compliance</a>
              <a href="/outputs" className="hover:text-gray-300">Outputs</a>
              <a href="/access" className="hover:text-gray-300">Access</a>
              <a href="/beta" className="hover:text-gray-300">Beta Ops</a>
              <a href="/eval" className="hover:text-gray-300">Eval</a>
              <a href="/admin" className="hover:text-gray-300">Ops</a>
              <a href="https://citebundle.com" className="hover:text-gray-300">citebundle.com</a>
              <a href="mailto:hello@citebundle.com" className="hover:text-gray-300">hello@citebundle.com</a>
            </div>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-gray-800 mt-16 py-6 text-center text-xs text-gray-600">
          ClaimCheck Studio Alpha &middot; <a href="https://citebundle.com" className="hover:text-gray-400">citebundle.com</a> &middot; <a href="mailto:hello@citebundle.com" className="hover:text-gray-400">hello@citebundle.com</a>
        </footer>
      </body>
    </html>
  )
}
