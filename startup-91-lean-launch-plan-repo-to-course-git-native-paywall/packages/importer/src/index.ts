import matter from 'gray-matter';
import * as yaml from 'js-yaml';
import {
  CourseYmlSchema,
  CourseConfigSchema,
  LessonFrontmatterSchema,
  QuizFileSchema,
  type CourseYml,
  type LessonFrontmatter,
  type QuizFile,
} from '@teachrepo/core';

// ============================================================
// Types
// ============================================================

export interface GitHubTreeEntry {
  path: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
}

export interface GitHubRepoRef {
  owner: string;
  repo: string;
  branch: string;
}

export interface FetchedLesson {
  path: string;
  slug: string;
  frontmatter: LessonFrontmatter;
  bodyMd: string;
}

export interface FetchedQuiz {
  id: string;
  data: QuizFile;
}

export interface ImportPayload {
  repoRef: GitHubRepoRef;
  headSha: string;
  /** Short commit SHA (7 chars) */
  shortSha: string;
  /** Resolved ref name (branch or tag name) */
  ref: string;
  refType: 'branch' | 'tag';
  /** Default branch of the repo */
  defaultBranch: string;
  /** Computed version label: tag > SemVer > sha:xxxxxxx */
  versionLabel: string;
  config: CourseYml;
  lessons: FetchedLesson[];
  quizzes: FetchedQuiz[];
  errors: ImportError[];
}

export interface ImportError {
  path: string;
  message: string;
}

// ============================================================
// GitHub REST fetch helpers
// ============================================================

const GITHUB_API = 'https://api.github.com';

/**
 * Build GitHub API request headers.
 * Pass a token to raise rate limit from 60 to 5,000 req/hr.
 */
function ghHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'TeachRepo-Importer/1.0',
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `token ${token}`;
  }
  return headers;
}

/**
 * Fetch with exponential backoff retry on 429 or 503.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxAttempts = 3
): Promise<Response> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, options);
    if (res.status !== 429 && res.status !== 503) return res;
    if (attempt === maxAttempts) return res;
    const retryAfter = parseInt(res.headers.get('Retry-After') ?? '2', 10);
    const delay = Math.min(retryAfter * 1000, 8000) * attempt;
    await new Promise((r) => setTimeout(r, delay));
  }
  throw new Error('fetchWithRetry: exhausted attempts');
}

// ============================================================
// Public importer API
// ============================================================

/**
 * Parse a GitHub repo URL into { owner, repo }.
 * Accepts:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   github.com/owner/repo
 *   owner/repo
 */
export function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
  const cleaned = repoUrl
    .replace(/^https?:\/\//, '')
    .replace(/^github\.com\//, '')
    .replace(/\.git$/, '')
    .trim();

  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length < 2) {
    throw new Error(`Invalid GitHub repo URL: "${repoUrl}". Expected format: owner/repo`);
  }
  return { owner: parts[0], repo: parts[1] };
}

/**
 * Resolve the HEAD SHA for a branch.
 */
export async function resolveHeadSha(
  owner: string,
  repo: string,
  branch: string,
  token?: string
): Promise<string> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/branches/${branch}`;
  const res = await fetchWithRetry(url, { headers: ghHeaders(token) });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Repository or branch not found: ${owner}/${repo}@${branch}`);
    }
    throw new Error(`GitHub API error ${res.status} fetching branch ${branch}`);
  }

  const data = (await res.json()) as { commit: { sha: string } };
  return data.commit.sha;
}

/**
 * Fetch the full recursive Git tree for a commit SHA.
 * Returns a flat list of all blob paths.
 */
export async function fetchTree(
  owner: string,
  repo: string,
  sha: string,
  token?: string
): Promise<GitHubTreeEntry[]> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`;
  const res = await fetchWithRetry(url, { headers: ghHeaders(token) });

  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status} fetching tree for ${sha}`);
  }

  const data = (await res.json()) as {
    tree: GitHubTreeEntry[];
    truncated: boolean;
  };

  if (data.truncated) {
    // For large repos, fall back to directory listing
    console.warn(`Tree truncated for ${owner}/${repo}@${sha} — repo has >100,000 files`);
  }

  return data.tree.filter((e) => e.type === 'blob');
}

/**
 * Fetch raw file content from GitHub Contents API.
 * Returns decoded string.
 */
export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  token?: string
): Promise<string> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`;
  const res = await fetchWithRetry(url, { headers: ghHeaders(token) });

  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status} fetching ${path}`);
  }

  const data = (await res.json()) as {
    content: string;
    encoding: string;
  };

  if (data.encoding !== 'base64') {
    throw new Error(`Unexpected encoding "${data.encoding}" for ${path}`);
  }

  return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
}

// ============================================================
// Course config parsing
// ============================================================

/**
 * Detect and parse the course config from raw YAML string.
 * Tries course.yml (flat) schema first, then course.config.yaml (nested) schema.
 */
export function parseCourseConfig(rawYaml: string, filePath: string): CourseYml {
  const raw = yaml.load(rawYaml) as Record<string, unknown>;

  // Determine format: course.yml if file is named course.yml or has flat price_cents field
  const isFlatFormat =
    filePath.endsWith('course.yml') || typeof raw['price_cents'] !== 'undefined';

  if (isFlatFormat) {
    return CourseYmlSchema.parse(raw);
  }

  // Nested format — normalize to flat CourseYml shape for consistency
  const nested = CourseConfigSchema.parse(raw);
  return CourseYmlSchema.parse({
    title: nested.course.title,
    slug: nested.course.slug,
    description: nested.course.description,
    author: nested.course.author,
    email: nested.course.email,
    version: nested.course.version,
    language: nested.course.language,
    tags: nested.course.tags,
    repo_url: nested.course.repo_url,
    price_cents: nested.pricing.amount_cents,
    currency: nested.pricing.currency,
    affiliate_pct: nested.affiliates.default_commission_pct,
    pass_threshold: nested.pass_threshold,
    lessons_order: nested.lessons_order,
    sandboxes: nested.sandboxes,
    certificate: nested.certificate,
  });
}

// ============================================================
// Lesson parsing
// ============================================================

/**
 * Parse a lesson Markdown file (raw string).
 * Returns { frontmatter, bodyMd } or throws.
 */
export function parseLessonMarkdown(
  content: string,
  filePath: string
): { frontmatter: LessonFrontmatter; bodyMd: string } {
  const { data, content: body } = matter(content);

  const result = LessonFrontmatterSchema.safeParse(data);
  if (!result.success) {
    const msgs = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new Error(`Invalid frontmatter in ${filePath}: ${msgs}`);
  }

  return { frontmatter: result.data, bodyMd: body.trim() };
}

/**
 * Derive lesson slug from file path.
 * examples/lessons/01-git-model.md → "git-model"
 */
export function slugFromPath(filePath: string): string {
  const filename = filePath.split('/').pop() ?? filePath;
  return filename
    .replace(/\.md$/, '')
    .replace(/^\d+-/, '')
    .toLowerCase();
}

// ============================================================
// Main import function
// ============================================================

export type { RefType, ResolvedRef, RepoRefs } from './refs';
export { resolveRef, listRepoRefs, computeVersionLabel } from './refs';

export interface ImportOptions {
  repoUrl: string;
  /** Branch name, tag name, or undefined (→ default branch) */
  ref?: string;
  /** 'branch' | 'tag' — if omitted and ref is set, treated as branch */
  refType?: 'branch' | 'tag';
  /** @deprecated Use ref instead. Kept for backward compatibility. */
  branch?: string;
  token?: string;
}

import { resolveRef, computeVersionLabel } from './refs';

/**
 * Full import pipeline:
 * 1. Resolve ref (branch/tag/default) → commitSha
 * 2. Fetch recursive tree
 * 3. Find + parse course config
 * 4. Fetch + parse all lessons
 * 5. Fetch + parse referenced quizzes
 * 6. Return ImportPayload for upsert into Supabase
 */
export async function importFromGitHub(options: ImportOptions): Promise<ImportPayload> {
  const { repoUrl, ref, refType, token } = options;
  // backward-compat: options.branch → ref
  const resolvedRef = ref ?? options.branch;

  const { owner, repo } = parseRepoUrl(repoUrl);
  const errors: ImportError[] = [];

  // 1. Resolve ref → commitSha + metadata
  const refResult = await resolveRef(owner, repo, resolvedRef, refType, token);
  const { commitSha: headSha, ref: refName, refType: resolvedRefType, defaultBranch } = refResult;

  const repoRef: GitHubRepoRef = { owner, repo, branch: refResult.refType === 'branch' ? refName : defaultBranch };

  // 2. Fetch tree
  const tree = await fetchTree(owner, repo, headSha, token);
  const paths = tree.map((e) => e.path);

  // 3. Find course config
  const configPath = ['course.yml', 'course.config.yaml', 'course.config.yml'].find((p) =>
    paths.includes(p)
  );
  if (!configPath) {
    throw new Error(
      `No course config found in ${owner}/${repo}. Expected course.yml or course.config.yaml`
    );
  }
  const configContent = await fetchFileContent(owner, repo, configPath, token);
  const config = parseCourseConfig(configContent, configPath);

  // 4. Find lesson files
  const lessonPaths = paths
    .filter((p) => p.startsWith('lessons/') && p.endsWith('.md'))
    .sort();

  const lessons: FetchedLesson[] = [];
  for (const lPath of lessonPaths) {
    try {
      const content = await fetchFileContent(owner, repo, lPath, token);
      const { frontmatter, bodyMd } = parseLessonMarkdown(content, lPath);
      const slug = frontmatter.slug ?? slugFromPath(lPath);
      lessons.push({ path: lPath, slug, frontmatter, bodyMd });
    } catch (err) {
      errors.push({ path: lPath, message: (err as Error).message });
    }
  }

  // Sort by frontmatter.order
  lessons.sort((a, b) => a.frontmatter.order - b.frontmatter.order);

  // 5. Fetch referenced quizzes
  const quizIds = [...new Set(lessons.flatMap((l) => (l.frontmatter.quiz_id ? [l.frontmatter.quiz_id] : [])))];
  const quizzes: FetchedQuiz[] = [];
  for (const quizId of quizIds) {
    const quizPath = `quizzes/${quizId}.yml`;
    if (!paths.includes(quizPath)) {
      errors.push({ path: quizPath, message: `Quiz file not found: ${quizPath}` });
      continue;
    }
    try {
      const content = await fetchFileContent(owner, repo, quizPath, token);
      const raw = yaml.load(content);
      const data = QuizFileSchema.parse(raw);
      quizzes.push({ id: quizId, data });
    } catch (err) {
      errors.push({ path: quizPath, message: (err as Error).message });
    }
  }

  const versionLabel = computeVersionLabel({
    tagName: resolvedRefType === 'tag' ? refName : null,
    configVersion: config.version,
    commitSha: headSha,
  });

  return {
    repoRef,
    headSha,
    shortSha: headSha.slice(0, 7),
    ref: refName,
    refType: resolvedRefType,
    defaultBranch,
    versionLabel,
    config,
    lessons,
    quizzes,
    errors,
  };
}
