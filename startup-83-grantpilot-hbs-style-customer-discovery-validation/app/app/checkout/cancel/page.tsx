import Link from 'next/link'

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-5">↩️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Checkout cancelled</h1>
        <p className="text-gray-500 mb-6">No charges were made. You can return to the pricing page and try again anytime.</p>
        <Link
          href="/pricing"
          className="inline-block bg-indigo-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Back to pricing
        </Link>
        <div className="mt-4">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">Dashboard</Link>
        </div>
      </div>
    </div>
  )
}
