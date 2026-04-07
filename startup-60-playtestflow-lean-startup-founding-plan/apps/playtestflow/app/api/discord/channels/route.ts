import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { getGuildChannels, DISCORD_BOT_TOKEN } from '@/lib/discord'

/**
 * GET /api/discord/channels?guild_id=...
 * Returns text channels for a guild (requires bot to be in the server).
 * Falls back to the stored selected_channel if bot isn't installed.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const guildId = new URL(request.url).searchParams.get('guild_id')
  if (!guildId) return NextResponse.json({ error: 'guild_id required' }, { status: 400 })

  // Verify ownership
  const svc = createServiceClient()
  const { data: guild } = await svc
    .from('discord_guilds')
    .select('*')
    .eq('user_id', user.id)
    .eq('guild_id', guildId)
    .single()

  if (!guild) return NextResponse.json({ error: 'Guild not found' }, { status: 404 })

  // Try to fetch live channels via bot token
  if (DISCORD_BOT_TOKEN) {
    const channels = await getGuildChannels(guildId)
    if (channels.length > 0) {
      // Mark guild as bot_installed
      await svc.from('discord_guilds').update({ bot_installed: true }).eq('user_id', user.id).eq('guild_id', guildId)
      return NextResponse.json({ channels, bot_installed: true })
    }
  }

  // Fallback: return the stored selected channel only
  const fallback = guild.selected_channel_id
    ? [{ id: guild.selected_channel_id, name: guild.selected_channel_name ?? 'selected-channel', type: 0, topic: null, position: 0, parent_id: null }]
    : []

  return NextResponse.json({
    channels: fallback,
    bot_installed: false,
    bot_install_url: `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=19456&scope=bot&guild_id=${guildId}`,
  })
}
