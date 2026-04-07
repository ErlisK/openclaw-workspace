/**
 * lib/discord.ts
 * Discord OAuth2 + API helpers for PlaytestFlow integration.
 * Scopes: identify + guilds.join (no privileged intents needed)
 * 
 * Bot invite grants: Send Messages, Embed Links, Read Message History
 */

export const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID ?? ''
export const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET ?? ''
export const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN ?? ''
export const DISCORD_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/discord/callback`
  : 'https://playtestflow.vercel.app/api/discord/callback'

export const DISCORD_API_BASE = 'https://discord.com/api/v10'

// OAuth scopes — minimal: identify (who is this user?) + guilds (list their servers)
// guilds.join would let us add them to a server but we don't need that
export const DISCORD_SCOPES = ['identify', 'guilds']

// ── OAuth URLs ────────────────────────────────────────────────────────────────

export function getDiscordAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: DISCORD_SCOPES.join(' '),
    state,
    prompt: 'consent',
  })
  return `https://discord.com/api/oauth2/authorize?${params}`
}

// ── Token exchange ────────────────────────────────────────────────────────────

export interface DiscordTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}

export async function exchangeCodeForToken(code: string): Promise<DiscordTokenResponse> {
  const res = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: DISCORD_REDIRECT_URI,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Discord token exchange failed: ${err}`)
  }
  return res.json()
}

export async function refreshAccessToken(refreshToken: string): Promise<DiscordTokenResponse> {
  const res = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) throw new Error('Discord token refresh failed')
  return res.json()
}

// ── Discord API helpers ───────────────────────────────────────────────────────

export async function getDiscordUser(accessToken: string): Promise<{ id: string; username: string; discriminator: string; avatar: string | null }> {
  const res = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to fetch Discord user')
  return res.json()
}

export interface DiscordGuild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
}

export async function getUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
  const res = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to fetch guilds')
  return res.json()
}

export interface DiscordChannel {
  id: string
  name: string
  type: number  // 0 = GUILD_TEXT
  topic: string | null
  position: number
  parent_id: string | null
}

export async function getGuildChannels(guildId: string): Promise<DiscordChannel[]> {
  if (!DISCORD_BOT_TOKEN) return []
  const res = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
  })
  if (!res.ok) return []
  const channels: DiscordChannel[] = await res.json()
  // Return only text channels
  return channels.filter(c => c.type === 0).sort((a, b) => a.position - b.position)
}

// ── Post embed message ────────────────────────────────────────────────────────

export interface RecruitEmbed {
  title: string
  description: string
  color: number   // decimal color int
  url: string
  fields: Array<{ name: string; value: string; inline?: boolean }>
  footer?: { text: string; icon_url?: string }
  timestamp?: string
}

export async function postToChannel(opts: {
  channelId: string
  embed: RecruitEmbed
  content?: string
}): Promise<{ id: string; channel_id: string }> {
  if (!DISCORD_BOT_TOKEN) throw new Error('DISCORD_BOT_TOKEN not configured')

  const payload = {
    content: opts.content ?? '',
    embeds: [opts.embed],
  }

  const res = await fetch(`${DISCORD_API_BASE}/channels/${opts.channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(`Discord post failed (${res.status}): ${(err as { message: string }).message}`)
  }

  return res.json()
}

// ── Recruit embed builder ────────────────────────────────────────────────────

export function buildRecruitEmbed(opts: {
  sessionTitle: string
  gameDescription: string
  platform: string
  durationMinutes: number
  maxTesters: number
  scheduledAt?: string | null
  recruitUrl: string
  designerName?: string
}): RecruitEmbed {
  const fields = [
    { name: 'Platform', value: opts.platform || 'Online', inline: true },
    { name: 'Duration', value: `${opts.durationMinutes} min`, inline: true },
    { name: 'Spots Open', value: `${opts.maxTesters}`, inline: true },
  ]

  if (opts.scheduledAt) {
    const d = new Date(opts.scheduledAt)
    fields.push({
      name: 'Scheduled',
      value: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }),
      inline: false,
    })
  }

  return {
    title: opts.sessionTitle,
    description: opts.gameDescription || 'Join as a playtester and help shape this game!',
    color: 0xff6600,  // PlaytestFlow orange
    url: opts.recruitUrl,
    fields,
    footer: {
      text: opts.designerName
        ? `Posted via PlaytestFlow by ${opts.designerName}`
        : 'Posted via PlaytestFlow',
    },
    timestamp: new Date().toISOString(),
  }
}

// ── Bot invite URL ────────────────────────────────────────────────────────────

export function getBotInviteUrl(guildId?: string): string {
  // Permissions: Send Messages (2048) + Embed Links (16384) + View Channel (1024) = 19456
  const permissions = '19456'
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    permissions,
    scope: 'bot',
    ...(guildId ? { guild_id: guildId } : {}),
  })
  return `https://discord.com/api/oauth2/authorize?${params}`
}
