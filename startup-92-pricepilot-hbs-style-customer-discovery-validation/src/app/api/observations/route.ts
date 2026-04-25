import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRatelimit, checkRateLimit } from '@/lib/ratelimit';

const rateLimiter = createRatelimit(20, 60);

export async function POST(req: NextRequest) {
  const ppVid = req.cookies.get('pp_vid')?.value || 'anon';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const identifier = `obs:${ppVid}:${ip}`;

  const { limited, headers } = await checkRateLimit(rateLimiter, identifier);
  if (limited) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers });
  }

  let body: {
    experiment_id?: string;
    slug?: string;
    variant?: string;
    visitor_key?: string;
    event?: string;
    price_cents?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { experiment_id, slug, variant, visitor_key, event = 'view', price_cents } = body;

  if (!variant || !['A', 'B'].includes(variant)) {
    return NextResponse.json({ error: 'Invalid variant' }, { status: 400 });
  }

  // Service role used only server-side in this route handler
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let expId = experiment_id;
  if (!expId && slug) {
    const { data } = await supabase
      .from('experiments')
      .select('id, status')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();
    if (!data) return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    expId = data.id;
  }

  if (!expId) {
    return NextResponse.json({ error: 'experiment_id or slug required' }, { status: 400 });
  }

  // Verify experiment is active
  const { data: exp } = await supabase
    .from('experiments')
    .select('id, status')
    .eq('id', expId)
    .eq('status', 'active')
    .single();

  if (!exp) return NextResponse.json({ error: 'Experiment not active' }, { status: 404 });

  const vk = visitor_key || ppVid;

  const { error } = await supabase
    .from('experiment_observations')
    .insert({
      experiment_id: expId,
      variant,
      visitor_id: vk,
      visitor_key: vk,
      event,
      price_cents: price_cents ?? null,
    });

  if (error && !error.message?.includes('duplicate') && error.code !== '23505') {
    console.error('observation insert error:', error);
    // Best-effort: don't fail the user request for observation errors
  }

  return NextResponse.json({ ok: true }, { headers });
}
