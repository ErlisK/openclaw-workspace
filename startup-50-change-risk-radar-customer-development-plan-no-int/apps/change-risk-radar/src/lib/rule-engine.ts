/**
 * rule-engine.ts — Rule Engine v0
 *
 * Evaluates incoming events (diffs, webhook payloads, CloudTrail records)
 * against rule templates stored in Supabase (`crr_rule_templates`).
 *
 * Architecture:
 *   RawEvent → RuleEngine.evaluate() → RuleMatch[] → AlertGenerator
 *
 * Rule types supported:
 *   - content-pattern  (pricing_page_diff, changelog_scrape, tos_diff, trust_page_diff)
 *   - webhook-event    (stripe, workspace webhook events)
 *   - cloudtrail-event (AWS CloudTrail events)
 *
 * Matching logic (in order of precedence / confidence):
 *   1. Exact event name in trigger_event_names → score 1.0
 *   2. Event name substring match in match_patterns → score 0.85
 *   3. Title keyword match in match_patterns → score 0.80
 *   4. Description keyword match → score 0.65
 *   5. URL match against target_url → score 0.75
 */

import { supabaseAdmin } from "./supabase";
import { summarize, diffToFacts, lookupTemplate, type RawFacts } from "./summarizer";

// ─── Types ──────────────────────────────────────────────────────────────────

export type DetectionMethod =
  | "pricing_page_diff"
  | "changelog_scrape"
  | "tos_diff"
  | "trust_page_diff"
  | "webhook_event"
  | "cloudtrail_event";

export type RiskLevel = "high" | "medium" | "low";
export type RiskCategory = "pricing" | "legal" | "operational" | "security" | "vendor_risk";
export type Severity = "critical" | "high" | "medium" | "low";

export interface StoredRule {
  id: string;
  taxonomy_id: string;
  vendor_slug: string;
  rule_name: string;
  detection_method: DetectionMethod;
  risk_level: RiskLevel;
  risk_category: RiskCategory;
  priority: number;
  is_active: boolean;
  confidence_threshold: number;
  dedup_window_hours: number;
  match_patterns: string[];
  trigger_event_names: string[];
  trigger_keywords: string[];
  trigger_url_patterns: string[];
  target_url: string;
  precision_proxy: number | null;
  fp_rate_proxy: number | null;
  engagement_rate: number | null;
  sample_reactions: number;
  refinement_action: string | null;
  trigger_count: number;
  avg_confidence_score: number | null;
  last_triggered_at: string | null;
}

/** The input event passed to the rule engine for evaluation */
export interface RawEvent {
  /** Source system */
  source: "stripe" | "workspace" | "cloudtrail" | "tos_url" | "observatory" | "custom";
  /** Normalized vendor slug (e.g. "stripe", "google-workspace", "aws") */
  vendor_slug: string;
  /** Webhook/CloudTrail event name (e.g. "price.updated", "CreateUser") */
  event_name?: string;
  /** Human-readable title of the event/diff */
  title?: string;
  /** Description/body of the event/diff */
  description?: string;
  /** Source URL (for content-based rules) */
  url?: string;
  /** Pre-classified risk level (may be overridden by rule engine) */
  risk_level?: RiskLevel;
  /** Pre-classified risk category */
  risk_category?: RiskCategory;
  /** Raw event payload for advanced matching */
  payload?: Record<string, unknown>;
  /** Diff ID from crr_diffs (for content-based events) */
  diff_id?: string;
}

/** Result of evaluating an event against a rule */
export interface RuleMatch {
  rule: StoredRule;
  score: number;          // 0.0–1.0 confidence score
  match_reason: string;   // human-readable explanation
  risk_level: RiskLevel;
  risk_category: RiskCategory;
  severity: Severity;
  title: string;
  summary: string;
  should_deduplicate?: boolean;
}

/** Full evaluation result for an event */
export interface EvaluationResult {
  event: RawEvent;
  matches: RuleMatch[];
  top_match: RuleMatch | null;
  evaluated_rules: number;
  matched_rules: number;
  deduped_rules: number;
  latency_ms: number;
}

// ─── In-memory rule cache ────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5-minute TTL
let ruleCache: StoredRule[] | null = null;
let ruleCacheLoadedAt = 0;
let ruleCacheByVendor: Map<string, StoredRule[]> = new Map();

async function loadRules(forceRefresh = false): Promise<StoredRule[]> {
  const now = Date.now();
  if (!forceRefresh && ruleCache && now - ruleCacheLoadedAt < CACHE_TTL_MS) {
    return ruleCache;
  }

  const { data, error } = await supabaseAdmin
    .from("crr_rule_templates")
    .select("*")
    .eq("is_active", true)
    .order("priority", { ascending: false })
    .order("confidence_threshold", { ascending: true });

  if (error || !data) {
    // Fall back to stale cache
    return ruleCache ?? [];
  }

  ruleCache = data as StoredRule[];
  ruleCacheLoadedAt = now;

  // Build vendor index for O(1) lookup
  ruleCacheByVendor = new Map();
  for (const rule of ruleCache) {
    if (!ruleCacheByVendor.has(rule.vendor_slug)) {
      ruleCacheByVendor.set(rule.vendor_slug, []);
    }
    ruleCacheByVendor.get(rule.vendor_slug)!.push(rule);
  }

  return ruleCache;
}

/** Invalidate the in-memory cache (call after rule updates) */
export function invalidateRuleCache() {
  ruleCache = null;
  ruleCacheLoadedAt = 0;
  ruleCacheByVendor = new Map();
}

// ─── Matching helpers ────────────────────────────────────────────────────────

function scoreEvent(rule: StoredRule, event: RawEvent): { score: number; reason: string } {
  const patterns = rule.match_patterns ?? [];
  const triggerEvents = rule.trigger_event_names ?? [];

  // ── Tier 1: Exact event name match (score = 1.0) ──────────────────────────
  if (event.event_name && triggerEvents.length > 0) {
    if (triggerEvents.includes(event.event_name)) {
      return { score: 1.0, reason: `exact_event_name:${event.event_name}` };
    }
  }

  // ── Tier 2: Event name substring in match_patterns (score = 0.85) ─────────
  if (event.event_name && patterns.length > 0) {
    const eventLower = event.event_name.toLowerCase();
    for (const pattern of patterns) {
      if (eventLower.includes(pattern.toLowerCase())) {
        return { score: 0.85, reason: `event_pattern:${pattern}` };
      }
    }
  }

  // ── Tier 3: Title keyword match (score = 0.80) ────────────────────────────
  if (event.title && patterns.length > 0) {
    const titleLower = event.title.toLowerCase();
    const matched = patterns.filter(p => titleLower.includes(p.toLowerCase()));
    if (matched.length > 0) {
      // Multi-keyword boost: each additional matched keyword adds 0.02
      const base = 0.80;
      const boost = Math.min(matched.length - 1, 5) * 0.02;
      return { score: Math.min(base + boost, 0.98), reason: `title_keywords:${matched.slice(0, 3).join(",")}` };
    }
  }

  // ── Tier 4: Description keyword match (score = 0.65) ─────────────────────
  if (event.description && patterns.length > 0) {
    const descLower = event.description.toLowerCase();
    const matched = patterns.filter(p => descLower.includes(p.toLowerCase()));
    if (matched.length > 0) {
      const base = 0.65;
      const boost = Math.min(matched.length - 1, 5) * 0.02;
      return { score: Math.min(base + boost, 0.85), reason: `description_keywords:${matched.slice(0, 3).join(",")}` };
    }
  }

  // ── Tier 5: URL match (score = 0.75) ──────────────────────────────────────
  if (event.url && rule.target_url) {
    try {
      const eventHost = new URL(event.url).hostname;
      const targetHost = new URL(rule.target_url).hostname;
      if (eventHost === targetHost || event.url.includes(rule.target_url)) {
        return { score: 0.75, reason: `url_match:${rule.target_url}` };
      }
    } catch {
      if (event.url.includes(rule.target_url)) {
        return { score: 0.75, reason: `url_match:${rule.target_url}` };
      }
    }
  }

  // ── Tier 6: Payload deep match for webhook/cloudtrail ────────────────────
  if (event.payload && patterns.length > 0) {
    const payloadStr = JSON.stringify(event.payload).toLowerCase();
    const matched = patterns.filter(p => payloadStr.includes(p.toLowerCase()));
    if (matched.length >= 2) {
      return { score: 0.60, reason: `payload_keywords:${matched.slice(0, 3).join(",")}` };
    }
  }

  return { score: 0, reason: "no_match" };
}

function riskLevelToSeverity(risk: RiskLevel): Severity {
  switch (risk) {
    case "high":   return "critical";
    case "medium": return "high";
    case "low":    return "medium";
  }
}

function buildAlertTitle(rule: StoredRule, event: RawEvent): string {
  // Use pre-classified title if available and meaningful
  if (event.title && event.title.length > 5 && !event.title.startsWith("[E2E")) {
    return event.title;
  }
  // Try the template engine for a better title
  const facts: RawFacts = {
    event_name: event.event_name,
    vendor_slug: event.vendor_slug,
    source: event.source,
    snippet: event.description?.slice(0, 200),
  };
  const { fn } = lookupTemplate(facts, rule.risk_category, rule.detection_method);
  const out = fn(facts);
  if (out.title && !out.title.includes("change detected") && out.title.length > 8) {
    return out.title;
  }
  // Fall back to rule-based title
  const categoryLabel: Record<string, string> = {
    pricing: "💰 Pricing Change",
    legal: "⚖️ Legal/Policy Update",
    operational: "🔧 Operational Change",
    security: "🔒 Security Alert",
    vendor_risk: "🏢 Vendor Risk",
  };
  const label = categoryLabel[rule.risk_category] ?? "⚡ Change Detected";
  const vendor = rule.vendor_slug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  return `${label} — ${vendor}`;
}

function buildAlertSummary(rule: StoredRule, event: RawEvent, matchReason: string): string {
  // Use template engine for plain-English summary
  const facts: RawFacts = {
    event_name: event.event_name,
    vendor_slug: event.vendor_slug,
    vendor_display: event.vendor_slug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    source: event.source,
    snippet: event.description?.slice(0, 200),
    rule_name: rule.rule_name,
    rule_category: rule.risk_category,
    match_reason: matchReason,
  };
  const { fn } = lookupTemplate(facts, rule.risk_category, rule.detection_method);
  const out = fn(facts);
  // Return template summary; impact and action are stored separately (see evaluateAndGenerateAlerts)
  return out.summary;
}

// ─── Core Rule Engine ────────────────────────────────────────────────────────

/**
 * Evaluate a single event against all applicable rules.
 * Returns matches sorted by score descending.
 */
export async function evaluateEvent(
  event: RawEvent,
  opts: {
    orgId?: string;
    checkDedup?: boolean;
    minScore?: number;
    forceRefreshRules?: boolean;
  } = {}
): Promise<EvaluationResult> {
  const t0 = Date.now();
  const { minScore = 0, orgId, checkDedup = false } = opts;

  // Load rules (from cache or Supabase)
  await loadRules(opts.forceRefreshRules);

  // Get rules for this vendor
  const vendorRules = ruleCacheByVendor.get(event.vendor_slug) ?? [];

  const matches: RuleMatch[] = [];
  let dedupedCount = 0;

  for (const rule of vendorRules) {
    // Filter by detection method compatibility
    if (!isDetectionMethodCompatible(rule.detection_method, event.source)) continue;

    // Score the event against this rule
    const { score, reason } = scoreEvent(rule, event);
    if (score < rule.confidence_threshold || score < minScore || score === 0) continue;

    // Dedup check (optional, requires orgId)
    let shouldDedup = false;
    if (checkDedup && orgId) {
      shouldDedup = await checkDeduplication(orgId, buildAlertTitle(rule, event), rule.dedup_window_hours);
      if (shouldDedup) {
        dedupedCount++;
        continue;
      }
    }

    const effectiveRiskLevel = score >= 0.9 ? rule.risk_level : (
      score >= 0.7 ? rule.risk_level :
      (rule.risk_level === "high" ? "medium" : rule.risk_level) as RiskLevel
    );

    matches.push({
      rule,
      score,
      match_reason: reason,
      risk_level: effectiveRiskLevel,
      risk_category: rule.risk_category,
      severity: riskLevelToSeverity(effectiveRiskLevel),
      title: buildAlertTitle(rule, event),
      summary: buildAlertSummary(rule, event, reason),
      should_deduplicate: shouldDedup,
    });
  }

  // Sort by score DESC, then priority DESC
  matches.sort((a, b) =>
    b.score !== a.score ? b.score - a.score : b.rule.priority - a.rule.priority
  );

  const latencyMs = Date.now() - t0;

  return {
    event,
    matches,
    top_match: matches[0] ?? null,
    evaluated_rules: vendorRules.length,
    matched_rules: matches.length,
    deduped_rules: dedupedCount,
    latency_ms: latencyMs,
  };
}

/**
 * Evaluate and generate alerts for an org based on a batch of raw events.
 * Returns new alert rows ready to insert into crr_org_alerts.
 */
export async function evaluateAndGenerateAlerts(
  orgId: string,
  events: RawEvent[],
  opts: { deduplicate?: boolean; maxAlertsPerEvent?: number } = {}
): Promise<Array<{
  org_id: string;
  diff_id: string | null;
  vendor_slug: string;
  risk_level: string;
  risk_category: string;
  severity: string;
  title: string;
  summary: string;
  impact_text: string;
  action_text: string;
  source_url: string;
  rule_id: string | null;
  rule_name: string | null;
  rule_score: number | null;
  confidence: number | null;
  raw_facts: RawFacts | null;
  template_key: string | null;
  summary_method: string;
  detection_method: string | null;
}>> {
  const { deduplicate = true, maxAlertsPerEvent = 1 } = opts;
  const alertRows = [];

  for (const event of events) {
    const result = await evaluateEvent(event, {
      orgId,
      checkDedup: deduplicate,
    });

    const topMatches = result.matches.slice(0, maxAlertsPerEvent);
    for (const match of topMatches) {
      // Build RawFacts from the event for audit trail
      const facts: RawFacts = diffToFacts({
        id: event.diff_id,
        vendor_slug: event.vendor_slug,
        title: event.title,
        description: event.description,
        source_url: event.url,
        risk_category: match.risk_category,
        detection_method: match.rule.detection_method,
      });
      // Merge in event-specific facts
      if (event.event_name) facts.event_name = event.event_name;
      if (event.payload) {
        const p = event.payload as Record<string, unknown>;
        if (p.aws_user_name) facts.aws_user_name = p.aws_user_name as string;
        if (p.aws_region) facts.aws_region = p.aws_region as string;
        if (p.aws_source_ip) facts.aws_source_ip = p.aws_source_ip as string;
        if (p.trail_name) facts.trail_name = p.trail_name as string;
        if (p.bucket_name) facts.bucket_name = p.bucket_name as string;
        if (p.workspace_actor) facts.workspace_actor = p.workspace_actor as string;
        if (p.workspace_target) facts.workspace_target = p.workspace_target as string;
      }
      facts.rule_id = match.rule.id;
      facts.rule_name = match.rule.rule_name;
      facts.confidence_score = match.score;
      facts.match_reason = match.match_reason;

      // Get full template output (title + summary + impact + action)
      const { fn, key } = lookupTemplate(facts, match.risk_category, match.rule.detection_method);
      const templateOut = fn(facts);

      alertRows.push({
        org_id: orgId,
        diff_id: event.diff_id ?? null,
        vendor_slug: event.vendor_slug,
        risk_level: match.risk_level,
        risk_category: match.risk_category,
        severity: match.severity,
        title: templateOut.title !== "generic" ? templateOut.title : match.title,
        summary: templateOut.summary,
        impact_text: templateOut.impact,
        action_text: templateOut.action,
        source_url: event.url ?? "",
        rule_id: match.rule.id,
        rule_name: match.rule.rule_name,
        rule_score: match.score,
        confidence: Math.round(match.score * 1000) / 1000,
        raw_facts: facts,
        template_key: key,
        summary_method: "template",
        detection_method: match.rule.detection_method,
      });

      // Record rule trigger in background (don't await to keep latency low)
      recordRuleTrigger(match.rule.id, match.score).catch(() => null);
    }
  }

  return alertRows;
}

/** Batch evaluate multiple events — used by the alert generation cron */
export async function batchEvaluate(
  events: RawEvent[],
  opts: { minScore?: number } = {}
): Promise<EvaluationResult[]> {
  // Pre-load rules once for the whole batch
  await loadRules();
  return Promise.all(events.map(e => evaluateEvent(e, opts)));
}

// ─── Utility helpers ─────────────────────────────────────────────────────────

function isDetectionMethodCompatible(method: DetectionMethod, source: RawEvent["source"]): boolean {
  switch (source) {
    case "stripe":
      return method === "webhook_event" || method === "pricing_page_diff" ||
             method === "changelog_scrape" || method === "tos_diff" || method === "trust_page_diff";
    case "workspace":
      return method === "webhook_event" || method === "changelog_scrape";
    case "cloudtrail":
      return method === "cloudtrail_event";
    case "tos_url":
      return method === "tos_diff" || method === "pricing_page_diff";
    case "observatory":
      return method !== "webhook_event" && method !== "cloudtrail_event";
    case "custom":
      return true;
  }
}

async function checkDeduplication(
  orgId: string,
  title: string,
  dedupWindowHours: number
): Promise<boolean> {
  const cutoff = new Date(Date.now() - dedupWindowHours * 3600 * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from("crr_org_alerts")
    .select("id")
    .eq("org_id", orgId)
    .eq("title", title)
    .gte("created_at", cutoff)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

async function recordRuleTrigger(ruleId: string, score: number): Promise<void> {
  try {
    await supabaseAdmin.rpc("record_rule_trigger", {
      p_rule_id: ruleId,
      p_confidence_score: score,
    });
  } catch {
    // Fallback: direct update
    try {
      await supabaseAdmin
        .from("crr_rule_templates")
        .update({ last_triggered_at: new Date().toISOString() })
        .eq("id", ruleId);
    } catch { /* ignore */ }
  }
}

// ─── Quick stats for API responses ───────────────────────────────────────────

export interface RuleEngineStats {
  total_rules: number;
  active_rules: number;
  by_vendor: Record<string, number>;
  by_method: Record<string, number>;
  by_category: Record<string, number>;
  by_risk_level: Record<string, number>;
  with_trigger_events: number;
  with_signal: number;
  cache_age_seconds: number;
}

export async function getRuleEngineStats(): Promise<RuleEngineStats> {
  const rules = await loadRules();
  const byVendor: Record<string, number> = {};
  const byMethod: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byRisk: Record<string, number> = {};
  let withTriggerEvents = 0;
  let withSignal = 0;

  for (const r of rules) {
    byVendor[r.vendor_slug] = (byVendor[r.vendor_slug] ?? 0) + 1;
    byMethod[r.detection_method] = (byMethod[r.detection_method] ?? 0) + 1;
    byCategory[r.risk_category] = (byCategory[r.risk_category] ?? 0) + 1;
    byRisk[r.risk_level] = (byRisk[r.risk_level] ?? 0) + 1;
    if (r.trigger_event_names?.length > 0) withTriggerEvents++;
    if (r.sample_reactions > 0) withSignal++;
  }

  // Get total (including inactive) from DB
  const { count } = await supabaseAdmin
    .from("crr_rule_templates")
    .select("*", { count: "exact", head: true });

  return {
    total_rules: count ?? rules.length,
    active_rules: rules.length,
    by_vendor: byVendor,
    by_method: byMethod,
    by_category: byCategory,
    by_risk_level: byRisk,
    with_trigger_events: withTriggerEvents,
    with_signal: withSignal,
    cache_age_seconds: Math.round((Date.now() - ruleCacheLoadedAt) / 1000),
  };
}

/**
 * Convert a crr_diffs row into a RawEvent for rule evaluation.
 */
export function diffToRawEvent(diff: {
  id: string;
  vendor_slug: string;
  title: string;
  description: string;
  risk_level?: string;
  risk_category?: string;
  source_url?: string;
  detection_method?: string;
}): RawEvent {
  const method = diff.detection_method as string | undefined;
  const source: RawEvent["source"] =
    method === "tos_diff" ? "tos_url" :
    method === "cloudtrail_event" ? "cloudtrail" :
    method === "webhook_event" ? "stripe" :
    "observatory";

  return {
    source,
    vendor_slug: diff.vendor_slug,
    title: diff.title,
    description: diff.description,
    url: diff.source_url,
    risk_level: diff.risk_level as RiskLevel | undefined,
    risk_category: diff.risk_category as RiskCategory | undefined,
    diff_id: diff.id,
  };
}
