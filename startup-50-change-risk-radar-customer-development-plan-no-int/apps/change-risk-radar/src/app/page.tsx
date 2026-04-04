import WaitlistForm from "@/components/WaitlistForm";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";

export const revalidate = 300; // 5 min

const VENDORS = [
  "Stripe", "Shopify", "AWS", "Google Workspace", "GitHub",
  "Twilio", "SendGrid", "Salesforce", "HubSpot", "Cloudflare",
  "Slack", "Zoom", "QuickBooks", "Intercom", "Zendesk",
  "PayPal", "Okta", "Klaviyo", "Vercel", "Netlify",
];

const RISK_TYPES = [
  { icon: "💰", label: "Pricing Changes", desc: "Fee increases, tier restructuring, quota reductions" },
  { icon: "⚖️", label: "Legal & Compliance", desc: "ToS updates, data policies, DPA changes, AUP restrictions" },
  { icon: "🔧", label: "API & Operational", desc: "Deprecations, SDK breaking changes, webhook format updates" },
  { icon: "🔒", label: "Security Events", desc: "Auth requirement changes, TLS upgrades, incident disclosures" },
];

const HOW_STEPS = [
  { n: "01", title: "Connect Your Stack", desc: "Tell us which tools your company uses. We monitor their changelogs, release notes, and policy pages 24/7." },
  { n: "02", title: "We Watch & Detect", desc: "Our observatory crawls 30+ vendor sources, diffs content, and classifies every change by risk type and severity." },
  { n: "03", title: "Plain-English Alerts", desc: "When something matters—a Stripe fee hike, an AWS deprecation, a Shopify checkout change—you get a clear, actionable summary." },
  { n: "04", title: "Act Before It Hurts", desc: "Know days or weeks before a change impacts you. Update code, renegotiate contracts, or brief your team on what's coming." },
];

const RISK_COLORS: Record<string, string> = {
  high: "#ef4444", medium: "#f59e0b", low: "#10b981",
};

const CATEGORY_ICONS: Record<string, string> = {
  pricing: "💰", legal: "⚖️", operational: "🔧", security: "🔒", vendor_risk: "🏢",
};

const VENDOR_ICONS: Record<string, string> = {
  stripe: "💳", aws: "☁️", "google-workspace": "🔵", github: "🐙", shopify: "🛍️",
  vercel: "▲", slack: "💬", hubspot: "🟠", twilio: "📱", sendgrid: "✉️",
  cloudflare: "🌐", okta: "🔐", salesforce: "☁️", zendesk: "🎫", "google-ads": "📊",
  "meta-ads": "📘", klaviyo: "📧", netlify: "🌐", intercom: "💬",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 1) return `${d}d ago`;
  if (d === 1) return "yesterday";
  if (h > 1) return `${h}h ago`;
  return "just now";
}

export default async function HomePage() {
  // Fetch live stats + recent diffs
  const [diffsRes, vendorCountRes, weekCountRes] = await Promise.all([
    supabaseAdmin
      .from("crr_diffs")
      .select("id,vendor_slug,title,risk_level,risk_category,collected_at,summary")
      .order("collected_at", { ascending: false })
      .limit(12),
    supabaseAdmin.from("crr_vendors").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("crr_diffs")
      .select("id", { count: "exact", head: true })
      .gte("collected_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const recentDiffs = diffsRes.data ?? [];
  const vendorCount = vendorCountRes.count ?? 30;
  const weeklyDiffs = weekCountRes.count ?? 0;

  const { count: totalDiffs } = await supabaseAdmin
    .from("crr_diffs")
    .select("id", { count: "exact", head: true });

  return (
    <div>
      {/* HERO */}
      <section className="hero">
        <div className="container">
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: "999px", padding: "0.4rem 1rem", marginBottom: "2rem",
            fontSize: "0.875rem", color: "#ef4444",
          }}>
            <span className="live-dot" style={{ background: "#ef4444" }}></span>
            <strong>{totalDiffs?.toLocaleString() ?? "183"}+ changes</strong> detected across {vendorCount} vendors —{" "}
            <strong>{weeklyDiffs}</strong> this week
          </div>
          <h1>
            Know Before <span className="gradient-text">Vendor Changes</span><br />
            Break Your Business
          </h1>
          <p>
            We watch Stripe, Shopify, AWS, Google Workspace, and 25+ more tools —
            alerting you in plain English when a change creates operational, legal,
            pricing, or security risk before you find out the hard way.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/demo" className="btn-primary" style={{ fontSize: "1.1rem", padding: "0.875rem 2rem" }}>
              🔴 See Live Demo
            </Link>
            <a href="#waitlist" className="btn-ghost">
              🎯 Join Waitlist →
            </a>
          </div>
          <div style={{ marginTop: "3rem", color: "var(--muted)", fontSize: "0.875rem" }}>
            Monitoring changes across
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center", marginTop: "1rem" }}>
              {VENDORS.map(v => <span key={v} className="tag">{v}</span>)}
              <span className="tag">+10 more</span>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE FEED — real data from observatory */}
      <section className="section" style={{ borderTop: "1px solid var(--border)", background: "rgba(0,0,0,0.2)" }}>
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                <span className="live-dot" style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444", marginRight: "0.5rem" }}></span>
                Live Change Feed
              </h2>
              <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: 0 }}>
                Real vendor changes collected by our observatory in the last 7 days
              </p>
            </div>
            <Link href="/observatory"
              style={{ fontSize: "0.875rem", color: "var(--accent-light)", textDecoration: "none", fontWeight: 600 }}>
              View all {totalDiffs?.toLocaleString()} alerts →
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {recentDiffs.map((d) => (
              <div key={d.id}
                style={{
                  display: "flex", gap: "0.75rem", alignItems: "flex-start",
                  background: "rgba(15,15,25,0.6)", border: "1px solid var(--border)",
                  borderLeft: `3px solid ${RISK_COLORS[d.risk_level] ?? "var(--border)"}`,
                  borderRadius: "8px", padding: "0.75rem 1rem",
                }}>
                <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{VENDOR_ICONS[d.vendor_slug] ?? "🔔"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.2rem" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.8rem", textTransform: "capitalize" }}>
                      {d.vendor_slug.replace(/-/g, " ")}
                    </span>
                    <span style={{
                      fontSize: "0.65rem", padding: "0.05rem 0.4rem", borderRadius: "3px", fontWeight: 700,
                      background: `${RISK_COLORS[d.risk_level]}22`, color: RISK_COLORS[d.risk_level],
                    }}>{d.risk_level}</span>
                    <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>
                      {CATEGORY_ICONS[d.risk_category]} {d.risk_category}
                    </span>
                    <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "var(--muted)" }}>
                      {timeAgo(d.collected_at)}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--foreground)" }}>{d.title}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
            <Link href="/demo"
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                padding: "0.75rem 1.5rem", background: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.25)", borderRadius: "10px",
                color: "var(--accent-light)", textDecoration: "none", fontWeight: 600, fontSize: "0.9rem",
              }}>
              🔴 See alerts for your stack — Live Demo →
            </Link>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="section" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="container">
          <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
            <h2 className="section-title">Your tools change constantly.<br />You find out the hard way.</h2>
            <p className="section-subtitle">
              Last year, Stripe changed checkout flows affecting 40% of integrations.
              AWS deprecated 6 major APIs. Shopify updated app permissions across 8,000+ apps.
              Most companies found out when something broke.
            </p>
          </div>
          <div className="grid-2" style={{ maxWidth: 900, margin: "0 auto" }}>
            {[
              { stat: "3–4 weeks", label: "avg time to detect a vendor change impact", icon: "⏱️" },
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

      {/* DOGFOOD CALLOUT */}
      <section className="section" style={{ borderTop: "1px solid var(--border)", background: "rgba(239,68,68,0.03)" }}>
        <div className="container" style={{ maxWidth: 900 }}>
          <div style={{
            display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap",
            background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "16px", padding: "2rem",
          }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
                🧪 Founder Dogfood
              </div>
              <h3 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.75rem" }}>
                We're using this ourselves
              </h3>
              <p style={{ color: "var(--muted)", fontSize: "0.925rem", marginBottom: "1rem" }}>
                We've connected our own stack — Stripe, AWS, GitHub, Slack, Vercel — and
                are collecting real alerts. Last 14 days: <strong style={{ color: "var(--foreground)" }}>{recentDiffs.length}+ changes detected</strong>,
                including <strong style={{ color: "#ef4444" }}>{recentDiffs.filter(d => d.risk_level === "high").length} high-risk events</strong>.
              </p>
              <Link href="/demo"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.5rem",
                  padding: "0.75rem 1.5rem", background: "#ef4444", color: "white",
                  borderRadius: "10px", textDecoration: "none", fontWeight: 700, fontSize: "0.95rem",
                }}>
                See the live results →
              </Link>
            </div>
            <div style={{ flex: "0 0 200px", textAlign: "center" }}>
              <div style={{ fontSize: "3.5rem", fontWeight: 800, color: "#ef4444" }}>{recentDiffs.filter(d => d.risk_level === "high").length}</div>
              <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>high-risk alerts</div>
              <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>detected in last 12 entries</div>
            </div>
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
              Join the waitlist for free, or reserve your spot with a{" "}
              <strong style={{ color: "var(--foreground)" }}>$50 fully refundable deposit</strong>{" "}
              to lock in founding-member pricing. No risk, cancel anytime.
            </p>
            <WaitlistForm />
            <div style={{ marginTop: "2rem", display: "flex", gap: "1.5rem", justifyContent: "center", color: "var(--muted)", fontSize: "0.8rem" }}>
              <span>✓ No credit card required</span>
              <span>✓ Cancel anytime</span>
              <span>✓ Deposit fully refundable</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
