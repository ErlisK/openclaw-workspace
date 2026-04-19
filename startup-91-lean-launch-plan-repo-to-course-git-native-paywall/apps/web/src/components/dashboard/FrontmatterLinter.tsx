'use client';

import { useState, useCallback } from 'react';
import type { BatchLintResult, LintResult, LintIssue } from '@/lib/lint/frontmatter';

// ── Types ────────────────────────────────────────────────────────────────────

interface FrontmatterLinterProps {
  /** Called when user clicks "Import anyway" after reviewing issues */
  onProceed?: () => void;
  /** Called when lint passes — auto-proceed if desired */
  onClean?: () => void;
  /** Pre-fill with repo/path from parent import form */
  repoUrl?: string;
  coursePath?: string;
  branch?: string;
}

// ── Sub-components ────────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  error: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', icon: '✕', label: 'Error', textColor: 'text-red-800' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', icon: '⚠', label: 'Warning', textColor: 'text-amber-800' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-600', icon: 'ℹ', label: 'Info', textColor: 'text-blue-800' },
};

function IssueRow({ issue }: { issue: LintIssue }) {
  const cfg = SEVERITY_CONFIG[issue.severity];
  return (
    <div className={`rounded-lg border ${cfg.border} ${cfg.bg} px-3 py-2.5 text-sm`}>
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 shrink-0 text-xs font-bold ${cfg.textColor}`}>{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${cfg.badge}`}>
              {cfg.label}
            </span>
            {issue.field !== 'structure' && issue.field !== 'content' && (
              <code className="rounded bg-white/60 px-1 text-xs font-mono text-gray-700">{issue.field}</code>
            )}
            {issue.line && (
              <span className="text-xs text-gray-500">line {issue.line}</span>
            )}
          </div>
          <p className={`mt-1 ${cfg.textColor} font-medium`}>{issue.message}</p>
          {issue.fix && (
            <p className="mt-1 text-xs text-gray-600">
              <span className="font-medium">Fix:</span>{' '}
              {issue.fix.startsWith('`') || issue.fix.includes('`') ? (
                <span dangerouslySetInnerHTML={{ __html: issue.fix.replace(/`([^`]+)`/g, '<code class="rounded bg-white/60 px-1 font-mono">$1</code>') }} />
              ) : issue.fix}
            </p>
          )}
          {issue.doc && (
            <a
              href={issue.doc}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 hover:underline"
            >
              Docs →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function FileResult({ result }: { result: LintResult }) {
  const [expanded, setExpanded] = useState(true);
  const errors = result.issues.filter((i) => i.severity === 'error');
  const warnings = result.issues.filter((i) => i.severity === 'warning');
  const infos = result.issues.filter((i) => i.severity === 'info');

  const statusIcon = result.valid
    ? errors.length === 0 && warnings.length === 0 ? '✅' : '⚠️'
    : '❌';

  if (result.issues.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm">
        <span>✅</span>
        <code className="font-mono text-xs text-gray-700">{result.file}</code>
        <span className="text-green-700 text-xs">All checks passed</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* File header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-base">{statusIcon}</span>
        <code className="font-mono text-xs text-gray-700 flex-1 truncate">{result.file}</code>
        <div className="flex items-center gap-1.5 shrink-0">
          {errors.length > 0 && (
            <span className="rounded-full bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5">
              {errors.length} error{errors.length > 1 ? 's' : ''}
            </span>
          )}
          {warnings.length > 0 && (
            <span className="rounded-full bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5">
              {warnings.length} warn
            </span>
          )}
          {infos.length > 0 && (
            <span className="rounded-full bg-blue-100 text-blue-600 text-xs font-medium px-2 py-0.5">
              {infos.length} info
            </span>
          )}
          <span className="text-xs text-gray-400">{expanded ? '▾' : '▸'}</span>
        </div>
      </button>

      {/* Issues list */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-2">
          {result.issues.map((issue, i) => (
            <IssueRow key={i} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inline linter for paste mode ──────────────────────────────────────────────

export function InlineLinter() {
  const [mode, setMode] = useState<'course_yaml' | 'lesson_md' | 'quiz_yaml'>('lesson_md');
  const [content, setContent] = useState('');
  const [result, setResult] = useState<LintResult | null>(null);
  const [checking, setChecking] = useState(false);

  const handleCheck = useCallback(async () => {
    if (!content.trim()) return;
    setChecking(true);
    try {
      const filename =
        mode === 'course_yaml' ? 'course.yml' :
        mode === 'quiz_yaml' ? 'quiz.yml' : 'lesson.md';
      const res = await fetch('/api/lint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: [{ path: filename, content }] }),
      });
      const data: BatchLintResult = await res.json();
      if (data.results?.[0]) setResult(data.results[0]);
    } finally {
      setChecking(false);
    }
  }, [content, mode]);

  const PLACEHOLDERS = {
    course_yaml: `title: "My Course"\nslug: my-course\ndescription: "Learn X in 10 lessons"\nprice_cents: 0\ntags: [git, dev]`,
    lesson_md: `---\ntitle: "Introduction"\nslug: introduction\norder: 1\naccess: free\nestimated_minutes: 10\n---\n\n# Welcome\n\nLesson content goes here.`,
    quiz_yaml: `title: "Chapter 1 Quiz"\npass_threshold: 70\nquestions:\n  - question: "What is X?"\n    type: multiple_choice\n    options:\n      - "Option A"\n      - "Option B"\n    correct_index: 0`,
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🔍</span>
        <h3 className="font-semibold text-gray-900 text-sm">Frontmatter Linter</h3>
        <span className="text-xs text-gray-500">— paste content to check before importing</span>
      </div>

      {/* Mode selector */}
      <div className="flex gap-1.5 mb-3">
        {([['course_yaml', 'course.yml'], ['lesson_md', 'lesson.md'], ['quiz_yaml', 'quiz.yml']] as const).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setResult(null); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${mode === m ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <textarea
        value={content}
        onChange={(e) => { setContent(e.target.value); setResult(null); }}
        placeholder={PLACEHOLDERS[mode]}
        rows={8}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 resize-y"
        spellCheck={false}
      />

      <button
        type="button"
        onClick={handleCheck}
        disabled={!content.trim() || checking}
        className="mt-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
      >
        {checking ? 'Checking…' : 'Check frontmatter'}
      </button>

      {result && (
        <div className="mt-4">
          <FileResult result={result} />
        </div>
      )}
    </div>
  );
}

// ── Repo linter (shown in import page) ───────────────────────────────────────

export default function FrontmatterLinter({ onProceed, onClean, repoUrl, coursePath, branch }: FrontmatterLinterProps) {
  const [lintResult, setLintResult] = useState<(BatchLintResult & { meta?: Record<string, unknown> }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLint = useCallback(async () => {
    if (!repoUrl) return;
    setLoading(true);
    setError(null);
    setLintResult(null);

    try {
      const body: Record<string, string> = { repo_url: repoUrl };
      if (coursePath?.trim()) body['path'] = coursePath.trim();
      if (branch?.trim()) body['branch'] = branch.trim();

      const res = await fetch('/api/lint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setLintResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [repoUrl, coursePath, branch]);

  const hasErrors = (lintResult?.errorCount ?? 0) > 0;
  const hasWarnings = (lintResult?.warningCount ?? 0) > 0;

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔍</span>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Check before importing</h3>
            <p className="text-xs text-gray-500">Validates frontmatter and YAML files against the TeachRepo spec</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLint}
          disabled={!repoUrl || loading}
          className="flex-shrink-0 rounded-lg border border-violet-300 bg-white px-4 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50 transition-colors shadow-sm"
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
              Checking…
            </span>
          ) : 'Run lint check'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {lintResult && (
        <div className="space-y-2">
          {/* Summary bar */}
          <div className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 ${
            hasErrors ? 'border-red-200 bg-red-50' :
            hasWarnings ? 'border-amber-200 bg-amber-50' :
            'border-green-200 bg-green-50'
          }`}>
            <span className="text-lg">{hasErrors ? '❌' : hasWarnings ? '⚠️' : '✅'}</span>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${hasErrors ? 'text-red-800' : hasWarnings ? 'text-amber-800' : 'text-green-800'}`}>
                {hasErrors
                  ? `${lintResult.errorCount} error${lintResult.errorCount > 1 ? 's' : ''} found — fix before importing`
                  : hasWarnings
                  ? `${lintResult.warningCount} warning${lintResult.warningCount > 1 ? 's' : ''} — import will work but some fields may be missing`
                  : `All ${lintResult.results.length} files passed — ready to import`}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {lintResult.results.length} file{lintResult.results.length !== 1 ? 's' : ''} checked
                {(lintResult.meta as Record<string, string>)?.repo ? ` · ${(lintResult.meta as Record<string, string>).repo}@${(lintResult.meta as Record<string, string>).branch}` : ''}
              </p>
            </div>

            {/* Action buttons */}
            {!hasErrors && onProceed && (
              <button
                type="button"
                onClick={hasErrors ? undefined : () => { onClean?.(); onProceed(); }}
                className="flex-shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors"
              >
                Import now →
              </button>
            )}
            {hasErrors && onProceed && (
              <button
                type="button"
                onClick={onProceed}
                className="flex-shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Import anyway
              </button>
            )}
          </div>

          {/* Per-file results */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {lintResult.results.map((r, i) => (
              <FileResult key={i} result={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
