/**
 * app/api/templates/route.ts
 * GET /api/templates
 * Returns all active templates with userHasAccess flag.
 * Authenticated users: checks entitlements table.
 * Anonymous users: only free templates are accessible.
 *
 * Query params: ?tier=free|premium&type=digital_asset_license|...
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server';
import { getUserEntitlements } from '@/lib/entitlements';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Allowlists for server-side input validation (H1 fix)
const ALLOWED_JURISDICTIONS = ['US', 'UK', 'EU', 'AU', 'CA', 'DE', 'FR', 'NL', 'SG', 'IN'] as const;
const ALLOWED_PLATFORMS = ['etsy', 'gumroad', 'shopify', 'opensea', 'creative_market', 'patreon', 'ko-fi', 'itch', 'general'] as const;
const ALLOWED_TIERS = ['free', 'premium'] as const;
const ALLOWED_TYPES = [
  'digital_asset_license', 'commissioned_work', 'collaborator_split',
  'nft_license', 'print_on_demand', 'software_license', 'music_license',
] as const;

export async function GET(req: NextRequest) {
  // Rate limit: 30 req/min per IP (M1 fix)
  const limited = rateLimit(req, { limit: 30, window: 60, prefix: 'templates' });
  if (limited) return limited;

  const { searchParams } = req.nextUrl;

  // Validate all filter params against allowlists — reject unknown values (H1 fix)
  const tierRaw = searchParams.get('tier');
  const typeRaw = searchParams.get('type');
  const jurisdictionRaw = searchParams.get('jurisdiction');
  const platformRaw = searchParams.get('platform');

  const tierFilter = tierRaw && (ALLOWED_TIERS as readonly string[]).includes(tierRaw) ? tierRaw : null;
  const typeFilter = typeRaw && (ALLOWED_TYPES as readonly string[]).includes(typeRaw) ? typeRaw : null;
  const jurisdictionFilter = jurisdictionRaw
    ? (ALLOWED_JURISDICTIONS as readonly string[]).includes(jurisdictionRaw.toUpperCase())
      ? jurisdictionRaw.toUpperCase()
      : 'NONE' // Unknown jurisdiction → return empty set
    : null;
  const platformFilter = platformRaw
    ? (ALLOWED_PLATFORMS as readonly string[]).includes(platformRaw.toLowerCase())
      ? platformRaw.toLowerCase()
      : 'NONE' // Unknown platform → return empty set
    : null;

  // If unknown jurisdiction/platform was passed, return empty (not all templates)
  if (jurisdictionRaw && jurisdictionFilter === 'NONE') {
    return NextResponse.json({ templates: [], hasUnlimited: false });
  }
  if (platformRaw && platformFilter === 'NONE') {
    return NextResponse.json({ templates: [], hasUnlimited: false });
  }

  const svc = createServiceClient();

  // Build query
  let query = svc
    .from('templates')
    .select('id, slug, name, description, document_type, tier, price_cents, tags, jurisdictions, platforms, lawyer_reviewed, is_featured, current_version')
    .eq('is_active', true)
    .order('tier', { ascending: true })  // free first
    .order('name', { ascending: true });

  if (tierFilter) query = query.eq('tier', tierFilter);
  if (typeFilter) query = query.eq('document_type', typeFilter);
  // Apply jurisdiction/platform containment filters (H1 fix — actually filter!)
  if (jurisdictionFilter) query = query.contains('jurisdictions', [jurisdictionFilter]);
  if (platformFilter) query = query.contains('platforms', [platformFilter]);

  const { data: templates, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get user entitlements
  let unlockedTemplateSlugs: string[] = [];
  let hasUnlimited = false;

  try {
    const auth = await createServerSupabaseClient();
    const { data: { user } } = await auth.auth.getUser();
    if (user) {
      const ents = await getUserEntitlements(svc, user.id);
      hasUnlimited = ents.unlimitedExports;
      unlockedTemplateSlugs = ents.premiumTemplates;
    }
  } catch {
    // Anonymous — no entitlements
  }

  // Annotate each template with access status
  const annotated = (templates ?? []).map(t => ({
    ...t,
    isPremium:     t.tier === 'premium',
    priceDollars:  (t.price_cents ?? 0) / 100,
    // Access: free templates always accessible; premium: need unlimited sub OR explicit purchase
    userHasAccess: t.tier === 'free'
      || hasUnlimited
      || unlockedTemplateSlugs.includes(t.slug),
  }));

  return NextResponse.json({ templates: annotated, hasUnlimited });
}
