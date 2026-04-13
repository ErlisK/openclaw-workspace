// POST /api/openapi-import — import an OpenAPI spec by URL
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { source_url, org_id, repo_id } = await req.json();
  if (!source_url || !org_id) {
    return NextResponse.json({ error: "source_url and org_id required" }, { status: 400 });
  }

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(source_url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // HTTP allowlist for smoke tests (only HTTPS, no internal IPs)
  const hostname = parsedUrl.hostname;
  const privateIPPattern = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|localhost|::1)/;
  if (privateIPPattern.test(hostname)) {
    return NextResponse.json(
      { error: "Internal/private URLs are not allowed. Use a public staging URL." },
      { status: 400 }
    );
  }
  if (parsedUrl.protocol !== "https:") {
    return NextResponse.json({ error: "Only HTTPS URLs are allowed" }, { status: 400 });
  }

  // Fetch the OpenAPI spec
  let spec: Record<string, unknown>;
  try {
    const res = await fetch(source_url, {
      headers: { Accept: "application/json, application/yaml, text/yaml, */*" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const text = await res.text();
    // Try JSON first, then basic YAML detection
    try {
      spec = JSON.parse(text);
    } catch {
      // Basic YAML: count top-level openapi key
      if (text.includes("openapi:") || text.includes("swagger:")) {
        spec = { _raw: text, _format: "yaml" };
      } else {
        throw new Error("Response is not valid JSON or YAML OpenAPI spec");
      }
    }
  } catch (err) {
    return NextResponse.json({ error: `Failed to fetch spec: ${String(err)}` }, { status: 400 });
  }

  // Parse spec metadata
  const specVersion = (spec.openapi as string) || (spec.swagger as string) || "unknown";
  const paths = spec.paths as Record<string, unknown> || {};
  const endpointsCount = Object.keys(paths).length;

  // Store import record
  const { data: importRecord, error } = await supabase
    .from("docsci_openapi_imports")
    .insert({
      org_id,
      repo_id: repo_id || null,
      source_url,
      spec_version: specVersion,
      endpoints_count: endpointsCount,
      status: "imported",
      last_checked_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  await supabase.from("docsci_audit_log").insert({
    org_id,
    user_id: user.id,
    action: "openapi.import",
    resource_type: "openapi_import",
    resource_id: importRecord.id,
    metadata: { source_url, spec_version: specVersion, endpoints_count: endpointsCount },
  });

  return NextResponse.json({
    import: importRecord,
    summary: {
      spec_version: specVersion,
      endpoints_count: endpointsCount,
      title: (spec.info as { title?: string })?.title || "Untitled API",
      paths: Object.keys(paths).slice(0, 10),
    },
  });
}
