import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

// Inline importer logic to avoid workspace package dependency at build time
// Full importer lives in packages/importer — used here as a direct port

const GITHUB_API = 'https://api.github.com';

function ghHeaders(token?: string): HeadersInit {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'TeachRepo-Importer/1.0',
  };
  if (token) h['Authorization'] = `token ${token}`;
  return h;
}

async function ghGet(url: string, token?: string) {
  const res = await fetch(url, { headers: ghHeaders(token), cache: 'no-store' });
  if (!res.ok) throw new Error(`GitHub API ${res.status} — ${url}`);
  return res.json();
}

function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
  const cleaned = repoUrl.replace(/^https?:\/\//, '').replace(/^github\.com\//, '').replace(/\.git$/, '').trim();
  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length < 2) throw new Error(`Invalid GitHub repo URL: "${repoUrl}"`);
  return { owner: parts[0], repo: parts[1] };
}

const ImportRequestSchema = z.object({
  repo_url: z.string().url(),
  branch: z.string().optional(),
  tag: z.string().optional(),
  token: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = ImportRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Validation error', details: parsed.error.errors }, { status: 400 });

  const { repo_url, branch, tag, token } = parsed.data;
  const serviceSupa = createServiceClient();

  const { data: creator } = await serviceSupa.from('creators').select('id').eq('id', user.id).single();
  if (!creator) return NextResponse.json({ error: 'Creator profile not found' }, { status: 403 });

  let owner: string, repo: string;
  try { ({ owner, repo } = parseRepoUrl(repo_url)); } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }); }

  try {
    // Resolve ref
    const repoData = await ghGet(`${GITHUB_API}/repos/${owner}/${repo}`, token);
    const defaultBranch: string = repoData.default_branch ?? 'main';
    const refName = tag ?? branch ?? defaultBranch;
    const isTag = !!tag;

    let headSha: string;
    if (isTag) {
      const refData = await ghGet(`${GITHUB_API}/repos/${owner}/${repo}/git/ref/tags/${encodeURIComponent(refName)}`, token);
      if (refData.object.type === 'tag') {
        const tagData = await ghGet(`${GITHUB_API}/repos/${owner}/${repo}/git/tags/${refData.object.sha}`, token);
        headSha = tagData.object.sha;
      } else {
        headSha = refData.object.sha;
      }
    } else {
      const branchData = await ghGet(`${GITHUB_API}/repos/${owner}/${repo}/branches/${encodeURIComponent(refName)}`, token);
      headSha = branchData.commit.sha;
    }
    const shortSha = headSha.slice(0, 7);

    // Fetch tree
    const treeData = await ghGet(`${GITHUB_API}/repos/${owner}/${repo}/git/trees/${headSha}?recursive=1`, token);
    const paths: string[] = treeData.tree.filter((e: { type: string }) => e.type === 'blob').map((e: { path: string }) => e.path);

    // Fetch course config
    const configPath = ['course.yml', 'course.config.yaml'].find((p) => paths.includes(p));
    if (!configPath) throw new Error('No course.yml or course.config.yaml found in repo');

    const configContent = await fetchFile(owner, repo, configPath, token);
    const yaml = await import('js-yaml');
    const rawConfig = yaml.load(configContent) as Record<string, unknown>;

    const title = (rawConfig['title'] as string) ?? repo;
    const slug = ((rawConfig['slug'] ?? repo) as string).toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const description = (rawConfig['description'] as string) ?? '';
    const priceCents = (rawConfig['price_cents'] as number) ?? 0;
    const currency = (rawConfig['currency'] as string) ?? 'usd';
    const affiliatePct = (rawConfig['affiliate_pct'] as number) ?? 30;
    const version = (rawConfig['version'] as string) ?? '1.0.0';
    const tags = (rawConfig['tags'] as string[]) ?? [];
    const versionLabel = tag ? tag : (isSemVer(version) ? version : `sha:${shortSha}`);

    // Upsert course
    const { data: course, error: courseErr } = await serviceSupa
      .from('courses')
      .upsert({ creator_id: user.id, slug, title, description, price_cents: priceCents, currency, pricing_model: priceCents === 0 ? 'free' : 'one_time', affiliate_pct: affiliatePct, repo_url, version: versionLabel, tags, published: false }, { onConflict: 'creator_id,slug' })
      .select('id').single();
    if (courseErr || !course) throw new Error(courseErr?.message ?? 'Failed to upsert course');

    const courseId: string = course.id;

    // Check existing version
    const { data: existingVer } = await serviceSupa.from('course_versions').select('id, is_current').eq('course_id', courseId).eq('commit_sha', headSha).maybeSingle();
    if (!existingVer?.is_current) {
      if (!existingVer) {
        await serviceSupa.from('course_versions').insert({ course_id: courseId, commit_sha: headSha, branch: isTag ? defaultBranch : refName, tag: isTag ? refName : null, version_label: versionLabel, lesson_count: 0, quiz_count: 0, is_current: true, published_at: new Date().toISOString(), imported_by: user.id });
      } else {
        await serviceSupa.from('course_versions').update({ is_current: true, published_at: new Date().toISOString() }).eq('id', existingVer.id);
      }
      await serviceSupa.from('course_versions').update({ is_current: false }).eq('course_id', courseId).neq('commit_sha', headSha);
    }

    // Fetch + parse lessons
    const lessonPaths = paths.filter((p) => p.startsWith('lessons/') && p.endsWith('.md')).sort();
    const lessons = [];
    const errors = [];
    for (const lPath of lessonPaths) {
      try {
        const content = await fetchFile(owner, repo, lPath, token);
        const { data: fm, content: body } = parseFrontmatter(content);
        const lessonSlug = (fm.slug as string) ?? lPath.replace(/\.md$/, '').replace(/^.*\//, '').replace(/^\d+-/, '');
        lessons.push({ slug: lessonSlug, title: (fm.title as string) ?? lessonSlug, order_index: (fm.order as number) ?? lessons.length + 1, is_preview: fm.access === 'free', description: (fm.description as string) ?? null, estimated_minutes: (fm.estimated_minutes as number) ?? null, sandbox_url: (fm.sandbox_url as string) ?? null, quiz_id: (fm.quiz_id as string) ?? null, body_md: body.trim() });
      } catch (e) { errors.push({ path: lPath, message: (e as Error).message }); }
    }

    if (lessons.length > 0) {
      await serviceSupa.from('lessons').upsert(lessons.map((l) => ({ ...l, course_id: courseId })), { onConflict: 'course_id,slug' });
    }

    // Update lesson count
    await serviceSupa.from('course_versions').update({ lesson_count: lessons.length }).eq('course_id', courseId).eq('commit_sha', headSha);
    await serviceSupa.from('repo_imports').insert({ creator_id: user.id, course_id: courseId, repo_url, branch: isTag ? defaultBranch : refName, commit_sha: headSha, status: errors.length === 0 ? 'success' : 'partial', lesson_count: lessons.length, quiz_count: 0, error_log: errors.length > 0 ? JSON.stringify(errors) : null });

    return NextResponse.json({ success: true, courseId, courseSlug: slug, versionLabel, commitSha: headSha, shortSha, imported: { lessons: lessons.length }, errors: errors.length > 0 ? errors : undefined });
  } catch (err) {
    const message = (err as Error).message;
    await serviceSupa.from('repo_imports').insert({ creator_id: user.id, repo_url, branch: branch ?? 'main', status: 'failed', error_log: message }).then(() => null, () => null);
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

async function fetchFile(owner: string, repo: string, path: string, token?: string): Promise<string> {
  const data = await ghGet(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, token) as { content: string; encoding: string };
  if (data.encoding !== 'base64') throw new Error(`Unexpected encoding: ${data.encoding}`);
  return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
}

function parseFrontmatter(content: string): { data: Record<string, unknown>; content: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, content };
  try {
    // Simple YAML parse inline to avoid imports
    const lines = match[1].split('\n');
    const data: Record<string, unknown> = {};
    for (const line of lines) {
      const m = line.match(/^(\w+):\s*(.+)$/);
      if (m) {
        const [, k, v] = m;
        const val = v.trim().replace(/^["']|["']$/g, '');
        data[k] = isNaN(Number(val)) ? (val === 'true' ? true : val === 'false' ? false : val) : Number(val);
      }
    }
    return { data, content: match[2] };
  } catch { return { data: {}, content: match[2] }; }
}

function isSemVer(s: string): boolean {
  return /^\d+\.\d+(\.\d+)?/.test(s);
}
