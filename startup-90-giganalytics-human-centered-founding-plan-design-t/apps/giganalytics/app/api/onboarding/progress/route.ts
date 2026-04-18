/**
 * GET /api/onboarding/progress
 * Returns which checklist items are complete for the authenticated user.
 *
 * Checklist items:
 *   has_streams_2   — created ≥2 income streams
 *   has_import      — uploaded at least one CSV (≥1 transaction)
 *   has_timer       — logged at least one time entry
 *   has_viewed_heatmap — stored client-side; we check a user_settings flag
 *   has_viewed_roi  — stored client-side; we check a user_settings flag
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    { count: streamCount },
    { count: txCount },
    { count: teCount },
    { data: settings },
  ] = await Promise.all([
    supabase.from("streams").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("time_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("user_settings").select("onboarding_flags").eq("user_id", user.id).single(),
  ]);

  const flags = (settings?.onboarding_flags as Record<string, boolean>) ?? {};

  const progress = {
    has_streams_2: (streamCount ?? 0) >= 2,
    has_import: (txCount ?? 0) >= 1,
    has_timer: (teCount ?? 0) >= 1,
    has_viewed_heatmap: flags.has_viewed_heatmap ?? false,
    has_viewed_roi: flags.has_viewed_roi ?? false,
  };

  const completed = Object.values(progress).filter(Boolean).length;
  const total = Object.keys(progress).length;

  return NextResponse.json({
    progress,
    completed,
    total,
    percentage: Math.round((completed / total) * 100),
    isDone: completed === total,
  });
}

// PATCH /api/onboarding/progress — mark a flag as done (client-side events)
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { flag } = body as { flag: string };

  const allowedFlags = ["has_viewed_heatmap", "has_viewed_roi"];
  if (!allowedFlags.includes(flag)) {
    return NextResponse.json({ error: "Invalid flag" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("user_settings")
    .select("onboarding_flags")
    .eq("user_id", user.id)
    .single();

  const currentFlags = (existing?.onboarding_flags as Record<string, boolean>) ?? {};
  const updatedFlags = { ...currentFlags, [flag]: true };

  await supabase.from("user_settings").upsert({
    user_id: user.id,
    onboarding_flags: updatedFlags,
  }, { onConflict: "user_id" });

  return NextResponse.json({ ok: true, flags: updatedFlags });
}
