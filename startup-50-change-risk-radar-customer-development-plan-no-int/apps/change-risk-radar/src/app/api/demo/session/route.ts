/**
 * POST /api/demo/session — start or update a demo session
 *
 * Tracked in crr_demo_sessions:
 *   session_id, tenant_id, visitor_fp, started_at, last_seen_at,
 *   alert_views, interactions, converted_to_trial, converted_at,
 *   referrer, utm_source, utm_medium, utm_campaign
 *
 * GET /api/demo/session?id= — get session stats
 *
 * No auth required — demos are public.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { trackFunnelEvent } from "@/lib/funnel";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    session_id?: string;
    tenant_id?: string;
    visitor_fp?: string;
    action?: "start" | "view_alert" | "interact" | "convert_trial";
    referrer?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    alert_id?: string;
  };

  const {
    session_id,
    tenant_id = "demo-acme-saas",
    visitor_fp,
    action = "start",
    referrer,
    utm_source,
    utm_medium,
    utm_campaign,
  } = body;

  const now = new Date().toISOString();

  // Start new session
  if (action === "start" || !session_id) {
    const newId = crypto.randomUUID();

    await supabaseAdmin.from("crr_demo_sessions").insert({
      id: newId,
      tenant_id,
      visitor_fp: visitor_fp ?? null,
      started_at: now,
      last_seen_at: now,
      alert_views: 0,
      interactions: 0,
      converted_to_trial: false,
      referrer: referrer ?? null,
      utm_source: utm_source ?? null,
      utm_medium: utm_medium ?? null,
      utm_campaign: utm_campaign ?? null,
    });

  // Funnel event: page_visit (demo start)
    void trackFunnelEvent("page_visit", { source: utm_source ?? "demo", campaign: utm_campaign, properties: { tenant_id } });

    return NextResponse.json({ ok: true, session_id: newId, action: "started" });
  }

  // Update existing session
  if (action === "view_alert") {
    await supabaseAdmin.from("crr_demo_sessions").update({ last_seen_at: now }).eq("id", session_id);
  }

  if (action === "interact") {
    await supabaseAdmin.from("crr_demo_sessions").update({ last_seen_at: now }).eq("id", session_id);
  }

  if (action === "convert_trial") {
    await supabaseAdmin.from("crr_demo_sessions").update({
      last_seen_at: now,
      converted_to_trial: true,
      converted_at: now,
    }).eq("id", session_id);

    void trackFunnelEvent("signup_start", { source: "demo", properties: { session_id, tenant_id } });
  }

  return NextResponse.json({ ok: true, session_id, action });
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const portal = req.headers.get("x-portal-secret") ?? req.nextUrl.searchParams.get("secret");
  const PORTAL = process.env.PORTAL_SECRET ?? "crr-portal-2025";

  // Session lookup — public (for the demo page to resume sessions)
  if (id) {
    const { data } = await supabaseAdmin
      .from("crr_demo_sessions")
      .select("id, tenant_id, started_at, alert_views, interactions, converted_to_trial")
      .eq("id", id)
      .single();
    return data
      ? NextResponse.json({ ok: true, session: data })
      : NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Admin stats — requires portal secret
  if (portal !== PORTAL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ count: total }, { count: converted }, { data: byTenant }] = await Promise.all([
    supabaseAdmin.from("crr_demo_sessions").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("crr_demo_sessions").select("id", { count: "exact", head: true }).eq("converted_to_trial", true),
    supabaseAdmin.from("crr_demo_sessions")
      .select("tenant_id")
      .order("started_at", { ascending: false })
      .limit(200),
  ]);

  const tenantCounts: Record<string, number> = {};
  for (const row of byTenant ?? []) {
    tenantCounts[row.tenant_id] = (tenantCounts[row.tenant_id] ?? 0) + 1;
  }

  return NextResponse.json({
    ok: true,
    stats: {
      total_sessions: total ?? 0,
      converted_to_trial: converted ?? 0,
      conversion_rate: total ? `${((converted ?? 0) / total * 100).toFixed(1)}%` : "0%",
      by_tenant: tenantCounts,
    },
  });
}
