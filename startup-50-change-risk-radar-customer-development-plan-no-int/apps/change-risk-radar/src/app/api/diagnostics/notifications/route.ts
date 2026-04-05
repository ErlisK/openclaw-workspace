/**
 * GET /api/diagnostics/notifications
 *
 * Protected diagnostics endpoint reporting Slack notification adoption
 * and test-send metrics.
 *
 * Auth: ?key=<DIAGNOSTICS_KEY> or ?key=<CRON_SECRET> (fallback).
 *
 * Returns:
 *   {
 *     ok: boolean,
 *     now: string,
 *     endpoints_active: number,
 *     endpoints_active_orgs: number,
 *     last24h: { tests_attempted: number, tests_succeeded: number, tests_failed: number },
 *     tables_missing: string[],
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// ─── Admin client ─────────────────────────────────────────────────────────────

function createAdminClient(): SupabaseClient {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ACCESS_TOKEN ||
    "";

  if (!url || !key) {
    throw new Error(
      "Missing Supabase credentials: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ACCESS_TOKEN)."
    );
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if the Postgres error indicates the relation does not exist. */
function isRelationMissing(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "42P01" ||
    (error.message ?? "").toLowerCase().includes("does not exist")
  );
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const suppliedKey = req.nextUrl.searchParams.get("key") ?? "";
  const expectedKey =
    process.env.DIAGNOSTICS_KEY || process.env.CRON_SECRET || "";

  if (!expectedKey || suppliedKey !== expectedKey) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // ── Setup ─────────────────────────────────────────────────────────────────
  let supabase: SupabaseClient;
  try {
    supabase = createAdminClient();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  const now = new Date().toISOString();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tables_missing: string[] = [];

  let endpoints_active = 0;
  let endpoints_active_orgs = 0;
  let tests_attempted = 0;
  let tests_succeeded = 0;
  let tests_failed = 0;

  // ── notification_endpoints ────────────────────────────────────────────────
  {
    const { data, error } = await supabase
      .from("notification_endpoints")
      .select("id, org_id")
      .eq("kind", "slack_webhook")
      .eq("is_active", true);

    if (error) {
      if (isRelationMissing(error)) {
        // Table doesn't exist — try the crr_ alias as a best-effort fallback
        tables_missing.push("notification_endpoints");

        const { data: fallback, error: fallbackErr } = await supabase
          .from("crr_notification_channels")
          .select("id, org_id")
          .eq("type", "slack_webhook")
          .eq("is_active", true);

        if (!fallbackErr && fallback) {
          endpoints_active = fallback.length;
          const orgSet = new Set(fallback.map((r) => r.org_id).filter(Boolean));
          endpoints_active_orgs = orgSet.size;
        }
        // If fallback also fails, counts stay 0 — that's fine.
      } else {
        // Unexpected error — still return a useful payload but note 0 counts.
        tables_missing.push("notification_endpoints");
      }
    } else if (data) {
      endpoints_active = data.length;
      const orgSet = new Set(data.map((r) => r.org_id).filter(Boolean));
      endpoints_active_orgs = orgSet.size;
    }
  }

  // ── alert_dispatches ──────────────────────────────────────────────────────
  {
    const { data, error } = await supabase
      .from("alert_dispatches")
      .select("id, status")
      .eq("kind", "test")
      .gte("created_at", since);

    if (error) {
      if (isRelationMissing(error)) {
        tables_missing.push("alert_dispatches");

        // Best-effort fallback: crr_notification_log tracks test sends
        const { data: fallback, error: fallbackErr } = await supabase
          .from("crr_notification_log")
          .select("id, status")
          .gte("created_at", since);

        if (!fallbackErr && fallback) {
          tests_attempted = fallback.length;
          tests_succeeded = fallback.filter(
            (r) => r.status === "sent" || r.status === "succeeded"
          ).length;
          tests_failed = fallback.filter((r) => r.status === "failed").length;
        }
      } else {
        tables_missing.push("alert_dispatches");
      }
    } else if (data) {
      tests_attempted = data.length;
      tests_succeeded = data.filter((r) => r.status === "succeeded").length;
      tests_failed = data.filter((r) => r.status === "failed").length;
    }
  }

  // ── Response ──────────────────────────────────────────────────────────────
  return NextResponse.json(
    {
      ok: true,
      now,
      endpoints_active,
      endpoints_active_orgs,
      last24h: {
        tests_attempted,
        tests_succeeded,
        tests_failed,
      },
      tables_missing,
    },
    { status: 200 }
  );
}
