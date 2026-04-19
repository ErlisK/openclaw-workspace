'use client';

import { useState, useEffect } from 'react';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  href?: string;
  linkText?: string;
}

const CHECKLIST: ChecklistItem[] = [
  {
    id: 'create_course',
    label: 'Create your first course',
    description: 'Import a GitHub repo or paste Markdown to create a course.',
    href: '/dashboard/import',
    linkText: 'Import a repo',
  },
  {
    id: 'add_lessons',
    label: 'Add lessons',
    description: 'Push Markdown files with frontmatter — they\'ll appear in order.',
    href: '/docs/repo-format',
    linkText: 'See repo format',
  },
  {
    id: 'set_price',
    label: 'Set a price (or make it free)',
    description: 'Configure price_cents in course.yml or the dashboard editor.',
    href: '/docs/payments-affiliates',
    linkText: 'Pricing docs',
  },
  {
    id: 'add_quiz',
    label: 'Add a quiz',
    description: 'Write a quizzes/*.yml file or use the AI generator in the editor.',
    href: '/docs/quizzes',
    linkText: 'Quiz schema',
  },
  {
    id: 'publish',
    label: 'Publish your course',
    description: 'Hit the Publish button in your dashboard. Your course goes live on the marketplace.',
    href: '/dashboard',
    linkText: 'Dashboard',
  },
];

const STORAGE_KEY = 'teachrepo_onboarding_v1';

interface OnboardingState {
  dismissed: boolean;
  completed: Record<string, boolean>;
}

function loadState(): OnboardingState {
  if (typeof window === 'undefined') return { dismissed: false, completed: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as OnboardingState;
  } catch { /* ignore */ }
  return { dismissed: false, completed: {} };
}

function saveState(state: OnboardingState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function OnboardingChecklist() {
  const [state, setState] = useState<OnboardingState>({ dismissed: false, completed: {} });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setState(loadState());
    setMounted(true);
  }, []);

  if (!mounted || state.dismissed) return null;

  const completedCount = Object.values(state.completed).filter(Boolean).length;
  const total = CHECKLIST.length;
  const allDone = completedCount === total;

  function toggle(id: string) {
    const next = { ...state, completed: { ...state.completed, [id]: !state.completed[id] } };
    setState(next);
    saveState(next);
  }

  function dismiss() {
    const next = { ...state, dismissed: true };
    setState(next);
    saveState(next);
  }

  return (
    <div className="mb-8 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {allDone ? '🎉 You\'re all set!' : '👋 Get started with TeachRepo'}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {allDone
              ? 'Your course is live. Share it with the world!'
              : `${completedCount} of ${total} steps completed`}
          </p>
        </div>
        <button
          onClick={dismiss}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="Dismiss onboarding checklist"
        >
          ✕
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-5 h-2 w-full rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-violet-500 transition-all duration-500"
          style={{ width: `${(completedCount / total) * 100}%` }}
        />
      </div>

      <ul className="space-y-3">
        {CHECKLIST.map((item) => {
          const done = !!state.completed[item.id];
          return (
            <li key={item.id} className="flex items-start gap-3">
              <button
                onClick={() => toggle(item.id)}
                className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
                  done
                    ? 'border-violet-500 bg-violet-500 text-white'
                    : 'border-gray-300 hover:border-violet-400'
                }`}
                aria-label={done ? `Mark "${item.label}" incomplete` : `Mark "${item.label}" complete`}
              >
                {done && (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                  {item.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                {item.href && !done && (
                  <a
                    href={item.href}
                    className="mt-1 inline-block text-xs font-medium text-violet-600 hover:text-violet-800"
                  >
                    {item.linkText} →
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {allDone && (
        <div className="mt-5 flex gap-3">
          <a
            href="/marketplace"
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            View Marketplace
          </a>
          <button
            onClick={dismiss}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
