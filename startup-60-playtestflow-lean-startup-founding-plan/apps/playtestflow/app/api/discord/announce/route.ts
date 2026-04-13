import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import {
  postToChannel,
  buildRecruitEmbed,
  DISCORD_BOT_TOKEN,
} from '@/lib/discord'

/**
 * POST /api/discord/announce
 * Posts a recruit announcement embed to a Discord channel.
 * 
 * Body: {
 *   session_id?: string      — optional, links post to session record
 *   guild_id: string
 *   channel_id: string
 *   channel_name?: string
 *   guild_name?: string
 *   // Override embed content (all optional — pulled from session if session_id provided)
 *   title?: string
 *   description?: string
 *   platform?: string
 *   duration_minutes?: number
 *   max_testers?: number
 *   scheduled_at?: string
 *   recruit_url: string       — required: the signup link
 * }
 * 
 * Returns: { ok: true, post_id, message_id } or { error }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const {
    session_id,
    guild_id,
    channel_id,
    channel_name,
    guild_name,
    title,
    description,
    platform,
    duration_minutes,
    max_testers,
    scheduled_at,
    recruit_url,
  } = body

  if (!guild_id || !channel_id) {
    return NextResponse.json({ error: 'guild_id and channel_id are required' }, { status: 400 })
  }
  if (!recruit_url) {
    return NextResponse.json({ error: 'recruit_url is required' }, { status: 400 })
  }

  const svc = createServiceClient()

  // Verify guild belongs to this user
  const { data: guild } = await svc
    .from('discord_guilds')
    .select('guild_name, selected_channel_name, bot_installed')
    .eq('user_id', user.id)
    .eq('guild_id', guild_id)
    .single()

  if (!guild) {
    return NextResponse.json({ error: 'Guild not found or not connected' }, { status: 404 })
  }

  // Fetch session details if session_id provided
  let sessionData: Record<string, unknown> | null = null

  if (session_id) {
    const { data } = await svc
      .from('playtest_sessions')
      .select('title, platform, duration_minutes, max_testers, scheduled_at, recruit_url')
      .eq('id', session_id)
      .eq('designer_id', user.id)
      .single()
    sessionData = data as Record<string, unknown> | null
  }

  // Build embed
  const embed = buildRecruitEmbed({
    sessionTitle: title ?? (sessionData?.title as string) ?? 'Playtest Session Open',
    gameDescription: description ?? 'Join as a playtester and help shape this game!',
    platform: platform ?? (sessionData?.platform as string) ?? 'Online',
    durationMinutes: duration_minutes ?? (sessionData?.duration_minutes as number) ?? 90,
    maxTesters: max_testers ?? (sessionData?.max_testers as number) ?? 4,
    scheduledAt: scheduled_at ?? (sessionData?.scheduled_at as string) ?? null,
    recruitUrl: recruit_url,
    designerName: user.email?.split('@')[0],
  })

  const resolvedGuildName = guild_name ?? guild.guild_name ?? 'Unknown Server'
  const resolvedChannelName = channel_name ?? guild.selected_channel_name ?? 'channel'

  // Create pending post record
  const { data: postRecord, error: insertErr } = await svc
    .from('discord_posts')
    .insert({
      user_id: user.id,
      session_id: session_id ?? null,
      guild_id,
      channel_id,
      guild_name: resolvedGuildName,
      channel_name: resolvedChannelName,
      discord_message: embed,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertErr || !postRecord) {
    return NextResponse.json({ error: 'Failed to create post record' }, { status: 500 })
  }

  // Check if bot is configured
  if (!DISCORD_BOT_TOKEN) {
    // In dev/demo mode: mark as "sent" with a fake message ID
    await svc.from('discord_posts').update({
      status: 'sent',
      message_id: `demo_${Date.now()}`,
      sent_at: new Date().toISOString(),
    }).eq('id', postRecord.id)

    return NextResponse.json({
      ok: true,
      post_id: postRecord.id,
      message_id: `demo_${Date.now()}`,
      demo_mode: true,
      message: 'Posted in demo mode (DISCORD_BOT_TOKEN not configured). Set bot token to post to real servers.',
    })
  }

  // Post to Discord
  try {
    const message = await postToChannel({ channelId: channel_id, embed })

    await svc.from('discord_posts').update({
      status: 'sent',
      message_id: message.id,
      sent_at: new Date().toISOString(),
    }).eq('id', postRecord.id)

    return NextResponse.json({
      ok: true,
      post_id: postRecord.id,
      message_id: message.id,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Discord API error'
    await svc.from('discord_posts').update({
      status: 'failed',
      error_message: msg,
    }).eq('id', postRecord.id)

    return NextResponse.json({ error: msg, post_id: postRecord.id }, { status: 502 })
  }
}

/**
 * GET /api/discord/announce
 * List recent announce posts for the current user.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = createServiceClient()
  const { data, error } = await svc
    .from('discord_posts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const stats = {
    total: data?.length ?? 0,
    sent: data?.filter(p => p.status === 'sent').length ?? 0,
    failed: data?.filter(p => p.status === 'failed').length ?? 0,
    total_clicks: data?.reduce((s, p) => s + (p.clicks ?? 0), 0) ?? 0,
    total_signups: data?.reduce((s, p) => s + (p.signups ?? 0), 0) ?? 0,
  }

  return NextResponse.json({ posts: data ?? [], stats })
}
