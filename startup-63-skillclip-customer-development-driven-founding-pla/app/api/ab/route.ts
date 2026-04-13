import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event_type, variant_key, session_id, role, region, trade } = body;

    if (!event_type || !variant_key || !session_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const validEvents = ['impression', 'cta_click', 'form_start', 'form_complete'];
    if (!validEvents.includes(event_type)) {
      return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 });
    }

    const referer = req.headers.get('referer') || '';
    let utmSource = null, utmMedium = null, utmCampaign = null;
    try {
      const url = new URL(referer);
      utmSource = url.searchParams.get('utm_source');
      utmMedium = url.searchParams.get('utm_medium');
      utmCampaign = url.searchParams.get('utm_campaign');
    } catch { /* ignore */ }

    const { error } = await supabaseAdmin.from('ab_events').insert({
      variant_key,
      event_type,
      session_id,
      role: role || null,
      region: region || null,
      trade: trade || null,
      user_agent: req.headers.get('user-agent'),
      referrer: referer || null,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
    });

    if (error) {
      console.error('AB event insert error:', error);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('AB track error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
