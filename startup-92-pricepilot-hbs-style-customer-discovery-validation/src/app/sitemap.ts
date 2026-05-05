import { MetadataRoute } from 'next'

const BASE_URL = 'https://pricingsim.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: BASE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/signup`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/blog/how-to-run-a-price-test-without-losing-customers`, lastModified: new Date('2025-01-15'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/blog/the-bayesian-advantage-why-we-dont-use-traditional-ab-tests`, lastModified: new Date('2025-01-28'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/docs`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/docs/quickstart`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/import/guide`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/press`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/onboarding`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    // Authority content
    { url: `${BASE_URL}/calculator`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${BASE_URL}/guides`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${BASE_URL}/guides/micro-seller-pricing-experiments`, lastModified: new Date('2025-03-01'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/guides/gumroad-pricing-updates-and-churn-risk`, lastModified: new Date('2025-03-08'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/guides/stripe-price-testing-without-code`, lastModified: new Date('2025-03-15'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/guides/cohort-aware-simulations-explained`, lastModified: new Date('2025-03-22'), changeFrequency: 'monthly', priority: 0.8 },
    // New blog posts
    { url: `${BASE_URL}/blog/building-the-bayesian-pricing-engine`, lastModified: new Date('2025-02-10'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/blog/building-pricepilot-product-intro`, lastModified: new Date('2025-02-03'), changeFrequency: 'monthly', priority: 0.7 },
  ]
}
