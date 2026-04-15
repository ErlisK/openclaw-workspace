/**
 * lib/utm/links.ts
 *
 * Single source of truth for every UTM short link.
 * The /r/[slug] route reads this registry to redirect.
 *
 * Format:
 *   slug       → the short code used in /r/<slug>
 *   destination → base URL to redirect to (usually the homepage or a deep link)
 *   utm_source  → channel (twitter, linkedin, hn, reddit, etc.)
 *   utm_medium  → medium (social, community, email, directory)
 *   utm_campaign→ campaign name
 *   utm_content → optional variant / creative ID
 *
 * Live base URL (canonical production):
 *   https://startup-87-betawindow-human-in-the-loop-e2e-testing-ouwi0qsjw.vercel.app
 */

export const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://startup-87-betawindow-human-in-the-loop-e2e-testing-ouwi0qsjw.vercel.app'

export interface UTMLink {
  slug: string
  label: string           // human-readable label for the admin table
  destination: string     // path (relative) or full URL
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content?: string
  created_at: string      // ISO date
  category: 'social' | 'directory' | 'community' | 'email' | 'press'
}

export const UTM_LINKS: UTMLink[] = [
  // ── TWITTER / X ────────────────────────────────────────────────────────
  {
    slug: 'tw-bio',
    label: 'Twitter — Profile Bio',
    destination: '/',
    utm_source: 'twitter',
    utm_medium: 'social',
    utm_campaign: 'twitter_bio',
    created_at: '2025-04-15',
    category: 'social',
  },
  {
    slug: 'tw-launch',
    label: 'Twitter — Launch Thread',
    destination: '/',
    utm_source: 'twitter',
    utm_medium: 'social',
    utm_campaign: 'twitter_launch',
    utm_content: 'thread_tweet1',
    created_at: '2025-04-15',
    category: 'social',
  },
  {
    slug: 'tw-pricing',
    label: 'Twitter — Pricing Post',
    destination: '/pricing',
    utm_source: 'twitter',
    utm_medium: 'social',
    utm_campaign: 'twitter_pricing',
    created_at: '2025-04-15',
    category: 'social',
  },
  {
    slug: 'tw-howto',
    label: 'Twitter — How-It-Works Post',
    destination: '/docs/how-it-works',
    utm_source: 'twitter',
    utm_medium: 'social',
    utm_campaign: 'twitter_howto',
    created_at: '2025-04-15',
    category: 'social',
  },

  // ── LINKEDIN ────────────────────────────────────────────────────────────
  {
    slug: 'li-bio',
    label: 'LinkedIn — Company Bio',
    destination: '/',
    utm_source: 'linkedin',
    utm_medium: 'social',
    utm_campaign: 'linkedin_bio',
    created_at: '2025-04-15',
    category: 'social',
  },
  {
    slug: 'li-launch',
    label: 'LinkedIn — Launch Post',
    destination: '/',
    utm_source: 'linkedin',
    utm_medium: 'social',
    utm_campaign: 'linkedin_launch',
    created_at: '2025-04-15',
    category: 'social',
  },
  {
    slug: 'li-howto',
    label: 'LinkedIn — How-It-Works Post',
    destination: '/docs/how-it-works',
    utm_source: 'linkedin',
    utm_medium: 'social',
    utm_campaign: 'linkedin_howto',
    created_at: '2025-04-15',
    category: 'social',
  },
  {
    slug: 'li-story',
    label: 'LinkedIn — Founder Story Post',
    destination: '/',
    utm_source: 'linkedin',
    utm_medium: 'social',
    utm_campaign: 'linkedin_story',
    created_at: '2025-04-15',
    category: 'social',
  },

  // ── HACKER NEWS ─────────────────────────────────────────────────────────
  {
    slug: 'hn-launch',
    label: 'Hacker News — Show HN Post',
    destination: '/',
    utm_source: 'hackernews',
    utm_medium: 'community',
    utm_campaign: 'hn_show_hn',
    created_at: '2025-04-15',
    category: 'community',
  },
  {
    slug: 'hn-ask',
    label: 'Hacker News — Ask HN Comment',
    destination: '/',
    utm_source: 'hackernews',
    utm_medium: 'community',
    utm_campaign: 'hn_ask_hn',
    created_at: '2025-04-15',
    category: 'community',
  },

  // ── REDDIT ───────────────────────────────────────────────────────────────
  {
    slug: 'rd-saas',
    label: 'Reddit — r/SaaS',
    destination: '/',
    utm_source: 'reddit',
    utm_medium: 'community',
    utm_campaign: 'reddit_saas',
    created_at: '2025-04-15',
    category: 'community',
  },
  {
    slug: 'rd-aitools',
    label: 'Reddit — r/AIAssistants',
    destination: '/',
    utm_source: 'reddit',
    utm_medium: 'community',
    utm_campaign: 'reddit_aitools',
    created_at: '2025-04-15',
    category: 'community',
  },
  {
    slug: 'rd-cursor',
    label: 'Reddit — r/cursor',
    destination: '/',
    utm_source: 'reddit',
    utm_medium: 'community',
    utm_campaign: 'reddit_cursor',
    created_at: '2025-04-15',
    category: 'community',
  },
  {
    slug: 'rd-vibecoding',
    label: 'Reddit — r/vibecoding',
    destination: '/',
    utm_source: 'reddit',
    utm_medium: 'community',
    utm_campaign: 'reddit_vibecoding',
    created_at: '2025-04-15',
    category: 'community',
  },

  // ── DIRECTORIES ──────────────────────────────────────────────────────────
  {
    slug: 'ph-launch',
    label: 'Product Hunt — Launch',
    destination: '/',
    utm_source: 'producthunt',
    utm_medium: 'directory',
    utm_campaign: 'ph_launch',
    created_at: '2025-04-15',
    category: 'directory',
  },
  {
    slug: 'bl-listing',
    label: 'BetaList — Listing',
    destination: '/',
    utm_source: 'betalist',
    utm_medium: 'directory',
    utm_campaign: 'betalist_listing',
    created_at: '2025-04-15',
    category: 'directory',
  },
  {
    slug: 'ml-listing',
    label: 'Microlaunch — Listing',
    destination: '/',
    utm_source: 'microlaunch',
    utm_medium: 'directory',
    utm_campaign: 'microlaunch_listing',
    created_at: '2025-04-15',
    category: 'directory',
  },
  {
    slug: 'fz-listing',
    label: 'Fazier — Listing',
    destination: '/',
    utm_source: 'fazier',
    utm_medium: 'directory',
    utm_campaign: 'fazier_listing',
    created_at: '2025-04-15',
    category: 'directory',
  },
  {
    slug: 'un-listing',
    label: 'Uneed — Listing',
    destination: '/',
    utm_source: 'uneed',
    utm_medium: 'directory',
    utm_campaign: 'uneed_listing',
    created_at: '2025-04-15',
    category: 'directory',
  },
  {
    slug: 'sb-listing',
    label: 'StartupBase — Listing',
    destination: '/',
    utm_source: 'startupbase',
    utm_medium: 'directory',
    utm_campaign: 'startupbase_listing',
    created_at: '2025-04-15',
    category: 'directory',
  },
  {
    slug: 'gh-awesome',
    label: 'GitHub awesome-ai-tools PR',
    destination: '/',
    utm_source: 'github',
    utm_medium: 'directory',
    utm_campaign: 'github_awesome',
    created_at: '2025-04-15',
    category: 'directory',
  },

  // ── EMAIL ────────────────────────────────────────────────────────────────
  {
    slug: 'em-submission',
    label: 'Email — Directory Submission',
    destination: '/',
    utm_source: 'email',
    utm_medium: 'email',
    utm_campaign: 'directory_submission',
    created_at: '2025-04-15',
    category: 'email',
  },
  {
    slug: 'em-welcome',
    label: 'Email — Welcome / Onboarding',
    destination: '/dashboard',
    utm_source: 'email',
    utm_medium: 'email',
    utm_campaign: 'welcome_email',
    created_at: '2025-04-15',
    category: 'email',
  },

  // ── PRESS KIT ────────────────────────────────────────────────────────────
  {
    slug: 'press',
    label: 'Press Kit / /launch page',
    destination: '/launch',
    utm_source: 'press',
    utm_medium: 'press',
    utm_campaign: 'press_kit',
    created_at: '2025-04-15',
    category: 'press',
  },
  {
    slug: 'demo',
    label: 'Live Demo Link',
    destination: '/playground',
    utm_source: 'direct',
    utm_medium: 'referral',
    utm_campaign: 'demo_link',
    created_at: '2025-04-15',
    category: 'press',
  },
]

/** Build the full redirect URL for a given UTM link */
export function buildRedirectUrl(link: UTMLink): string {
  const dest = link.destination.startsWith('http')
    ? link.destination
    : `${BASE_URL}${link.destination}`
  const url = new URL(dest)
  url.searchParams.set('utm_source', link.utm_source)
  url.searchParams.set('utm_medium', link.utm_medium)
  url.searchParams.set('utm_campaign', link.utm_campaign)
  if (link.utm_content) url.searchParams.set('utm_content', link.utm_content)
  return url.toString()
}

/** Look up a link by slug */
export function getLinkBySlug(slug: string): UTMLink | undefined {
  return UTM_LINKS.find((l) => l.slug === slug)
}

/** Full short URL for a slug */
export function shortUrl(slug: string): string {
  return `${BASE_URL}/r/${slug}`
}
