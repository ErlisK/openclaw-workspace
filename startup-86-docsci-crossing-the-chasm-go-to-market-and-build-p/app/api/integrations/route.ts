// GET /api/integrations — list org integrations
// POST /api/integrations — add/update an integration
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org_id = req.nextUrl.searchParams.get("org_id");
  if (!org_id) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("docsci_integrations")
    .select("id, kind, status, external_id, installed_at, last_sync_at")
    .eq("org_id", org_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ integrations: data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { org_id, kind, external_id, config } = await req.json();
  if (!org_id || !kind) return NextResponse.json({ error: "org_id and kind required" }, { status: 400 });

  const { data, error } = await supabase
    .from("docsci_integrations")
    .upsert({ org_id, kind, external_id, config: config || {}, installed_by: user.id, status: "active" }, { onConflict: "org_id,kind" })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("docsci_audit_log").insert({
    org_id, user_id: user.id, action: "integration.connect",
    resource_type: "integration", resource_id: data.id,
    metadata: { kind, external_id },
  });

  return NextResponse.json({ integration: data });
}
