/**
 * POST /api/smoke-test
 *
 * Run API smoke tests from an OpenAPI spec against a staging base URL.
 *
 * Request body:
 *   openapi_url?: string       — URL to fetch the OpenAPI spec from
 *   openapi_text?: string      — Raw OpenAPI YAML or JSON text
 *   base_url: string           — Staging server base URL (must be HTTPS, not private IP)
 *   auth_header?: string       — Authorization header value (e.g. "Bearer sk_test_...")
 *   max_probes?: number        — Max probes to run (default: 20, max: 50)
 *   timeout_ms?: number        — Per-request timeout in ms (default: 10000, max: 30000)
 *   allowlist?: string[]       — Extra hostnames to allow beyond base_url hostname
 *
 * Response (200): SmokeRunSummary
 * Response (400): { error: string }
 *
 * GET /api/smoke-test: returns usage docs
 */
import { NextRequest, NextResponse } from "next/server";
import { runSmokeTests, isUrlAllowed } from "@/lib/smoke-test";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel function max

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/smoke-test",
    description:
      "Run API smoke tests from an OpenAPI spec against a staging base URL",
    request: {
      openapi_url: "string (optional) — URL to fetch OpenAPI spec",
      openapi_text: "string (optional) — Raw OpenAPI YAML or JSON",
      base_url: "string (required) — Staging server base URL",
      auth_header: "string (optional) — Authorization header (e.g. Bearer sk_test_...)",
      max_probes: "number (optional, default: 20, max: 50)",
      timeout_ms: "number (optional, default: 10000, max: 30000)",
      allowlist: "string[] (optional) — Extra hostnames to allow",
    },
    response: {
      baseUrl: "string",
      specTitle: "string",
      specVersion: "string",
      probeCount: "number",
      passCount: "number",
      failCount: "number",
      blockedCount: "number",
      errorCount: "number",
      results: "SmokeResult[]",
    },
    security: {
      allowedProtocols: ["https"],
      blockedHosts: "Private IPs (10.x, 172.16-31.x, 192.168.x, 127.x, localhost)",
      allowlist: "Only base_url hostname + explicit allowlist entries are probed",
    },
  });
}

export async function POST(req: NextRequest) {
  try { await requireUser() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    openapi_url,
    openapi_text,
    base_url,
    auth_header,
    max_probes,
    timeout_ms,
    allowlist,
  } = body as {
    openapi_url?: string;
    openapi_text?: string;
    base_url?: string;
    auth_header?: string;
    max_probes?: number;
    timeout_ms?: number;
    allowlist?: string[];
  };

  // Validate required fields
  if (!base_url) {
    return NextResponse.json({ error: "base_url is required" }, { status: 400 });
  }
  if (!openapi_url && !openapi_text) {
    return NextResponse.json(
      { error: "Either openapi_url or openapi_text is required" },
      { status: 400 }
    );
  }

  // Validate base_url
  let parsedBase: URL;
  try {
    parsedBase = new URL(base_url);
  } catch {
    return NextResponse.json({ error: "Invalid base_url" }, { status: 400 });
  }

  // Build preliminary allowlist to check the base URL
  const allowedHosts = [parsedBase.hostname, ...(Array.isArray(allowlist) ? allowlist : [])];
  const baseCheck = isUrlAllowed(base_url, allowedHosts);
  if (!baseCheck.allowed) {
    return NextResponse.json(
      { error: `base_url not allowed: ${baseCheck.reason}` },
      { status: 400 }
    );
  }

  // Clamp options
  const maxProbes = Math.min(Number(max_probes ?? 20), 50);
  const timeoutMs = Math.min(Number(timeout_ms ?? 10_000), 30_000);

  try {
    const summary = await runSmokeTests({
      baseUrl: base_url,
      openApiUrl: openapi_url,
      openApiText: openapi_text,
      authHeader: auth_header,
      maxProbes,
      timeoutMs,
      allowlist: Array.isArray(allowlist) ? allowlist : [],
    });

    return NextResponse.json(summary, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const isValidation =
      msg.includes("not allowed") ||
      msg.includes("Invalid") ||
      msg.includes("required");
    return NextResponse.json(
      { error: msg },
      { status: isValidation ? 400 : 502 }
    );
  }
}
