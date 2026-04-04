import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stats — Change Risk Radar" };

export default async function StatsPage() {
  const [
    waitlistRes,
    depositsRes,
    abEventsRes,
    diffsRes,
  ] = await Promise.all([
    supabaseAdmin.from("crr_waitlist").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("crr_deposits").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("crr_ab_events").select("event, variant, created_at").order("created_at", { ascending: false }).limit(2000),
    supabaseAdmin.from("crr_diffs").select("vendor_slug, risk_level, risk_category, collected_at").order("collected_at", { ascending: false }).limit(100),
  ]);

  const waitlist = waitlistRes.data ?? [];
  const deposits = depositsRes.data ?? [];
  const abEvents = abEventsRes.data ?? [];
  const recentDiffs = diffsRes.data ?? [];

  // A/B analysis
  const abSummary: Record<string, Record<string, number>> = { A: {}, B: {} };
  for (const e of abEvents) {
    const v = e.variant as "A" | "B";
    if (!abSummary[v]) abSummary[v] = {};
    abSummary[v][e.event] = (abSummary[v][e.event] || 0) + 1;
  }

  const abResults: Record<string, { views: number; signups: number; deposits: number; signupCVR: string; depositCVR: string }> = {};
  for (const v of ["A", "B"]) {
    const d = abSummary[v] || {};
    const views = d.pageview || 0;
    const sigs = d.waitlist_signup || 0;
    const deps = (d.deposit_intent || 0) + (d.deposit_started || 0) + (d.deposit_completed || 0);
    abResults[v] = {
      views, signups: sigs, deposits: deps,
      signupCVR: views > 0 ? `${((sigs / views) * 100).toFixed(1)}%` : "—",
      depositCVR: sigs > 0 ? `${((deps / sigs) * 100).toFixed(1)}%` : "—",
    };
  }

  // Observatory stats
  const vendorCounts: Record<string, number> = {};
  const riskCounts: Record<string, number> = {};
  for (const d of recentDiffs) {
    vendorCounts[d.vendor_slug] = (vendorCounts[d.vendor_slug] || 0) + 1;
    riskCounts[d.risk_level] = (riskCounts[d.risk_level] || 0) + 1;
  }

  return (
    <div style={{ padding: "3rem 0" }}>
      <div className="container">
        <div style={{ marginBottom: "2rem" }}>
          <div className="tag" style={{ marginBottom: "0.5rem" }}>Internal · Live Dashboard</div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>Change Risk Radar — Stats</h1>
          <p style={{ color: "var(--muted)" }}>Real-time customer discovery metrics</p>
        </div>

        {/* Key metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { label: "Waitlist", value: waitlist.length, icon: "🎯", color: "var(--accent-light)", target: "50" },
            { label: "Deposits", value: deposits.length, icon: "💎", color: "var(--success)", target: "10" },
            { label: "CVR (W→D)", value: waitlist.length > 0 ? `${((deposits.length / waitlist.length) * 100).toFixed(1)}%` : "—", icon: "📊", color: "var(--warning)", target: "15%" },
            { label: "Diffs (total)", value: "314+", icon: "📡", color: "var(--muted)", target: "300+" },
            { label: "A/B pageviews", value: abEvents.filter(e => e.event === "pageview").length, icon: "🧪", color: "#8b5cf6", target: "150/wk" },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: "center", padding: "1.25rem" }}>
              <div style={{ fontSize: "1.25rem" }}>{s.icon}</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase" }}>{s.label}</div>
              <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.2)" }}>target: {s.target}</div>
            </div>
          ))}
        </div>

        {/* A/B Test Results */}
        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem" }}>🧪 A/B Pricing Test</h2>
          <div className="grid-2" style={{ maxWidth: 700 }}>
            {["A", "B"].map(v => {
              const r = abResults[v];
              const isWinner = r.signups > abResults[v === "A" ? "B" : "A"].signups;
              return (
                <div key={v} className="card" style={{ borderColor: isWinner && (r.signups > 0) ? "var(--success)" : undefined }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Variant {v}</span>
                      <span className="tag" style={{ marginLeft: "0.5rem" }}>{v === "A" ? "Control ($99/$299)" : "Premium ($149/$399)"}</span>
                    </div>
                    {isWinner && r.signups > 0 && <span style={{ fontSize: "0.75rem", color: "var(--success)" }}>🏆 Leading</span>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                    {[
                      { l: "Pageviews", v: r.views },
                      { l: "Signups", v: r.signups },
                      { l: "Deposits", v: r.deposits },
                      { l: "Signup CVR", v: r.signupCVR },
                      { l: "Deposit CVR", v: r.depositCVR },
                    ].map(item => (
                      <div key={item.l} style={{ textAlign: "center", background: "rgba(0,0,0,0.2)", borderRadius: "6px", padding: "0.5rem" }}>
                        <div style={{ fontWeight: 700, fontSize: "1rem" }}>{item.v}</div>
                        <div style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase" }}>{item.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: "0.75rem" }}>
            Statistical significance requires ~100+ pageviews per variant for reliable results.
          </p>
        </section>

        {/* Waitlist Signups */}
        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem" }}>🎯 Waitlist Signups ({waitlist.length})</h2>
          {waitlist.length === 0 ? (
            <div className="card" style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>No signups yet — go drive some traffic!</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {waitlist.map((w: { email: string; company?: string; role?: string; top_tool?: string; created_at?: string }) => (
                <div key={w.email} className="card" style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", padding: "0.75rem 1rem" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{w.email}</span>
                  {w.company && <span className="tag">{w.company}</span>}
                  {w.role && <span className="tag">{w.role}</span>}
                  {w.top_tool && <span style={{ color: "var(--muted)", fontSize: "0.8rem", flex: 1 }}>"{w.top_tool.slice(0, 60)}"</span>}
                  <span style={{ fontSize: "0.7rem", color: "var(--muted)", marginLeft: "auto" }}>
                    {w.created_at ? new Date(w.created_at).toLocaleDateString() : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Deposits */}
        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem" }}>💎 Deposits ({deposits.length})</h2>
          {deposits.length === 0 ? (
            <div className="card" style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>
              No deposits yet. Once Stripe is configured, deposits will appear here.
              <br />
              <small style={{ marginTop: "0.5rem", display: "block" }}>To enable: add STRIPE_SECRET_KEY + STRIPE_PRICE_ID to Vercel project prj_9sUUZ75m7dAJhAZTK1hCaVHEC4Gt</small>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {deposits.map((d: { email: string; status?: string; amount_cents?: number; created_at?: string }) => (
                <div key={d.email} className="card" style={{ display: "flex", gap: "1rem", alignItems: "center", padding: "0.75rem 1rem" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{d.email}</span>
                  <span className={`badge badge-${d.status === "completed" ? "low" : d.status === "pending" ? "medium" : "high"}`}>{d.status}</span>
                  <span className="tag">${((d.amount_cents ?? 10000) / 100).toFixed(0)}</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--muted)", marginLeft: "auto" }}>
                    {d.created_at ? new Date(d.created_at).toLocaleDateString() : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Observatory */}
        <section>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem" }}>📡 Observatory (last 100 diffs)</h2>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {Object.entries(riskCounts).map(([level, count]) => (
              <div key={level} className="card" style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{count}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{level} risk</div>
              </div>
            ))}
          </div>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
            <a href="/observatory" style={{ color: "var(--accent-light)" }}>View full observatory →</a>
          </p>
        </section>
      </div>
    </div>
  );
}
