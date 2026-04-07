import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase-server'
import { lookupCode } from '@/lib/referral'

export const dynamic = 'force-dynamic'

/**
 * /r/[code] — Referral link landing page
 *
 * Records a click, sets a cookie with the referral code,
 * and redirects to the signup page with ?ref= param.
 * The signup page reads the cookie/param and calls /api/referral/convert
 * after the user completes registration.
 */
export default async function ReferralRedirectPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://playtestflow.vercel.app'

  // Validate code
  const info = await lookupCode(code)
  if (!info) {
    redirect(`${APP_URL}/auth/signup?ref_invalid=1`)
  }

  // Log click in partner_attributions (fire-and-forget)
  try {
    const svc = createServiceClient()
    await svc.from('partner_attributions').insert({
      partner_slug: info.campaign ?? 'referral',
      partner_name: info.campaign ?? 'Referral',
      referral_code_id: info.id,
      event_type: 'click',
    })
  } catch {
    // non-critical
  }

  // Redirect to signup with code param (cookie set client-side via JS on landing)
  redirect(`/auth/signup?ref=${encodeURIComponent(info.code)}&utm_source=referral&utm_medium=code&utm_campaign=${encodeURIComponent(info.campaign ?? 'referral')}`)
}
