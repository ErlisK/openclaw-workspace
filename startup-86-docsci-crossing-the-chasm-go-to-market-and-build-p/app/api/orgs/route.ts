/**
 * GET  /api/orgs   — list orgs the current user belongs to
 * POST /api/orgs   — create a new org (user becomes owner)
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function svc() {
  return createServiceClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!,
  );
}

export async function GET() {
  const auth = createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: memberships, error } = await svc()
    .from("docsci_org_members")
    .select("role, joined_at, org_id, docsci_orgs(id, name, slug, plan, github_org, created_at)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orgs = (memberships ?? []).map((m: Record<string, unknown>) => ({
    ...(m.docsci_orgs as Record<string, unknown>),
    role: m.role,
    joined_at: m.joined_at,
  }));

  return NextResponse.json({ orgs, total: orgs.length });
}

export async function POST(req: NextRequest) {
  const auth = createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = (body.name as string)?.trim();
  const slug = (body.slug as string)?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const githubOrg = (body.github_org as string)?.trim() || null;

  if (!name || name.length < 2) return NextResponse.json({ error: "name is required (min 2 chars)" }, { status: 400 });
  if (!slug || !/^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/.test(slug)) {
    return NextResponse.json({ error: "slug must be lowercase alphanumeric with hyphens" }, { status: 400 });
  }

  const db = svc();

  // Check slug uniqueness
  const { data: existing } = await db.from("docsci_orgs").select("id").eq("slug", slug).maybeSingle();
  if (existing) return NextResponse.json({ error: `Slug '${slug}' is already taken` }, { status: 409 });

  // Create org
  const { data: org, error: orgErr } = await db
    .from("docsci_orgs")
    .insert({ name, slug, plan: "free", github_org: githubOrg })
    .select()
    .single();

  if (orgErr || !org) return NextResponse.json({ error: orgErr?.message ?? "Failed to create org" }, { status: 500 });

  // Add creator as owner
  const { error: memberErr } = await db.from("docsci_org_members").insert({
    org_id: org.id,
    user_id: user.id,
    role: "owner",
    invited_by: user.id,
    joined_at: new Date().toISOString(),
  });

  if (memberErr) {
    // Rollback org
    await db.from("docsci_orgs").delete().eq("id", org.id);
    return NextResponse.json({ error: memberErr.message }, { status: 500 });
  }

  return NextResponse.json({ org, role: "owner" }, { status: 201 });
}
