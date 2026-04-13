/**
 * GET  /api/org/members?token= — list org members
 * POST /api/org/members — invite a member
 *   body: { email, role }
 * PATCH /api/org/members — change role
 *   body: { member_id, role }
 * DELETE /api/org/members?member_id= — revoke member
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  getOrgTeamSummary,
  inviteMember,
  updateMemberRole,
  revokeMember,
  ROLE_PERMISSIONS,
  type OrgRole,
} from "@/lib/rbac";

export const dynamic = "force-dynamic";

async function getOrg(req: NextRequest) {
  const token = req.headers.get("x-org-token") ?? req.nextUrl.searchParams.get("token");
  if (!token) return null;
  const { data } = await supabaseAdmin
    .from("crr_orgs")
    .select("id, slug, name, user_id")
    .eq("magic_token", token)
    .single();
  return data;
}

export async function GET(req: NextRequest) {
  const org = await getOrg(req);
  if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const summary = await getOrgTeamSummary(org.id);
  return NextResponse.json({
    ok: true,
    org: { id: org.id, slug: org.slug, name: org.name },
    team: summary,
    roles: Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => ({ role, permissions: perms })),
  });
}

export async function POST(req: NextRequest) {
  const org = await getOrg(req);
  if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { email?: string; role?: string };
  const { email, role = "viewer" } = body;

  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  if (!["owner", "admin", "viewer"].includes(role)) {
    return NextResponse.json({ error: "role must be owner, admin, or viewer" }, { status: 400 });
  }

  const result = await inviteMember(org.id, email, role as OrgRole, org.user_id ?? undefined);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });

  return NextResponse.json({ ok: true, member: result.member, invite_link: result.invite_link });
}

export async function PATCH(req: NextRequest) {
  const org = await getOrg(req);
  if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { member_id?: string; role?: string };
  const { member_id, role } = body;

  if (!member_id || !role) {
    return NextResponse.json({ error: "member_id and role required" }, { status: 400 });
  }
  if (!["owner", "admin", "viewer"].includes(role)) {
    return NextResponse.json({ error: "invalid role" }, { status: 400 });
  }

  const result = await updateMemberRole(org.id, member_id, role as OrgRole, org.user_id ?? undefined);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const org = await getOrg(req);
  if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member_id = req.nextUrl.searchParams.get("member_id");
  if (!member_id) return NextResponse.json({ error: "member_id required" }, { status: 400 });

  const result = await revokeMember(org.id, member_id, org.user_id ?? undefined);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({ ok: true });
}
