'use client';

import { useState } from 'react';

interface CheckoutButtonProps {
  courseId: string;
  courseSlug: string;
  priceDisplay: string;
  className?: string;
  /** If true, renders a free-enroll button (POST /api/enroll/free) instead of Stripe */
  isFree?: boolean;
}

/**
 * CheckoutButton — client component that POST-initiates Stripe Checkout.
 *
 * For paid courses: POST /api/checkout → redirects to Stripe Checkout URL.
 * For free courses: POST /api/enroll/free → redirects to /courses/:slug/enroll?enrolled=1.
 *
 * The tr_affiliate_ref cookie is automatically sent with every same-origin fetch
 * (fetch with credentials:'include' or just the default same-origin cookie handling).
 */
export function CheckoutButton({
  courseId,
  courseSlug,
  priceDisplay,
  className,
  isFree = false,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      if (isFree) {
        const res = await fetch('/api/enroll/free', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId }),
        });

        if (res.status === 401) {
          // Not logged in — redirect to auth with return URL
          window.location.href = `/auth/login?next=/courses/${courseSlug}`;
          return;
        }

        if (res.ok) {
          const body = await res.json() as { courseSlug?: string; firstLessonSlug?: string };
          if (body.firstLessonSlug) {
            window.location.href = `/courses/${body.courseSlug ?? courseSlug}/lessons/${body.firstLessonSlug}?unlocking=1`;
          } else {
            window.location.href = `/courses/${courseSlug}/enroll?enrolled=1`;
          }
        } else {
          const body = await res.json() as { error?: string };
          setError(body.error ?? 'Enrollment failed. Please try again.');
        }
      } else {
        // Paid — initiate Stripe Checkout
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId }),
        });

        if (res.status === 401) {
          window.location.href = `/auth/login?next=/courses/${courseSlug}`;
          return;
        }

        if (res.status === 409) {
          // Already enrolled
          window.location.href = `/courses/${courseSlug}/enroll?enrolled=1`;
          return;
        }

        if (res.ok) {
          const body = await res.json() as { url?: string };
          if (body.url) {
            window.location.href = body.url;
          } else {
            setError('Checkout unavailable. Please try again.');
          }
        } else {
          const body = await res.json() as { error?: string };
          setError(body.error ?? 'Checkout failed. Please try again.');
        }
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button
        onClick={handleClick}
        disabled={loading}
        data-testid="checkout-button"
        className={
          className ??
          'block w-full rounded-xl bg-violet-600 py-3 text-center text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity'
        }
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {isFree ? 'Enrolling…' : 'Redirecting to checkout…'}
          </span>
        ) : (
          isFree ? 'Enroll for free →' : `Enroll — ${priceDisplay} →`
        )}
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-600" data-testid="checkout-error">{error}</p>
      )}
    </div>
  );
}
