import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * GET /api/affiliates
 *
 * Returns the authenticated user's affiliate stats and referral link base URL.
 * Creates an affiliate profile if one doesn't exist yet.
 */
export async function GET(_req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceSupa = createServiceClient();

  // Fetch referral conversions for this user
  const { data: referrals } = await serviceSupa
    .from('referrals')
    .select(`
      id, course_id, purchase_id, converted_at,
      purchases(amount_cents, currency)
    `)
    .eq('affiliate_id', user.id);

  const totalConversions = referrals?.length ?? 0;
  const totalRevenueCents = referrals?.reduce((sum, r) => {
    const purchase = Array.isArray(r.purchases) ? r.purchases[0] : r.purchases;
    return sum + (purchase?.amount_cents ?? 0);
  }, 0) ?? 0;

  // Get courses created by this user that have affiliate_pct set
  const { data: courses } = await serviceSupa
    .from('courses')
    .select('id, slug, title, affiliate_pct, price_cents')
    .eq('creator_id', user.id)
    .eq('published', true)
    .gt('price_cents', 0);

  return NextResponse.json({
    affiliateId: user.id,
    referralBaseUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://teachrepo.com'}/courses`,
    stats: {
      totalConversions,
      totalRevenueCents,
      totalRevenueDisplay: `$${(totalRevenueCents / 100).toFixed(2)}`,
    },
    courses: (courses ?? []).map((c) => ({
      courseId: c.id,
      courseSlug: c.slug,
      title: c.title,
      affiliatePct: c.affiliate_pct ?? 0,
      referralUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://teachrepo.com'}/courses/${c.slug}?ref=${user.id}`,
    })),
  });
}

/**
 * POST /api/affiliates/links
 *
 * Generate a referral link for a specific course.
 * Any authenticated user can generate a referral link for any published paid course.
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

  const supabase = createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { courseSlug } = parsed.data;
  const serviceSupa = createServiceClient();

  const { data: course } = await serviceSupa
    .from('courses')
    .select('id, slug, title, price_cents, affiliate_pct, published')
    .eq('slug', courseSlug)
    .single();

  if (!course || !course.published) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://teachrepo.com';
  const referralUrl = `${appUrl}/courses/${courseSlug}?ref=${user.id}`;

  return NextResponse.json({
    affiliateId: user.id,
    courseSlug,
    courseTitle: course.title,
    affiliatePct: course.affiliate_pct ?? 0,
    referralUrl,
    commissionDisplay:
      course.affiliate_pct
        ? `${course.affiliate_pct}% of $${(course.price_cents / 100).toFixed(0)}`
        : 'No commission configured',
  });
}
