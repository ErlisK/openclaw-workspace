"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const TRADES = [
  "Electrician",
  "Plumber",
  "HVAC Technician",
  "Welder",
  "Carpenter",
  "Pipefitter",
  "Sheet Metal Worker",
  "Ironworker",
  "Other",
];

const REGIONS = [
  "California",
  "Texas",
  "New York",
  "Illinois",
  "Florida",
  "Washington",
  "Colorado",
  "Ontario, Canada",
  "British Columbia, Canada",
  "Other",
];

export default function Home() {
  const [role, setRole] = useState<"tradesperson" | "employer" | "staffing" | "">("");
  const [email, setEmail] = useState("");
  const [trade, setTrade] = useState("");
  const [region, setRegion] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [painNotes, setPainNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !role) return;
    setLoading(true);
    setError("");

    const { error: dbError } = await supabase.from("waitlist").insert({
      email,
      role,
      trade: trade || null,
      region: region || null,
      company_name: companyName || null,
      pain_notes: painNotes || null,
      referrer: typeof window !== "undefined" ? document.referrer : null,
    });

    if (dbError && dbError.code !== "23505") {
      // 23505 = duplicate email; treat as success
      setError("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#0f1117] text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight text-white">
            Cert<span className="text-yellow-400">Clip</span>
          </span>
          <span className="text-xs bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded-full font-medium">
            Beta
          </span>
        </div>
        <a
          href="#signup"
          className="bg-yellow-400 hover:bg-yellow-300 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Get Early Access
        </a>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block bg-white/5 border border-white/10 text-sm text-gray-400 px-4 py-1.5 rounded-full mb-6">
          🏗️ Built for electricians, plumbers, HVAC techs, and welders
        </div>
        <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6 tracking-tight">
          Your skills are real.
          <br />
          <span className="text-yellow-400">Now prove it in 90 seconds.</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          CertClip is the verified credential marketplace for tradespeople.
          Upload a short work sample video, get reviewed by a vetted journeyman,
          and carry jurisdiction-tagged badges that any employer can trust —
          anywhere.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="#signup"
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-lg px-8 py-4 rounded-xl transition-colors"
          >
            Join the Waitlist →
          </a>
          <a
            href="#how-it-works"
            className="border border-white/20 hover:border-white/40 text-white font-medium text-lg px-8 py-4 rounded-xl transition-colors"
          >
            See How It Works
          </a>
        </div>
        <p className="text-sm text-gray-600 mt-4">
          Free for tradespeople · No credit card required
        </p>
      </section>

      {/* Stats bar */}
      <section className="border-y border-white/10 bg-white/5">
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { label: "Average days to verify a new hire", value: "7–14", suffix: " days" },
            { label: "Of employers have had a skill-mismatch hire", value: "40%", suffix: "" },
            { label: "First-week send-back rate at staffing agencies", value: "25%", suffix: "" },
            { label: "Tradespeople switch jobs across state lines yearly", value: "15%", suffix: "" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-black text-yellow-400 mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500 leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Problem Section */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-black text-center mb-4">
          Hiring tradespeople is broken
        </h2>
        <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
          Paper certs get lost. Reference calls take days. Skill claims can&apos;t
          be verified. And one bad hire can cost tens of thousands in rework.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: "📄",
              title: "For Employers",
              pains: [
                "3–14 days to verify credentials",
                "No way to assess actual skill quality",
                "Code-compliance proof requires hours of research",
                "Fraudulent certs are common and hard to catch",
              ],
            },
            {
              icon: "🔧",
              title: "For Tradespeople",
              pains: [
                "Your skills are invisible to new employers",
                "Relocating means re-proving everything from scratch",
                "Sitting idle between jobs while employers verify",
                "Losing bids to less-skilled workers who oversell",
              ],
            },
            {
              icon: "🏢",
              title: "For Staffing Firms",
              pains: [
                "25% first-week return rate from skill mismatch",
                "Manual cert collection from every candidate",
                "Client audits require scrambling for documentation",
                "Screening takes 45–90 min per candidate",
              ],
            },
          ].map((card) => (
            <div
              key={card.title}
              className="bg-white/5 border border-white/10 rounded-xl p-6"
            >
              <div className="text-3xl mb-3">{card.icon}</div>
              <h3 className="text-lg font-bold mb-4">{card.title}</h3>
              <ul className="space-y-2">
                {card.pains.map((pain) => (
                  <li key={pain} className="flex items-start gap-2 text-sm text-gray-400">
                    <span className="text-red-400 mt-0.5">✕</span>
                    {pain}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="bg-white/5 border-y border-white/10 py-20"
      >
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-black text-center mb-4">
            How CertClip works
          </h2>
          <p className="text-gray-400 text-center mb-12">
            From upload to verified badge in 24–72 hours.
          </p>
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <h3 className="text-yellow-400 font-bold text-sm uppercase tracking-wider mb-6">
                For Tradespeople
              </h3>
              <div className="space-y-6">
                {[
                  {
                    step: "1",
                    title: "Film a 10–90 second task clip",
                    desc: "Show a real task — running conduit, sweat-soldering copper, commissioning a mini-split. No acting required.",
                  },
                  {
                    step: "2",
                    title: "Get reviewed by a vetted journeyman",
                    desc: "A licensed journeyman in your trade reviews your clip and leaves timestamped feedback. Jurisdiction-tagged for your region.",
                  },
                  {
                    step: "3",
                    title: "Earn verified micro-badges",
                    desc: "Badges are tied to specific tasks and local code standards. Your credential wallet is shareable via link or QR code.",
                  },
                  {
                    step: "4",
                    title: "Get found by employers searching your skills",
                    desc: "Employers search by trade, skill tag, and region. Your verified portfolio surfaces when it matters most.",
                  },
                ].map((s) => (
                  <div key={s.step} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-yellow-400 text-black font-black flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                      {s.step}
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{s.title}</h4>
                      <p className="text-sm text-gray-400">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-blue-400 font-bold text-sm uppercase tracking-wider mb-6">
                For Employers & Staffing Firms
              </h3>
              <div className="space-y-6">
                {[
                  {
                    step: "1",
                    title: "Search verified portfolios by skill + region",
                    desc: "Filter by trade, specific skill tags (e.g., 'Title 24', '3-phase wiring'), and jurisdiction. See video evidence, not just claims.",
                  },
                  {
                    step: "2",
                    title: "Commission a live assessment gig",
                    desc: "Book a paid 30-minute live verification with a mentor present — or request a randomized challenge task to confirm authenticity.",
                  },
                  {
                    step: "3",
                    title: "Download audit-ready credential reports",
                    desc: "Every badge comes with a timestamped, mentor-signed credential you can present to AHJs, insurance carriers, or clients.",
                  },
                  {
                    step: "4",
                    title: "Deploy with confidence",
                    desc: "Hire faster. Reduce rework. Meet code. CertClip Verified workers come with documented skill proof before day one.",
                  },
                ].map((s) => (
                  <div key={s.step} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white font-black flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                      {s.step}
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{s.title}</h4>
                      <p className="text-sm text-gray-400">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust / Anti-fraud */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-black text-center mb-4">
          Designed to prevent fraud
        </h2>
        <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
          We know fake credentials are a real problem. CertClip has multiple
          fraud-resistance layers built into the core product.
        </p>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
          {[
            {
              icon: "🎲",
              title: "Randomized challenge prompts",
              desc: "Workers receive surprise task prompts during recording to prevent pre-filmed submissions.",
            },
            {
              icon: "📹",
              title: "Live verification sessions",
              desc: "Optional real-time mentor-watched sessions with screen-share and live task challenges.",
            },
            {
              icon: "🔗",
              title: "Union & training partner vetting",
              desc: "Mentors are verified through IBEW, UA, ABC, and community college trade programs.",
            },
            {
              icon: "📋",
              title: "Auditable credential wallet",
              desc: "Every badge has an immutable log of who reviewed it, when, and what evidence supports it.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-white/5 border border-white/10 rounded-xl p-5"
            >
              <div className="text-2xl mb-3">{feature.icon}</div>
              <h3 className="font-semibold mb-2 text-sm">{feature.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Signup Form */}
      <section
        id="signup"
        className="bg-gradient-to-b from-yellow-400/5 to-transparent border-t border-yellow-400/20 py-20"
      >
        <div className="max-w-xl mx-auto px-6">
          <h2 className="text-3xl font-black text-center mb-3">
            Get early access
          </h2>
          <p className="text-gray-400 text-center mb-10">
            Be first when we launch. Free for tradespeople. Help us shape the
            product — early members get lifetime discounts.
          </p>

          {submitted ? (
            <div className="text-center bg-green-500/10 border border-green-500/30 rounded-xl p-10">
              <div className="text-4xl mb-4">🎉</div>
              <h3 className="text-xl font-bold mb-2">You&apos;re on the list!</h3>
              <p className="text-gray-400">
                We&apos;ll reach out as soon as we&apos;re ready to onboard early users.
                Keep an eye on your inbox.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role selector */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  I am a... <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { value: "tradesperson", label: "🔧 Tradesperson" },
                      { value: "employer", label: "🏗️ Employer / GC" },
                      { value: "staffing", label: "🏢 Staffing Firm" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRole(opt.value)}
                      className={`py-3 px-3 rounded-lg border text-sm font-medium transition-all ${
                        role === opt.value
                          ? "bg-yellow-400 border-yellow-400 text-black"
                          : "bg-white/5 border-white/20 text-gray-300 hover:border-white/40"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Email address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors"
                />
              </div>

              {/* Trade (for tradespeople) */}
              {role === "tradesperson" && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Your trade
                  </label>
                  <select
                    value={trade}
                    onChange={(e) => setTrade(e.target.value)}
                    className="w-full bg-[#1a1d27] border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition-colors"
                  >
                    <option value="">Select your trade...</option>
                    {TRADES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Company name (for employer/staffing) */}
              {(role === "employer" || role === "staffing") && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Company name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="ABC Electric Co."
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors"
                  />
                </div>
              )}

              {/* Region */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Your region
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full bg-[#1a1d27] border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition-colors"
                >
                  <option value="">Select your region...</option>
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pain notes */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  What&apos;s your biggest challenge with trade credentials?{" "}
                  <span className="text-gray-500">(optional)</span>
                </label>
                <textarea
                  value={painNotes}
                  onChange={(e) => setPainNotes(e.target.value)}
                  placeholder="e.g. I moved from Texas to California and had to prove everything from scratch..."
                  rows={3}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors resize-none"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !role || !email}
                className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-lg py-4 rounded-xl transition-colors"
              >
                {loading ? "Joining..." : "Join the Waitlist →"}
              </button>

              <p className="text-xs text-gray-600 text-center">
                We&apos;ll never spam you or sell your information. Unsubscribe
                anytime.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <div className="font-black text-white">
            Cert<span className="text-yellow-400">Clip</span>
          </div>
          <div>certclip.com · Building the verified credential layer for the trades</div>
          <div>© 2026 CertClip. All rights reserved.</div>
        </div>
      </footer>
    </main>
  );
}
