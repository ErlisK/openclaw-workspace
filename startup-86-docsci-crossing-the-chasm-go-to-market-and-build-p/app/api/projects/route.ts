// GET /api/projects — list projects for current user's orgs
// POST /api/projects — create a project
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("docsci_projects")
    .select(`id, name, github_repo, docs_path, openapi_path, sdk_languages, ci_enabled, created_at, org_id, docsci_orgs(name, slug)`)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, org_id, github_repo, docs_path, openapi_path, sdk_languages } = await req.json();
  if (!name || !org_id) return NextResponse.json({ error: "name and org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("docsci_projects")
    .insert({ name, org_id, github_repo, docs_path: docs_path || "docs/", openapi_path, sdk_languages: sdk_languages || ["python", "typescript"] })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("docsci_audit_log").insert({
    org_id, user_id: user.id, action: "project.create",
    resource_type: "project", resource_id: data.id,
    metadata: { name, github_repo },
  });

  return NextResponse.json({ project: data });
}
