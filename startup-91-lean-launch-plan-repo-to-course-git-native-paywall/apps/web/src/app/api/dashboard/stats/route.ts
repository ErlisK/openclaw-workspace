import { NextRequest, NextResponse } from 'next/server';
import { resolveUser } from '@/lib/auth/resolve-user';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/stats
 *
 * Returns aggregated creator stats for the authenticated user:
 * - Number of courses they created
 * - Total enrollments across all their courses
 * - Total revenue (sum of purchases amount_cents)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supa = createServiceClient();

    // Fetch courses created by this user
    const { data: courses, error: coursesError } = await supa
      .from('courses')
      .select('id')
      .eq('creator_id', user.id);

    if (coursesError) {
      console.error('[dashboard/stats] courses error:', coursesError.message);
      return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
    }

    const courseIds = (courses ?? []).map((c) => c.id);
    const courseCount = courseIds.length;

    let enrollments = 0;
    let revenueCents = 0;
    const currency = 'USD';

    if (courseIds.length > 0) {
      // Count enrollments
      const { count: enrollCount, error: enrollError } = await supa
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .in('course_id', courseIds);

      if (enrollError) {
        console.error('[dashboard/stats] enrollments error:', enrollError.message);
      } else {
        enrollments = enrollCount ?? 0;
      }

      // Sum purchases revenue
      const { data: purchases, error: purchasesError } = await supa
        .from('purchases')
        .select('amount_cents')
        .in('course_id', courseIds);

      if (purchasesError) {
        console.error('[dashboard/stats] purchases error:', purchasesError.message);
      } else {
        revenueCents = (purchases ?? []).reduce((sum, p) => sum + (p.amount_cents ?? 0), 0);
      }
    }

    const revenueUSD = parseFloat((revenueCents / 100).toFixed(2));
    return NextResponse.json(
      { courseCount, enrollments, revenueCents, revenueUSD, currency },
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('[dashboard/stats] unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
