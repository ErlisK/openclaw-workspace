/**
 * GET /api/cron/nudges — sweep all trialing orgs and send eligible nudge emails
 *
 * Called by Vercel cron: daily at 09:00 UTC
 * Also callable manually with CRON_SECRET header.
 */
import { NextRequest, NextResponse } from "next/server";
import { sweepNudges } from "@/lib/nudges";
import { sweepExpiredTrials } from "@/lib/plan-enforcement";
import { logInfo } from "@/lib/instrumentation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  const CRON_SECRET = process.env.CRON_SECRET ?? "crr-cron-2025-secure";
  const PORTAL_SECRET = process.env.PORTAL_SECRET ?? "crr-portal-2025";

  if (secret !== CRON_SECRET && secret !== PORTAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [nudgeResult, sweepResult] = await Promise.all([
    sweepNudges(),
    sweepExpiredTrials(),
  ]);

  logInfo("Nudge cron completed", {
    nudges_sent: nudgeResult.sent,
    nudges_skipped: nudgeResult.skipped,
    orgs_processed: nudgeResult.processed,
    trials_swept: sweepResult.swept,
  } as Parameters<typeof logInfo>[1]);

  return NextResponse.json({
    ok: true,
    nudges: nudgeResult,
    trial_sweep: sweepResult,
    ran_at: new Date().toISOString(),
  });
}

// Also allow POST for manual trigger
export { GET as POST };
