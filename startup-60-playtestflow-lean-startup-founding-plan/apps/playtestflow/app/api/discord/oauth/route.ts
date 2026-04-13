import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getDiscordAuthUrl, DISCORD_CLIENT_ID } from '@/lib/discord'
import { randomBytes } from 'crypto'

/**
 * GET /api/discord/oauth
 * Initiates Discord OAuth2 flow.
 * Stores PKCE-style state in a cookie to prevent CSRF.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!DISCORD_CLIENT_ID) {
    return NextResponse.json({
      error: 'Discord integration not configured',
      setup_required: true,
      message: 'Set DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, and DISCORD_BOT_TOKEN in Vercel environment variables.',
    }, { status: 503 })
  }

  const state = randomBytes(16).toString('hex')
  const authUrl = getDiscordAuthUrl(state)

  const response = NextResponse.redirect(authUrl)
  // Store state in cookie (HttpOnly, SameSite=Lax, 10-min TTL)
  response.cookies.set('discord_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}
