/**
 * app/api/entitlements/route.ts
 * GET /api/entitlements
 * Returns the current user's entitlements.
 * Used by the dashboard and wizard to enforce caps.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server';
import { getUserEntitlements } from '@/lib/entitlements';

export async function GET() {
  const auth = await createServerSupabaseClient();
  const { data: { user }, error } = await auth.auth.getUser();

  if (error || !user) {
    // Anonymous users get free tier
    return NextResponse.json({
      ok:      true,
      plan:    'free',
      anonymous: true,
      unlimitedExports:      false,
      freeExportsRemaining:  2,
      hostedUrlsEnabled:     false,
      badgesEnabled:         true,
      versionHistoryEnabled: false,
      premiumTemplates:      [],
    });
  }

  const svc = createServiceClient();
  const ents = await getUserEntitlements(svc, user.id);

  return NextResponse.json({
    ok:    true,
    anonymous: false,
    ...ents,
    // Cap freeExportsRemaining at 3 for display
    freeExportsRemaining: ents.unlimitedExports ? null : ents.freeExportsRemaining,
  });
}
