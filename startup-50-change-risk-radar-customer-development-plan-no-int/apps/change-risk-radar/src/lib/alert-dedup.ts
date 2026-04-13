/**
 * src/lib/alert-dedup.ts
 * Alert deduplication and correlation v1
 *
 * Strategy: cluster alerts by (org_id, vendor_slug, risk_category, 4h window)
 * - First alert in window = representative
 * - Subsequent similar alerts within window = marked is_duplicate=true
 * - Each cluster tracks count, first_seen, last_seen
 */
import { supabaseAdmin } from "@/lib/supabase";

const DEDUP_WINDOW_HOURS = 4;
const SIMILARITY_THRESHOLD = 0.75;

type AlertRow = {
  id: string;
  org_id: string;
  vendor_slug: string;
  risk_category: string;
  risk_level: string;
  title: string;
  summary?: string;
  rule_id?: string;
  created_at: string;
  is_duplicate?: boolean;
  cluster_id?: string;
  dedup_of?: string;
};

/** Normalise text for similarity comparison */
function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/** Jaccard similarity on word sets */
function jaccardSim(a: string, b: string): number {
  const setA = new Set(normalise(a).split(" ").filter(w => w.length > 3));
  const setB = new Set(normalise(b).split(" ").filter(w => w.length > 3));
  if (setA.size === 0 && setB.size === 0) return 1;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/** Build a cluster key for an alert */
function clusterKey(orgId: string, vendorSlug: string, category: string, windowStart: Date): string {
  const bucket = Math.floor(windowStart.getTime() / (DEDUP_WINDOW_HOURS * 3_600_000));
  return `${orgId}:${vendorSlug}:${category}:${bucket}`;
}

/**
 * Process a new alert through the dedup engine.
 * Returns { is_duplicate, dedup_of, cluster_id }
 */
export async function processAlertDedup(alert: AlertRow): Promise<{
  is_duplicate: boolean;
  dedup_of: string | null;
  cluster_id: string | null;
}> {
  const windowStart = new Date(
    Math.floor(new Date(alert.created_at).getTime() / (DEDUP_WINDOW_HOURS * 3_600_000)) * (DEDUP_WINDOW_HOURS * 3_600_000)
  );
  const windowEnd = new Date(windowStart.getTime() + DEDUP_WINDOW_HOURS * 3_600_000);
  const key = clusterKey(alert.org_id, alert.vendor_slug, alert.risk_category, windowStart);

  // Look up existing cluster
  const { data: existingCluster } = await supabaseAdmin
    .from("crr_alert_clusters")
    .select("id, representative_alert_id, alert_count")
    .eq("org_id", alert.org_id)
    .eq("cluster_key", key)
    .single();

  if (existingCluster) {
    // Get the representative alert to compare similarity
    const { data: repAlert } = await supabaseAdmin
      .from("crr_org_alerts")
      .select("id, title, summary")
      .eq("id", existingCluster.representative_alert_id ?? "")
      .single();

    let isDuplicate = false;
    if (repAlert) {
      const sim = jaccardSim(alert.title, repAlert.title);
      isDuplicate = sim >= SIMILARITY_THRESHOLD;
    }

    if (isDuplicate) {
      // Update cluster count
      await supabaseAdmin
        .from("crr_alert_clusters")
        .update({
          alert_count: existingCluster.alert_count + 1,
          last_seen: alert.created_at,
        })
        .eq("id", existingCluster.id);

      // Mark the new alert
      await supabaseAdmin
        .from("crr_org_alerts")
        .update({
          is_duplicate: true,
          dedup_of: existingCluster.representative_alert_id,
          cluster_id: existingCluster.id,
        })
        .eq("id", alert.id);

      return {
        is_duplicate: true,
        dedup_of: existingCluster.representative_alert_id ?? null,
        cluster_id: existingCluster.id,
      };
    }

    // Not similar enough — update cluster with new representative
    await supabaseAdmin
      .from("crr_alert_clusters")
      .update({
        representative_alert_id: alert.id,
        alert_count: existingCluster.alert_count + 1,
        last_seen: alert.created_at,
      })
      .eq("id", existingCluster.id);

    await supabaseAdmin
      .from("crr_org_alerts")
      .update({ cluster_id: existingCluster.id })
      .eq("id", alert.id);

    return { is_duplicate: false, dedup_of: null, cluster_id: existingCluster.id };
  }

  // No existing cluster — create one
  const { data: newCluster } = await supabaseAdmin
    .from("crr_alert_clusters")
    .insert({
      org_id: alert.org_id,
      cluster_key: key,
      vendor_slug: alert.vendor_slug,
      risk_category: alert.risk_category,
      representative_alert_id: alert.id,
      alert_count: 1,
      first_seen: alert.created_at,
      last_seen: alert.created_at,
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
    })
    .select("id")
    .single();

  if (newCluster) {
    await supabaseAdmin
      .from("crr_org_alerts")
      .update({ cluster_id: newCluster.id })
      .eq("id", alert.id);

    return { is_duplicate: false, dedup_of: null, cluster_id: newCluster.id };
  }

  return { is_duplicate: false, dedup_of: null, cluster_id: null };
}

/**
 * Retroactively deduplicate all alerts for an org.
 * Run once per org after enabling dedup.
 */
export async function retroDedup(orgId: string): Promise<{ processed: number; duplicates: number }> {
  const { data: alerts } = await supabaseAdmin
    .from("crr_org_alerts")
    .select("id, org_id, vendor_slug, risk_category, risk_level, title, summary, created_at")
    .eq("org_id", orgId)
    .is("is_duplicate", null)
    .order("created_at")
    .limit(1000);

  if (!alerts?.length) return { processed: 0, duplicates: 0 };

  let duplicates = 0;
  for (const alert of alerts) {
    const result = await processAlertDedup(alert as AlertRow);
    if (result.is_duplicate) duplicates++;
  }

  return { processed: alerts.length, duplicates };
}

/**
 * Get dedup stats for an org.
 */
export async function getDedupStats(orgId: string): Promise<{
  total_alerts: number;
  unique_alerts: number;
  duplicate_alerts: number;
  dedup_rate: number;
  clusters: number;
  top_noisy_vendors: { vendor_slug: string; duplicate_count: number }[];
}> {
  const { count: total } = await supabaseAdmin
    .from("crr_org_alerts")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);

  const { count: dupes } = await supabaseAdmin
    .from("crr_org_alerts")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("is_duplicate", true);

  const { count: clusters } = await supabaseAdmin
    .from("crr_alert_clusters")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);

  const totalCount = total ?? 0;
  const dupeCount = dupes ?? 0;

  // Top noisy vendors
  const { data: vendorDupes } = await supabaseAdmin
    .from("crr_org_alerts")
    .select("vendor_slug")
    .eq("org_id", orgId)
    .eq("is_duplicate", true)
    .limit(500);

  const vendorCounts: Record<string, number> = {};
  for (const a of vendorDupes ?? []) {
    vendorCounts[a.vendor_slug] = (vendorCounts[a.vendor_slug] ?? 0) + 1;
  }
  const top_noisy_vendors = Object.entries(vendorCounts)
    .map(([vendor_slug, duplicate_count]) => ({ vendor_slug, duplicate_count }))
    .sort((a, b) => b.duplicate_count - a.duplicate_count)
    .slice(0, 5);

  return {
    total_alerts: totalCount,
    unique_alerts: totalCount - dupeCount,
    duplicate_alerts: dupeCount,
    dedup_rate: totalCount > 0 ? Math.round((dupeCount / totalCount) * 100) : 0,
    clusters: clusters ?? 0,
    top_noisy_vendors,
  };
}
