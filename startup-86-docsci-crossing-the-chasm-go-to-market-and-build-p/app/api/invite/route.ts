/**
 * POST /api/invite   — accept an invite token
 * GET  /api/invite?token=<token> — validate token (preview before accepting)
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

async function lookupToken(token: string) {
  const { data } = await svc()
    .from("docsci_invite_tokens")
    .select("id, org_id, role, expires_at, used_at, max_uses, use_count, label, docsci_orgs(id, name, slug)")
    .eq("token", token)
    .maybeSingle();
  return data;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });

  const invite = await lookupToken(token);
  if (!invite) return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });

  const expired = invite.expires_at ? new Date(invite.expires_at) < new Date() : false;
  const exhausted = invite.max_uses !== null && invite.use_count >= invite.max_uses;

  return NextResponse.json({
    valid: !expired && !exhausted,
    expired,
    exhausted,
    role: invite.role,
    org: invite.docsci_orgs,
    label: invite.label,
  });
}

export async function POST(req: NextRequest) {
  const auth = createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized — please sign in first" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const token = body.token as string;
  if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });

  const db = svc();
  const invite = await lookupToken(token);
  if (!invite) return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });

  const expired = invite.expires_at ? new Date(invite.expires_at) < new Date() : false;
  const exhausted = invite.max_uses !== null && invite.use_count >= invite.max_uses;

  if (expired) return NextResponse.json({ error: "Invite link has expired" }, { status: 410 });
  if (exhausted) return NextResponse.json({ error: "Invite link has reached its maximum uses" }, { status: 410 });

  // Check if already a member
  const { data: existing } = await db
    .from("docsci_org_members")
    .select("id, role")
    .eq("org_id", invite.org_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      already_member: true,
      role: existing.role,
      org: invite.docsci_orgs,
    });
  }

  // Add as member
  const { error: memberErr } = await db.from("docsci_org_members").insert({
    org_id: invite.org_id,
    user_id: user.id,
    role: invite.role,
    joined_at: new Date().toISOString(),
  });

  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 });

  // Update use_count and mark used_at/used_by if single-use
  await db.from("docsci_invite_tokens").update({
    use_count: (invite.use_count ?? 0) + 1,
    ...(invite.max_uses === 1 ? {
      used_at: new Date().toISOString(),
    } : {}),
  }).eq("id", invite.id);

  return NextResponse.json({
    joined: true,
    role: invite.role,
    org: invite.docsci_orgs,
  }, { status: 201 });
}
