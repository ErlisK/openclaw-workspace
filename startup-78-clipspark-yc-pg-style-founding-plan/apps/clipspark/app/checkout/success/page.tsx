import Link from 'next/link'
export default function CheckoutSuccessPage() {
  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center text-center px-4">
      <div className="max-w-md space-y-6">
        <div className="text-6xl">🎉</div>
        <h1 className="text-2xl font-bold">You're in!</h1>
        <p className="text-gray-400">
          Your subscription is active. Time to make some clips.
        </p>
        <Link href="/upload" className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
          Create your first clip →
        </Link>
      </div>
    </main>
  )
}
