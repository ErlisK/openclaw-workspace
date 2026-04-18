import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { listRepoRefs, parseRepoUrl } from '@teachrepo/importer';

const QuerySchema = z.object({
  repo_url: z.string().url('repo_url must be a valid HTTPS URL'),
});

/**
 * GET /api/repos/refs?repo_url=https://github.com/owner/repo
 *
 * Lists all branches and tags for a public GitHub repo.
 * Used by the creator dashboard branch/tag picker UI.
 *
 * MVP: Requires authentication (creator must be logged in).
 * Rate limit: 60 req/hr unauthenticated; pass ?token=ghp_xxx to raise to 5,000/hr.
 *
 * Response:
 * {
 *   defaultBranch: "main",
 *   branches: [{ name: "main", commitSha: "abc..." }, ...],
 *   tags: [{ name: "v1.0.0", commitSha: "def..." }, ...],
 * }
 */
export async function GET(req: NextRequest) {
  // Auth required
  const supabase = createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    repo_url: searchParams.get('repo_url'),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { repo_url } = parsed.data;
  const token = searchParams.get('token') ?? undefined;

  let owner: string, repo: string;
  try {
    ({ owner, repo } = parseRepoUrl(repo_url));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  try {
    const refs = await listRepoRefs(owner, repo, token);
    return NextResponse.json(refs);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('404')) {
      return NextResponse.json(
        { error: 'Repository not found or is private' },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
