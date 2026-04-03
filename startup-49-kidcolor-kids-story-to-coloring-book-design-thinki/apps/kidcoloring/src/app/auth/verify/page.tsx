import Link from 'next/link'

export default function AuthVerifyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-md w-full">
        <div className="text-6xl mb-6">📬</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Check your email</h1>
        <p className="text-gray-500 mb-6 leading-relaxed">
          We sent you a magic link. Click it to save your book and access it any time.
          <br /><br />
          <span className="text-sm">It expires in 1 hour. Check your spam folder if you don&apos;t see it.</span>
        </p>
        <div className="space-y-3">
          <Link href="/"
            className="block w-full py-3 bg-violet-600 text-white font-bold rounded-2xl hover:bg-violet-700 transition-colors">
            Back to home
          </Link>
          <p className="text-xs text-gray-400">
            Your coloring book is still accessible via the original link.
          </p>
        </div>
      </div>
    </div>
  )
}
