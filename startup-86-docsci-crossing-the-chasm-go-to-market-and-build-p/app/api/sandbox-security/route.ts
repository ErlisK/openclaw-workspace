/**
 * GET  /api/sandbox-security        — describe security model
 * POST /api/sandbox-security        — test allowlist, redaction, secret scan
 *
 * Request body (POST):
 *   action: "check_allowlist" | "redact_logs" | "scan_code" | "generate_sandbox_id"
 *   url?:   string  (for check_allowlist)
 *   text?:  string  (for redact_logs)
 *   code?:  string  (for scan_code)
 *   allowlist?: { domains?: string[], networkIsolated?: boolean }
 */
import { NextRequest, NextResponse } from "next/server";
import {
  generateSandboxId,
  checkAllowlist,
  redactLogs,
  scanCodeForSecrets,
  getSandboxCaps,
  type AllowlistConfig,
} from "@/lib/sandbox-security";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  if (sp.get("action") === "caps") {
    const caps = getSandboxCaps({
      memory_limit_mb: parseInt(sp.get("memory_limit_mb") ?? "64") || 64,
      timeout_seconds: parseInt(sp.get("timeout_seconds") ?? "20") || 20,
      cpu_limit_seconds: parseInt(sp.get("cpu_limit_seconds") ?? "10") || 10,
      network_isolated: sp.get("network_isolated") === "true",
      allowlist: sp.get("allowlist")?.split(",").filter(Boolean) ?? [],
    });
    return NextResponse.json({ caps });
  }
  // fallthrough to existing handler
  return getSecurityModel();
}

async function getSecurityModelOrCaps(_req: NextRequest) {
  return getSecurityModel();
}

async function getSecurityModel() {
  return NextResponse.json({
    service: "DocsCI Sandbox Security",
    version: "1.0.0",
    features: {
      ephemeral_sandbox_id: {
        description: "Per-run unique sandbox identifier (sbx_<16hex>) for audit trail",
        format: "sbx_<16-hex-chars>",
        example: generateSandboxId(),
      },
      allowlist_enforcement: {
        description: "Network allowlist enforcement — HTTPS-only, blocks private IPs",
        rules: [
          "HTTPS only (no http://)",
          "Private IP ranges blocked (RFC-1918, loopback, link-local, IMDS)",
          "Configurable per-project domain allowlist",
          "Network isolation mode (no external access)",
        ],
        categories: ["private_ip", "blocked_host", "not_https", "not_in_allowlist", "network_isolated", "ok"],
      },
      log_redaction: {
        description: "Automatic redaction of secrets from stdout/stderr before persistence",
        rules: [
          "JWTs (3-part base64url)",
          "Stripe keys (sk_/pk_/rk_)",
          "GitHub tokens (ghp_/gho_/ghs_/github_pat_)",
          "AWS access keys (AKIA/ASIA/AROA)",
          "Bearer tokens in Authorization headers",
          "API keys in URLs (?api_key=...)",
          "Supabase URLs",
          "ENV=value patterns for secrets",
          "PEM private keys",
          "Postgres/MongoDB DSNs with passwords",
        ],
        max_output_bytes: 32768,
      },
      secret_scanning: {
        description: "Pre-execution scan of code for hardcoded secrets",
        rules: [
          "stripe_secret_key",
          "github_token",
          "github_fine_grained_pat",
          "aws_access_key",
          "jwt_token",
          "private_key_pem",
          "postgres_with_password",
        ],
      },
    },
    test_endpoint: "POST /api/sandbox-security",
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  switch (action) {
    case "generate_sandbox_id": {
      const ids = Array.from({ length: 3 }, () => generateSandboxId());
      return NextResponse.json({
        action,
        sandbox_ids: ids,
        description: "Three unique sandbox IDs (new ones generated per run)",
      });
    }

    case "check_allowlist": {
      const url = body.url as string;
      if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
      const config = body.allowlist as AllowlistConfig | undefined;
      const result = checkAllowlist(url, config);
      return NextResponse.json({ action, url, result });
    }

    case "redact_logs": {
      const text = body.text as string;
      if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
      const result = redactLogs(text);
      return NextResponse.json({
        action,
        original_length: text.length,
        redacted_length: result.redacted.length,
        redacted_count: result.redactedCount,
        rules_triggered: result.rulesTriggered,
        redacted_text: result.redacted,
      });
    }

    case "scan_code": {
      const code = body.code as string;
      if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });
      const result = scanCodeForSecrets(code);
      return NextResponse.json({ action, result });
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}. Use: generate_sandbox_id | check_allowlist | redact_logs | scan_code` }, { status: 400 });
  }
}
