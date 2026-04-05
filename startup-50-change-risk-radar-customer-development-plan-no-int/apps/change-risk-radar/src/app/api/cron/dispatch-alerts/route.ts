/**
 * GET|POST /api/cron/dispatch-alerts
 *
 * Alias/redirect to /api/cron/dispatch-notifications.
 * The main dispatch logic lives in dispatch-notifications/route.ts.
 * This route exists for compatibility with the task spec and any
 * external callers using the /dispatch-alerts path.
 *
 * Protected by CRON_SECRET (x-cron-secret header or ?secret= query param).
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

function checkAuth(req: NextRequest): boolean {
  const header = req.headers.get("x-cron-secret") ?? req.headers.get("x-cloudtrail-token");
  const query = req.nextUrl.searchParams.get("secret");
  return !!(header === CRON_SECRET || query === CRON_SECRET) && CRON_SECRET.length > 0;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Delegate to dispatch-notifications
  const targetUrl = new URL("/api/cron/dispatch-notifications", req.url);
  const res = await fetch(targetUrl.toString(), {
    method: "POST",
    headers: { "x-cron-secret": CRON_SECRET },
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json({ delegated: true, ...data });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
