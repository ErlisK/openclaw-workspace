import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/connect/linkedin/callback
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const stateB64 = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin

  if (error || !code || !stateB64) {
    return NextResponse.redirect(`${appUrl}/settings?connect_error=${error || 'missing_code'}`)
  }

  let state: { userId: string; returnTo: string }
  try {
    state = JSON.parse(Buffer.from(stateB64, 'base64url').toString())
  } catch {
    return NextResponse.redirect(`${appUrl}/settings?connect_error=invalid_state`)
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID!
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!
  const redirectUri = `${appUrl}/api/connect/linkedin/callback`

  // Exchange code for tokens
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    console.error('[LINKEDIN_CALLBACK] Token exchange failed:', err)
    return NextResponse.redirect(`${appUrl}/settings?connect_error=token_exchange_failed`)
  }

  const tokens = await tokenRes.json()
  const { access_token, expires_in } = tokens

  // Get LinkedIn profile (member ID + name)
  let memberId = ''
  let memberName = ''
  try {
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    if (profileRes.ok) {
      const profile = await profileRes.json()
      memberId = profile.sub || ''
      memberName = profile.name || profile.given_name || ''
    }
  } catch {}

  const supabase = createServiceClient()
  await supabase.from('oauth_connections').upsert({
    user_id: state.userId,
    provider: 'linkedin',
    access_token,
    refresh_token: null, // LinkedIn access tokens expire in 60 days, no refresh
    token_expires_at: expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null,
    scope: tokens.scope || '',
    provider_user_id: memberId,
    provider_username: memberName,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,provider' })

  return NextResponse.redirect(`${appUrl}${state.returnTo}?connect_success=linkedin`)
}
