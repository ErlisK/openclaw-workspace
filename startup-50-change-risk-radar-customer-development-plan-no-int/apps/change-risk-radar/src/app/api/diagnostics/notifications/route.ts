/**
 * GET /api/diagnostics/notifications
 *
 * Protected diagnostics endpoint reporting Slack notifications adoption
 * and schema presence.
 *
 * Auth:
 *   ?key=<DIAGNOSTICS_KEY>  OR  Authorization: Bearer <DIAGNOSTICS_KEY>
 *   Falls back to CRON_SECRET if DIAGNOSTICS_KEY is not set.
 *
 * Returns:
 *   {
 *     ok: true,
 *     now: ISO string,
 *     tables_present: string[],
 *     tables_missing: string[],
 *     metrics: {
 *       endpoints: { total_active, distinct_active_orgs, by_kind },
 *       last_24h: { total_dispatches, sent, failed, error_rate, alerts },
 *       log_24h: { total, sent, failed, avg_latency_ms },
 *     },
 *     errors: string[]
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
// Ensure Node.js runtime (not Edge) for supabase-js
export const runtime = "nodejs";

// ─── Auth ──────────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  const validKey =
    process.env.DIAGNOSTICS_KEY || process.env.CRON_SECRET;
  if (!validKey) return false;

  const queryKey = req.nextUrl.searchParams.get("key");
  if (queryKey && queryKey === validKey) return true;

  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${validKey}`) return true;

  return false;
}

// ─── Supabase admin client ─────────────────────────────────────────────────

function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ACCESS_TOKEN;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface ByKindRow {
  type: string;
  count: string | number;
}

interface DiagnosticsResponse {
  ok: boolean;
  now: string;
  tables_present: string[];
  tables_missing: string[];
  metrics: {
    endpoints: {
      total_active: number | null;
      distinct_active_orgs: number | null;
      by_kind: Record<string, number>;
    };
    last_24h: {
      total_dispatches: number | null;
      sent: number | null;
      failed: number | null;
      error_rate: number | null;
      alerts: number | null;
    };
    log_24h: {
      total: number | null;
      sent: number | null;
      failed: number | null;
      avg_latency_ms: number | null;
    };
  };
  errors: string[];
}

// ─── Handler ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const errors: string[] = [];
  const now = new Date().toISOString();

  const supabase = getAdminClient();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        now,
        tables_present: [],
        tables_missing: [],
        metrics: { endpoints: {}, last_24h: {}, log_24h: {} },
        errors: ["Supabase client could not be initialised: missing URL or service role key"],
      },
      { status: 500 },
    );
  }

  // ── 1. Discover tables ──────────────────────────────────────────────────
  // The tables we care about for this diagnostic
  const REQUIRED_TABLES = [
    "crr_notification_channels",
    "crr_alert_dispatches",
    "crr_org_alerts",
    "crr_notification_log",
  ];

  let presentSet = new Set<string>();

  try {
    const { data: tableRows, error: schemaErr } = await supabase
      .from("information_schema.tables" as "information_schema.tables")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("table_name" as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq("table_schema" as any, "public");

    if (schemaErr) {
      // Fallback: use raw SQL via rpc if available, otherwise mark all as unknown
      errors.push(`information_schema query: ${schemaErr.message}`);
    } else {
      presentSet = new Set(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (tableRows as any[]).map((r) => r.table_name as string),
      );
    }
  } catch (e) {
    errors.push(`information_schema exception: ${String(e)}`);
  }

  // If we couldn't get table list, try probing each table directly
  if (presentSet.size === 0) {
    for (const tbl of REQUIRED_TABLES) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from(tbl as any) as any)
          .select("id")
          .limit(1);
        if (!error) presentSet.add(tbl);
      } catch {
        // table not accessible
      }
    }
  }

  const tables_present = REQUIRED_TABLES.filter((t) => presentSet.has(t));
  const tables_missing = REQUIRED_TABLES.filter((t) => !presentSet.has(t));

  // ── 2. Endpoint metrics ────────────────────────────────────────────────
  let total_active: number | null = null;
  let distinct_active_orgs: number | null = null;
  let by_kind: Record<string, number> = {};

  if (presentSet.has("crr_notification_channels")) {
    try {
      // total active
      const { count, error: e1 } = await supabase
        .from("crr_notification_channels")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      if (e1) errors.push(`crr_notification_channels count: ${e1.message}`);
      else total_active = count ?? 0;

      // distinct active orgs — count via aggregation workaround
      const { data: orgRows, error: e2 } = await supabase
        .from("crr_notification_channels")
        .select("org_id")
        .eq("is_active", true);
      if (e2) errors.push(`crr_notification_channels org_id: ${e2.message}`);
      else {
        const orgIds = new Set(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (orgRows as any[]).map((r) => r.org_id as string),
        );
        distinct_active_orgs = orgIds.size;
      }

      // by_kind breakdown (type column in this project)
      const { data: kindRows, error: e3 } = await supabase
        .from("crr_notification_channels")
        .select("type")
        .eq("is_active", true);
      if (e3) errors.push(`crr_notification_channels by_kind: ${e3.message}`);
      else {
        const agg: Record<string, number> = {};
        for (const row of (kindRows ?? []) as ByKindRow[]) {
          const k = String(row.type ?? "unknown");
          agg[k] = (agg[k] ?? 0) + 1;
        }
        by_kind = agg;
      }
    } catch (e) {
      errors.push(`endpoints metrics exception: ${String(e)}`);
    }
  }

  // ── 3. Last-24h dispatch stats ─────────────────────────────────────────
  let total_dispatches: number | null = null;
  let dispatches_sent: number | null = null;
  let dispatches_failed: number | null = null;
  let error_rate: number | null = null;

  if (presentSet.has("crr_alert_dispatches")) {
    try {
      const { count: dTotal, error: e1 } = await supabase
        .from("crr_alert_dispatches")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 86400_000).toISOString());
      if (e1) errors.push(`crr_alert_dispatches total: ${e1.message}`);
      else total_dispatches = dTotal ?? 0;

      const { count: dSent, error: e2 } = await supabase
        .from("crr_alert_dispatches")
        .select("*", { count: "exact", head: true })
        .eq("status", "sent")
        .gte("created_at", new Date(Date.now() - 86400_000).toISOString());
      if (e2) errors.push(`crr_alert_dispatches sent: ${e2.message}`);
      else dispatches_sent = dSent ?? 0;

      const { count: dFailed, error: e3 } = await supabase
        .from("crr_alert_dispatches")
        .select("*", { count: "exact", head: true })
        .in("status", ["failed"])
        .gte("created_at", new Date(Date.now() - 86400_000).toISOString());
      if (e3) errors.push(`crr_alert_dispatches failed: ${e3.message}`);
      else dispatches_failed = dFailed ?? 0;

      if (total_dispatches !== null && total_dispatches > 0) {
        error_rate = Math.round(((dispatches_failed ?? 0) / total_dispatches) * 10000) / 100;
      } else {
        error_rate = 0;
      }
    } catch (e) {
      errors.push(`dispatch metrics exception: ${String(e)}`);
    }
  }

  // ── 4. Alerts last 24h ─────────────────────────────────────────────────
  let alerts_last_24h: number | null = null;

  if (presentSet.has("crr_org_alerts")) {
    try {
      const { count, error: e } = await supabase
        .from("crr_org_alerts")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 86400_000).toISOString());
      if (e) errors.push(`crr_org_alerts count: ${e.message}`);
      else alerts_last_24h = count ?? 0;
    } catch (e) {
      errors.push(`alerts exception: ${String(e)}`);
    }
  }

  // ── 5. Notification log last 24h ───────────────────────────────────────
  let log_total: number | null = null;
  let log_sent: number | null = null;
  let log_failed: number | null = null;
  let log_avg_latency_ms: number | null = null;

  if (presentSet.has("crr_notification_log")) {
    try {
      const { data: logRows, error: eLog } = await supabase
        .from("crr_notification_log")
        .select("status, latency_ms")
        .gte("created_at", new Date(Date.now() - 86400_000).toISOString());
      if (eLog) errors.push(`crr_notification_log: ${eLog.message}`);
      else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = (logRows ?? []) as any[];
        log_total = rows.length;
        log_sent = rows.filter((r) => r.status === "sent").length;
        log_failed = rows.filter((r) => r.status === "failed").length;
        const latencies = rows
          .filter((r) => typeof r.latency_ms === "number")
          .map((r) => r.latency_ms as number);
        log_avg_latency_ms =
          latencies.length > 0
            ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
            : 0;
      }
    } catch (e) {
      errors.push(`notification log exception: ${String(e)}`);
    }
  }

  // ── 6. Assemble response ───────────────────────────────────────────────
  const response: DiagnosticsResponse = {
    ok: true,
    now,
    tables_present,
    tables_missing,
    metrics: {
      endpoints: {
        total_active,
        distinct_active_orgs,
        by_kind,
      },
      last_24h: {
        total_dispatches,
        sent: dispatches_sent,
        failed: dispatches_failed,
        error_rate,
        alerts: alerts_last_24h,
      },
      log_24h: {
        total: log_total,
        sent: log_sent,
        failed: log_failed,
        avg_latency_ms: log_avg_latency_ms,
      },
    },
    errors,
  };

  return NextResponse.json(response, { status: 200 });
}
