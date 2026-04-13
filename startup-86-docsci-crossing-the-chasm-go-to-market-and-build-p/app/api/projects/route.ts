/**
 * POST /api/projects — create a new project
 * GET  /api/projects — list projects for the authenticated user's org
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!;
  return createServiceClient(url, key);
}

export async function GET() {
  const authSupabase = createAuthClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getServiceClient();

  // Get user's orgs
  const { data: memberships } = await supabase
    .from("docsci_org_members")
    .select("org_id")
    .eq("user_id", user.id);

  const orgIds = memberships?.map((m: { org_id: string }) => m.org_id) ?? [];
  if (orgIds.length === 0) return NextResponse.json({ projects: [] });

  const { data: projects } = await supabase
    .from("docsci_projects")
    .select("*")
    .in("org_id", orgIds)
    .order("created_at", { ascending: false });

  return NextResponse.json({ projects: projects ?? [] });
}

export async function POST(req: NextRequest) {
  const authSupabase = createAuthClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, github_repo, docs_path, openapi_path, sdk_languages } = body;

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const supabase = getServiceClient();

  // Get (or create) org for user
  const { data: memberships } = await supabase
    .from("docsci_org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  let orgId: string;
  if (memberships?.org_id) {
    orgId = memberships.org_id;
  } else {
    // Create personal org
    const { data: newOrg } = await supabase
      .from("docsci_orgs")
      .insert({
        name: `${user.email}'s Org`,
        slug: `org-${user.id.slice(0, 8)}`,
        plan: "free",
      })
      .select("id")
      .single();
    if (!newOrg) return NextResponse.json({ error: "Failed to create org" }, { status: 500 });
    orgId = newOrg.id;
    await supabase.from("docsci_org_members").insert({
      org_id: orgId,
      user_id: user.id,
      role: "owner",
    });
  }

  const { data: project, error } = await supabase
    .from("docsci_projects")
    .insert({
      org_id: orgId,
      name,
      github_repo: github_repo || null,
      docs_path: docs_path || "docs",
      openapi_path: openapi_path || null,
      sdk_languages: sdk_languages || [],
      ci_enabled: true,
    })
    .select("*")
    .single();

  if (error || !project) {
    return NextResponse.json({ error: error?.message || "Failed to create project" }, { status: 500 });
  }

  return NextResponse.json({ project }, { status: 201 });
}
