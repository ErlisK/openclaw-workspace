/**
 * src/lib/policy-packs.ts
 * Policy pack management — pre-built rule sets for compliance frameworks
 */
import { supabaseAdmin } from "@/lib/supabase";

export interface PolicyPack {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  framework: string | null;
  vendor_scope: string[];
  rule_count: number;
  is_public: boolean;
  created_at: string;
}

export interface PolicyPackWithRules extends PolicyPack {
  rules: {
    id: string;
    rule_id: string;
    is_required: boolean;
    override_threshold: number | null;
    rule: {
      rule_name: string;
      vendor_slug: string;
      risk_level: string;
      risk_category: string;
      detection_method: string;
    };
  }[];
}

export async function listPolicyPacks(): Promise<PolicyPack[]> {
  const { data } = await supabaseAdmin
    .from("crr_policy_packs")
    .select("*")
    .eq("is_public", true)
    .order("framework")
    .order("name");

  return (data ?? []) as PolicyPack[];
}

export async function getPolicyPack(slug: string): Promise<PolicyPackWithRules | null> {
  const { data: pack } = await supabaseAdmin
    .from("crr_policy_packs")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!pack) return null;

  const { data: rules } = await supabaseAdmin
    .from("crr_policy_pack_rules")
    .select(`
      id, rule_id, is_required, override_threshold,
      rule:crr_rule_templates(rule_name, vendor_slug, risk_level, risk_category, detection_method)
    `)
    .eq("pack_id", pack.id);

  return { ...pack, rules: (rules ?? []) as unknown as PolicyPackWithRules["rules"] } as PolicyPackWithRules;
}

export async function applyPolicyPackToOrg(orgId: string, packSlug: string): Promise<{ applied: boolean; rules_enabled: number }> {
  const pack = await getPolicyPack(packSlug);
  if (!pack) throw new Error(`Policy pack '${packSlug}' not found`);

  // Upsert org-pack link
  const { error } = await supabaseAdmin
    .from("crr_org_policy_packs")
    .upsert({ org_id: orgId, pack_id: pack.id, enabled: true }, { onConflict: "org_id,pack_id" });

  if (error) throw new Error(error.message);

  // Enable all rules in the pack for this org by adjusting confidence thresholds
  let rules_enabled = 0;
  for (const pr of pack.rules) {
    if (pr.override_threshold) {
      await supabaseAdmin
        .from("crr_rule_templates")
        .update({ confidence_threshold: pr.override_threshold })
        .eq("id", pr.rule_id);
    }
    rules_enabled++;
  }

  return { applied: true, rules_enabled };
}

export async function getOrgPolicyPacks(orgId: string): Promise<(PolicyPack & { enabled: boolean; applied_at: string })[]> {
  const { data } = await supabaseAdmin
    .from("crr_org_policy_packs")
    .select(`
      enabled, applied_at,
      pack:crr_policy_packs(*)
    `)
    .eq("org_id", orgId);

  return (data ?? []).map(row => ({
    ...(row.pack as unknown as PolicyPack),
    enabled: row.enabled,
    applied_at: row.applied_at,
  }));
}

export const FRAMEWORK_LABELS: Record<string, { label: string; color: string; bg: string; description: string }> = {
  soc2:    { label: "SOC 2",    color: "text-blue-700",   bg: "bg-blue-50",   description: "AICPA Trust Service Criteria" },
  gdpr:    { label: "GDPR",     color: "text-purple-700", bg: "bg-purple-50", description: "EU General Data Protection Regulation" },
  hipaa:   { label: "HIPAA",    color: "text-red-700",    bg: "bg-red-50",    description: "Health Insurance Portability and Accountability Act" },
  pci:     { label: "PCI DSS",  color: "text-orange-700", bg: "bg-orange-50", description: "Payment Card Industry Data Security Standard" },
  iso27001:{ label: "ISO 27001",color: "text-green-700",  bg: "bg-green-50",  description: "International Information Security Standard" },
  custom:  { label: "Custom",   color: "text-gray-700",   bg: "bg-gray-50",   description: "Tailored risk coverage" },
};

/** Seed rule associations for a pack from existing rule templates */
export async function seedPackRules(packSlug: string, ruleNames: { rule_name: string; vendor_slug: string; is_required?: boolean }[]): Promise<void> {
  const { data: pack } = await supabaseAdmin
    .from("crr_policy_packs")
    .select("id")
    .eq("slug", packSlug)
    .single();

  if (!pack) return;

  for (const rn of ruleNames) {
    const { data: rule } = await supabaseAdmin
      .from("crr_rule_templates")
      .select("id")
      .eq("rule_name", rn.rule_name)
      .eq("vendor_slug", rn.vendor_slug)
      .single();

    if (!rule) continue;

    await supabaseAdmin
      .from("crr_policy_pack_rules")
      .upsert({ pack_id: pack.id, rule_id: rule.id, is_required: rn.is_required ?? false }, { onConflict: "pack_id,rule_id" });
  }

  // Update rule_count
  const { count } = await supabaseAdmin
    .from("crr_policy_pack_rules")
    .select("id", { count: "exact", head: true })
    .eq("pack_id", pack.id);

  await supabaseAdmin
    .from("crr_policy_packs")
    .update({ rule_count: count ?? 0 })
    .eq("id", pack.id);
}
