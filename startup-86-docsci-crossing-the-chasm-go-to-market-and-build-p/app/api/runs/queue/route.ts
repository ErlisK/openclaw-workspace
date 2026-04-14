/**
 * POST /api/runs/queue
 *
 * Queue a CI run. Two modes:
 *   1. Authenticated: provide repo_id (runs against GitHub repo)
 *   2. Demo/unauthenticated: provide docs[] directly (runs inline)
 *
 * Request body:
 *   mode: "repo" | "inline"    (default: "inline")
 *   repo_id?: string           (for mode=repo, requires auth)
 *   docs?: DocFile[]           (for mode=inline)
 *   openapi_text?: string      (optional, for drift detection)
 *   branch?: string            (default: "main")
 *
 * Response (200): { run_id, status, findingCount, suggestionCount, durationMs, ... }
 * Response (400/401/500): { error: string }
 *
 * For mode=inline (demo), runs synchronously (Vercel Functions have 60s timeout).
 * For mode=repo, creates a run record and runs inline (same).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { runOrchestrator } from "@/lib/run-orchestrator";
import { readFileSync } from "fs";
import { join } from "path";
import type { DocFile } from "@/lib/drift-detect";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel hobby: 60s

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!;
  return createServiceClient(url, key, { auth: { persistSession: false } });
}

// Load sample fixture docs
function loadSampleDocs(): { docs: DocFile[]; openapiText: string } | null {
  try {
    const base = join(process.cwd(), "lib/fixtures/sample-repo");
    const gettingStarted = readFileSync(join(base, "docs/getting-started.md"), "utf8");
    const webhooks = readFileSync(join(base, "docs/webhooks.md"), "utf8");
    const openapiText = readFileSync(join(base, "openapi.yaml"), "utf8");

    const parseFences = (content: string) => {
      const fences: { language: string; code: string; startLine?: number }[] = [];
      const lines = content.split("\n");
      let inFence = false;
      let lang = "";
      let fenceLines: string[] = [];
      let startLine = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!inFence && /^```(\w*)/.test(line)) {
          inFence = true;
          lang = line.match(/^```(\w*)/)?.[1] ?? "";
          fenceLines = [];
          startLine = i + 1;
        } else if (inFence && /^```\s*$/.test(line)) {
          if (fenceLines.join("").trim()) {
            fences.push({ language: lang || "text", code: fenceLines.join("\n"), startLine });
          }
          inFence = false;
          fenceLines = [];
        } else if (inFence) {
          fenceLines.push(line);
        }
      }
      return fences;
    };

    const docs: DocFile[] = [
      { path: "docs/getting-started.md", content: gettingStarted, codeFences: parseFences(gettingStarted) },
      { path: "docs/webhooks.md", content: webhooks, codeFences: parseFences(webhooks) },
    ];

    return { docs, openapiText };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // empty body is OK — default to sample run
  }

  const mode = (body.mode as string) || "inline";
  const branch = (body.branch as string) || "main";
  const openapiText = body.openapi_text as string | undefined;
  const docsciConfigText = body.docsci_config as string | undefined;

  const supabase = getServiceClient();

  let docs: DocFile[] = [];
  let effectiveOpenapiText: string | undefined = openapiText;
  let projectId: string;
  let triggeredBy: string | null = null;

  // ── Mode: authenticated repo run ─────────────────────────────────────
  if (mode === "repo") {
    const authSupabase = createAuthClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    triggeredBy = user.id;

    // RBAC: viewer role cannot trigger runs
    const { data: membership } = await supabase
      .from("docsci_org_members")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    if (membership?.role === "viewer") {
      return NextResponse.json({ error: "Forbidden: viewers cannot trigger runs" }, { status: 403 });
    }

    const repoId = body.repo_id as string;
    if (!repoId) return NextResponse.json({ error: "repo_id required for mode=repo" }, { status: 400 });

    const { data: repo } = await authSupabase
      .from("docsci_repos")
      .select("*")
      .eq("id", repoId)
      .single();
    if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });

    projectId = repo.id;

    // For now, use sample docs (GitHub fetching is in ci-pipeline.ts)
    const sample = loadSampleDocs();
    if (sample) {
      docs = sample.docs;
      effectiveOpenapiText = effectiveOpenapiText || sample.openapiText;
    }
  }
  // ── Mode: inline (demo, no auth required) ─────────────────────────────
  else {
    const inlineDocs = body.docs as DocFile[] | undefined;
    if (inlineDocs && Array.isArray(inlineDocs) && inlineDocs.length > 0) {
      docs = inlineDocs;
    } else {
      // Fall back to sample fixture
      const sample = loadSampleDocs();
      if (!sample) return NextResponse.json({ error: "No docs provided and sample fixture not found" }, { status: 400 });
      docs = sample.docs;
      effectiveOpenapiText = effectiveOpenapiText || sample.openapiText;
    }

    // For inline demo runs, use or create a demo org+project
    const { data: demoProject } = await supabase
      .from("docsci_projects")
      .select("id")
      .eq("name", "Demo Project")
      .maybeSingle();

    if (demoProject) {
      projectId = demoProject.id;
    } else {
      // Need an org first
      let orgId: string;
      const { data: demoOrg } = await supabase
        .from("docsci_orgs")
        .select("id")
        .eq("name", "Demo Org")
        .maybeSingle();
      if (demoOrg) {
        orgId = demoOrg.id;
      } else {
        const { data: newOrg } = await supabase
          .from("docsci_orgs")
          .insert({ name: "Demo Org", slug: "demo-org", plan: "free" })
          .select("id")
          .single();
        orgId = newOrg?.id ?? "";
      }
      const { data: newProject } = await supabase
        .from("docsci_projects")
        .insert({ name: "Demo Project", org_id: orgId, github_repo: "demo/sample", docs_path: "docs", ci_enabled: false })
        .select("id")
        .single();
      projectId = newProject?.id ?? "";
      if (!projectId) {
        return NextResponse.json({ error: `Failed to create/find demo project` }, { status: 500 });
      }
    }
  }

  // ── Create run record ─────────────────────────────────────────────────
  const { data: runRecord, error: runErr } = await supabase
    .from("docsci_runs")
    .insert({
      project_id: projectId,
      triggered_by: triggeredBy,
      status: "pending",
      branch,
      commit_sha: (body.commit_sha as string) || "HEAD",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (runErr || !runRecord) {
    return NextResponse.json(
      { error: runErr?.message || "Failed to create run record" },
      { status: 500 }
    );
  }

  // ── Execute run synchronously ─────────────────────────────────────────
  try {
    const result = await runOrchestrator({
      runId: runRecord.id,
      projectId,
      docs,
      openapiText: effectiveOpenapiText,
      branch,
      commitSha: (body.commit_sha as string) || "HEAD",
      docsciConfigText,
    });

    return NextResponse.json({
      run_id: result.runId,
      sandbox_id: result.sandboxId,
      status: result.status,
      finding_count: result.findingCount,
      suggestion_count: result.suggestionCount,
      duration_ms: result.durationMs,
      snippets_total: result.snippetsTotal,
      snippets_passed: result.snippetsPassed,
      snippets_failed: result.snippetsFailed,
      drift_detected: result.driftDetected,
      config_loaded: result.configLoaded,
      checks_enabled: result.checksEnabled,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET: list recent runs (no auth required for demo)
export async function GET(req: NextRequest) {
  const supabase = getServiceClient();
  const projectId = req.nextUrl.searchParams.get("project_id");

  let query = supabase
    .from("docsci_runs")
    .select("id, project_id, status, branch, commit_sha, snippets_total, snippets_passed, snippets_failed, drift_detected, duration_ms, started_at, completed_at")
    .order("started_at", { ascending: false })
    .limit(20);

  if (projectId) query = query.eq("project_id", projectId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ runs: data || [] });
}
