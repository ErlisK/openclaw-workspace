/**
 * lib/sandbox-security.ts
 *
 * Security primitives for DocsCI sandbox execution:
 *
 * 1. Per-run ephemeral sandbox ID (sandboxId)
 *    - Unique UUIDv4 generated per run, attached to every finding/log
 *    - Allows audit trail: "what code ran in what sandbox with what result"
 *    - Stored in docsci_runs.sandbox_id (optional column, graceful fallback)
 *
 * 2. Network allowlist enforcement
 *    - HTTPS-only (no http://)
 *    - Private IP ranges blocked (RFC-1918, loopback, link-local)
 *    - Configurable per-project allowlist (domains + IP CIDR)
 *    - Used by sandbox fetch stubs and smoke-test probe generation
 *
 * 3. Log redaction
 *    - Strip secrets from stdout/stderr before persisting to Supabase
 *    - Redacts: JWTs, API keys (sk_/pk_/rk_), bearer tokens, Supabase URLs,
 *      Stripe keys, GitHub tokens, passwords, env-var-like KEY=value patterns
 *    - Replaces with [REDACTED] to preserve line structure for debugging
 *
 * 4. Sandbox audit event
 *    - Structured log entry capturing: sandboxId, runId, language, outcome,
 *      durationMs, outputBytes, redactedOutput
 */

import { randomUUID } from "crypto";

// ── 1. Ephemeral sandbox ID ───────────────────────────────────────────────────

/**
 * Generate a per-run ephemeral sandbox identifier.
 * Format: `sbx_<16-hex-chars>` — human-readable prefix for audit logs.
 */
export function generateSandboxId(): string {
  // randomUUID() uses crypto.getRandomValues() — cryptographically secure
  const uuid = randomUUID().replace(/-/g, "");
  return `sbx_${uuid.slice(0, 16)}`;
}

// ── 2. Network allowlist ──────────────────────────────────────────────────────

/** Private/reserved IP ranges that sandboxes must never reach */
const PRIVATE_IP_RANGES = [
  // Loopback
  /^127\./,
  /^::1$/,
  // Link-local
  /^169\.254\./,
  /^fe80:/i,
  // RFC-1918 private
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  // Carrier-grade NAT
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  // Documentation/test
  /^192\.0\.2\./,
  /^198\.51\.100\./,
  /^203\.0\.113\./,
  // Multicast / reserved
  /^(22[4-9]|23\d|24\d|25[0-5])\./,
  // IPv6 private
  /^fd[0-9a-f]{2}:/i,
  /^fc[0-9a-f]{2}:/i,
  // AWS IMDS
  /^169\.254\.169\.254$/,
  // Metadata service hostname
  /^metadata\.google\.internal$/,
  /^169\.254\.169\.254$/,
];

/** Hostnames that are always blocked regardless of allowlist */
const BLOCKED_HOSTNAMES = [
  "localhost",
  "metadata.google.internal",
  "169.254.169.254",
  "::1",
];

export interface AllowlistConfig {
  /** Allowed domains (e.g. ["api.stripe.com", "*.example.com"]) */
  domains?: string[];
  /** Explicitly allowed IPs (e.g. for self-hosted staging APIs) */
  allowedIps?: string[];
  /** If true, no external network access at all */
  networkIsolated?: boolean;
}

export interface AllowlistCheckResult {
  allowed: boolean;
  reason?: string;
  category?: "private_ip" | "blocked_host" | "not_https" | "not_in_allowlist" | "network_isolated" | "ok";
}

/**
 * Check whether a URL is permitted by the sandbox allowlist.
 *
 * @param url  The URL the snippet is attempting to reach
 * @param config Per-project allowlist configuration
 */
export function checkAllowlist(url: string, config?: AllowlistConfig): AllowlistCheckResult {
  // 1. Network isolation — no external access at all
  if (config?.networkIsolated) {
    return { allowed: false, reason: "Network access is disabled for this sandbox", category: "network_isolated" };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { allowed: false, reason: `Invalid URL: ${url}`, category: "not_https" };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. HTTPS only
  if (parsed.protocol !== "https:") {
    return {
      allowed: false,
      reason: `Only HTTPS URLs are permitted; got ${parsed.protocol}`,
      category: "not_https",
    };
  }

  // 3. Blocked hostnames
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return {
      allowed: false,
      reason: `Hostname "${hostname}" is blocked (reserved/internal)`,
      category: "blocked_host",
    };
  }

  // 4. Private IP ranges
  for (const pattern of PRIVATE_IP_RANGES) {
    if (pattern.test(hostname)) {
      return {
        allowed: false,
        reason: `IP/hostname "${hostname}" is in a private/reserved range`,
        category: "private_ip",
      };
    }
  }

  // 5. If allowlist is configured, check it
  if (config?.domains && config.domains.length > 0) {
    const allowed = config.domains.some(rule => matchesDomain(hostname, rule));
    if (!allowed) {
      return {
        allowed: false,
        reason: `Hostname "${hostname}" is not in the project allowlist`,
        category: "not_in_allowlist",
      };
    }
  }

  return { allowed: true, category: "ok" };
}

/** Match hostname against a domain rule (exact or wildcard prefix) */
function matchesDomain(hostname: string, rule: string): boolean {
  const norm = rule.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (norm.startsWith("*.")) {
    const suffix = norm.slice(2); // strip "*."
    return hostname === suffix || hostname.endsWith(`.${suffix}`);
  }
  return hostname === norm;
}

/**
 * Create a fetch stub function that enforces the allowlist.
 * Intended to be injected into sandbox contexts instead of the real fetch.
 */
export function createAllowlistedFetch(
  allowlist?: AllowlistConfig
): (url: string, init?: RequestInit) => Promise<Response> {
  return async (url: string, init?: RequestInit): Promise<Response> => {
    const check = checkAllowlist(url, allowlist);
    if (!check.allowed) {
      throw new Error(`[DocsCI Sandbox] Network request blocked: ${check.reason}`);
    }
    // Real fetch — only called if allowlist passes
    return fetch(url, init);
  };
}

// ── 3. Log redaction ──────────────────────────────────────────────────────────

/** Patterns to redact from log output */
const REDACTION_RULES: Array<{ name: string; pattern: RegExp; replacement: string | ((match: string) => string) }> = [
  // JWTs (3 base64url segments)
  {
    name: "jwt",
    pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    replacement: "[REDACTED_JWT]",
  },
  // Stripe secret keys
  {
    name: "stripe_secret",
    pattern: /\b(sk_live_|sk_test_|rk_live_|rk_test_)[A-Za-z0-9]{20,}\b/g,
    replacement: "[REDACTED_STRIPE_KEY]",
  },
  // Stripe publishable keys
  {
    name: "stripe_pk",
    pattern: /\b(pk_live_|pk_test_)[A-Za-z0-9]{20,}\b/g,
    replacement: "[REDACTED_STRIPE_PK]",
  },
  // GitHub tokens (classic ghp_, gho_, ghs_, ghr_)
  {
    name: "github_token",
    pattern: /\b(gh[pousr]_)[A-Za-z0-9_]{36,}\b/g,
    replacement: "[REDACTED_GITHUB_TOKEN]",
  },
  // Fine-grained GitHub PATs
  {
    name: "github_fine_grained",
    pattern: /\bgithub_pat_[A-Za-z0-9_]{82}\b/g,
    replacement: "[REDACTED_GITHUB_PAT]",
  },
  // AWS access keys
  {
    name: "aws_key",
    pattern: /\b(AKIA|ASIA|AROA)[A-Z0-9]{16}\b/g,
    replacement: "[REDACTED_AWS_KEY]",
  },
  // Bearer tokens in Authorization headers
  {
    name: "bearer_token",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{20,}\b/gi,
    replacement: "Bearer [REDACTED]",
  },
  // API key patterns in URLs (key=..., api_key=..., apikey=...)
  {
    name: "url_api_key",
    pattern: /([?&](api[_-]?key|access[_-]?token|auth[_-]?token)=)[A-Za-z0-9_.-]{10,}/gi,
    replacement: "$1[REDACTED]",
  },
  // Supabase service role / anon keys (long base64 JWTs already caught above)
  // Extra: supabase URL patterns
  {
    name: "supabase_url",
    pattern: /https:\/\/[a-z0-9]{20}\.supabase\.co/gi,
    replacement: "https://[REDACTED].supabase.co",
  },
  // Generic env-var assignment patterns (SECRET=..., TOKEN=..., KEY=..., PASSWORD=...)
  {
    name: "env_secret",
    pattern: /\b(SECRET|TOKEN|PASSWORD|PASSWD|API_KEY|AUTH_KEY|PRIVATE_KEY|ACCESS_KEY)[_A-Z0-9]*\s*[=:]\s*['"]?[A-Za-z0-9+/=_.-]{8,}['"]?/gi,
    replacement: (match: string) => {
      // Keep the variable name but redact the value
      const eqIdx = match.search(/[=:]/);
      return eqIdx >= 0 ? match.slice(0, eqIdx + 1) + "[REDACTED]" : "[REDACTED]";
    },
  },
  // Private key PEM blocks
  {
    name: "pem_private_key",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    replacement: "[REDACTED_PRIVATE_KEY]",
  },
  // Postgres connection strings
  {
    name: "postgres_dsn",
    pattern: /postgres(?:ql)?:\/\/[^:]+:[^@\s]+@[^/\s]+\/\S*/gi,
    replacement: "postgresql://[REDACTED]@[REDACTED]/[REDACTED]",
  },
  // MongoDB connection strings
  {
    name: "mongodb_dsn",
    pattern: /mongodb(?:\+srv)?:\/\/[^:]+:[^@\s]+@\S*/gi,
    replacement: "mongodb://[REDACTED]@[REDACTED]",
  },
];

export interface RedactionResult {
  redacted: string;
  redactedCount: number;
  rulesTriggered: string[];
}

/**
 * Redact secrets and sensitive values from log output.
 *
 * @param text  Raw stdout/stderr from sandbox execution
 * @returns     Redacted text + audit metadata
 */
export function redactLogs(text: string): RedactionResult {
  if (!text) return { redacted: "", redactedCount: 0, rulesTriggered: [] };

  let result = text;
  let totalCount = 0;
  const triggered: string[] = [];

  for (const rule of REDACTION_RULES) {
    // Count matches before replacing
    const matches = result.match(rule.pattern);
    if (matches && matches.length > 0) {
      triggered.push(rule.name);
      totalCount += matches.length;
    }

    if (typeof rule.replacement === "function") {
      result = result.replace(rule.pattern, rule.replacement as (match: string) => string);
    } else {
      result = result.replace(rule.pattern, rule.replacement as string);
    }
  }

  // Truncate to 32KB max to prevent log flooding
  const MAX_LOG_BYTES = 32 * 1024;
  if (result.length > MAX_LOG_BYTES) {
    result = result.slice(0, MAX_LOG_BYTES) + "\n[... output truncated ...]";
  }

  return { redacted: result, redactedCount: totalCount, rulesTriggered: triggered };
}

// ── 4. Sandbox audit event ────────────────────────────────────────────────────

export interface SandboxAuditEvent {
  sandboxId: string;
  runId: string;
  projectId?: string;
  language: string;
  filePath?: string;
  lineStart?: number;
  outcome: "pass" | "fail" | "timeout" | "blocked";
  durationMs: number;
  outputBytes: number;
  redactedStdout?: string;
  redactedStderr?: string;
  redactionCount: number;
  allowlistViolation?: string;
  createdAt: string;
}

/**
 * Build a sandbox audit event from execution result.
 * Use this when persisting snippet execution results to Supabase.
 */
export function buildAuditEvent(params: {
  sandboxId: string;
  runId: string;
  projectId?: string;
  language: string;
  filePath?: string;
  lineStart?: number;
  success: boolean;
  timedOut: boolean;
  stdout: string;
  stderr: string;
  durationMs: number;
  outputBytes: number;
  allowlistViolation?: string;
}): SandboxAuditEvent {
  const stdoutResult = redactLogs(params.stdout);
  const stderrResult = redactLogs(params.stderr);

  return {
    sandboxId: params.sandboxId,
    runId: params.runId,
    projectId: params.projectId,
    language: params.language,
    filePath: params.filePath,
    lineStart: params.lineStart,
    outcome: params.timedOut ? "timeout" : params.allowlistViolation ? "blocked" : params.success ? "pass" : "fail",
    durationMs: params.durationMs,
    outputBytes: params.outputBytes,
    redactedStdout: stdoutResult.redacted,
    redactedStderr: stderrResult.redacted,
    redactionCount: stdoutResult.redactedCount + stderrResult.redactedCount,
    allowlistViolation: params.allowlistViolation,
    createdAt: new Date().toISOString(),
  };
}

// ── 5. Secret scanning in code ────────────────────────────────────────────────

/**
 * Pre-execution scan: check if a code snippet itself contains hardcoded secrets.
 * If it does, we can warn the user before executing (or block execution entirely).
 */
export interface SecretScanResult {
  hasSecrets: boolean;
  findings: Array<{ rule: string; line: number; snippet: string }>;
}

const SECRET_SCAN_RULES: Array<{ name: string; pattern: RegExp }> = [
  { name: "stripe_secret_key", pattern: /\bsk_(live|test)_[A-Za-z0-9]{20,}/g },
  { name: "github_token", pattern: /\bgh[pousr]_[A-Za-z0-9_]{36,}/g },
  { name: "github_fine_grained_pat", pattern: /\bgithub_pat_[A-Za-z0-9_]{82}/g },
  { name: "aws_access_key", pattern: /\b(AKIA|ASIA|AROA)[A-Z0-9]{16}/g },
  { name: "jwt_token", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g },
  { name: "private_key_pem", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { name: "postgres_with_password", pattern: /postgres(?:ql)?:\/\/\w+:[^@\s]{4,}@/g },
];

export function scanCodeForSecrets(code: string): SecretScanResult {
  const lines = code.split("\n");
  const findings: Array<{ rule: string; line: number; snippet: string }> = [];

  for (const rule of SECRET_SCAN_RULES) {
    for (let i = 0; i < lines.length; i++) {
      const matches = lines[i].match(rule.pattern);
      if (matches) {
        findings.push({
          rule: rule.name,
          line: i + 1,
          snippet: lines[i].slice(0, 60) + (lines[i].length > 60 ? "…" : ""),
        });
      }
    }
  }

  return { hasSecrets: findings.length > 0, findings };
}

// ── 5. Sandbox caps ───────────────────────────────────────────────────────────

export interface SandboxCaps {
  memory_limit_mb: number;
  cpu_limit_seconds: number;
  timeout_seconds: number;
  max_timeout_seconds: number;
  max_memory_limit_mb: number;
  max_snippets_per_run: number;
  max_docs_per_run: number;
  max_doc_file_size_bytes: number;
  max_openapi_size_bytes: number;
  secret_scan_rules_count: number;
  redaction_rules_count: number;
  network_isolated: boolean;
  allowlist: string[];
}

/**
 * Returns the effective sandbox caps for a given run config.
 * Safe to expose publicly — contains no secrets.
 */
export function getSandboxCaps(opts?: {
  memory_limit_mb?: number;
  cpu_limit_seconds?: number;
  timeout_seconds?: number;
  network_isolated?: boolean;
  allowlist?: string[];
}): SandboxCaps {
  const timeoutS = Math.min(Math.max(opts?.timeout_seconds ?? 20, 1), 60);
  const memMb = Math.min(Math.max(opts?.memory_limit_mb ?? 64, 32), 256);
  const cpuS = Math.min(Math.max(opts?.cpu_limit_seconds ?? 10, 1), 60);

  return {
    memory_limit_mb: memMb,
    cpu_limit_seconds: cpuS,
    timeout_seconds: timeoutS,
    max_timeout_seconds: 60,
    max_memory_limit_mb: 256,
    max_snippets_per_run: 500,
    max_docs_per_run: 1000,
    max_doc_file_size_bytes: 1024 * 1024,       // 1 MB
    max_openapi_size_bytes: 2 * 1024 * 1024,    // 2 MB
    secret_scan_rules_count: SECRET_SCAN_RULES.length,
    redaction_rules_count: REDACTION_RULES.length,
    network_isolated: opts?.network_isolated ?? false,
    allowlist: opts?.allowlist ?? [],
  };
}
