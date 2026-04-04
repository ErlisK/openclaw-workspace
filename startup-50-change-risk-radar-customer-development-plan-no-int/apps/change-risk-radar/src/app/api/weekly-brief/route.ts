import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendWeeklyBrief } from "@/lib/mailer";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function getWeekOf(d = new Date()): string {
  const day = d.getDay(); // 0=Sun
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const targetOrgId = body.org_id ?? null;
  const weekOf = body.week_of ?? getWeekOf();

  // Get active orgs
  let orgQuery = supabaseAdmin.from("crr_orgs").select("*").eq("status", "active");
  if (targetOrgId) orgQuery = orgQuery.eq("id", targetOrgId);
  const { data: orgs } = await orgQuery;

  if (!orgs?.length) return NextResponse.json({ ok: true, sent: 0, message: "No active orgs" });

  const weekStart = new Date(weekOf + "T00:00:00Z");
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const results = [];

  for (const org of orgs) {
    try {
      // Get alerts for this week
      const { data: alerts } = await supabaseAdmin
        .from("crr_org_alerts")
        .select("*")
        .eq("org_id", org.id)
        .gte("created_at", weekStart.toISOString())
        .lt("created_at", weekEnd.toISOString())
        .order("risk_level", { ascending: false })
        .order("created_at", { ascending: false });

      const alertList = alerts ?? [];

      // Send email
      const emailResult = await sendWeeklyBrief({
        to: org.email,
        orgName: org.name,
        orgSlug: org.slug,
        magicToken: org.magic_token,
        weekOf,
        alerts: alertList,
      });

      // Record brief in DB
      await supabaseAdmin.from("crr_weekly_briefs").upsert({
        org_id: org.id,
        week_of: weekOf,
        alerts_count: alertList.length,
        critical_count: alertList.filter((a: { risk_level: string }) => a.risk_level === "high").length,
        email_to: org.email,
        sent_at: emailResult.success ? new Date().toISOString() : null,
        email_status: emailResult.success ? "sent" : "failed",
        summary: {
          risk_breakdown: alertList.reduce((acc: Record<string, number>, a: { risk_level: string }) => {
            acc[a.risk_level] = (acc[a.risk_level] || 0) + 1;
            return acc;
          }, {}),
          top_vendors: [...new Set(alertList.map((a: { vendor_slug: string }) => a.vendor_slug))].slice(0, 5),
          email_error: emailResult.error,
        },
      }, { onConflict: "org_id,week_of" });

      results.push({
        org: org.slug,
        email: org.email,
        alerts: alertList.length,
        sent: emailResult.success,
        error: emailResult.error,
      });
    } catch (e) {
      results.push({ org: org.slug, error: String(e) });
    }
  }

  return NextResponse.json({
    ok: true,
    week_of: weekOf,
    sent: results.filter(r => r.sent).length,
    results,
  });
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("x-org-token") || req.nextUrl.searchParams.get("token");
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";

  // Vercel cron invocation (no auth header) or explicit cron secret → send briefs
  if (!token && (!auth || auth === `Bearer ${secret}`)) {
    const weekOf = getWeekOf();
    const { data: orgs } = await supabaseAdmin.from("crr_orgs").select("*").eq("status", "active");
    const results = [];
    for (const org of orgs ?? []) {
      try {
        const { data: alerts } = await supabaseAdmin
          .from("crr_org_alerts").select("*").eq("org_id", org.id)
          .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
          .order("risk_level", { ascending: false }).limit(50);
        const alertList = alerts ?? [];
        const emailResult = await sendWeeklyBrief({ to: org.email, orgName: org.name, orgSlug: org.slug, magicToken: org.magic_token, weekOf, alerts: alertList });
        await supabaseAdmin.from("crr_weekly_briefs").upsert({ org_id: org.id, week_of: weekOf, alerts_count: alertList.length, critical_count: alertList.filter((a: { risk_level: string }) => a.risk_level === "high").length, email_to: org.email, sent_at: emailResult.success ? new Date().toISOString() : null, email_status: emailResult.success ? "sent" : "failed", summary: {} }, { onConflict: "org_id,week_of" });
        results.push({ org: org.slug, alerts: alertList.length, sent: emailResult.success });
      } catch (e) { results.push({ org: (org as { slug: string }).slug, error: String(e) }); }
    }
    return NextResponse.json({ ok: true, cron: true, week_of: weekOf, sent: results.filter(r => (r as { sent?: boolean }).sent).length, results });
  }

  // Org token → brief history
  let orgId: string | null = null;
  if (auth === `Bearer ${secret}`) {
    orgId = req.nextUrl.searchParams.get("org_id");
  } else if (token) {
    const { data } = await supabaseAdmin.from("crr_orgs").select("id").eq("magic_token", token).single();
    orgId = data?.id ?? null;
  }
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: briefs } = await supabaseAdmin.from("crr_weekly_briefs").select("*").eq("org_id", orgId).order("week_of", { ascending: false }).limit(12);
  return NextResponse.json({ briefs: briefs ?? [] });
}
