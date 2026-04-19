/**
 * POST /api/lint
 *
 * Lints TeachRepo frontmatter files (course.yml, lesson .md, quiz .yml).
 * Can either lint raw content posted directly, or fetch from a GitHub repo.
 *
 * Body (direct):
 *   { files: [{ path: string; content: string }] }
 *
 * Body (repo-based — fetches top-level files):
 *   { repo_url: string; branch?: string; path?: string }
 *
 * Returns: BatchLintResult
 *
 * Auth: optional — public lint endpoint (no user data returned)
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { lintBatch, type BatchLintResult } from '@/lib/lint/frontmatter';

// ── Schemas ───────────────────────────────────────────────────────────────────

const DirectLintSchema = z.object({
  files: z.array(z.object({
    path: z.string().min(1),
    content: z.string(),
  })).min(1).max(50),
});

const RepoLintSchema = z.object({
  repo_url: z.string().url(),
  branch: z.string().optional(),
  path: z.string().optional(),
});

// ── GitHub helpers ────────────────────────────────────────────────────────────

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const m = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

async function fetchGitHubFile(owner: string, repo: string, path: string, ref: string, token?: string): Promise<string | null> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github.v3.raw' };
  if (token) headers['Authorization'] = `token ${token}`;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`;
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  return res.text();
}

async function fetchGitHubTree(owner: string, repo: string, ref: string, token?: string): Promise<string[]> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
  if (token) headers['Authorization'] = `token ${token}`;
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;
  const res = await fetch(url, { headers });
  if (!res.ok) return [];
  const data = await res.json() as { tree?: Array<{ path: string; type: string }> };
  return (data.tree ?? []).filter((n) => n.type === 'blob').map((n) => n.path);
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Try direct lint first
  const directParsed = DirectLintSchema.safeParse(body);
  if (directParsed.success) {
    const result: BatchLintResult = lintBatch(directParsed.data.files);
    return NextResponse.json(result);
  }

  // Try repo-based lint
  const repoParsed = RepoLintSchema.safeParse(body);
  if (!repoParsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid request',
        details: 'Provide either { files: [...] } or { repo_url, branch?, path? }',
      },
      { status: 400 },
    );
  }

  const { repo_url, branch = 'main', path: coursePath = '' } = repoParsed.data;
  const parsed = parseGitHubUrl(repo_url);
  if (!parsed) {
    return NextResponse.json({ error: 'Could not parse GitHub URL' }, { status: 400 });
  }

  const { owner, repo } = parsed;
  const token = process.env.GITHUB_IMPORT_TOKEN;
  const prefix = coursePath ? `${coursePath.replace(/\/$/, '')}/` : '';

  // Fetch file tree
  const tree = await fetchGitHubTree(owner, repo, branch, token);
  if (tree.length === 0) {
    return NextResponse.json(
      { error: `Could not fetch file tree for ${owner}/${repo}@${branch}. Make sure the repo is public.` },
      { status: 422 },
    );
  }

  // Find relevant files
  const relevantPaths = tree.filter((p) => {
    const rel = prefix ? (p.startsWith(prefix) ? p.slice(prefix.length) : null) : p;
    if (!rel) return false;
    const lower = rel.toLowerCase();
    return (
      lower === 'course.yml' ||
      lower === 'course.yaml' ||
      (lower.startsWith('lessons/') && (lower.endsWith('.md') || lower.endsWith('.mdx'))) ||
      (lower.startsWith('quizzes/') && (lower.endsWith('.yml') || lower.endsWith('.yaml')))
    );
  });

  if (relevantPaths.length === 0) {
    return NextResponse.json(
      {
        error: `No TeachRepo files found in ${prefix || 'repo root'}. Expected course.yml + lessons/ folder.`,
        tree_sample: tree.slice(0, 20),
      },
      { status: 422 },
    );
  }

  // Fetch files (limit to 20 to stay within rate limits)
  const filesToFetch = relevantPaths.slice(0, 20);
  const files: Array<{ path: string; content: string }> = [];

  await Promise.all(
    filesToFetch.map(async (p) => {
      const content = await fetchGitHubFile(owner, repo, p, branch, token);
      if (content !== null) {
        const rel = prefix ? p.slice(prefix.length) : p;
        files.push({ path: rel, content });
      }
    }),
  );

  if (files.length === 0) {
    return NextResponse.json({ error: 'Could not read any files from the repo' }, { status: 422 });
  }

  const result: BatchLintResult = lintBatch(files);

  return NextResponse.json({
    ...result,
    meta: {
      repo: `${owner}/${repo}`,
      branch,
      prefix: prefix || '(root)',
      files_checked: files.length,
    },
  });
}
