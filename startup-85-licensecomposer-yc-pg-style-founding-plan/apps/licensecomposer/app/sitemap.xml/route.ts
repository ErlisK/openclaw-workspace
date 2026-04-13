import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pacttailor.com';

  const pages = [
    { url: APP_URL, priority: '1.0', changefreq: 'weekly' },
    { url: `${APP_URL}/templates`, priority: '0.9', changefreq: 'daily' },
    { url: `${APP_URL}/pricing`, priority: '0.8', changefreq: 'monthly' },
    { url: `${APP_URL}/docs`, priority: '0.7', changefreq: 'monthly' },
    { url: `${APP_URL}/legal/terms`, priority: '0.5', changefreq: 'monthly' },
    { url: `${APP_URL}/legal/privacy`, priority: '0.5', changefreq: 'monthly' },
    { url: `${APP_URL}/legal/disclaimer`, priority: '0.5', changefreq: 'monthly' },
  ];

  const today = new Date().toISOString().split('T')[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
