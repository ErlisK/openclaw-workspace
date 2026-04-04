import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

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

export async function GET(req: NextRequest) {
  const orgId = await verifyOrg(req);
  if (!orgId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const risk = searchParams.get("risk"); // filter by risk level
  const since = searchParams.get("since"); // ISO date
  const unread = searchParams.get("unread") === "true";

  let query = supabaseAdmin
    .from("crr_org_alerts")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (risk) query = query.eq("risk_level", risk);
  if (since) query = query.gte("created_at", since);
  if (unread) query = query.eq("is_read", false);

  const { data: alerts } = await query;

  // Fetch reactions for these alerts
  const alertIds = (alerts ?? []).map((a: { id: string }) => a.id);
  const { data: reactions } = alertIds.length
    ? await supabaseAdmin.from("crr_alert_reactions").select("alert_id, reaction, comment, created_at").in("alert_id", alertIds)
    : { data: [] };

  const reactionsByAlert: Record<string, { reaction: string; comment?: string }> = {};
  for (const r of reactions ?? []) {
    reactionsByAlert[r.alert_id] = { reaction: r.reaction, comment: r.comment };
  }

  const enriched = (alerts ?? []).map((a: Record<string, unknown>) => ({
    ...a,
    reaction: reactionsByAlert[a.id as string] ?? null,
  }));

  // Stats
  const { data: allAlerts } = await supabaseAdmin
    .from("crr_org_alerts")
    .select("id, risk_level, is_read, created_at")
    .eq("org_id", orgId);

  const stats = {
    total: (allAlerts ?? []).length,
    unread: (allAlerts ?? []).filter((a: { is_read: boolean }) => !a.is_read).length,
    high: (allAlerts ?? []).filter((a: { risk_level: string }) => a.risk_level === "high").length,
    medium: (allAlerts ?? []).filter((a: { risk_level: string }) => a.risk_level === "medium").length,
    low: (allAlerts ?? []).filter((a: { risk_level: string }) => a.risk_level === "low").length,
  };

  return NextResponse.json({ alerts: enriched, stats });
}

export async function PATCH(req: NextRequest) {
  // Mark alerts as read
  const orgId = await verifyOrg(req);
  if (!orgId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const { alert_ids } = await req.json();
  if (!alert_ids?.length) return NextResponse.json({ error: "alert_ids required" }, { status: 400 });

  await supabaseAdmin
    .from("crr_org_alerts")
    .update({ is_read: true })
    .eq("org_id", orgId)
    .in("id", alert_ids);

  return NextResponse.json({ ok: true });
}
