/**
 * GET  /api/alerts/correlate?token=&org_id=  — get dedup stats for org
 * POST /api/alerts/correlate                  — run dedup on specific alerts or retro-sweep
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { processAlertDedup, retroDedup, getDedupStats } from "@/lib/alert-dedup";

export const dynamic = "force-dynamic";

async function getOrg(req: NextRequest) {
  const token = req.headers.get("x-org-token") ?? req.nextUrl.searchParams.get("token");
  if (!token) return null;
  const { data } = await supabaseAdmin
    .from("crr_orgs")
    .select("id, slug")
    .eq("magic_token", token)
    .single();
  return data;
}

export async function GET(req: NextRequest) {
  const org = await getOrg(req);
  if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stats = await getDedupStats(org.id);
  return NextResponse.json({ ok: true, org_id: org.id, ...stats });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { action?: string; alert_id?: string; token?: string };

  // Support token in body
  const token = body.token
    ?? req.headers.get("x-org-token")
    ?? req.nextUrl.searchParams.get("token");

  const isAdmin = (req.headers.get("x-portal-secret") ?? req.nextUrl.searchParams.get("secret"))
    === (process.env.PORTAL_SECRET ?? "crr-portal-2025");

  if (!token && !isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orgId: string | null = null;

  if (token) {
    const { data: org } = await supabaseAdmin
      .from("crr_orgs")
      .select("id")
      .eq("magic_token", token)
      .single();
    orgId = org?.id ?? null;
  }

  const action = body.action ?? "retro_sweep";

  if (action === "retro_sweep") {
    if (!orgId && !isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // If admin without token, sweep all orgs
    if (isAdmin && !orgId) {
      const { data: orgs } = await supabaseAdmin
        .from("crr_orgs")
        .select("id")
        .limit(50);

      let totalProcessed = 0;
      let totalDupes = 0;
      for (const o of orgs ?? []) {
        const result = await retroDedup(o.id);
        totalProcessed += result.processed;
        totalDupes += result.duplicates;
      }
      return NextResponse.json({ ok: true, action: "retro_sweep_all", processed: totalProcessed, duplicates: totalDupes });
    }

    const result = await retroDedup(orgId!);
    return NextResponse.json({ ok: true, ...result });
  }

  if (action === "process_alert" && body.alert_id) {
    const { data: alert } = await supabaseAdmin
      .from("crr_org_alerts")
      .select("id, org_id, vendor_slug, risk_category, risk_level, title, summary, created_at")
      .eq("id", body.alert_id)
      .single();

    if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    if (orgId && alert.org_id !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const result = await processAlertDedup(alert as Parameters<typeof processAlertDedup>[0]);
    return NextResponse.json({ ok: true, ...result });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
