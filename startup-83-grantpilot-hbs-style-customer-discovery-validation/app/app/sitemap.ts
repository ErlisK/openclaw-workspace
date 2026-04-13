import { MetadataRoute } from 'next'

const BASE = 'https://pilotgrant.io'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  return [
    // Marketing / home
    { url: BASE, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE}/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/providers`, lastModified: lastWeek, changeFrequency: 'monthly', priority: 0.8 },

    // SEO content pages
    { url: `${BASE}/grants/how-it-works`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/grants/nonprofit-grant-writing`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/grants/federal-grants-nonprofits`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${BASE}/grants/municipal-grant-management`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${BASE}/grants/ai-grant-writer`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/grants/grant-budget-builder`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },

    // Resource / content pages
    { url: `${BASE}/resources`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${BASE}/resources/grant-narrative-template-neh`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/resources/sf-424-guide`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/resources/municipal-arpa-grant-checklist`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${BASE}/resources/budget-justification-examples`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${BASE}/resources/how-to-parse-rfps-with-ai`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },

    // Auth pages (low priority, no-index handled via meta)
    { url: `${BASE}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/signup`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },

    // Docs
    { url: `${BASE}/docs`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/docs/setup`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/docs/data-security`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/docs/qa-escrow-policy`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/docs/sla`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
  ]
}
