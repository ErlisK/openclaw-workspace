/**
 * GET /api/admin/funnel
 *
 * Returns the 6-step creator conversion funnel with counts, rates, and drop-offs.
 *
 * Funnel steps:
 *   1. signup_completed       — user signed up
 *   2. repo_import_started    — user started an import
 *   3. repo_import_completed  — import finished successfully
 *   4. course_published       — creator published their course
 *   5. checkout_started       — a buyer started checkout
 *   6. checkout_completed     — purchase completed
 *
 * Query params:
 *   days      — lookback window (default: 30, max: 365)
 *   courseId  — optional UUID to scope buyer steps to one course
 *   global    — if "1", admin-only: returns site-wide funnel (not scoped to creator)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export interface FunnelStep {
  step: number;
  name: string;
  event: string;
  count: number;
  /** Conversion from previous step (null for step 1) */
  rate: number | null;
  /** Users who dropped off before this step */
  drop_off: number | null;
}

export interface FunnelResponse {
  days: number;
  since: string;
  scoped_to: 'creator' | 'global';
  steps: FunnelStep[];
  /** Overall funnel conversion: step 1 → step 6 */
  overall_conversion: number | null;
  /** Bottleneck: step with lowest rate */
  bottleneck_step: number | null;
}

const FUNNEL_STEPS = [
  { step: 1, name: 'Signup',            event: 'signup_completed' },
  { step: 2, name: 'Import Started',    event: 'repo_import_started' },
  { step: 3, name: 'Import Completed',  event: 'repo_import_completed' },
  { step: 4, name: 'Course Published',  event: 'course_published' },
  { step: 5, name: 'Checkout Started',  event: 'checkout_started' },
  { step: 6, name: 'Checkout Completed',event: 'checkout_completed' },
] as const;

export async function GET(req: NextRequest) {
  // Auth
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(parseInt(searchParams.get('days') ?? '30', 10), 1), 365);
  const courseIdFilter = searchParams.get('courseId') ?? null;

  const supa = createServiceClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Fetch creator's courses for scoping buyer-side steps
  const { data: courses } = await supa
    .from('courses')
    .select('id')
    .eq('creator_id', user.id);

  const creatorCourseIds = (courses ?? []).map((c) => c.id);

  // ── Query each funnel step ────────────────────────────────────────────────
  //
  // Steps 1–4 are creator-side: scope by user_id
  // Steps 5–6 are buyer-side: scope by course_id (courses owned by this creator)

  const counts: number[] = [];

  for (const step of FUNNEL_STEPS) {
    let q = supa
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('event_name', step.event)
      .gte('created_at', since);

    if (step.step <= 4) {
      // Creator actions: scoped to this user
      q = q.eq('user_id', user.id);
    } else {
      // Buyer actions: scoped to courses owned by this creator
      if (creatorCourseIds.length === 0) {
        counts.push(0);
        continue;
      }
      if (courseIdFilter) {
        q = q.eq('course_id', courseIdFilter);
      } else {
        q = q.in('course_id', creatorCourseIds);
      }
    }

    const { count, error } = await q;
    counts.push(error ? 0 : (count ?? 0));
  }

  // ── Compute rates and drop-offs ───────────────────────────────────────────
  const steps: FunnelStep[] = FUNNEL_STEPS.map((def, i) => {
    const count = counts[i];
    const prev = i === 0 ? null : counts[i - 1];
    const rate = prev === null ? null : prev === 0 ? 0 : Math.round((count / prev) * 1000) / 10;
    const drop_off = prev === null ? null : prev - count;
    return { ...def, count, rate, drop_off };
  });

  const first = steps[0].count;
  const last = steps[steps.length - 1].count;
  const overall_conversion = first === 0 ? null : Math.round((last / first) * 1000) / 10;

  // Bottleneck = step with lowest conversion rate (excluding step 1)
  const ratedSteps = steps.slice(1).filter((s) => s.rate !== null);
  const bottleneck = ratedSteps.reduce<FunnelStep | null>(
    (min, s) => (!min || (s.rate ?? Infinity) < (min.rate ?? Infinity)) ? s : min,
    null,
  );

  return NextResponse.json({
    days,
    since,
    scoped_to: 'creator' as const,
    steps,
    overall_conversion,
    bottleneck_step: bottleneck?.step ?? null,
  } satisfies FunnelResponse);
}
