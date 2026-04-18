import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

function ghHeaders(token?: string): HeadersInit {
  const h: Record<string, string> = { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'TeachRepo/1.0' };
  if (token) h['Authorization'] = `token ${token}`;
  return h;
}

async function ghGet(url: string, token?: string) {
  const res = await fetch(url, { headers: ghHeaders(token), cache: 'no-store' });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.json();
}

const QuerySchema = z.object({ repo_url: z.string().url() });

export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse({ repo_url: searchParams.get('repo_url') });
  if (!parsed.success) return NextResponse.json({ error: 'repo_url required and must be a URL' }, { status: 400 });

  const cleaned = parsed.data.repo_url.replace(/^https?:\/\//, '').replace(/^github\.com\//, '').replace(/\.git$/, '');
  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length < 2) return NextResponse.json({ error: 'Invalid GitHub repo URL' }, { status: 400 });
  const [owner, repo] = parts;
  const token = searchParams.get('token') ?? undefined;

  try {
    const [repoData, branchesData, tagsData] = await Promise.all([
      ghGet(`https://api.github.com/repos/${owner}/${repo}`, token),
      ghGet(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`, token),
      ghGet(`https://api.github.com/repos/${owner}/${repo}/tags?per_page=100`, token),
    ]);
    return NextResponse.json({
      defaultBranch: repoData.default_branch ?? 'main',
      branches: (branchesData as Array<{ name: string; commit: { sha: string } }>).map((b) => ({ name: b.name, commitSha: b.commit.sha })),
      tags: (tagsData as Array<{ name: string; commit: { sha: string } }>).map((t) => ({ name: t.name, commitSha: t.commit.sha })),
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
