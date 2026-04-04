import { RISK_TAXONOMY, DETECTION_METHODS, CATEGORY_META } from "@/lib/taxonomy";

export const metadata = {
  title: "Risk Taxonomy v0 — Change Risk Radar",
  description: "35 concrete vendor change event types with detection methods, impact, and vendor coverage.",
};

const CATEGORIES = ["all", "pricing", "legal", "operational", "security", "vendor_risk"];

export default function TaxonomyPage() {
  const byCategory = CATEGORIES.slice(1).map(cat => ({
    cat,
    meta: CATEGORY_META[cat],
    events: RISK_TAXONOMY.filter(e => e.category === cat),
  }));

  const detectionCounts = Object.entries(DETECTION_METHODS).map(([key, method]) => ({
    key,
    method,
    count: RISK_TAXONOMY.filter(e => e.detectionMethod === key).length,
  }));

  return (
    <div style={{ padding: "3rem 0" }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div className="tag" style={{ marginBottom: "1rem" }}>Version 0.1 — January 2025</div>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "0.75rem" }}>Risk Taxonomy v0</h1>
          <p style={{ color: "var(--muted)", maxWidth: 680, fontSize: "1.1rem" }}>
            {RISK_TAXONOMY.length} concrete vendor change event types, each mapped to a detection method,
            risk level, impacted roles, and example vendors. This is our living catalog—updated as we discover
            new risk patterns in the observatory.
          </p>
        </div>

        {/* Summary Stats */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "3rem" }}>
          <div className="card" style={{ textAlign: "center", minWidth: 130 }}>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent-light)" }}>{RISK_TAXONOMY.length}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Event Types</div>
          </div>
          <div className="card" style={{ textAlign: "center", minWidth: 130 }}>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#ef4444" }}>
              {RISK_TAXONOMY.filter(e => e.riskLevel === "high").length}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>High Risk</div>
          </div>
          <div className="card" style={{ textAlign: "center", minWidth: 130 }}>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--success)" }}>{Object.keys(DETECTION_METHODS).length}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Detection Methods</div>
          </div>
          <div className="card" style={{ textAlign: "center", minWidth: 130 }}>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--warning)" }}>{CATEGORIES.length - 1}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Risk Categories</div>
          </div>
        </div>

        {/* Detection Methods */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>🔍 Detection Methods</h2>
          <div className="grid-3">
            {detectionCounts.map(({ key, method, count }) => (
              <div key={key} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>{method.icon}</span>
                  <span className="badge badge-medium">{count} events</span>
                </div>
                <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", fontSize: "0.95rem" }}>{method.label}</h3>
                <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{method.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Events by Category */}
        {byCategory.map(({ cat, meta, events }) => (
          <section key={cat} style={{ marginBottom: "3rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "1.5rem" }}>{meta.icon}</span>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700 }}>{meta.label}</h2>
              <span style={{ marginLeft: "auto", fontSize: "0.875rem", color: "var(--muted)" }}>
                {events.length} event type{events.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {events.map(event => (
                <div key={event.id} className="card">
                  <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 400px" }}>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                        <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: "0.7rem", color: "var(--muted)", background: "rgba(99,102,241,0.08)", padding: "0.1rem 0.4rem", borderRadius: "3px" }}>
                          {event.id}
                        </span>
                        <span className={`badge badge-${event.riskLevel === "high" ? "high" : event.riskLevel === "medium" ? "medium" : "low"}`}>
                          {event.riskLevel}
                        </span>
                        <span className="tag">{DETECTION_METHODS[event.detectionMethod].icon} {DETECTION_METHODS[event.detectionMethod].label}</span>
                      </div>
                      <h3 style={{ fontWeight: 700, marginBottom: "0.4rem" }}>{event.title}</h3>
                      <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "0.75rem" }}>{event.description}</p>
                      
                      <div style={{ marginBottom: "0.6rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)" }}>EXAMPLES: </span>
                        {event.examples.map((ex, i) => (
                          <span key={i} style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                            {i > 0 ? " · " : ""}{ex}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ flex: "0 0 220px", fontSize: "0.8rem" }}>
                      <div style={{ marginBottom: "0.5rem" }}>
                        <div style={{ color: "var(--muted)", fontSize: "0.7rem", fontWeight: 600, marginBottom: "0.3rem" }}>IMPACTED ROLES</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.2rem" }}>
                          {event.impactedRoles.map(r => <span key={r} className="tag">{r}</span>)}
                        </div>
                      </div>
                      <div style={{ marginBottom: "0.5rem" }}>
                        <div style={{ color: "var(--muted)", fontSize: "0.7rem", fontWeight: 600, marginBottom: "0.3rem" }}>TYPICAL NOTICE</div>
                        <div style={{ color: "var(--foreground)" }}>{event.typicalLeadTime}</div>
                      </div>
                      <div>
                        <div style={{ color: "var(--muted)", fontSize: "0.7rem", fontWeight: 600, marginBottom: "0.3rem" }}>EXAMPLE VENDORS</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.2rem" }}>
                          {event.vendors.slice(0, 4).map(v => <span key={v} className="tag">{v}</span>)}
                          {event.vendors.length > 4 && <span className="tag">+{event.vendors.length - 4}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
