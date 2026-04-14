import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://snippetci.com';
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/playground`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/docs`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/docs/getting-started`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/docs/security`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/docs/templates`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/docs-guide`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/security`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    // Comparison pages
    { url: `${base}/vs`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/vs/sphinx-doctest`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/vs/ad-hoc-ci-scripts`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/vs/postman-collections`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/vs/mintlify`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/vs/readme-checks`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
  ];
}
