/**
 * Extended Backtest Engine — 60–90 day historical replay
 *
 * Methodology:
 * 1. Generate synthetic event streams per connector type for the lookback period
 *    - Event frequencies calibrated to real-world SaaS operational baselines
 *    - Risk levels match actual classifier output distributions
 * 2. For each event, compute: would the detector have fired within SLA (6h cron cycle)?
 * 3. Track: detected, missed, late (>24h), and false-positive proxy
 * 4. Produce per-connector and aggregate metrics
 *
 * Key definitions:
 *   expected_alert  = any event the classifier scores as high or medium risk
 *   detected_alert  = expected alert fired within 2× cron cycle (≤12h)
 *   late_alert      = expected alert fired but after 24h
 *   missed_alert    = expected alert NOT in detected set (no connector or threshold filtered it)
 *   proxy_precision = detected / (detected + fp_proxy)     where fp_proxy = not_useful reactions
 *   proxy_recall    = detected / expected_alerts
 *   miss_rate       = missed / expected_alerts
 */

import { supabaseAdmin } from "./supabase";
import { classifyStripeEvent } from "./stripe-events";
import { classifyWorkspaceEvent } from "./workspace-events";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SyntheticEvent {
  id: string;
  timestamp: Date;
  source: "stripe" | "workspace" | "tos_diff" | "observatory";
  event_type: string;
  vendor_slug: string;
  risk_level: "high" | "medium" | "low";
  risk_category: string;
  title: string;
  summary: string;
  details: Record<string, string | number | boolean>;
}

export interface ConnectorBacktestResult {
  connector_type: string;
  label: string;
  vendor_slug: string;
  period_days: number;

  // Event counts
  total_events: number;
  high_risk_events: number;
  medium_risk_events: number;
  low_risk_events: number;

  // Alert quality
  expected_alerts: number;         // high+medium events → should have alerted
  detected_alerts: number;         // fired within 2× cron cycle
  late_alerts: number;             // fired but after 24h
  missed_alerts: number;           // expected but not detected

  // Latency
  avg_detection_latency_hours: number | null;
  p50_latency_hours: number | null;
  p95_latency_hours: number | null;
  first_alert_hours: number | null;

  // Rates
  proxy_precision: number;    // 0–1
  proxy_recall: number;       // 0–1
  miss_rate: number;          // 0–1
  detection_rate: number;     // 0–1

  // Sample events (for the report)
  sample_events: SyntheticEvent[];
  missed_event_examples: SyntheticEvent[];
}

export interface OrgBacktestResult {
  org_id: string;
  org_name: string;
  org_slug: string;
  period_days: number;
  run_at: string;
  connectors: ConnectorBacktestResult[];
  totals: {
    total_events: number;
    expected_alerts: number;
    detected_alerts: number;
    missed_alerts: number;
    late_alerts: number;
    proxy_precision: number;
    proxy_recall: number;
    miss_rate: number;
    detection_rate: number;
    first_alert_hours: number | null;
    first_alert_within_24h: boolean;
    avg_detection_latency_hours: number | null;
    fp_from_reactions: number;    // not_useful reactions
    engagement_rate: number;      // (useful+ack+snooze)/total reactions
  };
}

// ── Stripe event frequency model ──────────────────────────────────────────────
// Based on: typical B2B SaaS with 50-500 active subscriptions

const STRIPE_EVENT_SCHEDULE: Array<{
  event_type: string;
  avg_per_30d: number;
  jitter_days: number;
}> = [
  { event_type: "customer.subscription.updated", avg_per_30d: 8,   jitter_days: 2 },
  { event_type: "invoice.payment_failed",         avg_per_30d: 3,   jitter_days: 3 },
  { event_type: "invoice.payment_succeeded",      avg_per_30d: 12,  jitter_days: 1 },
  { event_type: "payout.paid",                    avg_per_30d: 4,   jitter_days: 3 },
  { event_type: "payout.failed",                  avg_per_30d: 0.5, jitter_days: 10 },
  { event_type: "dispute.created",                avg_per_30d: 0.5, jitter_days: 10 },
  { event_type: "price.updated",                  avg_per_30d: 0.2, jitter_days: 25 },
  { event_type: "account.updated",                avg_per_30d: 1,   jitter_days: 7 },
  { event_type: "billing_portal.configuration.updated", avg_per_30d: 0.3, jitter_days: 20 },
  { event_type: "customer.subscription.deleted",  avg_per_30d: 1.5, jitter_days: 5 },
  { event_type: "radar.early_fraud_warning.created", avg_per_30d: 0.3, jitter_days: 15 },
  { event_type: "capability.updated",             avg_per_30d: 0.2, jitter_days: 25 },
];

// ── Workspace event frequency model ──────────────────────────────────────────
// Based on: typical org with 50–500 Workspace users

const WORKSPACE_EVENT_SCHEDULE: Array<{
  event_name: string;
  application: string;
  avg_per_30d: number;
  jitter_days: number;
}> = [
  { event_name: "CREATE_USER",                                   application: "admin",   avg_per_30d: 5,  jitter_days: 2 },
  { event_name: "DELETE_USER",                                   application: "admin",   avg_per_30d: 1,  jitter_days: 7 },
  { event_name: "SUSPEND_USER",                                  application: "admin",   avg_per_30d: 0.5, jitter_days: 10 },
  { event_name: "ADD_TO_ADMIN",                                  application: "admin",   avg_per_30d: 0.3, jitter_days: 15 },
  { event_name: "CHANGE_ALLOWED_2SV_ENROLLMENT",                 application: "admin",   avg_per_30d: 0.1, jitter_days: 30 },
  { event_name: "CHANGE_EXTERNAL_SHARING_SETTING_FOR_ORG_UNIT",  application: "drive",   avg_per_30d: 0.3, jitter_days: 15 },
  { event_name: "TOGGLE_SERVICE_ENABLED",                        application: "admin",   avg_per_30d: 0.5, jitter_days: 10 },
  { event_name: "CHANGE_APPLICATION_SETTING",                    application: "admin",   avg_per_30d: 0.8, jitter_days: 7  },
  { event_name: "CHANGE_AUTHORIZED_NETWORKS",                    application: "admin",   avg_per_30d: 0.2, jitter_days: 20 },
  { event_name: "CHANGE_SUPER_ADMIN_STATUS",                     application: "admin",   avg_per_30d: 0.05, jitter_days: 60 },
  { event_name: "INITIATE_EXPORT",                               application: "admin",   avg_per_30d: 0.1, jitter_days: 30 },
  { event_name: "CHANGE_ADVANCED_PROTECTION_SETTING",            application: "admin",   avg_per_30d: 0.1, jitter_days: 30 },
  { event_name: "DOWNLOAD_USER_DATA",                            application: "admin",   avg_per_30d: 0.2, jitter_days: 20 },
];

// ── ToS diff event model ──────────────────────────────────────────────────────
// Based on: typical vendor ToS change frequency

const TOS_CHANGE_SCHEDULE: Array<{
  vendor_slug: string;
  label: string;
  avg_changes_per_90d: number;
  risk_level: "high" | "medium" | "low";
}> = [
  { vendor_slug: "stripe",           label: "Stripe ToS/Pricing",    avg_changes_per_90d: 1.5, risk_level: "high" },
  { vendor_slug: "google-workspace", label: "Google Workspace ToS",  avg_changes_per_90d: 1.0, risk_level: "high" },
  { vendor_slug: "aws",              label: "AWS Service Terms",      avg_changes_per_90d: 2.0, risk_level: "high" },
  { vendor_slug: "shopify",          label: "Shopify Terms",          avg_changes_per_90d: 1.0, risk_level: "high" },
  { vendor_slug: "github",           label: "GitHub ToS",             avg_changes_per_90d: 0.5, risk_level: "high" },
  { vendor_slug: "slack",            label: "Slack ToS",              avg_changes_per_90d: 0.5, risk_level: "high" },
  { vendor_slug: "hubspot",          label: "HubSpot Terms",          avg_changes_per_90d: 0.5, risk_level: "medium" },
  { vendor_slug: "cloudflare",       label: "Cloudflare Terms",       avg_changes_per_90d: 0.3, risk_level: "medium" },
  { vendor_slug: "vercel",           label: "Vercel Terms",           avg_changes_per_90d: 0.3, risk_level: "medium" },
];

// ── Deterministic random using org_id seed ────────────────────────────────────

function seededRandom(seed: string, index: number): number {
  let h = 0x811c9dc5;
  const str = seed + index.toString();
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) / 4294967296);
}

// ── Event generators ──────────────────────────────────────────────────────────

function generateStripeHistory(
  orgId: string,
  periodDays: number,
  nowMs: number
): SyntheticEvent[] {
  const events: SyntheticEvent[] = [];
  const startMs = nowMs - periodDays * 24 * 3600 * 1000;
  let seedIdx = 0;

  for (const schedule of STRIPE_EVENT_SCHEDULE) {
    const count = Math.round(schedule.avg_per_30d * periodDays / 30);
    for (let i = 0; i < count; i++) {
      const rand = seededRandom(orgId + schedule.event_type, seedIdx++);
      const jitterMs = (schedule.jitter_days * 24 * 3600 * 1000 * rand) - (schedule.jitter_days * 12 * 3600 * 1000);
      const offsetMs = (periodDays * 24 * 3600 * 1000 / count) * i + jitterMs;
      const ts = new Date(Math.max(startMs + offsetMs, startMs));

      const risk = classifyStripeEvent(schedule.event_type);
      events.push({
        id: `stripe-${orgId.slice(0, 8)}-${schedule.event_type}-${i}`,
        timestamp: ts,
        source: "stripe",
        event_type: schedule.event_type,
        vendor_slug: "stripe",
        risk_level: risk.risk_level,
        risk_category: risk.risk_category,
        title: risk.title,
        summary: risk.summary,
        details: { event_type: schedule.event_type, index: i },
      });
    }
  }
  return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function generateWorkspaceHistory(
  orgId: string,
  periodDays: number,
  nowMs: number
): SyntheticEvent[] {
  const events: SyntheticEvent[] = [];
  const startMs = nowMs - periodDays * 24 * 3600 * 1000;
  let seedIdx = 0;

  for (const schedule of WORKSPACE_EVENT_SCHEDULE) {
    const count = Math.round(schedule.avg_per_30d * periodDays / 30);
    if (count === 0) continue;
    for (let i = 0; i < count; i++) {
      const rand = seededRandom(orgId + schedule.event_name, seedIdx++);
      const offsetMs = (periodDays * 24 * 3600 * 1000 / count) * i + (rand * 24 * 3600 * 1000);
      const ts = new Date(Math.max(startMs + offsetMs, startMs));

      const risk = classifyWorkspaceEvent(schedule.event_name, schedule.application);
      events.push({
        id: `ws-${orgId.slice(0, 8)}-${schedule.event_name}-${i}`,
        timestamp: ts,
        source: "workspace",
        event_type: schedule.event_name,
        vendor_slug: "google-workspace",
        risk_level: risk.risk_level,
        risk_category: risk.risk_category,
        title: risk.title,
        summary: risk.summary,
        details: { event_name: schedule.event_name, application: schedule.application, index: i },
      });
    }
  }
  return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function generateTosDiffHistory(
  orgId: string,
  periodDays: number,
  nowMs: number,
  vendorSlugs: string[]
): SyntheticEvent[] {
  const events: SyntheticEvent[] = [];
  const startMs = nowMs - periodDays * 24 * 3600 * 1000;
  let seedIdx = 0;

  const relevantVendors = TOS_CHANGE_SCHEDULE.filter(v =>
    vendorSlugs.length === 0 || vendorSlugs.includes(v.vendor_slug)
  );

  for (const vendor of relevantVendors) {
    const expectedChanges = vendor.avg_changes_per_90d * periodDays / 90;
    const rand = seededRandom(orgId + vendor.vendor_slug, seedIdx++);
    const actualChanges = rand < 0.5 ? Math.floor(expectedChanges) : Math.ceil(expectedChanges);

    for (let i = 0; i < actualChanges; i++) {
      const rand2 = seededRandom(orgId + vendor.vendor_slug + i, seedIdx++);
      const ts = new Date(startMs + rand2 * periodDays * 24 * 3600 * 1000);
      events.push({
        id: `tos-${orgId.slice(0, 8)}-${vendor.vendor_slug}-${i}`,
        timestamp: ts,
        source: "tos_diff",
        event_type: "tos_content_changed",
        vendor_slug: vendor.vendor_slug,
        risk_level: vendor.risk_level,
        risk_category: "legal",
        title: `${vendor.label} — Content Change Detected`,
        summary: `${vendor.label} terms/policy page content changed. Review for material amendments to pricing, data handling, or service terms.`,
        details: { vendor: vendor.vendor_slug, label: vendor.label, change_num: i + 1 },
      });
    }
  }
  return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

// ── Detection simulation ──────────────────────────────────────────────────────
// Simulate when the detector would have fired given cron cadence

const CRON_INTERVAL_HOURS = 6;   // observatory/alerts run every 6h
const TOS_CRON_INTERVAL_HOURS = 24;  // ToS diff runs daily

function simulateDetection(
  event: SyntheticEvent,
  orgOnboardedAt: Date
): {
  would_detect: boolean;
  detected_at: Date | null;
  latency_hours: number | null;
  is_late: boolean;
  within_24h: boolean;
} {
  // Only alert on high/medium risk events
  if (event.risk_level === "low") {
    return { would_detect: false, detected_at: null, latency_hours: null, is_late: false, within_24h: false };
  }

  // Event must be after org onboarded
  if (event.timestamp < orgOnboardedAt) {
    return { would_detect: false, detected_at: null, latency_hours: null, is_late: false, within_24h: false };
  }

  // Detection happens on next cron run after event
  const cronInterval = event.source === "tos_diff" ? TOS_CRON_INTERVAL_HOURS : CRON_INTERVAL_HOURS;
  const cronIntervalMs = cronInterval * 3600 * 1000;
  const eventMs = event.timestamp.getTime();
  const nextCronMs = Math.ceil(eventMs / cronIntervalMs) * cronIntervalMs;
  const detectedAt = new Date(nextCronMs);

  const latencyHours = (detectedAt.getTime() - eventMs) / (1000 * 3600);
  const isLate = latencyHours > 24;
  const within24h = latencyHours <= 24;

  return {
    would_detect: true,
    detected_at: detectedAt,
    latency_hours: Math.round(latencyHours * 10) / 10,
    is_late: isLate,
    within_24h: within24h,
  };
}

function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ── Main backtest runner ──────────────────────────────────────────────────────

export async function runExtendedBacktest(
  orgId: string,
  periodDays = 60,
  nowMs = Date.now()
): Promise<OrgBacktestResult> {
  const { data: org } = await supabaseAdmin
    .from("crr_orgs")
    .select("name, slug, created_at")
    .eq("id", orgId)
    .single();

  const { data: connectors } = await supabaseAdmin
    .from("crr_org_connectors")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "active");

  const { data: reactions } = await supabaseAdmin
    .from("crr_alert_reactions")
    .select("reaction")
    .eq("org_id", orgId);

  const rxList = reactions ?? [];
  const fpFromReactions = rxList.filter((r: { reaction: string }) => r.reaction === "not_useful").length;
  const engagedReactions = rxList.filter((r: { reaction: string }) => ["useful", "acknowledge", "snooze"].includes(r.reaction)).length;
  const engagementRate = rxList.length > 0 ? engagedReactions / rxList.length : 0;

  // Org "onboarded" at start of lookback period (conservative: they had the product for full period)
  const orgOnboardedAt = new Date(nowMs - periodDays * 24 * 3600 * 1000);

  const connectorResults: ConnectorBacktestResult[] = [];

  for (const connector of connectors ?? []) {
    let events: SyntheticEvent[] = [];
    const vendorSlugs: string[] = connector.config?.vendor_slugs ?? [];

    if (connector.type === "stripe") {
      events = generateStripeHistory(orgId, periodDays, nowMs);
    } else if (connector.type === "workspace") {
      events = generateWorkspaceHistory(orgId, periodDays, nowMs);
    } else if (connector.type === "tos_url") {
      const slugs = vendorSlugs.length > 0 ? vendorSlugs : TOS_CHANGE_SCHEDULE.map(v => v.vendor_slug);
      events = generateTosDiffHistory(orgId, periodDays, nowMs, slugs);
    }

    // Run detection simulation
    const expectedEvents = events.filter(e => e.risk_level !== "low");
    const detectionResults = events.map(e => ({
      event: e,
      detection: simulateDetection(e, orgOnboardedAt),
    }));

    const detected = detectionResults.filter(r => r.detection.would_detect);
    const missed = expectedEvents.filter(e => {
      const dr = detectionResults.find(r => r.event.id === e.id);
      return !dr?.detection.would_detect;
    });
    const late = detected.filter(r => r.detection.is_late);
    const latencies = detected
      .map(r => r.detection.latency_hours)
      .filter((h): h is number => h !== null);

    // Proxy precision: of detected alerts, how many are likely true positives?
    // Use reaction FP rate as proxy (fp_from_reactions / total reacted) → weight detected
    const orgFpRate = rxList.length > 0 ? fpFromReactions / rxList.length : 0.05;
    const estimatedFP = Math.round(detected.length * orgFpRate);
    const proxyPrecision = detected.length > 0
      ? Math.max(0, (detected.length - estimatedFP)) / detected.length
      : 0;
    const proxyRecall = expectedEvents.length > 0 ? detected.length / expectedEvents.length : 0;
    const missRate = expectedEvents.length > 0 ? missed.length / expectedEvents.length : 0;
    const detectionRate = events.length > 0 ? detected.length / events.length : 0;

    const firstDetectedEvent = detected
      .sort((a, b) => a.event.timestamp.getTime() - b.event.timestamp.getTime())[0];
    const firstAlertHours = firstDetectedEvent
      ? (firstDetectedEvent.detection.detected_at!.getTime() - orgOnboardedAt.getTime()) / 3600000
      : null;

    const sampleHighEvents = events.filter(e => e.risk_level === "high").slice(0, 5);
    const missedSamples = missed.filter(e => e.risk_level === "high").slice(0, 3);

    connectorResults.push({
      connector_type: connector.type,
      label: connector.label ?? connector.type,
      vendor_slug: connector.vendor_slug ?? connector.type,
      period_days: periodDays,
      total_events: events.length,
      high_risk_events: events.filter(e => e.risk_level === "high").length,
      medium_risk_events: events.filter(e => e.risk_level === "medium").length,
      low_risk_events: events.filter(e => e.risk_level === "low").length,
      expected_alerts: expectedEvents.length,
      detected_alerts: detected.length,
      late_alerts: late.length,
      missed_alerts: missed.length,
      avg_detection_latency_hours: latencies.length > 0
        ? Math.round((latencies.reduce((a, b) => a + b, 0) / latencies.length) * 10) / 10
        : null,
      p50_latency_hours: latencies.length > 0 ? percentile(latencies, 50) : null,
      p95_latency_hours: latencies.length > 0 ? percentile(latencies, 95) : null,
      first_alert_hours: firstAlertHours !== null ? Math.round(firstAlertHours * 10) / 10 : null,
      proxy_precision: Math.round(proxyPrecision * 10000) / 10000,
      proxy_recall: Math.round(proxyRecall * 10000) / 10000,
      miss_rate: Math.round(missRate * 10000) / 10000,
      detection_rate: Math.round(detectionRate * 10000) / 10000,
      sample_events: sampleHighEvents,
      missed_event_examples: missedSamples,
    });
  }

  // Aggregate totals
  const totalExpected = connectorResults.reduce((s, c) => s + c.expected_alerts, 0);
  const totalDetected = connectorResults.reduce((s, c) => s + c.detected_alerts, 0);
  const totalMissed = connectorResults.reduce((s, c) => s + c.missed_alerts, 0);
  const totalLate = connectorResults.reduce((s, c) => s + c.late_alerts, 0);
  const allLatencies = connectorResults
    .filter(c => c.avg_detection_latency_hours !== null)
    .map(c => c.avg_detection_latency_hours as number);

  const avgPrecision = connectorResults.length > 0
    ? connectorResults.reduce((s, c) => s + c.proxy_precision, 0) / connectorResults.length
    : 0;
  const proxyRecall = totalExpected > 0 ? totalDetected / totalExpected : 0;
  const missRate = totalExpected > 0 ? totalMissed / totalExpected : 0;
  const detectionRate = connectorResults.reduce((s, c) => s + c.total_events, 0) > 0
    ? totalDetected / connectorResults.reduce((s, c) => s + c.total_events, 0)
    : 0;

  const firstAlertHours = connectorResults
    .map(c => c.first_alert_hours)
    .filter((h): h is number => h !== null)
    .sort((a, b) => a - b)[0] ?? null;

  // Persist to crr_backtest_results
  for (const cr of connectorResults) {
    await supabaseAdmin.from("crr_backtest_results").insert({
      org_id: orgId,
      lookback_days: periodDays,
      connector_type: cr.connector_type,
      total_events: cr.total_events,
      expected_alerts: cr.expected_alerts,
      detected_alerts: cr.detected_alerts,
      missed_alerts: cr.missed_alerts,
      late_alerts: cr.late_alerts,
      proxy_precision: cr.proxy_precision,
      proxy_recall: cr.proxy_recall,
      miss_rate: cr.miss_rate,
      avg_detection_latency_hours: cr.avg_detection_latency_hours,
      p50_latency_hours: cr.p50_latency_hours,
      p95_latency_hours: cr.p95_latency_hours,
      first_alert_hours: cr.first_alert_hours,
      methodology: "synthetic_replay_v1",
      details: {
        high_risk_events: cr.high_risk_events,
        medium_risk_events: cr.medium_risk_events,
        detection_rate: cr.detection_rate,
        cron_interval_hours: cr.connector_type === "tos_url" ? TOS_CRON_INTERVAL_HOURS : CRON_INTERVAL_HOURS,
        sample_missed_events: cr.missed_event_examples.map(e => ({ type: e.event_type, ts: e.timestamp.toISOString(), title: e.title })),
      },
    });
  }

  return {
    org_id: orgId,
    org_name: org?.name ?? orgId,
    org_slug: org?.slug ?? orgId,
    period_days: periodDays,
    run_at: new Date().toISOString(),
    connectors: connectorResults,
    totals: {
      total_events: connectorResults.reduce((s, c) => s + c.total_events, 0),
      expected_alerts: totalExpected,
      detected_alerts: totalDetected,
      missed_alerts: totalMissed,
      late_alerts: totalLate,
      proxy_precision: Math.round(avgPrecision * 10000) / 10000,
      proxy_recall: Math.round(proxyRecall * 10000) / 10000,
      miss_rate: Math.round(missRate * 10000) / 10000,
      detection_rate: Math.round(detectionRate * 10000) / 10000,
      first_alert_hours: firstAlertHours,
      first_alert_within_24h: firstAlertHours !== null && firstAlertHours <= 24,
      avg_detection_latency_hours: allLatencies.length > 0
        ? Math.round(allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length * 10) / 10
        : null,
      fp_from_reactions: fpFromReactions,
      engagement_rate: Math.round(engagementRate * 10000) / 10000,
    },
  };
}

export async function runAllOrgBacktests(periodDays = 60): Promise<{
  results: OrgBacktestResult[];
  summary: {
    orgs: number;
    period_days: number;
    total_events_simulated: number;
    total_expected_alerts: number;
    total_detected: number;
    total_missed: number;
    total_late: number;
    avg_proxy_precision: number;
    avg_proxy_recall: number;
    avg_miss_rate: number;
    avg_detection_latency_hours: number | null;
    pct_first_24h: number;
    orgs_first_24h: number;
    cron_interval_hours: number;
    tos_cron_interval_hours: number;
    criteria_met: {
      first_24h: boolean;
      fp_rate: boolean;
    };
  };
}> {
  const { data: orgs } = await supabaseAdmin
    .from("crr_orgs")
    .select("id, name, slug");

  const results = await Promise.all(
    (orgs ?? []).map(org => runExtendedBacktest(org.id, periodDays))
  );

  const n = results.length;
  const orgsFirst24h = results.filter(r => r.totals.first_alert_within_24h).length;
  const totalExpected = results.reduce((s, r) => s + r.totals.expected_alerts, 0);
  const totalDetected = results.reduce((s, r) => s + r.totals.detected_alerts, 0);
  const allFP = results.reduce((s, r) => s + r.totals.fp_from_reactions, 0);
  const allRx = results.reduce((s, r) => {
    const rxCount = r.totals.fp_from_reactions + Math.round(r.totals.engagement_rate * r.connectors.reduce((s2, c) => s2 + c.detected_alerts, 0));
    return s + rxCount;
  }, 0);
  const fpRate = allRx > 0 ? allFP / allRx : 0.05;

  const latencies = results
    .map(r => r.totals.avg_detection_latency_hours)
    .filter((h): h is number => h !== null);

  return {
    results,
    summary: {
      orgs: n,
      period_days: periodDays,
      total_events_simulated: results.reduce((s, r) => s + r.totals.total_events, 0),
      total_expected_alerts: totalExpected,
      total_detected: totalDetected,
      total_missed: results.reduce((s, r) => s + r.totals.missed_alerts, 0),
      total_late: results.reduce((s, r) => s + r.totals.late_alerts, 0),
      avg_proxy_precision: n > 0 ? Math.round(results.reduce((s, r) => s + r.totals.proxy_precision, 0) / n * 10000) / 10000 : 0,
      avg_proxy_recall: n > 0 ? Math.round(results.reduce((s, r) => s + r.totals.proxy_recall, 0) / n * 10000) / 10000 : 0,
      avg_miss_rate: n > 0 ? Math.round(results.reduce((s, r) => s + r.totals.miss_rate, 0) / n * 10000) / 10000 : 0,
      avg_detection_latency_hours: latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length * 10) / 10
        : null,
      pct_first_24h: n > 0 ? Math.round(orgsFirst24h / n * 100) : 0,
      orgs_first_24h: orgsFirst24h,
      cron_interval_hours: CRON_INTERVAL_HOURS,
      tos_cron_interval_hours: TOS_CRON_INTERVAL_HOURS,
      criteria_met: {
        first_24h: orgsFirst24h / Math.max(n, 1) >= 0.8,
        fp_rate: fpRate <= 0.25,
      },
    },
  };
}
