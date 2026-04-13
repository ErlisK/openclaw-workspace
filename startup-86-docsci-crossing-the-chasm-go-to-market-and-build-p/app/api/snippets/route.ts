// POST /api/snippets — execute a code snippet in an isolated sandbox
// Supports JS/TS (via QuickJS WASM) and Python (via Pyodide/subprocess isolation)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeSnippet } from "@/lib/sandbox";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code, language, timeout_ms = 10000, run_id, file_path, line_start, line_end } = await req.json();

  if (!code || !language) {
    return NextResponse.json({ error: "code and language required" }, { status: 400 });
  }

  const supported = ["javascript", "typescript", "python", "js", "ts", "py"];
  if (!supported.includes(language.toLowerCase())) {
    return NextResponse.json({
      error: `Language '${language}' not yet supported. Supported: ${supported.join(", ")}`,
    }, { status: 400 });
  }

  const startMs = Date.now();
  const result = await executeSnippet({ code, language, timeout_ms });
  const executionMs = Date.now() - startMs;

  // If associated with a run, persist the result
  if (run_id) {
    await supabase.from("docsci_snippet_results").insert({
      run_id,
      file_path: file_path || "adhoc",
      line_start,
      line_end,
      language,
      code,
      status: result.success ? "pass" : "fail",
      exit_code: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      error_message: result.error,
      execution_ms: executionMs,
    });
  }

  return NextResponse.json({
    success: result.success,
    stdout: result.stdout,
    stderr: result.stderr,
    error: result.error,
    execution_ms: executionMs,
    language,
  });
}
