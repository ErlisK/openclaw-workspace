import { NextRequest, NextResponse } from "next/server";
import {
  evaluateEvent,
  batchEvaluate,
  getRuleEngineStats,
  invalidateRuleCache,
  diffToRawEvent,
  type RawEvent,
} from "@/lib/rule-engine";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/rules/evaluate
 * Routes:
 *   ?mode=stats          → rule engine stats (rule counts, cache state)
 *   ?mode=test&event=... → test evaluate a synthetic event
 *   ?vendor=stripe       → list rules for a vendor
 *   ?diff_id=uuid        → evaluate a specific diff against all rules
 */
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode");
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  const token = req.headers.get("x-org-token") || req.nextUrl.searchParams.get("token");
  const isAdmin = auth === `Bearer ${secret}`;
  const isOrg = token != null;

  if (!isAdmin && !isOrg) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Stats mode
  if (mode === "stats") {
    const stats = await getRuleEngineStats();
    return NextResponse.json(stats);
  }

  // Cache invalidation
  if (mode === "refresh") {
    invalidateRuleCache();
    const stats = await getRuleEngineStats();
    return NextResponse.json({ ok: true, refreshed: true, ...stats });
  }

  // Evaluate a specific diff by ID
  const diffId = req.nextUrl.searchParams.get("diff_id");
  if (diffId) {
    const { data: diff } = await supabaseAdmin
      .from("crr_diffs")
      .select("*")
      .eq("id", diffId)
      .single();

    if (!diff) return NextResponse.json({ error: "Diff not found" }, { status: 404 });

    const event = diffToRawEvent(diff);
    const result = await evaluateEvent(event);
    return NextResponse.json({
      diff_id: diffId,
      vendor_slug: diff.vendor_slug,
      input_risk: diff.risk_level,
      input_category: diff.risk_category,
      result,
    });
  }

  // Test mode: evaluate a synthetic event
  if (mode === "test") {
    const vendor = req.nextUrl.searchParams.get("vendor") ?? "stripe";
    const eventName = req.nextUrl.searchParams.get("event_name") ?? undefined;
    const title = req.nextUrl.searchParams.get("title") ?? undefined;

    const testEvent: RawEvent = {
      source: vendor === "aws" ? "cloudtrail" : vendor === "google-workspace" ? "workspace" : "stripe",
      vendor_slug: vendor,
      event_name: eventName,
      title,
    };

    const result = await evaluateEvent(testEvent);
    return NextResponse.json({ test_event: testEvent, ...result });
  }

  // Stats by default
  const stats = await getRuleEngineStats();
  return NextResponse.json(stats);
}

/**
 * POST /api/rules/evaluate
 * Evaluate one or more raw events against the rule engine.
 *
 * Body: { event: RawEvent } or { events: RawEvent[] }
 * Returns matches with score, risk_level, title, summary.
 *
 * Optional org-scoped dedup: include org_id (admin) or use X-Org-Token header
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  const token = req.headers.get("x-org-token") || req.nextUrl.searchParams.get("token");

  let orgId: string | null = null;
  const isAdmin = auth === `Bearer ${secret}`;

  if (!isAdmin && token) {
    const { data: org } = await supabaseAdmin
      .from("crr_orgs")
      .select("id")
      .eq("magic_token", token)
      .eq("status", "active")
      .single();
    orgId = org?.id ?? null;
  } else if (isAdmin) {
    const body = await req.json().catch(() => ({}));
    orgId = body.org_id ?? null;

    if (body.events) {
      // Batch evaluation
      const results = await batchEvaluate(body.events, { minScore: body.min_score ?? 0 });
      return NextResponse.json({
        batch: true,
        events_evaluated: results.length,
        total_matches: results.reduce((s, r) => s + r.matched_rules, 0),
        results: results.map(r => ({
          vendor_slug: r.event.vendor_slug,
          event_name: r.event.event_name,
          matched_rules: r.matched_rules,
          top_match: r.top_match ? {
            rule_name: r.top_match.rule.rule_name,
            score: r.top_match.score,
            risk_level: r.top_match.risk_level,
            risk_category: r.top_match.risk_category,
            severity: r.top_match.severity,
            match_reason: r.top_match.match_reason,
          } : null,
        })),
      });
    }

    const { event: rawEvent } = body;
    if (!rawEvent) {
      return NextResponse.json({ error: "event or events required" }, { status: 400 });
    }

    const result = await evaluateEvent(rawEvent as RawEvent, {
      orgId: orgId ?? undefined,
      checkDedup: body.check_dedup ?? false,
      minScore: body.min_score ?? 0,
    });

    return NextResponse.json({
      ...result,
      matches: result.matches.map(m => ({
        rule_id: m.rule.id,
        rule_name: m.rule.rule_name,
        vendor_slug: m.rule.vendor_slug,
        detection_method: m.rule.detection_method,
        score: m.score,
        match_reason: m.match_reason,
        risk_level: m.risk_level,
        risk_category: m.risk_category,
        severity: m.severity,
        title: m.title,
        summary: m.summary,
        confidence_threshold: m.rule.confidence_threshold,
        dedup_window_hours: m.rule.dedup_window_hours,
        priority: m.rule.priority,
      })),
    });
  }

  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const result = await evaluateEvent(body.event as RawEvent, {
    orgId,
    checkDedup: true,
    minScore: 0,
  });

  return NextResponse.json({
    matched_rules: result.matched_rules,
    top_match: result.top_match ? {
      rule_name: result.top_match.rule.rule_name,
      score: result.top_match.score,
      severity: result.top_match.severity,
      risk_level: result.top_match.risk_level,
      risk_category: result.top_match.risk_category,
      title: result.top_match.title,
      summary: result.top_match.summary,
    } : null,
    latency_ms: result.latency_ms,
  });
}
