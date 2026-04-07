import { createClient, createServiceClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DiscordConnectButton from './DiscordConnectButton'
import DiscordAnnounceForm from './DiscordAnnounceForm'
import { getBotInviteUrl } from '@/lib/discord'

export const dynamic = 'force-dynamic'

async function getDiscordData(userId: string) {
  const svc = createServiceClient()
  const [conn, guilds, posts, sessions] = await Promise.all([
    svc.from('discord_connections').select('*').eq('user_id', userId).single(),
    svc.from('discord_guilds').select('*').eq('user_id', userId).order('created_at'),
    svc.from('discord_posts').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    svc.from('playtest_sessions')
      .select('id, title, platform, duration_minutes, max_testers, scheduled_at, recruit_url')
      .eq('designer_id', userId)
      .eq('status', 'recruiting')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  return {
    connection: conn.data,
    guilds: guilds.data ?? [],
    posts: posts.data ?? [],
    sessions: sessions.data ?? [],
  }
}

export default async function DiscordPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const resolvedParams = await searchParams
  const { connected, error } = resolvedParams
  const { connection, guilds, posts, sessions } = await getDiscordData(user.id)

  const stats = {
    total: posts.length,
    sent: posts.filter(p => p.status === 'sent').length,
    failed: posts.filter(p => p.status === 'failed').length,
    clicks: posts.reduce((s, p) => s + (p.clicks ?? 0), 0),
    signups: posts.reduce((s, p) => s + (p.signups ?? 0), 0),
  }

  const botInviteUrl = getBotInviteUrl()
  const isConfigured = !!process.env.DISCORD_CLIENT_ID

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-2xl">🎮</span> Discord Integration
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Post recruit announcements directly to your Discord servers
          </p>
        </div>
        {connection && (
          <div className="text-right text-sm">
            <div className="text-xs text-gray-500">Connected as</div>
            <div className="font-medium text-indigo-300">{connection.discord_username}</div>
          </div>
        )}
      </div>

      {/* Status banners */}
      {connected === '1' && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-sm text-green-300">
          Discord connected successfully! Select a server and channel to start posting.
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-300">
          Discord connection failed: {decodeURIComponent(error)}
        </div>
      )}
      {!isConfigured && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-5 py-4 text-sm text-yellow-300">
          <div className="font-semibold mb-1">Setup required</div>
          <p className="text-yellow-400 text-xs leading-relaxed">
            Add <code className="bg-black/30 px-1 rounded">DISCORD_CLIENT_ID</code>,{' '}
            <code className="bg-black/30 px-1 rounded">DISCORD_CLIENT_SECRET</code>, and{' '}
            <code className="bg-black/30 px-1 rounded">DISCORD_BOT_TOKEN</code> to your Vercel environment variables,
            then create a Discord application at{' '}
            <a href="https://discord.com/developers/applications" target="_blank" className="underline">
              discord.com/developers
            </a>
            . The integration works in demo mode until then.
          </p>
        </div>
      )}

      {/* Stats */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total Posts', value: stats.total, color: 'text-white' },
            { label: 'Sent', value: stats.sent, color: 'text-green-400' },
            { label: 'Failed', value: stats.failed, color: stats.failed > 0 ? 'text-red-400' : 'text-gray-500' },
            { label: 'Link Clicks', value: stats.clicks, color: 'text-blue-400' },
            { label: 'Signups', value: stats.signups, color: 'text-orange-400' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-500 mb-0.5">{s.label}</div>
              <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Connection panel */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
          <h2 className="font-semibold">1. Connect Discord Account</h2>

          {connection ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-sm">
                  {connection.discord_username?.[0]?.toUpperCase() ?? 'D'}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{connection.discord_username}</div>
                  <div className="text-xs text-gray-500">Scopes: {connection.scopes?.join(', ')}</div>
                </div>
                <div className="ml-auto text-xs text-green-400 font-medium">✓ Connected</div>
              </div>
              <DiscordConnectButton mode="reconnect" />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 leading-relaxed">
                Connect your Discord account to see your servers and post recruit announcements.
                We request <strong>identify + guilds</strong> scopes only — read-only access to list your servers.
              </p>
              <DiscordConnectButton mode="connect" />
            </div>
          )}

          {/* Step 2: Add bot */}
          <div className="border-t border-white/8 pt-4">
            <h2 className="font-semibold mb-2">2. Add Bot to Your Server</h2>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              The PlaytestFlow bot needs to be in your server to post messages.
              It only has <strong>Send Messages + Embed Links</strong> permissions — no moderation.
            </p>
            <a
              href={botInviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors w-full justify-center"
            >
              <span>🤖</span> Add PlaytestFlow Bot →
            </a>
          </div>
        </div>

        {/* Announce form */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="font-semibold mb-4">3. Post Recruit Announcement</h2>
          {guilds.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-6">
              Connect Discord and add the bot to your server first.
            </div>
          ) : (
            <DiscordAnnounceForm
              guilds={guilds}
              sessions={sessions}
              userId={user.id}
            />
          )}
        </div>
      </div>

      {/* Post history */}
      {posts.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Recent Posts</h3>
          <div className="space-y-2">
            {posts.slice(0, 10).map(post => (
              <div key={post.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  post.status === 'sent' ? 'bg-green-400' :
                  post.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">#{post.channel_name}</div>
                  <div className="text-xs text-gray-500">{post.guild_name}</div>
                </div>
                <div className="text-xs text-gray-500 text-right flex-shrink-0">
                  {post.clicks > 0 && <span className="text-blue-400 mr-2">{post.clicks} clicks</span>}
                  {post.signups > 0 && <span className="text-orange-400 mr-2">{post.signups} signups</span>}
                  {post.status === 'failed' && <span className="text-red-400">Failed</span>}
                  <div>{new Date(post.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
