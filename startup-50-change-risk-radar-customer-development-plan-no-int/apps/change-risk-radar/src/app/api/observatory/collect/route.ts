import { NextRequest, NextResponse } from "next/server";
import { runFullCollection } from "@/lib/observatory";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

async function logRun(result: {
  newDiffs?: number;
  totalDiffs?: number;
  snapshots?: number;
  vendorsHit?: number;
  durationMs?: number;
  error?: string;
}) {
  try {
    // Get current total diffs count
    const { count } = await supabaseAdmin
      .from("crr_diffs")
      .select("id", { count: "exact", head: true });

    await supabaseAdmin.from("crr_observatory_runs").insert({
      new_diffs: result.newDiffs ?? 0,
      total_diffs: count ?? result.totalDiffs ?? 0,
      vendors_hit: result.vendorsHit ?? 0,
      snapshots_taken: result.snapshots ?? 0,
      duration_ms: result.durationMs ?? null,
      error: result.error ?? null,
    });
  } catch (e) {
    console.error("Failed to log observatory run:", e);
  }
}

async function runAndLog() {
  const start = Date.now();
  try {
    const results = await runFullCollection();
    const durationMs = Date.now() - start;
    await logRun({ ...results, durationMs });
    return { success: true, ...results, durationMs, timestamp: new Date().toISOString() };
  } catch (err) {
    const durationMs = Date.now() - start;
    await logRun({ error: String(err), durationMs });
    throw err;
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "crr-cron-2025";
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runAndLog();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "crr-cron-2025";
  if (authHeader && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runAndLog();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
