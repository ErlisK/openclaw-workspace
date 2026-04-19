import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveUser } from '@/lib/auth/resolve-user';
import { createServiceClient } from '@/lib/supabase/service';
import { getBaseUrl } from '@/utils/url';

/**
 * GET /api/affiliates
 *
 * Returns the authenticated user's affiliate stats and referral links
 * for their published paid courses.
 */
export async function GET(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceSupa = createServiceClient();

  // Fetch affiliate records for this user
  const { data: affiliateRecords } = await serviceSupa
    .from('affiliates')
    .select('id, course_id, total_conversions, total_earned_cents, commission_pct, code')
    .eq('affiliate_user_id', user.id);

  const totalConversions = affiliateRecords?.reduce((s, a) => s + (a.total_conversions ?? 0), 0) ?? 0;
  const totalRevenueCents = affiliateRecords?.reduce((s, a) => s + (a.total_earned_cents ?? 0), 0) ?? 0;

  // Get courses created by this user that have a price
  const { data: courses } = await serviceSupa
    .from('courses')
    .select('id, slug, title, affiliate_pct, price_cents, creator_id')
    .eq('creator_id', user.id)
    .eq('published', true)
    .gt('price_cents', 0);

  const appUrl = getBaseUrl();

  // Map affiliate records to course data + referral URLs
  const affiliateLinks = affiliateRecords?.map((a) => {
    const course = courses?.find((c) => c.id === a.course_id);
    return {
      affiliateRecordId: a.id,
      code: a.code,
      courseId: a.course_id,
      courseSlug: course?.slug ?? null,
      title: course?.title ?? null,
      commissionPct: a.commission_pct,
      totalConversions: a.total_conversions ?? 0,
      totalEarnedCents: a.total_earned_cents ?? 0,
      referralUrl: course ? `${appUrl}/courses/${course.slug}?ref=${a.code}` : null,
    };
  }) ?? [];

  return NextResponse.json({
    affiliateId: user.id,
    referralBaseUrl: `${appUrl}/courses`,
    stats: {
      totalConversions,
      totalRevenueCents,
      totalRevenueDisplay: `$${(totalRevenueCents / 100).toFixed(2)}`,
    },
    affiliateLinks,
    // Legacy: courses the user created (for display)
    courses: (courses ?? []).map((c) => {
      const aff = affiliateRecords?.find((a) => a.course_id === c.id);
      return {
        courseId: c.id,
        courseSlug: c.slug,
        title: c.title,
        affiliatePct: c.affiliate_pct ?? 0,
        code: aff?.code ?? null,
        referralUrl: aff ? `${appUrl}/courses/${c.slug}?ref=${aff.code}` : `${appUrl}/courses/${c.slug}?ref=${user.id}`,
      };
    }),
  });
}

/**
 * POST /api/affiliates
 *
 * Generate (or return existing) affiliate link for a specific course.
 * Creates an affiliates row if one doesn't exist for this user+course.
 *
 * The affiliate code is stored in the `affiliates.code` column.
 * The ?ref=<code> cookie is set by middleware for 30 days.
 * On purchase, the checkout route resolves affiliates.id from the code.
 *
 * Body: { courseSlug: string }
 * Returns: { affiliateRecordId, code, referralUrl, affiliatePct, commissionDisplay }
 */
const LinksSchema = z.object({
  courseSlug: z.string().min(1),
});

export async function POST(req: NextRequest) {
  // Validate before auth
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = LinksSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.errors }, { status: 400 });
  }

  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { courseSlug } = parsed.data;
  const serviceSupa = createServiceClient();

  const { data: course } = await serviceSupa
    .from('courses')
    .select('id, slug, title, price_cents, affiliate_pct, published, creator_id')
    .eq('slug', courseSlug)
    .single();

  if (!course || !course.published) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  if (course.price_cents === 0) {
    return NextResponse.json({ error: 'Free courses do not have affiliate programs' }, { status: 400 });
  }

  // Find or create affiliate record for this user + course
  const { data: existing } = await serviceSupa
    .from('affiliates')
    .select('id, code, commission_pct')
    .eq('affiliate_user_id', user.id)
    .eq('course_id', course.id)
    .maybeSingle();

  let affiliateRecordId: string;
  let code: string;
  let commissionPct: number;

  if (existing) {
    affiliateRecordId = existing.id;
    code = existing.code;
    commissionPct = existing.commission_pct;
  } else {
    // Generate a short readable code: first 8 chars of user.id + course slug prefix
    code = `${user.id.replace(/-/g, '').slice(0, 8)}-${courseSlug.slice(0, 8)}`;

    const { data: created, error: createError } = await serviceSupa
      .from('affiliates')
      .insert({
        affiliate_user_id: user.id,
        creator_id: course.creator_id,
        course_id: course.id,
        code,
        commission_pct: course.affiliate_pct ?? 20,
        cookie_days: 30,
        is_active: true,
      })
      .select('id, code, commission_pct')
      .single();

    if (createError || !created) {
      return NextResponse.json({ error: 'Failed to create affiliate link' }, { status: 500 });
    }
    affiliateRecordId = created.id;
    code = created.code;
    commissionPct = created.commission_pct;
  }

  const appUrl = getBaseUrl();
  const referralUrl = `${appUrl}/courses/${courseSlug}?ref=${code}`;

  return NextResponse.json({
    affiliateRecordId,
    code,
    courseSlug,
    courseTitle: course.title,
    affiliatePct: commissionPct,
    referralUrl,
    commissionDisplay: `${commissionPct}% of $${(course.price_cents / 100).toFixed(0)}`,
  });
}
