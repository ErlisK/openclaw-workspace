/**
 * GET /api/runs/sample
 *
 * Returns a pre-existing demo run with findings and suggestions.
 * If no demo run exists, creates one from the sample fixture.
 * No auth required — used for demo and E2E testing.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const supabase = getServiceClient();

  // Get most recent completed run
  const { data: run } = await supabase
    .from("docsci_runs")
    .select("*")
    .eq("status", "failed")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!run) {
    return NextResponse.json({ message: "No completed runs yet. POST /api/runs/queue to create one." });
  }

  const { data: findings } = await supabase
    .from("docsci_findings")
    .select("*")
    .eq("run_id", run.id)
    .order("created_at");

  const { data: suggestions } = await supabase
    .from("docsci_suggestions")
    .select("*")
    .eq("run_id", run.id)
    .order("created_at");

  return NextResponse.json({
    run,
    findings: findings || [],
    suggestions: suggestions || [],
  });
}
