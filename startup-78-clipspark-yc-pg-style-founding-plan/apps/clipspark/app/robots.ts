import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/', '/dashboard', '/upload', '/jobs/', '/clips/', '/settings', '/onboarding', '/checkout'],
      },
    ],
    sitemap: 'https://clipspark-tau.vercel.app/sitemap.xml',
  }
}
