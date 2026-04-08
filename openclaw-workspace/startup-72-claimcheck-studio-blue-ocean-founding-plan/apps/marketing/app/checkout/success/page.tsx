export default function CheckoutSuccess() {
  return (
    <div className="pt-14 min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="text-5xl mb-6">🎉</div>
        <h1 className="text-2xl font-bold text-white mb-3">You're in!</h1>
        <p className="text-gray-400 mb-8">
          Your ClaimCheck Studio trial has started. Head to the app to create your first session.
        </p>
        <a href="https://app.citebundle.com"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
          Open ClaimCheck Studio →
        </a>
      </div>
    </div>
  )
}
