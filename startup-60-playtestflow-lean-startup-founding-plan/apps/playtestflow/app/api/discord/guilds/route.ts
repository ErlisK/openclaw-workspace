import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { getGuildChannels } from '@/lib/discord'

/**
 * GET /api/discord/guilds
 * Returns the list of guilds this user has synced, with bot_installed status.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = createServiceClient()
  const { data, error } = await svc
    .from('discord_guilds')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ guilds: data ?? [] })
}

/**
 * PATCH /api/discord/guilds
 * Update selected channel for a guild.
 * Body: { guild_id, channel_id, channel_name }
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { guild_id, channel_id, channel_name } = body
  if (!guild_id || !channel_id) {
    return NextResponse.json({ error: 'guild_id and channel_id required' }, { status: 400 })
  }

  const svc = createServiceClient()
  const { error } = await svc
    .from('discord_guilds')
    .update({ selected_channel_id: channel_id, selected_channel_name: channel_name ?? null })
    .eq('user_id', user.id)
    .eq('guild_id', guild_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
