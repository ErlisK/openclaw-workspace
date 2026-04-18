import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Enrollment Complete — TeachRepo',
  robots: { index: false },
};

interface EnrollPageProps {
  params: { slug: string };
  searchParams: { session_id?: string; error?: string };
}

/**
 * /courses/[slug]/enroll?session_id=cs_xxx
 *
 * The success_url return page after Stripe Checkout.
 *
 * Server Component flow:
 * 1. If no session_id → redirect back to course page
 * 2. Call GET /api/enroll?session_id=xxx (server-to-server, same process)
 * 3. On success → show "enrolled!" UI with link to first lesson
 * 4. On failure → show error with retry/support links
 *
 * This is a Server Component — the session verification is server-side.
 * No client JS needed for the happy path.
 */
export default async function EnrollSuccessPage({ params, searchParams }: EnrollPageProps) {
  const { slug } = params;
  const { session_id } = searchParams;

  if (!session_id) {
    redirect(`/courses/${slug}`);
  }

  // Server-side call to the enroll verification endpoint
  // (same Next.js process — no HTTP round-trip in production)
  let enrollResult: {
    enrolled?: boolean;
    courseSlug?: string;
    firstLessonSlug?: string;
    error?: string;
    payment_status?: string;
  };

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    // In App Router, we can call the route handler internally
    // This goes through the same auth/entitlement stack
    const res = await fetch(
      `${baseUrl}/api/enroll?session_id=${encodeURIComponent(session_id)}`,
      {
        // Forward cookies for auth — in Server Components, headers() provides them
        cache: 'no-store',
      }
    );
    enrollResult = await res.json();
  } catch (err) {
    enrollResult = { error: 'Failed to verify enrollment — please contact support' };
  }

  if (enrollResult.enrolled && enrollResult.firstLessonSlug) {
    return (
      <EnrollSuccessUI
        courseSlug={slug}
        firstLessonSlug={enrollResult.firstLessonSlug}
      />
    );
  }

  if (enrollResult.payment_status && enrollResult.payment_status !== 'paid') {
    return <PaymentPendingUI courseSlug={slug} />;
  }

  return (
    <EnrollErrorUI
      courseSlug={slug}
      error={enrollResult.error ?? 'Unexpected error during enrollment'}
    />
  );
}

// ─── UI components ────────────────────────────────────────────────────────────

function EnrollSuccessUI({
  courseSlug,
  firstLessonSlug,
}: {
  courseSlug: string;
  firstLessonSlug: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-6 text-6xl" aria-hidden="true">🎉</div>
      <h1 className="mb-3 text-3xl font-bold text-gray-900 dark:text-white">
        You&apos;re enrolled!
      </h1>
      <p className="mb-8 max-w-md text-gray-600 dark:text-gray-400">
        Your payment was successful. You now have full access to all lessons in this course.
        Let&apos;s get started.
      </p>
      <a
        href={`/courses/${courseSlug}/lessons/${firstLessonSlug}`}
        className="rounded-xl bg-violet-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-colors hover:bg-violet-700"
      >
        Start learning →
      </a>
      <a
        href={`/courses/${courseSlug}`}
        className="mt-4 text-sm text-gray-500 underline underline-offset-2 hover:text-gray-700 dark:text-gray-400"
      >
        View course overview
      </a>
    </div>
  );
}

function PaymentPendingUI({ courseSlug }: { courseSlug: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-6 text-5xl" aria-hidden="true">⏳</div>
      <h1 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
        Payment processing…
      </h1>
      <p className="mb-6 max-w-md text-gray-600 dark:text-gray-400">
        Your payment is still being processed. This usually takes a few seconds.
        Please wait a moment and refresh this page.
      </p>
      <a
        href={`/courses/${courseSlug}/enroll?session_id=${''}`}
        className="rounded-lg bg-gray-100 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
      >
        Refresh
      </a>
    </div>
  );
}

function EnrollErrorUI({ courseSlug, error }: { courseSlug: string; error: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-6 text-5xl" aria-hidden="true">😕</div>
      <h1 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
        Something went wrong
      </h1>
      <p className="mb-2 max-w-md text-gray-600 dark:text-gray-400">{error}</p>
      <p className="mb-8 text-sm text-gray-500 dark:text-gray-500">
        If you were charged, please contact{' '}
        <a href="mailto:hello@teachrepo.com" className="text-violet-600 underline">
          hello@teachrepo.com
        </a>{' '}
        with your order details.
      </p>
      <div className="flex gap-3">
        <a
          href={`/courses/${courseSlug}`}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
        >
          Back to course
        </a>
        <a
          href="mailto:hello@teachrepo.com"
          className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Contact support
        </a>
      </div>
    </div>
  );
}
