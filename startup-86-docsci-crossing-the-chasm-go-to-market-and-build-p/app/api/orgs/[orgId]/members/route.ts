/**
 * GET    /api/orgs/[orgId]/members          — list members (member only)
 * DELETE /api/orgs/[orgId]/members/[memberId] — remove member (owner, or self)
 * PATCH  /api/orgs/[orgId]/members/[memberId] — change role (owner only)
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

  const { data: members, error } = await svc()
    .from("docsci_org_members")
    .select("id, user_id, role, joined_at, invited_by")
    .eq("org_id", params.orgId)
    .order("joined_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ members: members ?? [], total: (members ?? []).length, viewer_role: role });
}
