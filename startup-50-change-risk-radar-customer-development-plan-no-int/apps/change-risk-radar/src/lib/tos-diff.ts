// Dedicated ToS / policy URL diff engine
// Tracks content hashes for curated list of vendor ToS/pricing/policy pages
// Runs daily via Vercel Cron. On change: inserts crr_diffs + triggers org alerts.

import { supabaseAdmin } from "./supabase";
import crypto from "crypto";

export interface TosUrl {
  url: string;
  vendor_slug: string;
  label: string;
  risk_category: "legal" | "pricing" | "operational";
  risk_level_on_change: "high" | "medium" | "low";
}

// Curated list of important ToS/pricing/policy URLs to track daily
export const TOS_URLS: TosUrl[] = [
  // Stripe
  { url: "https://stripe.com/legal/ssa", vendor_slug: "stripe", label: "Stripe Services Agreement", risk_category: "legal", risk_level_on_change: "high" },
  { url: "https://stripe.com/legal/privacy-center", vendor_slug: "stripe", label: "Stripe Privacy Center", risk_category: "legal", risk_level_on_change: "medium" },
  { url: "https://stripe.com/pricing", vendor_slug: "stripe", label: "Stripe Pricing", risk_category: "pricing", risk_level_on_change: "high" },
  { url: "https://stripe.com/docs/rate-limits", vendor_slug: "stripe", label: "Stripe API Rate Limits", risk_category: "operational", risk_level_on_change: "high" },
  // Google Workspace
  { url: "https://workspace.google.com/terms/", vendor_slug: "google-workspace", label: "Google Workspace Terms of Service", risk_category: "legal", risk_level_on_change: "high" },
  { url: "https://workspace.google.com/pricing/", vendor_slug: "google-workspace", label: "Google Workspace Pricing", risk_category: "pricing", risk_level_on_change: "high" },
  { url: "https://support.google.com/a/answer/1247360", vendor_slug: "google-workspace", label: "GWS Data Processing Amendment", risk_category: "legal", risk_level_on_change: "high" },
  // AWS
  { url: "https://aws.amazon.com/service-terms/", vendor_slug: "aws", label: "AWS Service Terms", risk_category: "legal", risk_level_on_change: "high" },
  { url: "https://aws.amazon.com/legal/data-processing-addendum/", vendor_slug: "aws", label: "AWS Data Processing Addendum", risk_category: "legal", risk_level_on_change: "high" },
  { url: "https://aws.amazon.com/pricing/", vendor_slug: "aws", label: "AWS Pricing Overview", risk_category: "pricing", risk_level_on_change: "medium" },
  // Shopify
  { url: "https://www.shopify.com/legal/terms", vendor_slug: "shopify", label: "Shopify Terms of Service", risk_category: "legal", risk_level_on_change: "high" },
  { url: "https://www.shopify.com/pricing", vendor_slug: "shopify", label: "Shopify Pricing", risk_category: "pricing", risk_level_on_change: "high" },
  { url: "https://www.shopify.com/legal/privacy", vendor_slug: "shopify", label: "Shopify Privacy Policy", risk_category: "legal", risk_level_on_change: "medium" },
  // GitHub
  { url: "https://docs.github.com/en/site-policy/github-terms/github-terms-of-service", vendor_slug: "github", label: "GitHub Terms of Service", risk_category: "legal", risk_level_on_change: "high" },
  { url: "https://github.com/pricing", vendor_slug: "github", label: "GitHub Pricing", risk_category: "pricing", risk_level_on_change: "high" },
  // Slack
  { url: "https://slack.com/legal/terms-of-service", vendor_slug: "slack", label: "Slack Terms of Service", risk_category: "legal", risk_level_on_change: "high" },
  { url: "https://slack.com/legal/acceptable-use-policy", vendor_slug: "slack", label: "Slack Acceptable Use Policy", risk_category: "legal", risk_level_on_change: "medium" },
  // HubSpot
  { url: "https://legal.hubspot.com/terms-of-service", vendor_slug: "hubspot", label: "HubSpot Terms of Service", risk_category: "legal", risk_level_on_change: "high" },
  { url: "https://www.hubspot.com/pricing", vendor_slug: "hubspot", label: "HubSpot Pricing", risk_category: "pricing", risk_level_on_change: "high" },
  // Cloudflare
  { url: "https://www.cloudflare.com/terms/", vendor_slug: "cloudflare", label: "Cloudflare Terms of Service", risk_category: "legal", risk_level_on_change: "high" },
  { url: "https://www.cloudflare.com/plans/", vendor_slug: "cloudflare", label: "Cloudflare Plans & Pricing", risk_category: "pricing", risk_level_on_change: "high" },
  // Twilio
  { url: "https://www.twilio.com/en-us/legal/tos", vendor_slug: "twilio", label: "Twilio Terms of Service", risk_category: "legal", risk_level_on_change: "high" },
  // Salesforce
  { url: "https://www.salesforce.com/company/legal/sfdc-website-terms-of-service/", vendor_slug: "salesforce", label: "Salesforce Terms of Service", risk_category: "legal", risk_level_on_change: "high" },
  // Vercel
  { url: "https://vercel.com/legal/terms", vendor_slug: "vercel", label: "Vercel Terms of Service", risk_category: "legal", risk_level_on_change: "high" },
  { url: "https://vercel.com/pricing", vendor_slug: "vercel", label: "Vercel Pricing", risk_category: "pricing", risk_level_on_change: "high" },
];

function hashContent(content: string): string {
  // Normalize whitespace before hashing to reduce noise from minor layout changes
  const normalized = content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // strip scripts
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")    // strip styles
    .replace(/<[^>]+>/g, " ")     // strip HTML tags
    .replace(/\s+/g, " ")         // collapse whitespace
    .trim();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

async function fetchUrl(url: string): Promise<{ content: string; status: number; error?: string }> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ChangeRiskRadar/2.0; +https://change-risk-radar.vercel.app)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(12000),
    });
    const content = await res.text();
    return { content, status: res.status };
  } catch (e) {
    return { content: "", status: 0, error: String(e) };
  }
}

export interface TosDiffResult {
  url: string;
  vendor_slug: string;
  label: string;
  changed: boolean;
  hash: string;
  previousHash?: string;
  status: number;
  error?: string;
  newDiffId?: string;
}

export async function checkTosUrl(tosUrl: TosUrl): Promise<TosDiffResult> {
  const { url, vendor_slug, label, risk_category, risk_level_on_change } = tosUrl;

  // Get existing snapshot
  const { data: existing } = await supabaseAdmin
    .from("crr_tos_snapshots")
    .select("*")
    .eq("url", url)
    .single();

  const { content, status, error } = await fetchUrl(url);

  // Update snapshot record
  const now = new Date().toISOString();
  const baseRecord = {
    url,
    vendor_slug,
    label,
    status_code: status,
    last_checked_at: now,
    error: error ?? null,
  };

  if (error || status < 200 || status >= 400) {
    await supabaseAdmin.from("crr_tos_snapshots").upsert(
      { ...baseRecord, content_hash: existing?.content_hash ?? null },
      { onConflict: "url" }
    );
    return { url, vendor_slug, label, changed: false, hash: existing?.content_hash ?? "", status, error };
  }

  const newHash = hashContent(content);
  const contentPreview = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);

  const previousHash = existing?.content_hash;
  const changed = !!previousHash && previousHash !== newHash;

  await supabaseAdmin.from("crr_tos_snapshots").upsert({
    ...baseRecord,
    content_hash: newHash,
    content_length: content.length,
    content_preview: contentPreview,
    last_changed_at: changed ? now : (existing?.last_changed_at ?? now),
    change_count: changed ? ((existing?.change_count ?? 0) + 1) : (existing?.change_count ?? 0),
  }, { onConflict: "url" });

  let newDiffId: string | undefined;

  if (changed) {
    // Insert into crr_diffs so the existing detector routing picks it up
    const diffHash = `tos:${newHash.slice(0, 8)}`;
    const title = `${label} — content change detected`;
    const description = `The content of "${label}" changed. Previous hash: ${previousHash?.slice(0, 8)}… New hash: ${newHash.slice(0, 8)}…`;

    const { data: newDiff } = await supabaseAdmin
      .from("crr_diffs")
      .insert({
        vendor_slug,
        title,
        description,
        url,
        source_url: url,
        diff_hash: diffHash,
        risk_level: risk_level_on_change,
        risk_category,
        detection_method: "tos_diff",
        collected_at: now,
      })
      .select("id")
      .single();

    newDiffId = newDiff?.id;
  }

  return { url, vendor_slug, label, changed, hash: newHash, previousHash, status, newDiffId };
}

export async function runTosDiffDetector(): Promise<{
  checked: number;
  changed: number;
  errors: number;
  newDiffs: number;
  results: TosDiffResult[];
  durationMs: number;
}> {
  const start = Date.now();
  const results: TosDiffResult[] = [];

  // Check URLs in batches of 5 to respect rate limits
  for (let i = 0; i < TOS_URLS.length; i += 5) {
    const batch = TOS_URLS.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(u => checkTosUrl(u)));
    results.push(...batchResults);
    // Small delay between batches
    if (i + 5 < TOS_URLS.length) await new Promise(r => setTimeout(r, 1500));
  }

  const checked = results.length;
  const changed = results.filter(r => r.changed).length;
  const errors = results.filter(r => !!r.error).length;
  const newDiffs = results.filter(r => !!r.newDiffId).length;
  const durationMs = Date.now() - start;

  // Log the detector run
  await supabaseAdmin.from("crr_detector_runs").insert({
    detector_type: "tos_diff",
    new_diffs: newDiffs,
    urls_checked: checked,
    urls_changed: changed,
    duration_ms: durationMs,
    error: errors > 0 ? `${errors} URLs failed to fetch` : null,
    metadata: { changed_urls: results.filter(r => r.changed).map(r => r.url) },
  });

  return { checked, changed, errors, newDiffs, results, durationMs };
}
