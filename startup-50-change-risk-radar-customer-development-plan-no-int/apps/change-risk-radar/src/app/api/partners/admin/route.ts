/**
 * GET  /api/partners/admin?secret=  — admin view of all partners + pipeline
 * PATCH /api/partners/admin         — approve/update partner status
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getAllPartners } from "@/lib/partner-portal";

export const dynamic = "force-dynamic";

function checkAdmin(req: NextRequest) {
  const secret = req.headers.get("x-portal-secret") ?? req.nextUrl.searchParams.get("secret");
  return secret === (process.env.PORTAL_SECRET ?? "crr-portal-2025");
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const partners = await getAllPartners();

  // Pipeline summary
  const { data: opps } = await supabaseAdmin
    .from("crr_partner_opportunities")
    .select("partner_id, stage, est_arr, created_at");

  const pipelineByStage: Record<string, { count: number; arr: number }> = {};
  for (const o of opps ?? []) {
    const s = o.stage;
    pipelineByStage[s] = pipelineByStage[s] ?? { count: 0, arr: 0 };
    pipelineByStage[s].count++;
    pipelineByStage[s].arr += o.est_arr ?? 0;
  }

  // Click stats
  const { data: clicks } = await supabaseAdmin
    .from("crr_partner_clicks")
    .select("converted, created_at");

  const totalClicks = (clicks ?? []).length;
  const convertedClicks = (clicks ?? []).filter(c => c.converted).length;

  // Total pipeline ARR
  const totalPipelineArr = Object.entries(pipelineByStage)
    .filter(([s]) => !["closed_won","closed_lost"].includes(s))
    .reduce((sum, [, v]) => sum + v.arr, 0);

  const closedWonArr = (pipelineByStage["closed_won"] ?? { arr: 0 }).arr;

  return NextResponse.json({
    ok: true,
    partners,
    total_partners: partners.length,
    active_partners: partners.filter(p => p.status === "active").length,
    pending_partners: partners.filter(p => p.status === "pending").length,
    pipeline_by_stage: pipelineByStage,
    total_pipeline_arr: totalPipelineArr,
    closed_won_arr: closedWonArr,
    total_clicks: totalClicks,
    converted_clicks: convertedClicks,
    click_conversion_rate: totalClicks > 0 ? Math.round((convertedClicks / totalClicks) * 100) : 0,
  });
}

export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    partner_id?: string;
    status?: string;
    tier?: string;
    commission_pct?: number;
    notes?: string;
  };

  if (!body.partner_id) return NextResponse.json({ error: "partner_id required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body.status) updates.status = body.status;
  if (body.tier) updates.tier = body.tier;
  if (body.commission_pct) updates.commission_pct = body.commission_pct;
  if (body.status === "active") updates.approved_at = new Date().toISOString();
  if (body.notes) updates.notes = body.notes;

  const { data, error } = await supabaseAdmin
    .from("crr_partners")
    .update(updates)
    .eq("id", body.partner_id)
    .select("id, name, email, status, tier, referral_code, portal_token")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If approving, send notification email
  if (body.status === "active" && data) {
    void fetch("https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}`,
      },
      body: JSON.stringify({
        to: data.email,
        subject: "You've been approved — Welcome to the CRR Partner Program!",
        text: `Hi ${data.name},

Great news — your Change Risk Radar partner application has been approved!

Your partner details:
  Referral Code: ${data.referral_code}
  Referral Link: https://change-risk-radar.vercel.app/partners/${data.referral_code}
  Partner Portal: https://change-risk-radar.vercel.app/partners/portal?token=${data.portal_token}

You're now earning 20% recurring commission on every customer you refer.

Log into your partner portal to track clicks, add opportunities, and see your commission pipeline.

— The Change Risk Radar Team`,
      }),
    });
  }

  return NextResponse.json({ ok: true, partner: data });
}
