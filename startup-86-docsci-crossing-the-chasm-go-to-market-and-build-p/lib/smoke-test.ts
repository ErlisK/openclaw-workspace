/**
 * lib/smoke-test.ts
 *
 * API smoke test engine for DocsCI.
 *
 * Given an OpenAPI spec (YAML or JSON) and a staging base URL:
 * 1. Parse the spec to extract endpoints
 * 2. Auto-generate minimal GET/POST probes for each endpoint
 * 3. Enforce per-project network allowlist (HTTPS only, no private IPs)
 * 4. Fire HTTP requests against staging and collect status/latency
 * 5. Return structured findings with pass/fail/skip per probe
 */

import * as yaml from "js-yaml";

// ── Types ──────────────────────────────────────────────────────────────────

export interface SmokeProbe {
  operationId: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  url: string;
  headers: Record<string, string>;
  body?: Record<string, unknown>;
  description: string;
}

export type SmokeStatus = "pass" | "fail" | "blocked" | "error" | "skipped";

export interface SmokeResult {
  probe: SmokeProbe;
  status: SmokeStatus;
  statusCode?: number;
  latencyMs?: number;
  responseBody?: string;
  error?: string;
  detail: string;
}

export interface SmokeRunSummary {
  baseUrl: string;
  specTitle: string;
  specVersion: string;
  probeCount: number;
  passCount: number;
  failCount: number;
  blockedCount: number;
  errorCount: number;
  skippedCount: number;
  totalLatencyMs: number;
  results: SmokeResult[];
  ranAt: string;
}

export interface SmokeOptions {
  /** Staging base URL — all probes will be sent here */
  baseUrl: string;
  /** OpenAPI spec: either YAML/JSON text or a URL to fetch */
  openApiText?: string;
  openApiUrl?: string;
  /** Custom auth header value (e.g. "Bearer sk_test_...") */
  authHeader?: string;
  /** Max probes to run (default: 20) */
  maxProbes?: number;
  /** Timeout per request in ms (default: 10000) */
  timeoutMs?: number;
  /** Per-project network allowlist — extra hosts to allow beyond baseUrl */
  allowlist?: string[];
}

// ── Network allowlist ──────────────────────────────────────────────────────

const PRIVATE_IP_PATTERN =
  /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|localhost$|::1$|0\.0\.0\.0$)/i;

export function isUrlAllowed(
  url: string,
  allowedHostnames: string[]
): { allowed: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { allowed: false, reason: "Invalid URL" };
  }

  if (parsed.protocol !== "https:") {
    return { allowed: false, reason: "Only HTTPS is allowed" };
  }

  if (PRIVATE_IP_PATTERN.test(parsed.hostname)) {
    return {
      allowed: false,
      reason: `Private/internal IP or hostname '${parsed.hostname}' is not allowed`,
    };
  }

  // Check against allowlist (exact match or suffix)
  const hostnameAllowed = allowedHostnames.some(
    (h) =>
      parsed.hostname === h ||
      parsed.hostname.endsWith("." + h)
  );
  if (!hostnameAllowed) {
    return {
      allowed: false,
      reason: `Host '${parsed.hostname}' is not in the project allowlist`,
    };
  }

  return { allowed: true };
}

// ── OpenAPI parser ──────────────────────────────────────────────────────────

// Supported schema primitives for generating example values
function schemaExample(schema: Record<string, unknown>): unknown {
  if (!schema || typeof schema !== "object") return null;
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum && Array.isArray(schema.enum)) return schema.enum[0];

  const type = schema.type as string;
  switch (type) {
    case "string":
      if (schema.format === "email") return "user@example.com";
      if (schema.format === "uuid") return "00000000-0000-0000-0000-000000000000";
      if (schema.format === "date-time") return new Date().toISOString();
      if (schema.format === "uri") return "https://example.com";
      return "string";
    case "integer":
    case "number":
      return 1;
    case "boolean":
      return true;
    case "array":
      return [];
    case "object": {
      if (!schema.properties) return {};
      const obj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(
        schema.properties as Record<string, unknown>
      )) {
        obj[k] = schemaExample(v as Record<string, unknown>);
      }
      return obj;
    }
    default:
      return null;
  }
}

function resolveRef(
  ref: string,
  spec: Record<string, unknown>
): Record<string, unknown> | null {
  // Only support local $ref like #/components/schemas/Foo
  if (!ref.startsWith("#/")) return null;
  const parts = ref.slice(2).split("/");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = spec;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return null;
    cur = cur[p];
  }
  return cur ?? null;
}

function resolveSchema(
  schema: Record<string, unknown>,
  spec: Record<string, unknown>
): Record<string, unknown> {
  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref as string, spec);
    return resolved ?? schema;
  }
  return schema;
}

export function generateProbes(
  spec: Record<string, unknown>,
  baseUrl: string,
  maxProbes: number,
  authHeader?: string
): SmokeProbe[] {
  const probes: SmokeProbe[] = [];
  const paths = (spec.paths as Record<string, unknown>) ?? {};

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "DocsCI-SmokeTester/1.0",
  };
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }

  // Normalize base URL (remove trailing slash)
  const base = baseUrl.replace(/\/$/, "");

  for (const [rawPath, pathItem] of Object.entries(paths)) {
    if (probes.length >= maxProbes) break;
    if (!pathItem || typeof pathItem !== "object") continue;

    const item = pathItem as Record<string, unknown>;

    // Prioritize GET then POST
    for (const method of ["get", "post", "put", "patch", "delete"] as const) {
      if (probes.length >= maxProbes) break;
      const op = item[method] as Record<string, unknown> | undefined;
      if (!op) continue;

      const operationId =
        (op.operationId as string) ?? `${method.toUpperCase()}_${rawPath}`;
      const summary = (op.summary as string) ?? operationId;

      // Resolve path parameters with placeholder values
      const resolvedPath = rawPath.replace(/\{([^}]+)\}/g, (_match, param) => {
        // Try to infer from parameter list
        const params = (op.parameters as Array<Record<string, unknown>>) ?? [];
        const pDef = params.find((p) => p.name === param);
        if (pDef?.schema) {
          const ex = schemaExample(
            resolveSchema(
              pDef.schema as Record<string, unknown>,
              spec
            )
          );
          if (ex !== null) return String(ex);
        }
        // Fallback based on param name
        if (param.toLowerCase().includes("id")) return "1";
        return "test";
      });

      const url = `${base}${resolvedPath}`;

      let body: Record<string, unknown> | undefined;
      if (["post", "put", "patch"].includes(method)) {
        const rb = op.requestBody as Record<string, unknown> | undefined;
        if (rb?.content) {
          const content = rb.content as Record<string, unknown>;
          const jsonContent = (
            content["application/json"] as Record<string, unknown> | undefined
          );
          if (jsonContent?.schema) {
            let schema = jsonContent.schema as Record<string, unknown>;
            schema = resolveSchema(schema, spec);
            const example = schemaExample(schema);
            if (example && typeof example === "object") {
              body = example as Record<string, unknown>;
            } else {
              body = {};
            }
          } else {
            body = {};
          }
        } else {
          body = {};
        }
      }

      probes.push({
        operationId,
        method: method.toUpperCase() as SmokeProbe["method"],
        path: rawPath,
        url,
        headers,
        body,
        description: summary,
      });
    }
  }

  return probes;
}

// ── Spec fetch + parse ──────────────────────────────────────────────────────

export async function fetchAndParseSpec(
  urlOrText: string,
  isUrl: boolean,
  allowedHostnames: string[]
): Promise<{ spec: Record<string, unknown>; raw: string }> {
  let raw: string;

  if (isUrl) {
    const check = isUrlAllowed(urlOrText, allowedHostnames);
    if (!check.allowed) {
      throw new Error(`OpenAPI URL not allowed: ${check.reason}`);
    }

    const res = await fetch(urlOrText, {
      headers: { Accept: "application/json, application/yaml, text/yaml, */*" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch OpenAPI spec: HTTP ${res.status}`);
    }
    raw = await res.text();
  } else {
    raw = urlOrText;
  }

  // Parse YAML or JSON
  let spec: Record<string, unknown>;
  try {
    spec = yaml.load(raw) as Record<string, unknown>;
  } catch {
    spec = JSON.parse(raw);
  }

  if (!spec || typeof spec !== "object") {
    throw new Error("Invalid OpenAPI spec: not an object");
  }

  return { spec, raw };
}

// ── Probe executor ──────────────────────────────────────────────────────────

const MAX_RESPONSE_BODY = 2048;

export async function runProbe(
  probe: SmokeProbe,
  allowedHostnames: string[],
  timeoutMs: number
): Promise<SmokeResult> {
  // Allowlist check
  const check = isUrlAllowed(probe.url, allowedHostnames);
  if (!check.allowed) {
    return {
      probe,
      status: "blocked",
      detail: `Blocked: ${check.reason}`,
      error: check.reason,
    };
  }

  const t0 = Date.now();
  try {
    const fetchOpts: RequestInit = {
      method: probe.method,
      headers: probe.headers,
      signal: AbortSignal.timeout(timeoutMs),
    };

    if (probe.body !== undefined) {
      fetchOpts.body = JSON.stringify(probe.body);
    }

    const res = await fetch(probe.url, fetchOpts);
    const latencyMs = Date.now() - t0;

    // Read response body (capped)
    let responseBody: string | undefined;
    try {
      const text = await res.text();
      responseBody = text.slice(0, MAX_RESPONSE_BODY);
    } catch {
      responseBody = undefined;
    }

    // 2xx = pass, 4xx/5xx = fail
    const status: SmokeStatus =
      res.status >= 200 && res.status < 300
        ? "pass"
        : res.status >= 400 && res.status < 500
        ? "fail"   // 4xx = client error (e.g. 401 unauthed, 422 wrong body)
        : res.status >= 500
        ? "fail"   // 5xx = server error
        : "pass";  // 3xx treated as pass (redirect)

    return {
      probe,
      status,
      statusCode: res.status,
      latencyMs,
      responseBody,
      detail:
        status === "pass"
          ? `HTTP ${res.status} in ${latencyMs}ms`
          : `HTTP ${res.status} in ${latencyMs}ms — expected 2xx`,
    };
  } catch (e: unknown) {
    const latencyMs = Date.now() - t0;
    const msg = e instanceof Error ? e.message : String(e);
    const timedOut = msg.includes("timeout") || msg.includes("AbortError");

    return {
      probe,
      status: "error",
      latencyMs,
      error: msg,
      detail: timedOut
        ? `Timeout after ${latencyMs}ms`
        : `Network error: ${msg}`,
    };
  }
}

// ── Main entry point ────────────────────────────────────────────────────────

export async function runSmokeTests(
  opts: SmokeOptions
): Promise<SmokeRunSummary> {
  const {
    baseUrl,
    openApiText,
    openApiUrl,
    authHeader,
    maxProbes = 20,
    timeoutMs = 10_000,
    allowlist = [],
  } = opts;

  if (!openApiText && !openApiUrl) {
    throw new Error("Either openApiText or openApiUrl is required");
  }

  // Validate base URL
  let parsedBase: URL;
  try {
    parsedBase = new URL(baseUrl);
  } catch {
    throw new Error(`Invalid base URL: ${baseUrl}`);
  }

  // Build allowlist: always include base URL hostname
  const allowedHostnames = Array.from(
    new Set([parsedBase.hostname, ...allowlist])
  );

  // Fetch + parse spec
  const source = openApiUrl ?? openApiText!;
  const isUrl = !!openApiUrl;
  const { spec } = await fetchAndParseSpec(source, isUrl, allowedHostnames);

  const info = (spec.info as Record<string, unknown>) ?? {};
  const specTitle = (info.title as string) ?? "Unknown API";
  const specVersion = (info.version as string) ?? "unknown";

  // Generate probes
  const probes = generateProbes(spec, baseUrl, maxProbes, authHeader);

  // Run probes with limited concurrency (max 5 parallel)
  const CONCURRENCY = 5;
  const results: SmokeResult[] = [];

  for (let i = 0; i < probes.length; i += CONCURRENCY) {
    const batch = probes.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((probe) => runProbe(probe, allowedHostnames, timeoutMs))
    );
    results.push(...batchResults);
  }

  // Summarize
  const passCount = results.filter((r) => r.status === "pass").length;
  const failCount = results.filter((r) => r.status === "fail").length;
  const blockedCount = results.filter((r) => r.status === "blocked").length;
  const errorCount = results.filter((r) => r.status === "error").length;
  const skippedCount = results.filter((r) => r.status === "skipped").length;
  const totalLatencyMs = results.reduce((acc, r) => acc + (r.latencyMs ?? 0), 0);

  return {
    baseUrl,
    specTitle,
    specVersion,
    probeCount: results.length,
    passCount,
    failCount,
    blockedCount,
    errorCount,
    skippedCount,
    totalLatencyMs,
    results,
    ranAt: new Date().toISOString(),
  };
}
