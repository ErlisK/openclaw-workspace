import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';
import { PlanBadge } from '@/components/dashboard/PlanBadge';
import { getCreatorPlan } from '@/lib/subscription/server';
import { PLANS } from '@/lib/subscription/plans';

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

  const creatorPlan = await getCreatorPlan(user.id);
  const planLimits = PLANS[creatorPlan].limits;

  const { data: courses } = await serviceSupa
    .from('courses')
    .select('id, slug, title, published, published_at, price_cents, currency, version, updated_at')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2.5 font-bold">
            <span className="text-xl">📚</span>
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent text-lg">TeachRepo</span>
          </a>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-gray-400">
            <a href="/dashboard" className="text-white font-medium">Dashboard</a>
            <a href="/dashboard/analytics" className="hover:text-white transition-colors">Analytics</a>
            <a href="/dashboard/billing" className="hover:text-white transition-colors">Billing</a>
            <a href="/dashboard/settings" className="hover:text-white transition-colors">Settings</a>
          </nav>
          <a href="/dashboard/new" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition-all">
            + New course
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
        {/* Onboarding checklist — hides after dismissal (localStorage) */}
        <OnboardingChecklist />

        {/* Header */}
        <div className="mb-10 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {creator?.display_name ? `Hey, ${creator.display_name} 👋` : 'Your Dashboard'}
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              {user.email} · <PlanBadge plan={creatorPlan} showUpgrade={creatorPlan === 'free'} size="xs" />
            </p>
          </div>
          <div className="flex gap-2">
            <a href="/dashboard/analytics" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-all">
              Analytics
            </a>
            <a href="/dashboard/billing" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-all">
              Billing
            </a>
            <a href="/dashboard/settings" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-all">
              Settings
            </a>
          </div>
        </div>

        {/* Plan limit notice */}
        {creatorPlan === 'free' && courses && planLimits.maxCourses !== null && courses.length >= planLimits.maxCourses - 1 && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm" data-testid="plan-limit-notice">
            <span className="text-amber-300">
              {courses.length >= planLimits.maxCourses
                ? `Free plan limit reached: ${planLimits.maxCourses} courses max.`
                : `You're almost at the Free plan limit (${courses.length}/${planLimits.maxCourses} courses).`}
            </span>
            <a href="/pricing" className="ml-4 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-400 transition-colors">
              Upgrade →
            </a>
          </div>
        )}

        {/* Courses */}
        {(!courses || courses.length === 0) ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-24 text-center">
            <p className="text-5xl mb-4">📚</p>
            <h2 className="text-lg font-semibold text-white mb-2">No courses yet</h2>
            <p className="text-sm text-gray-400 mb-8">
              Import a GitHub repo with a <code className="rounded bg-white/10 border border-white/10 px-1.5 py-0.5 text-xs font-mono text-violet-300">course.yml</code> to publish your first course.
            </p>
            <a href="/dashboard/new" className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500 transition-all">
              Import a repo →
            </a>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <div key={c.id} className="group rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-violet-500/30 hover:bg-white/[0.08] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-900/20 flex flex-col gap-3">
                {/* Title + status */}
                <div className="flex items-start justify-between gap-2">
                  <a href={`/dashboard/courses/${c.id}`} className="font-semibold text-white group-hover:text-violet-300 transition-colors line-clamp-2">
                    {c.title}
                  </a>
                  <span className={`ml-1 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium border ${
                    c.published
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-white/10 text-gray-400 border-white/10'
                  }`}>
                    {c.published ? '● Live' : '○ Draft'}
                  </span>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {c.version && <span className="font-mono">v{c.version}</span>}
                  {c.version && <span>·</span>}
                  <span>{c.price_cents === 0 ? 'Free' : `$${(c.price_cents / 100).toFixed(0)} ${c.currency?.toUpperCase()}`}</span>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-2 mt-auto pt-3 border-t border-white/5">
                  <a
                    href={`/dashboard/courses/${c.id}`}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 py-1.5 text-center text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-all"
                  >
                    Manage
                  </a>
                  <a
                    href={`/courses/${c.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-lg border border-violet-500/20 bg-violet-500/10 py-1.5 text-center text-xs font-medium text-violet-400 hover:bg-violet-500/20 hover:text-violet-300 transition-all"
                  >
                    Preview ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
