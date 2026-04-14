/**
 * lib/analytics.ts
 *
 * Unified analytics layer for DocsCI:
 * - Server-side PostHog capture (posthog-node)
 * - Supabase event storage (docsci_events table)
 * - Structured error capture (docsci_error_log table)
 *
 * PostHog key is optional — if NEXT_PUBLIC_POSTHOG_KEY is not set,
 * events are still stored in Supabase (no-op for PostHog calls).
 *
 * Standard event taxonomy:
 *   run.queued         — CI run triggered
 *   run.completed      — CI run finished (status, finding_count, duration_ms)
 *   run.failed         — CI run hard error (not findings-failed, but system error)
 *   org.created        — New org created
 *   org.invite.created — Invite link generated
 *   org.invite.used    — Invite link accepted
 *   project.created    — New project created
 *   export.downloaded  — JSON or SARIF export downloaded
 *   template.viewed    — CI template viewed
 *   template.downloaded — CI template downloaded
 *   error.captured     — Structured error stored
 *   page.viewed        — Page view (server-side)
 */

import { createClient as createServiceClient } from "@supabase/supabase-js";

export type AnalyticsEvent = {
  event: string;
  distinctId?: string;
  orgId?: string;
  projectId?: string;
  runId?: string;
  properties?: Record<string, unknown>;
};

export type ErrorEvent = {
  errorType: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  severity?: "fatal" | "error" | "warning" | "info";
  runId?: string;
  orgId?: string;
};

function svc() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key);
}

function getPosthogApiKey(): string | null {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY ?? null;
}

function getPosthogHost(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
}

/**
 * Capture a product analytics event.
 * Fire-and-forget — never throws.
 */
export async function captureEvent(ev: AnalyticsEvent): Promise<void> {
  try {
    // 1. Store in Supabase (always, for in-product metrics)
    const db = svc();
    if (db) {
      await db.from("docsci_events").insert({
        event: ev.event,
        distinct_id: ev.distinctId ?? null,
        org_id: ev.orgId ?? null,
        project_id: ev.projectId ?? null,
        run_id: ev.runId ?? null,
        properties: ev.properties ?? {},
      });
    }

    // 2. Forward to PostHog (if API key available — e.g. in Vercel prod)
    const phKey = getPosthogApiKey();
    if (phKey) {
      try {
        const { PostHog } = await import("posthog-node");
        const ph = new PostHog(phKey, { host: getPosthogHost(), flushAt: 1, flushInterval: 0 });
        ph.capture({
          distinctId: ev.distinctId ?? "anonymous",
          event: ev.event,
          properties: {
            ...ev.properties,
            $lib: "docsci-server",
            org_id: ev.orgId,
            project_id: ev.projectId,
            run_id: ev.runId,
          },
        });
        await ph.shutdown();
      } catch {
        // PostHog is optional — silently ignore failures
      }
    }
  } catch {
    // Analytics must never throw
  }
}

/**
 * Capture a structured error for in-product error tracking.
 * Fire-and-forget — never throws.
 */
export async function captureError(err: ErrorEvent): Promise<void> {
  try {
    const db = svc();
    if (db) {
      await db.from("docsci_error_log").insert({
        error_type: err.errorType,
        message: err.message.slice(0, 2000),
        stack: err.stack?.slice(0, 5000) ?? null,
        context: err.context ?? {},
        severity: err.severity ?? "error",
        run_id: err.runId ?? null,
        org_id: err.orgId ?? null,
      });
    }

    // Also send to PostHog as a $exception event
    const phKey = getPosthogApiKey();
    if (phKey) {
      try {
        const { PostHog } = await import("posthog-node");
        const ph = new PostHog(phKey, { host: getPosthogHost(), flushAt: 1, flushInterval: 0 });
        ph.capture({
          distinctId: "system",
          event: "$exception",
          properties: {
            $exception_type: err.errorType,
            $exception_message: err.message,
            $exception_stack_trace_raw: err.stack,
            severity: err.severity ?? "error",
            ...err.context,
          },
        });
        await ph.shutdown();
      } catch {
        // PostHog is optional
      }
    }
  } catch {
    // Never throw
  }
}

/**
 * Compute a SHA-256 hash of an IP for privacy-safe storage.
 * Returns the first 16 hex chars (64-bit prefix).
 */
export async function hashIp(ip: string): Promise<string> {
  try {
    const { createHash } = await import("crypto");
    return createHash("sha256").update(ip + (process.env.IP_HASH_SALT ?? "docsci")).digest("hex").slice(0, 16);
  } catch {
    return "unknown";
  }
}
