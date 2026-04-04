/**
 * Rule Refinement Engine
 *
 * Computes precision/recall proxies for each rule template dimension
 * from live telemetry (reactions, snooze rates, duplicate rates).
 *
 * Metric definitions:
 *   precision_proxy  = (engaged - fp) / engaged     — signal quality
 *   recall_proxy     = engaged / total_reactions     — coverage (how often the rule fires something that gets noticed)
 *   fp_rate_proxy    = not_useful / total_reactions  — noise level
 *   engagement_rate  = (useful+ack+snooze) / total   — overall engagement
 *   snooze_rate      = snooze / total                 — deferred-but-real
 *   duplicate_rate   = duplicate_tag_count / total    — overlap with other rules
 *
 * Refinement actions (applied to rule templates):
 *   boost       — increase priority +1, lower confidence threshold by 0.05
 *   downgrade   — decrease priority -1, raise confidence threshold by 0.1
 *   dedup       — reduce dedup_window_hours and add match-pattern uniqueness
 *   merge       — flag for review (rules producing overlapping alerts)
 *   keep        — no change, within acceptable ranges
 *   investigate — anomalous FP rate, needs manual review
 *   disable     — FP rate > 50% and low engagement — should be turned off
 */

import { supabaseAdmin } from "./supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReactionSignal {
  vendor_slug: string;
  risk_category: string;
  risk_level: string;
  detection_method: string;
  total_reactions: number;
  useful: number;
  acknowledge: number;
  snooze: number;
  not_useful: number;
  reason_tags: Record<string, number>;
  // computed
  precision_proxy: number;
  recall_proxy: number;
  fp_rate_proxy: number;
  engagement_rate: number;
  snooze_rate: number;
  duplicate_rate: number;
}

export interface RuleMetrics {
  rule_id: string;
  rule_name: string;
  vendor_slug: string;
  risk_category: string;
  risk_level: string;
  detection_method: string;
  current_priority: number;
  current_confidence: number;
  current_dedup_hours: number;
  // from telemetry
  signal: ReactionSignal | null;
  // recommended changes
  recommended_action: "boost" | "downgrade" | "dedup" | "merge" | "keep" | "investigate" | "disable";
  recommended_priority: number;
  recommended_confidence: number;
  recommended_dedup_hours: number;
  refinement_rationale: string;
  confidence_delta: number;
  priority_delta: number;
}

export interface RefinementSummary {
  run_at: string;
  total_rules: number;
  rules_refined: number;
  actions: Record<string, number>;
  signal_coverage: number;  // fraction of rules with ≥1 reaction signal
  overall_precision: number;
  overall_fp_rate: number;
  overall_engagement: number;
  high_value_signals: string[];  // reason tags that are 100% useful
  noise_signals: string[];        // reason tags with high FP rate
  rules: RuleMetrics[];
}

// ── Signal computation ────────────────────────────────────────────────────────

function computeSignal(
  reactions: Array<{
    reaction: string;
    reason_tag: string | null;
    risk_category: string;
    risk_level: string;
    vendor_slug: string;
    detection_method: string;
  }>,
  vendorSlug: string,
  riskCategory: string,
  riskLevel: string,
  detectionMethod: string
): ReactionSignal {
  // Match reactions by vendor+category (detection_method as secondary match)
  const matched = reactions.filter(r =>
    r.vendor_slug === vendorSlug && r.risk_category === riskCategory
  );

  const total = matched.length;
  const useful = matched.filter(r => r.reaction === "useful").length;
  const acknowledge = matched.filter(r => r.reaction === "acknowledge").length;
  const snooze = matched.filter(r => r.reaction === "snooze").length;
  const not_useful = matched.filter(r => r.reaction === "not_useful").length;

  const reason_tags: Record<string, number> = {};
  for (const r of matched) {
    if (r.reason_tag) reason_tags[r.reason_tag] = (reason_tags[r.reason_tag] || 0) + 1;
  }

  const engaged = useful + acknowledge + snooze;
  const duplicate_count = reason_tags.duplicate ?? 0;

  const precision_proxy = engaged > 0 ? Math.max(0, (engaged - not_useful)) / engaged : 0;
  const recall_proxy = total > 0 ? engaged / total : 0;
  const fp_rate_proxy = total > 0 ? not_useful / total : 0;
  const engagement_rate = total > 0 ? engaged / total : 0;
  const snooze_rate = total > 0 ? snooze / total : 0;
  const duplicate_rate = total > 0 ? duplicate_count / total : 0;

  return {
    vendor_slug: vendorSlug,
    risk_category: riskCategory,
    risk_level: riskLevel,
    detection_method: detectionMethod,
    total_reactions: total,
    useful,
    acknowledge,
    snooze,
    not_useful,
    reason_tags,
    precision_proxy: Math.round(precision_proxy * 10000) / 10000,
    recall_proxy: Math.round(recall_proxy * 10000) / 10000,
    fp_rate_proxy: Math.round(fp_rate_proxy * 10000) / 10000,
    engagement_rate: Math.round(engagement_rate * 10000) / 10000,
    snooze_rate: Math.round(snooze_rate * 10000) / 10000,
    duplicate_rate: Math.round(duplicate_rate * 10000) / 10000,
  };
}

// ── Refinement rules ──────────────────────────────────────────────────────────

type RefinementAction = "boost" | "downgrade" | "dedup" | "merge" | "keep" | "investigate" | "disable";

function computeRefinement(
  rule: {
    id: string;
    rule_name: string;
    vendor_slug: string;
    risk_category: string;
    risk_level: string;
    detection_method: string;
    priority: number;
    confidence_threshold: number | null;
    dedup_window_hours: number | null;
  },
  signal: ReactionSignal | null
): {
  action: RefinementAction;
  priority: number;
  confidence: number;
  dedup_hours: number;
  rationale: string;
  priority_delta: number;
  confidence_delta: number;
} {
  const currentPriority = rule.priority ?? 3;
  const currentConfidence = rule.confidence_threshold ?? 0.5;
  const currentDedup = rule.dedup_window_hours ?? 24;

  // No telemetry yet — keep defaults
  if (!signal || signal.total_reactions === 0) {
    return {
      action: "keep",
      priority: currentPriority,
      confidence: currentConfidence,
      dedup_hours: currentDedup,
      rationale: "No reactions yet. Keeping defaults pending user feedback.",
      priority_delta: 0,
      confidence_delta: 0,
    };
  }

  const fp = signal.fp_rate_proxy;
  const eng = signal.engagement_rate;
  const snooze = signal.snooze_rate;
  const dup = signal.duplicate_rate;
  const prec = signal.precision_proxy;

  // DISABLE: very high FP, very low engagement
  if (fp > 0.5 && eng < 0.2) {
    const newConf = Math.min(1.0, currentConfidence + 0.2);
    return {
      action: "disable",
      priority: Math.max(1, currentPriority - 2),
      confidence: newConf,
      dedup_hours: currentDedup,
      rationale: `High FP rate (${(fp*100).toFixed(0)}%) + low engagement (${(eng*100).toFixed(0)}%). Recommended for review/disable.`,
      priority_delta: -2,
      confidence_delta: newConf - currentConfidence,
    };
  }

  // INVESTIGATE: FP > 25%
  if (fp > 0.25) {
    const newConf = Math.min(0.95, currentConfidence + 0.1);
    return {
      action: "investigate",
      priority: Math.max(1, currentPriority - 1),
      confidence: newConf,
      dedup_hours: currentDedup,
      rationale: `Elevated FP rate (${(fp*100).toFixed(0)}%). Raise confidence threshold to reduce noise. Manual review of match_patterns recommended.`,
      priority_delta: -1,
      confidence_delta: newConf - currentConfidence,
    };
  }

  // DEDUP: duplicate rate > 10%
  if (dup > 0.1) {
    const newDedup = Math.min(168, currentDedup * 2);  // double dedup window, max 1 week
    return {
      action: "dedup",
      priority: currentPriority,
      confidence: currentConfidence,
      dedup_hours: newDedup,
      rationale: `Duplicate signal rate (${(dup*100).toFixed(0)}%). Double dedup window from ${currentDedup}h → ${newDedup}h. Consider merging overlapping rules.`,
      priority_delta: 0,
      confidence_delta: 0,
    };
  }

  // BOOST: high precision + high engagement + low snooze
  if (prec >= 0.95 && eng >= 0.7 && snooze < 0.15) {
    const newConf = Math.max(0.3, currentConfidence - 0.05);
    const newPriority = Math.min(5, currentPriority + 1);
    return {
      action: "boost",
      priority: newPriority,
      confidence: newConf,
      dedup_hours: currentDedup,
      rationale: `High precision (${(prec*100).toFixed(0)}%) + high engagement (${(eng*100).toFixed(0)}%) + low snooze (${(snooze*100).toFixed(0)}%). Boost priority and lower detection threshold.`,
      priority_delta: newPriority - currentPriority,
      confidence_delta: newConf - currentConfidence,
    };
  }

  // DOWNGRADE: high snooze rate (mostly deferred), low urgency
  if (snooze > 0.3 && prec < 0.8) {
    const newConf = Math.min(0.8, currentConfidence + 0.05);
    const newPriority = Math.max(1, currentPriority - 1);
    return {
      action: "downgrade",
      priority: newPriority,
      confidence: newConf,
      dedup_hours: currentDedup,
      rationale: `High snooze rate (${(snooze*100).toFixed(0)}%) suggests lower urgency. Reduce priority. Users are acknowledging but delaying action.`,
      priority_delta: newPriority - currentPriority,
      confidence_delta: newConf - currentConfidence,
    };
  }

  // KEEP: acceptable range
  return {
    action: "keep",
    priority: currentPriority,
    confidence: currentConfidence,
    dedup_hours: currentDedup,
    rationale: `Within acceptable ranges. Precision=${(prec*100).toFixed(0)}% FP=${(fp*100).toFixed(0)}% Engagement=${(eng*100).toFixed(0)}%. No changes needed.`,
    priority_delta: 0,
    confidence_delta: 0,
  };
}

// ── Main refinement runner ────────────────────────────────────────────────────

export async function runRuleRefinement(dryRun = false): Promise<RefinementSummary> {
  const runAt = new Date().toISOString();

  // Load all rule templates
  const { data: rulesRaw } = await supabaseAdmin
    .from("crr_rule_templates")
    .select("*")
    .order("vendor_slug");

  const rules = rulesRaw ?? [];

  // Load all reactions with joined alert data
  const { data: reactionsRaw } = await supabaseAdmin
    .from("crr_alert_reactions")
    .select("reaction, reason_tag, snoozed_until, alert_id");

  const { data: alertsRaw } = await supabaseAdmin
    .from("crr_org_alerts")
    .select("id, vendor_slug, risk_level, risk_category");

  const alertMap = new Map((alertsRaw ?? []).map(a => [a.id, a]));
  const reactions = (reactionsRaw ?? []).map(r => {
    const alert = alertMap.get(r.alert_id) ?? {};
    return {
      reaction: r.reaction,
      reason_tag: r.reason_tag as string | null,
      vendor_slug: (alert as { vendor_slug?: string }).vendor_slug ?? "unknown",
      risk_category: (alert as { risk_category?: string }).risk_category ?? "unknown",
      risk_level: (alert as { risk_level?: string }).risk_level ?? "unknown",
      detection_method: "",  // approximated from rule match
    };
  });

  // Global telemetry aggregates for reason-tag signal analysis
  const allReasonTags: Record<string, { useful: number; not_useful: number; snooze: number; acknowledge: number }> = {};
  for (const r of reactions) {
    if (r.reason_tag) {
      if (!allReasonTags[r.reason_tag]) allReasonTags[r.reason_tag] = { useful: 0, not_useful: 0, snooze: 0, acknowledge: 0 };
      const bucket = allReasonTags[r.reason_tag] as Record<string, number>;
      if (bucket[r.reaction] !== undefined) bucket[r.reaction]++;
    }
  }

  const highValueSignals = Object.entries(allReasonTags)
    .filter(([, v]) => v.useful > 0 && v.not_useful === 0 && v.useful + v.acknowledge >= 3)
    .sort((a, b) => (b[1].useful + b[1].acknowledge) - (a[1].useful + a[1].acknowledge))
    .map(([tag]) => tag);

  const noiseSignals = Object.entries(allReasonTags)
    .filter(([, v]) => v.not_useful > v.useful)
    .map(([tag]) => tag);

  // Build unique dimension keys for reaction aggregation
  const ruleMetrics: RuleMetrics[] = [];
  const updates: Array<{ id: string; updates: Record<string, unknown> }> = [];

  for (const rule of rules) {
    const signal = computeSignal(
      reactions,
      rule.vendor_slug,
      rule.risk_category,
      rule.risk_level,
      rule.detection_method
    );

    const refinement = computeRefinement(
      {
        id: rule.id,
        rule_name: rule.rule_name,
        vendor_slug: rule.vendor_slug,
        risk_category: rule.risk_category,
        risk_level: rule.risk_level,
        detection_method: rule.detection_method,
        priority: rule.priority ?? 3,
        confidence_threshold: rule.confidence_threshold,
        dedup_window_hours: rule.dedup_window_hours,
      },
      signal.total_reactions > 0 ? signal : null
    );

    const metric: RuleMetrics = {
      rule_id: rule.id,
      rule_name: rule.rule_name,
      vendor_slug: rule.vendor_slug,
      risk_category: rule.risk_category,
      risk_level: rule.risk_level,
      detection_method: rule.detection_method,
      current_priority: rule.priority ?? 3,
      current_confidence: rule.confidence_threshold ?? 0.5,
      current_dedup_hours: rule.dedup_window_hours ?? 24,
      signal: signal.total_reactions > 0 ? signal : null,
      recommended_action: refinement.action,
      recommended_priority: refinement.priority,
      recommended_confidence: refinement.confidence,
      recommended_dedup_hours: refinement.dedup_hours,
      refinement_rationale: refinement.rationale,
      confidence_delta: refinement.confidence_delta,
      priority_delta: refinement.priority_delta,
    };

    ruleMetrics.push(metric);

    if (!dryRun) {
      const patch: Record<string, unknown> = {
        confidence_threshold: refinement.confidence,
        dedup_window_hours: refinement.dedup_hours,
        precision_proxy: signal.total_reactions > 0 ? signal.precision_proxy : null,
        recall_proxy: signal.total_reactions > 0 ? signal.recall_proxy : null,
        fp_rate_proxy: signal.total_reactions > 0 ? signal.fp_rate_proxy : null,
        engagement_rate: signal.total_reactions > 0 ? signal.engagement_rate : null,
        snooze_rate: signal.total_reactions > 0 ? signal.snooze_rate : null,
        duplicate_rate: signal.total_reactions > 0 ? signal.duplicate_rate : null,
        sample_reactions: signal.total_reactions,
        last_refined_at: runAt,
        refinement_notes: refinement.rationale,
        refinement_action: refinement.action,
        priority: refinement.priority,
      };
      updates.push({ id: rule.id, updates: patch });
    }
  }

  // Apply updates in batches
  if (!dryRun && updates.length > 0) {
    for (const upd of updates) {
      await supabaseAdmin
        .from("crr_rule_templates")
        .update(upd.updates)
        .eq("id", upd.id);
    }
  }

  // Summary stats
  const actionCounts: Record<string, number> = {};
  for (const m of ruleMetrics) actionCounts[m.recommended_action] = (actionCounts[m.recommended_action] || 0) + 1;

  const rulesWithSignal = ruleMetrics.filter(m => m.signal !== null);
  const totalRx = reactions.length;
  const engagedRx = reactions.filter(r => ["useful", "acknowledge", "snooze"].includes(r.reaction)).length;
  const fpRx = reactions.filter(r => r.reaction === "not_useful").length;

  return {
    run_at: runAt,
    total_rules: rules.length,
    rules_refined: updates.length,
    actions: actionCounts,
    signal_coverage: rules.length > 0 ? rulesWithSignal.length / rules.length : 0,
    overall_precision: totalRx > 0 ? (engagedRx - fpRx) / Math.max(engagedRx, 1) : 0,
    overall_fp_rate: totalRx > 0 ? fpRx / totalRx : 0,
    overall_engagement: totalRx > 0 ? engagedRx / totalRx : 0,
    high_value_signals: highValueSignals,
    noise_signals: noiseSignals,
    rules: ruleMetrics,
  };
}

// ── Telemetry aggregation (public) ────────────────────────────────────────────

export async function getReactionTelemetry(): Promise<{
  by_vendor: Record<string, { precision: number; fp_rate: number; engagement: number; snooze_rate: number; total: number }>;
  by_category: Record<string, { precision: number; fp_rate: number; engagement: number; total: number }>;
  by_detection_method: Record<string, { precision: number; fp_rate: number; total: number }>;
  by_reason_tag: Record<string, { reaction_breakdown: Record<string, number>; signal_type: "high_value" | "noise" | "neutral" }>;
  by_risk_level: Record<string, { precision: number; fp_rate: number; total: number }>;
  duplicate_alert_pairs: number;
  overall: {
    precision_proxy: number;
    recall_proxy: number;
    fp_rate: number;
    engagement_rate: number;
    snooze_rate: number;
    duplicate_rate: number;
    sample_size: number;
  };
}> {
  const { data: reactionsRaw } = await supabaseAdmin
    .from("crr_alert_reactions")
    .select("reaction, reason_tag, snoozed_until, alert_id");

  const { data: alertsRaw } = await supabaseAdmin
    .from("crr_org_alerts")
    .select("id, vendor_slug, risk_level, risk_category");

  const alertMap = new Map((alertsRaw ?? []).map(a => [a.id, a]));
  const enriched = (reactionsRaw ?? []).map(r => {
    const alert = alertMap.get(r.alert_id) ?? {};
    return {
      ...r,
      vendor_slug: (alert as { vendor_slug?: string }).vendor_slug ?? "unknown",
      risk_category: (alert as { risk_category?: string }).risk_category ?? "unknown",
      risk_level: (alert as { risk_level?: string }).risk_level ?? "unknown",
    };
  });

  const total = enriched.length;
  const useful = enriched.filter(r => r.reaction === "useful").length;
  const ack = enriched.filter(r => r.reaction === "acknowledge").length;
  const snooze = enriched.filter(r => r.reaction === "snooze").length;
  const not_useful = enriched.filter(r => r.reaction === "not_useful").length;
  const engaged = useful + ack + snooze;
  const dupCount = enriched.filter(r => r.reason_tag === "duplicate").length;

  function groupStats(rows: typeof enriched) {
    const t = rows.length;
    const u = rows.filter(r => r.reaction === "useful").length;
    const a = rows.filter(r => r.reaction === "acknowledge").length;
    const s = rows.filter(r => r.reaction === "snooze").length;
    const fp = rows.filter(r => r.reaction === "not_useful").length;
    const e = u + a + s;
    return {
      precision: t > 0 ? Math.round((e > 0 ? (e - fp) / e : 0) * 1000) / 1000 : 0,
      fp_rate: t > 0 ? Math.round((fp / t) * 1000) / 1000 : 0,
      engagement: t > 0 ? Math.round((e / t) * 1000) / 1000 : 0,
      snooze_rate: t > 0 ? Math.round((s / t) * 1000) / 1000 : 0,
      total: t,
    };
  }

  // By vendor
  const vendors = [...new Set(enriched.map(r => r.vendor_slug))];
  const by_vendor: Record<string, ReturnType<typeof groupStats>> = {};
  for (const v of vendors) by_vendor[v] = groupStats(enriched.filter(r => r.vendor_slug === v));

  // By category
  const cats = [...new Set(enriched.map(r => r.risk_category))];
  const by_category: Record<string, ReturnType<typeof groupStats>> = {};
  for (const c of cats) by_category[c] = groupStats(enriched.filter(r => r.risk_category === c));

  // By risk_level
  const levels = [...new Set(enriched.map(r => r.risk_level))];
  const by_risk_level: Record<string, ReturnType<typeof groupStats>> = {};
  for (const l of levels) by_risk_level[l] = groupStats(enriched.filter(r => r.risk_level === l));

  // By detection method (approximate from alertMap)
  const by_detection_method: Record<string, ReturnType<typeof groupStats>> = {};

  // By reason tag
  const allTags = [...new Set(enriched.map(r => r.reason_tag).filter(Boolean))] as string[];
  const by_reason_tag: Record<string, { reaction_breakdown: Record<string, number>; signal_type: "high_value" | "noise" | "neutral" }> = {};
  for (const tag of allTags) {
    const tagRows = enriched.filter(r => r.reason_tag === tag);
    const rb: Record<string, number> = {};
    for (const r of tagRows) rb[r.reaction] = (rb[r.reaction] || 0) + 1;
    const fpCount = rb.not_useful ?? 0;
    const useCount = (rb.useful ?? 0) + (rb.acknowledge ?? 0);
    const signalType: "high_value" | "noise" | "neutral" = fpCount > useCount ? "noise" : fpCount === 0 && useCount > 0 ? "high_value" : "neutral";
    by_reason_tag[tag] = { reaction_breakdown: rb, signal_type: signalType };
  }

  return {
    by_vendor,
    by_category,
    by_detection_method,
    by_reason_tag,
    by_risk_level,
    duplicate_alert_pairs: dupCount,
    overall: {
      precision_proxy: total > 0 ? Math.round(((engaged - not_useful) / Math.max(engaged, 1)) * 10000) / 10000 : 0,
      recall_proxy: total > 0 ? Math.round((engaged / total) * 10000) / 10000 : 0,
      fp_rate: total > 0 ? Math.round((not_useful / total) * 10000) / 10000 : 0,
      engagement_rate: total > 0 ? Math.round((engaged / total) * 10000) / 10000 : 0,
      snooze_rate: total > 0 ? Math.round((snooze / total) * 10000) / 10000 : 0,
      duplicate_rate: total > 0 ? Math.round((dupCount / total) * 10000) / 10000 : 0,
      sample_size: total,
    },
  };
}
