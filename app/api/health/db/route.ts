import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * GET /api/health/db
 *
 * Deep health check: verifies Supabase connectivity.
 * Slower than /api/health (has network I/O) — use for
 * detailed diagnostics, not fast uptime checks.
 *
 * Returns:
 *   200 { status: "ok",       db: "pass" }  — fully healthy
 *   200 { status: "degraded", db: "skip" }  — no Supabase configured
 *   503 { status: "degraded", db: "fail" }  — Supabase unreachable
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const t0 = Date.now();

  if (!isSupabaseConfigured) {
    return NextResponse.json({
      status:    "degraded",
      db:        "skip",
      reason:    "Supabase env vars not configured — app running in localStorage-only mode",
      latency_ms: null,
    }, { status: 200 });
  }

  try {
    // Lightweight ping: query returns immediately from Postgres
    const { error } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .limit(0);

    const latency = Date.now() - t0;

    if (error) throw error;

    return NextResponse.json({
      status:     "ok",
      db:         "pass",
      latency_ms: latency,
    }, { status: 200 });

  } catch (err) {
    const latency = Date.now() - t0;
    return NextResponse.json({
      status:     "degraded",
      db:         "fail",
      latency_ms: latency,
      error:      (err as Error).message,
    }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
