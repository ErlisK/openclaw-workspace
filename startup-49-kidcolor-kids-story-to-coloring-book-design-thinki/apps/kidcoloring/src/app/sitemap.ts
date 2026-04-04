import type { MetadataRoute } from 'next'

/**
 * /sitemap.xml — Dynamic sitemap for KidColoring SEO
 *
 * Includes:
 *   - Static pages (home, create flow, account)
 *   - Theme landing pages (coloring-books/[theme])
 *   - Share pages for public books (if share_slug exists)
 */

const THEMES = [
  'dinosaurs', 'unicorns', 'space', 'robots', 'dragons',
  'mermaids', 'puppies', 'kittens', 'princesses', 'superheroes',
  'butterflies', 'ocean', 'fairies', 'wizards', 'trains', 'cars',
]

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kidcoloring-research.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  // Core static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url:              BASE_URL,
      lastModified:     now,
      changeFrequency:  'weekly',
      priority:         1.0,
    },
    {
      url:              `${BASE_URL}/create/interests`,
      lastModified:     now,
      changeFrequency:  'monthly',
      priority:         0.9,
    },
    {
      url:              `${BASE_URL}/gallery`,
      lastModified:     now,
      changeFrequency:  'weekly',
      priority:         0.7,
    },
  ]

  // Theme landing pages
  const themePages: MetadataRoute.Sitemap = THEMES.map(theme => ({
    url:             `${BASE_URL}/coloring-books/${theme}`,
    lastModified:    now,
    changeFrequency: 'monthly' as const,
    priority:        0.8,
  }))

  return [...staticPages, ...themePages]
}
