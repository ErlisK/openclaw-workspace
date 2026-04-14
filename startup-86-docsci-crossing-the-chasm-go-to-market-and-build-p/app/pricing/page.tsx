import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pricing — DocsCI",
  description: "Simple, transparent pricing for docs CI. Free tier, Pro at $99/mo, and Enterprise for large teams.",
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gray-950">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          <span className="font-bold text-xl text-white">DocsCI</span>
        </Link>
        <div className="flex gap-6 text-sm text-gray-400">
          <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
          <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
          <Link href="/pricing" className="text-white font-medium">Pricing</Link>
          <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
          <Link href="/signup" className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-lg transition-colors">Get started free</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Simple, transparent pricing</h1>
        <p className="text-gray-400 text-lg mb-12">Start free. Scale as your docs grow.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-left flex flex-col">
            <h2 className="text-xl font-bold text-white mb-1">Free</h2>
            <p className="text-3xl font-bold text-white mb-1">$0<span className="text-base font-normal text-gray-400">/mo</span></p>
            <p className="text-gray-500 text-sm mb-6">Perfect for open-source projects and evaluation</p>
            <ul className="space-y-3 text-sm text-gray-300 mb-8 flex-1">
              {["Up to 3 projects", "100 runs/month", "Python & Node sandboxes", "GitHub PR comments", "7-day run history"].map(f => (
                <li key={f} className="flex items-center gap-2"><span className="text-green-400">✓</span>{f}</li>
              ))}
            </ul>
            <Link href="/signup" className="block w-full text-center bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors font-medium">
              Get started free
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-indigo-950 border-2 border-indigo-500 rounded-xl p-8 text-left flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              Most Popular
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Pro</h2>
            <p className="text-3xl font-bold text-white mb-1">$99<span className="text-base font-normal text-gray-400">/mo</span></p>
            <p className="text-gray-400 text-sm mb-6">For growing teams shipping frequently</p>
            <ul className="space-y-3 text-sm text-gray-300 mb-8 flex-1">
              {[
                "Up to 20 projects",
                "2,000 runs/month",
                "All language runtimes",
                "Priority support",
                "90-day run history",
                "Slack notifications",
                "API access",
              ].map(f => (
                <li key={f} className="flex items-center gap-2"><span className="text-indigo-300">✓</span>{f}</li>
              ))}
            </ul>
            <Link href="/signup?plan=pro" className="block w-full text-center bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors font-medium">
              Start Pro trial
            </Link>
          </div>

          {/* Enterprise */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-left flex flex-col">
            <h2 className="text-xl font-bold text-white mb-1">Enterprise</h2>
            <p className="text-3xl font-bold text-white mb-1">Custom</p>
            <p className="text-gray-400 text-sm mb-6">For Series B+ and platform teams</p>
            <ul className="space-y-3 text-sm text-gray-300 mb-8 flex-1">
              {["Unlimited projects & runs", "All language runtimes", "Customer-hosted runners", "SSO / SAML", "SLA + dedicated support", "Drift prediction & alerts", "Private API compliance"].map(f => (
                <li key={f} className="flex items-center gap-2"><span className="text-gray-400">✓</span>{f}</li>
              ))}
            </ul>
            <a href="mailto:hello@snippetci.com?subject=Enterprise inquiry" className="block w-full text-center bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors font-medium">
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
