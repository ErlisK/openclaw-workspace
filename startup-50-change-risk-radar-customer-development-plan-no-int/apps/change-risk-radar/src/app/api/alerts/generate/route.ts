import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { runDetectorsForOrg } from "@/lib/detectors";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Trigger alert generation for one or all orgs
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  
  // Allow cron secret OR org token
  let orgId: string | null = null;
  
  if (auth === `Bearer ${secret}`) {
    // Admin: optionally specify org_id in body
    const body = await req.json().catch(() => ({}));
    orgId = body.org_id ?? null;
  } else {
    // Org token auth
    const token = req.headers.get("x-org-token") || req.nextUrl.searchParams.get("token");
    if (token) {
      const { data } = await supabaseAdmin
        .from("crr_orgs")
        .select("id")
        .eq("magic_token", token)
        .eq("status", "active")
        .single();
      orgId = data?.id ?? null;
    }
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (orgId) {
    // Single org
    const result = await runDetectorsForOrg(orgId);
    return NextResponse.json({ ok: true, ...result });
  } else {
    // All active orgs (admin cron use)
    const { data: orgs } = await supabaseAdmin
      .from("crr_orgs")
      .select("id, name, slug")
      .eq("status", "active");

    const results = [];
    for (const org of orgs ?? []) {
      const result = await runDetectorsForOrg(org.id);
      results.push({ org: org.slug, ...result });
    }
    return NextResponse.json({ ok: true, orgs: results, total: results.length });
  }
}
