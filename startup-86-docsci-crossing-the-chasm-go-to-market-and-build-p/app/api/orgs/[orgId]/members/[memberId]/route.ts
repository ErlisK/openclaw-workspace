/**
 * PATCH  /api/orgs/[orgId]/members/[memberId] — change role (owner only)
 * DELETE /api/orgs/[orgId]/members/[memberId] — remove member (owner or self)
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { orgId: string; memberId: string } },
) {
  const auth = createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callerRole = await getCallerRole(params.orgId, user.id);
  if (callerRole !== "owner") {
    return NextResponse.json({ error: "Forbidden: owner required to change roles" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const newRole = body.role as string;
  if (!["owner", "editor", "viewer"].includes(newRole)) {
    return NextResponse.json({ error: "role must be owner, editor, or viewer" }, { status: 400 });
  }

  // Prevent demoting the last owner
  if (newRole !== "owner") {
    const { data: owners } = await svc()
      .from("docsci_org_members")
      .select("id")
      .eq("org_id", params.orgId)
      .eq("role", "owner");
    const targetIsOwner = (owners ?? []).some((o: { id: string }) => o.id === params.memberId);
    if (targetIsOwner && (owners ?? []).length === 1) {
      return NextResponse.json({ error: "Cannot demote the last owner" }, { status: 409 });
    }
  }

  const { data, error } = await svc()
    .from("docsci_org_members")
    .update({ role: newRole })
    .eq("id", params.memberId)
    .eq("org_id", params.orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { orgId: string; memberId: string } },
) {
  const auth = createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callerRole = await getCallerRole(params.orgId, user.id);
  if (!callerRole) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Look up target member
  const { data: target } = await svc()
    .from("docsci_org_members")
    .select("id, user_id, role")
    .eq("id", params.memberId)
    .eq("org_id", params.orgId)
    .maybeSingle();

  if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  // Only owners can remove others; anyone can remove themselves
  const isSelf = target.user_id === user.id;
  if (!isSelf && callerRole !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Prevent removing last owner
  if (target.role === "owner") {
    const { data: owners } = await svc()
      .from("docsci_org_members")
      .select("id")
      .eq("org_id", params.orgId)
      .eq("role", "owner");
    if ((owners ?? []).length <= 1) {
      return NextResponse.json({ error: "Cannot remove the last owner" }, { status: 409 });
    }
  }

  const { error } = await svc()
    .from("docsci_org_members")
    .delete()
    .eq("id", params.memberId)
    .eq("org_id", params.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ removed: true });
}
