/**
 * POST /api/demo-run — one-click demo pipeline against the bundled sample repo
 *
 * No auth required — this is a public demo endpoint.
 * Returns structured findings with AI suggestions and downloadable patch diffs.
 *
 * Query params:
 *   ?ai=1  — use Vercel AI Gateway for fix suggestions (requires deployed env)
 */
import { NextResponse } from "next/server";
import { runSampleRepoPipeline } from "@/lib/sample-runner";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60s max for Vercel Functions

export async function POST(req: Request) {
  const url = new URL(req.url);
  const useAI = url.searchParams.get("ai") === "1";

  const t0 = Date.now();

  try {
    const result = await runSampleRepoPipeline(useAI);

    return NextResponse.json({
      ...result,
      meta: {
        sample_repo: "lib/fixtures/sample-repo",
        openapi: "lib/fixtures/sample-repo/openapi.yaml",
        docs_files: result.files_scanned,
        ai_suggestions: useAI,
        demo: true,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Demo run failed", detail: message, duration_ms: Date.now() - t0 },
      { status: 500 }
    );
  }
}

// GET — returns sample repo manifest (what files are in the fixture)
export async function GET() {
  const fs = await import("fs");
  const path = await import("path");

  const fixtureDir = path.join(process.cwd(), "lib", "fixtures", "sample-repo");

  const walk = (dir: string, base = ""): string[] => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const e of entries) {
      const rel = base ? `${base}/${e.name}` : e.name;
      if (e.isDirectory()) files.push(...walk(path.join(dir, e.name), rel));
      else files.push(rel);
    }
    return files;
  };

  const files = walk(fixtureDir);

  return NextResponse.json({
    sample_repo: {
      description: "Bundled fixture with intentionally broken snippets for demo",
      files,
      docs_files: files.filter(f => f.endsWith(".md") && f.startsWith("docs/")),
      openapi: files.find(f => f.endsWith(".yaml") || f.endsWith(".yml")),
    },
    usage: {
      demo_run: "POST /api/demo-run",
      demo_run_with_ai: "POST /api/demo-run?ai=1",
      patch_download: "GET /api/demo-run/patch?finding=<id>&run_id=<run_id>",
    },
  });
}
