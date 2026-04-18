import { MetadataRoute } from 'next'
import { SAFE_APP_URL } from '@/lib/url'

function url(path: string): string {
  return new URL(path, SAFE_APP_URL).toString()
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: url('/'), lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: url('/signup'), lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: url('/login'), lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: url('/pricing'), lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: url('/privacy'), lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: url('/docs'), lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: url('/docs/csv-templates'), lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: url('/docs/roi-formulas'), lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: url('/docs/pricing-experiments'), lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: url('/docs/ai-limitations'), lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    // Blog
    { url: url('/blog'), lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: url('/blog/true-hourly-rate'), lastModified: new Date('2025-04-10'), changeFrequency: 'monthly', priority: 0.7 },
    { url: url('/blog/ab-pricing-gig-work'), lastModified: new Date('2025-04-03'), changeFrequency: 'monthly', priority: 0.7 },
    { url: url('/blog/five-income-streams'), lastModified: new Date('2025-03-27'), changeFrequency: 'monthly', priority: 0.7 },
    // Launch
    { url: url('/launch'), lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    // Social
    { url: url('/social'), lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
  ]
}
