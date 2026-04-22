export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/$/, '')

if (typeof window === 'undefined' && !APP_URL) {
  // Only throw on server-side where it's critical for SEO/metadata
  console.warn('NEXT_PUBLIC_APP_URL not configured, falling back to giganalytics.app')
}

export const SAFE_APP_URL = APP_URL || 'https://www.hourlyroi.com'
