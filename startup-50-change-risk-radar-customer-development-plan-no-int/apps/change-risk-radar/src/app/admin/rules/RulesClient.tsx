"use client";
import { useState, useTransition } from "react";

const RISK_COLORS: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#10b981" };
const CAT_ICONS: Record<string, string> = { pricing: "💰", legal: "⚖️", operational: "🔧", security: "🔒", vendor_risk: "🏢" };
const ACTION_COLORS: Record<string, string> = {
  boost: "#10b981", keep: "var(--muted)", dedup: "#f59e0b",
  downgrade: "#6366f1", investigate: "#ef4444", disable: "#ef4444",
};

interface Rule {
  id: string;
  vendor_slug: string;
  rule_name: string;
  detection_method: string;
  risk_level: string;
  risk_category: string;
  priority: number;
  is_active: boolean;
  confidence_threshold: number | null;
  dedup_window_hours: number | null;
  target_url: string | null;
  match_patterns: string[] | null;
  precision_proxy: number | null;
  fp_rate_proxy: number | null;
  engagement_rate: number | null;
  sample_reactions: number;
  refinement_action: string | null;
  refinement_notes: string | null;
}

interface EditState {
  id: string;
  field: string;
  value: unknown;
}

export default function AdminRulesClient({
  rules: initialRules,
  secret,
}: {
  rules: Rule[];
  secret: string;
}) {
  const [rules, setRules] = useState(initialRules);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [filterVendor, setFilterVendor] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [msg, setMsg] = useState("");
  const [, startTransition] = useTransition();

  const vendors = ["all", ...Array.from(new Set(rules.map(r => r.vendor_slug))).sort()];
  const categories = ["all", "security", "pricing", "legal", "operational", "vendor_risk"];

  const filtered = rules.filter(r => {
    if (filterVendor !== "all" && r.vendor_slug !== filterVendor) return false;
    if (filterCategory !== "all" && r.risk_category !== filterCategory) return false;
    if (filterActive === "active" && !r.is_active) return false;
    if (filterActive === "inactive" && r.is_active) return false;
    return true;
  });

  async function patchRule(id: string, updates: Record<string, unknown>) {
    const res = await fetch("/api/admin/rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer crr-cron-2025-secure` },
      body: JSON.stringify({ id, ...updates }),
    });
    if (res.ok) {
      setRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
      setMsg("✓ Saved");
      setTimeout(() => setMsg(""), 2000);
    } else {
      setMsg("✗ Error saving");
    }
    setEditState(null);
  }

  async function toggleRule(id: string, currentActive: boolean) {
    await patchRule(id, { is_active: !currentActive });
  }

  function startEdit(id: string, field: string, currentValue: unknown) {
    setEditState({ id, field, value: currentValue });
  }

  async function commitEdit() {
    if (!editState) return;
    await patchRule(editState.id, { [editState.field]: editState.value });
  }

  const activeCount = rules.filter(r => r.is_active).length;
  const withSignal = rules.filter(r => r.sample_reactions > 0).length;

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {[
          { label: "Total rules", value: rules.length, color: "var(--muted)" },
          { label: "Active", value: activeCount, color: "#10b981" },
          { label: "Inactive", value: rules.length - activeCount, color: "#ef4444" },
          { label: "With signal", value: withSignal, color: "var(--accent-light)" },
          { label: "Boosted", value: rules.filter(r => r.refinement_action === "boost").length, color: "#10b981" },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: "0.6rem 1rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ fontWeight: 800, fontSize: "1.1rem", color: s.color }}>{s.value}</span>
            <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{s.label}</span>
          </div>
        ))}
        {msg && <div style={{ padding: "0.6rem 1rem", color: msg.startsWith("✓") ? "#10b981" : "#ef4444", fontSize: "0.8rem", alignSelf: "center" }}>{msg}</div>}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)}
          style={{ padding: "0.35rem 0.75rem", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.8rem" }}>
          {vendors.map(v => <option key={v} value={v}>{v === "all" ? "All vendors" : v}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          style={{ padding: "0.35rem 0.75rem", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.8rem" }}>
          {categories.map(c => <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>)}
        </select>
        <select value={filterActive} onChange={e => setFilterActive(e.target.value as "all" | "active" | "inactive")}
          style={{ padding: "0.35rem 0.75rem", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.8rem" }}>
          <option value="all">All rules</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
        <span style={{ color: "var(--muted)", fontSize: "0.78rem", alignSelf: "center", marginLeft: "auto" }}>
          {filtered.length} / {rules.length} shown
        </span>
      </div>

      {/* Rules table */}
      <div className="card" style={{ padding: "0" }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 90px 85px 70px 65px 65px 65px 70px 70px 70px 90px", gap: "0.4rem", padding: "0.5rem 0.9rem", fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>
          <span/>
          <span>Rule / Vendor</span>
          <span>Method</span>
          <span>Category</span>
          <span>Risk</span>
          <span>Priority</span>
          <span>Confidence</span>
          <span>Dedup</span>
          <span>Precision</span>
          <span>FP Rate</span>
          <span>Engage</span>
          <span>Action</span>
        </div>

        {filtered.map(rule => {
          const isEditing = editState?.id === rule.id;
          return (
            <div key={rule.id} style={{
              display: "grid",
              gridTemplateColumns: "28px 1fr 90px 85px 70px 65px 65px 65px 70px 70px 70px 90px",
              gap: "0.4rem", padding: "0.5rem 0.9rem", fontSize: "0.76rem",
              borderBottom: "1px solid rgba(255,255,255,0.03)",
              alignItems: "center",
              opacity: rule.is_active ? 1 : 0.45,
              background: isEditing ? "rgba(99,102,241,0.05)" : undefined,
            }}>
              {/* Toggle */}
              <button onClick={() => toggleRule(rule.id, rule.is_active)} title={rule.is_active ? "Deactivate" : "Activate"}
                style={{ width: 18, height: 18, borderRadius: 9999, border: "none", cursor: "pointer", background: rule.is_active ? "#10b981" : "#374151", transition: "background 0.15s" }} />

              {/* Name + vendor */}
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.75rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 260 }} title={rule.rule_name}>
                  {rule.rule_name}
                </div>
                <span className="tag" style={{ fontSize: "0.6rem", padding: "0 4px" }}>{rule.vendor_slug}</span>
              </div>

              {/* Method */}
              <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{rule.detection_method.replace(/_/g, " ")}</span>

              {/* Category */}
              <span style={{ fontSize: "0.7rem" }}>{CAT_ICONS[rule.risk_category]} {rule.risk_category}</span>

              {/* Risk */}
              <span style={{ color: RISK_COLORS[rule.risk_level], fontWeight: 700, fontSize: "0.72rem" }}>{rule.risk_level}</span>

              {/* Priority — editable */}
              <div style={{ position: "relative" }}>
                {isEditing && editState.field === "priority" ? (
                  <input type="number" min={1} max={5} value={editState.value as number}
                    onChange={e => setEditState(s => s ? { ...s, value: parseInt(e.target.value) } : null)}
                    onBlur={() => startTransition(commitEdit)}
                    autoFocus
                    style={{ width: 40, padding: "2px 4px", background: "rgba(99,102,241,0.1)", border: "1px solid var(--accent)", borderRadius: 4, color: "var(--foreground)", fontSize: "0.75rem" }} />
                ) : (
                  <button onClick={() => startEdit(rule.id, "priority", rule.priority)}
                    style={{ fontWeight: 700, background: "transparent", border: "1px dashed transparent", borderRadius: 4, padding: "2px 6px", cursor: "pointer", color: "var(--foreground)", fontSize: "0.75rem" }}
                    title="Click to edit">
                    {rule.priority ?? 3}
                  </button>
                )}
              </div>

              {/* Confidence — editable */}
              <div>
                {isEditing && editState.field === "confidence_threshold" ? (
                  <input type="number" min={0.1} max={1.0} step={0.05} value={editState.value as number}
                    onChange={e => setEditState(s => s ? { ...s, value: parseFloat(e.target.value) } : null)}
                    onBlur={() => startTransition(commitEdit)}
                    autoFocus
                    style={{ width: 50, padding: "2px 4px", background: "rgba(99,102,241,0.1)", border: "1px solid var(--accent)", borderRadius: 4, color: "var(--foreground)", fontSize: "0.75rem" }} />
                ) : (
                  <button onClick={() => startEdit(rule.id, "confidence_threshold", rule.confidence_threshold ?? 0.5)}
                    style={{ background: "transparent", border: "1px dashed transparent", borderRadius: 4, padding: "2px 4px", cursor: "pointer", color: "var(--foreground)", fontSize: "0.72rem" }}
                    title="Click to edit">
                    {((rule.confidence_threshold ?? 0.5) * 100).toFixed(0)}%
                  </button>
                )}
              </div>

              {/* Dedup window — editable */}
              <div>
                {isEditing && editState.field === "dedup_window_hours" ? (
                  <input type="number" min={1} max={168} value={editState.value as number}
                    onChange={e => setEditState(s => s ? { ...s, value: parseInt(e.target.value) } : null)}
                    onBlur={() => startTransition(commitEdit)}
                    autoFocus
                    style={{ width: 45, padding: "2px 4px", background: "rgba(99,102,241,0.1)", border: "1px solid var(--accent)", borderRadius: 4, color: "var(--foreground)", fontSize: "0.75rem" }} />
                ) : (
                  <button onClick={() => startEdit(rule.id, "dedup_window_hours", rule.dedup_window_hours ?? 24)}
                    style={{ background: "transparent", border: "1px dashed transparent", borderRadius: 4, padding: "2px 4px", cursor: "pointer", color: "var(--foreground)", fontSize: "0.72rem" }}
                    title="Click to edit">
                    {rule.dedup_window_hours ?? 24}h
                  </button>
                )}
              </div>

              {/* Telemetry (read-only) */}
              <span style={{ color: rule.precision_proxy !== null ? (rule.precision_proxy >= 0.9 ? "#10b981" : "#f59e0b") : "var(--muted)", fontWeight: rule.precision_proxy !== null ? 700 : 400, fontSize: "0.72rem" }}>
                {rule.precision_proxy !== null ? `${(rule.precision_proxy * 100).toFixed(0)}%` : "—"}
              </span>
              <span style={{ color: rule.fp_rate_proxy !== null ? (rule.fp_rate_proxy > 0.1 ? "#ef4444" : "#10b981") : "var(--muted)", fontSize: "0.72rem" }}>
                {rule.fp_rate_proxy !== null ? `${(rule.fp_rate_proxy * 100).toFixed(0)}%` : "—"}
              </span>
              <span style={{ color: rule.engagement_rate !== null ? "#10b981" : "var(--muted)", fontSize: "0.72rem" }}>
                {rule.engagement_rate !== null ? `${(rule.engagement_rate * 100).toFixed(0)}%` : "—"}
              </span>

              {/* Action badge */}
              <span style={{
                fontSize: "0.63rem", padding: "2px 6px", borderRadius: 9999,
                background: `${ACTION_COLORS[rule.refinement_action ?? "keep"]}22`,
                color: ACTION_COLORS[rule.refinement_action ?? "keep"],
                fontWeight: 600, whiteSpace: "nowrap",
              }}>
                {rule.refinement_action ?? "keep"}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "0.75rem", fontSize: "0.7rem", color: "var(--muted)" }}>
        Click any underlined/dashed value to edit. Toggle the green/grey circle to activate/deactivate a rule.
        Changes are saved immediately. Fields: priority (1–5), confidence (0–100%), dedup window (hours).
      </div>
    </div>
  );
}
