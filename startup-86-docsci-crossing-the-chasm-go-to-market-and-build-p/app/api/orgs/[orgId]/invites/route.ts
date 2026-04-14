/**
 * GET    /api/orgs/[orgId]/invites    — list active invite tokens (owner/editor)
 * POST   /api/orgs/[orgId]/invites    — create invite token (owner/editor)
 * DELETE /api/orgs/[orgId]/invites    — revoke all (owner only)
 *
 * POST   /api/invite?token=<token>    — accept invite (any authenticated user)
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://snippetci.com";

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
  if (!["owner", "editor"].includes(role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: tokens, error } = await svc()
    .from("docsci_invite_tokens")
    .select("id, role, token, label, created_at, expires_at, used_at, used_by, max_uses, use_count")
    .eq("org_id", params.orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const invites = (tokens ?? []).map((t: Record<string, unknown>) => ({
    ...t,
    invite_url: `${APP_URL}/invite/${t.token}`,
    expired: t.expires_at ? new Date(t.expires_at as string) < new Date() : false,
    exhausted: typeof t.max_uses === "number" && typeof t.use_count === "number" && t.use_count >= t.max_uses,
  }));

  return NextResponse.json({ invites, total: invites.length });
}

export async function POST(req: NextRequest, { params }: { params: { orgId: string } }) {
  const auth = createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callerRole = await getCallerRole(params.orgId, user.id);
  if (!["owner", "editor"].includes(callerRole ?? "")) {
    return NextResponse.json({ error: "Forbidden: owner or editor required" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const role = (body.role as string) || "viewer";
  if (!["owner", "editor", "viewer"].includes(role)) {
    return NextResponse.json({ error: "role must be owner, editor, or viewer" }, { status: 400 });
  }

  // Editors cannot create owner-level invites
  if (callerRole === "editor" && role === "owner") {
    return NextResponse.json({ error: "Editors cannot create owner invites" }, { status: 403 });
  }

  const maxUses = Math.min(parseInt(String(body.max_uses ?? 1)), 100);
  const expiryDays = Math.min(parseInt(String(body.expiry_days ?? 7)), 30);
  const label = (body.label as string)?.trim() || null;

  const { data: invite, error } = await svc()
    .from("docsci_invite_tokens")
    .insert({
      org_id: params.orgId,
      role,
      created_by: user.id,
      max_uses: maxUses,
      label,
      expires_at: new Date(Date.now() + expiryDays * 86400_000).toISOString(),
    })
    .select()
    .single();

  if (error || !invite) return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 500 });

  return NextResponse.json({
    ...invite,
    invite_url: `${APP_URL}/invite/${invite.token}`,
  }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { orgId: string } }) {
  const auth = createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callerRole = await getCallerRole(params.orgId, user.id);
  if (callerRole !== "owner") {
    return NextResponse.json({ error: "Forbidden: owner required" }, { status: 403 });
  }

  const url = new URL(req.url);
  const inviteId = url.searchParams.get("id");

  if (inviteId) {
    const { error } = await svc()
      .from("docsci_invite_tokens")
      .delete()
      .eq("id", inviteId)
      .eq("org_id", params.orgId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ revoked: 1 });
  }

  // Revoke all
  const { error, count } = await svc()
    .from("docsci_invite_tokens")
    .delete({ count: "exact" })
    .eq("org_id", params.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ revoked: count ?? 0 });
}
