"use client";

/**
 * OnboardingTour — guided overlay tour for new users
 *
 * Shown automatically on first visit to /dashboard (no localStorage key).
 * Steps: welcome → create project → trigger run → view findings → download patch
 *
 * Stores completion in localStorage: "docsci_tour_complete"
 */

import { useState, useEffect } from "react";

interface TourStep {
  id: string;
  title: string;
  body: string;
  icon: string;
  cta?: string;
  ctaHref?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to DocsCI 👋",
    body: "DocsCI keeps your code examples working, your API docs in sync, and your copy polished — automatically. Let's take a 30-second tour.",
    icon: "🎉",
  },
  {
    id: "create-project",
    title: "Create your first project",
    body: "Connect a GitHub repository and tell DocsCI where your docs live. You can start with a sample repo to see results instantly.",
    icon: "📁",
    cta: "Go to Projects →",
    ctaHref: "/dashboard/projects",
  },
  {
    id: "trigger-run",
    title: "Trigger a CI run",
    body: "Click ▶ Run CI on any project to execute all code examples, check accessibility, lint copy, and detect API drift — in parallel.",
    icon: "▶️",
  },
  {
    id: "view-findings",
    title: "Review findings",
    body: "Each run produces a list of findings: broken snippets, drift alerts, accessibility violations, and copy issues — with severity levels.",
    icon: "🔍",
    cta: "See a sample run →",
    ctaHref: "/runs",
  },
  {
    id: "ai-fix",
    title: "Apply AI-generated fixes",
    body: "Every error-level finding includes an AI-generated patch diff. Review it, download as a .patch file, or apply it directly to your PR.",
    icon: "🤖",
  },
  {
    id: "done",
    title: "You're all set!",
    body: "DocsCI runs on every push and files PR comments with precise fixes. Check your dashboard for live run history and trends.",
    icon: "✅",
    cta: "Open dashboard →",
    ctaHref: "/dashboard",
  },
];

const STORAGE_KEY = "docsci_tour_complete";

interface Props {
  /** Force show even if already completed (for testing) */
  forceShow?: boolean;
  onComplete?: () => void;
}

export function OnboardingTour({ forceShow, onComplete }: Props) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceShow) {
      setVisible(true);
      return;
    }
    try {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) setVisible(true);
    } catch {
      // SSR / private mode
    }
  }, [forceShow]);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    onComplete?.();
  };

  const next = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      data-testid="onboarding-tour"
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding tour"
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Progress bar */}
        <div className="h-1 bg-gray-800 rounded-t-2xl overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }}
          />
        </div>

        <div className="px-8 pt-8 pb-6">
          {/* Icon + close */}
          <div className="flex items-start justify-between mb-4">
            <span className="text-4xl" role="img" aria-hidden>
              {current.icon}
            </span>
            <button
              onClick={dismiss}
              className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
              aria-label="Skip tour"
              data-testid="tour-skip"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <h2
            className="text-white text-xl font-bold mb-3"
            data-testid="tour-step-title"
          >
            {current.title}
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            {current.body}
          </p>

          {/* Step dots */}
          <div className="flex gap-1.5 mb-6">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === step ? "bg-indigo-400" : "bg-gray-600 hover:bg-gray-500"
                }`}
                aria-label={`Go to step ${i + 1}`}
                data-testid={`tour-dot-${i}`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {current.cta && current.ctaHref ? (
              <a
                href={current.ctaHref}
                onClick={dismiss}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg text-center transition-colors"
                data-testid="tour-cta"
              >
                {current.cta}
              </a>
            ) : null}
            <button
              onClick={next}
              className={`${current.cta ? "" : "flex-1"} px-4 py-2 ${
                isLast
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-200"
              } text-sm font-medium rounded-lg transition-colors`}
              data-testid="tour-next"
            >
              {isLast ? "Done ✓" : "Next →"}
            </button>
          </div>

          {/* Step counter */}
          <p className="text-gray-600 text-xs text-center mt-4">
            {step + 1} of {TOUR_STEPS.length}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook: returns true if tour has been completed (localStorage)
 */
export function useTourComplete(): boolean {
  const [done, setDone] = useState(false);
  useEffect(() => {
    try {
      setDone(!!localStorage.getItem(STORAGE_KEY));
    } catch {}
  }, []);
  return done;
}

/**
 * Utility: reset tour (for testing / demo purposes)
 */
export function resetTour() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
