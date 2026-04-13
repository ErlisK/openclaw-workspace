import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/connect/youtube/callback — Google OAuth2 callback
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

  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri = `${appUrl}/api/connect/youtube/callback`

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    console.error('[YOUTUBE_CALLBACK] Token exchange failed:', err)
    return NextResponse.redirect(`${appUrl}/settings?connect_error=token_exchange_failed`)
  }

  const tokens = await tokenRes.json()
  const { access_token, refresh_token, expires_in } = tokens

  // Get YouTube channel info
  let channelName = ''
  let channelId = ''
  try {
    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { headers: { Authorization: `Bearer ${access_token}` } }
    )
    if (channelRes.ok) {
      const data = await channelRes.json()
      const channel = data.items?.[0]
      channelName = channel?.snippet?.title || ''
      channelId = channel?.id || ''
    }
  } catch {}

  // Store tokens in oauth_connections
  const supabase = createServiceClient()
  await supabase.from('oauth_connections').upsert({
    user_id: state.userId,
    provider: 'youtube',
    access_token,
    refresh_token: refresh_token || null,
    token_expires_at: expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null,
    scope: tokens.scope || '',
    provider_user_id: channelId,
    provider_username: channelName,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,provider' })

  return NextResponse.redirect(`${appUrl}${state.returnTo}?connect_success=youtube`)
}
