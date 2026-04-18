'use client';
import * as React from 'react';
import { useState } from 'react';

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

const SAMPLE_REPO = 'https://github.com/ErlisK/openclaw-workspace';
const SAMPLE_PATH = 'sample-course';

export default function NewCoursePage() {
  const [repoUrl, setRepoUrl] = useState('');
  const [coursePath, setCoursePath] = useState('');
  const [branch, setBranch] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [step, setStep] = useState<ImportStep>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('connecting');
    setResult(null);

    try {
      // Animate through steps
      const stepSequence: ImportStep[] = ['connecting', 'reading-config', 'reading-lessons', 'reading-quizzes', 'saving'];
      let stepIdx = 0;

      const advanceStep = () => {
        stepIdx = Math.min(stepIdx + 1, stepSequence.length - 1);
        setStep(stepSequence[stepIdx]);
      };

      // Fake step progression while the real fetch runs
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
    setCoursePath(SAMPLE_PATH);
    setAdvanced(true);
  };

  const reset = () => {
    setStep('idle');
    setResult(null);
  };

  if (step === 'done' && result?.success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
          <p className="text-4xl mb-3">🎉</p>
          <h2 className="text-xl font-bold text-green-900 mb-1">Course imported!</h2>
          <p className="text-sm text-green-700 mb-4">
            <strong>{result.imported?.lessons ?? 0}</strong> lessons
            {result.imported?.quizzes ? ` · ${result.imported.quizzes} quizzes` : ''}
            {result.shortSha ? ` · sha:${result.shortSha}` : ''}
          </p>
          {result.errors && result.errors.length > 0 && (
            <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-left text-xs">
              <p className="font-medium text-yellow-800 mb-1">⚠ Partial import — some files had errors:</p>
              {result.errors.map((e, i) => (
                <p key={i} className="text-yellow-700">{e.path}: {e.message}</p>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <a
              href={`/courses/${result.courseSlug}`}
              className="inline-block rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
            >
              View course →
            </a>
            <a href="/dashboard" className="text-sm text-gray-500 hover:text-violet-600">
              Go to dashboard
            </a>
            <button onClick={reset} className="text-sm text-gray-400 hover:text-gray-600">
              Import another repo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 lg:py-16">
      {/* Header */}
      <div className="mb-8">
        <a href="/dashboard" className="text-sm text-gray-500 hover:text-violet-600">← Dashboard</a>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">Import from GitHub</h1>
        <p className="mt-1 text-sm text-gray-600">
          Point to any public GitHub repo that contains a{' '}
          <code className="rounded bg-gray-100 px-1 font-mono text-xs">course.yml</code>{' '}
          and a{' '}
          <code className="rounded bg-gray-100 px-1 font-mono text-xs">lessons/</code>{' '}
          folder.
        </p>
      </div>

      {/* Try sample banner */}
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4">
        <span className="text-2xl">🧪</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-violet-900">Try the sample course</p>
          <p className="text-xs text-violet-700 truncate">
            <code>ErlisK/openclaw-workspace</code> › <code>sample-course/</code>
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
            disabled={step !== 'idle'}
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
            placeholder="e.g. sample-course  (leave blank for repo root)"
            value={coursePath}
            onChange={(e) => setCoursePath(e.target.value)}
            disabled={step !== 'idle'}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 disabled:bg-gray-50"
          />
          <p className="mt-1 text-xs text-gray-400">
            Subdirectory containing <code>course.yml</code>. Leave blank if the course is at repo root.
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
                disabled={step !== 'idle'}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 disabled:bg-gray-50"
              />
            </div>
          )}
        </div>

        {/* Progress / error */}
        {step !== 'idle' && step !== 'done' && (
          <div className={`rounded-lg px-4 py-3 text-sm ${step === 'error' ? 'bg-red-50 text-red-700' : 'bg-violet-50 text-violet-700'}`}>
            {step === 'error' ? (
              <p>❌ {result?.error ?? 'Import failed'}</p>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                <span>{STEP_LABELS[step]}</span>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={step !== 'idle' && step !== 'error'}
          className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors"
        >
          {step === 'idle' ? 'Import course →' : step === 'error' ? 'Retry import' : 'Importing…'}
        </button>

        {step === 'error' && (
          <button type="button" onClick={reset} className="w-full text-sm text-gray-500 hover:text-gray-700">
            Reset
          </button>
        )}
      </form>

      {/* Format guide */}
      <details className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-700">Expected repo format</summary>
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
price_cents: 0    # 0 = free
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
        </div>
      </details>
    </div>
  );
}
