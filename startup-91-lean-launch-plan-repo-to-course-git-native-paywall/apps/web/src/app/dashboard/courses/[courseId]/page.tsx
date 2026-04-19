import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { PublishToggle } from '@/components/dashboard/PublishToggle';
import { VersionBadge } from '@/components/dashboard/VersionBadge';
import { PricingForm } from '@/components/dashboard/PricingForm';

interface CourseDetailPageProps {
  params: { courseId: string };
}

export async function generateMetadata({ params }: CourseDetailPageProps): Promise<Metadata> {
  const supabase = createServerClient();
  const { data: course } = await supabase
    .from('courses')
    .select('title')
    .eq('id', params.courseId)
    .single();
  return {
    title: course ? `${course.title} — Dashboard | TeachRepo` : 'Course — Dashboard',
    robots: { index: false },
  };
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/dashboard');

  const serviceSupa = createServiceClient();

  // Fetch course (must be owned by this creator)
  const { data: course } = await serviceSupa
    .from('courses')
    .select(`
      id, slug, title, description, repo_url, default_branch,
      published, published_at, price_cents, currency, pricing_model,
      version, created_at, updated_at, creator_id
    `)
    .eq('id', params.courseId)
    .eq('creator_id', user.id)
    .single();

  if (!course) notFound();

  // Fetch lessons
  const { data: lessons } = await serviceSupa
    .from('lessons')
    .select('id, slug, title, order_index, is_preview, estimated_minutes, has_quiz')
    .eq('course_id', params.courseId)
    .order('order_index', { ascending: true });

  // Fetch recent import versions
  const { data: versions } = await serviceSupa
    .from('course_versions')
    .select('id, version_label, commit_sha, branch, tag, lesson_count, quiz_count, is_current, imported_at')
    .eq('course_id', params.courseId)
    .order('imported_at', { ascending: false })
    .limit(5);

  // Enrollment count
  const { count: enrollCount } = await serviceSupa
    .from('enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', params.courseId)
    .is('entitlement_revoked_at', null);

  const currentVersion = versions?.find((v) => v.is_current);
  const previewUrl = `/courses/${course.slug}`;
  const firstLesson = lessons?.[0];
  const priceLabel = course.price_cents === 0
    ? 'Free'
    : `$${(course.price_cents / 100).toFixed(0)} ${course.currency?.toUpperCase()}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">

      {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <a href="/dashboard" className="hover:text-violet-600">Dashboard</a>
        <span>›</span>
        <span className="text-gray-900 font-medium">{course.title}</span>
      </nav>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{course.title}</h1>
          {course.description && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{course.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
            <span>v{course.version ?? '—'}</span>
            <span>·</span>
            <span>{lessons?.length ?? 0} lessons</span>
            <span>·</span>
            <span>{enrollCount ?? 0} enrolled</span>
            <span>·</span>
            <span>{priceLabel}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <span>👁</span> Preview
          </a>
          <a
            href="/dashboard/new"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ↑ Re-import
          </a>
          <a
            href={`/dashboard/courses/${params.courseId}/versions`}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            🕑 History
          </a>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── Left column (2/3) ────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Publish card */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Visibility
            </h2>
            <PublishToggle
              courseId={params.courseId}
              initialPublished={course.published ?? false}
              initialPublishedAt={course.published_at}
            />
            {!course.published && (
              <p className="mt-3 text-xs text-gray-400">
                Publish to make this course discoverable on the{' '}
                <a href="/marketplace" className="text-violet-600 hover:underline">marketplace</a>.
                You can unpublish at any time — existing students keep access.
              </p>
            )}
            {course.published && (
              <div className="mt-4 flex items-center gap-2">
                <a
                  href={previewUrl}
                  className="text-xs text-violet-600 hover:underline"
                >
                  {`teachrepo.com${previewUrl}`} ↗
                </a>
              </div>
            )}
          </section>

          {/* Lessons list */}
          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                Lessons ({lessons?.length ?? 0})
              </h2>
              {firstLesson && (
                <a
                  href={`/courses/${course.slug}/lessons/${firstLesson.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-violet-600 hover:underline"
                >
                  Preview first lesson ↗
                </a>
              )}
            </div>

            {!lessons || lessons.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-gray-500">
                  No lessons yet.{' '}
                  <a href="/dashboard/new" className="text-violet-600 hover:underline">
                    Import a repo
                  </a>{' '}
                  to add content.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {lessons.map((lesson, i) => (
                  <div key={lesson.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <a
                        href={`/courses/${course.slug}/lessons/${lesson.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-gray-800 hover:text-violet-600 truncate block"
                      >
                        {lesson.title}
                      </a>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2 text-xs text-gray-400">
                      {lesson.has_quiz && <span title="Has quiz">🧪</span>}
                      {lesson.estimated_minutes && <span>{lesson.estimated_minutes}m</span>}
                      {lesson.is_preview ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700 font-medium">Free</span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">Paid</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── Right column (1/3) ───────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Pricing card */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" data-testid="pricing-card">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Pricing
            </h2>
            <PricingForm
              courseId={params.courseId}
              initialPriceCents={course.price_cents}
              initialCurrency={course.currency ?? 'usd'}
              initialStripeProductId={course.stripe_product_id}
              initialStripePriceId={course.stripe_price_id}
            />
          </section>

          {/* Current version card */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Current version
            </h2>
            {currentVersion ? (
              <div className="space-y-3">
                <VersionBadge
                  label={currentVersion.version_label}
                  commitSha={currentVersion.commit_sha}
                  branch={currentVersion.branch}
                  tag={currentVersion.tag}
                  repoUrl={course.repo_url ?? undefined}
                  size="sm"
                />
                <div className="text-xs text-gray-500 space-y-1">
                  <div>{currentVersion.lesson_count} lessons · {currentVersion.quiz_count} quizzes</div>
                  <div>Imported {formatRelDate(currentVersion.imported_at)}</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Not yet imported</p>
            )}
            <div className="mt-4 flex flex-col gap-2">
              <a
                href={`/dashboard/courses/${params.courseId}/versions`}
                className="block w-full rounded-lg border border-gray-200 py-2 text-center text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                View all versions
              </a>
              <a
                href="/dashboard/new"
                className="block w-full rounded-lg bg-violet-600 py-2 text-center text-xs font-semibold text-white hover:bg-violet-700"
              >
                ↑ Import new version
              </a>
            </div>
          </section>

          {/* Repo card */}
          {course.repo_url && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                Source repo
              </h2>
              <a
                href={course.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-mono text-violet-600 hover:underline break-all"
              >
                <span>⎇</span>
                <span>{course.repo_url.replace('https://github.com/', '')}</span>
              </a>
              {course.default_branch && (
                <p className="mt-1 text-xs text-gray-400">
                  Default branch: <code className="font-mono">{course.default_branch}</code>
                </p>
              )}
            </section>
          )}

          {/* Stats card */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Stats
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gray-50 p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{enrollCount ?? 0}</p>
                <p className="text-xs text-gray-500 mt-0.5">enrolled</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{lessons?.length ?? 0}</p>
                <p className="text-xs text-gray-500 mt-0.5">lessons</p>
              </div>
            </div>
          </section>

          {/* Danger zone */}
          <section className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-red-400">
              Danger zone
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Deleting a course is permanent and cannot be undone.
              All lessons and quiz data will be removed.
            </p>
            <button
              disabled
              title="Contact support to delete a course"
              className="w-full rounded-lg border border-red-200 py-2 text-xs font-medium text-red-400 cursor-not-allowed opacity-60"
            >
              Delete course (contact support)
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

function formatRelDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
