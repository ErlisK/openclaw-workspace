/**
 * GET /api/scide/metrics
 *
 * Internal metrics endpoint for business monitoring.
 * Protected by Bearer token (SCIDE_METRICS_TOKEN env var).
 *
 * Returns:
 *   ok: true
 *   metrics: {
 *     total_users          — all non-test auth users
 *     new_signups_24h      — users created in last 24h
 *     new_signups_7d       — users created in last 7 days
 *     new_signups_30d      — users created in last 30 days
 *     monthly_revenue      — succeeded Stripe charges this calendar month (USD)
 *     yearly_revenue       — monthly_revenue * 12
 *     active_subscriptions — active Stripe subscriptions count
 *     total_courses        — published courses
 *     total_enrollments    — total enrollments (non-test users only)
 *   }
 *
 * Test accounts excluded: emails matching test-*, e2e-*, playwright-*,
 * or from domains example.com, test.com, mailinator.com.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import Stripe from 'stripe';

const TEST_EMAIL_PREFIXES = ['test-', 'e2e-', 'playwright-'];
const TEST_EMAIL_DOMAINS = ['example.com', 'test.com', 'mailinator.com', 'example.org'];

function isTestEmail(email: string): boolean {
  const lower = email.toLowerCase();
  const domain = lower.split('@')[1] ?? '';
  if (TEST_EMAIL_DOMAINS.includes(domain)) return true;
  const local = lower.split('@')[0] ?? '';
  return TEST_EMAIL_PREFIXES.some((p) => local.startsWith(p));
}

export async function GET(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const expectedToken = process.env.SCIDE_METRICS_TOKEN;

  if (!token || !expectedToken || token !== expectedToken) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const metrics: Record<string, number | null> = {
    total_users: null,
    new_signups_24h: null,
    new_signups_7d: null,
    new_signups_30d: null,
    monthly_revenue: null,
    yearly_revenue: null,
    active_subscriptions: null,
    total_courses: null,
    total_enrollments: null,
  };

  // ── Supabase: user counts ──────────────────────────────────────────────────
  try {
    const supa = createServiceClient();

    // Fetch all users via auth admin API — paginate to handle > 1000 users
    const allUsers: { id?: string; email?: string; created_at?: string }[] = [];
    let page = 1;
    while (true) {
      const { data: usersData } = await supa.auth.admin.listUsers({ perPage: 1000, page });
      const batch = usersData?.users ?? [];
      allUsers.push(...batch);
      if (batch.length < 1000) break;
      page++;
    }
    const realUsers = allUsers.filter((u) => !isTestEmail(u.email ?? ''));
    metrics.total_users = realUsers.length;

    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const cutoff7d  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString();
    const cutoff30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    metrics.new_signups_24h = realUsers.filter((u) => u.created_at && u.created_at >= cutoff24h).length;
    metrics.new_signups_7d  = realUsers.filter((u) => u.created_at && u.created_at >= cutoff7d).length;
    metrics.new_signups_30d = realUsers.filter((u) => u.created_at && u.created_at >= cutoff30d).length;

    // Total published courses
    const { count: courseCount } = await supa
      .from('courses')
      .select('id', { count: 'exact', head: true })
      .eq('published', true);
    metrics.total_courses = courseCount ?? null;

    // Total enrollments — exclude test users by joining through profiles
    // (profiles.id matches auth.users.id; test users simply won't have enrollments
    // but we also double-filter by cross-referencing the real user id set)
    const realUserIds = new Set(realUsers.map((u) => u.id).filter(Boolean));
    const { data: enrollData } = await supa
      .from('enrollments')
      .select('user_id');
    metrics.total_enrollments = enrollData
      ? enrollData.filter((e) => realUserIds.has(e.user_id)).length
      : null;
  } catch (_e) {
    // Supabase metrics remain null on error
  }

  // ── Stripe: revenue ────────────────────────────────────────────────────────
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    try {
      const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' as Stripe.LatestApiVersion });

      // Month start timestamp
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthStartTs = Math.floor(monthStart.getTime() / 1000);

      // Fetch succeeded charges this month (up to 100)
      const charges = await stripe.charges.list({
        created: { gte: monthStartTs },
        limit: 100,
      });

      const monthlyRevenueCents = (charges.data ?? [])
        .filter((c) => c.status === 'succeeded' && !c.refunded)
        .reduce((sum, c) => sum + c.amount, 0);

      metrics.monthly_revenue = parseFloat((monthlyRevenueCents / 100).toFixed(2));
      metrics.yearly_revenue = parseFloat((metrics.monthly_revenue * 12).toFixed(2));

      // Active subscriptions
      const subs = await stripe.subscriptions.list({ status: 'active', limit: 100 });
      metrics.active_subscriptions = subs.data.length;
    } catch (_e) {
      // Stripe metrics remain null on error
    }
  }

  return NextResponse.json({ ok: true, metrics });
}
