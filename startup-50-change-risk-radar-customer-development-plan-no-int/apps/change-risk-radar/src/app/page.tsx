import WaitlistForm from "@/components/WaitlistForm";
import Link from "next/link";

const VENDORS = [
  "Stripe", "Shopify", "AWS", "Google Workspace", "GitHub",
  "Twilio", "SendGrid", "Salesforce", "HubSpot", "Cloudflare",
  "Slack", "Zoom", "QuickBooks", "Xero", "Intercom",
  "Zendesk", "PayPal", "Plaid", "Okta", "Klaviyo",
];

const RISK_TYPES = [
  { icon: "💰", label: "Pricing Changes", desc: "Fee increases, tier restructuring, quota cuts" },
  { icon: "⚖️", label: "Legal & Compliance", desc: "ToS updates, data policies, GDPR/CCPA changes" },
  { icon: "🔧", label: "API & Operational", desc: "Deprecations, breaking changes, auth updates" },
  { icon: "🔒", label: "Security Events", desc: "Auth requirements, permission model changes" },
];

const HOW_STEPS = [
  { n: "01", title: "Connect Your Stack", desc: "Tell us which tools your company uses. We monitor their changelogs, release notes, and policy pages 24/7." },
  { n: "02", title: "We Watch & Detect", desc: "Our observatory crawls 25+ vendor sources, diffs content, and classifies every change by risk type and severity." },
  { n: "03", title: "Plain-English Alerts", desc: "When something matters—a Stripe fee hike, an AWS deprecation, a Shopify checkout change—you get a clear, actionable summary." },
  { n: "04", title: "Act Before It Hurts", desc: "Know days or weeks before a change impacts you. Update code, renegotiate contracts, or brief your team on what's coming." },
];

export default function HomePage() {
  return (
    <div>
      {/* HERO */}
      <section className="hero">
        <div className="container">
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "999px", padding: "0.4rem 1rem", marginBottom: "2rem", fontSize: "0.875rem", color: "var(--accent-light)" }}>
            <span className="live-dot"></span>
            Observatory live · collecting vendor diffs now
          </div>
          <h1>
            Know Before <span className="gradient-text">Vendor Changes</span><br />
            Break Your Business
          </h1>
          <p>
            We watch Stripe, Shopify, AWS, Google Workspace, and 20+ more tools—
            alerting you in plain English when a change creates operational, legal,
            pricing, or security risk.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#waitlist" className="btn-primary" style={{ fontSize: "1.1rem", padding: "0.875rem 2rem" }}>
              🎯 Join the Waitlist
            </a>
            <Link href="/observatory" className="btn-ghost">
              📡 Live Observatory →
            </Link>
          </div>

          {/* Social proof */}
          <div style={{ marginTop: "3rem", color: "var(--muted)", fontSize: "0.875rem" }}>
            Monitoring changes across
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center", marginTop: "1rem" }}>
              {VENDORS.map(v => (
                <span key={v} className="tag">{v}</span>
              ))}
              <span className="tag">+10 more</span>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="section" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="container">
          <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
            <h2 className="section-title">Your tools change constantly.<br />You find out the hard way.</h2>
            <p className="section-subtitle">
              Last year, Stripe changed checkout flows affecting 40% of integrations. AWS deprecated
              6 major APIs. Shopify updated app permissions across 8,000+ apps. Most companies
              found out when something broke.
            </p>
          </div>
          <div className="grid-2" style={{ maxWidth: 900, margin: "0 auto" }}>
            {[
              { stat: "3-4 weeks", label: "avg time to detect a vendor change impact", icon: "⏱️" },
              { stat: "$47K", label: "avg cost of a missed API deprecation for mid-market", icon: "💸" },
              { stat: "73%", label: "of SaaS companies experienced a surprise vendor change in 2024", icon: "😱" },
              { stat: "0", label: "proactive monitoring tools exist for cross-vendor change risk", icon: "🕳️" },
            ].map(item => (
              <div key={item.label} className="card" style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <span style={{ fontSize: "2rem" }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-light)" }}>{item.stat}</div>
                  <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{item.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RISK TYPES */}
      <section className="section" style={{ background: "rgba(99,102,241,0.03)", borderTop: "1px solid var(--border)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 className="section-title">We catch every type of risk</h2>
            <p className="section-subtitle">Not just technical changes—we flag pricing, legal, and security risks too.</p>
          </div>
          <div className="grid-2" style={{ maxWidth: 900, margin: "0 auto" }}>
            {RISK_TYPES.map(rt => (
              <div key={rt.label} className="card">
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{rt.icon}</div>
                <h3 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>{rt.label}</h3>
                <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{rt.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 className="section-title">How it works</h2>
          </div>
          <div className="grid-2" style={{ maxWidth: 900, margin: "0 auto" }}>
            {HOW_STEPS.map(step => (
              <div key={step.n} className="card" style={{ display: "flex", gap: "1rem" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "rgba(99,102,241,0.3)", minWidth: 40 }}>{step.n}</div>
                <div>
                  <h3 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>{step.title}</h3>
                  <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="section" style={{ borderTop: "1px solid var(--border)", background: "rgba(99,102,241,0.02)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 className="section-title">Simple, transparent pricing</h2>
            <p className="section-subtitle">Early access pricing locked in for founding members.</p>
          </div>
          <div className="grid-3" style={{ maxWidth: 1000, margin: "0 auto" }}>
            {[
              { name: "Starter", price: "$99", period: "/mo", desc: "Perfect for lean teams", features: ["Up to 10 tools monitored", "Email + Slack alerts", "Weekly digest", "Basic risk taxonomy", "30-day history"], badge: null },
              { name: "Growth", price: "$299", period: "/mo", desc: "For scaling companies", features: ["Up to 30 tools monitored", "Real-time alerts", "Priority classification", "API access", "90-day history", "Slack + webhook + email"], badge: "Most Popular" },
              { name: "Enterprise", price: "Custom", period: "", desc: "For complex stacks", features: ["Unlimited tools", "Custom vendor requests", "Dedicated analyst", "SLA guarantee", "SSO + RBAC", "Unlimited history"], badge: null },
            ].map(plan => (
              <div key={plan.name} className="card" style={{ border: plan.badge ? "1px solid var(--accent)" : undefined, position: "relative" }}>
                {plan.badge && (
                  <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", background: "var(--accent)", color: "white", padding: "0.2rem 0.8rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700 }}>
                    {plan.badge}
                  </div>
                )}
                <h3 style={{ fontWeight: 700, marginBottom: "0.25rem" }}>{plan.name}</h3>
                <div style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: "1rem" }}>{plan.desc}</div>
                <div style={{ fontSize: "2.5rem", fontWeight: 800, color: plan.badge ? "var(--accent-light)" : "var(--foreground)", marginBottom: "1.5rem" }}>
                  {plan.price}<span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--muted)" }}>{plan.period}</span>
                </div>
                <ul style={{ listStyle: "none", padding: 0, marginBottom: "1.5rem" }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ padding: "0.4rem 0", borderBottom: "1px solid var(--border)", color: "var(--muted)", fontSize: "0.875rem", display: "flex", gap: "0.5rem" }}>
                      <span style={{ color: "var(--success)" }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a href="#waitlist" className={plan.badge ? "btn-primary" : "btn-ghost"} style={{ width: "100%", justifyContent: "center" }}>
                  Join Waitlist
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WAITLIST */}
      <section className="section" id="waitlist" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="container">
          <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
            <h2 className="section-title">Get Early Access</h2>
            <p style={{ color: "var(--muted)", marginBottom: "2rem" }}>
              Join the waitlist for free, or reserve your spot with a <strong style={{ color: "var(--foreground)" }}>$50 fully refundable deposit</strong> to
              lock in founding-member pricing. No risk, cancel anytime.
            </p>
            <WaitlistForm />
          </div>
        </div>
      </section>
    </div>
  );
}
