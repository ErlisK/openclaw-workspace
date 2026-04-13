/**
 * lib/analytics.server.ts
 * Server-only analytics helpers. DO NOT import from client components.
 */
import type { AnalyticsEvent } from './analytics'
import { createAdminClient } from '@/lib/supabase'

export async function trackServer(
  event: AnalyticsEvent,
  userId: string | null,
  orgId: string | null,
  properties?: Record<string, unknown>
) {
  try {
    const admin = createAdminClient()
    await admin.from('analytics_events').insert({
      user_id: userId,
      organization_id: orgId,
      event_name: event,
      properties: properties || {},
    })
  } catch {
    // never throw
  }
}
