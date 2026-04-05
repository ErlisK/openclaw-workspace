/**
 * GET  /api/policy-packs             — list all packs
 * GET  /api/policy-packs?slug=...    — get single pack with rules
 * POST /api/policy-packs             — apply pack to org (token required)
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { listPolicyPacks, getPolicyPack, applyPolicyPackToOrg, getOrgPolicyPacks } from "@/lib/policy-packs";

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
  const slug = req.nextUrl.searchParams.get("slug");
  const org = await getOrg(req);

  if (slug) {
    const pack = await getPolicyPack(slug);
    if (!pack) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, pack });
  }

  const [packs, orgPacks] = await Promise.all([
    listPolicyPacks(),
    org ? getOrgPolicyPacks(org.id) : Promise.resolve([]),
  ]);

  const appliedIds = new Set(orgPacks.map(p => p.id));
  return NextResponse.json({
    ok: true,
    packs: packs.map(p => ({
      ...p,
      applied: appliedIds.has(p.id),
    })),
    org_packs: orgPacks,
  });
}

export async function POST(req: NextRequest) {
  const org = await getOrg(req);
  if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { pack_slug?: string; action?: string };
  if (!body.pack_slug) return NextResponse.json({ error: "pack_slug required" }, { status: 400 });

  if (body.action === "remove") {
    const { data: pack } = await supabaseAdmin
      .from("crr_policy_packs")
      .select("id")
      .eq("slug", body.pack_slug)
      .single();

    if (pack) {
      await supabaseAdmin
        .from("crr_org_policy_packs")
        .update({ enabled: false })
        .eq("org_id", org.id)
        .eq("pack_id", pack.id);
    }
    return NextResponse.json({ ok: true, action: "removed" });
  }

  try {
    const result = await applyPolicyPackToOrg(org.id, body.pack_slug);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
