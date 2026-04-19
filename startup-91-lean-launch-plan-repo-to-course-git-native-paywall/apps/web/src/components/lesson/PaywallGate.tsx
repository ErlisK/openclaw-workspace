'use client';

/**
 * PaywallGate — shown on a locked lesson page when ?unlocking=1 is present.
 *
 * After Stripe Checkout the success URL includes ?session_id=xxx, which triggers
 * enrollment. But the lesson page itself (where the user returns) doesn't know
 * the enrollment happened until it re-runs SSR.
 *
 * This component:
 * 1. Shows a "Verifying your purchase…" spinner immediately
 * 2. Polls /api/entitlement/check every 1.5 s (up to 10 attempts)
 * 3. On enrolled=true → full page reload (removes ?unlocking param)
 * 4. On timeout → shows a manual "Refresh" button
 */

import * as React from 'react';

interface PaywallGateProps {
  courseId: string;
  /** Price display string, e.g. "$29 USD" */
  priceDisplay: string;
  /** Stripe checkout URL for the enroll button */
  checkoutHref: string;
  /** Whether we should poll immediately (i.e., user just returned from checkout) */
  polling?: boolean;
}

export function PaywallGate({ courseId, priceDisplay, checkoutHref, polling = false }: PaywallGateProps) {
  const [state, setState] = React.useState<'idle' | 'polling' | 'unlocked' | 'timeout'>(
    polling ? 'polling' : 'idle',
  );
  const [attempts, setAttempts] = React.useState(0);
  const MAX_ATTEMPTS = 10;

  React.useEffect(() => {
    if (state !== 'polling') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/entitlement/check?courseId=${encodeURIComponent(courseId)}`);
        const data = await res.json() as { enrolled: boolean };
        if (data.enrolled) {
          setState('unlocked');
          clearInterval(interval);
          // Remove ?unlocking param and reload to get SSR with enrollment
          const url = new URL(window.location.href);
          url.searchParams.delete('unlocking');
          url.searchParams.delete('session_id');
          window.location.replace(url.toString());
          return;
        }
      } catch {
        // Network error — keep polling
      }

      setAttempts((prev) => {
        if (prev + 1 >= MAX_ATTEMPTS) {
          setState('timeout');
          clearInterval(interval);
        }
        return prev + 1;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [state, courseId]);

  if (state === 'polling' || state === 'unlocked') {
    return (
      <div className="my-8 flex flex-col items-center gap-4 rounded-2xl border border-violet-200 bg-violet-50 px-6 py-10 text-center" data-testid="paywall-polling">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
        <div>
          <p className="font-semibold text-violet-900">Verifying your purchase…</p>
          <p className="mt-1 text-sm text-violet-700">
            {state === 'unlocked' ? 'Unlocked! Reloading…' : 'This usually takes a few seconds.'}
          </p>
        </div>
      </div>
    );
  }

  if (state === 'timeout') {
    return (
      <div className="my-8 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center" data-testid="paywall-timeout">
        <p className="font-semibold text-amber-900">Still verifying…</p>
        <p className="mt-1 text-sm text-amber-700">
          Your purchase may take a moment to process. Try refreshing.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700"
          data-testid="paywall-refresh-btn"
        >
          Refresh page
        </button>
      </div>
    );
  }

  // idle — standard paywall
  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white" data-testid="paywall-gate">
      {/* Blurred content preview */}
      <div className="relative h-36 select-none overflow-hidden bg-gray-900">
        <div className="absolute inset-0 p-4 font-mono text-xs text-green-400 leading-relaxed opacity-25 pointer-events-none">
          <div>{'# This lesson is locked'}</div>
          <div>{'## Enroll to access the full content'}</div>
          <div>{'> Purchase includes all lessons, quizzes, and sandbox access'}</div>
          <div>{''}</div>
          <div>{'- Lifetime access'}</div>
          <div>{'- Certificate of completion'}</div>
        </div>
        <div className="absolute inset-0 backdrop-blur-sm bg-gray-900/70 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl">🔒</div>
            <p className="mt-2 text-sm font-semibold text-white">Paid lesson</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 py-6 text-center">
        <h3 className="text-lg font-bold text-gray-900">Unlock this lesson</h3>
        <p className="mt-1 text-sm text-gray-600">
          Get lifetime access to all lessons, quizzes, and sandboxes.
        </p>
        <a
          href={checkoutHref}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
          data-testid="paywall-enroll-btn"
        >
          Enroll — {priceDisplay} →
        </a>
        <p className="mt-3 text-xs text-gray-400">Secure checkout via Stripe · 30-day refund policy</p>
      </div>
    </div>
  );
}
