/**
 * POST /api/execute — hermetic code execution endpoint
 *
 * Executes a code snippet in an isolated sandbox process.
 * Returns stdout, stderr, exit code, and execution metadata.
 *
 * Auth: public endpoint (rate-limited by Vercel edge network).
 * Use POST /api/snippets for org-scoped execution with DB persistence.
 *
 * Body:
 *   { code: string, language: "python"|"javascript"|"typescript", timeout_ms?: number }
 *
 * GET /api/execute — returns sandbox probe (capabilities + versions)
 */
import { NextResponse } from "next/server";
import { executeSnippet, probeSandbox } from "@/lib/sandbox";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SUPPORTED_LANGUAGES = ["python", "javascript", "typescript", "py", "js", "ts"];

export async function POST(req: Request) {
  let body: { code?: string; language?: string; timeout_ms?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { code, language, timeout_ms } = body;

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Missing required field: code" }, { status: 400 });
  }
  if (!language || typeof language !== "string") {
    return NextResponse.json({ error: "Missing required field: language" }, { status: 400 });
  }
  if (!SUPPORTED_LANGUAGES.includes(language.toLowerCase())) {
    return NextResponse.json(
      { error: `Unsupported language: "${language}"`, supported: SUPPORTED_LANGUAGES },
      { status: 400 }
    );
  }
  if (code.length > 50_000) {
    return NextResponse.json({ error: "Code too long (max 50KB)" }, { status: 400 });
  }

  // Block obviously dangerous patterns
  const dangerous = [
    /import\s+os\s*;?\s*os\.system/,
    /subprocess\.(call|run|Popen|check_output)/,
    /exec\s*\(/,
    /eval\s*\(/,
    /__import__\s*\(/,
  ];
  for (const pattern of dangerous) {
    if (pattern.test(code)) {
      return NextResponse.json(
        { error: "Code contains blocked patterns (subprocess, eval, exec, os.system)" },
        { status: 400 }
      );
    }
  }

  const timeoutMs = Math.min(
    typeof timeout_ms === "number" ? timeout_ms : 15_000,
    30_000
  );

  const result = await executeSnippet({ code, language, timeout_ms: timeoutMs });

  return NextResponse.json({
    ...result,
    // Normalize language name
    language: language.toLowerCase().replace(/^py$/, "python").replace(/^js$/, "javascript").replace(/^ts$/, "typescript"),
  }, {
    status: result.success ? 200 : 422,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  const probe = await probeSandbox();
  return NextResponse.json({
    endpoint: "POST /api/execute",
    description: "Hermetic code execution sandbox. Executes Python, JavaScript, and TypeScript snippets in isolated subprocesses.",
    sandbox: probe,
    supported_languages: SUPPORTED_LANGUAGES,
    limits: {
      max_code_bytes: 50_000,
      max_timeout_ms: 30_000,
      max_output_bytes: 65_536,
    },
    security: {
      env_scrubbing: "Strips all tokens, secrets, API keys from subprocess env",
      isolation: probe.runtime === "subprocess" ? "subprocess with ephemeral tmpdir" : "simulated (Vercel serverless)",
      resource_limits: probe.ulimitAvailable ? "ulimit: 128MB RAM, 30s CPU, 32 open files" : "timeout only",
    },
    body: {
      code: "string (required) — source code to execute",
      language: '"python" | "javascript" | "typescript" (required)',
      timeout_ms: "number (optional, max 30000, default 15000)",
    },
  });
}
