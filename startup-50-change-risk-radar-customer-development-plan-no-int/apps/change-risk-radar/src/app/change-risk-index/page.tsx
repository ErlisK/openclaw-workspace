import { Metadata } from "next";
import Link from "next/link";
import { listRiskIndexMonths, generateRiskIndex, publishRiskIndex } from "@/lib/change-risk-index";

export const metadata: Metadata = {
  title: "SaaS Change Risk Index — Monthly Vendor Risk Intelligence",
  description: "Monthly analysis of risk-creating changes across Stripe, AWS, Shopify, Salesforce, Google Workspace and 25+ SaaS vendors. Pricing changes, ToS updates, API deprecations, security scope expansions.",
};

export const dynamic = "force-dynamic";

const CATEGORY_EMOJI: Record<string, string> = {
  pricing: "💰",
  legal: "⚖️",
  security: "🔒",
  operational: "⚙️",
};

export default async function ChangeRiskIndexPage() {
  let months = await listRiskIndexMonths();

  // Auto-generate current month if no data
  if (months.length === 0) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const report = await generateRiskIndex(currentMonth);
    await publishRiskIndex(report);
    months = await listRiskIndexMonths();
  }

  const latest = months[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 via-indigo-950 to-indigo-900 text-white py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-800/50 border border-indigo-600/50 rounded-full px-4 py-1.5 text-sm text-indigo-200 mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Updated monthly · Free with email
          </div>
          <h1 className="text-5xl font-bold mb-4 leading-tight">
            SaaS Change Risk Index
          </h1>
          <p className="text-xl text-indigo-200 mb-6 max-w-2xl">
            Every month, our Observatory scans 28+ SaaS vendor docs for changes that create
            pricing, legal, security, and operational risk — then scores and ranks each vendor.
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-indigo-300">
            <span>📊 Vendor risk scores</span>
            <span>📈 MoM change delta</span>
            <span>🔍 Top changes per vendor</span>
            <span>🏆 Risk leaderboard</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Latest issue CTA */}
        {latest && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-10 shadow-sm">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600 bg-indigo-50 px-2 py-1 rounded mb-3 inline-block">
                  Latest Issue
                </span>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {latest.month_label} — SaaS Change Risk Report
                </h2>
                <p className="text-gray-600 mb-4">
                  {latest.total_changes} vendor changes detected · {latest.high_risk_count} high-severity events
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/change-risk-index/${latest.month}`}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-colors"
                  >
                    Read Full Report →
                  </Link>
                  <Link
                    href={`/change-risk-index/${latest.month}?gate=1`}
                    className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-semibold text-sm hover:border-indigo-300 transition-colors"
                  >
                    📧 Get via Email
                  </Link>
                </div>
              </div>
              <div className="hidden md:flex flex-col gap-3 text-right">
                <div className="bg-red-50 rounded-xl px-5 py-3 text-right">
                  <p className="text-2xl font-bold text-red-600">{latest.high_risk_count}</p>
                  <p className="text-xs text-red-500">High-risk events</p>
                </div>
                <div className="bg-blue-50 rounded-xl px-5 py-3 text-right">
                  <p className="text-2xl font-bold text-blue-600">{latest.total_changes}</p>
                  <p className="text-xs text-blue-500">Total changes</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Archive */}
        {months.length > 1 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Past Issues</h2>
            <div className="space-y-3">
              {months.slice(1).map(m => (
                <Link
                  key={m.month}
                  href={`/change-risk-index/${m.month}`}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{m.month_label}</p>
                    <p className="text-sm text-gray-500">
                      {m.total_changes} changes · {m.high_risk_count} high-severity
                    </p>
                  </div>
                  <span className="text-indigo-600 text-sm font-medium">Read →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* What's covered */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-6">What We Track</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Object.entries(CATEGORY_EMOJI).map(([cat, emoji]) => (
              <div key={cat} className="text-center">
                <div className="text-3xl mb-2">{emoji}</div>
                <p className="font-semibold text-gray-800 capitalize">{cat}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {cat === "pricing" && "Price changes, billing model updates, fee changes"}
                  {cat === "legal" && "ToS updates, DPA changes, GDPR mandates"}
                  {cat === "security" && "OAuth scopes, IAM changes, permission escalations"}
                  {cat === "operational" && "API deprecations, breaking changes, downtime policies"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Lead capture */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-2">Get the Index in Your Inbox</h2>
          <p className="text-indigo-100 mb-6 text-sm">
            Monthly report + real-time alerts when we detect high-severity changes in your stack.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="you@company.com"
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 text-sm outline-none"
              id="index-email-input"
            />
            <button
              className="px-6 py-3 bg-white text-indigo-700 rounded-lg font-semibold text-sm hover:bg-indigo-50 transition-colors whitespace-nowrap"
              onClick={undefined}
            >
              Subscribe Free
            </button>
          </div>
          <p className="text-xs text-indigo-200 mt-3">No spam. Unsubscribe anytime.</p>
        </div>

        {/* CTA to product */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            Want real-time alerts — not just monthly reports?
          </p>
          <Link
            href="/auth/signup"
            className="inline-block px-8 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
          >
            Start 14-Day Free Trial →
          </Link>
        </div>
      </div>
    </div>
  );
}
