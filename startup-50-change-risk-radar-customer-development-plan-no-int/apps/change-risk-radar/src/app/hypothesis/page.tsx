import { HYPOTHESIS_GRID } from "@/lib/hypothesis";

export const metadata = {
  title: "Hypothesis Grid – Change Risk Radar",
  description: "Customer discovery hypothesis grid: ICPs, problems, value propositions, channels, and pricing hypotheses.",
};

export default function HypothesisPage() {
  const { icps, problems, values, channels, pricing } = HYPOTHESIS_GRID;

  return (
    <div style={{ padding: "3rem 0" }}>
      <div className="container">
        <div style={{ marginBottom: "2.5rem" }}>
          <div className="tag" style={{ marginBottom: "1rem" }}>Phase 1 — Customer Discovery</div>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "0.75rem" }}>Hypothesis Grid</h1>
          <p style={{ color: "var(--muted)", maxWidth: 600, fontSize: "1.1rem" }}>
            Our working assumptions across ICPs, problems, value propositions, go-to-market channels, and pricing.
            Updated as we learn from customer conversations.
          </p>
          <div style={{ display: "inline-flex", gap: "0.5rem", marginTop: "1rem", padding: "0.5rem 1rem", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "8px", fontSize: "0.875rem", color: "#10b981" }}>
            📅 Last updated: January 2025 · Version 0.1
          </div>
        </div>

        {/* ICPs */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
            🎯 Ideal Customer Profiles (ICPs)
          </h2>
          <div className="grid-3">
            {icps.map((icp) => (
              <div key={icp.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>{icp.icon}</span>
                  <span className={`badge ${icp.priority === "primary" ? "badge-high" : icp.priority === "secondary" ? "badge-medium" : "badge-low"}`}>
                    {icp.priority}
                  </span>
                </div>
                <h3 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>{icp.name}</h3>
                <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>{icp.description}</p>
                <div style={{ marginBottom: "0.75rem" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.4rem", fontWeight: 600 }}>KEY TOOLS</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                    {icp.keyTools.map(t => <span key={t} className="tag">{t}</span>)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.4rem", fontWeight: 600 }}>PAIN POINTS</div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {icp.painPoints.map(p => (
                      <li key={p} style={{ fontSize: "0.8rem", color: "var(--muted)", padding: "0.2rem 0", borderBottom: "1px solid var(--border)", display: "flex", gap: "0.4rem" }}>
                        <span>•</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Problems */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
            ❗ Problem Hypotheses
          </h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Problem Statement</th>
                  <th>Evidence</th>
                  <th>Severity</th>
                  <th>Validation Status</th>
                </tr>
              </thead>
              <tbody>
                {problems.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500, maxWidth: 320 }}>{p.statement}</td>
                    <td style={{ color: "var(--muted)", fontSize: "0.85rem", maxWidth: 280 }}>{p.evidence}</td>
                    <td>
                      <span className={`badge badge-${p.severity === "critical" || p.severity === "high" ? "high" : p.severity === "medium" ? "medium" : "low"}`}>
                        {p.severity}
                      </span>
                    </td>
                    <td>
                      <span className="tag">{p.validationStatus}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Value Props */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
            💎 Value Proposition Hypotheses
          </h2>
          <div className="grid-2">
            {values.map(v => (
              <div key={v.id} className="card">
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>{v.icon}</span>
                  <div>
                    <h3 style={{ fontWeight: 700, marginBottom: "0.25rem" }}>{v.title}</h3>
                    <span className="tag">{v.icp}</span>
                  </div>
                </div>
                <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "0.75rem" }}>{v.description}</p>
                <div style={{ fontSize: "0.8rem" }}>
                  <span style={{ color: "var(--muted)", fontWeight: 600 }}>Confidence: </span>
                  <span style={{ color: v.confidence === "high" ? "var(--success)" : v.confidence === "medium" ? "var(--warning)" : "var(--danger)" }}>
                    {v.confidence}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Channels */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
            📣 Go-to-Market Channel Hypotheses
          </h2>
          <div className="grid-3">
            {channels.map(c => (
              <div key={c.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>{c.icon}</span>
                  <span className={`badge ${c.priority === "primary" ? "badge-high" : c.priority === "secondary" ? "badge-medium" : "badge-low"}`}>
                    {c.priority}
                  </span>
                </div>
                <h3 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>{c.name}</h3>
                <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{c.description}</p>
                <div style={{ fontSize: "0.8rem", display: "flex", gap: "1rem" }}>
                  <span><span style={{ color: "var(--muted)" }}>Cost: </span>{c.cost}</span>
                  <span><span style={{ color: "var(--muted)" }}>Time: </span>{c.timeToResults}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
            💰 Pricing Hypotheses
          </h2>
          <div className="grid-3">
            {pricing.map(p => (
              <div key={p.tier} className="card" style={{ border: p.tier === "Growth" ? "1px solid var(--accent)" : undefined }}>
                <h3 style={{ fontWeight: 700, marginBottom: "0.25rem" }}>{p.tier}</h3>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent-light)", marginBottom: "0.25rem" }}>
                  {p.price}
                  <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--muted)" }}>{p.period}</span>
                </div>
                <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>{p.hypothesis}</p>
                <div style={{ fontSize: "0.8rem" }}>
                  <div style={{ marginBottom: "0.25rem" }}><span style={{ color: "var(--muted)" }}>ICP: </span>{p.icp}</div>
                  <div style={{ marginBottom: "0.25rem" }}><span style={{ color: "var(--muted)" }}>WTP Signal: </span>{p.wtpSignal}</div>
                  <div><span style={{ color: "var(--muted)" }}>Status: </span><span className="tag">{p.status}</span></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
