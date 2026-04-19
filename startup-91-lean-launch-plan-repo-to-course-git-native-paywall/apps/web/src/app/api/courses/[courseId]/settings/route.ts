/**
 * PATCH /api/courses/[courseId]/settings
 *
 * Updates premium course settings: affiliate_pct, marketplace_opt_in,
 * marketplace_priority, custom_domain.
 *
 * Plan enforcement:
 *   - affiliate_pct max: free=30, creator=50
 *   - marketplace_priority: creator only
 *   - custom_domain: creator only
 *   - marketplace_opt_in: available to all (but priority indexing is creator-only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveUser } from '@/lib/auth/resolve-user';
import { createServiceClient } from '@/lib/supabase/service';
import { getCreatorPlan } from '@/lib/subscription/server';

const Schema = z.object({
  affiliate_pct: z.number().int().min(0).max(50).optional(),
  marketplace_opt_in: z.boolean().optional(),
  marketplace_priority: z.boolean().optional(),
  custom_domain: z.string().max(253).optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const user = await resolveUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: unknown;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.errors }, { status: 400 });
    }

    const supa = createServiceClient();

    // Verify course ownership
    const { data: course } = await supa
      .from('courses')
      .select('id, creator_id')
      .eq('id', params.courseId)
      .eq('creator_id', user.id)
      .single();

    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    const plan = await getCreatorPlan(user.id);
    const isCreator = plan === 'creator';

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const warnings: string[] = [];

    // affiliate_pct — enforce per-plan max
    if (parsed.data.affiliate_pct !== undefined) {
      const maxPct = isCreator ? 50 : 30;
      const pct = Math.min(parsed.data.affiliate_pct, maxPct);
      if (pct < parsed.data.affiliate_pct) {
        warnings.push(`affiliate_pct capped at ${maxPct}% for your plan. Upgrade to Creator for up to 50%.`);
      }
      updates.affiliate_pct = pct;
    }

    // marketplace_opt_in — available to all plans
    if (parsed.data.marketplace_opt_in !== undefined) {
      updates.marketplace_opt_in = parsed.data.marketplace_opt_in;
    }

    // marketplace_priority — Creator only
    if (parsed.data.marketplace_priority !== undefined) {
      if (!isCreator && parsed.data.marketplace_priority === true) {
        warnings.push('marketplace_priority requires the Hosted Creator plan.');
        updates.marketplace_priority = false;
      } else {
        updates.marketplace_priority = parsed.data.marketplace_priority;
      }
    }

    // custom_domain — Creator only
    if (parsed.data.custom_domain !== undefined) {
      if (!isCreator && parsed.data.custom_domain) {
        return NextResponse.json({
          error: 'Custom domain requires the Hosted Creator plan.',
          upgradeUrl: '/pricing',
          plan,
        }, { status: 402 });
      }
      updates.custom_domain = parsed.data.custom_domain ?? null;
    }

    const { data: updated, error: updateErr } = await supa
      .from('courses')
      .update(updates)
      .eq('id', params.courseId)
      .select('id, affiliate_pct, marketplace_opt_in, marketplace_priority, custom_domain')
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ course: updated, warnings: warnings.length > 0 ? warnings : undefined });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  const user = await resolveUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supa = createServiceClient();
  const { data: course } = await supa
    .from('courses')
    .select('id, affiliate_pct, marketplace_opt_in, marketplace_priority, custom_domain')
    .eq('id', params.courseId)
    .eq('creator_id', user.id)
    .single();

  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const plan = await getCreatorPlan(user.id);
  const isCreator = plan === 'creator';

  return NextResponse.json({
    ...course,
    plan,
    limits: {
      max_affiliate_pct: isCreator ? 50 : 30,
      marketplace_priority_available: isCreator,
      custom_domain_available: isCreator,
    },
  });
}
