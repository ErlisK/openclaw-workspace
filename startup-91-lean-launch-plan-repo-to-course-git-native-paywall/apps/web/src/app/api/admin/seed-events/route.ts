/**
 * POST /api/admin/seed-events
 *
 * Seeds synthetic funnel events for testing/validation.
 * ONLY works when NODE_ENV !== 'production' or when SEED_ALLOWED=1 is set.
 *
 * Body: { scenario: 'full_funnel' | 'partial' | 'clear', count?: number }
 *
 * Returns: { seeded: Record<string, number>, total: number }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

const FUNNEL_EVENTS = [
  'signup_completed',
  'repo_import_started',
  'repo_import_completed',
  'course_published',
  'checkout_started',
  'checkout_completed',
] as const;

type FunnelEvent = typeof FUNNEL_EVENTS[number];

/** Seed drop-off: what % of users make it to each step */
const SCENARIO_RATES: Record<string, number[]> = {
  full_funnel:  [1.0, 0.8, 0.75, 0.6, 0.4, 0.3],  // realistic drop-off
  partial:      [1.0, 0.5, 0.0, 0.0, 0.0, 0.0],   // imports started but none completed
  no_publish:   [1.0, 0.9, 0.85, 0.0, 0.0, 0.0],  // imports work, nobody publishes
  no_checkout:  [1.0, 0.8, 0.75, 0.6, 0.0, 0.0],  // published but no buyer checkout
  clear:        [],
};

export async function POST(req: NextRequest) {
  const allowed =
    process.env.NODE_ENV !== 'production' ||
    process.env.SEED_ALLOWED === '1';

  if (!allowed) {
    return NextResponse.json({ error: 'Seeding not allowed in production' }, { status: 403 });
  }

  // Auth
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { scenario?: string; count?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const scenario = body.scenario ?? 'full_funnel';
  const baseCount = Math.min(Math.max(body.count ?? 20, 1), 200);
  const rates = SCENARIO_RATES[scenario];

  if (!rates) {
    return NextResponse.json(
      { error: `Unknown scenario "${scenario}". Valid: ${Object.keys(SCENARIO_RATES).join(', ')}` },
      { status: 400 },
    );
  }

  const supa = createServiceClient();

  // Clear mode: delete seeded events for this user
  if (scenario === 'clear') {
    const { error } = await supa
      .from('events')
      .delete()
      .eq('user_id', user.id)
      .like('properties->>seeded', 'true');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ cleared: true, user_id: user.id });
  }

  // Find a course owned by this user for buyer-side events
  const { data: courses } = await supa
    .from('courses')
    .select('id')
    .eq('creator_id', user.id)
    .limit(1);

  const courseId = courses?.[0]?.id ?? null;

  // Seed events
  const seeded: Record<string, number> = {};
  const rows: Array<{
    event_name: FunnelEvent;
    user_id: string;
    course_id: string | null;
    properties: Record<string, unknown>;
    created_at: string;
  }> = [];

  for (let i = 0; i < FUNNEL_EVENTS.length; i++) {
    const eventName = FUNNEL_EVENTS[i];
    const rate = rates[i] ?? 0;
    const count = Math.round(baseCount * rate);
    seeded[eventName] = count;

    // Spread events over the last 30 days
    for (let j = 0; j < count; j++) {
      const daysAgo = Math.random() * 30;
      const ts = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
      rows.push({
        event_name: eventName,
        user_id: user.id,
        course_id: courseId,
        properties: { seeded: 'true', scenario, seed_batch: Date.now() },
        created_at: ts,
      });
    }
  }

  // Insert in batches of 50
  const batchSize = 50;
  const errors: string[] = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supa.from('events').insert(batch);
    if (error) errors.push(error.message);
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; '), partial: seeded }, { status: 500 });
  }

  return NextResponse.json({
    seeded,
    total: rows.length,
    scenario,
    user_id: user.id,
    course_id: courseId,
  });
}
