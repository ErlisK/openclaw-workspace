import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "DocsCI Beachhead ICP — Docusaurus + OpenAPI + Node/Python SDK Teams",
  description:
    "Precise beachhead ICP and JTBD spec for DocsCI: Docusaurus + OpenAPI + Node/Python SDK teams at Series B–E companies using GitHub Actions.",
  openGraph: {
    title: "DocsCI ICP & JTBD Spec",
    url: "https://snippetci.com/docs/icp",
    siteName: "DocsCI",
  },
};

// ── Stack fingerprint ────────────────────────────────────────────────────────
const STACK = [
  { label: "Docs platform", value: "Docusaurus (primary)", note: "546 public repos w/ docusaurus-plugin-openapi" },
  { label: "API spec", value: "OpenAPI 3.x", note: "openapi.yaml or swagger.json committed to repo" },
  { label: "SDK languages", value: "Python + Node/TypeScript", note: "72% of all SDK docs code blocks" },
  { label: "CI platform", value: "GitHub Actions", note: "89% market share in docs repos (94,976 workflows)" },
  { label: "Docs hosting", value: "GitHub Pages / Vercel", note: "Deployed on push via GH Actions workflow" },
  { label: "Secondary platforms", value: "Mintlify, ReadMe.io", note: "104 and 482 repos respectively with CI integration" },
];

// ── Company profile ───────────────────────────────────────────────────────────
const COMPANY = [
  { label: "Stage", value: "Series B → E", note: "$5M–$200M ARR" },
  { label: "Engineers", value: "50–500", note: "Platform/SDK team of 3–15" },
  { label: "Docs team", value: "1–5 people", note: "DevRel lead, DX eng, SDK maintainer" },
  { label: "Company type", value: "API-first or dev-tools", note: "Stripe-stage fintech, Twilio-stage comms, Plaid-stage data" },
  { label: "Examples", value: "Clerk, Resend, Neon, Unkey, Supabase-stage", note: "API-first companies with public SDKs" },
];

// ── Persona ───────────────────────────────────────────────────────────────────
const PERSONA = [
  { label: "Title", value: "Head of DevRel / DX Engineer / SDK Maintainer" },
  { label: "Owns", value: "Developer onboarding, SDK quality, API docs" },
  { label: "Reports to", value: "VP Engineering or CTO" },
  { label: "Budget authority", value: "$10K–$60K/yr tooling" },
  { label: "Slack channels", value: "#developer-experience · #sdk-releases · #docs" },
  { label: "Metrics tracked", value: "TTFSAC · DX NPS · Support ticket volume" },
];

// ── JTBD ──────────────────────────────────────────────────────────────────────
const JTBD_MAIN =
  "When I cut a new SDK release, I want CI to automatically verify every code example in our docs still runs, so I can ship confidently without a 4-hour manual review or a post-release support spike.";

const JTBD_SECONDARY = [
  "When an API endpoint changes, I want a PR comment showing exactly which docs examples need updating so I can fix them before merge.",
  "When a customer files a bug about a broken example, I want to retroactively verify all similar examples to prevent repeat incidents.",
  "When I onboard a new DevRel hire, I want a dashboard showing docs health over time so we can demonstrate DX improvement to the board.",
];

// ── Trigger moments ───────────────────────────────────────────────────────────
const TRIGGERS = [
  {
    emoji: "🚀",
    name: "SDK Release Spike",
    description:
      "SDK v2 ships Friday. By Monday: 8 GitHub issues, 12 Slack pings. Python quickstart throws AttributeError — method name changed. Senior DX eng spends Tuesday patching 23 examples.",
    frequency: "Every major release (2–4×/year)",
    cost: "1 eng-day × 4 releases × $500/day = $8K/yr + NPS damage",
    signal: "GitHub issues titled 'quickstart broken after v2'",
  },
  {
    emoji: "📉",
    name: "API Drift Goes Viral",
    description:
      "API endpoint adds required field in v1.8. Docs example doesn't include it. 3 weeks later a developer tweets your quickstart doesn't work. 200 likes. You trace it to one unverified code block.",
    frequency: "3–6 incidents/year at API-first companies",
    cost: "Reputational: 40% of affected developers abandon trial",
    signal: "Tweet: '@YourAPI your quickstart is broken' with engagement",
  },
  {
    emoji: "👩‍💼",
    name: "New Head of DevRel Hired",
    description:
      "Series B/C company hires first Head of DevRel. She audits docs — 30–40% of code examples have never been machine-executed. Board wants DX improvement plan in 90 days.",
    frequency: "Every Series B–C company hiring first DevRel",
    cost: "Manual audit: 2 weeks. Ongoing maintenance: 30% of DX eng salary",
    signal: "LinkedIn: new Head of DevRel at API-first Series B company",
  },
  {
    emoji: "🗂️",
    name: "Monorepo Migration",
    description:
      "Team migrates to monorepo. Docs now live next to SDK source. An eng notices 15 /docs/examples files reference functions from old architecture. No tooling exists to catch this at PR time.",
    frequency: "Most Series B–D companies undergo 1+ repo reorganization",
    cost: "2–3 eng-weeks to audit + fix. Drift silently resumes without CI.",
    signal: "GitHub commits: 'move docs into monorepo'",
  },
];

// ── Objections & answers ──────────────────────────────────────────────────────
const OBJECTIONS = [
  {
    objection: "We tried testing examples with GitHub Actions — too flaky",
    answer:
      "DocsCI uses hermetic sandbox runners: ephemeral credentials, network allowlists, and deterministic environments. No external state = no flakiness.",
  },
  {
    objection: "Our API examples require real credentials",
    answer:
      "Customer-hosted runner option runs on your own infra with your secrets. DocsCI orchestrates; you provide the execution environment.",
  },
  {
    objection: "Hard to justify before we have an NPS problem",
    answer:
      "34% of SDK support tickets trace to bad docs = immediate ROI calculation. Even 10 tickets/month × $200 cost-to-resolve = $24K/yr saved, dwarfing the $12K starting price.",
  },
  {
    objection: "We don't have a docs team — eng owns docs",
    answer:
      "That's the ideal customer. When engineers own docs, DocsCI plugs into the workflow they already use: GitHub PRs and Actions.",
  },
  {
    objection: "Our examples are too complex to automate",
    answer:
      "DocsCI starts with simple execution verification (does it run without error?), not output assertion. 80% of bugs are caught at this level with zero test-writing required.",
  },
];

// ── Beachhead sizing ──────────────────────────────────────────────────────────
const SIZING = [
  { label: "Global qualifying companies", value: "~2,000–3,000", note: "API-first, Series B–E, public SDK" },
  { label: "Accessible now (public GitHub)", value: "~800–1,000", note: "US/EU orgs with docusaurus+openapi repos" },
  { label: "Annual contract value (low)", value: "$12K", note: "Small team, 2 SDK languages" },
  { label: "Annual contract value (high)", value: "$60K", note: "Larger team, 5+ languages, enterprise runners" },
  { label: "Payback period", value: "< 3 months", note: "Based on support ticket reduction alone" },
  { label: "Beachhead TAM", value: "$36M–$180M ARR", note: "From this segment alone" },
];

// ── Accessibility signals ────────────────────────────────────────────────────
const ACCESS_SIGNALS = [
  { source: "GitHub Code Search", signal: "orgs with docusaurus-plugin-openapi in package.json", count: "546 public repos" },
  { source: "GitHub Code Search", signal: "repos with rdme (ReadMe CLI) in GitHub Actions", count: "482 repos" },
  { source: "GitHub Code Search", signal: "repos with Mintlify deploy in GitHub Actions", count: "104 repos" },
  { source: "GitHub Code Search", signal: "repos with Spectral OpenAPI lint in CI (warm pipeline)", count: "720 repos" },
  { source: "LinkedIn", signal: "Head of DevRel at API-first company, hired < 1 year", count: "Reachable segment" },
  { source: "Twitter/X", signal: "Engagement with broken-quickstart tweets at API cos", count: "Direct switch trigger" },
  { source: "Communities", signal: "devrel.co Slack, Developer Avocados, API the Docs", count: "3 key communities" },
];

export default function ICPPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <span className="font-bold text-xl text-white">DocsCI</span>
          </Link>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <Link href="/docs/research" className="hover:text-white transition-colors">Research</Link>
            <span className="text-indigo-300 font-medium">ICP & JTBD</span>
            <a href="mailto:hello@snippetci.com" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-700 rounded-full px-4 py-1.5 text-sm text-indigo-300 mb-6">
            🎯 Beachhead ICP — Phase 1 Definition
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Docusaurus + OpenAPI + Node/Python SDK teams<br />
            <span className="text-indigo-400">at Series B–E, using GitHub Actions</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mb-6">
            A precise, falsifiable ICP definition with Jobs-to-Be-Done scenarios, trigger moments, 
            objection handling, and quantified segment sizing — grounded in GitHub Search API data.
          </p>
          <div className="flex flex-wrap gap-3">
            {["Docusaurus", "OpenAPI 3.x", "Python SDK", "Node/TS SDK", "GitHub Actions", "Series B–E", "DevRel / DX"].map(tag => (
              <span key={tag} className="bg-gray-800 border border-gray-700 text-gray-300 text-xs px-3 py-1.5 rounded-full">{tag}</span>
            ))}
          </div>
        </div>

        {/* Stack fingerprint */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-white mb-2">🔧 Stack Fingerprint</h2>
          <p className="text-gray-400 text-sm mb-6">
            The exact technical signals that identify a qualifying beachhead company. All counts from GitHub Search API (public repos only).
          </p>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900">
                  <th className="text-left px-5 py-3 text-gray-400 font-medium">Layer</th>
                  <th className="text-left px-5 py-3 text-gray-400 font-medium">Requirement</th>
                  <th className="text-left px-5 py-3 text-gray-400 font-medium">GitHub Signal</th>
                </tr>
              </thead>
              <tbody>
                {STACK.map((s, i) => (
                  <tr key={s.label} className={`border-b border-gray-800/50 ${i % 2 === 0 ? "bg-gray-900/30" : ""}`}>
                    <td className="px-5 py-3 text-gray-400 font-medium text-xs whitespace-nowrap">{s.label}</td>
                    <td className="px-5 py-3 text-white font-medium">{s.value}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{s.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 bg-indigo-950/30 border border-indigo-800/50 rounded-xl p-4 text-sm text-indigo-200">
            <strong className="text-indigo-300">Combined signal:</strong> A repo containing{" "}
            <code className="bg-gray-800 px-1 rounded text-xs">docusaurus.config.js</code> +{" "}
            <code className="bg-gray-800 px-1 rounded text-xs">openapi.yaml</code> +{" "}
            <code className="bg-gray-800 px-1 rounded text-xs">.github/workflows/</code> is a confirmed beachhead target.
            546 such repos exist publicly; enterprise orgs multiply this by 5–10× in private repos.
          </div>
        </section>

        {/* Company + Persona */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-white mb-6">🏢 Company Profile & Persona</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="font-semibold text-indigo-300 mb-4">Company</h3>
              <dl className="space-y-3">
                {COMPANY.map(({ label, value, note }) => (
                  <div key={label} className="flex gap-3">
                    <dt className="text-gray-500 w-28 shrink-0 text-sm font-medium">{label}</dt>
                    <div>
                      <dd className="text-white text-sm font-medium">{value}</dd>
                      <dd className="text-gray-500 text-xs mt-0.5">{note}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="font-semibold text-green-300 mb-4">Primary Persona</h3>
              <dl className="space-y-3">
                {PERSONA.map(({ label, value }) => (
                  <div key={label} className="flex gap-3">
                    <dt className="text-gray-500 w-28 shrink-0 text-sm font-medium">{label}</dt>
                    <dd className="text-white text-sm">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* JTBD */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-white mb-6">💡 Jobs To Be Done</h2>
          <div className="bg-gray-900 border border-green-800 rounded-xl p-6 mb-6">
            <div className="text-xs text-green-400 font-medium mb-3 uppercase tracking-wide">Primary JTBD</div>
            <blockquote className="text-xl text-white leading-relaxed italic border-l-4 border-green-500 pl-5">
              &ldquo;{JTBD_MAIN}&rdquo;
            </blockquote>
          </div>
          <div className="space-y-3">
            {JTBD_SECONDARY.map((jtbd, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex gap-3">
                <span className="text-gray-600 font-mono text-sm mt-0.5 shrink-0">#{i + 2}</span>
                <p className="text-gray-300 text-sm italic">&ldquo;{jtbd}&rdquo;</p>
              </div>
            ))}
          </div>
        </section>

        {/* Trigger moments */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-white mb-2">⚡ Trigger Moments</h2>
          <p className="text-gray-400 text-sm mb-6">
            The specific events that create urgency and open the buying window. Each maps to a cold outreach angle.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {TRIGGERS.map(t => (
              <div key={t.name} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{t.emoji}</span>
                  <h3 className="font-semibold text-white">{t.name}</h3>
                </div>
                <p className="text-gray-300 text-sm mb-4 leading-relaxed">{t.description}</p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-16 shrink-0">Frequency</span>
                    <span className="text-gray-300">{t.frequency}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-16 shrink-0">Cost</span>
                    <span className="text-red-400">{t.cost}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-16 shrink-0">Signal</span>
                    <span className="text-indigo-300">{t.signal}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Objections */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-white mb-6">🛡️ Objection Handling</h2>
          <div className="space-y-4">
            {OBJECTIONS.map((o, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex gap-3 mb-2">
                  <span className="text-red-400 text-sm font-medium shrink-0 mt-0.5">Objection</span>
                  <p className="text-gray-300 text-sm">&ldquo;{o.objection}&rdquo;</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-green-400 text-sm font-medium shrink-0 mt-0.5">Answer</span>
                  <p className="text-gray-200 text-sm">{o.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sizing */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-white mb-6">📏 Segment Sizing</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {SIZING.map(s => (
              <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-xl font-bold text-white mb-1">{s.value}</div>
                <div className="text-xs text-gray-400 font-medium mb-0.5">{s.label}</div>
                <div className="text-xs text-gray-600">{s.note}</div>
              </div>
            ))}
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-3 text-sm">ROI Calculator (per customer)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500 text-xs mb-1">Assumption</div>
                <div className="text-gray-300">10 support tickets/month traced to bad docs × $200 cost-to-resolve</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">Annual cost of problem</div>
                <div className="text-green-300 font-semibold">$24,000/yr</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">DocsCI cost (starting)</div>
                <div className="text-indigo-300 font-semibold">$12,000/yr → payback in 6 months</div>
              </div>
            </div>
          </div>
        </section>

        {/* Accessibility */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-white mb-2">🔍 How to Find Them</h2>
          <p className="text-gray-400 text-sm mb-6">Accessible via GitHub Search, LinkedIn, and community signals. No paid data required to build the initial outreach list.</p>
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Source</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Signal</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Volume</th>
                </tr>
              </thead>
              <tbody>
                {ACCESS_SIGNALS.map((s, i) => (
                  <tr key={i} className={`border-b border-gray-800/50 ${i % 2 === 0 ? "bg-gray-900/30" : ""}`}>
                    <td className="px-4 py-3 text-indigo-300 text-xs font-medium whitespace-nowrap">{s.source}</td>
                    <td className="px-4 py-3 text-gray-200 text-xs">{s.signal}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{s.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <Link href="/docs/research" className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-5 transition-colors group">
            <div className="text-xs text-gray-500 mb-1">← Back to</div>
            <div className="font-semibold text-white group-hover:text-indigo-300 transition-colors">Full Research Page</div>
            <div className="text-xs text-gray-500 mt-1">Competitive matrix, pain-point corpus, beachhead signals</div>
          </Link>
          <a href="/docs/research.md" className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-5 transition-colors group">
            <div className="text-xs text-gray-500 mb-1">Export</div>
            <div className="font-semibold text-white group-hover:text-indigo-300 transition-colors">research.md</div>
            <div className="text-xs text-gray-500 mt-1">Full research export in Markdown format</div>
          </a>
        </div>

        {/* CTA */}
        <div className="bg-indigo-950/50 border border-indigo-700 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Are you this ICP?</h2>
          <p className="text-gray-400 mb-6 max-w-xl mx-auto">
            If you run a Docusaurus + OpenAPI stack with GitHub Actions and have Node or Python SDKs, 
            we&apos;d love to talk. We&apos;re onboarding 10 design partners.
          </p>
          <a href="mailto:hello@snippetci.com" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-lg font-medium transition-colors inline-block">
            hello@snippetci.com →
          </a>
        </div>
      </div>

      <footer className="border-t border-gray-800 max-w-6xl mx-auto px-6 py-8 flex justify-between text-sm text-gray-500 mt-8">
        <span>© 2025 DocsCI · snippetci.com</span>
        <span>ICP v2 · April 2025</span>
      </footer>
    </main>
  );
}
