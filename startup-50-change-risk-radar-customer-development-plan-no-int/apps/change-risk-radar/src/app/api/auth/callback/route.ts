import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * /api/auth/callback
 * Handles:
 * 1. Supabase OAuth callback (code exchange)
 * 2. Email magic link / confirmation clicks
 * After auth: link the user to their org (if exists) or redirect to /onboard
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboard";
  const errorParam = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

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

    // Link user to existing org (by email match) or create one
    const { data: existingOrg } = await supabaseAdmin
      .from("crr_orgs")
      .select("id, slug, magic_token")
      .eq("email", user.email ?? "")
      .single();

    if (existingOrg) {
      // Patch user_id onto existing org
      await supabaseAdmin.from("crr_orgs").update({ user_id: user.id }).eq("id", existingOrg.id);
      const slug = existingOrg.slug;
      const token = existingOrg.magic_token;
      // Redirect to their dashboard
      return NextResponse.redirect(new URL(`/dashboard/${slug}?token=${token}`, req.url));
    }

    // No org yet — let them complete onboarding
    return NextResponse.redirect(new URL(next, req.url));
  }

  // No code — redirect to login
  return NextResponse.redirect(new URL("/auth/login", req.url));
}
