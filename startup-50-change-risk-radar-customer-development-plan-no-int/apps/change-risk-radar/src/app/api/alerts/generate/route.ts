import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { runDetectorsForOrg } from "@/lib/detectors";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function runAllOrgs() {
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

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  let orgId: string | null = null;

  if (auth === `Bearer ${secret}`) {
    const body = await req.json().catch(() => ({}));
    orgId = body.org_id ?? null;
  } else {
    const token = req.headers.get("x-org-token") || req.nextUrl.searchParams.get("token");
    if (token) {
      const { data } = await supabaseAdmin
        .from("crr_orgs").select("id").eq("magic_token", token).eq("status", "active").single();
      orgId = data?.id ?? null;
    }
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (orgId) {
    const result = await runDetectorsForOrg(orgId);
    return NextResponse.json({ ok: true, ...result });
  }
  return runAllOrgs();
}

// Vercel cron invokes GET on this route
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  if (auth && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runAllOrgs();
}
