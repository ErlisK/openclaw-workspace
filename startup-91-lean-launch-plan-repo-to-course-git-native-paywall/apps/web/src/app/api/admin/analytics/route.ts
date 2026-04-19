/**
 * GET /api/admin/analytics
 *
 * Returns aggregated event stats for the admin analytics dashboard.
 * Protected — requires creator auth; returns only their own course events.
 *
 * Query params:
 *   days   — lookback window in days (default: 30)
 *   courseId — optional UUID to scope to one course
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(req: NextRequest) {
  // Auth
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(parseInt(searchParams.get('days') ?? '30', 10), 1), 365);
  const courseIdFilter = searchParams.get('courseId');

  const supa = createServiceClient();

  // Fetch creator's own course IDs for scoping
  const { data: courses } = await supa
    .from('courses')
    .select('id, slug, title')
    .eq('creator_id', user.id);

  const courseIds = (courses ?? []).map((c) => c.id);
  if (courseIds.length === 0) {
    return NextResponse.json({ totals: {}, daily: [], byEvent: [], topCourses: [] });
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Apply course filter
  let q = supa
    .from('events')
    .select('event_name, course_id, created_at')
    .gte('created_at', since)
    .in('course_id', courseIdFilter ? [courseIdFilter] : courseIds);

  const { data: events } = await q;
  const rows = events ?? [];

  // ── Aggregations ──────────────────────────────────────────────────────────

  // 1. Totals per event type
  const totalsMap: Record<string, number> = {};
  for (const row of rows) {
    totalsMap[row.event_name] = (totalsMap[row.event_name] ?? 0) + 1;
  }

  // 2. Daily counts for the last `days` days (all events combined)
  const dailyMap: Record<string, number> = {};
  for (const row of rows) {
    const day = row.created_at.slice(0, 10); // YYYY-MM-DD
    dailyMap[day] = (dailyMap[day] ?? 0) + 1;
  }
  // Fill in zeros for missing days
  const daily: Array<{ date: string; count: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    daily.push({ date: key, count: dailyMap[key] ?? 0 });
  }

  // 3. Events by name (sorted descending)
  const byEvent = Object.entries(totalsMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // 4. Top courses by event count
  const courseCountMap: Record<string, number> = {};
  for (const row of rows) {
    if (row.course_id) {
      courseCountMap[row.course_id] = (courseCountMap[row.course_id] ?? 0) + 1;
    }
  }
  const courseMap = Object.fromEntries((courses ?? []).map((c) => [c.id, c]));
  const topCourses = Object.entries(courseCountMap)
    .map(([id, count]) => ({ id, title: courseMap[id]?.title ?? id, slug: courseMap[id]?.slug ?? id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 5. Key funnel metrics
  const funnel = {
    lesson_views: totalsMap['lesson_viewed'] ?? 0,
    checkout_starts: totalsMap['checkout_started'] ?? 0,
    checkout_completions: totalsMap['checkout_completed'] ?? 0,
    quiz_submissions: totalsMap['quiz_submitted'] ?? 0,
    sandbox_views: totalsMap['sandbox_viewed'] ?? 0,
    signups: totalsMap['signup_completed'] ?? 0,
  };

  return NextResponse.json({
    days,
    total_events: rows.length,
    funnel,
    totals: totalsMap,
    daily,
    byEvent,
    topCourses,
    courses: courses ?? [],
  });
}
