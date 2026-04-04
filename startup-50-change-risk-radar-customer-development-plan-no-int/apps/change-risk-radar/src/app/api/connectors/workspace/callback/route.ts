import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/connectors/workspace/callback
 * Handles Google OAuth redirect. Exchanges code for tokens,
 * validates Admin SDK access, and activates the workspace connector.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/onboard?error=workspace_oauth_denied`, req.url)
    );
  }

  if (!code || !stateRaw) {
    return NextResponse.redirect(new URL("/onboard?error=missing_params", req.url));
  }

  // Decode state
  let orgId: string, orgSlug: string, orgToken: string;
  try {
    const state = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
    orgId = state.org_id;
    orgSlug = state.slug;
    orgToken = state.token;
  } catch {
    return NextResponse.redirect(new URL("/onboard?error=invalid_state", req.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://change-risk-radar.vercel.app"}/api/connectors/workspace/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(`/dashboard/${orgSlug}?token=${orgToken}&connector_error=google_not_configured`, req.url)
    );
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });
  const tokens = await tokenRes.json();
  if (!tokenRes.ok || !tokens.access_token) {
    return NextResponse.redirect(
      new URL(`/dashboard/${orgSlug}?token=${orgToken}&connector_error=token_exchange_failed`, req.url)
    );
  }

  // Get domain + email from tokeninfo
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = await userRes.json();
  const domain = userInfo.hd ?? userInfo.email?.split("@")[1] ?? "unknown";

  // Test Admin SDK access
  let adminAccess = false;
  try {
    const testRes = await fetch(
      `https://admin.googleapis.com/admin/reports/v1/activity/users/all/applications/login?maxResults=1`,
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    adminAccess = testRes.ok;
  } catch { /* no admin access */ }

  // Upsert connector
  const connectorConfig = {
    google_domain: domain,
    admin_email: userInfo.email,
    admin_access: adminAccess,
    scopes: tokens.scope?.split(" ") ?? [],
    min_risk: "medium",
  };

  const { data: existing } = await supabaseAdmin
    .from("crr_org_connectors")
    .select("id")
    .eq("org_id", orgId)
    .eq("type", "workspace")
    .single();

  const connectorId = existing?.id;
  if (connectorId) {
    await supabaseAdmin.from("crr_org_connectors").update({
      config: connectorConfig,
      oauth_refresh_token: tokens.refresh_token ?? null,
      status: "active",
    }).eq("id", connectorId);
  } else {
    await supabaseAdmin.from("crr_org_connectors").insert({
      org_id: orgId,
      type: "workspace",
      vendor_slug: "google-workspace",
      label: `Google Workspace (${domain})`,
      config: connectorConfig,
      oauth_refresh_token: tokens.refresh_token ?? null,
      status: adminAccess ? "active" : "connected_no_admin",
    });
  }

  const qs = `token=${orgToken}&connector_added=workspace${adminAccess ? "" : "&connector_warning=no_admin_access"}`;
  return NextResponse.redirect(new URL(`/dashboard/${orgSlug}?${qs}`, req.url));
}
