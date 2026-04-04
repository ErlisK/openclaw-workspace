import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Metrics — Change Risk Radar" };

// Mini sparkline using block characters
function sparkline(values: number[]): string {
  if (!values.length) return "—";
  const max = Math.max(...values, 1);
  const chars = " ▁▂▃▄▅▆▇█";
  return values.map(v => chars[Math.min(Math.floor((v / max) * (chars.length - 1)), chars.length - 1)]).join("");
}

// Progress bar
function Progress({ value, max, color = "var(--accent)" }: { value: number; max: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden", marginTop: 4 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width 0.4s" }} />
    </div>
  );
}

function MetricCard({ label, value, target, subtext, color = "var(--accent-light)", met }: {
  label: string; value: string | number; target?: string | number; subtext?: string; color?: string; met?: boolean;
}) {
  return (
    <div className="card" style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <span style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
        {met !== undefined && (
          <span style={{ fontSize: "0.7rem", color: met ? "var(--success)" : "var(--muted)" }}>{met ? "✓ met" : `target: ${target}`}</span>
        )}
      </div>
      <div style={{ fontSize: "1.75rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {subtext && <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 4 }}>{subtext}</div>}
      {target !== undefined && typeof value === "number" && typeof target === "number" && (
        <Progress value={value} max={target} color={met ? "var(--success)" : color} />
      )}
    </div>
  );
}

export default async function StatsPage() {
  const now = new Date();
  const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const day14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const day1 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [
    visitorsAllRes,
    visitors7dRes,
    visitors1dRes,
    waitlistRes,
    depositsRes,
    abEventsRes,
    diffsRes,
    diffs7dRes,
    diffs1dRes,
    obsRunsRes,
    vendorsRes,
  ] = await Promise.all([
    supabaseAdmin.from("crr_visitors").select("session_id, path, variant, country, created_at"),
    supabaseAdmin.from("crr_visitors").select("session_id, path, variant, country, created_at").gte("created_at", day7),
    supabaseAdmin.from("crr_visitors").select("session_id, path, created_at").gte("created_at", day1),
    supabaseAdmin.from("crr_waitlist").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("crr_deposits").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("crr_ab_events").select("event, variant, email, created_at").order("created_at", { ascending: false }).limit(2000),
    supabaseAdmin.from("crr_diffs").select("id, vendor_slug, risk_level, risk_category, collected_at").order("collected_at", { ascending: false }),
    supabaseAdmin.from("crr_diffs").select("id, vendor_slug, risk_level, risk_category, collected_at").gte("collected_at", day7),
    supabaseAdmin.from("crr_diffs").select("id, vendor_slug, risk_level, collected_at").gte("collected_at", day1),
    supabaseAdmin.from("crr_observatory_runs").select("*").order("run_at", { ascending: false }).limit(15),
    supabaseAdmin.from("crr_vendors").select("slug, name, category"),
  ]);

  const visitors = visitorsAllRes.data ?? [];
  const visitors7d = visitors7dRes.data ?? [];
  const visitors1d = visitors1dRes.data ?? [];
  const waitlist = waitlistRes.data ?? [];
  const deposits = depositsRes.data ?? [];
  const abEvents = abEventsRes.data ?? [];
  const diffs = diffsRes.data ?? [];
  const diffs7d = diffs7dRes.data ?? [];
  const diffs1d = diffs1dRes.data ?? [];
  const obsRuns = obsRunsRes.data ?? [];

  // Unique sessions
  const uniqueSessions = (arr: { session_id: string }[]) => new Set(arr.map(v => v.session_id)).size;
  const uvAll = uniqueSessions(visitors);
  const uv7d = uniqueSessions(visitors7d);
  const uv1d = uniqueSessions(visitors1d);

  // Funnel
  const completedDeposits = deposits.filter(d => ["completed", "intent"].includes(d.status)).length;
  const w2d = waitlist.length > 0 ? ((deposits.length / waitlist.length) * 100).toFixed(1) : "0";

  // A/B funnel
  const abFunnel = (v: string) => {
    const ve = abEvents.filter(e => e.variant === v);
    const cnt = (ev: string) => ve.filter(e => e.event === ev).length;
    const views = cnt("pageview");
    const sigs = cnt("waitlist_signup");
    const deps = cnt("deposit_intent") + cnt("deposit_started") + cnt("deposit_completed");
    return { views, sigs, deps,
      sigRate: views > 0 ? ((sigs / views) * 100).toFixed(1) + "%" : "—",
      depRate: sigs > 0 ? ((deps / sigs) * 100).toFixed(1) + "%" : "—",
    };
  };
  const ab = { A: abFunnel("A"), B: abFunnel("B") };

  // Path breakdown
  const pathCounts: Record<string, number> = {};
  for (const v of visitors7d) pathCounts[v.path] = (pathCounts[v.path] || 0) + 1;
  const topPaths = Object.entries(pathCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Country breakdown
  const countries: Record<string, number> = {};
  for (const v of visitors7d) countries[v.country || "Unknown"] = (countries[v.country || "Unknown"] || 0) + 1;
  const topCountries = Object.entries(countries).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Diffs by day sparkline (last 14 days)
  const diffsByDay: Record<string, number> = {};
  for (const d of diffs) {
    const day = d.collected_at?.slice(0, 10) ?? "";
    if (day >= day14.slice(0, 10)) diffsByDay[day] = (diffsByDay[day] || 0) + 1;
  }
  const last14Days: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
    last14Days.push(diffsByDay[d] || 0);
  }

  // Visitors by day (last 7)
  const visitorsByDay: Record<string, Set<string>> = {};
  for (const v of visitors) {
    const day = v.created_at?.slice(0, 10) ?? "";
    if (!visitorsByDay[day]) visitorsByDay[day] = new Set();
    visitorsByDay[day].add(v.session_id);
  }
  const last7DaysVisitors: number[] = [];
  const last7DayLabels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dStr = d.toISOString().slice(0, 10);
    last7DayLabels.push(d.toLocaleDateString("en-US", { weekday: "short" }));
    last7DaysVisitors.push(visitorsByDay[dStr]?.size ?? 0);
  }

  // Risk breakdown for 7d diffs
  const riskCounts7d: Record<string, number> = {};
  const catCounts7d: Record<string, number> = {};
  for (const d of diffs7d) {
    riskCounts7d[d.risk_level] = (riskCounts7d[d.risk_level] || 0) + 1;
    catCounts7d[d.risk_category] = (catCounts7d[d.risk_category] || 0) + 1;
  }

  // Vendor coverage 7d
  const activeVendors7d = new Set(diffs7d.map(d => d.vendor_slug));

  const RISK_COLORS: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#10b981" };
  const CAT_ICONS: Record<string, string> = { pricing: "💰", legal: "⚖️", operational: "🔧", security: "🔒", vendor_risk: "🏢" };

  return (
    <div style={{ padding: "2.5rem 0" }}>
      <div className="container">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div className="tag" style={{ marginBottom: "0.5rem" }}>Internal · Live Metrics</div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0 }}>Change Risk Radar — Metrics</h1>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              Updated: {now.toLocaleString()} · All data from Supabase
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <a href="/api/metrics" target="_blank" className="btn-ghost" style={{ padding: "0.5rem 0.9rem", fontSize: "0.8rem" }}>JSON API</a>
            <Link href="/observatory" className="btn-ghost" style={{ padding: "0.5rem 0.9rem", fontSize: "0.8rem" }}>Observatory</Link>
          </div>
        </div>

        {/* SUCCESS CRITERIA OVERVIEW */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>📊 Success Criteria</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem" }}>
            <MetricCard label="Weekly Visitors" value={uv7d} target={150} subtext={`${uv1d} today, ${uvAll} all-time`} met={uv7d >= 150} />
            <MetricCard label="Waitlist Signups" value={waitlist.length} target={50} subtext={`+${waitlist.filter(w => w.created_at >= day7).length} this week`} met={waitlist.length >= 50} />
            <MetricCard label="Deposits" value={completedDeposits} target={10} subtext={`${deposits.filter(d => d.status === "pending").length} pending`} color="#10b981" met={completedDeposits >= 10} />
            <MetricCard label="W→D Conversion" value={`${w2d}%`} target="15%" subtext={`${waitlist.length} → ${deposits.length}`} color="var(--warning)" met={parseFloat(w2d) >= 15} />
            <MetricCard label="Diffs / Week" value={diffs7d.length} target={150} subtext={`${diffs1d.length} today`} met={diffs7d.length >= 150} />
            <MetricCard label="Total Diffs" value={diffs.length} target={300} met={diffs.length >= 300} />
          </div>
        </section>

        {/* VISITOR ANALYTICS */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>👥 Visitor Analytics</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>

            {/* Visitors by day sparkline */}
            <div className="card" style={{ gridColumn: "1 / -1", padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Unique Visitors — Last 7 Days</span>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{uv7d} unique sessions</span>
              </div>
              {/* ASCII chart */}
              <div style={{ display: "flex", gap: "0.25rem", alignItems: "flex-end", height: "60px", padding: "0 0.25rem" }}>
                {last7DaysVisitors.map((count, i) => {
                  const maxV = Math.max(...last7DaysVisitors, 1);
                  const pct = (count / maxV) * 100;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                      <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{count || ""}</span>
                      <div style={{ width: "100%", height: `${Math.max(pct, 5)}%`, background: count > 0 ? "var(--accent)" : "rgba(99,102,241,0.15)", borderRadius: "3px 3px 0 0", minHeight: "4px" }}></div>
                      <span style={{ fontSize: "0.6rem", color: "var(--muted)" }}>{last7DayLabels[i]}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: "0.75rem", fontSize: "0.72rem", color: "var(--muted)" }}>
                Sparkline: {sparkline(last7DaysVisitors)} · Tracking via session_id in sessionStorage
              </div>
            </div>

            {/* Top pages */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.75rem" }}>📄 Top Pages (7d)</div>
              {topPaths.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>No data yet</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {topPaths.map(([path, count]) => (
                    <div key={path} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                      <span style={{ color: "var(--muted)", fontFamily: "monospace" }}>{path || "/"}</span>
                      <span style={{ fontWeight: 600 }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Countries */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.75rem" }}>🌍 Countries (7d)</div>
              {topCountries.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>No data yet</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {topCountries.map(([country, count]) => (
                    <div key={country} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                      <span style={{ color: "var(--muted)" }}>{country}</span>
                      <span style={{ fontWeight: 600 }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Variant split */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.75rem" }}>🧪 A/B Split (7d)</div>
              {visitors7d.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>No data yet</p>
              ) : (
                <>
                  {["A", "B"].map(v => {
                    const count = visitors7d.filter(vis => vis.variant === v).length;
                    const pct = visitors7d.length > 0 ? ((count / visitors7d.length) * 100).toFixed(0) : 0;
                    return (
                      <div key={v} style={{ marginBottom: "0.5rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "2px" }}>
                          <span>Variant {v} ({v === "A" ? "$99" : "$149"})</span>
                          <span style={{ fontWeight: 600 }}>{count} ({pct}%)</span>
                        </div>
                        <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 999 }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: v === "A" ? "var(--accent)" : "#8b5cf6", borderRadius: 999 }} />
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </section>

        {/* CONVERSION FUNNEL */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>🎯 Conversion Funnel</h2>
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", gap: "0", alignItems: "stretch", flexWrap: "wrap" }}>
              {[
                { label: "Unique Visitors", value: uvAll, sublabel: "all time", color: "var(--muted)", pct: 100 },
                { label: "Waitlist", value: waitlist.length, sublabel: `${uvAll > 0 ? ((waitlist.length / uvAll) * 100).toFixed(1) : 0}% of visitors`, color: "var(--accent-light)", pct: uvAll > 0 ? (waitlist.length / uvAll) * 100 : 0 },
                { label: "Deposit Intent", value: deposits.length, sublabel: `${waitlist.length > 0 ? ((deposits.length / waitlist.length) * 100).toFixed(1) : 0}% of waitlist`, color: "var(--warning)", pct: waitlist.length > 0 ? (deposits.length / waitlist.length) * 100 : 0 },
                { label: "Converted", value: completedDeposits, sublabel: `${deposits.length > 0 ? ((completedDeposits / deposits.length) * 100).toFixed(0) : 0}% of intents`, color: "var(--success)", pct: deposits.length > 0 ? (completedDeposits / deposits.length) * 100 : 0 },
              ].map((step, i, arr) => (
                <div key={step.label} style={{ display: "flex", flex: 1, minWidth: 120, alignItems: "center" }}>
                  <div style={{ flex: 1, textAlign: "center", padding: "0.75rem" }}>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: step.color }}>{step.value}</div>
                    <div style={{ fontWeight: 700, fontSize: "0.825rem", marginBottom: "0.2rem" }}>{step.label}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{step.sublabel}</div>
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ color: "var(--muted)", fontSize: "1.25rem", flexShrink: 0, padding: "0 0.25rem" }}>→</div>
                  )}
                </div>
              ))}
            </div>
            {/* Goal progress */}
            <div style={{ borderTop: "1px solid var(--border)", marginTop: "1.25rem", paddingTop: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
              {[
                { label: "Visitors → target 150/wk", value: uv7d, max: 150, color: "var(--accent)" },
                { label: "Signups → target 50", value: waitlist.length, max: 50, color: "var(--accent-light)" },
                { label: "Deposits → target 10", value: completedDeposits, max: 10, color: "var(--success)" },
              ].map(g => (
                <div key={g.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--muted)", marginBottom: "3px" }}>
                    <span>{g.label}</span>
                    <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{g.value}/{g.max}</span>
                  </div>
                  <Progress value={g.value} max={g.max} color={g.color} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* A/B TEST RESULTS */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>🧪 A/B Pricing Test</h2>
          <div className="grid-2" style={{ maxWidth: 800 }}>
            {["A", "B"].map(v => {
              const r = ab[v as "A" | "B"];
              const other = ab[v === "A" ? "B" : "A"];
              const isLeading = r.sigs > other.sigs && r.sigs > 0;
              return (
                <div key={v} className="card" style={{ borderColor: isLeading ? "var(--success)" : undefined }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <div>
                      <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>Variant {v}</span>
                      <span className="tag" style={{ marginLeft: "0.5rem", fontSize: "0.7rem" }}>
                        {v === "A" ? "Control · $99/mo" : "Premium · $149/mo"}
                      </span>
                    </div>
                    {isLeading && <span style={{ fontSize: "0.72rem", color: "var(--success)", fontWeight: 700 }}>🏆 Leading</span>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", textAlign: "center" }}>
                    {[
                      { l: "Page Views", v: r.views },
                      { l: "Signups", v: r.sigs },
                      { l: "Deposits", v: r.deps },
                      { l: "Signup CVR", v: r.sigRate },
                      { l: "Deposit CVR", v: r.depRate },
                    ].map(item => (
                      <div key={item.l} style={{ background: "rgba(0,0,0,0.2)", borderRadius: "6px", padding: "0.6rem 0.4rem" }}>
                        <div style={{ fontWeight: 700, fontSize: "1rem" }}>{item.v}</div>
                        <div style={{ fontSize: "0.6rem", color: "var(--muted)", textTransform: "uppercase" }}>{item.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ color: "var(--muted)", fontSize: "0.72rem", marginTop: "0.5rem" }}>
            Need ~100 pageviews per variant for statistical significance (95% CI).
            Tracking via <code style={{ fontSize: "0.7rem" }}>crr_ab_events</code> + visitor fingerprint.
          </p>
        </section>

        {/* OBSERVATORY METRICS */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>📡 Observatory</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <MetricCard label="Total Diffs" value={diffs.length} target={300} met={diffs.length >= 300} color="var(--accent-light)" />
            <MetricCard label="Diffs / 7d" value={diffs7d.length} target={150} met={diffs7d.length >= 150} subtext={`${diffs1d.length} today`} />
            <MetricCard label="Unique Vendors" value={new Set(diffs.map(d => d.vendor_slug)).size} target={25} met={new Set(diffs.map(d => d.vendor_slug)).size >= 25} />
            <MetricCard label="Active (7d)" value={activeVendors7d.size} subtext="vendors w/ diffs" />
            <MetricCard label="Cron Runs" value={obsRuns.length} subtext="logged in DB" color="var(--muted)" />
          </div>

          {/* Diffs by day chart */}
          <div className="card" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
            <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.75rem" }}>
              Diffs Collected — Last 14 Days
              <span style={{ marginLeft: "0.75rem", fontSize: "0.72rem", color: "var(--muted)", fontWeight: 400 }}>
                {sparkline(last14Days)} ({last14Days.reduce((a, b) => a + b, 0)} total)
              </span>
            </div>
            <div style={{ display: "flex", gap: "2px", alignItems: "flex-end", height: "64px" }}>
              {last14Days.map((count, i) => {
                const maxV = Math.max(...last14Days, 1);
                const pct = (count / maxV) * 100;
                const d = new Date(now.getTime() - (13 - i) * 86400000);
                const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                return (
                  <div key={i} title={`${label}: ${count} diffs`}
                    style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", cursor: "default" }}>
                    <div style={{ width: "100%", height: `${Math.max(pct, 4)}%`, background: count > 0 ? "rgba(99,102,241,0.7)" : "rgba(255,255,255,0.04)", borderRadius: "2px 2px 0 0", minHeight: "3px" }}></div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
              <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>
                {new Date(now.getTime() - 13 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>Today</span>
            </div>
          </div>

          {/* Risk breakdown */}
          <div className="grid-2" style={{ maxWidth: 700 }}>
            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.75rem" }}>Risk Levels (7d)</div>
              {Object.entries(riskCounts7d).map(([level, count]) => (
                <div key={level} style={{ marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "2px" }}>
                    <span style={{ color: RISK_COLORS[level] ?? "var(--muted)", textTransform: "capitalize" }}>{level}</span>
                    <span style={{ fontWeight: 600 }}>{count} ({diffs7d.length > 0 ? ((count / diffs7d.length) * 100).toFixed(0) : 0}%)</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 999 }}>
                    <div style={{ width: `${diffs7d.length > 0 ? (count / diffs7d.length) * 100 : 0}%`, height: "100%", background: RISK_COLORS[level] ?? "var(--muted)", borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.75rem" }}>Categories (7d)</div>
              {Object.entries(catCounts7d).map(([cat, count]) => (
                <div key={cat} style={{ marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "2px" }}>
                    <span style={{ color: "var(--muted)" }}>{CAT_ICONS[cat] ?? "📊"} {cat}</span>
                    <span style={{ fontWeight: 600 }}>{count}</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 999 }}>
                    <div style={{ width: `${diffs7d.length > 0 ? (count / diffs7d.length) * 100 : 0}%`, height: "100%", background: "var(--accent)", borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Observatory run log */}
          {obsRuns.length > 0 && (
            <div className="card" style={{ marginTop: "1.25rem", padding: "1.25rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.75rem" }}>Recent Cron Runs</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {obsRuns.slice(0, 8).map((run: { id: string; run_at: string; new_diffs: number; total_diffs: number; vendors_hit: number; duration_ms: number; error?: string }) => (
                  <div key={run.id} style={{ display: "flex", gap: "0.75rem", fontSize: "0.78rem", alignItems: "center", padding: "0.35rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ color: run.error ? "#ef4444" : "var(--success)", fontSize: "0.7rem" }}>
                      {run.error ? "✗" : "✓"}
                    </span>
                    <span style={{ color: "var(--muted)", minWidth: 120 }}>{new Date(run.run_at).toLocaleString()}</span>
                    <span style={{ color: "var(--accent-light)" }}>+{run.new_diffs ?? 0} diffs</span>
                    <span style={{ color: "var(--muted)" }}>{run.total_diffs ?? "—"} total</span>
                    <span style={{ color: "var(--muted)" }}>{run.vendors_hit ?? 0} vendors</span>
                    {run.duration_ms && <span style={{ color: "var(--muted)", marginLeft: "auto" }}>{(run.duration_ms / 1000).toFixed(1)}s</span>}
                    {run.error && <span style={{ color: "#ef4444", fontSize: "0.7rem" }}>{run.error.slice(0, 40)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* WAITLIST TABLE */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            🎯 Waitlist ({waitlist.length} / 50 target)
          </h2>
          {waitlist.length === 0 ? (
            <div className="card" style={{ color: "var(--muted)", textAlign: "center", padding: "2rem", fontSize: "0.875rem" }}>
              No signups yet.<br />
              <small>Share <strong>change-risk-radar.vercel.app</strong> to drive traffic.</small>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {waitlist.map((w: { email: string; company?: string; role?: string; top_tool?: string; created_at?: string }) => (
                <div key={w.email} className="card" style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", padding: "0.6rem 1rem" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{w.email}</span>
                  {w.company && <span className="tag" style={{ fontSize: "0.7rem" }}>{w.company}</span>}
                  {w.role && <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>{w.role}</span>}
                  {w.top_tool && <span style={{ color: "var(--muted)", fontSize: "0.75rem", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{w.top_tool}"</span>}
                  <span style={{ fontSize: "0.68rem", color: "var(--muted)", marginLeft: "auto" }}>
                    {w.created_at ? new Date(w.created_at).toLocaleDateString() : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* DEPOSITS TABLE */}
        <section>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            💎 Deposits ({completedDeposits} / 10 target)
          </h2>
          {deposits.length === 0 ? (
            <div className="card" style={{ color: "var(--muted)", textAlign: "center", padding: "2rem", fontSize: "0.875rem" }}>
              No deposits yet.<br />
              <small style={{ display: "block", marginTop: "0.5rem" }}>
                To enable real Stripe payments: add <code>STRIPE_SECRET_KEY</code> to Vercel project{" "}
                <code>prj_9sUUZ75m7dAJhAZTK1hCaVHEC4Gt</code>
              </small>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {deposits.map((d: { email: string; status?: string; amount_cents?: number; metadata?: { variant?: string }; created_at?: string }) => (
                <div key={d.email} className="card" style={{ display: "flex", gap: "0.75rem", alignItems: "center", padding: "0.6rem 1rem" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{d.email}</span>
                  <span className={`badge badge-${d.status === "completed" ? "low" : d.status === "intent" ? "medium" : "high"}`} style={{ fontSize: "0.68rem" }}>
                    {d.status}
                  </span>
                  <span className="tag" style={{ fontSize: "0.7rem" }}>${((d.amount_cents ?? 10000) / 100).toFixed(0)}</span>
                  {d.metadata?.variant && <span className="tag" style={{ fontSize: "0.7rem" }}>Variant {d.metadata.variant}</span>}
                  <span style={{ fontSize: "0.68rem", color: "var(--muted)", marginLeft: "auto" }}>
                    {d.created_at ? new Date(d.created_at).toLocaleDateString() : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
