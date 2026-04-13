/**
 * GET /api/findings?run_id=<id> — list findings for a run
 * GET /api/findings/[id]        — get a single finding with its suggestion
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!;
  return createServiceClient(url, key);
}

export async function GET(req: NextRequest) {
  const authSupabase = createAuthClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const runId = searchParams.get("run_id");
  const findingId = searchParams.get("id");

  const supabase = getServiceClient();

  if (findingId) {
    const { data: finding } = await supabase
      .from("docsci_findings")
      .select("*")
      .eq("id", findingId)
      .single();

    const { data: suggestions } = await supabase
      .from("docsci_suggestions")
      .select("*")
      .eq("finding_id", findingId)
      .order("created_at", { ascending: false });

    return NextResponse.json({ finding, suggestions: suggestions ?? [] });
  }

  if (!runId) return NextResponse.json({ error: "run_id or id required" }, { status: 400 });

  const { data: findings } = await supabase
    .from("docsci_findings")
    .select("*")
    .eq("run_id", runId)
    .order("severity")
    .order("created_at");

  // Also fetch suggestions for these findings to show "has fix" badge
  const findingIds = (findings ?? []).map((f: { id: string }) => f.id);
  const { data: suggestions } = findingIds.length > 0
    ? await supabase
        .from("docsci_suggestions")
        .select("id, finding_id, patch_diff, explanation")
        .in("finding_id", findingIds)
    : { data: [] };

  return NextResponse.json({ findings: findings ?? [], suggestions: suggestions ?? [] });
}
