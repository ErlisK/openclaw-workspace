import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

/**
 * /sitemap.xml — Dynamic sitemap for KidColoring SEO
 *
 * Includes:
 *   - Static pages (home, free coloring pages hub, free weekly pack)
 *   - 16 theme landing pages (/coloring-books/[theme])
 *   - Individual SEO sample pages (/coloring-pages/[slug])
 *   - Share pages for public completed books (/share/[slug])
 */

const THEMES = [
  'dinosaurs', 'unicorns', 'space', 'robots', 'dragons',
  'mermaids', 'puppies', 'kittens', 'princesses', 'superheroes',
  'butterflies', 'ocean', 'fairies', 'wizards', 'trains', 'cars',
]

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kidcoloring-research.vercel.app'

export const revalidate = 3600  // regenerate sitemap hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // ── Static pages ─────────────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,                                lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/free-coloring-pages`,       lastModified: now, changeFrequency: 'weekly',  priority: 0.95 },
    { url: `${BASE}/gallery`,  lastModified: now, changeFrequency: 'daily'  as const, priority: 0.9 },
    { url: `${BASE}/teachers`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.85 },
    { url: `${BASE}/free`,                      lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE}/create/interests`,          lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
  ]

  // ── Theme landing pages ───────────────────────────────────────────────────
  const themePages: MetadataRoute.Sitemap = THEMES.map(theme => ({
    url:             `${BASE}/coloring-books/${theme}`,
    lastModified:    now,
    changeFrequency: 'monthly' as const,
    priority:        0.8,
  }))

  // ── Individual SEO sample pages ───────────────────────────────────────────
  let seoPages: MetadataRoute.Sitemap = []
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const { data } = await sb
      .from('seo_pages')
      .select('slug, updated_at')
      .eq('published', true)
      .limit(500)

    seoPages = (data ?? []).map((p: { slug: string; updated_at: string }) => ({
      url:             `${BASE}/coloring-pages/${p.slug}`,
      lastModified:    new Date(p.updated_at),
      changeFrequency: 'monthly' as const,
      priority:        0.75,
    }))
  } catch { /* non-critical */ }

  // ── Public share pages ────────────────────────────────────────────────────
  let sharePages: MetadataRoute.Sitemap = []
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const { data } = await sb
      .from('trial_sessions')
      .select('share_slug, updated_at')
      .eq('status', 'complete')
      .not('share_slug', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100)

    sharePages = (data ?? []).map((s: { share_slug: string; updated_at: string }) => ({
      url:             `${BASE}/share/${s.share_slug}`,
      lastModified:    new Date(s.updated_at ?? now),
      changeFrequency: 'never' as const,
      priority:        0.5,
    }))
  } catch { /* non-critical */ }

  return [...staticPages, ...themePages, ...seoPages, ...sharePages]
}
