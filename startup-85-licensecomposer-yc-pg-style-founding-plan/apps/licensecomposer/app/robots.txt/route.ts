import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pacttailor.com';
  const body = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard
Disallow: /profile
Disallow: /contracts

Sitemap: ${APP_URL}/sitemap.xml
`;
  return new NextResponse(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
