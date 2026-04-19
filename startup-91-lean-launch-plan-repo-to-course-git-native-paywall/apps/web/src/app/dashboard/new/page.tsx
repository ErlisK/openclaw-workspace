'use client';
import * as React from 'react';
import { useState } from 'react';
import dynamic from 'next/dynamic';

// Lazy-load the linter to keep the initial page bundle small
const FrontmatterLinter = dynamic(
  () => import('@/components/dashboard/FrontmatterLinter'),
  { loading: () => <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5 text-sm text-gray-400">Loading linter…</div> }
);
const InlineLinter = dynamic(
  () => import('@/components/dashboard/FrontmatterLinter').then((m) => ({ default: m.InlineLinter })),
  { ssr: false }
);

interface ImportResult {
  success: boolean;
  courseId?: string;
  courseSlug?: string;
  versionLabel?: string;
  commitSha?: string;
  shortSha?: string;
  imported?: { lessons: number; quizzes: number };
  errors?: Array<{ path: string; message: string }>;
  error?: string;
}

type ImportStep =
  | 'idle'
  | 'connecting'
  | 'reading-config'
  | 'reading-lessons'
  | 'reading-quizzes'
  | 'saving'
  | 'done'
  | 'error';

const STEP_LABELS: Record<ImportStep, string> = {
  idle: '',
  connecting: 'Connecting to GitHub…',
  'reading-config': 'Reading course.yml…',
  'reading-lessons': 'Fetching lesson files…',
  'reading-quizzes': 'Parsing quiz files…',
  saving: 'Saving to database…',
  done: 'Import complete!',
  error: 'Import failed',
};

// ── Error categoriser ─────────────────────────────────────────────────────────
// Maps raw error strings to human-friendly messages + doc links

interface ErrorHint {
  message: string;
  detail?: string;
  doc?: string;
  fix?: string;
}

function categoriseError(error: string): ErrorHint {
  const e = error.toLowerCase();

  if (e.includes('course.yml missing') || e.includes('missing slug')) {
    return {
      message: 'Missing course.yml or required fields',
      detail: error,
      doc: '/docs/course-yaml',
      fix: 'Add course.yml with title and slug fields to your repo root (or specified folder)',
    };
  }
  if (e.includes('could not find') && e.includes('course')) {
    return {
      message: 'course.yml not found in repo',
      detail: error,
      doc: '/docs/quickstart',
      fix: 'Make sure course.yml exists in your repo root or specified folder path',
    };
  }
  if (e.includes('yaml') || e.includes('parse') || e.includes('frontmatter')) {
    return {
      message: 'YAML parse error',
      detail: error,
      doc: '/docs/repo-format',
      fix: 'Check indentation (use spaces not tabs), quote strings with special characters',
    };
  }
  if (e.includes('not found') && (e.includes('repo') || e.includes('404'))) {
    return {
      message: 'Repository not found',
      detail: error,
      doc: '/docs/quickstart',
      fix: 'Verify the repo URL is correct and the repo is public (or you have access)',
    };
  }
  if (e.includes('rate limit') || e.includes('403')) {
    return {
      message: 'GitHub API rate limit',
      detail: error,
      doc: '/docs/quickstart',
      fix: 'Wait a few minutes and try again, or add a GitHub token in your settings',
    };
  }
  if (e.includes('branch') || e.includes('ref')) {
    return {
      message: 'Branch or ref not found',
      detail: error,
      doc: '/docs/quickstart',
      fix: 'Check the branch name — default is "main"',
    };
  }
  if (e.includes('slug') && e.includes('invalid')) {
    return {
      message: 'Invalid slug in course.yml',
      detail: error,
      doc: '/docs/course-yaml',
      fix: 'Slugs must be lowercase letters, numbers, and hyphens only. Example: my-course',
    };
  }
  if (e.includes('price') || e.includes('price_cents')) {
    return {
      message: 'Invalid price in course.yml',
      detail: error,
      doc: '/docs/course-yaml',
      fix: 'Use price_cents: 0 for free or an integer like 1900 for $19',
    };
  }
  if (e.includes('no lessons') || e.includes('lessons/')) {
    return {
      message: 'No lesson files found',
      detail: error,
      doc: '/docs/repo-format',
      fix: 'Add .md files in a lessons/ folder. Files should start with a number like 01-intro.md',
    };
  }

  // Fallback
  return { message: error };
}

// ── Partial import warnings ───────────────────────────────────────────────────

function PartialImportWarnings({ errors }: { errors: Array<{ path: string; message: string }> }) {
  const categorised = errors.map((e) => ({
    path: e.path,
    ...categoriseError(e.message),
  }));

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-800 mb-3">
        ⚠ Partial import — {errors.length} file{errors.length > 1 ? 's' : ''} had issues
      </p>
      <div className="space-y-2">
        {categorised.map((e, i) => (
          <div key={i} className="rounded-lg border border-amber-100 bg-white px-3 py-2">
            <code className="text-xs font-mono text-gray-600">{e.path}</code>
            <p className="text-xs font-medium text-amber-800 mt-1">{e.message}</p>
            {e.detail && e.detail !== e.message && (
              <p className="text-xs text-gray-500 mt-0.5">{e.detail}</p>
            )}
            {e.fix && (
              <p className="text-xs text-gray-600 mt-1">
                <span className="font-medium">Fix:</span> {e.fix}
              </p>
            )}
            {e.doc && (
              <a href={e.doc} className="mt-1 inline-flex items-center text-xs text-violet-600 hover:underline">
                View docs →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const SAMPLE_REPO = 'https://github.com/ErlisK/teachrepo-template';

export default function NewCoursePage() {
  const [repoUrl, setRepoUrl] = useState('');
  const [coursePath, setCoursePath] = useState('');
  const [branch, setBranch] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [step, setStep] = useState<ImportStep>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showLinter, setShowLinter] = useState(false);
  const [activeTab, setActiveTab] = useState<'import' | 'lint-paste'>('import');

  const handleImport = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setStep('connecting');
    setResult(null);

    try {
      const stepSequence: ImportStep[] = ['connecting', 'reading-config', 'reading-lessons', 'reading-quizzes', 'saving'];
      let stepIdx = 0;
      const advanceStep = () => {
        stepIdx = Math.min(stepIdx + 1, stepSequence.length - 1);
        setStep(stepSequence[stepIdx]);
      };
      const stepTimer = setInterval(advanceStep, 1200);

      const body: Record<string, string> = { repo_url: repoUrl };
      if (coursePath.trim()) body['path'] = coursePath.trim().replace(/^\/|\/$/g, '');
      if (branch.trim()) body['branch'] = branch.trim();

      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      clearInterval(stepTimer);
      const data: ImportResult = await res.json();

      if (!res.ok || !data.success) {
        setStep('error');
        setResult(data);
      } else {
        setStep('done');
        setResult(data);
      }
    } catch (err) {
      setStep('error');
      setResult({ success: false, error: (err as Error).message });
    }
  };

  const handleTrySample = () => {
    setRepoUrl(SAMPLE_REPO);
    setCoursePath('');
    setBranch('main');
    setAdvanced(true);
  };

  const reset = () => {
    setStep('idle');
    setResult(null);
  };

  // ── Success screen ─────────────────────────────────────────────────────────

  if (step === 'done' && result?.success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
          <p className="text-4xl mb-3">🎉</p>
          <h2 className="text-xl font-bold text-green-900 mb-1">Course imported!</h2>
          <p className="text-sm text-green-700 mb-1">
            <strong>{result.imported?.lessons ?? 0}</strong> lessons
            {result.imported?.quizzes ? ` · ${result.imported.quizzes} quizzes` : ''}
            {result.shortSha ? ` · sha:${result.shortSha}` : ''}
          </p>
          {result.versionLabel && (
            <p className="text-xs text-green-600 mb-4">Version: {result.versionLabel}</p>
          )}

          {result.errors && result.errors.length > 0 && (
            <div className="mb-4 text-left">
              <PartialImportWarnings errors={result.errors} />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <a
              href={result.courseSlug ? `/courses/${result.courseSlug}` : '/dashboard'}
              className="inline-block rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
            >
              View course →
            </a>
            <a href="/dashboard/courses" className="text-sm text-gray-500 hover:text-violet-600">
              My courses
            </a>
            <button onClick={reset} className="text-sm text-gray-400 hover:text-gray-600">
              Import another repo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Error hint (when import fails) ─────────────────────────────────────────

  const errorHint = result?.error ? categoriseError(result.error) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 lg:py-16">
      {/* Header */}
      <div className="mb-6">
        <a href="/dashboard" className="text-sm text-gray-500 hover:text-violet-600">← Dashboard</a>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">Import from GitHub</h1>
        <p className="mt-1 text-sm text-gray-600">
          Point to any public GitHub repo with a{' '}
          <a href="/docs/course-yaml" className="text-violet-600 hover:underline">
            <code className="text-xs">course.yml</code>
          </a>{' '}
          and a{' '}
          <a href="/docs/repo-format" className="text-violet-600 hover:underline">
            <code className="text-xs">lessons/</code>
          </a>{' '}
          folder.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('import')}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === 'import' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Import repo
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('lint-paste')}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === 'lint-paste' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
        >
          🔍 Check frontmatter
        </button>
      </div>

      {/* ── Paste linter tab ───────────────────────────────────────────────── */}
      {activeTab === 'lint-paste' && (
        <div className="space-y-4">
          <InlineLinter />
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            <p className="font-medium text-gray-700 mb-2">Common frontmatter mistakes</p>
            <ul className="space-y-1 text-xs list-disc list-inside">
              <li>Missing <code className="font-mono bg-white px-1 rounded">---</code> delimiters around the frontmatter block</li>
              <li>Using tabs instead of spaces for indentation</li>
              <li>Forgetting quotes around strings with special characters (<code>: # & |</code>)</li>
              <li><code>access:</code> must be <code>free</code> or <code>paid</code> — not <code>gated</code> or <code>premium</code></li>
              <li>Slug contains spaces or uppercase: use <code>my-lesson-slug</code> not <code>My Lesson</code></li>
              <li><code>price_cents</code> must be an integer (e.g. <code>1900</code> for $19), not <code>19.00</code></li>
              <li><a href="/docs/repo-format" className="text-violet-600 hover:underline">Full format reference →</a></li>
            </ul>
          </div>
        </div>
      )}

      {/* ── Import tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'import' && (
        <div className="space-y-5">
          {/* Try sample banner */}
          <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4">
            <span className="text-2xl">🧪</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-violet-900">Try the sample course</p>
              <p className="text-xs text-violet-700 truncate">
                <code>ErlisK/teachrepo-template</code>
              </p>
            </div>
            <button
              type="button"
              onClick={handleTrySample}
              className="flex-shrink-0 rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100"
            >
              Use this
            </button>
          </div>

          {/* Main form */}
          <form onSubmit={handleImport} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            {/* Repo URL */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                GitHub repo URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                required
                placeholder="https://github.com/owner/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                disabled={step !== 'idle' && step !== 'error'}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 disabled:bg-gray-50"
              />
            </div>

            {/* Subdirectory path */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Course folder <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. my-course  (leave blank for repo root)"
                value={coursePath}
                onChange={(e) => setCoursePath(e.target.value)}
                disabled={step !== 'idle' && step !== 'error'}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 disabled:bg-gray-50"
              />
              <p className="mt-1 text-xs text-gray-400">
                Subdirectory containing <code>course.yml</code>. Leave blank if at repo root.
              </p>
            </div>

            {/* Advanced toggle */}
            <div>
              <button
                type="button"
                onClick={() => setAdvanced(!advanced)}
                className="text-xs text-gray-500 hover:text-violet-600"
              >
                {advanced ? '▾' : '▸'} Advanced options
              </button>
              {advanced && (
                <div className="mt-3">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Branch or tag</label>
                  <input
                    type="text"
                    placeholder="main  (default)"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    disabled={step !== 'idle' && step !== 'error'}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 disabled:bg-gray-50"
                  />
                </div>
              )}
            </div>

            {/* Progress */}
            {step !== 'idle' && step !== 'done' && step !== 'error' && (
              <div className="rounded-lg bg-violet-50 px-4 py-3 text-sm text-violet-700">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                  <span>{STEP_LABELS[step]}</span>
                </div>
              </div>
            )}

            {/* Error with categorised hint */}
            {step === 'error' && errorHint && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-800 mb-1">❌ {errorHint.message}</p>
                {errorHint.detail && errorHint.detail !== errorHint.message && (
                  <p className="text-xs text-red-600 mb-2 font-mono">{errorHint.detail}</p>
                )}
                {errorHint.fix && (
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">How to fix:</span> {errorHint.fix}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 mt-2">
                  {errorHint.doc && (
                    <a href={errorHint.doc} className="text-xs text-violet-600 hover:underline font-medium">
                      View docs →
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => { setActiveTab('lint-paste'); }}
                    className="text-xs text-violet-600 hover:underline font-medium"
                  >
                    Check frontmatter manually →
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={step !== 'idle' && step !== 'error'}
              className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors"
            >
              {step === 'idle' ? 'Import course →'
                : step === 'error' ? 'Retry import'
                : 'Importing…'}
            </button>

            {step === 'error' && (
              <button type="button" onClick={reset} className="w-full text-sm text-gray-500 hover:text-gray-700">
                Reset
              </button>
            )}
          </form>

          {/* Inline linter — shown when repo URL is filled */}
          {repoUrl && step === 'idle' && (
            <div>
              <button
                type="button"
                onClick={() => setShowLinter(!showLinter)}
                className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-800 font-medium mb-3"
              >
                <span>🔍</span>
                {showLinter ? 'Hide lint check' : 'Check frontmatter before importing'}
              </button>
              {showLinter && (
                <FrontmatterLinter
                  repoUrl={repoUrl}
                  coursePath={coursePath}
                  branch={branch}
                  onProceed={handleImport}
                />
              )}
            </div>
          )}

          {/* Format guide */}
          <details className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
              Expected repo format
            </summary>
            <div className="mt-3 space-y-2 text-xs text-gray-600 font-mono">
              <p className="text-gray-800 font-sans font-medium">your-course/</p>
              <p className="pl-4">├── course.yml <span className="text-gray-400 font-sans"># required</span></p>
              <p className="pl-4">├── lessons/</p>
              <p className="pl-8">├── 01-intro.md</p>
              <p className="pl-8">└── 02-advanced.md</p>
              <p className="pl-4">└── quizzes/ <span className="text-gray-400 font-sans"># optional</span></p>
              <p className="pl-8">└── intro-quiz.yml</p>
              <div className="mt-3 pt-3 border-t border-gray-200 font-sans">
                <p className="font-medium text-gray-700 mb-1">course.yml</p>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap">{`title: "My Course"
slug: my-course
description: "..."
price_cents: 0
tags: [git, dev]`}</pre>
              </div>
              <div className="mt-2 font-sans">
                <p className="font-medium text-gray-700 mb-1">Lesson frontmatter</p>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap">{`---
title: "Lesson Title"
slug: lesson-slug
order: 1
access: free   # or paid
estimated_minutes: 10
quiz_id: my-quiz
---
# Content here...`}</pre>
              </div>
              <div className="mt-2 font-sans text-violet-600 text-xs">
                <a href="/docs/repo-format" className="hover:underline">Full docs →</a>
                {' · '}
                <a href="/docs/course-yaml" className="hover:underline">course.yml reference →</a>
                {' · '}
                <a href="/docs/quizzes" className="hover:underline">Quiz format →</a>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
