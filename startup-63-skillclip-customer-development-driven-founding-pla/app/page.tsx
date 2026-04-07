"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { VARIANTS, type VariantKey, type Variant } from "@/lib/ab";

const TRADES = [
  "Electrician", "Plumber", "HVAC Technician", "Welder", "Carpenter",
  "Pipefitter", "Sheet Metal Worker", "Ironworker", "Elevator Mechanic",
  "Fire Sprinkler Fitter", "Other",
];

const REGIONS = [
  "California", "Texas", "New York", "Illinois", "Florida", "Washington",
  "Colorado", "Arizona", "Georgia", "Ohio", "Ontario, Canada",
  "British Columbia, Canada", "Alberta, Canada", "Other",
];

type Role = "tradesperson" | "employer" | "staffing";

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

function getAccentClasses(variant: Variant) {
  if (variant.key === "mentor") return { btn: "bg-blue-500 hover:bg-blue-400 text-white", text: "text-blue-400", border: "border-blue-400" };
  if (variant.key === "speed") return { btn: "bg-green-500 hover:bg-green-400 text-black", text: "text-green-400", border: "border-green-400" };
  return { btn: "bg-yellow-400 hover:bg-yellow-300 text-black", text: "text-yellow-400", border: "border-yellow-400" };
}

// Read cookie helper (client-side)
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

// Fire A/B tracking event
async function trackEvent(
  eventType: "impression" | "cta_click" | "form_start" | "form_complete",
  variantKey: string,
  sessionId: string,
  extra?: { role?: string; region?: string; trade?: string }
) {
  try {
    await fetch("/api/ab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: eventType,
        variant_key: variantKey,
        session_id: sessionId,
        ...extra,
      }),
    });
  } catch { /* fire and forget */ }
}

export default function Home() {
  const [variant, setVariant] = useState<Variant>(VARIANTS.control);
  const [sessionId, setSessionId] = useState<string>("");
  const impressionFired = useRef(false);

  // Role / form state
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
  const [formStarted, setFormStarted] = useState(false);

  useEffect(() => {
    const variantKey = (getCookie("ab_variant") || "control") as VariantKey;
    const sid = getCookie("ab_session") || Math.random().toString(36).slice(2);
    const v = VARIANTS[variantKey] || VARIANTS.control;
    setVariant(v);
    setSessionId(sid);

    if (!impressionFired.current) {
      impressionFired.current = true;
      trackEvent("impression", v.key, sid);
    }
  }, []);

  const accent = getAccentClasses(variant);

  const handleCtaClick = () => {
    trackEvent("cta_click", variant.key, sessionId);
    document.getElementById("signup")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleFormStart = () => {
    if (!formStarted) {
      setFormStarted(true);
      trackEvent("form_start", variant.key, sessionId, { role: role || undefined });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !role) return;
    setLoading(true);
    setError("");

    const utmParams = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search) : null;

    const { error: dbError } = await supabase.from("waitlist").insert({
      email: email.toLowerCase().trim(),
      role,
      trade: trade || null,
      region: region || null,
      company_name: companyName || null,
      company_size: companySize || null,
      intended_use: intendedUse || null,
      pain_notes: painNotes || null,
      utm_source: utmParams?.get("utm_source") || `ab_${variant.key}`,
      utm_medium: utmParams?.get("utm_medium") || "ab_test",
      utm_campaign: utmParams?.get("utm_campaign") || "phase1",
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
    });

    if (dbError && dbError.code !== "23505") {
      setError("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    await trackEvent("form_complete", variant.key, sessionId, {
      role, region, trade,
    });

    setSubmitted(true);
    setLoading(false);
  };

  const intendedUseOptions = role ? INTENDED_USE[role as Role] : [];

  return (
    <main className="min-h-screen bg-[#0f1117] text-white">

      {/* Variant pill — visible during testing */}
      <div className="fixed top-2 right-2 z-50 text-xs bg-black/60 border border-white/20 text-gray-400 px-2 py-1 rounded-full backdrop-blur-sm pointer-events-none">
        Variant: <span className={accent.text}>{variant.key}</span>
      </div>

      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-white">
            Cert<span className={accent.text}>Clip</span>
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${accent.text} border-current bg-current/10`} style={{ background: 'transparent' }}>
            Early Access
          </span>
        </div>
        <button
          onClick={handleCtaClick}
          className={`${accent.btn} text-sm font-semibold px-4 py-2 rounded-lg transition-colors`}
        >
          {variant.heroCta}
        </button>
      </nav>

      {/* Hero — variant-specific */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="text-5xl mb-6">{variant.heroEmoji}</div>
        <div className={`inline-block border px-3 py-1 rounded-full text-sm mb-6 ${accent.text} border-current`}>
          {variant.badgeLabel}
        </div>
        <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6 tracking-tight max-w-4xl mx-auto">
          {variant.headline.includes('90 seconds') ? (
            <>
              {variant.headline.split('90 seconds')[0]}
              <span className={accent.text}>90 seconds</span>
              {variant.headline.split('90 seconds')[1]}
            </>
          ) : variant.headline.includes('30 minutes') ? (
            <>
              {variant.headline.split('30 minutes')[0]}
              <span className={accent.text}>30 minutes</span>
              {variant.headline.split('30 minutes')[1]}
            </>
          ) : variant.headline.includes('faster') ? (
            <>
              <span className={accent.text}>Hired faster.</span>{' '}
              {variant.headline.replace('Hired faster. ', '')}
            </>
          ) : (
            <span>{variant.headline}</span>
          )}
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          {variant.subheadline}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
          <button
            onClick={handleCtaClick}
            className={`${accent.btn} font-bold text-lg px-8 py-4 rounded-xl transition-colors`}
          >
            {variant.heroCta}
          </button>
          <a
            href="#how-it-works"
            className="border border-white/20 hover:border-white/40 text-white font-medium text-lg px-8 py-4 rounded-xl transition-colors"
          >
            See How It Works
          </a>
        </div>
        <p className="text-sm text-gray-500">
          Free for tradespeople · No credit card · Early members get lifetime discounts
        </p>
      </section>

      {/* Stats */}
      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "7–14", label: "Days to verify a new hire today" },
            { value: "40%", label: "Employers had a skill-mismatch hire" },
            { value: "25%", label: "First-week send-back rate at staffing firms" },
            { value: "$15K+", label: "Average cost of a bad trade hire" },
          ].map((s) => (
            <div key={s.label}>
              <div className={`text-3xl font-black mb-1 ${accent.text}`}>{s.value}</div>
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
            Paper certs get lost. Reference calls take days. Skill claims can&apos;t be verified. One bad hire costs tens of thousands.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: "🔧", title: "For Tradespeople",
              pains: [
                "Your skills are invisible to new employers",
                "Relocating means re-proving everything from scratch",
                "You sit idle while employers slowly verify you",
                "Better workers lose jobs to smooth talkers",
              ],
            },
            {
              icon: "🏗️", title: "For Employers & GCs",
              pains: [
                "3–14 days just to verify credentials",
                "No way to assess actual skill quality pre-hire",
                "Code-compliance proof requires hours of research",
                "Fraudulent certs are common and hard to catch",
              ],
            },
            {
              icon: "🏢", title: "For Staffing Firms",
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

      {/* How It Works — variant-influenced */}
      <section id="how-it-works" className="bg-white/[0.03] border-y border-white/10 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-4">How CertClip works</h2>
            <p className="text-gray-400">
              {variant.key === "mentor"
                ? "From booking to signed credential in one session."
                : variant.key === "speed"
                ? "From filming to verified in under 24 hours."
                : "From upload to verified badge in 24–72 hours."}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-12">
            {/* Tradesperson track */}
            <div>
              <div className={`font-bold text-xs uppercase tracking-widest mb-6 ${accent.text}`}>
                For Tradespeople
              </div>
              <div className="space-y-7">
                {(variant.key === "mentor"
                  ? [
                      { n: "1", title: "Choose your skill to verify", body: "Pick the specific task you want verified — running conduit, sweat-soldering, refrigerant charging. We match you to a journeyman in that specialty." },
                      { n: "2", title: "Book a 30-min live session", body: "Schedule a video call with a licensed journeyman. They watch you work in real time and respond to challenge prompts to confirm it's genuinely you." },
                      { n: "3", title: "Receive your signed credential", body: "The journeyman signs off with their license number. You get a tamper-evident credential with their review attached." },
                      { n: "4", title: "Share with any employer instantly", body: "One link, one QR code. Any employer can verify your credential in seconds — no calls, no paperwork." },
                    ]
                  : variant.key === "speed"
                  ? [
                      { n: "1", title: "Film a 10–90 second task clip", body: "No script. No studio. Just you doing real work — running conduit, sweat-soldering, commissioning a mini-split. Your phone is enough." },
                      { n: "2", title: "Get a QR code in 24 hours", body: "A vetted journeyman reviews your clip and issues a scannable credential the same day. Faster than any reference check." },
                      { n: "3", title: "Send the link in your next application", body: "One URL replaces your whole credentials binder. Employers click, scan, verify. Done." },
                      { n: "4", title: "Get hired faster", body: "Stop losing jobs to paperwork lag. CertClip users report hearing back 3x faster than with traditional applications." },
                    ]
                  : [
                      { n: "1", title: "Film a 10–90 second task clip", body: "Show a real task — running conduit, sweat-soldering, commissioning a mini-split. No acting. Just your real work." },
                      { n: "2", title: "Get reviewed by a vetted journeyman", body: "A licensed journeyman in your trade watches your clip and leaves timestamped feedback. Every badge is jurisdiction-tagged." },
                      { n: "3", title: "Earn verified micro-badges", body: "Badges are tied to specific tasks and local code standards. Your credential wallet lives at a shareable link." },
                      { n: "4", title: "Get discovered by the right employers", body: "Employers search by trade, skill tag, and region. Your verified profile surfaces to exactly who needs your skills." },
                    ]
                ).map((s) => (
                  <div key={s.n} className="flex gap-4">
                    <div className={`w-8 h-8 rounded-full ${accent.btn} font-black flex items-center justify-center text-sm flex-shrink-0 mt-0.5`}>{s.n}</div>
                    <div>
                      <h4 className="font-semibold mb-1">{s.title}</h4>
                      <p className="text-sm text-gray-400 leading-relaxed">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Employer track */}
            <div>
              <div className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-6">
                For Employers &amp; Staffing
              </div>
              <div className="space-y-7">
                {[
                  { n: "1", title: "Search verified portfolios", body: "Filter by trade, skill tags (e.g. 'Title 24', 'EPA 608'), and jurisdiction. See video evidence — not just claims." },
                  { n: "2", title: "Commission a live assessment", body: "Book a paid 30-minute live verification or request a randomized challenge task to confirm authenticity on the spot." },
                  { n: "3", title: "Download audit-ready credential reports", body: "Every badge is timestamped and mentor-signed. Present to AHJs, insurance carriers, or client audits instantly." },
                  { n: "4", title: "Deploy with confidence", body: "Reduce rework. Meet code. CertClip Verified workers come with documented skill proof before day one." },
                ].map((s) => (
                  <div key={s.n} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/10 text-white font-black flex items-center justify-center text-sm flex-shrink-0 mt-0.5">{s.n}</div>
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

      {/* Trust */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-black mb-4">Built to stop credential fraud</h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Fake certifications cost the industry millions every year. CertClip has multiple fraud-resistance layers built in.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { icon: "🎲", title: "Randomized challenge prompts", desc: "Workers receive surprise task prompts during recording — impossible to pre-film or fake." },
            { icon: "📹", title: "Live verification sessions", desc: "Optional real-time mentor-watched sessions with live challenge tasks for guaranteed authenticity." },
            { icon: "🏛️", title: "Union & training partner vetting", desc: "Mentors credentialed through IBEW, UA, ABC, SMACNA and community college trade programs." },
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
            Every badge is tagged to the specific code standard where it was earned — NEC, CEC, Title 24, Chicago Electrical Code, Local Law 97, and more.
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
      <section id="signup" className="py-20 bg-gradient-to-b from-white/5 to-transparent border-t border-white/10">
        <div className="max-w-xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black mb-3">Get early access</h2>
            <p className="text-gray-400">
              Free for tradespeople. Early members shape the product and get lifetime pricing.
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
                Know someone in the trades?{" "}
                <strong className="text-gray-400">certclip.com</strong>
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              onChange={handleFormStart}
              className="space-y-5 bg-white/5 border border-white/10 rounded-2xl p-8"
            >
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
                      onClick={() => { setRole(opt.value); setIntendedUse(""); handleFormStart(); }}
                      className={`py-3 px-2 rounded-lg border text-center transition-all ${
                        role === opt.value
                          ? `${accent.btn} ${accent.border}`
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
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-current transition-colors"
                />
              </div>

              {role === "tradesperson" && (
                <div>
                  <label className="block text-sm font-semibold mb-2">Your trade</label>
                  <select value={trade} onChange={(e) => setTrade(e.target.value)}
                    className="w-full bg-[#1a1d27] border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none transition-colors">
                    <option value="">Select your trade...</option>
                    {TRADES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              )}

              {(role === "employer" || role === "staffing") && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-semibold mb-2">Company name</label>
                    <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="ABC Electric Co."
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none transition-colors" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-semibold mb-2">Company size</label>
                    <select value={companySize} onChange={(e) => setCompanySize(e.target.value)}
                      className="w-full bg-[#1a1d27] border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none transition-colors">
                      <option value="">Select...</option>
                      <option>1–10</option><option>11–50</option><option>51–200</option>
                      <option>201–500</option><option>500+</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2">Your region</label>
                <select value={region} onChange={(e) => setRegion(e.target.value)}
                  className="w-full bg-[#1a1d27] border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none transition-colors">
                  <option value="">Select your region...</option>
                  {REGIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>

              {role && intendedUseOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    What would you use CertClip for?
                  </label>
                  <div className="space-y-2">
                    {intendedUseOptions.map((opt) => (
                      <label key={opt}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          intendedUse === opt ? `${accent.border} bg-white/5` : "border-white/10 hover:border-white/20"
                        }`}>
                        <input type="radio" name="intended_use" value={opt}
                          checked={intendedUse === opt} onChange={() => setIntendedUse(opt)}
                          className="accent-yellow-400" />
                        <span className="text-sm text-gray-300">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Biggest challenge with trade credentials?{" "}
                  <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <textarea value={painNotes} onChange={(e) => setPainNotes(e.target.value)}
                  placeholder="e.g. Moved from Texas to California and had to re-prove everything from scratch, took 3 weeks..."
                  rows={3}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none transition-colors resize-none text-sm" />
              </div>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <button type="submit" disabled={loading || !role || !email}
                className={`w-full ${accent.btn} disabled:opacity-40 disabled:cursor-not-allowed font-bold text-lg py-4 rounded-xl transition-colors`}>
                {loading ? "Joining..." : variant.heroCta}
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
            Cert<span className={accent.text}>Clip</span>
          </div>
          <div className="text-sm text-gray-600 text-center">
            certclip.com · The verified credential layer for the skilled trades
          </div>
          <div className="text-sm text-gray-600">© 2026 CertClip. All rights reserved.</div>
        </div>
      </footer>
    </main>
  );
}
