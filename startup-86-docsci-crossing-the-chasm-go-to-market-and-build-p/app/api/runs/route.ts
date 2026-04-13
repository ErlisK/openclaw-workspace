// POST /api/runs — trigger a CI run for a repo
// GET  /api/runs — list recent runs
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runCIPipeline } from "@/lib/ci-pipeline";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const repoId = req.nextUrl.searchParams.get("repo_id");
  let query = supabase
    .from("docsci_ci_runs")
    .select(`
      id, commit_sha, branch, status, examples_total, examples_passed, examples_failed,
      drift_detected, started_at, completed_at, repo_id,
      docsci_repos(github_repo)
    `)
    .order("started_at", { ascending: false })
    .limit(50);

  if (repoId) query = query.eq("repo_id", repoId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ runs: data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { repo_id, branch = "main" } = await req.json();
  if (!repo_id) return NextResponse.json({ error: "repo_id required" }, { status: 400 });

  // Get repo details
  const { data: repo, error: repoErr } = await supabase
    .from("docsci_repos")
    .select("*")
    .eq("id", repo_id)
    .single();

  if (repoErr || !repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });

  // Create the run record
  const { data: run, error: runErr } = await supabase
    .from("docsci_ci_runs")
    .insert({
      repo_id,
      branch,
      status: "running",
      commit_sha: "HEAD",
    })
    .select()
    .single();

  if (runErr || !run) return NextResponse.json({ error: runErr?.message }, { status: 500 });

  // Audit log
  await supabase.from("docsci_audit_log").insert({
    org_id: repo.org_id,
    user_id: user.id,
    action: "run.trigger",
    resource_type: "ci_run",
    resource_id: run.id,
    metadata: { github_repo: repo.github_repo, branch },
  });

  // Run the pipeline (async — updates run record when complete)
  runCIPipeline(run.id, repo, supabase).catch(console.error);

  return NextResponse.json({ run });
}
