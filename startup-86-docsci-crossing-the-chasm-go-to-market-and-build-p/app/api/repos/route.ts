// POST /api/repos — import a public GitHub repo by URL
// GET  /api/repos — list repos for current user's orgs
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all repos across user's orgs
  const { data, error } = await supabase
    .from("docsci_repos")
    .select(`
      id, github_repo, docs_path, openapi_path, sdk_languages, ci_enabled, last_run_at, created_at,
      org_id,
      docsci_orgs(name, slug)
    `)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ repos: data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { repo_url, org_id, docs_path, openapi_path, sdk_languages } = body;

  if (!repo_url || !org_id) {
    return NextResponse.json({ error: "repo_url and org_id required" }, { status: 400 });
  }

  // Validate it's a valid GitHub URL
  const match = repo_url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    return NextResponse.json({ error: "Only public GitHub repos supported (https://github.com/owner/repo)" }, { status: 400 });
  }

  const github_repo = `${match[1]}/${match[2].replace(/\.git$/, "")}`;

  // Verify repo is accessible via GitHub API
  const ghRes = await fetch(`https://api.github.com/repos/${github_repo}`, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}),
    },
  });

  if (!ghRes.ok) {
    const errBody = await ghRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: `Cannot access repo: ${errBody.message || ghRes.statusText}` },
      { status: 400 }
    );
  }

  const ghData = await ghRes.json();

  // Insert into DB (RLS ensures user is org member)
  const { data: repo, error } = await supabase
    .from("docsci_repos")
    .insert({
      org_id,
      github_repo,
      docs_path: docs_path || "docs/",
      openapi_path: openapi_path || null,
      sdk_languages: sdk_languages || ["python", "typescript"],
      ci_enabled: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log audit event
  await supabase.from("docsci_audit_log").insert({
    org_id,
    user_id: user.id,
    action: "repo.import",
    resource_type: "repo",
    resource_id: repo.id,
    metadata: { github_repo, stars: ghData.stargazers_count, language: ghData.language },
  });

  return NextResponse.json({ repo, github: { name: ghData.full_name, description: ghData.description, stars: ghData.stargazers_count } });
}
