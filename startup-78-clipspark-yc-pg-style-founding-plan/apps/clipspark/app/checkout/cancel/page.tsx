import Link from 'next/link'
export default function CheckoutCancelPage() {
  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center text-center px-4">
      <div className="max-w-md space-y-6">
        <div className="text-4xl">👋</div>
        <h1 className="text-2xl font-bold">No worries</h1>
        <p className="text-gray-400">
          You cancelled checkout. Your account is still active on the free plan.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
          <Link href="/pricing" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            View plans
          </Link>
        </div>
      </div>
    </main>
  )
}
