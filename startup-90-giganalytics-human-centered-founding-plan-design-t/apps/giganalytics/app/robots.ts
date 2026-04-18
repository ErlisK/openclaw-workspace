import { MetadataRoute } from 'next'
import { SAFE_APP_URL } from '@/lib/url'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/signup', '/login', '/pricing'],
        disallow: [
          '/dashboard',
          '/import',
          '/timer',
          '/heatmap',
          '/roi',
          '/billing',
          '/insights',
          '/benchmark',
          '/api/',
        ],
      },
    ],
    sitemap: `${SAFE_APP_URL}/sitemap.xml`,
  }
}
