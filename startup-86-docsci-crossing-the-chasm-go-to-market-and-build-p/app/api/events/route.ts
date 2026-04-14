/**
 * POST /api/events
 *
 * Product analytics event ingestion endpoint.
 * Stores in docsci_events and forwards to PostHog if configured.
 *
 * Body:
 * {
 *   event: string,           — event name (required)
 *   distinct_id?: string,    — user/session ID
 *   properties?: object,     — arbitrary event properties
 *   org_id?: string,
 *   project_id?: string,
 *   run_id?: string
 * }
 *
 * GET /api/events — list recent events (for admin debugging)
 */
import { NextRequest, NextResponse } from "next/server";
import { captureEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

// Event allowlist — prevents arbitrary strings from being stored
const ALLOWED_EVENTS = new Set([
  // Runs
  "run.queued", "run.completed", "run.failed",
  // Org
  "org.created", "org.invite.created", "org.invite.used", "org.member.removed",
  // Project
  "project.created", "project.updated",
  // Export
  "export.downloaded",
  // Patches
  "patch.downloaded", "patch_downloaded",
  // Templates
  "template.viewed", "template.downloaded",
  // UI
  "page.viewed", "dashboard.opened", "metrics.viewed",
  // Onboarding
  "onboarding.started", "onboarding.completed", "onboarding.step",
  // Auth
  "user.signup", "user.login",
  // Errors
  "error.captured",
]);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const event = body.event as string;

  if (!event || typeof event !== "string") {
    return NextResponse.json({ error: "event is required" }, { status: 400 });
  }

  // Allow exact matches or wildcard prefix for custom events
  if (!ALLOWED_EVENTS.has(event) && !event.startsWith("custom.")) {
    return NextResponse.json({ error: `Unknown event: ${event}` }, { status: 400 });
  }

  // Get IP for hashing
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { hashIp } = await import("@/lib/analytics");
  const ipHash = await hashIp(ip);

  await captureEvent({
    event,
    distinctId: body.distinct_id as string | undefined,
    orgId: body.org_id as string | undefined,
    projectId: body.project_id as string | undefined,
    runId: body.run_id as string | undefined,
    properties: {
      ...(typeof body.properties === "object" ? body.properties : {}),
      ip_hash: ipHash,
      user_agent: req.headers.get("user-agent")?.slice(0, 200),
    },
  });

  return NextResponse.json({ captured: true, event });
}

export async function GET(req: NextRequest) {
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!,
  );
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(parseInt(sp.get("limit") ?? "50"), 200);
  const eventFilter = sp.get("event");

  let q = db
    .from("docsci_events")
    .select("id, event, distinct_id, org_id, project_id, run_id, properties, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (eventFilter) q = q.eq("event", eventFilter);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ events: data ?? [], total: (data ?? []).length });
}
