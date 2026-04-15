import { redirect, notFound } from 'next/navigation'
import { getLinkBySlug, buildRedirectUrl } from '@/lib/utm/links'
import { headers } from 'next/headers'

interface Props {
  params: Promise<{ slug: string }>
}

/**
 * /r/[slug] — UTM short-link redirector
 *
 * 1. Looks up the slug in the UTM link registry
 * 2. Builds the destination URL with all utm_* params
 * 3. Issues a 307 (temporary) redirect so browsers always re-check
 *    (keeps PostHog pageview on the destination page)
 * 4. Logs to PostHog server-side via the capture API so even
 *    bots/crawlers that don't execute JS are counted
 */
export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params
  const link = getLinkBySlug(slug)
  if (!link) notFound()

  const destination = buildRedirectUrl(link)

  // Server-side PostHog event (fires for ALL requests including bots)
  const phKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const phHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
  if (phKey) {
    const hdrs = await headers()
    const ip = hdrs.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    const ua = hdrs.get('user-agent') ?? ''
    const referer = hdrs.get('referer') ?? ''

    // Fire-and-forget — don't await so we don't block the redirect
    fetch(`${phHost}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: phKey,
        event: 'short_link_click',
        distinct_id: ip, // best effort; PostHog merges later
        properties: {
          slug,
          label: link.label,
          destination,
          utm_source: link.utm_source,
          utm_medium: link.utm_medium,
          utm_campaign: link.utm_campaign,
          utm_content: link.utm_content ?? null,
          category: link.category,
          $ip: ip,
          $user_agent: ua,
          $referrer: referer,
        },
      }),
    }).catch(() => {/* ignore capture failures */})
  }

  // 307 preserves request method; client-side PostHog picks up the utm_* on landing
  return redirect(destination, 307)
}
