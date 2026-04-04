import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const revalidate = 3600; // cache 1h

export async function GET() {
  const [taxRes, rulesRes] = await Promise.all([
    supabaseAdmin.from("crr_taxonomy").select("*").order("category").order("id"),
    supabaseAdmin.from("crr_rule_templates").select("*").order("taxonomy_id"),
  ]);

  if (taxRes.error) return NextResponse.json({ error: taxRes.error.message }, { status: 500 });

  const taxonomy = taxRes.data || [];
  const rules = rulesRes.data || [];

  // Group rules by taxonomy_id
  const rulesByEvent: Record<string, typeof rules> = {};
  for (const rule of rules) {
    if (!rulesByEvent[rule.taxonomy_id]) rulesByEvent[rule.taxonomy_id] = [];
    rulesByEvent[rule.taxonomy_id].push(rule);
  }

  // Summary stats
  const categoryCounts = taxonomy.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const riskCounts = taxonomy.reduce((acc, e) => {
    acc[e.risk_level] = (acc[e.risk_level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const detectionMethodCounts = taxonomy.reduce((acc, e) => {
    acc[e.detection_method] = (acc[e.detection_method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return NextResponse.json({
    taxonomy,
    rules,
    rulesByEvent,
    stats: {
      totalEvents: taxonomy.length,
      totalRules: rules.length,
      categoryCounts,
      riskCounts,
      detectionMethodCounts,
      vendorsCovered: [...new Set(rules.map(r => r.vendor_slug))].length,
    },
  });
}
