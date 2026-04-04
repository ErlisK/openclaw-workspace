import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const VALID_REACTIONS = ["useful", "acknowledge", "not_useful", "snooze"];

const VALID_REASON_TAGS: Record<string, string[]> = {
  useful: ["pricing_change", "terms_change", "security_risk", "affects_billing", "affects_api", "operational_impact"],
  acknowledge: ["already_aware", "monitoring", "escalated", "scheduled"],
  snooze: ["investigating", "low_priority_now", "not_applicable", "deferred"],
  not_useful: ["false_positive", "not_applicable", "out_of_scope", "duplicate"],
};

const SNOOZE_DURATIONS: Record<string, number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

async function verifyOrg(req: NextRequest): Promise<string | null> {
  const token = req.headers.get("x-org-token") || req.nextUrl.searchParams.get("token");
  if (!token) return null;
  const { data } = await supabaseAdmin
    .from("crr_orgs")
    .select("id")
    .eq("magic_token", token)
    .eq("status", "active")
    .single();
  return data?.id ?? null;
}

export async function POST(req: NextRequest) {
  const orgId = await verifyOrg(req);
  if (!orgId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { alert_id, reaction, comment, reason_tag, snooze_duration } = body;

  if (!alert_id || !reaction) {
    return NextResponse.json({ error: "alert_id and reaction required" }, { status: 400 });
  }

  if (!VALID_REACTIONS.includes(reaction)) {
    return NextResponse.json({
      error: `reaction must be one of: ${VALID_REACTIONS.join(", ")}`,
    }, { status: 400 });
  }

  if (reason_tag && !VALID_REASON_TAGS[reaction]?.includes(reason_tag)) {
    return NextResponse.json({
      error: `reason_tag '${reason_tag}' not valid for reaction '${reaction}'. Valid: ${VALID_REASON_TAGS[reaction]?.join(", ")}`,
    }, { status: 400 });
  }

  // Verify alert belongs to this org
  const { data: alert } = await supabaseAdmin
    .from("crr_org_alerts")
    .select("id, org_id")
    .eq("id", alert_id)
    .eq("org_id", orgId)
    .single();
  if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });

  // Calculate snooze_until if snooze reaction
  let snoozed_until: string | null = null;
  if (reaction === "snooze") {
    const durationKey = snooze_duration ?? "24h";
    const durationMs = SNOOZE_DURATIONS[durationKey] ?? SNOOZE_DURATIONS["24h"];
    snoozed_until = new Date(Date.now() + durationMs).toISOString();
  }

  // Upsert reaction (one per alert per org)
  const row: Record<string, unknown> = {
    alert_id,
    org_id: orgId,
    reaction,
    comment: comment ?? null,
    reason_tag: reason_tag ?? null,
    snoozed_until,
  };

  const { data: existing } = await supabaseAdmin
    .from("crr_alert_reactions")
    .select("id")
    .eq("alert_id", alert_id)
    .eq("org_id", orgId)
    .single();

  let result;
  if (existing?.id) {
    result = await supabaseAdmin
      .from("crr_alert_reactions")
      .update(row)
      .eq("id", existing.id)
      .select()
      .single();
  } else {
    result = await supabaseAdmin
      .from("crr_alert_reactions")
      .insert(row)
      .select()
      .single();
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  // Mark alert as read
  await supabaseAdmin
    .from("crr_org_alerts")
    .update({ is_read: true })
    .eq("id", alert_id);

  return NextResponse.json({
    ok: true,
    id: result.data?.id,
    reaction,
    reason_tag: reason_tag ?? null,
    snoozed_until,
  });
}

export async function GET(req: NextRequest) {
  const orgId = await verifyOrg(req);
  if (!orgId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const alertId = req.nextUrl.searchParams.get("alert_id");
  const since = req.nextUrl.searchParams.get("since");

  let query = supabaseAdmin
    .from("crr_alert_reactions")
    .select("id, alert_id, reaction, reason_tag, comment, snoozed_until, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (alertId) query = query.eq("alert_id", alertId);
  if (since) query = query.gte("created_at", since);

  const { data, error } = await query.limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Telemetry summary
  const reactions = data ?? [];
  const byType = reactions.reduce((acc: Record<string, number>, r) => {
    acc[r.reaction] = (acc[r.reaction] || 0) + 1;
    return acc;
  }, {});
  const byReason = reactions.reduce((acc: Record<string, number>, r) => {
    if (r.reason_tag) acc[r.reason_tag] = (acc[r.reason_tag] || 0) + 1;
    return acc;
  }, {});
  const engaged = (byType.useful ?? 0) + (byType.acknowledge ?? 0) + (byType.snooze ?? 0);

  return NextResponse.json({
    reactions,
    telemetry: {
      total: reactions.length,
      by_type: byType,
      by_reason_tag: byReason,
      engagement_rate: reactions.length > 0 ? (engaged / reactions.length) : 0,
      fp_rate: reactions.length > 0 ? ((byType.not_useful ?? 0) / reactions.length) : 0,
    },
    meta: {
      valid_reactions: VALID_REACTIONS,
      valid_reason_tags: VALID_REASON_TAGS,
      snooze_durations: Object.keys(SNOOZE_DURATIONS),
    },
  });
}
