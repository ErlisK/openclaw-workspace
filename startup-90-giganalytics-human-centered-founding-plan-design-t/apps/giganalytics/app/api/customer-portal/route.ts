import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';

const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const requestedReturn = typeof body?.returnUrl === 'string' ? body.returnUrl : '';
    const safeReturn = requestedReturn?.startsWith(appUrl) ? requestedReturn : appUrl;

    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
    if (pErr) return NextResponse.json({ error: 'Unable to load billing profile' }, { status: 500 });
    if (!profile?.stripe_customer_id) return NextResponse.json({ error: 'No billing account' }, { status: 404 });

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: safeReturn || appUrl,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error('[customer-portal]', e);
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
  }
}
