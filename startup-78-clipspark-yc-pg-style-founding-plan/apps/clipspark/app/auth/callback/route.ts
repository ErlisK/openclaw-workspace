import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { trackServer } from '@/lib/analytics'
import { scheduleWelcomeSequence } from '@/lib/email-sequences'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL(`/auth/login?error=${error}`, url.origin))
  }

  if (code) {
    const supabase = await createClient()
    // Capture UTM params from cookie (set by landing page tracker)
    const cookieHeader = request.headers.get('cookie') || ''
    const utmSource = cookieHeader.match(/utm_source=([^;]+)/)?.[1] || url.searchParams.get('utm_source') || 'direct'
    const utmMedium = cookieHeader.match(/utm_medium=([^;]+)/)?.[1] || url.searchParams.get('utm_medium') || ''
    const utmCampaign = cookieHeader.match(/utm_campaign=([^;]+)/)?.[1] || url.searchParams.get('utm_campaign') || ''
    // Capture referral code from cookie or URL (set when landing with ?ref=XXX)
    const refCode = cookieHeader.match(/cs_ref=([^;]+)/)?.[1] || url.searchParams.get('ref') || ''
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!exchangeError && data.user) {
      const user = data.user
      const isNewUser = !!data.session?.user.created_at &&
        Math.abs(new Date(user.created_at).getTime() - Date.now()) < 30_000

      // Track signup vs login
      if (isNewUser) {
        trackServer(user.id, 'signup', {
          email: user.email,
          provider: user.app_metadata?.provider || 'email',
          referrer: request.headers.get('referer') || '',
          signup_source: utmSource,
          signup_medium: utmMedium,
          signup_campaign: utmCampaign,
        })
        // Persist source to user row
        await supabase.from('users').update({
          signup_source: utmSource,
          signup_medium: utmMedium,
          signup_campaign: utmCampaign,
          signup_referrer: request.headers.get('referer') || '',
        }).eq('id', user.id)

        // Schedule welcome email sequence for new users
        try {
          const svc = createServiceClient()
          await scheduleWelcomeSequence(svc as Parameters<typeof scheduleWelcomeSequence>[0], user.id, new Date())

          // Generate referral code for new user
          try {
            const { data: code } = await svc.rpc('generate_referral_code', { user_id: user.id })
            if (code) await svc.from('users').update({ referral_code: code as string }).eq('id', user.id)
          } catch { /* ignore */ }

          // Redeem referral code if present
          if (refCode) {
            await fetch(`${url.origin}/api/referral`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ referral_code: refCode }),
            }).catch(() => {})
          }
        } catch (e) {
          console.error('[auth/callback] Failed to schedule welcome sequence:', e)
        }
      } else {
        trackServer(user.id, 'login', {
          provider: user.app_metadata?.provider || 'email',
        })
      }

      // Identify user in PostHog with traits
      const { data: profile } = await supabase
        .from('users')
        .select('onboarding_done, is_alpha, plan, creator_type, creator_niche')
        .eq('id', user.id)
        .single()

      // Set user properties via $identify
      const ph_key = process.env.NEXT_PUBLIC_POSTHOG_KEY
      const ph_host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
      if (ph_key) {
        fetch(`${ph_host}/capture/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: ph_key,
            event: '$identify',
            distinct_id: user.id,
            properties: {
              $set: {
                email: user.email,
                plan: profile?.plan || 'free',
                is_alpha: profile?.is_alpha || false,
                onboarding_done: profile?.onboarding_done || false,
                created_at: user.created_at,
                signup_source: utmSource || 'direct',
                signup_medium: utmMedium || '',
                signup_campaign: utmCampaign || '',
                creator_type: profile?.creator_type || '',
                creator_niche: profile?.creator_niche || '',
                // Derived persona for cohort segmentation
                persona: (() => {
                  const t = profile?.creator_type || ''
                  const n = profile?.creator_niche || ''
                  if (t === 'founder' || n === 'founder_podcast') return 'founder'
                  if (t === 'podcaster' || n === 'business_podcast') return 'podcaster'
                  if (t === 'coach') return 'coach'
                  if (t === 'educator') return 'educator'
                  return t || 'other'
                })(),
              },
            },
          }),
        }).catch(() => {})
      }

      if (!profile?.onboarding_done) {
        return NextResponse.redirect(new URL('/onboarding', url.origin))
      }
    }
  }

  return NextResponse.redirect(new URL('/dashboard', url.origin))
}
