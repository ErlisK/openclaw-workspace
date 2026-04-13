import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sales Hub — Change Risk Radar",
  description: "ICP criteria, qualification checklist, demo, pilot SOW, and security pack for Change Risk Radar.",
};

export default function SalesPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)" }}>
      {/* Nav */}
      <div style={{ borderBottom: "1px solid var(--border)", padding: "0.75rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <a href="/" style={{ fontWeight: 900, fontSize: "1rem", color: "var(--foreground)", textDecoration: "none" }}>📡 Change Risk Radar</a>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <a href="/pricing" style={{ color: "var(--muted)", fontSize: "0.8rem", textDecoration: "none" }}>Pricing</a>
          <a href="/demo" style={{ color: "var(--muted)", fontSize: "0.8rem", textDecoration: "none" }}>Live Demo</a>
          <a href="/pilot/sow" style={{ color: "var(--muted)", fontSize: "0.8rem", textDecoration: "none" }}>Pilot SOW</a>
          <a href="/pilot/security" style={{ color: "var(--muted)", fontSize: "0.8rem", textDecoration: "none" }}>Security Pack</a>
          <a href="/onboard" className="btn-primary" style={{ textDecoration: "none", fontSize: "0.78rem", padding: "0.4rem 1rem" }}>Start Free Trial</a>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2.5rem 1.5rem 5rem" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <div className="tag" style={{ marginBottom: "0.6rem" }}>Sales Hub · Change Risk Radar</div>
          <h1 style={{ fontWeight: 900, fontSize: "2.2rem", lineHeight: 1.2, marginBottom: "0.75rem" }}>
            Everything you need to evaluate<br />Change Risk Radar
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "1rem", maxWidth: 540, margin: "0 auto 1.5rem" }}>
            ICP criteria, a 5-minute qualification checklist, an interactive demo, and self-serve access to our 90-day Pilot SOW and security pack.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/demo" className="btn-primary" style={{ textDecoration: "none", fontSize: "0.88rem", padding: "0.65rem 1.5rem" }}>
              🎬 Watch interactive demo →
            </a>
            <a href="/pilot/sow" style={{ textDecoration: "none", fontSize: "0.88rem", padding: "0.65rem 1.5rem", borderRadius: 8, border: "1px solid var(--border)", color: "var(--foreground)", background: "var(--card-bg)" }}>
              📋 Download Pilot SOW
            </a>
          </div>
        </div>

        {/* Quick-access cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0.75rem", marginBottom: "3rem" }}>
          {[
            { icon: "🎬", title: "Interactive Demo", desc: "3 synthetic tenants, real alert data", href: "/demo", cta: "Open demo" },
            { icon: "📋", title: "Pilot SOW", desc: "90-day SOW, editable, PDF-ready", href: "/pilot/sow", cta: "Open SOW" },
            { icon: "🔒", title: "Security Pack", desc: "Infrastructure, RLS, SOC 2 readiness, scopes", href: "/pilot/security", cta: "Open pack" },
            { icon: "💳", title: "Pricing", desc: "Starter $500/mo · Growth $1,500/mo", href: "/pricing", cta: "View plans" },
            { icon: "⚖️", title: "Privacy Policy", desc: "GDPR-ready · DPA available", href: "/legal/privacy", cta: "Read" },
            { icon: "📄", title: "DPA", desc: "Data Processing Agreement", href: "/legal/dpa", cta: "Read" },
          ].map(card => (
            <a key={card.title} href={card.href} style={{ textDecoration: "none" }}>
              <div className="card" style={{ padding: "1.25rem", height: "100%", cursor: "pointer", transition: "border-color 0.15s" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{card.icon}</div>
                <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: "0.2rem" }}>{card.title}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.75rem", lineHeight: 1.5, marginBottom: "0.75rem" }}>{card.desc}</div>
                <div style={{ color: "var(--accent)", fontSize: "0.73rem", fontWeight: 700 }}>{card.cta} →</div>
              </div>
            </a>
          ))}
        </div>

        {/* ── ICP Filters ─────────────────────────────────── */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ fontWeight: 900, fontSize: "1.4rem", marginBottom: "0.3rem" }}>
            🎯 Ideal Customer Profile
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
            Change Risk Radar is purpose-built for companies where a surprise vendor change could cause an outage, a compliance gap, or a billing shock — before they can react.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {/* Must-haves */}
            <div className="card" style={{ padding: "1.25rem", borderColor: "rgba(16,185,129,0.25)" }}>
              <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#10b981", marginBottom: "0.75rem" }}>✅ Strong fit</div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {[
                  "B2B SaaS with $1M–$50M ARR",
                  "Uses Stripe for billing (any MRR)",
                  "AWS CloudTrail or Google Workspace in production",
                  "Engineering or DevOps team ≥ 3 people",
                  "Had a vendor-change incident in last 12 months",
                  "CTO, VP Eng, or Head of Ops as buyer",
                  "SOC 2, ISO 27001, or HIPAA compliance motion",
                  "Shopify Plus merchant or Salesforce org ≥ 50 seats",
                ].map(item => (
                  <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem", fontSize: "0.78rem", color: "var(--foreground)" }}>
                    <span style={{ color: "#10b981", marginTop: 2 }}>✓</span>{item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaker fits */}
            <div className="card" style={{ padding: "1.25rem", borderColor: "rgba(239,68,68,0.2)" }}>
              <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#ef4444", marginBottom: "0.75rem" }}>⚠️ Weaker fit</div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {[
                  "Pre-revenue or pre-product company",
                  "Single-vendor stack (nothing to cross-correlate)",
                  "No technical buyer in evaluation",
                  "Consumer app without vendor dependencies",
                  "Agencies or consultancies (no own stack to monitor)",
                  "Requires on-prem deployment (we're cloud-native)",
                ].map(item => (
                  <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem", fontSize: "0.78rem", color: "var(--foreground)" }}>
                    <span style={{ color: "#ef4444", marginTop: 2 }}>✗</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Segment sweet spots */}
          <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.75rem" }}>
            {[
              { segment: "B2B SaaS", signals: "Stripe for billing + Workspace or AWS", trigger: "Pricing incident, API deprecation, security review" },
              { segment: "E-Commerce", signals: "Shopify Plus + Stripe + AWS infra", trigger: "Payment terms change, shipping SLA shift, app fee increase" },
              { segment: "DevTools / Infra", signals: "AWS-heavy + GitHub + Salesforce org", trigger: "IAM policy change, API quota reduction, critical update" },
            ].map(seg => (
              <div key={seg.segment} className="card" style={{ padding: "1rem" }}>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.25rem" }}>{seg.segment}</div>
                <div style={{ fontSize: "0.72rem", color: "#10b981", marginBottom: "0.25rem" }}>{seg.signals}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.5 }}>Common trigger: {seg.trigger}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Qualification Checklist ──────────────────── */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ fontWeight: 900, fontSize: "1.4rem", marginBottom: "0.3rem" }}>
            ☑️ Qualification Checklist
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
            Use these questions in a 20-minute discovery call to assess fit and urgency. A "yes" on 4+ makes them a hot prospect.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {[
              {
                category: "Pain",
                q: "Has a vendor change ever caused an outage, billing surprise, or compliance gap you found out about late?",
                why: "Establishes historical pain. If yes: ask for the story — it becomes your ROI anchor.",
                weight: "High",
              },
              {
                category: "Pain",
                q: "How do you currently find out when Stripe, AWS, or Workspace makes a change that affects you?",
                why: "Most honest answers: 'email newsletters', 'Twitter', or 'when something breaks'. All are buying signals.",
                weight: "High",
              },
              {
                category: "Fit",
                q: "Which of these do you use in production: Stripe, AWS CloudTrail, Google Workspace, Shopify, Salesforce?",
                why: "2+ = strong connector coverage day one. 0 = observatory mode only, weaker value prop.",
                weight: "High",
              },
              {
                category: "Fit",
                q: "How many engineers or operations people would receive and act on these alerts?",
                why: "1 → solo champion risk. 3+ → multi-threaded deal, lower churn risk.",
                weight: "Medium",
              },
              {
                category: "Timeline",
                q: "Are you actively evaluating vendor monitoring tools now, or is this exploratory?",
                why: "Active eval → 30-day pilot window. Exploratory → nurture, invite to demo.",
                weight: "Medium",
              },
              {
                category: "Authority",
                q: "Who else needs to sign off on a $500–1,500/month security or ops tool?",
                why: "Identifies real buyer. Engineering-led purchases close faster. Finance-gated → longer cycle.",
                weight: "High",
              },
              {
                category: "Budget",
                q: "Do you have budget this quarter for a security/operations monitoring tool in the $6k–18k/year range?",
                why: "Direct budget question. If budget cycle is future → set follow-up date.",
                weight: "Medium",
              },
              {
                category: "Urgency",
                q: "Do you have a security review, SOC 2 audit, or compliance deadline coming up in the next 90 days?",
                why: "Deadline = urgency = faster close. SOC 2 / ISO 27001 buyers move quickly when audit is imminent.",
                weight: "High",
              },
            ].map((item, i) => (
              <div key={i} className="card" style={{ padding: "1rem 1.25rem", display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", alignItems: "start" }}>
                <div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.3rem" }}>
                    <span className="tag" style={{ fontSize: "0.62rem", padding: "2px 8px" }}>{item.category}</span>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Q{i + 1}. {item.q}</span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.6 }}>
                    <strong style={{ color: "var(--foreground)" }}>Why it matters: </strong>{item.why}
                  </div>
                </div>
                <div style={{ padding: "3px 10px", borderRadius: 999, fontSize: "0.65rem", fontWeight: 800, background: item.weight === "High" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)", color: item.weight === "High" ? "#ef4444" : "#f59e0b", whiteSpace: "nowrap", height: "fit-content" }}>
                  {item.weight === "High" ? "🔴 High" : "🟡 Medium"}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "1rem", padding: "1rem 1.25rem", borderRadius: 8, background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.2)", fontSize: "0.8rem", color: "var(--muted)" }}>
            <strong style={{ color: "var(--foreground)" }}>Scoring: </strong>
            5–6 High-weight "yes" → Hot (send Pilot SOW same day) ·
            3–4 → Warm (start 14-day trial, follow up at day 7) ·
            1–2 → Cold (add to newsletter, invite to watch demo)
          </div>
        </section>

        {/* ── Objection Handling ───────────────────────── */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ fontWeight: 900, fontSize: "1.4rem", marginBottom: "0.3rem" }}>
            🥊 Objection Handling
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
            Common objections and proven responses. Be direct — don&apos;t over-engineer the answer.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              {
                objection: `"We already get emails from Stripe / AWS / Google."`,
                response: `Those are marketing or engineering updates — not risk-assessed for your specific stack. Change Risk Radar tells you which changes affect your integration specifically, with the impact to your business and the exact action to take. Email newsletters don't do that.`,
                category: "Awareness",
              },
              {
                objection: `"We have engineers who track this manually."`,
                response: `How many hours a week? At $150/hr for a senior engineer, that's $6k/month in attention tax — more than our Growth plan. And engineers catch things reactively, not proactively. We catch changes before they hit production.`,
                category: "DIY",
              },
              {
                objection: `"$500/month is too expensive."`,
                response: `One missed Stripe payment-term change costs more than a year of Starter. Walk me through your last vendor-change incident — what did it cost in eng time and customer impact? I bet it was more than $6k.`,
                category: "Price",
              },
              {
                objection: `"Can you handle our compliance requirements?"`,
                response: `We have a security pack and DPA you can download right now — no sales call required. RLS on every row, SOC 2-ready audit logs, least-privilege connector scopes, GDPR-compliant. [Link: /pilot/security and /legal/dpa]`,
                category: "Compliance",
              },
              {
                objection: `"We need to talk to our security team first."`,
                response: `Perfect — here's the security pack they'll want to review: infrastructure, data classification, connector permissions, and our sub-processor list. I'll send the DPA too. What's the best email for them?`,
                category: "Security review",
              },
              {
                objection: `"We're worried about giving you API access."`,
                response: `Every connector is read-only. Stripe uses a Restricted Key with 8 resources and zero write access. AWS uses a cross-account IAM role with CloudTrail_ReadOnlyAccess only. Google Workspace needs 2 OAuth scopes — both read-only. Your team can audit the exact permissions in our security pack.`,
                category: "Access concern",
              },
              {
                objection: `"We need a custom integration for [X]."`,
                response: `We're adding new connectors monthly. What's [X]? If it's Stripe, AWS, Workspace, Shopify, or Salesforce, you're covered today. If it's something else, our Custom URL monitor covers any public-facing doc — and API connectors are on our roadmap. What's your target vendor?`,
                category: "Roadmap",
              },
              {
                objection: `"We want to wait until after our next funding round / audit."`,
                response: `That's exactly when you need this most. Investors and auditors want to see that you have a vendor change monitoring process. We can set up a 90-day pilot that runs parallel to your audit — our pilot SOW is downloadable now, no negotiation needed.`,
                category: "Timing",
              },
            ].map((item, i) => (
              <div key={i} className="card" style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <span className="tag" style={{ fontSize: "0.62rem", flexShrink: 0, marginTop: 2 }}>{item.category}</span>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", fontStyle: "italic", color: "var(--muted)" }}>{item.objection}</div>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--foreground)", lineHeight: 1.7, borderLeft: "2px solid var(--accent)", paddingLeft: "0.75rem" }}>
                  {item.response}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Recorded Demo ───────────────────────────── */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ fontWeight: 900, fontSize: "1.4rem", marginBottom: "0.3rem" }}>🎬 Interactive Demo</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
            A fully interactive demo with synthetic data — no credentials, no setup. Shows exactly what a customer sees when a critical vendor change hits.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
            {[
              {
                name: "Acme SaaS Corp",
                industry: "B2B SaaS",
                connectors: "Stripe + Workspace",
                scenario: "Stripe raises dispute fee 10% mid-quarter",
                icon: "🏢",
              },
              {
                name: "TechFlow Commerce",
                industry: "E-Commerce",
                connectors: "Stripe + AWS",
                scenario: "AWS deprecates EC2 image mid-cycle",
                icon: "🛍️",
              },
              {
                name: "CloudBridge DevTools",
                industry: "Developer Tools",
                connectors: "AWS + Workspace",
                scenario: "Google removes API scope without notice",
                icon: "⚙️",
              },
            ].map(d => (
              <a key={d.name} href={`/demo?tenant=demo-${d.name.toLowerCase().replace(/[^a-z]/g, "-").replace(/-+/g, "-")}`} style={{ textDecoration: "none" }}>
                <div className="card" style={{ padding: "1rem", cursor: "pointer" }}>
                  <div style={{ fontSize: "1.4rem", marginBottom: "0.4rem" }}>{d.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{d.name}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--accent)", marginBottom: "0.2rem" }}>{d.industry} · {d.connectors}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.5 }}>Scenario: {d.scenario}</div>
                </div>
              </a>
            ))}
          </div>

          <a href="/demo" className="btn-primary" style={{ textDecoration: "none", display: "inline-block", fontSize: "0.88rem", padding: "0.65rem 1.5rem" }}>
            🎬 Open interactive demo →
          </a>
        </section>

        {/* ── Self-Serve Assets ───────────────────────── */}
        <section>
          <h2 style={{ fontWeight: 900, fontSize: "1.4rem", marginBottom: "0.3rem" }}>📁 Self-Serve Assets</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
            No sales call needed to get these. Download, review, and share with your team.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "0.75rem" }}>
            {[
              {
                title: "90-Day Pilot SOW",
                desc: "Terms, deliverables, success criteria, legal fallback, and exit clauses. Editable and PDF-printable.",
                href: "/pilot/sow",
                icon: "📋",
                cta: "Open SOW",
              },
              {
                title: "Security & Compliance Pack",
                desc: "Infrastructure, data classification, RLS design, connector OAuth scopes, SOC 2 readiness, sub-processors.",
                href: "/pilot/security",
                icon: "🔒",
                cta: "Open security pack",
              },
              {
                title: "Privacy Policy",
                desc: "GDPR-aligned, CCPA section, data retention, third-party sub-processors.",
                href: "/legal/privacy",
                icon: "🛡️",
                cta: "Read policy",
              },
              {
                title: "Data Processing Agreement",
                desc: "GDPR Article 28 DPA with standard contractual clauses, sub-processor list, DPO contact.",
                href: "/legal/dpa",
                icon: "⚖️",
                cta: "Read DPA",
              },
              {
                title: "Terms of Service",
                desc: "SaaS subscription agreement covering usage, SLAs, IP, acceptable use, limitation of liability.",
                href: "/legal/terms",
                icon: "📄",
                cta: "Read ToS",
              },
              {
                title: "Pricing Calculator",
                desc: "Starter $500/mo (2 connectors, 500 alerts) and Growth $1,500/mo (5 connectors, 2,000 alerts). Quarterly/annual discounts.",
                href: "/pricing",
                icon: "💳",
                cta: "See pricing",
              },
            ].map(asset => (
              <a key={asset.title} href={asset.href} style={{ textDecoration: "none" }}>
                <div className="card" style={{ padding: "1.25rem", height: "100%" }}>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "1.4rem" }}>{asset.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.2rem" }}>{asset.title}</div>
                      <div style={{ fontSize: "0.73rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "0.6rem" }}>{asset.desc}</div>
                      <div style={{ color: "var(--accent)", fontSize: "0.73rem", fontWeight: 700 }}>{asset.cta} →</div>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
