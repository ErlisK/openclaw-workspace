/**
 * POST /api/repo-import — import a public GitHub repo by URL
 *
 * Body: { url: string }
 *
 * Returns:
 *   - Repo metadata (owner, repo, branch, file counts)
 *   - Parsed docs with extracted code fences + links
 *   - Language breakdown
 *   - OpenAPI files found
 *
 * No auth required (uses unauthenticated GitHub API for public repos).
 * Rate limit: 60 req/h unauthenticated. Uses GH_TOKEN if available.
 *
 * GET /api/repo-import — returns usage docs
 */
import { NextResponse } from "next/server";
import { importRepoByUrl } from "@/lib/repo-import";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try { await requireUser() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url } = body;
  if (!url || typeof url !== "string") {
    return NextResponse.json(
      { error: "Missing required field: url", example: { url: "https://github.com/facebook/docusaurus" } },
      { status: 400 }
    );
  }

  if (!url.includes("github.com")) {
    return NextResponse.json(
      { error: "Only GitHub repos are supported at this time. GitLab support coming soon." },
      { status: 400 }
    );
  }

  try {
    const result = await importRepoByUrl(url);

    // Build summary for response
    const languageBreakdown = result.docs
      .flatMap(d => d.codeFences)
      .reduce<Record<string, number>>((acc, f) => {
        acc[f.language] = (acc[f.language] ?? 0) + 1;
        return acc;
      }, {});

    return NextResponse.json({
      ok: true,
      repo: {
        owner: result.owner,
        repo: result.repo,
        branch: result.branch,
        url: `https://github.com/${result.owner}/${result.repo}`,
      },
      scan: {
        files_found: result.filesFound,
        files_scanned: result.filesScanned.length,
        files_skipped: result.filesSkipped.length,
        docs_parsed: result.docs.length,
        total_code_fences: result.totalCodeFences,
        total_links: result.totalLinks,
        languages: result.languages,
        language_breakdown: languageBreakdown,
        openapi_files: result.openapiFiles,
        duration_ms: result.durationMs,
        imported_at: result.importedAt,
      },
      // Compact doc summaries (full content omitted for response size)
      files: result.docs.map(d => ({
        path: d.filePath,
        title: d.title,
        word_count: d.wordCount,
        code_fences: d.codeFences.length,
        links: d.links.length,
        headings: d.headings.length,
        languages: Array.from(new Set(d.codeFences.map(f => f.language))),
        // First 3 code fence previews
        fence_previews: d.codeFences.slice(0, 3).map(f => ({
          language: f.language,
          line: f.lineStart,
          preview: f.code.split("\n").slice(0, 3).join("\n"),
        })),
      })),
      // Detailed code fences for pipeline consumption
      code_fences: result.docs.flatMap(d => d.codeFences),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("not found") ? 404
      : message.includes("Rate limit") ? 429
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/repo-import",
    description: "Import a public GitHub repo by URL. Fetches docs via GitHub Contents API and raw.githubusercontent.com. Parses Markdown with remark to extract code fences and links.",
    body: {
      url: "https://github.com/owner/repo  (required)",
    },
    supported: ["GitHub public repos"],
    coming_soon: ["GitLab", "Bitbucket", "private repos via token"],
    limits: {
      files_per_import: 50,
      file_size_bytes: 200_000,
      github_api: "60 req/h unauthenticated; set GITHUB_TOKEN for 5000 req/h",
    },
    example: {
      url: "https://github.com/supabase/supabase",
    },
  });
}
