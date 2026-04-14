import Link from "next/link"

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gray-950">
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Simple, transparent pricing</h1>
        <p className="text-gray-400 text-lg mb-12">Start free. Scale as your docs grow.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* Free */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-left">
            <h2 className="text-xl font-bold text-white mb-1">Free</h2>
            <p className="text-3xl font-bold text-white mb-1">$0<span className="text-base font-normal text-gray-400">/mo</span></p>
            <p className="text-gray-500 text-sm mb-6">Perfect for open-source projects and evaluation</p>
            <ul className="space-y-3 text-sm text-gray-300 mb-8">
              {["Up to 3 projects", "100 runs/month", "Python & Node sandboxes", "GitHub PR comments", "7-day run history"].map(f => (
                <li key={f} className="flex items-center gap-2"><span className="text-green-400">✓</span>{f}</li>
              ))}
            </ul>
            <Link href="/signup" className="block w-full text-center bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors font-medium">
              Get started free
            </Link>
          </div>

          {/* Enterprise */}
          <div className="bg-indigo-950 border border-indigo-700 rounded-xl p-8 text-left">
            <h2 className="text-xl font-bold text-white mb-1">Enterprise</h2>
            <p className="text-3xl font-bold text-white mb-1">Custom</p>
            <p className="text-gray-400 text-sm mb-6">For Series B+ and platform teams</p>
            <ul className="space-y-3 text-sm text-gray-300 mb-8">
              {["Unlimited projects & runs", "All language runtimes", "Customer-hosted runners", "SSO / SAML", "SLA + dedicated support", "Drift prediction & alerts", "Private API compliance"].map(f => (
                <li key={f} className="flex items-center gap-2"><span className="text-indigo-400">✓</span>{f}</li>
              ))}
            </ul>
            <a href="mailto:hello@snippetci.com?subject=Enterprise inquiry" className="block w-full text-center bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors font-medium">
              Contact us
            </a>
          </div>
        </div>

        <p className="text-gray-600 text-sm mt-10">
          By signing up you agree to our{' '}
          <Link href="/terms" className="text-gray-400 hover:underline">Terms of Service</Link> and{' '}
          <Link href="/privacy" className="text-gray-400 hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  )
}
