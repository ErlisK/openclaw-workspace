import Link from 'next/link'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-md w-full">
        <div className="text-6xl mb-6">😕</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Link expired or invalid</h1>
        <p className="text-gray-500 mb-6 leading-relaxed">
          Magic links expire after 1 hour. Request a new one from the preview page,
          or continue using KidColoring without an account.
        </p>
        <div className="space-y-3">
          <Link href="/"
            className="block w-full py-3 bg-violet-600 text-white font-bold rounded-2xl hover:bg-violet-700 transition-colors">
            Back to home
          </Link>
          <p className="text-xs text-gray-400">
            Your book is still saved — just request a new magic link from the preview page.
          </p>
        </div>
      </div>
    </div>
  )
}
