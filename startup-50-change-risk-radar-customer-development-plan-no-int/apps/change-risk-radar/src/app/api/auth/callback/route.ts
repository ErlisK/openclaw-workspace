import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { logAuthEvent, extractIP } from "@/lib/security-audit";
import { supabaseAdmin } from "@/lib/supabase";
import { acceptInvite, recordSSOLogin } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/**
 * /api/auth/callback
 * Handles:
 * 1. Supabase OAuth callback (code exchange) — Google, GitHub, etc.
 * 2. Email magic link / confirmation clicks
 * 3. Invite acceptance (org=<id>&email=<email> query params)
 *
 * After auth:
 *   - If invite params present → accept invite → redirect to org dashboard
 *   - If existing org by email → link user_id → redirect to dashboard
 *   - Otherwise → redirect to /onboard
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboard";
  const errorParam = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");
  const inviteOrgId = searchParams.get("invite");
  const inviteEmail = searchParams.get("email");

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(errorDesc ?? errorParam)}`, req.url)
    );
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]);
            });
          },
        },
      }
    );

    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !session?.user) {
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(error?.message ?? "auth_failed")}`, req.url)
      );
    }

    const user = session.user;
    const provider = user.app_metadata?.provider ?? "email";
    const ip = extractIP(req);

        // Log auth event
    void logAuthEvent("auth.login", user.id, undefined, ip, {
      provider,
      email: user.email,
      is_new_user: !user.last_sign_in_at || user.last_sign_in_at === user.created_at,
    });

    // ── 1. Handle invite acceptance ───────────────────────────────────────────
    if (inviteOrgId && inviteEmail) {
      const inviteResult = await acceptInvite(inviteOrgId, inviteEmail, user.id);
      if (inviteResult.ok) {
        const { data: org } = await supabaseAdmin
          .from("crr_orgs")
          .select("slug, magic_token")
          .eq("id", inviteOrgId)
          .single();
        if (org) {
          void recordSSOLogin(inviteOrgId, provider, user.id);
          return NextResponse.redirect(
            new URL(`/dashboard/${org.slug}?token=${org.magic_token}&welcome=1`, req.url)
          );
        }
      }
      // If invite not found, fall through to normal flow
    }

    // ── 2. Link user to existing org by email ─────────────────────────────────
    const userEmail = user.email ?? inviteEmail ?? "";
    const { data: existingOrg } = await supabaseAdmin
      .from("crr_orgs")
      .select("id, slug, magic_token")
      .eq("email", userEmail)
      .single();

    if (existingOrg) {
      // Patch user_id + SSO provider onto org
      await supabaseAdmin.from("crr_orgs").update({
        user_id: user.id,
        sso_provider: provider,
        sso_sub: user.id,
        last_login_at: new Date().toISOString(),
      }).eq("id", existingOrg.id);

      void recordSSOLogin(existingOrg.id, provider, user.id);

      return NextResponse.redirect(
        new URL(`/dashboard/${existingOrg.slug}?token=${existingOrg.magic_token}`, req.url)
      );
    }

    // ── 3. Check org_members invite by email (user just signed up) ────────────
    const { data: pendingMember } = await supabaseAdmin
      .from("crr_org_members")
      .select("org_id, role")
      .eq("email", userEmail)
      .eq("status", "pending")
      .single();

    if (pendingMember) {
      const inviteResult = await acceptInvite(pendingMember.org_id, userEmail, user.id);
      if (inviteResult.ok) {
        const { data: org } = await supabaseAdmin
          .from("crr_orgs")
          .select("slug, magic_token")
          .eq("id", pendingMember.org_id)
          .single();
        if (org) {
          void recordSSOLogin(pendingMember.org_id, provider, user.id);
          return NextResponse.redirect(
            new URL(`/dashboard/${org.slug}?token=${org.magic_token}&welcome=1`, req.url)
          );
        }
      }
    }

    // ── 4. No org — redirect to onboarding ───────────────────────────────────
    return NextResponse.redirect(new URL(next, req.url));
  }

  // No code — redirect to login
  return NextResponse.redirect(new URL("/auth/login", req.url));
}
