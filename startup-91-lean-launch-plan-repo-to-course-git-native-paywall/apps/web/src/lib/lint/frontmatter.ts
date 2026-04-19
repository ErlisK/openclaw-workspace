/**
 * TeachRepo frontmatter linter
 *
 * Validates course.yml and lesson markdown frontmatter against the
 * TeachRepo spec. Returns structured lint errors with:
 * - severity: 'error' | 'warning' | 'info'
 * - field: which frontmatter field is the problem
 * - message: human-readable description
 * - fix: suggested fix string
 * - doc: relative URL to the relevant docs page
 */

export type LintSeverity = 'error' | 'warning' | 'info';

export interface LintIssue {
  /** error = blocks import, warning = import proceeds but degraded, info = suggestion */
  severity: LintSeverity;
  /** Which field (or 'structure' for file-level issues) */
  field: string;
  /** Human-readable description */
  message: string;
  /** Short fix hint */
  fix?: string;
  /** Relative docs URL */
  doc?: string;
  /** Line number (1-indexed) in the file, if known */
  line?: number;
}

export interface LintResult {
  file: string;
  kind: 'course_yaml' | 'lesson_md' | 'quiz_yaml';
  issues: LintIssue[];
  valid: boolean; // no errors (warnings/infos are ok)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseYamlSimple(text: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let arrayMode = false;
  const arrBuffer: string[] = [];

  const flush = () => {
    if (currentKey && arrayMode) {
      out[currentKey] = arrBuffer.slice();
      arrBuffer.length = 0;
      arrayMode = false;
    }
  };

  for (const line of text.split('\n')) {
    if (line.trim().startsWith('#')) continue; // comment
    if (line.match(/^\s*-\s+/)) {
      const val = line.replace(/^\s*-\s+/, '').trim().replace(/^["']|["']$/g, '');
      if (currentKey) { arrayMode = true; arrBuffer.push(val); }
      continue;
    }
    const kv = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)$/);
    if (kv) {
      flush();
      currentKey = kv[1];
      const rawVal = kv[2].trim().replace(/^["']|["']$/g, '');
      if (rawVal === '') { arrayMode = false; }
      else if (rawVal === 'true') out[currentKey] = true;
      else if (rawVal === 'false') out[currentKey] = false;
      else if (!isNaN(Number(rawVal))) out[currentKey] = Number(rawVal);
      else out[currentKey] = rawVal;
    }
  }
  flush();
  return out;
}

function parseFrontmatterBlock(raw: string): { data: Record<string, unknown>; body: string; hasFrontmatter: boolean } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw, hasFrontmatter: false };
  return { data: parseYamlSimple(match[1]), body: match[2].trim(), hasFrontmatter: true };
}

function lineOf(text: string, key: string): number | undefined {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(new RegExp(`^${key}\\s*:`))) return i + 1;
  }
  return undefined;
}

// ── course.yml linter ────────────────────────────────────────────────────────

export function lintCourseYaml(content: string, filename = 'course.yml'): LintResult {
  const issues: LintIssue[] = [];

  if (!content.trim()) {
    return {
      file: filename,
      kind: 'course_yaml',
      valid: false,
      issues: [{ severity: 'error', field: 'structure', message: 'course.yml is empty', fix: 'Add required fields: title, slug', doc: '/docs/course-yaml' }],
    };
  }

  let data: Record<string, unknown>;
  try {
    data = parseYamlSimple(content);
  } catch {
    return {
      file: filename,
      kind: 'course_yaml',
      valid: false,
      issues: [{ severity: 'error', field: 'structure', message: 'YAML parse error — check indentation and quoting', doc: '/docs/course-yaml' }],
    };
  }

  // title
  if (!data['title']) {
    issues.push({
      severity: 'error', field: 'title',
      message: 'Missing required field: title',
      fix: 'Add `title: "Your Course Title"` to course.yml',
      doc: '/docs/course-yaml',
    });
  } else if (typeof data['title'] === 'string' && data['title'].length > 200) {
    issues.push({
      severity: 'warning', field: 'title',
      message: `Title is very long (${(data['title'] as string).length} chars) — keep it under 80 characters for good SEO`,
      fix: 'Shorten the title; put the longer description in `description:`',
      doc: '/docs/course-yaml',
    });
  }

  // slug
  if (!data['slug']) {
    issues.push({
      severity: 'error', field: 'slug',
      message: 'Missing required field: slug',
      fix: 'Add `slug: my-course-slug` (lowercase, hyphens only)',
      doc: '/docs/course-yaml',
    });
  } else {
    const slug = String(data['slug']);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      issues.push({
        severity: 'error', field: 'slug',
        message: `Slug "${slug}" is invalid — must be lowercase letters, numbers, and hyphens only`,
        fix: `Change to: slug: ${slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '')}`,
        doc: '/docs/course-yaml',
        line: lineOf(content, 'slug'),
      });
    }
  }

  // price_cents
  if (data['price_cents'] !== undefined) {
    const p = Number(data['price_cents']);
    if (isNaN(p) || p < 0) {
      issues.push({
        severity: 'error', field: 'price_cents',
        message: 'price_cents must be a non-negative integer (e.g. 1900 for $19)',
        fix: 'Use `price_cents: 0` for free or `price_cents: 1900` for $19',
        doc: '/docs/course-yaml',
        line: lineOf(content, 'price_cents'),
      });
    }
    if (p > 0 && p < 50) {
      issues.push({
        severity: 'warning', field: 'price_cents',
        message: `price_cents: ${p} is very low — Stripe minimum is $0.50 (50 cents)`,
        fix: 'Set to at least 50, or 0 for free',
        doc: '/docs/course-yaml',
      });
    }
  }

  // currency
  if (data['currency'] !== undefined) {
    const c = String(data['currency']).toLowerCase();
    if (c.length !== 3) {
      issues.push({
        severity: 'error', field: 'currency',
        message: 'currency must be a 3-letter ISO code (e.g. usd, eur, gbp)',
        fix: 'Use `currency: usd`',
        doc: '/docs/course-yaml',
        line: lineOf(content, 'currency'),
      });
    }
  }

  // affiliate_pct
  if (data['affiliate_pct'] !== undefined) {
    const a = Number(data['affiliate_pct']);
    if (isNaN(a) || a < 0 || a > 100) {
      issues.push({
        severity: 'error', field: 'affiliate_pct',
        message: 'affiliate_pct must be 0–100',
        fix: 'Use `affiliate_pct: 20` for 20% commission',
        doc: '/docs/payments-affiliates',
        line: lineOf(content, 'affiliate_pct'),
      });
    }
  }

  // tags
  if (data['tags'] !== undefined && !Array.isArray(data['tags'])) {
    issues.push({
      severity: 'warning', field: 'tags',
      message: 'tags should be a YAML list',
      fix: 'Use `tags: [tag1, tag2]` or multi-line list format',
      doc: '/docs/course-yaml',
    });
  }

  // description optional but recommended
  if (!data['description']) {
    issues.push({
      severity: 'info', field: 'description',
      message: 'No description — add one for better SEO and marketplace listings',
      fix: 'Add `description: "One-sentence description of the course"`',
      doc: '/docs/course-yaml',
    });
  }

  return {
    file: filename,
    kind: 'course_yaml',
    issues,
    valid: !issues.some((i) => i.severity === 'error'),
  };
}

// ── Lesson frontmatter linter ─────────────────────────────────────────────────

export function lintLessonFile(content: string, filename = 'lesson.md'): LintResult {
  const issues: LintIssue[] = [];

  if (!content.trim()) {
    return {
      file: filename,
      kind: 'lesson_md',
      valid: false,
      issues: [{ severity: 'error', field: 'structure', message: 'Lesson file is empty', fix: 'Add frontmatter (---) and lesson content', doc: '/docs/repo-format' }],
    };
  }

  const { data, body, hasFrontmatter } = parseFrontmatterBlock(content);

  if (!hasFrontmatter) {
    issues.push({
      severity: 'warning', field: 'structure',
      message: 'No YAML frontmatter block found — lesson will use filename as title',
      fix: 'Add a --- frontmatter block at the top of the file',
      doc: '/docs/repo-format',
    });
    // If no frontmatter, nothing else to lint
    return { file: filename, kind: 'lesson_md', issues, valid: true };
  }

  // title recommended
  if (!data['title']) {
    issues.push({
      severity: 'warning', field: 'title',
      message: 'No title in frontmatter — filename will be used as title',
      fix: 'Add `title: "Lesson Title"` to the frontmatter',
      doc: '/docs/repo-format',
    });
  }

  // order
  if (data['order'] !== undefined) {
    const o = Number(data['order']);
    if (isNaN(o) || o < 0 || !Number.isInteger(o)) {
      issues.push({
        severity: 'warning', field: 'order',
        message: 'order should be a non-negative integer',
        fix: 'Use `order: 1`, `order: 2`, etc.',
        doc: '/docs/repo-format',
      });
    }
  }

  // access
  if (data['access'] !== undefined) {
    const a = String(data['access']).toLowerCase();
    if (!['free', 'paid'].includes(a)) {
      issues.push({
        severity: 'error', field: 'access',
        message: `access must be "free" or "paid", got "${data['access']}"`,
        fix: 'Use `access: free` or `access: paid`',
        doc: '/docs/repo-format',
      });
    }
  }

  // estimated_minutes
  if (data['estimated_minutes'] !== undefined) {
    const m = Number(data['estimated_minutes']);
    if (isNaN(m) || m < 0) {
      issues.push({
        severity: 'warning', field: 'estimated_minutes',
        message: 'estimated_minutes must be a positive number',
        fix: 'Use `estimated_minutes: 10`',
        doc: '/docs/repo-format',
      });
    }
    if (m > 240) {
      issues.push({
        severity: 'info', field: 'estimated_minutes',
        message: `${m} minutes is very long — consider splitting into multiple lessons`,
        doc: '/docs/repo-format',
      });
    }
  }

  // quiz_id
  if (data['quiz_id'] !== undefined) {
    const qid = String(data['quiz_id']);
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(qid)) {
      issues.push({
        severity: 'warning', field: 'quiz_id',
        message: `quiz_id "${qid}" should match the quiz file name (e.g. intro-quiz for quizzes/intro-quiz.yml)`,
        fix: 'Use the quiz filename without extension: `quiz_id: intro-quiz`',
        doc: '/docs/quizzes',
      });
    }
  }

  // slug
  if (data['slug'] !== undefined) {
    const s = String(data['slug']);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) {
      issues.push({
        severity: 'error', field: 'slug',
        message: `Lesson slug "${s}" is invalid — lowercase, hyphens only`,
        fix: `Use: slug: ${s.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-')}`,
        doc: '/docs/repo-format',
      });
    }
  }

  // Empty body warning
  if (!body.trim()) {
    issues.push({
      severity: 'warning', field: 'content',
      message: 'Lesson body is empty — add Markdown content below the frontmatter',
      doc: '/docs/repo-format',
    });
  }

  return {
    file: filename,
    kind: 'lesson_md',
    issues,
    valid: !issues.some((i) => i.severity === 'error'),
  };
}

// ── Quiz YAML linter ─────────────────────────────────────────────────────────

export function lintQuizYaml(content: string, filename = 'quiz.yml'): LintResult {
  const issues: LintIssue[] = [];

  if (!content.trim()) {
    return {
      file: filename,
      kind: 'quiz_yaml',
      valid: false,
      issues: [{ severity: 'error', field: 'structure', message: 'Quiz file is empty', doc: '/docs/quizzes' }],
    };
  }

  const data = parseYamlSimple(content);

  if (!data['title']) {
    issues.push({
      severity: 'warning', field: 'title',
      message: 'Quiz has no title',
      fix: 'Add `title: "Quiz Title"`',
      doc: '/docs/quizzes',
    });
  }

  if (data['pass_threshold'] !== undefined) {
    const p = Number(data['pass_threshold']);
    if (isNaN(p) || p < 0 || p > 100) {
      issues.push({
        severity: 'error', field: 'pass_threshold',
        message: 'pass_threshold must be 0–100',
        fix: 'Use `pass_threshold: 70` for 70%',
        doc: '/docs/quizzes',
      });
    }
  }

  if (!Array.isArray(data['questions'])) {
    issues.push({
      severity: 'error', field: 'questions',
      message: 'No questions array found in quiz YAML',
      fix: 'Add a `questions:` list with at least one question',
      doc: '/docs/quizzes',
    });
  }

  return {
    file: filename,
    kind: 'quiz_yaml',
    issues,
    valid: !issues.some((i) => i.severity === 'error'),
  };
}

// ── Batch linter (for API) ────────────────────────────────────────────────────

export interface BatchLintInput {
  files: Array<{
    path: string;
    content: string;
  }>;
}

export interface BatchLintResult {
  results: LintResult[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  allValid: boolean;
}

export function lintBatch(files: BatchLintInput['files']): BatchLintResult {
  const results: LintResult[] = [];

  for (const f of files) {
    const lower = f.path.toLowerCase();
    if (lower.endsWith('course.yml') || lower.endsWith('course.yaml')) {
      results.push(lintCourseYaml(f.content, f.path));
    } else if (lower.endsWith('.md') || lower.endsWith('.mdx')) {
      results.push(lintLessonFile(f.content, f.path));
    } else if ((lower.includes('quiz') || lower.includes('quizzes')) && (lower.endsWith('.yml') || lower.endsWith('.yaml'))) {
      results.push(lintQuizYaml(f.content, f.path));
    }
  }

  let errorCount = 0, warningCount = 0, infoCount = 0;
  for (const r of results) {
    for (const i of r.issues) {
      if (i.severity === 'error') errorCount++;
      else if (i.severity === 'warning') warningCount++;
      else infoCount++;
    }
  }

  return { results, errorCount, warningCount, infoCount, allValid: errorCount === 0 };
}
