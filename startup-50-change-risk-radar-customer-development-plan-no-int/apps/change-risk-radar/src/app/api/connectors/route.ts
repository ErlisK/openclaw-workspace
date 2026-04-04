import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function verifyOrg(req: NextRequest): Promise<string | null> {
  const token = req.headers.get("x-org-token") || req.nextUrl.searchParams.get("token");
  if (!token) return null;
  const { data } = await supabaseAdmin
    .from("crr_orgs")
    .select("id")
    .eq("magic_token", token)
    .eq("status", "active")
    .single();
  return data?.id ?? null;
}

export async function GET(req: NextRequest) {
  const orgId = await verifyOrg(req);
  if (!orgId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const { data: connectors } = await supabaseAdmin
    .from("crr_org_connectors")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at");

  return NextResponse.json({ connectors: connectors ?? [] });
}

export async function POST(req: NextRequest) {
  const orgId = await verifyOrg(req);
  if (!orgId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const body = await req.json();
  const { type, label, config } = body;
  if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("crr_org_connectors")
    .insert({ org_id: orgId, type, label: label ?? type, config: config ?? {}, status: "active" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create connector" }, { status: 500 });
  return NextResponse.json({ connector: data });
}

export async function PATCH(req: NextRequest) {
  const orgId = await verifyOrg(req);
  if (!orgId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("crr_org_connectors")
    .update(updates)
    .eq("id", id)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ connector: data });
}
