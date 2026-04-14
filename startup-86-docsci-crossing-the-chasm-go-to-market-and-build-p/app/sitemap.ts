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
    // Use-case landing pages
    { url: `${base}/for`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/for/docusaurus-docs-ci`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/for/api-docs-testing`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/for/openapi-docs-validation`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/for/prevent-broken-code-examples`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    // Integration guides
    { url: `${base}/docs/integrations`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/docs/integrations/github-actions`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/docs/integrations/gitlab-ci`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    // Migration guides
    { url: `${base}/docs/guides/migration`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/docs/guides/migrate-from-sphinx`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/docs/guides/migrate-from-scripts`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/docs/guides/migrate-from-postman`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    // Launch & blog pages
    { url: `${base}/launch`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${base}/blog/broken-docs-cost`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${base}/blog/api-drift-detection`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${base}/blog/github-actions-docs-ci`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.8 },
    // New technical blog posts
    { url: `${base}/blog/hermetic-snippet-execution`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${base}/blog/detecting-api-drift-openapi`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${base}/blog/automating-accessibility-checks-docs`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${base}/gists`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${base}/social`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${base}/listings`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${base}/case-studies`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.9 },
    { url: `${base}/case-studies/sdk-docs-broken-examples`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.9 },
    { url: `${base}/for/openapi-enterprise`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.9 },
    { url: `${base}/for/nextjs-mdx-docs`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.9 },
    { url: `${base}/for/gitlab-ci-docs`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.9 },
  ];
}
