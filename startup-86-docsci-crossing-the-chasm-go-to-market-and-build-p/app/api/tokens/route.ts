// GET /api/tokens — list org API tokens (prefix only, hash never returned)
// POST /api/tokens — generate a new API token
// DELETE /api/tokens — revoke a token
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHash, randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org_id = req.nextUrl.searchParams.get("org_id");
  if (!org_id) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("docsci_tokens")
    .select("id, name, token_prefix, scopes, last_used_at, expires_at, revoked, created_at")
    .eq("org_id", org_id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tokens: data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { org_id, name, scopes } = await req.json();
  if (!org_id || !name) return NextResponse.json({ error: "org_id and name required" }, { status: 400 });

  // Generate token: dci_<32 random bytes hex>
  const rawToken = `dci_${randomBytes(32).toString("hex")}`;
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const tokenPrefix = rawToken.slice(0, 12);

  const { data, error } = await supabase
    .from("docsci_tokens")
    .insert({
      org_id,
      created_by: user.id,
      name,
      token_hash: tokenHash,
      token_prefix: tokenPrefix,
      scopes: scopes || ["read", "runs:write"],
    })
    .select("id, name, token_prefix, scopes, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("docsci_audit_log").insert({
    org_id, user_id: user.id, action: "token.create",
    resource_type: "token", resource_id: data.id,
    metadata: { name, token_prefix: tokenPrefix },
  });

  // Return the raw token ONCE — never stored, never retrievable again
  return NextResponse.json({
    token: rawToken,
    record: data,
    warning: "Store this token securely. It will not be shown again.",
  });
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token_id } = await req.json();
  if (!token_id) return NextResponse.json({ error: "token_id required" }, { status: 400 });

  const { error } = await supabase
    .from("docsci_tokens")
    .update({ revoked: true })
    .eq("id", token_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ revoked: true, token_id });
}
