import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { YOUTUBE_SCOPES } from '@/lib/export'

// GET /api/connect/youtube/auth — initiates Google OAuth2 flow
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 503 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  const redirectUri = `${appUrl}/api/connect/youtube/callback`

  // State: base64-encode userId + return URL
  const returnTo = req.nextUrl.searchParams.get('return_to') || '/settings'
  const state = Buffer.from(JSON.stringify({ userId: user.id, returnTo })).toString('base64url')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: YOUTUBE_SCOPES,
    access_type: 'offline',     // request refresh_token
    prompt: 'consent',          // always show consent to get refresh_token
    state,
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
