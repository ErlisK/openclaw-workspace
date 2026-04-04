import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kidcoloring-research.vercel.app'
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/admin',
          '/admin/*',
          '/api/*',
          '/account',
          '/create/preview/*/paywall',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
