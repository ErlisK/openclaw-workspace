/**
 * ClipSpark Export & Publishing utilities
 *
 * Platforms:
 *  - File download (signed URL from Supabase storage)
 *  - YouTube Shorts (OAuth2 + YouTube Data API v3)
 *  - LinkedIn (OAuth2 + LinkedIn Marketing/Video API)
 *  - TikTok (deep-link fallback, no server OAuth yet)
 *  - Instagram Reels (deep-link fallback)
 */

export const PLATFORMS = {
  YOUTUBE:   'YouTube Shorts',
  TIKTOK:    'TikTok',
  INSTAGRAM: 'Instagram Reels',
  LINKEDIN:  'LinkedIn',
} as const

export type Platform = typeof PLATFORMS[keyof typeof PLATFORMS]

// OAuth providers that support server-side publishing
export const OAUTH_PROVIDERS = ['youtube', 'linkedin'] as const
export type OAuthProvider = typeof OAUTH_PROVIDERS[number]

export function providerForPlatform(platform: string): OAuthProvider | null {
  if (platform === PLATFORMS.YOUTUBE) return 'youtube'
  if (platform === PLATFORMS.LINKEDIN) return 'linkedin'
  return null
}

// ── YouTube OAuth2 scopes ──────────────────────────────────────────────────
export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
].join(' ')

// ── LinkedIn OAuth2 scopes ─────────────────────────────────────────────────
export const LINKEDIN_SCOPES = [
  'openid',
  'profile',
  'w_member_social',
  'r_liteprofile',
].join(' ')

// ── TikTok share deep link ─────────────────────────────────────────────────
// TikTok doesn't support server-side video upload without TikTok for Developers approval
// Deep-link approach: open TikTok with pre-filled video via share URL
export function tiktokShareUrl(videoUrl: string, title: string): string {
  // Mobile deep link: opens TikTok and pre-selects video from URL (if supported)
  // Falls back to web TikTok creation page
  const caption = encodeURIComponent(title.slice(0, 150))
  return `https://www.tiktok.com/upload?lang=en&description=${caption}`
}

// ── Instagram share ────────────────────────────────────────────────────────
export function instagramShareUrl(): string {
  // Instagram has no web upload API — must use mobile app
  return 'https://www.instagram.com/'
}

// ── Export file size/format guidance ──────────────────────────────────────
export const PLATFORM_SPECS: Record<string, { maxMb: number; formats: string[]; aspectRatio: string; maxSec: number }> = {
  [PLATFORMS.YOUTUBE]:   { maxMb: 256,  formats: ['mp4','mov'],        aspectRatio: '9:16', maxSec: 60 },
  [PLATFORMS.TIKTOK]:    { maxMb: 287,  formats: ['mp4','mov','webm'], aspectRatio: '9:16', maxSec: 60 },
  [PLATFORMS.INSTAGRAM]: { maxMb: 100,  formats: ['mp4','mov'],        aspectRatio: '9:16', maxSec: 90 },
  [PLATFORMS.LINKEDIN]:  { maxMb: 5000, formats: ['mp4','avi','mov'],  aspectRatio: '16:9', maxSec: 600 },
}
