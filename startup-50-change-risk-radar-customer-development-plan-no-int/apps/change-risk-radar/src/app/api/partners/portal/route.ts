/**
 * GET  /api/partners/portal?token=  — get dashboard data for authenticated partner
 * POST /api/partners/portal         — create opportunity or update stage
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getPartnerByToken, getPartnerDashboard } from "@/lib/partner-portal";

export const dynamic = "force-dynamic";

async function authPartner(req: NextRequest) {
  const token = req.headers.get("x-partner-token") ?? req.nextUrl.searchParams.get("token");
  if (!token) return null;
  return getPartnerByToken(token);
}

export async function GET(req: NextRequest) {
  const partner = await authPartner(req);
  if (!partner) return NextResponse.json({ error: "Invalid or expired partner token" }, { status: 401 });

  try {
    const dashboard = await getPartnerDashboard(partner.id);
    return NextResponse.json({ ok: true, ...dashboard });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const partner = await authPartner(req);
  if (!partner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    action?: string;
    opportunity_id?: string;
    prospect_email?: string;
    prospect_name?: string;
    prospect_company?: string;
    stage?: string;
    est_arr?: number;
    notes?: string;
    close_date?: string;
  };

  const action = body.action ?? "add_opportunity";

  // Add a new opportunity
  if (action === "add_opportunity") {
    if (!body.prospect_email) {
      return NextResponse.json({ error: "prospect_email required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("crr_partner_opportunities")
      .insert({
        partner_id: partner.id,
        prospect_email: body.prospect_email,
        prospect_name: body.prospect_name ?? null,
        prospect_company: body.prospect_company ?? null,
        stage: body.stage ?? "referred",
        est_arr: body.est_arr ?? null,
        notes: body.notes ?? null,
        close_date: body.close_date ?? null,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Update partner's total_referred count
    await supabaseAdmin
      .from("crr_partners")
      .update({ total_referred: (partner.total_referred ?? 0) + 1 })
      .eq("id", partner.id);

    return NextResponse.json({ ok: true, opportunity: data }, { status: 201 });
  }

  // Update opportunity stage
  if (action === "update_stage") {
    if (!body.opportunity_id || !body.stage) {
      return NextResponse.json({ error: "opportunity_id and stage required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("crr_partner_opportunities")
      .update({
        stage: body.stage,
        notes: body.notes ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.opportunity_id)
      .eq("partner_id", partner.id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // If closed_won, update total_converted and total_arr
    if (body.stage === "closed_won" && data?.est_arr) {
      await supabaseAdmin
        .from("crr_partners")
        .update({
          total_converted: (partner.total_converted ?? 0) + 1,
          total_arr: (partner.total_arr ?? 0) + data.est_arr,
        })
        .eq("id", partner.id);
    }

    return NextResponse.json({ ok: true, opportunity: data });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
