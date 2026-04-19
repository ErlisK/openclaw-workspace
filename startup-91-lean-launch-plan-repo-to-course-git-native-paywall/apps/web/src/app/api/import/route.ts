import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveUser } from '@/lib/auth/resolve-user';

// ────────────────────────────────────────────────────────────────────────────
// GitHub helpers
// ────────────────────────────────────────────────────────────────────────────

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
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`GitHub ${res.status} — ${url}${errText ? ': ' + errText.slice(0, 120) : ''}`);
  }
  return res.json();
}

async function fetchFile(owner: string, repo: string, path: string, token?: string): Promise<string> {
  const data = await ghGet(`${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`, token) as { content: string; encoding: string };
  if (data.encoding !== 'base64') throw new Error(`Unexpected encoding: ${data.encoding}`);
  return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
}

function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
  const cleaned = repoUrl
    .replace(/^https?:\/\/(www\.)?github\.com\//, '')
    .replace(/\.git$/, '')
    .trim();
  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length < 2) throw new Error(`Invalid GitHub repo URL: "${repoUrl}"`);
  return { owner: parts[0], repo: parts[1] };
}

// ────────────────────────────────────────────────────────────────────────────
// Frontmatter parser (gray-matter compatible, no dependency)
// Handles: strings, numbers, booleans, arrays, and multi-line values
// ────────────────────────────────────────────────────────────────────────────

interface FrontmatterResult {
  data: Record<string, unknown>;
  content: string;
}

function parseFrontmatter(raw: string): FrontmatterResult {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const yamlBlock = match[1];
  const body = match[2];
  const data: Record<string, unknown> = {};

  // Simple line-by-line YAML parser (covers TeachRepo frontmatter spec)
  let currentKey: string | null = null;
  let arrayMode = false;
  const arrBuffer: string[] = [];

  const flushArray = () => {
    if (currentKey && arrayMode) {
      data[currentKey] = arrBuffer.slice();
      arrBuffer.length = 0;
      arrayMode = false;
    }
  };

  for (const line of yamlBlock.split('\n')) {
    // Array item
    if (line.match(/^\s*-\s+/)) {
      const val = line.replace(/^\s*-\s+/, '').trim().replace(/^["']|["']$/g, '');
      if (currentKey) { arrayMode = true; arrBuffer.push(val); }
      continue;
    }

    // Key: value
    const kv = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)$/);
    if (kv) {
      flushArray();
      currentKey = kv[1];
      const rawVal = kv[2].trim().replace(/^["']|["']$/g, '');
      if (rawVal === '') {
        // value on subsequent lines (array or block)
        arrayMode = false;
      } else if (rawVal === 'true') {
        data[currentKey] = true;
      } else if (rawVal === 'false') {
        data[currentKey] = false;
      } else if (!isNaN(Number(rawVal)) && rawVal !== '') {
        data[currentKey] = Number(rawVal);
      } else {
        data[currentKey] = rawVal;
      }
    }
  }
  flushArray();

  return { data, content: body.trim() };
}

// ────────────────────────────────────────────────────────────────────────────
// YAML quiz parser (quizzes/*.yml)
// ────────────────────────────────────────────────────────────────────────────

interface ParsedQuestion {
  question: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[] | null;
  correct_index: number | null;
  correct_bool: boolean | null;
  correct_text: string | null;
  explanation: string | null;
  order_index: number;
}

interface ParsedQuiz {
  title: string;
  pass_threshold: number;
  questions: ParsedQuestion[];
}

function parseQuizYaml(raw: string, quizId: string): ParsedQuiz {
  // Simple YAML parser for our quiz format
  const lines = raw.split('\n');
  let title = quizId;
  let pass_threshold = 70;
  const questions: ParsedQuestion[] = [];

  let inQuestions = false;
  let current: Partial<ParsedQuestion> & { _options?: string[]; _orderIdx?: number } | null = null;
  let inOptions = false;
  let optIdx = 0;

  const pushCurrent = () => {
    if (current?.question) {
      questions.push({
        question: current.question,
        question_type: (current.question_type as ParsedQuestion['question_type']) ?? 'multiple_choice',
        options: current._options ?? null,
        correct_index: current.correct_index ?? null,
        correct_bool: current.correct_bool ?? null,
        correct_text: current.correct_text ?? null,
        explanation: current.explanation ?? null,
        order_index: current._orderIdx ?? questions.length + 1,
      });
    }
    current = null;
    inOptions = false;
    optIdx = 0;
  };

  for (const line of lines) {
    const trimmed = line.trimEnd();

    if (trimmed.startsWith('title:')) {
      title = trimmed.replace(/^title:\s*/, '').replace(/^["']|["']$/g, '').trim();
    } else if (trimmed.startsWith('pass_threshold:')) {
      pass_threshold = parseInt(trimmed.split(':')[1]) || 70;
    } else if (trimmed.startsWith('questions:')) {
      inQuestions = true;
    } else if (inQuestions) {
      // New question
      if (trimmed.match(/^\s{2}-\s+question:/)) {
        pushCurrent();
        current = {
          question: trimmed.replace(/^\s{2}-\s+question:\s*/, '').replace(/^["']|["']$/g, '').trim(),
          _orderIdx: questions.length + 1,
        };
        inOptions = false;
      } else if (current) {
        if (trimmed.match(/^\s{4}question:/)) {
          current.question = trimmed.replace(/^\s{4}question:\s*/, '').replace(/^["']|["']$/g, '').trim();
        } else if (trimmed.match(/^\s{4}type:/)) {
          current.question_type = trimmed.replace(/^\s{4}type:\s*/, '').trim() as ParsedQuestion['question_type'];
        } else if (trimmed.match(/^\s{4}options:/)) {
          current._options = [];
          inOptions = true;
          optIdx = 0;
        } else if (inOptions && trimmed.match(/^\s{6}-\s+/)) {
          current._options = current._options ?? [];
          current._options.push(trimmed.replace(/^\s{6}-\s+/, '').replace(/^["']|["']$/g, '').trim());
          optIdx++;
        } else if (trimmed.match(/^\s{4}correct_index:/)) {
          current.correct_index = parseInt(trimmed.split(':')[1]) ?? 0;
          inOptions = false;
        } else if (trimmed.match(/^\s{4}correct_bool:/)) {
          current.correct_bool = trimmed.includes('true');
          inOptions = false;
        } else if (trimmed.match(/^\s{4}correct_text:/)) {
          current.correct_text = trimmed.replace(/^\s{4}correct_text:\s*/, '').replace(/^["']|["']$/g, '').trim();
          inOptions = false;
        } else if (trimmed.match(/^\s{4}explanation:/)) {
          current.explanation = trimmed.replace(/^\s{4}explanation:\s*/, '').replace(/^["']|["']$/g, '').trim();
        }
      }
    }
  }
  pushCurrent();

  return { title, pass_threshold, questions };
}

// ────────────────────────────────────────────────────────────────────────────
// Slug helpers
// ────────────────────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function isSemVer(s: string): boolean {
  return /^\d+\.\d+(\.\d+)?/.test(s);
}

// ────────────────────────────────────────────────────────────────────────────
// Request schema
// ────────────────────────────────────────────────────────────────────────────

const ImportRequestSchema = z.object({
  repo_url: z.string().url('Must be a valid URL'),
  branch: z.string().optional(),
  tag: z.string().optional(),
  path: z.string().optional(), // subdirectory inside repo, e.g. "sample-course"
  token: z.string().optional(), // optional PAT for private repos
});

// Direct-payload schema (CLI push — no GitHub intermediate fetch)
const DirectImportSchema = z.object({
  courseYml: z.string().min(1),
  lessons: z.array(z.object({
    filename: z.string(),
    content: z.string(),
  })).default([]),
  quizzes: z.array(z.object({
    filename: z.string(),
    content: z.string(),
  })).default([]),
  gitSha: z.string().optional(),
  gitBranch: z.string().optional(),
  repoUrl: z.string().optional(),
  courseId: z.string().uuid().optional(),
  draft: z.boolean().default(false),
});

// ────────────────────────────────────────────────────────────────────────────
// Direct-payload import handler (CLI push)
// ────────────────────────────────────────────────────────────────────────────

async function handleDirectImport(
  data: import('zod').infer<typeof DirectImportSchema>,
  creatorId: string,
): Promise<Response> {
  const serviceSupa = createServiceClient();

  // Parse course.yml
  const courseData: Record<string, unknown> = {};
  for (const line of data.courseYml.split('\n')) {
    const m = line.match(/^(\w[\w_-]*):\s*"?([^"#\n]*)"?/);
    if (m) {
      const val = m[2].trim();
      courseData[m[1]] = /^\d+$/.test(val) ? parseInt(val, 10) : val;
    }
  }

  const slug = String(courseData.slug || '');
  if (!slug) return NextResponse.json({ error: 'course.yml missing slug' }, { status: 400 });

  // Verify creator profile
  const { data: creator } = await serviceSupa.from('creators').select('id').eq('id', creatorId).single();
  if (!creator) return NextResponse.json({ error: 'Creator profile not found' }, { status: 403 });

  // Upsert course
  let courseId = data.courseId || '';
  if (!courseId) {
    const existing = await serviceSupa.from('courses').select('id').eq('slug', slug).eq('creator_id', creatorId).maybeSingle();
    courseId = existing.data?.id || '';
  }

  const coursePayload = {
    slug,
    title: String(courseData.title || slug),
    description: String(courseData.description || ''),
    price_cents: Number(courseData.price_cents ?? 0),
    currency: String(courseData.currency || 'usd'),
    creator_id: creatorId,
    published: !data.draft,
  };

  if (courseId) {
    await serviceSupa.from('courses').update(coursePayload).eq('id', courseId);
  } else {
    const { data: newCourse } = await serviceSupa.from('courses').insert(coursePayload).select('id').single();
    courseId = newCourse?.id || '';
  }
  if (!courseId) return NextResponse.json({ error: 'Failed to upsert course' }, { status: 500 });

  // Record version
  let versionId = '';
  if (data.gitSha) {
    const shortSha = data.gitSha.slice(0, 7);
    const label = `v-${shortSha}`;
    const { data: ver } = await serviceSupa.from('course_versions').insert({
      course_id: courseId,
      repo_url: data.repoUrl || '',
      branch: data.gitBranch || 'main',
      commit_sha: data.gitSha,
      version_label: label,
      version: label,
      is_current: true,
      lesson_count: data.lessons.length,
    }).select('id').single();
    versionId = ver?.id || '';
  }

  // Upsert lessons
  let lessonsImported = 0;
  for (const { filename, content } of data.lessons) {
    const fm: Record<string, unknown> = {};
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fmMatch) {
      for (const line of fmMatch[1].split('\n')) {
        const m = line.match(/^(\w[\w_-]*):\s*"?([^"#\n]*)"?/);
        if (m) {
          const val = m[2].trim();
          fm[m[1]] = /^\d+$/.test(val) ? parseInt(val, 10) : val === 'true' ? true : val === 'false' ? false : val;
        }
      }
    }
    const lessonSlug = String(fm.slug || filename.replace(/^\d+-/, '').replace(/\.mdx?$/, ''));
    const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
    const payload = {
      course_id: courseId,
      slug: lessonSlug,
      title: String(fm.title || lessonSlug),
      description: String(fm.description || ''),
      order_index: Number(fm.order || 0),
      is_preview: String(fm.access || 'paid') === 'free',
      estimated_minutes: Number(fm.estimated_minutes || 0) || null,
      content_md: body,
      has_quiz: Boolean(fm.quiz_id),
      quiz_slug: fm.quiz_id ? String(fm.quiz_id) : null,
    };
    const existing = await serviceSupa.from('lessons').select('id').eq('course_id', courseId).eq('slug', lessonSlug).maybeSingle();
    if (existing.data?.id) {
      await serviceSupa.from('lessons').update(payload).eq('id', existing.data.id);
    } else {
      await serviceSupa.from('lessons').insert(payload);
    }
    lessonsImported++;
  }

  return NextResponse.json({
    success: true,
    courseId,
    slug,
    lessonsImported,
    versionId: versionId || undefined,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/import
// ────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Auth — supports SSR cookie session and Bearer token
  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse body
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // ── Direct payload path (CLI push — no GitHub fetch) ─────────────────────
  // If the body has courseYml, handle it directly without GitHub fetching.
  const directParsed = DirectImportSchema.safeParse(body);
  if (directParsed.success && directParsed.data.courseYml) {
    return handleDirectImport(directParsed.data, user.id);
  }

  const parsed = ImportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.errors }, { status: 400 });
  }

  const { repo_url, branch, tag, path: coursePath, token: userToken } = parsed.data;
  // Use server-side GitHub PAT as fallback (enables importing private repos)
  const token = userToken ?? process.env.GITHUB_IMPORT_TOKEN;
  const serviceSupa = createServiceClient();

  // 3. Verify creator profile exists
  const { data: creator } = await serviceSupa.from('creators').select('id').eq('id', user.id).single();
  if (!creator) return NextResponse.json({ error: 'Creator profile not found' }, { status: 403 });

  // 4. Parse repo URL
  let owner: string, repoName: string;
  try {
    ({ owner, repo: repoName } = parseRepoUrl(repo_url));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  // Record import attempt
  const importRecord = await serviceSupa.from('repo_imports').insert({
    creator_id: user.id,
    repo_url,
    branch: branch ?? tag ?? 'main',
    status: 'running',
    error_log: null,
  }).select('id').single();
  const importId = importRecord.data?.id as string | undefined;

  const fail = async (msg: string, status = 422) => {
    if (importId) {
      await serviceSupa.from('repo_imports').update({ status: 'failed', error_log: msg }).eq('id', importId)
        .then(() => null, () => null);
    }
    return NextResponse.json({ error: msg }, { status });
  };

  try {
    // 5. Resolve ref → commit SHA
    const repoData = await ghGet(`${GITHUB_API}/repos/${owner}/${repoName}`, token);
    const defaultBranch: string = repoData.default_branch ?? 'main';
    const refName = tag ?? branch ?? defaultBranch;
    const isTag = !!tag;

    let headSha: string;
    if (isTag) {
      const refData = await ghGet(`${GITHUB_API}/repos/${owner}/${repoName}/git/ref/tags/${encodeURIComponent(refName)}`, token);
      if (refData.object.type === 'tag') {
        const tagData = await ghGet(`${GITHUB_API}/repos/${owner}/${repoName}/git/tags/${refData.object.sha}`, token);
        headSha = tagData.object.sha;
      } else {
        headSha = refData.object.sha;
      }
    } else {
      const branchData = await ghGet(`${GITHUB_API}/repos/${owner}/${repoName}/branches/${encodeURIComponent(refName)}`, token);
      headSha = branchData.commit.sha;
    }
    const shortSha = headSha.slice(0, 7);

    // 6. Fetch repo tree (scoped to coursePath if provided)
    const treeData = await ghGet(`${GITHUB_API}/repos/${owner}/${repoName}/git/trees/${headSha}?recursive=1`, token);
    const allPaths: string[] = treeData.tree
      .filter((e: { type: string }) => e.type === 'blob')
      .map((e: { path: string }) => e.path);

    // Scope paths to subdirectory if specified
    const prefix = coursePath ? coursePath.replace(/\/$/, '') + '/' : '';
    const paths = prefix
      ? allPaths.filter((p) => p.startsWith(prefix)).map((p) => p.slice(prefix.length))
      : allPaths;

    // 7. Find + parse course.yml
    const configPath = ['course.yml', 'course.yaml', 'course.config.yml', 'course.config.yaml'].find((p) => paths.includes(p));
    if (!configPath) {
      return fail(`No course.yml found in ${prefix ? `"${coursePath}"` : 'repo root'}. Expected one of: course.yml, course.yaml`);
    }

    const configContent = await fetchFile(owner, repoName, `${prefix}${configPath}`, token);
    const { default: yaml } = await import('js-yaml');
    const rawConfig = yaml.load(configContent) as Record<string, unknown>;

    const title = (rawConfig['title'] as string) ?? repoName;
    const slug = slugify((rawConfig['slug'] as string) ?? title ?? repoName);
    const description = (rawConfig['description'] as string) ?? '';
    const priceCents = (rawConfig['price_cents'] as number) ?? 0;
    const currency = ((rawConfig['currency'] as string) ?? 'usd').toLowerCase();
    const affiliatePct = (rawConfig['affiliate_pct'] as number) ?? 30;
    const configVersion = (rawConfig['version'] as string) ?? '1.0.0';
    const tags = Array.isArray(rawConfig['tags']) ? (rawConfig['tags'] as string[]) : [];
    const versionLabel = isTag ? refName : (isSemVer(configVersion) ? configVersion : `sha:${shortSha}`);

    // 8. Upsert course (status=draft, version=SHA)
    const { data: course, error: courseErr } = await serviceSupa
      .from('courses')
      .upsert({
        creator_id: user.id,
        slug,
        title,
        description,
        price_cents: priceCents,
        currency,
        pricing_model: priceCents === 0 ? 'free' : 'one_time',
        affiliate_pct: affiliatePct,
        repo_url,
        version: versionLabel,
        tags,
        published: false, // always draft on import
        updated_at: new Date().toISOString(),
      }, { onConflict: 'creator_id,slug' })
      .select('id')
      .single();

    if (courseErr || !course) return fail(courseErr?.message ?? 'Failed to upsert course');
    const courseId: string = course.id;

    // 9. Upsert course_version row
    const { data: existingVer } = await serviceSupa
      .from('course_versions')
      .select('id')
      .eq('course_id', courseId)
      .eq('commit_sha', headSha)
      .maybeSingle();

    if (!existingVer) {
      // Mark all previous versions as not current
      await serviceSupa.from('course_versions').update({ is_current: false }).eq('course_id', courseId)
        .then(() => null, () => null);
      await serviceSupa.from('course_versions').insert({
        course_id: courseId,
        commit_sha: headSha,
        branch: isTag ? defaultBranch : refName,
        tag: isTag ? refName : null,
        version_label: versionLabel,
        lesson_count: 0,
        quiz_count: 0,
        is_current: true,
        published_at: new Date().toISOString(),
        imported_by: user.id,
      });
    } else {
      await serviceSupa.from('course_versions').update({ is_current: true }).eq('id', existingVer.id)
        .then(() => null, () => null);
      await serviceSupa.from('course_versions').update({ is_current: false }).eq('course_id', courseId).neq('id', existingVer.id)
        .then(() => null, () => null);
    }

    // 10. Parse lessons (lessons/*.md)
    const lessonPaths = paths
      .filter((p) => (p.startsWith('lessons/') || p.startsWith('lesson/')) && (p.endsWith('.md') || p.endsWith('.mdx')))
      .sort();

    // Track quiz_ids referenced by lessons so we can import quizzes
    const quizIdsNeeded = new Set<string>();
    const lessonRows: Array<{
      course_id: string;
      slug: string;
      title: string;
      description: string | null;
      content_md: string;
      order_index: number;
      is_preview: boolean;
      estimated_minutes: number | null;
      has_quiz: boolean;
      has_sandbox: boolean;
      sandbox_url: string | null;
      quiz_slug: string | null;
      updated_at: string;
    }> = [];
    const importErrors: Array<{ path: string; message: string }> = [];

    for (const lPath of lessonPaths) {
      try {
        const content = await fetchFile(owner, repoName, `${prefix}${lPath}`, token);
        const { data: fm, content: bodyMd } = parseFrontmatter(content);

        // Derive slug from frontmatter > filename
        const rawSlug = (fm.slug as string)
          ?? lPath.replace(/\.(md|mdx)$/, '').replace(/^.*\//, '').replace(/^\d+-/, '');
        const lessonSlug = slugify(rawSlug);

        const quizId = fm.quiz_id as string | undefined;
        if (quizId) quizIdsNeeded.add(quizId);

        lessonRows.push({
          course_id: courseId,
          slug: lessonSlug,
          title: (fm.title as string) ?? lessonSlug,
          description: (fm.description as string) ?? null,
          content_md: bodyMd,
          order_index: typeof fm.order === 'number' ? fm.order : lessonRows.length + 1,
          is_preview: fm.access === 'free' || fm.is_preview === true,
          estimated_minutes: typeof fm.estimated_minutes === 'number' ? fm.estimated_minutes : null,
          has_quiz: !!quizId,
          has_sandbox: !!(fm.sandbox_url),
          sandbox_url: (fm.sandbox_url as string) ?? null,
          quiz_slug: quizId ? slugify(quizId) : null,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        importErrors.push({ path: lPath, message: (e as Error).message });
      }
    }

    if (lessonRows.length > 0) {
      const { error: lessonErr } = await serviceSupa
        .from('lessons')
        .upsert(lessonRows, { onConflict: 'course_id,slug' });
      if (lessonErr) importErrors.push({ path: 'lessons', message: lessonErr.message });
    }

    // 11. Parse and store quizzes (quizzes/*.yml) referenced by lessons
    const quizPaths = paths.filter((p) =>
      (p.startsWith('quizzes/') || p.startsWith('quiz/')) && (p.endsWith('.yml') || p.endsWith('.yaml'))
    );

    let quizCount = 0;
    for (const qPath of quizPaths) {
      // Extract quiz ID from filename: quizzes/intro-quiz.yml → intro-quiz
      const quizFileId = qPath.replace(/^(quizzes|quiz)\//, '').replace(/\.(yml|yaml)$/, '');
      if (quizIdsNeeded.size > 0 && !quizIdsNeeded.has(quizFileId)) continue;

      try {
        const content = await fetchFile(owner, repoName, `${prefix}${qPath}`, token);
        const parsed = parseQuizYaml(content, quizFileId);

        // Find the lesson that references this quiz by quiz_slug
        const lesson = await serviceSupa
          .from('lessons')
          .select('id')
          .eq('course_id', courseId)
          .eq('quiz_slug', slugify(quizFileId))
          .limit(1)
          .maybeSingle();

        // Upsert quiz — unique on lesson_id (if present) or insert new
        const quizPayload = {
          course_id: courseId,
          lesson_id: lesson?.data?.id ?? null,
          title: parsed.title,
          pass_threshold: parsed.pass_threshold,
          slug: slugify(quizFileId),
          updated_at: new Date().toISOString(),
        };

        let quiz: { id: string } | null = null;
        let quizErr: { message: string } | null = null;

        if (lesson?.data?.id) {
          // Has a lesson_id — safe to upsert on lesson_id unique key
          const r = await serviceSupa
            .from('quizzes')
            .upsert(quizPayload, { onConflict: 'lesson_id' })
            .select('id')
            .single();
          quiz = r.data;
          quizErr = r.error;
        } else {
          // No lesson_id — just insert (avoid duplicate only by checking title+course)
          const existing = await serviceSupa
            .from('quizzes')
            .select('id')
            .eq('course_id', courseId)
            .eq('title', parsed.title)
            .maybeSingle();
          if (existing.data) {
            await serviceSupa.from('quizzes').update(quizPayload).eq('id', existing.data.id).then(() => null, () => null);
            quiz = existing.data;
          } else {
            const r = await serviceSupa.from('quizzes').insert(quizPayload).select('id').single();
            quiz = r.data;
            quizErr = r.error;
          }
        }

        if (quizErr || !quiz) {
          importErrors.push({ path: qPath, message: quizErr?.message ?? 'Failed to upsert quiz' });
          continue;
        }

        // Upsert questions
        if (parsed.questions.length > 0) {
          await serviceSupa.from('quiz_questions').upsert(
            parsed.questions.map((q) => ({
              quiz_id: quiz.id,
              lesson_id: lesson?.data?.id ?? null,
              ...q,
            })),
            { onConflict: 'quiz_id,order_index' }
          );
        }

        quizCount++;
      } catch (e) {
        importErrors.push({ path: qPath, message: (e as Error).message });
      }
    }

    // 12. Update version counts
    await serviceSupa.from('course_versions')
      .update({ lesson_count: lessonRows.length, quiz_count: quizCount })
      .eq('course_id', courseId).eq('commit_sha', headSha)
      .then(() => null, () => null);

    // 13. Update import record
    const importStatus = importErrors.length === 0 ? 'success' : 'partial';
    if (importId) {
      await serviceSupa.from('repo_imports').update({
        course_id: courseId,
        commit_sha: headSha,
        status: importStatus,
        lesson_count: lessonRows.length,
        quiz_count: quizCount,
        error_log: importErrors.length > 0 ? JSON.stringify(importErrors) : null,
      }).eq('id', importId).then(() => null, () => null);
    }

    return NextResponse.json({
      success: true,
      courseId,
      courseSlug: slug,
      versionLabel,
      commitSha: headSha,
      shortSha,
      imported: {
        lessons: lessonRows.length,
        quizzes: quizCount,
      },
      errors: importErrors.length > 0 ? importErrors : undefined,
    });

  } catch (err) {
    return fail((err as Error).message);
  }
}
