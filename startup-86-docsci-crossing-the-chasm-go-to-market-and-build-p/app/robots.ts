import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/', '/admin/', '/auth/'],
      },
    ],
    sitemap: 'https://snippetci.com/sitemap.xml',
    host: 'https://snippetci.com',
  };
}
