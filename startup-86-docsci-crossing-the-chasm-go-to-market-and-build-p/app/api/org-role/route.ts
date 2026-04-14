/**
 * GET /api/org-role — return the current user's role in their org
 * Used by client components to enforce RBAC in the UI.
 *
 * Response: { role: "owner" | "admin" | "viewer" | null, orgId: string | null }
 */
import { NextResponse } from "next/server";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!;
  return createServiceClient(url, key);
}

export async function GET() {
  const authSupabase = createAuthClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getServiceClient();
  const { data: membership } = await supabase
    .from("docsci_org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  return NextResponse.json({
    role: membership?.role ?? null,
    orgId: membership?.org_id ?? null,
  });
}
