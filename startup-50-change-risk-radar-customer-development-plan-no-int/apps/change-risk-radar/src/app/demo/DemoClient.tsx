"use client";
import { useState } from "react";
import Link from "next/link";

interface Diff {
  id: string;
  vendor_slug: string;
  title: string;
  summary: string;
  risk_level: string;
  risk_category: string;
  collected_at: string;
  source_url: string;
  detection_method: string;
}

interface StackMeta {
  name: string;
  icon: string;
  color: string;
  category: string;
}

const RISK_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};

const CATEGORY_ICONS: Record<string, string> = {
  pricing: "💰",
  legal: "⚖️",
  operational: "🔧",
  security: "🔒",
  vendor_risk: "🏢",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 1) return `${d} days ago`;
  if (h > 1) return `${h} hours ago`;
  return "recently";
}

export default function DemoClient({
  diffs, byVendor, stats, firstHighRisk, latestAlert, stackMeta, founderStack,
}: {
  diffs: Diff[];
  byVendor: Record<string, Diff[]>;
  stats: { total14d: number; total7d: number; highRisk14d: number; vendorsActive: number; totalEver: number };
  firstHighRisk: Diff | null;
  latestAlert: Diff | null;
  stackMeta: Record<string, StackMeta>;
  founderStack: string[];
}) {
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const featured = firstHighRisk ?? latestAlert;

  const filtered = diffs.filter(d => {
    if (filter !== "all" && d.risk_level !== filter) return false;
    if (vendorFilter !== "all" && d.vendor_slug !== vendorFilter) return false;
    return true;
  });

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company, role: "demo-visitor", top_tool: founderStack[0] }),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: "3rem 0" }}>
      <div className="container">

        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <div className="tag" style={{ marginBottom: "1rem" }}>🔴 LIVE DEMO — Founder's Stack</div>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "0.75rem", lineHeight: 1.15 }}>
            This is what you would have missed
          </h1>
          <p style={{ color: "var(--muted)", maxWidth: 640, fontSize: "1.1rem" }}>
            Change Risk Radar has been monitoring <strong style={{ color: "var(--foreground)" }}>11 tools</strong> in a typical SaaS founder's stack —
            Stripe, AWS, GitHub, Slack, and more — for the past 14 days.
            Here's every change that could affect your business, risk-ranked.
          </p>
        </div>

        {/* Time-to-first-value callout */}
        {featured && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "12px", padding: "1.5rem", marginBottom: "2rem", display: "flex", gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ fontSize: "2rem" }}>⚡</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--danger)", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>
                Time-to-first-value: immediate
              </div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.4rem" }}>
                {CATEGORY_ICONS[featured.risk_category] ?? "🔔"} {featured.title}
              </div>
              <div style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
                <strong style={{ color: "var(--foreground)" }}>{stackMeta[featured.vendor_slug]?.icon} {stackMeta[featured.vendor_slug]?.name}</strong> ·{" "}
                {featured.summary?.slice(0, 160)}{featured.summary?.length > 160 ? "…" : ""}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                <span className={`badge badge-${featured.risk_level === "high" ? "high" : featured.risk_level === "medium" ? "medium" : "low"}`}>
                  {featured.risk_level} risk
                </span>
                <span className="tag">{CATEGORY_ICONS[featured.risk_category]} {featured.risk_category}</span>
                <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>detected {timeAgo(featured.collected_at)}</span>
                {featured.source_url && (
                  <a href={featured.source_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: "0.8rem", color: "var(--accent-light)", textDecoration: "none" }}>
                    view source →
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { label: "Alerts (14d)", value: stats.total14d, icon: "📊", color: "var(--accent-light)" },
            { label: "High Risk", value: stats.highRisk14d, icon: "🔴", color: "#ef4444" },
            { label: "Vendors Active", value: `${stats.vendorsActive}/11`, icon: "🏢", color: "var(--warning)" },
            { label: "Alerts (7d)", value: stats.total7d, icon: "📅", color: "var(--success)" },
            { label: "All-time alerts", value: stats.totalEver, icon: "📈", color: "var(--muted)" },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: "center", padding: "1rem" }}>
              <div style={{ fontSize: "1.25rem" }}>{s.icon}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Stack overview */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1rem" }}>📦 Stack Being Monitored</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {founderStack.map(slug => {
              const meta = stackMeta[slug];
              const count = byVendor[slug]?.length ?? 0;
              const hasHigh = byVendor[slug]?.some(d => d.risk_level === "high");
              return (
                <button key={slug}
                  onClick={() => setVendorFilter(vendorFilter === slug ? "all" : slug)}
                  style={{
                    padding: "0.5rem 0.9rem", borderRadius: "999px", border: "1px solid",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem",
                    fontSize: "0.85rem", fontWeight: 600, transition: "all 0.15s",
                    borderColor: vendorFilter === slug ? "var(--accent)" : count > 0 ? "var(--border)" : "rgba(255,255,255,0.05)",
                    background: vendorFilter === slug ? "rgba(99,102,241,0.12)" : "transparent",
                    color: vendorFilter === slug ? "var(--accent-light)" : count > 0 ? "var(--foreground)" : "var(--muted)",
                  }}>
                  <span>{meta?.icon}</span>
                  <span>{meta?.name}</span>
                  {count > 0 && (
                    <span style={{
                      fontSize: "0.65rem", borderRadius: "999px", padding: "0.05rem 0.4rem",
                      background: hasHigh ? "rgba(239,68,68,0.15)" : "rgba(99,102,241,0.12)",
                      color: hasHigh ? "#ef4444" : "var(--accent-light)",
                    }}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Filter bar */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Risk level:</span>
          {(["all", "high", "medium", "low"] as const).map(r => (
            <button key={r} onClick={() => setFilter(r)}
              style={{
                padding: "0.3rem 0.7rem", borderRadius: "999px", border: "1px solid", cursor: "pointer",
                fontSize: "0.78rem", fontWeight: 600, textTransform: "capitalize",
                borderColor: filter === r ? "var(--accent)" : "var(--border)",
                background: filter === r ? "rgba(99,102,241,0.1)" : "transparent",
                color: filter === r ? "var(--accent-light)" : "var(--muted)",
              }}>
              {r === "high" ? "🔴" : r === "medium" ? "🟡" : r === "low" ? "🟢" : ""}
              {" "}{r === "all" ? "All" : r}
            </button>
          ))}
          <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "var(--muted)" }}>
            {filtered.length} alert{filtered.length !== 1 ? "s" : ""}
            {vendorFilter !== "all" && ` for ${stackMeta[vendorFilter]?.name}`}
          </span>
        </div>

        {/* Alert feed */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "3rem" }}>
          {filtered.length === 0 && (
            <div className="card" style={{ textAlign: "center", color: "var(--muted)", padding: "2rem" }}>
              No alerts match this filter. Try changing the risk level or vendor.
            </div>
          )}
          {filtered.map((d, i) => {
            const meta = stackMeta[d.vendor_slug];
            return (
              <div key={d.id} className="card" style={{
                display: "flex", gap: "1rem", alignItems: "flex-start",
                borderLeft: `3px solid ${RISK_COLORS[d.risk_level] ?? "var(--border)"}`,
                opacity: i > 20 ? 0.85 : 1,
              }}>
                <div style={{ fontSize: "1.5rem", flexShrink: 0 }}>{meta?.icon ?? "🔔"}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.35rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{meta?.name ?? d.vendor_slug}</span>
                    <span className={`badge badge-${d.risk_level === "high" ? "high" : d.risk_level === "medium" ? "medium" : "low"}`}
                      style={{ fontSize: "0.65rem" }}>{d.risk_level}</span>
                    <span className="tag" style={{ fontSize: "0.7rem" }}>
                      {CATEGORY_ICONS[d.risk_category]} {d.risk_category}
                    </span>
                    <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--muted)" }}>
                      {timeAgo(d.collected_at)}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.3rem" }}>{d.title}</div>
                  {d.summary && (
                    <div style={{ color: "var(--muted)", fontSize: "0.82rem", lineHeight: 1.5 }}>
                      {d.summary.slice(0, 200)}{d.summary.length > 200 ? "…" : ""}
                    </div>
                  )}
                  {d.source_url && (
                    <a href={d.source_url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: "0.75rem", color: "var(--accent-light)", textDecoration: "none", marginTop: "0.35rem", display: "inline-block" }}>
                      View source →
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Section */}
        <div style={{
          background: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)",
          border: "1px solid rgba(99,102,241,0.25)", borderRadius: "16px", padding: "2.5rem",
          textAlign: "center", marginBottom: "2rem",
        }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🎯</div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.75rem" }}>
            Get alerts for <em>your</em> stack
          </h2>
          <p style={{ color: "var(--muted)", maxWidth: 520, margin: "0 auto 1.5rem", fontSize: "1rem" }}>
            We found <strong style={{ color: "var(--foreground)" }}>{stats.total14d} changes</strong> in 14 days
            across 11 tools — <strong style={{ color: "#ef4444" }}>{stats.highRisk14d} high-risk</strong> events that could
            affect pricing, legal exposure, or engineering work.
            Join the waitlist to get personalized alerts for the tools your business actually depends on.
          </p>

          {!submitted ? (
            !showWaitlist ? (
              <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={() => setShowWaitlist(true)}
                  style={{
                    padding: "0.85rem 2rem", background: "var(--accent)", color: "white",
                    border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 700, fontSize: "1rem",
                  }}>
                  Get Early Access — Free
                </button>
                <Link href="/"
                  style={{
                    padding: "0.85rem 2rem", background: "transparent", color: "var(--foreground)",
                    border: "1px solid var(--border)", borderRadius: "10px", fontWeight: 600,
                    textDecoration: "none", fontSize: "1rem", display: "inline-flex", alignItems: "center",
                  }}>
                  $50 Refundable Deposit →
                </Link>
              </div>
            ) : (
              <form onSubmit={handleWaitlist}
                style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 420, margin: "0 auto" }}>
                <input
                  type="email" required placeholder="Work email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  style={{
                    padding: "0.75rem 1rem", background: "var(--card)", border: "1px solid var(--border)",
                    borderRadius: "8px", color: "var(--foreground)", fontSize: "0.95rem",
                  }} />
                <input
                  type="text" placeholder="Company name"
                  value={company} onChange={e => setCompany(e.target.value)}
                  style={{
                    padding: "0.75rem 1rem", background: "var(--card)", border: "1px solid var(--border)",
                    borderRadius: "8px", color: "var(--foreground)", fontSize: "0.95rem",
                  }} />
                <button type="submit" disabled={submitting}
                  style={{
                    padding: "0.85rem", background: "var(--accent)", color: "white",
                    border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "1rem",
                  }}>
                  {submitting ? "Saving…" : "Join Waitlist →"}
                </button>
                <p style={{ fontSize: "0.75rem", color: "var(--muted)", margin: 0 }}>
                  No spam. Waitlist-only access. Alerts start the day you connect your stack.
                </p>
              </form>
            )
          ) : (
            <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid var(--success)", borderRadius: "10px", padding: "1.25rem" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>✅</div>
              <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>You're on the list!</div>
              <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
                We'll reach out when your personalized stack monitoring is ready.
              </div>
            </div>
          )}
        </div>

        {/* What this proves */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1rem" }}>
            🧪 What this dogfood test validates
          </h2>
          <div className="grid-3" style={{ gap: "1rem" }}>
            {[
              {
                title: "Time to first value", icon: "⚡",
                metric: featured ? `< 24h` : "Active",
                desc: "First meaningful alert detected within 1 day of stack connection"
              },
              {
                title: "Signal-to-noise", icon: "🎯",
                metric: `${stats.highRisk14d}/${stats.total14d}`,
                desc: `High-risk alerts vs total — only surface what matters`
              },
              {
                title: "Vendor coverage", icon: "🏢",
                metric: `${stats.vendorsActive}/11`,
                desc: "Tools with activity detected in the monitoring window"
              },
            ].map(v => (
              <div key={v.title} className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{v.icon}</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent-light)", marginBottom: "0.25rem" }}>
                  {v.metric}
                </div>
                <div style={{ fontWeight: 700, marginBottom: "0.35rem", fontSize: "0.9rem" }}>{v.title}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{v.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <Link href="/observatory" style={{ color: "var(--accent-light)", textDecoration: "none", fontSize: "0.9rem" }}>
            View full observatory →
          </Link>
          <span style={{ color: "var(--border)" }}>·</span>
          <Link href="/taxonomy" style={{ color: "var(--accent-light)", textDecoration: "none", fontSize: "0.9rem" }}>
            Browse risk taxonomy →
          </Link>
        </div>
      </div>
    </div>
  );
}
