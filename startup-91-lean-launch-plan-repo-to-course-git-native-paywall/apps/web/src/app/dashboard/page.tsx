import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';

export default async function DashboardPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/dashboard');

  const serviceSupa = createServiceClient();
  const { data: creator } = await serviceSupa
    .from('creators')
    .select('display_name, saas_tier')
    .eq('id', user.id)
    .single();

  const { data: courses } = await serviceSupa
    .from('courses')
    .select('id, slug, title, published, published_at, price_cents, currency, version, updated_at')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
      {/* Onboarding checklist — hides after dismissal (localStorage) */}
      <OnboardingChecklist />
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {creator?.display_name ? `Hey, ${creator.display_name} 👋` : 'Your Dashboard'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {user.email} · <span className="capitalize">{creator?.saas_tier ?? 'free'} plan</span>
          </p>
        </div>
        <div className="flex gap-3">
          <a href="/dashboard/analytics" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Analytics
          </a>
          <a href="/dashboard/billing" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Billing
          </a>
          <a href="/dashboard/settings" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Settings
          </a>
          <a href="/dashboard/new" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
            + New course
          </a>
        </div>
      </div>

      {/* Courses */}
      {(!courses || courses.length === 0) ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-20 text-center">
          <p className="text-4xl mb-4">📚</p>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No courses yet</h2>
          <p className="text-sm text-gray-500 mb-6">
            Import a GitHub repo with a <code className="rounded bg-gray-100 px-1 text-xs">course.yml</code> to publish your first course.
          </p>
          <a href="/dashboard/new" className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">
            Import a repo →
          </a>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <div key={c.id} className="group rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow flex flex-col gap-3">
              {/* Title + status */}
              <div className="flex items-start justify-between gap-2">
                <a href={`/dashboard/courses/${c.id}`} className="font-semibold text-gray-900 group-hover:text-violet-600 transition-colors line-clamp-2">
                  {c.title}
                </a>
                <span className={`ml-1 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  c.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {c.published ? '● Live' : '○ Draft'}
                </span>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {c.version && <span>v{c.version}</span>}
                <span>·</span>
                <span>{c.price_cents === 0 ? 'Free' : `$${(c.price_cents / 100).toFixed(0)} ${c.currency?.toUpperCase()}`}</span>
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-gray-100">
                <a
                  href={`/dashboard/courses/${c.id}`}
                  className="flex-1 rounded-md bg-gray-50 py-1.5 text-center text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Manage
                </a>
                <a
                  href={`/courses/${c.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-md border border-gray-200 py-1.5 text-center text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Preview ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
