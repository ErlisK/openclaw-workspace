/**
 * GET    /api/orgs/[orgId]          — get org details (member only)
 * PATCH  /api/orgs/[orgId]          — update org name/github_org (owner/editor)
 * DELETE /api/orgs/[orgId]          — delete org (owner only)
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

async function getCallerRole(orgId: string, userId: string) {
  const { data } = await svc()
    .from("docsci_org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.role as string | null;
}

export async function GET(_req: NextRequest, { params }: { params: { orgId: string } }) {
  const auth = createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getCallerRole(params.orgId, user.id);
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: org, error } = await svc()
    .from("docsci_orgs")
    .select("id, name, slug, plan, github_org, created_at, updated_at")
    .eq("id", params.orgId)
    .single();

  if (error || !org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ...org, viewer_role: role });
}

export async function PATCH(req: NextRequest, { params }: { params: { orgId: string } }) {
  const auth = createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getCallerRole(params.orgId, user.id);
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["owner", "editor"].includes(role)) {
    return NextResponse.json({ error: "Forbidden: owner or editor required" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (body.name) updates.name = (body.name as string).trim();
  if (body.github_org !== undefined) updates.github_org = (body.github_org as string)?.trim() || null;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await svc()
    .from("docsci_orgs")
    .update(updates)
    .eq("id", params.orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { orgId: string } }) {
  const auth = createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getCallerRole(params.orgId, user.id);
  if (role !== "owner") {
    return NextResponse.json({ error: "Forbidden: owner required" }, { status: 403 });
  }

  const { error } = await svc().from("docsci_orgs").delete().eq("id", params.orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
