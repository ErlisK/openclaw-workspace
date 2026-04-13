/**
 * Admin utilities for PlaytestFlow.
 *
 * System-admin access is controlled by the ADMIN_USER_IDS environment variable:
 * a comma-separated list of Supabase user UUIDs that are granted admin privileges.
 *
 * Example (in .env.local or Vercel env vars):
 *   ADMIN_USER_IDS=uuid-1,uuid-2
 */

/** Returns the set of admin user IDs from the environment. */
export function getAdminIds(): Set<string> {
  const raw = process.env.ADMIN_USER_IDS ?? ''
  return new Set(raw.split(',').map(s => s.trim()).filter(Boolean))
}

/** Returns true if the given user ID is a system admin. */
export function isAdmin(userId: string | undefined | null): boolean {
  if (!userId) return false
  return getAdminIds().has(userId)
}

/**
 * The set of dashboard route prefixes that are restricted to system admins.
 * These paths are hidden from the nav and blocked at both middleware and page level.
 */
export const ADMIN_ROUTES = [
  '/dashboard/status',
  '/dashboard/fraud',
  '/dashboard/ab',
  '/dashboard/activation',
  '/dashboard/conversion',
  '/dashboard/price-research',
  '/dashboard/nps-pmf',
  '/dashboard/monetization',
  '/dashboard/partners',
] as const

/** Returns true if the given pathname is an admin-only dashboard route. */
export function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'))
}

/**
 * The set of API route prefixes that are restricted to system admins.
 */
export const ADMIN_API_ROUTES = [
  '/api/metrics',
  '/api/observability',
  '/api/fraud/score',
  '/api/cron/uptime',
  '/api/cron/follow-up',
  '/api/cron/reminders',
  '/api/cron/retention',
] as const

/** Returns true if the given pathname is an admin-only API route. */
export function isAdminApiRoute(pathname: string): boolean {
  return ADMIN_API_ROUTES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'))
}
