import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export default async function DashboardCoursesPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/dashboard/courses');

  const serviceSupa = createServiceClient();
  const { data: courses } = await serviceSupa
    .from('courses')
    .select('id, slug, title, published, price_cents, currency, version, updated_at, description')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false });

  const publishedCount = courses?.filter((c) => c.published).length ?? 0;
  const draftCount = (courses?.length ?? 0) - publishedCount;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
          {(courses?.length ?? 0) > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              {courses?.length} course{courses?.length !== 1 ? 's' : ''}
              {publishedCount > 0 && ` · ${publishedCount} published`}
              {draftCount > 0 && ` · ${draftCount} draft${draftCount !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/dashboard/new"
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors shadow-sm"
          >
            <span>+</span> Import from GitHub
          </a>
        </div>
      </div>

      {/* ── Empty State ─────────────────────────────────────────────────────── */}
      {!courses || courses.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-8 py-16 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100">
            <span className="text-3xl">📚</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No courses yet</h2>
          <p className="text-gray-500 mb-2 max-w-md mx-auto">
            Import any public GitHub repo that has a <code className="rounded bg-gray-100 px-1 text-xs font-mono">course.yml</code> and a <code className="rounded bg-gray-100 px-1 text-xs font-mono">lessons/</code> folder.
          </p>
          <p className="text-sm text-gray-400 mb-8">
            No GitHub repo yet?{' '}
            <a href="https://github.com/ErlisK/teachrepo-template" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline font-medium">
              Clone the template →
            </a>
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href="/dashboard/new"
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700 transition-colors shadow-sm"
            >
              Import your first course →
            </a>
            <a
              href="/docs/quickstart"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Read the 5-minute guide
            </a>
          </div>

          {/* Quick steps */}
          <div className="mt-12 grid gap-4 text-left sm:grid-cols-3 max-w-2xl mx-auto">
            {[
              { step: '1', icon: '📁', title: 'Create a repo', desc: 'Use our template or structure any repo with course.yml + lessons/' },
              { step: '2', icon: '⬆️', title: 'Paste the URL', desc: 'Enter the GitHub URL in the import form — no token needed for public repos' },
              { step: '3', icon: '💰', title: 'Publish & earn', desc: 'Set a price, publish, and share your course link. Stripe handles payments.' },
            ].map((s) => (
              <div key={s.step} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{s.step}</span>
                  <span className="text-lg">{s.icon}</span>
                </div>
                <p className="text-sm font-semibold text-gray-800 mb-1">{s.title}</p>
                <p className="text-xs text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ── Course List ──────────────────────────────────────────────────── */
        <div className="space-y-3">
          {courses.map((course) => {
            const updatedAt = new Date(course.updated_at);
            const daysAgo = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
            const updatedLabel = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo}d ago`;
            return (
              <a
                key={course.id}
                href={`/dashboard/courses/${course.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm hover:border-violet-300 hover:shadow-md transition-all group"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 group-hover:text-violet-700 transition-colors">
                      {course.title}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        course.published ? 'bg-green-100 text-green-700' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {course.published ? '● Published' : '○ Draft'}
                    </span>
                  </div>
                  {course.description && (
                    <p className="mt-0.5 text-xs text-gray-500 truncate max-w-lg">{course.description}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400 flex items-center gap-2 flex-wrap">
                    <code className="font-mono">/{course.slug}</code>
                    {course.version && <span>· v{course.version}</span>}
                    <span>·</span>
                    <span>{course.price_cents === 0 ? '🆓 Free' : `$${(course.price_cents / 100).toFixed(0)} ${(course.currency ?? 'USD').toUpperCase()}`}</span>
                    <span>·</span>
                    <span>Updated {updatedLabel}</span>
                  </p>
                </div>
                <span className="shrink-0 text-gray-300 group-hover:text-violet-400 transition-colors text-xl">›</span>
              </a>
            );
          })}

          {/* Nudge to publish drafts */}
          {draftCount > 0 && publishedCount === 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-3">
              <span>💡</span>
              <span>
                You have {draftCount} unpublished draft{draftCount > 1 ? 's' : ''}. Open a course and click <strong>Publish</strong> to make it available to buyers.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
