import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const GOOGLE_OAUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const WORKSPACE_SCOPES = [
  "https://www.googleapis.com/auth/admin.reports.audit.readonly",
  "https://www.googleapis.com/auth/admin.directory.user.readonly",
  "openid",
  "email",
  "profile",
].join(" ");

/**
 * GET /api/connectors/workspace/oauth
 * Initiates Google Workspace OAuth flow (Admin SDK read-only scopes).
 * Requires ?token=ORG_TOKEN to identify the org.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/auth/login", req.url));

  const { data: org } = await supabaseAdmin
    .from("crr_orgs")
    .select("id, slug")
    .eq("magic_token", token)
    .eq("status", "active")
    .single();
  if (!org) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    // Return setup instructions if OAuth not configured
    return NextResponse.json({
      error: "Google OAuth not configured",
      setup_required: true,
      instructions: {
        step1: "Go to https://console.cloud.google.com/apis/credentials",
        step2: "Create OAuth 2.0 Client ID (Web application)",
        step3: "Add authorized redirect URI: https://change-risk-radar.vercel.app/api/connectors/workspace/callback",
        step4: "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel environment variables",
        required_scopes: WORKSPACE_SCOPES.split(" "),
        required_apis: [
          "Admin SDK API (admin.googleapis.com)",
          "Google Workspace Admin API",
        ],
      },
    }, { status: 503 });
  }

  const state = Buffer.from(JSON.stringify({ org_id: org.id, slug: org.slug, token })).toString("base64url");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://change-risk-radar.vercel.app"}/api/connectors/workspace/callback`,
    response_type: "code",
    scope: WORKSPACE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(`${GOOGLE_OAUTH_BASE}?${params.toString()}`);
}
