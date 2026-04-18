import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://giganalytics.app'
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/signup', '/login'],
        disallow: [
          '/dashboard',
          '/import',
          '/timer',
          '/heatmap',
          '/roi',
          '/pricing',
          '/billing',
          '/insights',
          '/benchmark',
          '/api/',
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  }
}
