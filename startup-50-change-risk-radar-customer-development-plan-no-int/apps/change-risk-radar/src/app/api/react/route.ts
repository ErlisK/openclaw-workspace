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

export async function POST(req: NextRequest) {
  const orgId = await verifyOrg(req);
  if (!orgId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const { alert_id, reaction, comment } = await req.json();
  if (!alert_id || !reaction) {
    return NextResponse.json({ error: "alert_id and reaction required" }, { status: 400 });
  }

  const validReactions = ["useful", "acknowledge", "not_useful"];
  if (!validReactions.includes(reaction)) {
    return NextResponse.json({ error: `reaction must be one of: ${validReactions.join(", ")}` }, { status: 400 });
  }

  // Verify alert belongs to this org
  const { data: alert } = await supabaseAdmin
    .from("crr_org_alerts")
    .select("id, org_id")
    .eq("id", alert_id)
    .eq("org_id", orgId)
    .single();

  if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });

  // Upsert reaction
  const { data, error } = await supabaseAdmin
    .from("crr_alert_reactions")
    .upsert({ alert_id, org_id: orgId, reaction, comment: comment ?? null }, { onConflict: "alert_id,org_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to save reaction" }, { status: 500 });

  // Auto-mark alert as read
  await supabaseAdmin
    .from("crr_org_alerts")
    .update({ is_read: true })
    .eq("id", alert_id);

  return NextResponse.json({ reaction: data });
}

export async function GET(req: NextRequest) {
  // Telemetry: reaction stats for org or all orgs (admin)
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";

  let orgId: string | null = null;
  if (auth === `Bearer ${secret}`) {
    orgId = req.nextUrl.searchParams.get("org_id");
  } else {
    orgId = await verifyOrg(req);
  }

  if (!orgId && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let query = supabaseAdmin
    .from("crr_alert_reactions")
    .select("reaction, org_id, created_at");
  if (orgId) query = query.eq("org_id", orgId);

  const { data: reactions } = await query;

  const total = reactions?.length ?? 0;
  const counts: Record<string, number> = { useful: 0, acknowledge: 0, not_useful: 0 };
  for (const r of reactions ?? []) {
    counts[r.reaction] = (counts[r.reaction] || 0) + 1;
  }

  const engaged = (counts.useful + counts.acknowledge);
  const engagementRate = total > 0 ? (engaged / total) : 0;
  const falsePositiveRate = total > 0 ? (counts.not_useful / total) : 0;

  return NextResponse.json({
    total,
    counts,
    engagementRate: (engagementRate * 100).toFixed(1) + "%",
    falsePositiveRate: (falsePositiveRate * 100).toFixed(1) + "%",
    // Success criteria checks
    criteria: {
      engagementAbove50pct: { target: "≥50%", current: (engagementRate * 100).toFixed(1) + "%", met: engagementRate >= 0.50 },
      falsePositiveBelow25pct: { target: "≤25%", current: (falsePositiveRate * 100).toFixed(1) + "%", met: falsePositiveRate <= 0.25 },
    },
  });
}
