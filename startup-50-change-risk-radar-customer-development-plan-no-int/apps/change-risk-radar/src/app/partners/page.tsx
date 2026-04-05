import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Partner Program — Change Risk Radar",
  description: "Refer customers and earn 20% recurring commission. Join the Change Risk Radar partner program.",
};

export const dynamic = "force-dynamic";

const BENEFITS = [
  { icon: "💰", title: "20% Recurring Commission", desc: "Earn 20% on every paying customer you refer, for the lifetime of their subscription." },
  { icon: "🤝", title: "Co-Sell Support", desc: "We join your demos, help close deals, and provide dedicated partner success." },
  { icon: "📚", title: "Partner Portal", desc: "Track your pipeline, leads, and commissions in real-time from your partner dashboard." },
  { icon: "🎯", title: "Sales Enablement", desc: "Battle cards, demo environments, case studies, and objection-handling guides included." },
  { icon: "🔧", title: "Technical Integration", desc: "API access, whitelabel options, and integration support for tech partners." },
  { icon: "📣", title: "Co-Marketing", desc: "Joint webinars, blog posts, and newsletter placements to your audiences." },
];

const TIERS = [
  {
    tier: "Standard",
    color: "border-gray-200",
    header: "bg-gray-50",
    commission: "20%",
    requirements: "0–$50k ARR referred",
    perks: ["Partner dashboard", "Sales collateral", "Email support"],
  },
  {
    tier: "Silver",
    color: "border-blue-300",
    header: "bg-blue-50",
    commission: "25%",
    requirements: "$50k–$150k ARR referred",
    perks: ["Everything in Standard", "Co-sell support", "Dedicated partner manager", "Quarterly business review"],
  },
  {
    tier: "Gold",
    color: "border-yellow-400",
    header: "bg-yellow-50",
    commission: "30%",
    requirements: "$150k+ ARR referred",
    perks: ["Everything in Silver", "Custom integration support", "Joint go-to-market plan", "Annual partner summit invite"],
  },
];

const PARTNER_TYPES = [
  { type: "Referral", icon: "🤝", desc: "Refer customers, earn commission. No technical work required." },
  { type: "Reseller", icon: "📦", desc: "Sell Change Risk Radar under your brand to your existing customers." },
  { type: "Integration", icon: "🔌", desc: "Build a native integration and list in our integration marketplace." },
  { type: "Agency", icon: "🏢", desc: "Manage CRR deployments for your clients and earn referral fees." },
  { type: "Content", icon: "✍️", desc: "Create content (blogs, courses, videos) and earn affiliate commissions." },
];

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 text-white py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block bg-indigo-800/50 border border-indigo-600/50 rounded-full px-4 py-1 text-sm text-indigo-200 mb-5">
            Partner Program
          </span>
          <h1 className="text-5xl font-bold mb-4">Grow With Change Risk Radar</h1>
          <p className="text-xl text-indigo-200 mb-8 max-w-2xl mx-auto">
            Earn 20% recurring commission on every customer you refer. Join consultants, agencies, and technology partners building on our platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#apply"
              className="px-8 py-4 bg-white text-indigo-700 rounded-xl font-bold text-lg hover:bg-indigo-50 transition-colors"
            >
              Apply Now →
            </a>
            <Link
              href="/sales"
              className="px-8 py-4 border border-indigo-500 text-white rounded-xl font-semibold text-lg hover:border-white transition-colors"
            >
              See Sales Playbook
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Benefits */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">What Partners Get</h2>
          <p className="text-gray-500 text-center mb-10">Everything you need to refer, resell, and build on Change Risk Radar.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BENEFITS.map(b => (
              <div key={b.title} className="p-6 border border-gray-200 rounded-2xl hover:border-indigo-300 transition-colors">
                <div className="text-3xl mb-3">{b.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{b.title}</h3>
                <p className="text-sm text-gray-600">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Partner types */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">Partner Types</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PARTNER_TYPES.map(pt => (
              <div key={pt.type} className="bg-gray-50 rounded-xl p-5 flex gap-4 items-start">
                <span className="text-2xl">{pt.icon}</span>
                <div>
                  <p className="font-bold text-gray-900">{pt.type} Partner</p>
                  <p className="text-sm text-gray-600 mt-1">{pt.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tiers */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">Commission Tiers</h2>
          <p className="text-gray-500 text-center mb-10">Advance tiers automatically as you refer more ARR.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TIERS.map(t => (
              <div key={t.tier} className={`border-2 ${t.color} rounded-2xl overflow-hidden`}>
                <div className={`${t.header} p-5`}>
                  <h3 className="text-xl font-bold text-gray-900">{t.tier}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{t.requirements}</p>
                  <div className="text-3xl font-bold text-gray-900 mt-3">{t.commission}</div>
                  <p className="text-xs text-gray-500">recurring commission</p>
                </div>
                <div className="p-5">
                  <ul className="space-y-2">
                    {t.perks.map(perk => (
                      <li key={perk} className="text-sm text-gray-700 flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        {perk}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current partners */}
        <div className="mb-16 bg-gray-50 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Active Partners</h2>
          <p className="text-gray-600 text-sm mb-6">Join these partners already earning recurring commissions.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "CloudSec Advisors", type: "Referral · Silver" },
              { name: "SaaS Due Diligence Co.", type: "Reseller · Gold" },
              { name: "ComplianceStack", type: "Integration · Standard" },
              { name: "FinOps Partners", type: "Agency · Silver" },
            ].map(p => (
              <div key={p.name} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold mx-auto mb-2">
                  {p.name[0]}
                </div>
                <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p.type}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Application form */}
        <div id="apply" className="bg-indigo-600 rounded-2xl p-10 text-white">
          <div className="max-w-xl mx-auto">
            <h2 className="text-3xl font-bold mb-2 text-center">Apply to Join</h2>
            <p className="text-indigo-100 text-center mb-8 text-sm">
              We review applications within 2 business days. Active partners get immediate access to the partner dashboard.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                await fetch("/api/support/tickets", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    reporter_email: fd.get("email"),
                    reporter_name: fd.get("name"),
                    category: "general",
                    priority: "normal",
                    subject: `Partner Application: ${fd.get("company")} (${fd.get("partner_type")})`,
                    description: `Partner Type: ${fd.get("partner_type")}\nCompany: ${fd.get("company")}\nWebsite: ${fd.get("website")}\nHow I help customers: ${fd.get("description")}`,
                  }),
                });
                alert("Application submitted! We'll review and respond within 2 business days.");
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <input name="name" type="text" required placeholder="Your name" className="px-4 py-3 rounded-lg text-gray-900 text-sm w-full" />
                <input name="email" type="email" required placeholder="Work email" className="px-4 py-3 rounded-lg text-gray-900 text-sm w-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input name="company" type="text" required placeholder="Company name" className="px-4 py-3 rounded-lg text-gray-900 text-sm w-full" />
                <input name="website" type="url" placeholder="Website (optional)" className="px-4 py-3 rounded-lg text-gray-900 text-sm w-full" />
              </div>
              <select name="partner_type" className="w-full px-4 py-3 rounded-lg text-gray-900 text-sm">
                <option value="referral">Referral Partner</option>
                <option value="reseller">Reseller</option>
                <option value="integration">Integration Partner</option>
                <option value="agency">Agency</option>
                <option value="content">Content / Affiliate</option>
              </select>
              <textarea
                name="description"
                rows={3}
                placeholder="How do you help customers? Who is your audience? (1-2 sentences)"
                className="w-full px-4 py-3 rounded-lg text-gray-900 text-sm"
              />
              <button
                type="submit"
                className="w-full py-3 bg-white text-indigo-700 rounded-xl font-bold hover:bg-indigo-50 transition-colors"
              >
                Submit Application →
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
