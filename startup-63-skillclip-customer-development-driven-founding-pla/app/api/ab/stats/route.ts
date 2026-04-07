import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Aggregate events by variant and type
    const { data: events, error } = await supabaseAdmin
      .from('ab_events')
      .select('variant_key, event_type, role, region, trade, created_at');

    if (error) throw error;

    const variants = ['control', 'mentor', 'speed'];
    const eventTypes = ['impression', 'cta_click', 'form_start', 'form_complete'];

    const stats = variants.map((vk) => {
      const variantEvents = events?.filter((e) => e.variant_key === vk) || [];

      const counts: Record<string, number> = {};
      eventTypes.forEach((et) => {
        counts[et] = variantEvents.filter((e) => e.event_type === et).length;
      });

      const ctr = counts.impression > 0
        ? ((counts.cta_click / counts.impression) * 100).toFixed(1)
        : '0.0';
      const formStartRate = counts.impression > 0
        ? ((counts.form_start / counts.impression) * 100).toFixed(1)
        : '0.0';
      const conversionRate = counts.impression > 0
        ? ((counts.form_complete / counts.impression) * 100).toFixed(1)
        : '0.0';
      const formCompletionRate = counts.form_start > 0
        ? ((counts.form_complete / counts.form_start) * 100).toFixed(1)
        : '0.0';

      // Role breakdown
      const roleCounts: Record<string, number> = {};
      variantEvents
        .filter((e) => e.event_type === 'form_complete' && e.role)
        .forEach((e) => {
          roleCounts[e.role] = (roleCounts[e.role] || 0) + 1;
        });

      return {
        variant_key: vk,
        counts,
        ctr,
        formStartRate,
        conversionRate,
        formCompletionRate,
        roleCounts,
      };
    });

    // Waitlist counts per variant (via utm_source = ab_<variant>)
    const { data: waitlist } = await supabaseAdmin
      .from('waitlist')
      .select('utm_source, utm_medium, role');

    const waitlistByVariant: Record<string, number> = {};
    variants.forEach((vk) => {
      waitlistByVariant[vk] = waitlist?.filter(
        (w) => w.utm_source === `ab_${vk}` || w.utm_medium === 'ab_test'
      ).length || 0;
    });

    return NextResponse.json({
      stats,
      waitlistByVariant,
      totalWaitlist: waitlist?.length || 0,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('AB stats error:', err);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
