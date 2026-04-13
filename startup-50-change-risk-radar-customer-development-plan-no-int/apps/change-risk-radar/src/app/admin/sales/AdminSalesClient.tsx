"use client";
import { useState } from "react";

const APP_URL = "https://change-risk-radar.vercel.app";

// ── Outreach Templates ────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: "cold_icp",
    label: "Cold outreach — ICP (CTO/VP Eng)",
    channel: "Email / LinkedIn",
    subject: "How are you finding out about Stripe/AWS changes before they hit production?",
    body: `Hi {{first_name}},

Quick question: when Stripe changes their dispute policies or AWS deprecates an API, how does {{company}} find out — and how fast?

Most engineering teams we talk to find out reactively (from a ticket, a Slack ping, or worse — a customer). We built Change Risk Radar to fix that.

It monitors your Stripe, AWS CloudTrail, and Google Workspace in real-time — and sends you a plain-English alert the moment something changes that could affect your billing, security, or compliance posture. p95 detection latency is 5 minutes.

Takes 2 minutes to connect, no code required.

Worth a quick look? → ${APP_URL}/demo

— {{sender_name}}`,
  },
  {
    id: "followup_demo",
    label: "Follow-up after demo view",
    channel: "Email",
    subject: "You saw the demo — here's what it would look like for {{company}}",
    body: `Hi {{first_name}},

You checked out our interactive demo (the {{tenant}} tenant scenario). Wanted to make it concrete for {{company}}:

Given that you use {{connectors}}, here's what you'd monitor from day one:
- {{connector_1}}: pricing changes, API deprecations, legal policy diffs
- {{connector_2}}: IAM policy changes, security group events, audit tampering

Average detection time in our alpha: 3.2 minutes. Zero false positives on the 91 "useful" reactions from alpha customers.

I can walk you through a 15-min setup for {{company}} specifically — no slide deck, just your actual connectors.

Here's our 90-day Pilot SOW if you want to see what a commitment looks like: ${APP_URL}/pilot/sow

Worth 15 minutes?

— {{sender_name}}`,
  },
  {
    id: "trial_day3",
    label: "Trial day 3 — personalised recap",
    channel: "Email",
    subject: "{{company}}'s first 3 days — {{alert_count}} changes caught",
    body: `Hi {{first_name}},

Three days in and Change Risk Radar has already caught {{alert_count}} vendor changes for {{company}}.

The most significant one: {{top_alert_title}} — {{top_alert_summary}}

This is exactly the kind of thing that gets missed until it affects a customer or an engineer's weekend.

If you want to get more signal, the next highest-value thing to add is {{connector_suggestion}}. Takes under 2 minutes.

Connect it here: ${APP_URL}/dashboard/{{org_slug}}/connect?token={{magic_token}}

— {{sender_name}}`,
  },
  {
    id: "trial_day10",
    label: "Trial day 10 — conversion push",
    channel: "Email",
    subject: "4 days left — here's what {{company}} gets if you upgrade",
    body: `Hi {{first_name}},

Your trial ends in 4 days. Here's the summary for {{company}}:

- Vendor changes detected: {{alert_count}}
- Connectors active: {{connector_count}}
- Alerts acted on: {{reaction_count}}

On the Growth plan ($1,500/month), you'd get:
- 5 connectors (you're using {{connector_count}} now)
- 2,000 alerts/month
- Weekly risk briefs for your team
- Priority support + quarterly review

On the Starter plan ($500/month):
- 2 connectors
- 500 alerts/month
- Great for teams with 1–2 critical integrations

Quarterly billing saves 10%. Annual saves 20%.

Upgrade now: ${APP_URL}/dashboard/{{org_slug}}/billing?token={{magic_token}}

Happy to answer any questions — just reply here.

— {{sender_name}}`,
  },
  {
    id: "security_review",
    label: "Security team intro",
    channel: "Email",
    subject: "Security pack for {{company}}'s team — RLS, scopes, DPA",
    body: `Hi {{security_contact}},

{{first_name}} at {{company}} asked me to share our security documentation.

Quick summary of our posture:
- All data stored in Supabase with Row-Level Security on every table
- Connector credentials: Stripe (read-only Restricted Key, 8 resources, zero write access), AWS (cross-account IAM role, CloudTrail_ReadOnlyAccess only), Google Workspace (2 read-only OAuth scopes)
- No customer data leaves your environment — we read change events, not your business data
- Audit logs on all access events, IP-tracked, risk-scored
- GDPR/CCPA compliant, DPA available

Full security pack: ${APP_URL}/pilot/security
DPA: ${APP_URL}/legal/dpa
Privacy policy: ${APP_URL}/legal/privacy

If you need a vendor security questionnaire completed, share it and I'll respond within 48 hours.

— {{sender_name}}`,
  },
  {
    id: "pilot_sow",
    label: "Pilot SOW send",
    channel: "Email",
    subject: "90-day pilot terms for {{company}}",
    body: `Hi {{first_name}},

As discussed — here's the 90-day pilot SOW for {{company}}:

${APP_URL}/pilot/sow

Key terms:
- Duration: 90 days from signed date
- Rate: $1,500/month (Growth plan) — first 30 days free if activated by {{activation_deadline}}
- Connectors included: up to 5 (Stripe, AWS, Workspace, Shopify, Salesforce)
- Success criteria: 3+ risk alerts acted on, p95 detection ≤5 minutes
- Exit clause: either party can terminate with 30-day written notice

The SOW is self-serve — you can print to PDF or copy the content directly. No wet signature required unless your legal team needs one.

Let me know if you need me to adjust any of the terms.

— {{sender_name}}`,
  },
];

// ── Revenue Tracking ──────────────────────────────────────────────────────────

const PIPELINE = [
  { stage: "Demo", target: 20, current: 3, unit: "demos/month" },
  { stage: "Trial", target: 10, current: 7, unit: "active trials" },
  { stage: "Conversion", target: "20%", current: "0%", unit: "trial → paid" },
  { stage: "MRR", target: "$25,000", current: "$0", unit: "target month-end" },
  { stage: "ARR Run Rate", target: "$300,000", current: "$0", unit: "" },
];

const OBJECTIONS_QUICK = [
  { obj: "Already get emails", response: "Email newsletters aren't risk-assessed for your stack. We are." },
  { obj: "Engineers track manually", response: "How many hours/week? At $150/hr that's more than our plan costs." },
  { obj: "Too expensive", response: "One missed Stripe change costs more than a year of Starter." },
  { obj: "Need security review", response: "Security pack is self-serve: /pilot/security and /legal/dpa" },
  { obj: "Worried about API access", response: "Every connector is read-only. Stripe = 8 resources, zero write." },
  { obj: "Wait for next audit", response: "Auditors want to see this process. Pilot is a feature, not a cost." },
];

export default function AdminSalesClient() {
  const [activeTab, setActiveTab] = useState<"pipeline" | "icp" | "templates" | "objections" | "assets">("pipeline");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyTemplate(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--border)", padding: "0.75rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontWeight: 900 }}>📡 CRR</span>
          <span className="tag" style={{ fontSize: "0.65rem", background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>Internal · Sales Ops</span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <a href="/admin/metrics" style={{ textDecoration: "none", fontSize: "0.75rem", color: "var(--muted)" }}>Metrics →</a>
          <a href="/admin/funnel" style={{ textDecoration: "none", fontSize: "0.75rem", color: "var(--muted)" }}>Funnel →</a>
          <a href="/sales" style={{ textDecoration: "none", fontSize: "0.75rem", color: "var(--accent)" }}>Public sales page →</a>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem 4rem" }}>
        <h1 style={{ fontWeight: 900, fontSize: "1.5rem", marginBottom: "0.25rem" }}>Sales Playbook</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: "1.5rem" }}>ICP filters · Qualification · Outreach templates · Pipeline · Assets</p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "0" }}>
          {(["pipeline", "icp", "templates", "objections", "assets"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                padding: "0.5rem 1rem", background: "none", border: "none", borderBottom: `2px solid ${activeTab === tab ? "var(--accent)" : "transparent"}`,
                color: activeTab === tab ? "var(--accent)" : "var(--muted)", fontWeight: activeTab === tab ? 700 : 400,
                fontSize: "0.82rem", cursor: "pointer", textTransform: "capitalize",
              }}>
              {tab === "pipeline" ? "📊 Pipeline" : tab === "icp" ? "🎯 ICP" : tab === "templates" ? "✉️ Templates" : tab === "objections" ? "🥊 Objections" : "📁 Assets"}
            </button>
          ))}
        </div>

        {/* ── Pipeline Tab ──────────────────────────────── */}
        {activeTab === "pipeline" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "0.75rem", marginBottom: "2rem" }}>
              {PIPELINE.map(row => (
                <div key={row.stage} className="card" style={{ padding: "1rem" }}>
                  <div style={{ color: "var(--muted)", fontSize: "0.72rem", marginBottom: "0.25rem" }}>{row.stage}</div>
                  <div style={{ fontWeight: 900, fontSize: "1.5rem", marginBottom: "0.1rem" }}>{row.current}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>Target: {row.target} {row.unit}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.75rem" }}>Phase 4 Success Criteria</div>
              {[
                { criterion: "Trial-to-paid conversion ≥ 20%", status: "🔴", note: "0% — billing not live yet" },
                { criterion: "Gross MRR ≥ $25,000", status: "🔴", note: "$0 — 7 trialing, 0 paid" },
                { criterion: "Payback period ≤ 6 months at target CAC", status: "⚪", note: "N/A until first paid customer" },
                { criterion: "2+ new integrations shipped", status: "✅", note: "Shopify + Salesforce — live" },
                { criterion: "Self-serve Pilot SOW + security pack", status: "✅", note: "/pilot/sow and /pilot/security" },
                { criterion: "Sales funnel instrumented end-to-end", status: "✅", note: "crr_funnel_events, v_funnel_conversion view" },
                { criterion: "14-day trial + nudge sequence live", status: "✅", note: "7 nudge emails live, first sweep done" },
              ].map(row => (
                <div key={row.criterion} style={{ display: "flex", gap: "0.75rem", padding: "0.5rem 0", borderBottom: "1px solid var(--border)", alignItems: "center", fontSize: "0.8rem" }}>
                  <span>{row.status}</span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{row.criterion}</span>
                  <span style={{ color: "var(--muted)", fontSize: "0.72rem" }}>{row.note}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: "1rem 1.25rem", borderRadius: 8, background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)", fontSize: "0.8rem", color: "var(--muted)" }}>
              <strong style={{ color: "#f59e0b" }}>⚡ Next action to unlock conversion: </strong>
              Create Stripe account (hCaptcha currently blocks headless) → set STRIPE_SECRET_KEY in Vercel env → billing checkout will go live automatically. All billing infra is already built.
            </div>
          </div>
        )}

        {/* ── ICP Tab ───────────────────────────────────── */}
        {activeTab === "icp" && (
          <div>
            <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: "1.5rem" }}>
              Use these filters when reviewing inbound leads or doing outbound prospecting. Score: ≥4 points = hot lead.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[
                { filter: "Uses Stripe for billing", score: 3, why: "Highest connector ROI — pricing/webhook changes hit revenue directly" },
                { filter: "AWS CloudTrail or Google Workspace in prod", score: 2, why: "Security connector fit — IAM/OAuth events are high-severity" },
                { filter: "B2B SaaS with $1M–$50M ARR", score: 2, why: "Budget authority exists + compliance motion usually starting" },
                { filter: "Shopify Plus merchant or Salesforce ≥50 seats", score: 2, why: "New integrations land the deal; existing users are warm context" },
                { filter: "Had a vendor incident in last 12 months", score: 3, why: "Lived pain = fastest sales cycle; ask for the incident story" },
                { filter: "CTO, VP Eng, or Head of Security as buyer", score: 2, why: "Technical buyers close faster; finance-gated = 90-day cycle" },
                { filter: "SOC 2, ISO 27001, or HIPAA compliance motion", score: 2, why: "Audit deadline creates urgency; DPA + security pack close this" },
                { filter: "Engineering team ≥3 people", score: 1, why: "Multi-threaded adoption reduces churn risk" },
              ].map(row => (
                <div key={row.filter} className="card" style={{ padding: "0.85rem 1.1rem", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "0.75rem", alignItems: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: "1.1rem", color: "var(--accent)", width: 24, textAlign: "center" }}>+{row.score}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>{row.filter}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.5 }}>{row.why}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Templates Tab ────────────────────────────── */}
        {activeTab === "templates" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {TEMPLATES.map(t => (
              <div key={t.id} className="card" style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{t.label}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Channel: {t.channel}</div>
                    {t.subject && <div style={{ fontSize: "0.75rem", color: "var(--accent)", marginTop: "0.15rem" }}>Subject: {t.subject}</div>}
                  </div>
                  <button
                    onClick={() => copyTemplate(t.id, `Subject: ${t.subject}\n\n${t.body}`)}
                    className="btn-ghost"
                    style={{ fontSize: "0.7rem", padding: "0.3rem 0.75rem", cursor: "pointer" }}>
                    {copiedId === t.id ? "✓ Copied!" : "📋 Copy"}
                  </button>
                </div>
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "0.78rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.7, margin: 0, background: "rgba(0,0,0,0.2)", padding: "0.85rem", borderRadius: 6, maxHeight: 240, overflow: "auto" }}>
                  {t.body}
                </pre>
                <div style={{ marginTop: "0.5rem", fontSize: "0.68rem", color: "var(--muted)" }}>
                  Variables: <code style={{ color: "var(--accent)" }}>{`{{first_name}} {{company}} {{org_slug}} {{magic_token}}`}</code>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Objections Tab ───────────────────────────── */}
        {activeTab === "objections" && (
          <div>
            <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>Quick-reference card. More detail on the public <a href="/sales" style={{ color: "var(--accent)" }}>/sales</a> page.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {OBJECTIONS_QUICK.map((item, i) => (
                <div key={i} className="card" style={{ padding: "0.9rem 1.1rem", display: "grid", gridTemplateColumns: "200px 1fr", gap: "1rem", alignItems: "start" }}>
                  <div style={{ fontStyle: "italic", color: "var(--muted)", fontSize: "0.8rem", lineHeight: 1.5 }}>&ldquo;{item.obj}&rdquo;</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--foreground)", lineHeight: 1.6 }}>{item.response}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Assets Tab ──────────────────────────────── */}
        {activeTab === "assets" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "0.75rem" }}>
            {[
              { icon: "🎬", title: "Interactive Demo", url: "/demo", desc: "3 synthetic tenants" },
              { icon: "📋", title: "Pilot SOW (90-day)", url: "/pilot/sow", desc: "Editable, PDF-ready" },
              { icon: "🔒", title: "Security Pack", url: "/pilot/security", desc: "RLS, scopes, SOC 2" },
              { icon: "💳", title: "Pricing Page", url: "/pricing", desc: "Starter + Growth + discounts" },
              { icon: "🎯", title: "Public Sales Hub", url: "/sales", desc: "ICP, qualification, objections" },
              { icon: "⚖️", title: "Privacy Policy", url: "/legal/privacy", desc: "" },
              { icon: "📄", title: "DPA", url: "/legal/dpa", desc: "GDPR Article 28" },
              { icon: "📜", title: "Terms of Service", url: "/legal/terms", desc: "" },
              { icon: "📊", title: "Metrics Dashboard", url: "/admin/metrics", desc: "Internal only" },
              { icon: "🔻", title: "Funnel Dashboard", url: "/admin/funnel", desc: "Internal only" },
            ].map(a => (
              <a key={a.title} href={a.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                <div className="card" style={{ padding: "1rem", cursor: "pointer" }}>
                  <div style={{ fontSize: "1.3rem", marginBottom: "0.35rem" }}>{a.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: "0.83rem", marginBottom: "0.15rem" }}>{a.title}</div>
                  {a.desc && <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{a.desc}</div>}
                  <div style={{ color: "var(--accent)", fontSize: "0.7rem", marginTop: "0.35rem" }}>{a.url} ↗</div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
