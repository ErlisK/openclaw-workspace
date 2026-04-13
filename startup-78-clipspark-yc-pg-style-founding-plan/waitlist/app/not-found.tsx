import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950 flex items-center justify-center px-4">
      <div className="max-w-lg text-center">
        <div className="text-7xl mb-6">⚡</div>
        <h1 className="text-6xl font-black text-white mb-4">404</h1>
        <h2 className="text-2xl font-bold text-white mb-4">Page not found</h2>
        <p className="text-gray-400 mb-8">
          Looks like this clip didn&apos;t make the cut. Head back and join the waitlist for early access.
        </p>
        <Link
          href="/"
          className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold px-8 py-3 rounded-xl transition-all"
        >
          ← Back to ClipSpark
        </Link>
      </div>
    </div>
  )
}
