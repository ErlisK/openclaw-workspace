import { MetadataRoute } from 'next'

const BASE_URL = 'https://startup-92-pricepilot-hbs-style-cus.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/', '/experiments/', '/suggestions/', '/import/', '/settings/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
