import { supabaseAdmin } from "@/lib/supabase";
import TaxonomyClient from "./TaxonomyClient";

export const revalidate = 3600;

export const metadata = {
  title: "Risk Taxonomy v0 — Change Risk Radar",
  description: "35 concrete vendor change event types mapped to detection methods, impacted roles, and rule templates.",
};

export default async function TaxonomyPage() {
  // Fetch from Supabase
  const [taxRes, rulesRes] = await Promise.all([
    supabaseAdmin.from("crr_taxonomy").select("*").order("category").order("id"),
    supabaseAdmin.from("crr_rule_templates").select("*").order("taxonomy_id"),
  ]);

  const taxonomy = taxRes.data || [];
  const rules = rulesRes.data || [];

  // Build rule count per taxonomy event
  const ruleCountByEvent: Record<string, number> = {};
  for (const rule of rules) {
    ruleCountByEvent[rule.taxonomy_id] = (ruleCountByEvent[rule.taxonomy_id] || 0) + 1;
  }

  // Stats
  const stats = {
    totalEvents: taxonomy.length,
    totalRules: rules.length,
    highRisk: taxonomy.filter(e => e.risk_level === "high").length,
    vendorsCovered: new Set(rules.map(r => r.vendor_slug)).size,
    categories: [...new Set(taxonomy.map(e => e.category))].length,
    detectionMethods: [...new Set(taxonomy.map(e => e.detection_method))].length,
  };

  return <TaxonomyClient taxonomy={taxonomy} rules={rules} ruleCountByEvent={ruleCountByEvent} stats={stats} />;
}
