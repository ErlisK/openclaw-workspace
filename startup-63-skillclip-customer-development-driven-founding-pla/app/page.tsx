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
  "Elevator Mechanic",
  "Fire Sprinkler Fitter",
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
  "Arizona",
  "Georgia",
  "Ohio",
  "Ontario, Canada",
  "British Columbia, Canada",
  "Alberta, Canada",
  "Other",
];

const INTENDED_USE: Record<Role, string[]> = {
  tradesperson: [
    "Build a verified skills portfolio",
    "Find jobs faster",
    "Prove credentials after relocating",
    "Get mentor feedback on my work",
    "Earn badges for specific specializations",
  ],
  employer: [
    "Verify worker skills before hiring",
    "Confirm code-compliance credentials",
    "Reduce time-to-deploy",
    "Prevent fraudulent certifications",
    "Search for workers with specific skills",
  ],
  staffing: [
    "Pre-screen candidates at scale",
    "Reduce first-week send-backs",
    "Meet client certification audit requirements",
    "Differentiate with verified worker pool",
    "Integrate with our ATS system",
  ],
};

type Role = "tradesperson" | "employer" | "staffing";

export default function Home() {
  const [role, setRole] = useState<Role | "">("");
  const [email, setEmail] = useState("");
  const [trade, setTrade] = useState("");
  const [region, setRegion] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [intendedUse, setIntendedUse] = useState("");
  const [painNotes, setPainNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !role) return;
    setLoading(true);
    setError("");

    const utmParams = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;

    const { error: dbError } = await supabase.from("waitlist").insert({
      email: email.toLowerCase().trim(),
      role,
      trade: trade || null,
      region: region || null,
      company_name: companyName || null,
      company_size: companySize || null,
      intended_use: intendedUse || null,
      pain_notes: painNotes || null,
      utm_source: utmParams?.get("utm_source") || null,
      utm_medium: utmParams?.get("utm_medium") || null,
      utm_campaign: utmParams?.get("utm_campaign") || null,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
    });

    if (dbError && dbError.code !== "23505") {
      setError("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  };

  const intendedUseOptions = role ? INTENDED_USE[role as Role] : [];

  return (
    <main className="min-h-screen bg-[#0f1117] text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight text-white">
            Cert<span className="text-yellow-400">Clip</span>
          </span>
          <span className="text-xs bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded-full font-medium">
            Early Access
          </span>
        </div>
        <a
          href="#signup"
          className="bg-yellow-400 hover:bg-yellow-300 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Get Early Access →
        </a>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block bg-white/5 border border-white/10 text-sm text-gray-400 px-4 py-1.5 rounded-full mb-6">
          🏗️ For electricians, plumbers, HVAC techs, welders &amp; more
        </div>
        <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6 tracking-tight">
          Your skills are real.
          <br />
          <span className="text-yellow-400">Now prove it in 90 seconds.</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          CertClip is the verified credential marketplace for skilled trades.
          Upload a short work-sample video, get reviewed by a vetted journeyman,
          and carry jurisdiction-tagged badges that any employer can trust —
          anywhere in the country.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <a
            href="#signup"
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-lg px-8 py-4 rounded-xl transition-colors"
          >
            Join the Waitlist — It&apos;s Free →
          </a>
          <a
            href="#how-it-works"
            className="border border-white/20 hover:border-white/40 text-white font-medium text-lg px-8 py-4 rounded-xl transition-colors"
          >
            See How It Works
          </a>
        </div>
        <p className="text-sm text-gray-500">
          Free forever for tradespeople · No credit card · Early members get lifetime discounts
        </p>
      </section>

      {/* Social proof bar */}
      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "7–14", label: "Days to verify a new hire (today)" },
            { value: "40%", label: "Employers have had a skill-mismatch hire" },
            { value: "25%", label: "First-week send-back rate at staffing firms" },
            { value: "$15K+", label: "Average cost of a bad trade hire" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-black text-yellow-400 mb-1">{s.value}</div>
              <div className="text-xs text-gray-500 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Problem */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-black mb-4">Hiring tradespeople is broken</h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Paper certs get lost. Reference calls take days. Skill claims can&apos;t be
            verified. And one bad hire can cost tens of thousands.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: "🔧",
              title: "For Tradespeople",
              color: "yellow",
              pains: [
                "Your skills are invisible to new employers",
                "Relocating means re-proving everything from scratch",
                "You sit idle while employers slowly verify you",
                "Better workers lose jobs to smooth talkers",
              ],
            },
            {
              icon: "🏗️",
              title: "For Employers & GCs",
              color: "blue",
              pains: [
                "3–14 days just to verify credentials",
                "No way to assess actual skill quality pre-hire",
                "Code-compliance proof requires hours of research",
                "Fraudulent certs are common and hard to catch",
              ],
            },
            {
              icon: "🏢",
              title: "For Staffing Firms",
              color: "purple",
              pains: [
                "25% first-week return rate from skill mismatch",
                "Manual cert collection from every candidate",
                "Client audits require scrambling for docs",
                "Screening takes 45–90 min per candidate",
              ],
            },
          ].map((card) => (
            <div key={card.title} className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="text-3xl mb-3">{card.icon}</div>
              <h3 className="text-lg font-bold mb-4">{card.title}</h3>
              <ul className="space-y-2">
                {card.pains.map((pain) => (
                  <li key={pain} className="flex items-start gap-2 text-sm text-gray-400">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">✕</span>
                    {pain}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white/[0.03] border-y border-white/10 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-4">How CertClip works</h2>
            <p className="text-gray-400">From upload to verified badge in 24–72 hours.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <div className="text-yellow-400 font-bold text-xs uppercase tracking-widest mb-6">
                For Tradespeople
              </div>
              <div className="space-y-7">
                {[
                  { n: "1", title: "Film a 10–90 second task clip", body: "Show a real task — running conduit, sweat-soldering, commissioning a mini-split. No script. No acting. Just your real work." },
                  { n: "2", title: "Get reviewed by a vetted journeyman", body: "A licensed journeyman in your trade watches your clip and leaves timestamped feedback. Every badge is jurisdiction-tagged for your region." },
                  { n: "3", title: "Earn verified micro-badges", body: "Badges are tied to specific tasks and local code standards. Your credential wallet lives at a shareable link — no app required to view." },
                  { n: "4", title: "Get discovered by the right employers", body: "Employers search by trade, skill tag, and region. Your verified profile surfaces to exactly who needs your skills." },
                ].map((s) => (
                  <div key={s.n} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-yellow-400 text-black font-black flex items-center justify-center text-sm flex-shrink-0 mt-0.5">{s.n}</div>
                    <div>
                      <h4 className="font-semibold mb-1">{s.title}</h4>
                      <p className="text-sm text-gray-400 leading-relaxed">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-blue-400 font-bold text-xs uppercase tracking-widest mb-6">
                For Employers &amp; Staffing
              </div>
              <div className="space-y-7">
                {[
                  { n: "1", title: "Search verified portfolios", body: "Filter by trade, specific skill tags (e.g. 'Title 24', '3-phase wiring', 'EPA 608'), and jurisdiction. See video evidence — not just claims." },
                  { n: "2", title: "Commission a live assessment", body: "Book a paid 30-minute live verification with a mentor present, or request a randomized challenge task to confirm authenticity on the spot." },
                  { n: "3", title: "Download audit-ready credential reports", body: "Every badge comes with a timestamped, mentor-signed report you can present to AHJs, insurance carriers, or client audits." },
                  { n: "4", title: "Deploy with confidence", body: "Reduce rework. Meet code. CertClip Verified workers come with documented skill proof before day one on site." },
                ].map((s) => (
                  <div key={s.n} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white font-black flex items-center justify-center text-sm flex-shrink-0 mt-0.5">{s.n}</div>
                    <div>
                      <h4 className="font-semibold mb-1">{s.title}</h4>
                      <p className="text-sm text-gray-400 leading-relaxed">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Anti-fraud */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-black mb-4">Built to stop credential fraud</h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Fake certifications cost the industry millions every year. CertClip has multiple layers of fraud resistance baked into the core.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { icon: "🎲", title: "Randomized challenge prompts", desc: "Workers receive surprise task prompts during recording — impossible to pre-film or fake." },
            { icon: "📹", title: "Live verification sessions", desc: "Optional real-time mentor-watched sessions with live challenge tasks to guarantee authenticity." },
            { icon: "🏛️", title: "Union & training partner vetting", desc: "Mentors are credentialed through IBEW, UA, ABC, SMACNA and community college trade programs." },
            { icon: "🔐", title: "Auditable credential wallet", desc: "Every badge has an immutable log of who reviewed it, when, and what evidence backs it up." },
          ].map((f) => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-2 text-sm">{f.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Jurisdiction coverage */}
      <section className="bg-white/[0.03] border-y border-white/10 py-16">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-black mb-3">Jurisdiction-aware from day one</h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto text-sm">
            Every badge is tagged to the specific code standard where it was earned —
            NEC, CEC, Title 24, Chicago Electrical Code, Local Law 97, and more.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              "California (Title 24)", "Texas (NEC 2020)", "New York (Local Law 97)",
              "Illinois (Chicago Code)", "Florida (FBC)", "Washington (NEC 2023)",
              "Ontario (OESC)", "British Columbia (BCEC)", "Alberta (AECR)", "Colorado (NEC 2020)",
            ].map((r) => (
              <span key={r} className="bg-white/5 border border-white/10 text-xs text-gray-400 px-3 py-1.5 rounded-full">
                {r}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Signup Form */}
      <section id="signup" className="py-20 bg-gradient-to-b from-yellow-400/5 to-transparent border-t border-yellow-400/20">
        <div className="max-w-xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black mb-3">Get early access</h2>
            <p className="text-gray-400">
              Free for tradespeople. Early members shape the product and get lifetime pricing.
              Takes 60 seconds.
            </p>
          </div>

          {submitted ? (
            <div className="text-center bg-green-500/10 border border-green-500/30 rounded-2xl p-12">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold mb-3">You&apos;re on the list!</h3>
              <p className="text-gray-400 mb-6">
                We&apos;ll reach out as soon as we&apos;re ready to onboard early users. Watch your inbox.
              </p>
              <p className="text-sm text-gray-600">
                In the meantime — know someone in the trades? Send them here: <strong className="text-gray-400">certclip.com</strong>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 bg-white/5 border border-white/10 rounded-2xl p-8">
              {/* Role */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  I am a <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "tradesperson" as Role, label: "🔧", sub: "Tradesperson" },
                    { value: "employer" as Role, label: "🏗️", sub: "Employer / GC" },
                    { value: "staffing" as Role, label: "🏢", sub: "Staffing Firm" },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setRole(opt.value); setIntendedUse(""); }}
                      className={`py-3 px-2 rounded-lg border text-center transition-all ${
                        role === opt.value
                          ? "bg-yellow-400 border-yellow-400 text-black"
                          : "bg-white/5 border-white/20 text-gray-300 hover:border-white/40"
                      }`}
                    >
                      <div className="text-xl mb-0.5">{opt.label}</div>
                      <div className="text-xs font-semibold">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Email address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors"
                />
              </div>

              {/* Trade — tradespeople only */}
              {role === "tradesperson" && (
                <div>
                  <label className="block text-sm font-semibold mb-2">Your trade</label>
                  <select
                    value={trade}
                    onChange={(e) => setTrade(e.target.value)}
                    className="w-full bg-[#1a1d27] border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition-colors"
                  >
                    <option value="">Select your trade...</option>
                    {TRADES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              )}

              {/* Company name + size — employer/staffing */}
              {(role === "employer" || role === "staffing") && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-semibold mb-2">Company name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="ABC Electric Co."
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-semibold mb-2">Company size</label>
                    <select
                      value={companySize}
                      onChange={(e) => setCompanySize(e.target.value)}
                      className="w-full bg-[#1a1d27] border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition-colors"
                    >
                      <option value="">Select...</option>
                      <option>1–10</option>
                      <option>11–50</option>
                      <option>51–200</option>
                      <option>201–500</option>
                      <option>500+</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Region */}
              <div>
                <label className="block text-sm font-semibold mb-2">Your region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full bg-[#1a1d27] border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition-colors"
                >
                  <option value="">Select your region...</option>
                  {REGIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>

              {/* Intended use — dynamic by role */}
              {role && intendedUseOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    What would you use CertClip for?
                  </label>
                  <div className="space-y-2">
                    {intendedUseOptions.map((opt) => (
                      <label
                        key={opt}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          intendedUse === opt
                            ? "border-yellow-400/60 bg-yellow-400/10"
                            : "border-white/10 hover:border-white/20"
                        }`}
                      >
                        <input
                          type="radio"
                          name="intended_use"
                          value={opt}
                          checked={intendedUse === opt}
                          onChange={() => setIntendedUse(opt)}
                          className="accent-yellow-400"
                        />
                        <span className="text-sm text-gray-300">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Pain notes */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  What&apos;s your biggest challenge with trade credentials?{" "}
                  <span className="text-gray-500 font-normal">(optional — helps us build the right thing)</span>
                </label>
                <textarea
                  value={painNotes}
                  onChange={(e) => setPainNotes(e.target.value)}
                  placeholder="e.g. I moved from Texas to California and had to re-prove everything from scratch, took 3 weeks..."
                  rows={3}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors resize-none text-sm"
                />
              </div>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading || !role || !email}
                className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-lg py-4 rounded-xl transition-colors"
              >
                {loading ? "Joining..." : "Join the Waitlist →"}
              </button>

              <p className="text-xs text-gray-600 text-center">
                We will never spam you or sell your information. Unsubscribe anytime.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xl font-black">
            Cert<span className="text-yellow-400">Clip</span>
          </div>
          <div className="text-sm text-gray-600 text-center">
            certclip.com · The verified credential layer for the skilled trades
          </div>
          <div className="text-sm text-gray-600">
            © 2026 CertClip. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
