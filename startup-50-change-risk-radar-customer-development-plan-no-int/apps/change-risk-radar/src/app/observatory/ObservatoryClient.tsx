"use client";
import { useState } from "react";

interface Diff {
  id: string;
  vendor_slug: string;
  title: string;
  description: string;
  url: string;
  risk_level: string;
  risk_category: string;
  collected_at: string;
  published_at: string | null;
  crr_vendors?: { name: string; slug: string; category: string };
}

interface Stats {
  vendors: number;
  total: number;
  weekly: number;
  configured: number;
}

const CATEGORIES = ["all", "pricing", "legal", "security", "operational"];
const RISK_LEVELS = ["all", "high", "medium", "low"];

export default function ObservatoryClient({ diffs, stats }: { diffs: Diff[]; stats: Stats }) {
  const [category, setCategory] = useState("all");
  const [riskLevel, setRiskLevel] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = diffs.filter(d => {
    if (category !== "all" && d.risk_category !== category) return false;
    if (riskLevel !== "all" && d.risk_level !== riskLevel) return false;
    if (search && !`${d.title} ${d.vendor_slug}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const riskIcon = (level: string) => level === "high" ? "🔴" : level === "medium" ? "🟡" : "🟢";

  return (
    <div>
      <section style={{ padding: "3rem 0 2rem", borderBottom: "1px solid var(--border)" }}>
        <div className="container">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <span className="live-dot"></span>
            <span style={{ color: "var(--success)", fontSize: "0.875rem", fontWeight: 600 }}>LIVE</span>
          </div>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "0.75rem" }}>
            Change Risk Observatory
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "1.1rem", marginBottom: "2rem" }}>
            Real-time monitoring of vendor changelogs, release notes, and policy pages across {stats.configured} tools.
          </p>

          {/* Stats */}
          <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
            {[
              { label: "Vendors Monitored", value: stats.configured, icon: "🏢" },
              { label: "Total Diffs Collected", value: stats.total, icon: "📊" },
              { label: "Diffs This Week", value: stats.weekly, icon: "📅" },
              { label: "Active Vendors", value: stats.vendors, icon: "✅" },
            ].map(s => (
              <div key={s.label} className="card" style={{ minWidth: 160 }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>{s.icon}</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-light)" }}>{s.value}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "2rem 0" }}>
        <div className="container">
          {/* Filters */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="text" placeholder="Search changes..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: 280 }}
            />
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  style={{
                    padding: "0.4rem 0.875rem", borderRadius: "999px", border: "1px solid",
                    borderColor: category === cat ? "var(--accent)" : "var(--border)",
                    background: category === cat ? "rgba(99,102,241,0.1)" : "transparent",
                    color: category === cat ? "var(--accent-light)" : "var(--muted)",
                    cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, textTransform: "capitalize",
                  }}
                >{cat}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {RISK_LEVELS.map(rl => (
                <button key={rl} onClick={() => setRiskLevel(rl)}
                  style={{
                    padding: "0.4rem 0.875rem", borderRadius: "999px", border: "1px solid",
                    borderColor: riskLevel === rl ? "var(--accent)" : "var(--border)",
                    background: riskLevel === rl ? "rgba(99,102,241,0.1)" : "transparent",
                    color: riskLevel === rl ? "var(--accent-light)" : "var(--muted)",
                    cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, textTransform: "capitalize",
                  }}
                >{rl === "all" ? "All Risks" : `${riskIcon(rl)} ${rl}`}</button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "4rem", color: "var(--muted)" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
              <p>No diffs found yet. The observatory is collecting data.</p>
              <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>Check back in a few minutes.</p>
            </div>
          ) : (
            <div>
              <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
                Showing {filtered.length} changes
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {filtered.map(diff => (
                  <div key={diff.id} className="card" style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                    <div style={{ fontSize: "1.25rem", minWidth: 28 }}>{riskIcon(diff.risk_level)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.4rem" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--accent-light)" }}>
                          {diff.crr_vendors?.name || diff.vendor_slug}
                        </span>
                        <span className={`badge badge-${diff.risk_level}`}>{diff.risk_level}</span>
                        <span className="tag">{diff.risk_category}</span>
                      </div>
                      <a href={diff.url} target="_blank" rel="noopener noreferrer"
                        style={{ fontWeight: 600, color: "var(--foreground)", textDecoration: "none", display: "block", marginBottom: "0.25rem" }}>
                        {diff.title}
                      </a>
                      {diff.description && diff.description !== `Change detected on ${diff.crr_vendors?.name} changelog` && (
                        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "0.4rem", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {diff.description}
                        </p>
                      )}
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                        Collected {new Date(diff.collected_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        {diff.published_at && ` · Published ${new Date(diff.published_at).toLocaleDateString()}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
