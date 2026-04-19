import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import AnalyticsDashboardClient from './AnalyticsDashboardClient';

export const metadata: Metadata = {
  title: 'Analytics — TeachRepo',
  description: 'First-party analytics for your courses',
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { days?: string; courseId?: string };
}) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/dashboard/analytics');

  const days = Math.min(Math.max(parseInt(searchParams.days ?? '30', 10), 1), 365);
  const courseIdParam = searchParams.courseId ?? '';

  // Fetch analytics from our admin API
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://teachrepo.com';
  const url = `${baseUrl}/api/admin/analytics?days=${days}${courseIdParam ? `&courseId=${courseIdParam}` : ''}`;

  // Server-side fetch using the service role key for authorization
  // (The API route checks user auth via server-side supabase; here we pass the cookie)
  const res = await fetch(url, {
    headers: { Cookie: `sb-zkwyfjrgmvpgfbaqwxsb-auth-token=placeholder` },
    cache: 'no-store',
  }).catch(() => null);

  // Fallback: query directly if the HTTP fetch won't work during SSR
  const { createServiceClient } = await import('@/lib/supabase/service');
  const supa = createServiceClient();

  const { data: courses } = await supa
    .from('courses')
    .select('id, slug, title')
    .eq('creator_id', user.id);

  const courseIds = (courses ?? []).map((c) => c.id);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let events: Array<{ event_name: string; course_id: string | null; created_at: string }> = [];
  if (courseIds.length > 0) {
    const q = courseIdParam
      ? supa.from('events').select('event_name, course_id, created_at').gte('created_at', since).eq('course_id', courseIdParam)
      : supa.from('events').select('event_name, course_id, created_at').gte('created_at', since).in('course_id', courseIds);
    const { data } = await q;
    events = data ?? [];
  }

  // Aggregations
  const totals: Record<string, number> = {};
  for (const e of events) {
    totals[e.event_name] = (totals[e.event_name] ?? 0) + 1;
  }

  const dailyMap: Record<string, number> = {};
  for (const e of events) {
    const day = e.created_at.slice(0, 10);
    dailyMap[day] = (dailyMap[day] ?? 0) + 1;
  }
  const daily = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    return { date: key, count: dailyMap[key] ?? 0 };
  });

  const byEvent = Object.entries(totals)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const courseCountMap: Record<string, number> = {};
  for (const e of events) {
    if (e.course_id) courseCountMap[e.course_id] = (courseCountMap[e.course_id] ?? 0) + 1;
  }
  const courseMap = Object.fromEntries((courses ?? []).map((c) => [c.id, c]));
  const topCourses = Object.entries(courseCountMap)
    .map(([id, count]) => ({ id, title: courseMap[id]?.title ?? id, slug: courseMap[id]?.slug ?? id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const funnel = {
    signups: totals['signup_completed'] ?? 0,
    lesson_views: totals['lesson_viewed'] ?? 0,
    checkout_starts: totals['checkout_started'] ?? 0,
    checkout_completions: totals['checkout_completed'] ?? 0,
    quiz_submissions: totals['quiz_submitted'] ?? 0,
    sandbox_views: totals['sandbox_viewed'] ?? 0,
  };

  return (
    <AnalyticsDashboardClient
      days={days}
      totalEvents={events.length}
      funnel={funnel}
      daily={daily}
      byEvent={byEvent}
      topCourses={topCourses}
      courses={courses ?? []}
    />
  );
}
