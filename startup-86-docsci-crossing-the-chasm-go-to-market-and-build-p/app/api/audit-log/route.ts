// GET /api/audit-log — paginated audit log for current user's orgs
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50"), 200);
  const org_id = req.nextUrl.searchParams.get("org_id");
  const action = req.nextUrl.searchParams.get("action");

  let query = supabase
    .from("docsci_audit_log")
    .select("id, action, resource_type, resource_id, metadata, ip_addr, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (org_id) query = query.eq("org_id", org_id);
  if (action) query = query.eq("action", action);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data, count: data?.length ?? 0 });
}
