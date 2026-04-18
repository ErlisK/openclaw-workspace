import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveUser } from '@/lib/auth/resolve-user';

/**
 * GET /api/me
 * Returns the current user's profile from the creators table.
 */
export async function GET(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceSupa = createServiceClient();
  const { data: creator } = await serviceSupa
    .from('creators')
    .select('id, display_name, avatar_url, bio, website_url, twitter_handle, github_handle, saas_tier, created_at')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      provider: (user as { app_metadata?: { provider?: string } }).app_metadata?.provider ?? 'email',
      email_confirmed: !!(user as { email_confirmed_at?: string }).email_confirmed_at,
    },
    profile: creator ?? null,
  });
}

/**
 * PATCH /api/me
 * Updates the current user's profile.
 */
export async function PATCH(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const allowed = ['display_name', 'bio', 'website_url', 'twitter_handle', 'github_handle', 'avatar_url'];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const serviceSupa = createServiceClient();
  const { data, error } = await serviceSupa
    .from('creators')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select('id, display_name, avatar_url, bio, website_url, twitter_handle, github_handle, saas_tier')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
