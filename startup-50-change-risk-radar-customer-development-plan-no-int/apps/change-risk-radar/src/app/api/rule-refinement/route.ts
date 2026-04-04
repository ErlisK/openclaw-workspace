import { NextRequest, NextResponse } from "next/server";
import { runRuleRefinement, getReactionTelemetry } from "@/lib/rule-refinement";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// GET — telemetry summary + dry-run preview
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = req.nextUrl.searchParams.get("mode") ?? "telemetry";

  if (mode === "telemetry") {
    const telemetry = await getReactionTelemetry();
    return NextResponse.json(telemetry);
  }

  if (mode === "preview") {
    const summary = await runRuleRefinement(true);  // dry-run
    return NextResponse.json(summary);
  }

  if (mode === "apply") {
    const summary = await runRuleRefinement(false);  // write changes
    return NextResponse.json(summary);
  }

  return NextResponse.json({ error: "mode must be: telemetry | preview | apply" }, { status: 400 });
}

// POST — apply refinements
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body.dry_run === true;

  const summary = await runRuleRefinement(dryRun);
  return NextResponse.json({
    ...summary,
    applied: !dryRun,
    rules_changed: summary.rules.filter(r =>
      r.recommended_action !== "keep" && r.signal !== null
    ).length,
  });
}
