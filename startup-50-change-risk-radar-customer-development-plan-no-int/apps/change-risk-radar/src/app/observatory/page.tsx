import { supabaseAdmin } from "@/lib/supabase";
import { VENDOR_SOURCES } from "@/lib/scraper";
import ObservatoryClient from "./ObservatoryClient";

export const revalidate = 60; // refresh every 60s

export default async function ObservatoryPage() {
  // Fetch recent diffs
  const { data: diffs } = await supabaseAdmin
    .from("crr_diffs")
    .select("*, crr_vendors(name, slug, category)")
    .order("collected_at", { ascending: false })
    .limit(200);

  // Stats
  const { data: vendorCount } = await supabaseAdmin
    .from("crr_vendors")
    .select("id", { count: "exact" });

  const { data: diffCount } = await supabaseAdmin
    .from("crr_diffs")
    .select("id", { count: "exact" });

  // Weekly diffs
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: weeklyDiffs } = await supabaseAdmin
    .from("crr_diffs")
    .select("id", { count: "exact" })
    .gte("collected_at", weekAgo);

  return (
    <ObservatoryClient
      diffs={diffs || []}
      stats={{
        vendors: vendorCount?.length || 0,
        total: diffCount?.length || 0,
        weekly: weeklyDiffs?.length || 0,
        configured: VENDOR_SOURCES.length,
      }}
    />
  );
}
