/**
 * UTM link builder for PricingSim launch campaigns.
 *
 * Usage:
 *   utm({ source: 'producthunt', medium: 'referral', campaign: 'launch' })
 *   // → "?utm_source=producthunt&utm_medium=referral&utm_campaign=launch"
 *
 *   utmUrl('https://pricingsim.com/pricing', { source: 'twitter', medium: 'social', campaign: 'launch_week1' })
 *   // → "https://pricingsim.com/pricing?utm_source=twitter&utm_medium=social&utm_campaign=launch_week1"
 */

export interface UTMParams {
  source: string       // e.g. 'twitter', 'producthunt', 'hackernews', 'reddit'
  medium: string       // e.g. 'social', 'referral', 'cpc', 'email', 'direct'
  campaign: string     // e.g. 'launch', 'blog_post', 'press_kit'
  content?: string     // e.g. 'hero_cta', 'nav_link', 'footer_link'
  term?: string        // e.g. 'pricing+experiments' (for paid search)
}

/**
 * Build a UTM query string (starts with '?').
 */
export function utm(params: UTMParams): string {
  const p = new URLSearchParams()
  p.set('utm_source', params.source)
  p.set('utm_medium', params.medium)
  p.set('utm_campaign', params.campaign)
  if (params.content) p.set('utm_content', params.content)
  if (params.term)    p.set('utm_term', params.term)
  return '?' + p.toString()
}

/**
 * Build a fully-qualified URL with UTM params appended.
 */
export function utmUrl(base: string, params: UTMParams): string {
  const url = new URL(base)
  url.searchParams.set('utm_source', params.source)
  url.searchParams.set('utm_medium', params.medium)
  url.searchParams.set('utm_campaign', params.campaign)
  if (params.content) url.searchParams.set('utm_content', params.content)
  if (params.term)    url.searchParams.set('utm_term', params.term)
  return url.toString()
}

/**
 * Pre-built campaign links for all launch channels.
 * All point to the live Vercel deployment.
 */
const BASE = 'https://pricingsim.com'

export const CAMPAIGN_LINKS = {
  // ── Homepage CTAs ───────────────────────────────────────────────────────
  homepage_hero_cta:    utmUrl(`${BASE}/signup`,  { source: 'pricepilot_site', medium: 'internal', campaign: 'launch', content: 'hero_cta' }),
  homepage_pricing_cta: utmUrl(`${BASE}/pricing`, { source: 'pricepilot_site', medium: 'internal', campaign: 'launch', content: 'pricing_cta' }),

  // ── Product Hunt ────────────────────────────────────────────────────────
  producthunt:          utmUrl(BASE,              { source: 'producthunt', medium: 'referral', campaign: 'launch' }),
  producthunt_pricing:  utmUrl(`${BASE}/pricing`, { source: 'producthunt', medium: 'referral', campaign: 'launch', content: 'pricing_page' }),

  // ── Hacker News ─────────────────────────────────────────────────────────
  hackernews:           utmUrl(BASE,              { source: 'hackernews', medium: 'referral', campaign: 'show_hn' }),
  hackernews_blog:      utmUrl(`${BASE}/blog/building-the-bayesian-pricing-engine`, { source: 'hackernews', medium: 'referral', campaign: 'show_hn', content: 'tech_post' }),

  // ── Indie Hackers ────────────────────────────────────────────────────────
  indiehackers:         utmUrl(BASE,              { source: 'indiehackers', medium: 'referral', campaign: 'launch' }),
  indiehackers_pricing: utmUrl(`${BASE}/pricing`, { source: 'indiehackers', medium: 'referral', campaign: 'launch', content: 'pricing_page' }),

  // ── Twitter / X ──────────────────────────────────────────────────────────
  twitter_launch:       utmUrl(BASE,              { source: 'twitter', medium: 'social', campaign: 'launch_week1', content: 'launch_tweet' }),
  twitter_bayesian:     utmUrl(`${BASE}/blog/building-the-bayesian-pricing-engine`, { source: 'twitter', medium: 'social', campaign: 'blog_promotion', content: 'bayesian_thread' }),
  twitter_safety:       utmUrl(BASE,              { source: 'twitter', medium: 'social', campaign: 'launch_week1', content: 'safety_guardrails' }),
  twitter_import:       utmUrl(`${BASE}/import/guide`, { source: 'twitter', medium: 'social', campaign: 'launch_week2', content: 'import_flow' }),
  twitter_ai_tools:     utmUrl(`${BASE}/ai-tools`,    { source: 'twitter', medium: 'social', campaign: 'launch_week2', content: 'ai_tools' }),

  // ── LinkedIn ─────────────────────────────────────────────────────────────
  linkedin_launch:      utmUrl(BASE,              { source: 'linkedin', medium: 'social', campaign: 'launch_week1', content: 'launch_post' }),
  linkedin_bayesian:    utmUrl(`${BASE}/blog/building-the-bayesian-pricing-engine`, { source: 'linkedin', medium: 'social', campaign: 'blog_promotion', content: 'bayesian_post' }),
  linkedin_pricing:     utmUrl(`${BASE}/pricing`, { source: 'linkedin', medium: 'social', campaign: 'launch_week3', content: 'free_vs_pro' }),
  linkedin_import:      utmUrl(`${BASE}/import/guide`, { source: 'linkedin', medium: 'social', campaign: 'launch_week2', content: 'import_guide' }),

  // ── Reddit ───────────────────────────────────────────────────────────────
  reddit_saas:          utmUrl(BASE,              { source: 'reddit', medium: 'social', campaign: 'launch', content: 'r_saas' }),
  reddit_indiehackers:  utmUrl(BASE,              { source: 'reddit', medium: 'social', campaign: 'launch', content: 'r_indiehackers' }),

  // ── BetaList ─────────────────────────────────────────────────────────────
  betalist:             utmUrl(BASE,              { source: 'betalist', medium: 'referral', campaign: 'launch' }),

  // ── AlternativeTo ────────────────────────────────────────────────────────
  alternativeto:        utmUrl(BASE,              { source: 'alternativeto', medium: 'referral', campaign: 'directory' }),

  // ── Press Kit ────────────────────────────────────────────────────────────
  press_kit:            utmUrl(`${BASE}/press`,   { source: 'press', medium: 'referral', campaign: 'launch' }),

  // ── Blog cross-links ─────────────────────────────────────────────────────
  blog_tech_to_signup:  utmUrl(`${BASE}/signup`,  { source: 'pricepilot_blog', medium: 'internal', campaign: 'blog_cta', content: 'tech_post_footer' }),
  blog_intro_to_signup: utmUrl(`${BASE}/signup`,  { source: 'pricepilot_blog', medium: 'internal', campaign: 'blog_cta', content: 'intro_post_footer' }),
} as const

export type CampaignLinkKey = keyof typeof CAMPAIGN_LINKS

/**
 * Capture UTM params from URL and store in localStorage.
 * Call in root layout useEffect.
 */
export function captureUTM(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const utmData = {
    source: params.get('utm_source'),
    medium: params.get('utm_medium'),
    campaign: params.get('utm_campaign'),
    content: params.get('utm_content'),
    term: params.get('utm_term'),
  };
  if (utmData.source) {
    localStorage.setItem('utm_data', JSON.stringify(utmData));
  }
}

/**
 * Retrieve stored UTM params from localStorage.
 * Pass to signup API routes to attribute conversions.
 */
export function getStoredUTM(): Record<string, string | null> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('utm_data') || '{}');
  } catch {
    return {};
  }
}
