import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'TeachRepo pricing — free self-hosted core or hosted SaaS. No per-seat fees, no surprise bills.',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, Honest Pricing</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Start free and self-host forever, or let us handle the infrastructure.
            No per-student fees, no surprise bills.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border-2 border-gray-200 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Free / Self-Hosted</h2>
              <div className="mt-2 text-4xl font-bold text-gray-900">$0 <span className="text-lg font-normal text-gray-500">forever</span></div>
            </div>
            <ul className="space-y-3 mb-8 text-gray-700">
              <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span> Full platform source code on GitHub</li>
              <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span> Deploy to Vercel, Netlify, or your own server</li>
              <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span> Git-native course authoring (Markdown + YAML)</li>
              <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span> Stripe/Gumroad checkout integration</li>
              <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span> Auto-graded quizzes and code sandboxes</li>
              <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span> Affiliate/referral tracking</li>
            </ul>
            <a
              href="https://github.com/ErlisK/openclaw-workspace"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-xl border-2 border-gray-900 px-6 py-3 text-center font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
            >
              View on GitHub →
            </a>
          </div>
          <div className="rounded-2xl border-2 border-violet-600 p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-4 py-1 text-xs font-semibold text-white">
              RECOMMENDED
            </div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Hosted SaaS</h2>
              <div className="mt-2 text-4xl font-bold text-gray-900">$29 <span className="text-lg font-normal text-gray-500">/month</span></div>
            </div>
            <ul className="space-y-3 mb-8 text-gray-700">
              <li className="flex items-start gap-2"><span className="text-violet-500 mt-0.5">✓</span> Everything in Free, fully managed</li>
              <li className="flex items-start gap-2"><span className="text-violet-500 mt-0.5">✓</span> One-click deploy — no Vercel/DB config</li>
              <li className="flex items-start gap-2"><span className="text-violet-500 mt-0.5">✓</span> Custom domain support</li>
              <li className="flex items-start gap-2"><span className="text-violet-500 mt-0.5">✓</span> Marketplace listing and discovery</li>
              <li className="flex items-start gap-2"><span className="text-violet-500 mt-0.5">✓</span> Analytics dashboard</li>
              <li className="flex items-start gap-2"><span className="text-violet-500 mt-0.5">✓</span> Priority email support</li>
              <li className="flex items-start gap-2"><span className="text-violet-500 mt-0.5">✓</span> Optional revenue-share marketplace (10%)</li>
            </ul>
            <a
              href="/auth/signup"
              className="block w-full rounded-xl bg-violet-600 px-6 py-3 text-center font-semibold text-white hover:bg-violet-700 transition-colors"
            >
              Start free trial →
            </a>
          </div>
        </div>
        <div className="mt-16 text-center">
          <p className="text-gray-500">
            Questions? Email{' '}
            <a href="mailto:hello@teachrepo.com" className="text-violet-600 hover:underline">
              hello@teachrepo.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
