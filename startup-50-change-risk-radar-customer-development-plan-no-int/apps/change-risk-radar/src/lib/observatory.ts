import { VENDOR_SOURCES, VendorSource, fetchVendorChangelog, classifyRisk } from "./scraper";
import { getSupabaseAdmin } from "./supabase";

/**
 * Creates a simple hash of a string (no crypto needed in edge runtime)
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Fetch raw text content of a URL for snapshotting
 */
export async function fetchPageContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "ChangeRiskRadar/1.0 (+https://changeriskadar.com/about)",
        "Accept": "text/html,application/xhtml+xml,application/xml,text/plain",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return "";
    const text = await res.text();
    // Normalize whitespace to make diffs more meaningful
    return text.replace(/\s+/g, " ").trim().substring(0, 50000);
  } catch {
    return "";
  }
}

/**
 * Compute a simple line-level diff between two strings
 */
export function computeDiff(oldContent: string, newContent: string): {
  added: string[];
  removed: string[];
  changed: boolean;
} {
  if (!oldContent && !newContent) return { added: [], removed: [], changed: false };
  if (!oldContent) return { added: [newContent.substring(0, 500)], removed: [], changed: true };
  
  const oldHash = simpleHash(oldContent);
  const newHash = simpleHash(newContent);
  
  if (oldHash === newHash) return { added: [], removed: [], changed: false };
  
  // Simple word-level diff for short content
  const oldWords = new Set(oldContent.match(/\b\w{4,}\b/g) || []);
  const newWords = new Set(newContent.match(/\b\w{4,}\b/g) || []);
  
  const added = [...newWords].filter(w => !oldWords.has(w)).slice(0, 20);
  const removed = [...oldWords].filter(w => !newWords.has(w)).slice(0, 20);
  
  return { added, removed, changed: true };
}

/**
 * Core snapshot + diff pipeline for a vendor's canonical URLs
 */
export async function snapshotVendorUrl(
  vendorSlug: string,
  url: string,
  vendorId: string,
): Promise<{ isNew: boolean; diffTitle?: string; diffDescription?: string }> {
  const supabase = getSupabaseAdmin();
  
  // Fetch current content
  const content = await fetchPageContent(url);
  if (!content) return { isNew: false };
  
  const contentHash = simpleHash(content);
  
  // Get previous snapshot
  const { data: prevSnapshot } = await supabase
    .from("crr_snapshots")
    .select("content_hash, content_text")
    .eq("vendor_slug", vendorSlug)
    .eq("url", url)
    .order("snapshot_at", { ascending: false })
    .limit(1)
    .single();
  
  // Store new snapshot
  await supabase.from("crr_snapshots").insert({
    vendor_slug: vendorSlug,
    url,
    content_hash: contentHash,
    content_text: content.substring(0, 10000), // store first 10KB
  });
  
  // No previous snapshot — first run
  if (!prevSnapshot) return { isNew: true };
  
  // Same content — no change
  if (prevSnapshot.content_hash === contentHash) return { isNew: false };
  
  // Content changed — compute diff
  const diff = computeDiff(prevSnapshot.content_text || "", content);
  if (!diff.changed) return { isNew: false };
  
  const addedSample = diff.added.slice(0, 5).join(", ");
  const removedSample = diff.removed.slice(0, 5).join(", ");
  
  const diffTitle = `Content change detected on ${url.replace(/https?:\/\//, "").split("/")[0]}`;
  const diffDescription = [
    addedSample ? `New terms: ${addedSample}` : "",
    removedSample ? `Removed: ${removedSample}` : "",
  ].filter(Boolean).join(". ") || "Page content changed";
  
  // Create a diff record
  const { risk_level, risk_category } = classifyRisk(diffTitle, diffDescription);
  const diffHash = `snap:${vendorSlug}:${contentHash.substring(0, 16)}`;
  
  // Check dedup
  const { data: existing } = await supabase
    .from("crr_diffs")
    .select("id")
    .eq("diff_hash", diffHash)
    .single();
  
  if (!existing) {
    await supabase.from("crr_diffs").insert({
      vendor_id: vendorId,
      vendor_slug: vendorSlug,
      title: diffTitle,
      description: diffDescription,
      url,
      diff_hash: diffHash,
      risk_level,
      risk_category,
      source_url: url,
      detection_method: url.includes("pricing") ? "pricing_page_diff" 
        : url.includes("terms") || url.includes("privacy") || url.includes("legal") ? "tos_diff"
        : "changelog_scrape",
    });
    return { isNew: false, diffTitle, diffDescription };
  }
  
  return { isNew: false };
}

/**
 * Canonical snapshot URLs per vendor — these are the pages we diff daily
 */
export const SNAPSHOT_URLS: Record<string, string[]> = {
  stripe: [
    "https://stripe.com/pricing",
    "https://stripe.com/legal/ssa",
    "https://stripe.com/docs/changelog",
  ],
  shopify: [
    "https://www.shopify.com/pricing",
    "https://www.shopify.com/legal/terms",
    "https://shopify.dev/changelog",
  ],
  aws: [
    "https://aws.amazon.com/pricing/",
    "https://aws.amazon.com/service-terms/",
    "https://aws.amazon.com/new/feed/",
  ],
  "google-workspace": [
    "https://workspace.google.com/pricing",
    "https://workspace.google.com/terms/",
    "https://workspace.google.com/whatsnew/",
  ],
  salesforce: [
    "https://www.salesforce.com/editions-pricing/",
    "https://www.salesforce.com/company/legal/agreements/",
  ],
  okta: [
    "https://www.okta.com/pricing/",
    "https://www.okta.com/agreements/",
  ],
  github: [
    "https://github.com/pricing",
    "https://github.com/site/terms",
    "https://github.blog/changelog/",
  ],
  twilio: [
    "https://www.twilio.com/pricing",
    "https://www.twilio.com/legal/aup",
    "https://www.twilio.com/changelog",
  ],
  hubspot: [
    "https://www.hubspot.com/pricing",
    "https://legal.hubspot.com/terms-of-service",
    "https://developers.hubspot.com/changelog",
  ],
  cloudflare: [
    "https://www.cloudflare.com/plans/",
    "https://www.cloudflare.com/terms/",
  ],
  slack: [
    "https://slack.com/intl/en-us/pricing",
    "https://slack.com/intl/en-us/terms-of-service",
    "https://api.slack.com/changelog",
  ],
  intercom: [
    "https://www.intercom.com/pricing",
    "https://www.intercom.com/legal/terms-and-policies",
  ],
  zendesk: [
    "https://www.zendesk.com/pricing/",
    "https://www.zendesk.com/company/agreements-and-terms/",
  ],
  paypal: [
    "https://www.paypal.com/us/business/paypal-business-fees",
    "https://www.paypal.com/us/legalhub/useragreement-full",
  ],
  klaviyo: [
    "https://www.klaviyo.com/pricing",
    "https://www.klaviyo.com/legal/terms-of-service",
  ],
};

/**
 * Full collection run: changelog scrape + URL snapshots
 */
export async function runFullCollection(): Promise<{
  scraped: number;
  snapshots: number;
  newDiffs: number;
  errors: string[];
}> {
  const supabase = getSupabaseAdmin();
  const results = { scraped: 0, snapshots: 0, newDiffs: 0, errors: [] as string[] };

  // 1. Upsert all vendors
  for (const vendor of VENDOR_SOURCES) {
    try {
      await supabase.from("crr_vendors").upsert({
        slug: vendor.slug,
        name: vendor.name,
        url: vendor.url,
        category: vendor.category,
      }, { onConflict: "slug" });
    } catch (e) {
      results.errors.push(`vendor_upsert:${vendor.slug}: ${e}`);
    }
  }

  // 2. Changelog scraping for all vendors
  for (const vendor of VENDOR_SOURCES) {
    try {
      const { data: vendorRow } = await supabase
        .from("crr_vendors").select("id").eq("slug", vendor.slug).single();
      if (!vendorRow) continue;

      const items = await fetchVendorChangelog(vendor);
      
      for (const item of items) {
        const hash = `cl:${vendor.slug}:${simpleHash(item.title)}`;
        const { data: existing } = await supabase.from("crr_diffs").select("id").eq("diff_hash", hash).single();
        if (existing) continue;

        const { risk_level, risk_category } = classifyRisk(item.title, item.description);
        await supabase.from("crr_diffs").insert({
          vendor_id: vendorRow.id,
          vendor_slug: vendor.slug,
          title: item.title,
          description: item.description,
          url: item.url,
          diff_hash: hash,
          risk_level,
          risk_category,
          published_at: item.published_at,
          source_url: vendor.changelogUrl,
          detection_method: "changelog_scrape",
        });
        results.scraped++;
        results.newDiffs++;
      }
    } catch (e) {
      results.errors.push(`scrape:${vendor.slug}: ${e}`);
    }
  }

  // 3. Snapshot diff for canonical URLs
  for (const [vendorSlug, urls] of Object.entries(SNAPSHOT_URLS)) {
    try {
      const { data: vendorRow } = await supabase
        .from("crr_vendors").select("id").eq("slug", vendorSlug).single();
      const vendorId = vendorRow?.id || vendorSlug;

      for (const url of urls) {
        const result = await snapshotVendorUrl(vendorSlug, url, vendorId);
        results.snapshots++;
        if (result.diffTitle) results.newDiffs++;
        
        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (e) {
      results.errors.push(`snapshot:${vendorSlug}: ${e}`);
    }
  }

  return results;
}
