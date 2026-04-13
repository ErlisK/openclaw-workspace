/**
 * lib/drift-detect.ts
 *
 * SDK/API drift detection engine for DocsCI.
 *
 * Compares what docs say against what the OpenAPI spec says:
 *
 * 1. ENDPOINT drift: docs reference an endpoint (URL pattern, method) that
 *    doesn't exist in the spec — or uses wrong HTTP method
 *
 * 2. PARAMETER drift: docs pass required params that are missing, or pass
 *    params with wrong names/types
 *
 * 3. METHOD/SDK drift: docs call a client method (e.g. client.connect())
 *    that doesn't match any spec operationId or path (replaced by init())
 *
 * 4. REMOVED_ENDPOINT: docs reference a path that was in an older spec
 *    version but has been removed
 *
 * 5. MISSING_EXAMPLE: spec has an important endpoint with no doc coverage
 *
 * Input:
 *   - OpenAPI spec (YAML/JSON parsed)
 *   - Docs content: array of { path, content, codeFences }
 *
 * Output:
 *   DriftFinding[] — each with type, severity, file, line, message, suggestion
 */

import * as yaml from "js-yaml";

// ── Types ─────────────────────────────────────────────────────────────────

export type DriftType =
  | "endpoint_not_in_spec"    // docs reference endpoint not in OpenAPI
  | "wrong_method"            // docs use GET but spec says POST, etc.
  | "sdk_method_removed"      // docs call client.foo() but spec has no such operationId
  | "required_param_missing"  // docs use endpoint but omit required request body fields
  | "missing_example"         // spec endpoint has no doc coverage at all
  | "deprecated_pattern"      // docs use a pattern flagged as deprecated in spec
  | "wrong_response_shape";   // docs reference response fields that don't exist in spec

export type DriftSeverity = "error" | "warning" | "info";

export interface DriftFinding {
  type: DriftType;
  severity: DriftSeverity;
  file: string;
  /** 1-indexed line number in file, if known */
  line?: number;
  /** Snippet language */
  language?: string;
  /** The problematic text extracted from the doc */
  evidence: string;
  /** Human-readable description */
  message: string;
  /** Suggested fix */
  suggestion: string;
  /** Which spec path this is about */
  specPath?: string;
  /** Which spec operation this is about */
  specOperationId?: string;
}

export interface CodeFence {
  language: string;
  code: string;
  /** 1-indexed start line in the file */
  startLine?: number;
}

export interface DocFile {
  path: string;
  content: string;
  codeFences: CodeFence[];
}

export interface DriftReport {
  specTitle: string;
  specVersion: string;
  docsAnalyzed: number;
  fencesAnalyzed: number;
  findings: DriftFinding[];
  endpointCoverage: {
    total: number;
    covered: number;
    uncovered: string[];
  };
  ranAt: string;
}

// ── OpenAPI spec helpers ───────────────────────────────────────────────────

export interface SpecOperation {
  method: string; // uppercase
  path: string;   // e.g. /init
  operationId?: string;
  summary?: string;
  description?: string;
  deprecated?: boolean;
  requiredParams: string[];
  requiredBodyFields: string[];
  responseFields: Record<string, string[]>; // statusCode -> field names
  tags?: string[];
}

function getRequiredBodyFields(
  op: Record<string, unknown>,
  spec: Record<string, unknown>
): string[] {
  const rb = op.requestBody as Record<string, unknown> | undefined;
  if (!rb) return [];
  const content = rb.content as Record<string, unknown> | undefined;
  if (!content) return [];
  const json = content["application/json"] as Record<string, unknown> | undefined;
  if (!json?.schema) return [];
  const schema = resolveRef(json.schema as Record<string, unknown>, spec);
  return (schema?.required as string[]) ?? [];
}

function resolveRef(
  schema: Record<string, unknown>,
  spec: Record<string, unknown>
): Record<string, unknown> | null {
  if (!schema?.$ref) return schema;
  const ref = schema.$ref as string;
  if (!ref.startsWith("#/")) return schema;
  const parts = ref.slice(2).split("/");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = spec;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return null;
    cur = cur[p];
  }
  return cur ?? null;
}

export function extractOperations(
  spec: Record<string, unknown>
): SpecOperation[] {
  const ops: SpecOperation[] = [];
  const paths = (spec.paths as Record<string, unknown>) ?? {};

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;
    const item = pathItem as Record<string, unknown>;

    for (const method of ["get", "post", "put", "patch", "delete", "head", "options"] as const) {
      const op = item[method] as Record<string, unknown> | undefined;
      if (!op) continue;

      // Extract required query/path parameters
      const params = (op.parameters as Array<Record<string, unknown>>) ?? [];
      const requiredParams = params
        .filter((p) => p.required === true)
        .map((p) => p.name as string);

      // Extract required body fields
      const requiredBodyFields = getRequiredBodyFields(op, spec);

      // Extract 200 response fields
      const responses = (op.responses as Record<string, unknown>) ?? {};
      const responseFields: Record<string, string[]> = {};
      for (const [statusCode, response] of Object.entries(responses)) {
        const resp = response as Record<string, unknown>;
        const content = resp.content as Record<string, unknown> | undefined;
        if (!content) continue;
        const json = content["application/json"] as Record<string, unknown> | undefined;
        if (!json?.schema) continue;
        const schema = resolveRef(json.schema as Record<string, unknown>, spec);
        if (schema?.properties) {
          responseFields[statusCode] = Object.keys(
            schema.properties as Record<string, unknown>
          );
        }
      }

      ops.push({
        method: method.toUpperCase(),
        path,
        operationId: op.operationId as string | undefined,
        summary: op.summary as string | undefined,
        description: op.description as string | undefined,
        deprecated: op.deprecated as boolean | undefined,
        requiredParams,
        requiredBodyFields,
        responseFields,
        tags: op.tags as string[] | undefined,
      });
    }
  }
  return ops;
}

// ── Pattern extraction from code ──────────────────────────────────────────

// HTTP method + URL patterns: client.get("/users"), requests.get("https://api.x.com/v2/users")
// Also: fetch("https://api.x.com/v2/users")
const HTTP_CALL_PATTERNS = [
  // requests.get("/path") or requests.post("https://...")
  /(?:requests|client|axios|http)\.(get|post|put|patch|delete|head)\s*\(\s*["'`]([^"'`]+)["'`]/gi,
  // fetch("https://...")
  /fetch\s*\(\s*["'`]([^"'`]+)["'`]/gi,
  // client.get("/path"), api.post("/path"), etc.
  /(?:this\.)?(?:client|api|sdk)\.(get|post|put|patch|delete|head)\s*\(\s*["'`]([^"'`]+)["'`]/gi,
];

// SDK method call patterns: client.connect(), client.init(), etc.
const SDK_METHOD_PATTERN =
  /(?:client|sdk|acme|api)\s*\.([a-zA-Z][a-zA-Z0-9_]*)\s*\(/g;

// URL-only patterns (GET parameters passed)
const URL_PATTERN =
  /["'`](https?:\/\/[^"'`\s]+|\/[a-zA-Z0-9_/:{}-]+)["'`]/g;

interface ExtractedCall {
  method?: string;
  path: string;
  rawText: string;
  line?: number;
}

interface ExtractedSDKCall {
  method: string;
  rawText: string;
  line?: number;
}

function normalizePath(url: string): string {
  // Extract path from full URL, or return as-is if already a path
  try {
    const u = new URL(url);
    return u.pathname;
  } catch {
    // Already a path — normalize path params
    return url.replace(/\/\d+/g, "/{id}").replace(/\/[a-f0-9-]{36}/g, "/{id}");
  }
}

function extractHttpCalls(code: string): ExtractedCall[] {
  const calls: ExtractedCall[] = [];
  const lines = code.split("\n");

  for (const pattern of HTTP_CALL_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(code)) !== null) {
      const fullMatch = match[0];
      const lineNum =
        code.slice(0, match.index).split("\n").length;

      if (pattern.source.includes("fetch")) {
        // fetch("url") — no method in match, assume GET
        const url = match[1];
        if (!url.includes("localhost") && !url.includes("example.com")) {
          calls.push({
            path: normalizePath(url),
            rawText: fullMatch.slice(0, 60),
            line: lineNum,
          });
        }
      } else {
        const method = match[1].toUpperCase();
        const url = match[2];
        calls.push({
          method,
          path: normalizePath(url),
          rawText: fullMatch.slice(0, 60),
          line: lineNum,
        });
      }
    }
    void lines; // suppress unused
  }
  return calls;
}

function extractSDKCalls(code: string): ExtractedSDKCall[] {
  const calls: ExtractedSDKCall[] = [];
  SDK_METHOD_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SDK_METHOD_PATTERN.exec(code)) !== null) {
    const methodName = match[1];
    const lineNum = code.slice(0, match.index).split("\n").length;
    // Filter out common non-API method names
    if (!["then", "catch", "finally", "bind", "call", "apply", "toString", "valueOf"].includes(methodName)) {
      calls.push({
        method: methodName,
        rawText: match[0],
        line: lineNum,
      });
    }
  }
  return calls;
}

// ── Drift detection core ──────────────────────────────────────────────────

function pathMatches(docPath: string, specPath: string): boolean {
  // Normalize spec path params {id} -> match any segment
  const specRegex = new RegExp(
    "^" +
    specPath
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&") // escape regex chars (but not {})
      .replace(/\\\{[^}]+\\\}/g, "[^/]+") // {param} -> [^/]+
      .replace(/\{[^}]+\}/g, "[^/]+") +  // unescaped {param}
    "$"
  );
  return specRegex.test(docPath);
}

function findMatchingOp(
  docPath: string,
  docMethod: string | undefined,
  ops: SpecOperation[]
): { exact?: SpecOperation; pathOnly?: SpecOperation; wrongMethod?: SpecOperation } {
  for (const op of ops) {
    if (pathMatches(docPath, op.path)) {
      if (!docMethod || op.method === docMethod) {
        return { exact: op };
      } else {
        return { wrongMethod: op, pathOnly: op };
      }
    }
  }
  // Try fuzzy path match (ignore trailing slash, case)
  const normalDoc = docPath.replace(/\/$/, "").toLowerCase();
  for (const op of ops) {
    const normalSpec = op.path.replace(/\/$/, "").toLowerCase();
    if (normalDoc === normalSpec || normalDoc.includes(normalSpec.replace(/\{[^}]+\}/g, ""))) {
      return { pathOnly: op };
    }
  }
  return {};
}

export function detectDrift(
  spec: Record<string, unknown>,
  docs: DocFile[]
): DriftReport {
  const info = (spec.info as Record<string, unknown>) ?? {};
  const specTitle = (info.title as string) ?? "Unknown API";
  const specVersion = (info.version as string) ?? "unknown";

  const ops = extractOperations(spec);

  // Collect all deprecation hints from spec descriptions
  const deprecatedPatterns: Array<{ old: string; new: string }> = [];
  for (const op of ops) {
    const desc = (op.description ?? "") + (op.summary ?? "");
    // Pattern: "replaces deprecated /connect" or "deprecated: use /init instead"
    const replaceMatch = desc.match(/replaces?\s+deprecated\s+([/`\w]+)/i);
    if (replaceMatch) {
      const oldPattern = replaceMatch[1].replace(/`/g, "");
      deprecatedPatterns.push({ old: oldPattern, new: op.path });
    }
    const useMatch = desc.match(/(?:use|replaced by)\s+([/`\w]+)\s+instead/i);
    if (useMatch) {
      const newPattern = useMatch[1].replace(/`/g, "");
      deprecatedPatterns.push({ old: op.path, new: newPattern });
    }
  }

  // Known SDK method -> operationId/path mappings
  const sdkMethodToOp: Record<string, SpecOperation> = {};
  for (const op of ops) {
    if (op.operationId) {
      sdkMethodToOp[op.operationId] = op;
      // Also map camelCase operationId variations
      const camel = op.operationId.replace(/[-_]([a-z])/g, (_, c) => c.toUpperCase());
      sdkMethodToOp[camel] = op;
    }
    // Map path-derived names: /init -> init, /users -> listUsers etc.
    const pathName = op.path.replace(/^\//, "").replace(/[/-]([a-z])/g, (_, c) => c.toUpperCase());
    if (pathName) sdkMethodToOp[pathName] = op;
  }

  const findings: DriftFinding[] = [];
  let totalFences = 0;
  const coveredPaths = new Set<string>();

  for (const doc of docs) {
    for (const fence of doc.codeFences) {
      totalFences++;

      const httpCalls = extractHttpCalls(fence.code);
      const sdkCalls = extractSDKCalls(fence.code);

      // Check HTTP calls against spec
      for (const call of httpCalls) {
        const { exact, wrongMethod, pathOnly } = findMatchingOp(
          call.path,
          call.method,
          ops
        );

        if (exact) {
          coveredPaths.add(exact.path);
          // Check required params
          if (exact.requiredBodyFields.length > 0 && ["POST", "PUT", "PATCH"].includes(exact.method)) {
            for (const field of exact.requiredBodyFields) {
              if (!fence.code.includes(field)) {
                findings.push({
                  type: "required_param_missing",
                  severity: "warning",
                  file: doc.path,
                  line: call.line,
                  language: fence.language,
                  evidence: call.rawText,
                  message: `${exact.method} ${exact.path} requires field '${field}' but it's not in the example`,
                  suggestion: `Add '${field}' to the request body in this example`,
                  specPath: exact.path,
                  specOperationId: exact.operationId,
                });
              }
            }
          }
        } else if (wrongMethod && pathOnly) {
          coveredPaths.add(pathOnly.path);
          findings.push({
            type: "wrong_method",
            severity: "error",
            file: doc.path,
            line: call.line,
            language: fence.language,
            evidence: call.rawText,
            message: `Example uses ${call.method} ${call.path} but spec defines ${pathOnly.method} ${pathOnly.path}`,
            suggestion: `Change to ${pathOnly.method} ${pathOnly.path}`,
            specPath: pathOnly.path,
            specOperationId: pathOnly.operationId,
          });
        } else {
          // Path not found in spec at all
          // Check if it's a deprecated pattern
          const deprecation = deprecatedPatterns.find(
            (d) => call.path.includes(d.old) || d.old.includes(call.path)
          );
          if (deprecation) {
            findings.push({
              type: "deprecated_pattern",
              severity: "error",
              file: doc.path,
              line: call.line,
              language: fence.language,
              evidence: call.rawText,
              message: `Example uses deprecated pattern '${deprecation.old}' — spec replaced it with '${deprecation.new}'`,
              suggestion: `Update to use '${deprecation.new}'`,
              specPath: deprecation.new,
            });
          } else {
            // Only flag if path looks like a real API path (not a URL string literal)
            const cleanPath = call.path.replace(/\/$/, "");
            if (cleanPath.length > 1 && !cleanPath.includes("example.com") && ops.length > 0) {
              findings.push({
                type: "endpoint_not_in_spec",
                severity: "warning",
                file: doc.path,
                line: call.line,
                language: fence.language,
                evidence: call.rawText,
                message: `Example references ${call.method ?? "??"} ${call.path} but this endpoint is not in the OpenAPI spec`,
                suggestion: `Check if this endpoint exists in the current spec version`,
                specPath: call.path,
              });
            }
          }
        }
      }

      // Check SDK method calls against known operations
      for (const call of sdkCalls) {
        const opMatch = sdkMethodToOp[call.method];
        if (!opMatch) {
          // Check if it's a deprecated method name
          const deprecation = deprecatedPatterns.find(
            (d) =>
              call.method === d.old.replace(/^\//, "").replace(/-/g, "") ||
              d.old.includes(call.method)
          );

          // Only flag well-known API method names
          const likelyApiMethod =
            ["connect", "init", "create", "list", "get", "update", "delete",
             "send", "fetch", "subscribe", "unsubscribe", "publish"].includes(call.method.toLowerCase());

          if (likelyApiMethod) {
            findings.push({
              type: "sdk_method_removed",
              severity: deprecation ? "error" : "warning",
              file: doc.path,
              line: call.line,
              language: fence.language,
              evidence: call.rawText,
              message: deprecation
                ? `client.${call.method}() is deprecated — spec replaced it with '${deprecation.new}'`
                : `client.${call.method}() has no matching operationId in the spec`,
              suggestion: deprecation
                ? `Replace client.${call.method}() with the updated endpoint/method`
                : `Verify this SDK method matches an operationId in the spec`,
              specOperationId: undefined,
            });
          }
        } else {
          coveredPaths.add(opMatch.path);
          // Check deprecated
          if (opMatch.deprecated) {
            findings.push({
              type: "deprecated_pattern",
              severity: "warning",
              file: doc.path,
              line: call.line,
              language: fence.language,
              evidence: call.rawText,
              message: `${call.method}() is marked deprecated in the spec (operationId: ${opMatch.operationId})`,
              suggestion: `Use the recommended replacement per spec docs`,
              specPath: opMatch.path,
              specOperationId: opMatch.operationId,
            });
          }
        }
      }
    }
  }

  // Detect missing examples for spec endpoints
  const uncoveredPaths: string[] = [];
  for (const op of ops) {
    if (!coveredPaths.has(op.path)) {
      uncoveredPaths.push(`${op.method} ${op.path}`);
      findings.push({
        type: "missing_example",
        severity: "info",
        file: "(no doc coverage)",
        evidence: `${op.method} ${op.path}`,
        message: `No doc example found for ${op.method} ${op.path} (${op.operationId ?? "no operationId"})`,
        suggestion: `Add a code example for this endpoint in the docs`,
        specPath: op.path,
        specOperationId: op.operationId,
      });
    }
  }

  return {
    specTitle,
    specVersion,
    docsAnalyzed: docs.length,
    fencesAnalyzed: totalFences,
    findings,
    endpointCoverage: {
      total: ops.length,
      covered: coveredPaths.size,
      uncovered: uncoveredPaths,
    },
    ranAt: new Date().toISOString(),
  };
}

// ── Entry point: from raw YAML/JSON text + doc files ──────────────────────

export async function runDriftDetection(
  openApiText: string,
  docs: DocFile[]
): Promise<DriftReport> {
  let spec: Record<string, unknown>;
  try {
    spec = yaml.load(openApiText) as Record<string, unknown>;
    if (!spec || typeof spec !== "object") throw new Error("Not an object");
  } catch {
    spec = JSON.parse(openApiText) as Record<string, unknown>;
  }

  return detectDrift(spec, docs);
}
