"use client";
import { useState } from "react";

interface TaxonomyEvent {
  id: string;
  category: string;
  title: string;
  description: string;
  risk_level: string;
  detection_method: string;
  typical_lead_time: string;
  examples: string[];
  impacted_roles: string[];
  vendors: string[];
  detection_urls: string[];
}

interface RuleTemplate {
  id: string;
  taxonomy_id: string;
  vendor_slug: string;
  rule_name: string;
  detection_method: string;
  target_url: string;
  match_patterns: string[];
  risk_level: string;
  risk_category: string;
  is_active: boolean;
  priority: number;
}

interface Stats {
  totalEvents: number;
  totalRules: number;
  highRisk: number;
  vendorsCovered: number;
  categories: number;
  detectionMethods: number;
}

const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  pricing: { label: "Pricing Changes", icon: "💰", color: "#f59e0b" },
  legal: { label: "Legal & Compliance", icon: "⚖️", color: "#ef4444" },
  operational: { label: "Operational / API", icon: "🔧", color: "#6366f1" },
  security: { label: "Security", icon: "🔒", color: "#ef4444" },
  vendor_risk: { label: "Vendor Risk", icon: "🏢", color: "#8b5cf6" },
};

const DETECTION_LABELS: Record<string, { label: string; icon: string }> = {
  pricing_page_diff: { label: "Pricing Page Diff", icon: "💰" },
  changelog_scrape: { label: "Changelog Scrape", icon: "📋" },
  tos_diff: { label: "ToS / Legal Diff", icon: "⚖️" },
  docs_diff: { label: "API Docs Diff", icon: "📖" },
  trust_page_diff: { label: "Trust Page Diff", icon: "🔒" },
  news_monitor: { label: "News Monitor", icon: "📰" },
};

export default function TaxonomyClient({
  taxonomy, rules, ruleCountByEvent, stats,
}: {
  taxonomy: TaxonomyEvent[];
  rules: RuleTemplate[];
  ruleCountByEvent: Record<string, number>;
  stats: Stats;
}) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeRisk, setActiveRisk] = useState<string>("all");
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);

  const categories = ["all", ...Object.keys(CATEGORY_META)];
  const risks = ["all", "high", "medium", "low"];

  const filtered = taxonomy.filter(e => {
    if (activeCategory !== "all" && e.category !== activeCategory) return false;
    if (activeRisk !== "all" && e.risk_level !== activeRisk) return false;
    return true;
  });

  const riskBadge = (level: string) => (
    <span className={`badge badge-${level === "high" ? "high" : level === "medium" ? "medium" : "low"}`}>{level}</span>
  );

  const rulesForEvent = (eventId: string) => rules.filter(r => r.taxonomy_id === eventId);

  return (
    <div style={{ padding: "3rem 0" }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div className="tag" style={{ marginBottom: "1rem" }}>Database-Driven · Version 0.1 · January 2025</div>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "0.75rem" }}>Risk Taxonomy v0</h1>
          <p style={{ color: "var(--muted)", maxWidth: 680, fontSize: "1.1rem" }}>
            {stats.totalEvents} concrete vendor change event types, each mapped to a detection method,
            risk level, impacted roles, and <strong style={{ color: "var(--foreground)" }}>{stats.totalRules} active detection rules</strong> across {stats.vendorsCovered} vendors.
            Stored in Supabase and driving automated observatory collection.
          </p>
        </div>

        {/* Summary Stats */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "2.5rem" }}>
          {[
            { label: "Event Types", value: stats.totalEvents, color: "var(--accent-light)", icon: "📊" },
            { label: "High Risk", value: stats.highRisk, color: "#ef4444", icon: "🔴" },
            { label: "Detection Rules", value: stats.totalRules, color: "var(--success)", icon: "🎯" },
            { label: "Vendors Covered", value: stats.vendorsCovered, color: "var(--warning)", icon: "🏢" },
            { label: "Risk Categories", value: stats.categories, color: "#8b5cf6", icon: "🗂️" },
            { label: "Detection Methods", value: stats.detectionMethods, color: "var(--muted)", icon: "🔍" },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: "center", minWidth: 120 }}>
              <div style={{ fontSize: "1.25rem", marginBottom: "0.25rem" }}>{s.icon}</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Detection Methods */}
        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>🔍 Detection Methods</h2>
          <div className="grid-3">
            {Object.entries(DETECTION_LABELS).map(([key, method]) => {
              const count = taxonomy.filter(e => e.detection_method === key).length;
              const ruleCount = rules.filter(r => r.detection_method === key).length;
              return (
                <div key={key} className="card" style={{ padding: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "1.25rem" }}>{method.icon}</span>
                    <span className="tag">{count} events · {ruleCount} rules</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.25rem" }}>{method.label}</div>
                  <div style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "var(--muted)", background: "rgba(99,102,241,0.05)", padding: "0.25rem 0.4rem", borderRadius: "4px" }}>{key}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Filters */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.875rem", color: "var(--muted)", marginRight: "0.5rem" }}>Filter:</span>
          {categories.map(cat => {
            const meta = cat === "all" ? null : CATEGORY_META[cat];
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{ padding: "0.35rem 0.75rem", borderRadius: "999px", border: "1px solid", cursor: "pointer", fontSize: "0.8rem",
                  borderColor: activeCategory === cat ? "var(--accent)" : "var(--border)",
                  background: activeCategory === cat ? "rgba(99,102,241,0.1)" : "transparent",
                  color: activeCategory === cat ? "var(--accent-light)" : "var(--muted)", fontWeight: 600,
                }}>
                {meta ? `${meta.icon} ${meta.label}` : "All Categories"}
              </button>
            );
          })}
          <span style={{ width: "1px", background: "var(--border)", height: "20px", margin: "0 0.5rem" }}></span>
          {risks.map(r => (
            <button key={r} onClick={() => setActiveRisk(r)}
              style={{ padding: "0.35rem 0.75rem", borderRadius: "999px", border: "1px solid", cursor: "pointer", fontSize: "0.8rem",
                borderColor: activeRisk === r ? "var(--accent)" : "var(--border)",
                background: activeRisk === r ? "rgba(99,102,241,0.1)" : "transparent",
                color: activeRisk === r ? "var(--accent-light)" : "var(--muted)", fontWeight: 600, textTransform: "capitalize",
              }}>
              {r === "all" ? "All Risks" : r === "high" ? "🔴 High" : r === "medium" ? "🟡 Medium" : "🟢 Low"}
            </button>
          ))}
          <button onClick={() => setShowRules(!showRules)}
            style={{ marginLeft: "auto", padding: "0.35rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: showRules ? "rgba(99,102,241,0.1)" : "transparent", color: showRules ? "var(--accent-light)" : "var(--muted)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>
            {showRules ? "Hide" : "Show"} Rule Templates
          </button>
        </div>

        <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: "1.5rem" }}>
          Showing {filtered.length} of {taxonomy.length} event types
        </div>

        {/* Events */}
        {Object.keys(CATEGORY_META).filter(cat => activeCategory === "all" || activeCategory === cat).map(cat => {
          const catEvents = filtered.filter(e => e.category === cat);
          if (catEvents.length === 0) return null;
          const meta = CATEGORY_META[cat];
          return (
            <section key={cat} style={{ marginBottom: "2.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                <span style={{ fontSize: "1.5rem" }}>{meta.icon}</span>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>{meta.label}</h2>
                <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "var(--muted)" }}>
                  {catEvents.length} event type{catEvents.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {catEvents.map(event => {
                  const isExpanded = expandedEvent === event.id;
                  const eventRules = rulesForEvent(event.id);
                  const det = DETECTION_LABELS[event.detection_method];
                  return (
                    <div key={event.id} className="card" style={{ cursor: "pointer" }}
                      onClick={() => setExpandedEvent(isExpanded ? null : event.id)}>
                      {/* Summary row */}
                      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                        <div style={{ flex: "1 1 350px" }}>
                          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.4rem" }}>
                            <span style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "var(--muted)", background: "rgba(99,102,241,0.08)", padding: "0.1rem 0.4rem", borderRadius: "3px" }}>
                              {event.id}
                            </span>
                            {riskBadge(event.risk_level)}
                            <span className="tag">{det?.icon} {det?.label}</span>
                            {eventRules.length > 0 && (
                              <span style={{ fontSize: "0.7rem", color: "var(--success)", background: "rgba(16,185,129,0.1)", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                                {eventRules.length} rule{eventRules.length !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                          <h3 style={{ fontWeight: 700, marginBottom: "0.35rem", fontSize: "0.95rem" }}>{event.title}</h3>
                          <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: 0 }}>{event.description}</p>
                        </div>
                        <div style={{ flex: "0 0 200px", fontSize: "0.8rem" }}>
                          {event.impacted_roles?.length > 0 && (
                            <div style={{ marginBottom: "0.5rem" }}>
                              <div style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 600, marginBottom: "0.25rem", textTransform: "uppercase" }}>Impacted Roles</div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.2rem" }}>
                                {event.impacted_roles.map(r => <span key={r} className="tag">{r}</span>)}
                              </div>
                            </div>
                          )}
                          <div style={{ marginBottom: "0.5rem" }}>
                            <span style={{ color: "var(--muted)", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase" }}>Typical Notice: </span>
                            <span style={{ color: "var(--foreground)", fontSize: "0.8rem" }}>{event.typical_lead_time}</span>
                          </div>
                          {event.vendors?.length > 0 && (
                            <div>
                              <div style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 600, marginBottom: "0.25rem", textTransform: "uppercase" }}>Vendors</div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.2rem" }}>
                                {event.vendors.slice(0, 3).map(v => <span key={v} className="tag">{v}</span>)}
                                {event.vendors.length > 3 && <span className="tag">+{event.vendors.length - 3}</span>}
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{ color: "var(--muted)", fontSize: "1rem" }}>{isExpanded ? "▲" : "▼"}</div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)" }}
                          onClick={e => e.stopPropagation()}>
                          {event.examples?.length > 0 && (
                            <div style={{ marginBottom: "1rem" }}>
                              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                                Real-World Examples
                              </div>
                              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                {event.examples.map((ex, i) => (
                                  <li key={i} style={{ padding: "0.35rem 0", borderBottom: "1px solid rgba(30,30,46,0.3)", fontSize: "0.85rem", color: "var(--muted)", display: "flex", gap: "0.5rem" }}>
                                    <span style={{ color: "var(--accent-light)" }}>→</span> {ex}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {event.detection_urls?.length > 0 && (
                            <div style={{ marginBottom: "1rem" }}>
                              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                                Detection URLs
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                {event.detection_urls.map((url, i) => (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                    style={{ fontSize: "0.8rem", color: "var(--accent-light)", textDecoration: "none", fontFamily: "monospace" }}>
                                    {url}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Rule Templates */}
                          {showRules && eventRules.length > 0 && (
                            <div>
                              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                                🎯 Active Detection Rules ({eventRules.length})
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                {eventRules.map(rule => (
                                  <div key={rule.id} style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "8px", padding: "0.75rem" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem", flexWrap: "wrap", gap: "0.5rem" }}>
                                      <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{rule.rule_name}</span>
                                      <div style={{ display: "flex", gap: "0.35rem" }}>
                                        <span className="tag">{rule.vendor_slug}</span>
                                        <span style={{ fontSize: "0.7rem", background: rule.is_active ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: rule.is_active ? "var(--success)" : "var(--danger)", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                                          {rule.is_active ? "active" : "inactive"}
                                        </span>
                                      </div>
                                    </div>
                                    <a href={rule.target_url} target="_blank" rel="noopener noreferrer"
                                      style={{ fontSize: "0.75rem", color: "var(--muted)", fontFamily: "monospace", textDecoration: "none" }}>
                                      {rule.target_url}
                                    </a>
                                    {rule.match_patterns?.length > 0 && (
                                      <div style={{ marginTop: "0.4rem", display: "flex", flexWrap: "wrap", gap: "0.2rem" }}>
                                        {rule.match_patterns.map((p: string, i: number) => (
                                          <span key={i} style={{ fontSize: "0.7rem", fontFamily: "monospace", background: "rgba(99,102,241,0.08)", color: "var(--accent-light)", padding: "0.1rem 0.4rem", borderRadius: "3px" }}>
                                            "{p}"
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {showRules && eventRules.length === 0 && (
                            <div style={{ color: "var(--muted)", fontSize: "0.8rem", fontStyle: "italic" }}>
                              No detection rules configured yet for this event type.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
