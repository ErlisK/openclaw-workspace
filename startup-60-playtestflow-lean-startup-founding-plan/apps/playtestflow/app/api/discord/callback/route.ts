import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import {
  exchangeCodeForToken,
  getDiscordUser,
  getUserGuilds,
  DISCORD_CLIENT_ID,
} from '@/lib/discord'

/**
 * GET /api/discord/callback
 * Handles Discord OAuth2 redirect.
 * Stores access + refresh tokens; syncs guild list.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://playtestflow.vercel.app'

  if (error) {
    return NextResponse.redirect(`${APP_URL}/dashboard/discord?error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/dashboard/discord?error=missing_params`)
  }

  // Validate state cookie
  const storedState = request.cookies.get('discord_oauth_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${APP_URL}/dashboard/discord?error=invalid_state`)
  }

  // Require authenticated user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${APP_URL}/auth/login?next=/dashboard/discord`)
  }

  if (!DISCORD_CLIENT_ID) {
    return NextResponse.redirect(`${APP_URL}/dashboard/discord?error=not_configured`)
  }

  try {
    // Exchange code for tokens
    const tokenData = await exchangeCodeForToken(code)
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

    // Fetch Discord identity
    const discordUser = await getDiscordUser(tokenData.access_token)

    // Fetch user's guilds
    const guilds = await getUserGuilds(tokenData.access_token)

    const svc = createServiceClient()

    // Upsert connection
    await svc.from('discord_connections').upsert({
      user_id: user.id,
      discord_user_id: discordUser.id,
      discord_username: `${discordUser.username}${discordUser.discriminator !== '0' ? '#' + discordUser.discriminator : ''}`,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: expiresAt,
      scopes: tokenData.scope.split(' '),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    // Sync guilds (upsert only — don't delete removed ones, user might re-add bot)
    if (guilds.length > 0) {
      const guildRows = guilds.map(g => ({
        user_id: user.id,
        guild_id: g.id,
        guild_name: g.name,
        guild_icon: g.icon ?? null,
        bot_installed: false, // user needs to add bot separately
      }))
      await svc.from('discord_guilds').upsert(guildRows, {
        onConflict: 'user_id,guild_id',
        ignoreDuplicates: true,
      })
    }

    // Clear state cookie and redirect
    const response = NextResponse.redirect(`${APP_URL}/dashboard/discord?connected=1`)
    response.cookies.set('discord_oauth_state', '', { maxAge: 0, path: '/' })
    return response
  } catch (err) {
    console.error('[discord/callback]', err)
    const msg = err instanceof Error ? err.message : 'OAuth failed'
    return NextResponse.redirect(`${APP_URL}/dashboard/discord?error=${encodeURIComponent(msg)}`)
  }
}
