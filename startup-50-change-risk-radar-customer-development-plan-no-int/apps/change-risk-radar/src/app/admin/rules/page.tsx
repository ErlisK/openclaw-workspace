import { supabaseAdmin } from "@/lib/supabase";
import AdminRulesClient from "./RulesClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Rule Editor — Change Risk Radar Admin" };

interface SearchParams { secret?: string }

export default async function AdminRulesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const portalSecret = process.env.PORTAL_SECRET ?? "crr-portal-2025";
  if (sp.secret !== portalSecret) {
    return (
      <div style={{ padding: "3rem 0", display: "flex", justifyContent: "center" }}>
        <div className="card" style={{ maxWidth: 400, padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>⚙️</div>
          <h2 style={{ fontWeight: 800, marginBottom: "0.5rem" }}>Rule Editor</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>Admin access required.</p>
          <form method="get">
            <input name="secret" type="password" placeholder="Admin password"
              style={{ width: "100%", padding: "0.6rem", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: "0.875rem", marginBottom: "0.75rem" }} />
            <button type="submit" className="btn-primary" style={{ width: "100%" }}>Enter →</button>
          </form>
        </div>
      </div>
    );
  }

  const { data: rules } = await supabaseAdmin
    .from("crr_rule_templates")
    .select("*")
    .order("priority", { ascending: false })
    .order("vendor_slug");

  return (
    <div style={{ padding: "2.5rem 0" }}>
      <div className="container" style={{ maxWidth: 1300 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div className="tag" style={{ marginBottom: "0.4rem" }}>Admin · MVP v0 · Phase 3</div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0 }}>⚙️ Risk Rule Editor</h1>
            <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "0.25rem" }}>
              {rules?.length ?? 0} rule templates. Click any value to edit inline. Toggle active/inactive with the circle.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <a href={`/rule-refinement?secret=${portalSecret}`} className="btn-ghost" style={{ padding: "0.5rem 0.9rem", fontSize: "0.78rem" }}>Refinement ↗</a>
            <a href={`/portal?secret=${portalSecret}`} className="btn-ghost" style={{ padding: "0.5rem 0.9rem", fontSize: "0.78rem" }}>Portal ↗</a>
          </div>
        </div>

        {/* Architecture note */}
        <div className="card" style={{ padding: "0.9rem 1.25rem", marginBottom: "1.5rem", borderColor: "rgba(99,102,241,0.2)", background: "rgba(99,102,241,0.04)" }}>
          <div style={{ display: "flex", gap: "2rem", fontSize: "0.78rem", flexWrap: "wrap" }}>
            <div><strong>Detection methods:</strong> pricing_page_diff · changelog_scrape · tos_diff · trust_page_diff · webhook_event · cloudtrail_event</div>
            <div><strong>Risk levels:</strong> high → critical severity, medium → high severity, low → filtered</div>
            <div><strong>Confidence threshold:</strong> minimum match score to fire (lowering = more sensitive, more recall)</div>
            <div><strong>Dedup window:</strong> suppress re-alerts for same rule+content within N hours</div>
          </div>
        </div>

        <AdminRulesClient rules={rules ?? []} secret={portalSecret} />
      </div>
    </div>
  );
}
