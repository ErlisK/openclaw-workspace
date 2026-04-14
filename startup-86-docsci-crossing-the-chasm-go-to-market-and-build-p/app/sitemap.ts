import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://snippetci.com';
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now },
    { url: `${base}/pricing`, lastModified: now },
    { url: `${base}/playground`, lastModified: now },
    { url: `${base}/docs`, lastModified: now },
    { url: `${base}/docs-guide`, lastModified: now },
    { url: `${base}/terms`, lastModified: now },
    { url: `${base}/privacy`, lastModified: now },
  ];
}
