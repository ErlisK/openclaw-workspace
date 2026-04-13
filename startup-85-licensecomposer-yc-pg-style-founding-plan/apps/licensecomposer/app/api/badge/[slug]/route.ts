/**
 * app/api/badge/[slug]/route.ts
 * GET /api/badge/:slug
 * Returns an SVG badge: "Verified License · PactTailor"
 */
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pacttailor.com';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const svc = createServiceClient();

  const { data: page } = await svc
    .from('license_pages')
    .select('title, is_active, badge_enabled')
    .eq('slug', slug)
    .single();

  const active = page?.is_active && page?.badge_enabled;
  const color  = active ? '#4f46e5' : '#9ca3af';
  const label  = active ? 'Verified License' : 'Inactive License';
  const link   = `${APP_URL}/l/${slug}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="188" height="20" role="img" aria-label="${label}: PactTailor">
  <title>${label}: PactTailor</title>
  <defs>
    <linearGradient id="s" x2="0" y2="100%">
      <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
      <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
    <clipPath id="r"><rect width="188" height="20" rx="3" fill="#fff"/></clipPath>
  </defs>
  <g clip-path="url(#r)">
    <rect width="118" height="20" fill="${color}"/>
    <rect x="118" width="70" height="20" fill="#555"/>
    <rect width="188" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="110">
    <a href="${link}" target="_blank">
      <text x="600" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="1020" lengthAdjust="spacing">${label}</text>
      <text x="600" y="140" transform="scale(.1)" textLength="1020" lengthAdjust="spacing">${label}</text>
    </a>
    <text x="1525" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="580" lengthAdjust="spacing">PactTailor</text>
    <text x="1525" y="140" transform="scale(.1)" textLength="580" lengthAdjust="spacing">PactTailor</text>
  </g>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type':  'image/svg+xml',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
