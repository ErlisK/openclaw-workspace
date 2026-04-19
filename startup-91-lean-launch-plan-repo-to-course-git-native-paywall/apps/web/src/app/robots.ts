import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/courses/', '/docs/', '/marketplace'],
        disallow: [
          '/dashboard/',
          '/api/',
          '/auth/callback',
          '/auth/update-password',
          '/auth/reset-password',
        ],
      },
      {
        // Block AI scrapers from training data
        userAgent: ['GPTBot', 'ChatGPT-User', 'CCBot', 'anthropic-ai', 'Claude-Web'],
        disallow: '/',
      },
    ],
    sitemap: 'https://teachrepo.com/sitemap.xml',
    host: 'https://teachrepo.com',
  };
}
