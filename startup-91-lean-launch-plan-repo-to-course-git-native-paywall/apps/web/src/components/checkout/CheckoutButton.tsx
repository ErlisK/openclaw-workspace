'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';

interface CheckoutButtonProps {
  courseId: string;
  courseSlug: string;
  priceCents: number;
  currency: string;
  /** If true, renders a "Get free access" button that calls /api/enroll/free */
  isFree?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * CheckoutButton — Client Component
 *
 * For paid courses: calls POST /api/checkout → redirects to Stripe Hosted Checkout.
 * For free courses: calls POST /api/enroll/free → redirects to first lesson.
 *
 * Handles:
 * - Already enrolled (409) → redirect to course
 * - Loading state
 * - Error display
 */
export function CheckoutButton({
  courseId,
  courseSlug,
  priceCents,
  currency,
  isFree = false,
  className = '',
  children,
}: CheckoutButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    if (state === 'loading') return;
    setState('loading');
    setErrorMsg(null);

    try {
      if (isFree) {
        // Free enrollment
        const res = await fetch('/api/enroll/free', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId }),
        });

        const data = await res.json();

        if (res.status === 401) {
          // Not logged in — redirect to auth
          window.location.href = `/auth/login?next=/courses/${courseSlug}`;
          return;
        }

        if (!res.ok) {
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }

        // Redirect to first lesson
        if (data.firstLessonSlug) {
          window.location.href = `/courses/${courseSlug}/lessons/${data.firstLessonSlug}`;
        } else {
          window.location.href = `/courses/${courseSlug}`;
        }
        return;
      }

      // Paid enrollment — create Stripe Checkout Session
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });

      const data = await res.json();

      if (res.status === 401) {
        window.location.href = `/auth/login?next=/courses/${courseSlug}`;
        return;
      }

      if (res.status === 409) {
        // Already enrolled
        window.location.href = data.redirectUrl ?? `/courses/${courseSlug}`;
        return;
      }

      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      if (!data.url) {
        throw new Error('No checkout URL returned from server');
      }

      // Redirect to Stripe Hosted Checkout
      window.location.href = data.url;
    } catch (err) {
      setState('error');
      setErrorMsg((err as Error).message);
    }
  }, [courseId, courseSlug, isFree, state]);

  const priceLabel = isFree
    ? 'Get free access'
    : `Enroll — ${formatPrice(priceCents, currency)}`;

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={state === 'loading'}
        className={`relative flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
          isFree
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-violet-600 text-white shadow-lg hover:bg-violet-700 hover:shadow-xl'
        } ${className}`}
        aria-label={priceLabel}
      >
        {state === 'loading' ? (
          <>
            <Spinner />
            <span>{isFree ? 'Setting up access…' : 'Preparing checkout…'}</span>
          </>
        ) : (
          children ?? priceLabel
        )}
      </button>

      {state === 'error' && errorMsg && (
        <p
          className="mt-2 text-center text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {errorMsg}
          {errorMsg.includes('401') || errorMsg.toLowerCase().includes('unauthorized') ? (
            <a
              href={`/auth/login?next=/courses/${courseSlug}`}
              className="ml-1 underline"
            >
              Sign in
            </a>
          ) : null}
        </p>
      )}
    </div>
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function formatPrice(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return `${currency.toUpperCase()} ${(cents / 100).toFixed(0)}`;
  }
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
