import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const BASE = 'https://pilotgrant.io'
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/grants/', '/pricing', '/providers'],
        disallow: [
          '/dashboard',
          '/onboarding',
          '/settings/',
          '/api/',
          '/research/',
          '/audit',
          '/pilot',
          '/orders',
          '/application/',
          '/timeline/',
          '/rfp/',
          '/checkout/',
          '/export/',
          '/budget/',
          '/checklist/',
          '/invite/',
          '/auth/',
        ],
      },
      {
        // Block AI training crawlers
        userAgent: ['GPTBot', 'CCBot', 'anthropic-ai', 'Google-Extended', 'ClaudeBot'],
        disallow: ['/'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  }
}
