// GET /api/runs/[id] — get run details + snippet results
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: run, error: runErr } = await supabase
    .from("docsci_ci_runs")
    .select(`
      id, commit_sha, branch, status, examples_total, examples_passed, examples_failed,
      drift_detected, started_at, completed_at,
      docsci_repos(github_repo, docs_path, org_id)
    `)
    .eq("id", params.id)
    .single();

  if (runErr || !run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

  const { data: snippets } = await supabase
    .from("docsci_snippet_results")
    .select("*")
    .eq("run_id", params.id)
    .order("created_at");

  return NextResponse.json({ run, snippets: snippets || [] });
}
