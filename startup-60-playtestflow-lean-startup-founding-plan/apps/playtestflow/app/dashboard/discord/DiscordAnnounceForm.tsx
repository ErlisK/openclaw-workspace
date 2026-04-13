'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Guild {
  id: string
  guild_id: string
  guild_name: string
  guild_icon: string | null
  bot_installed: boolean
  selected_channel_id: string | null
  selected_channel_name: string | null
}

interface Session {
  id: string
  title: string
  platform: string | null
  duration_minutes: number | null
  max_testers: number | null
  scheduled_at: string | null
  recruit_url: string | null
}

interface Channel {
  id: string
  name: string
}

interface Props {
  guilds: Guild[]
  sessions: Session[]
  userId: string
}

export default function DiscordAnnounceForm({ guilds, sessions }: Props) {
  const [selectedGuildId, setSelectedGuildId] = useState(guilds[0]?.guild_id ?? '')
  const [selectedChannelId, setSelectedChannelId] = useState('')
  const [channels, setChannels] = useState<Channel[]>([])
  const [loadingChannels, setLoadingChannels] = useState(false)
  const [botInstallUrl, setBotInstallUrl] = useState('')

  const [selectedSessionId, setSelectedSessionId] = useState(sessions[0]?.id ?? '')
  const [customTitle, setCustomTitle] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [recruitUrl, setRecruitUrl] = useState(sessions[0]?.recruit_url ?? '')

  const [posting, setPosting] = useState(false)
  const [result, setResult] = useState<{ ok?: boolean; error?: string; demo_mode?: boolean; message?: string } | null>(null)
  const router = useRouter()

  const selectedGuild = guilds.find(g => g.guild_id === selectedGuildId)

  // Load channels when guild changes
  useEffect(() => {
    if (!selectedGuildId) return
    setLoadingChannels(true)
    setChannels([])
    setBotInstallUrl('')
    fetch(`/api/discord/channels?guild_id=${selectedGuildId}`)
      .then(r => r.json())
      .then(data => {
        if (data.channels?.length) {
          setChannels(data.channels)
          setSelectedChannelId(data.channels[0]?.id ?? '')
        }
        if (data.bot_install_url) setBotInstallUrl(data.bot_install_url)
      })
      .catch(() => {})
      .finally(() => setLoadingChannels(false))
  }, [selectedGuildId])

  // Sync recruit_url when session changes
  useEffect(() => {
    const s = sessions.find(s => s.id === selectedSessionId)
    if (s?.recruit_url) setRecruitUrl(s.recruit_url)
  }, [selectedSessionId, sessions])

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedGuildId || !recruitUrl) return
    setPosting(true)
    setResult(null)

    const selectedSession = sessions.find(s => s.id === selectedSessionId)
    const channelName = channels.find(c => c.id === selectedChannelId)?.name ?? selectedGuild?.selected_channel_name ?? ''

    try {
      const res = await fetch('/api/discord/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: selectedSessionId || null,
          guild_id: selectedGuildId,
          channel_id: selectedChannelId || selectedGuild?.selected_channel_id,
          channel_name: channelName,
          guild_name: selectedGuild?.guild_name,
          title: customTitle || selectedSession?.title,
          description: customDescription || null,
          platform: selectedSession?.platform,
          duration_minutes: selectedSession?.duration_minutes,
          max_testers: selectedSession?.max_testers,
          scheduled_at: selectedSession?.scheduled_at,
          recruit_url: recruitUrl,
        }),
      })
      const data = await res.json()
      setResult(data)
      if (data.ok) {
        router.refresh()
        setCustomTitle('')
        setCustomDescription('')
      }
    } catch {
      setResult({ error: 'Network error' })
    } finally {
      setPosting(false)
    }
  }

  return (
    <form onSubmit={handlePost} className="space-y-4">
      {/* Guild selector */}
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Server</label>
        <div className="space-y-1.5">
          {guilds.map(g => (
            <button
              key={g.guild_id}
              type="button"
              onClick={() => setSelectedGuildId(g.guild_id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all flex items-center gap-2.5 ${
                selectedGuildId === g.guild_id
                  ? 'border-indigo-500/40 bg-indigo-500/10 text-white'
                  : 'border-white/8 bg-white/3 text-gray-300 hover:bg-white/6'
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-300 flex-shrink-0">
                {g.guild_name[0]}
              </span>
              <span className="truncate">{g.guild_name}</span>
              {g.bot_installed && (
                <span className="ml-auto text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded flex-shrink-0">bot</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Channel */}
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Channel</label>
        {loadingChannels ? (
          <div className="text-xs text-gray-500 py-2">Loading channels...</div>
        ) : channels.length > 0 ? (
          <select
            value={selectedChannelId}
            onChange={e => setSelectedChannelId(e.target.value)}
            className="w-full bg-[#0d1117] border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
          >
            {channels.map(c => (
              <option key={c.id} value={c.id}>#{c.name}</option>
            ))}
          </select>
        ) : botInstallUrl ? (
          <div className="text-xs text-gray-500">
            <a href={botInstallUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">
              Add bot to this server
            </a> to select a channel, or enter a channel ID manually.
          </div>
        ) : (
          <div className="text-xs text-gray-500">Select a server first</div>
        )}
      </div>

      {/* Session */}
      {sessions.length > 0 && (
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Link to session (optional)</label>
          <select
            value={selectedSessionId}
            onChange={e => setSelectedSessionId(e.target.value)}
            className="w-full bg-[#0d1117] border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="">None (custom post)</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Recruit URL */}
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">
          Recruit link <span className="text-red-400">*</span>
        </label>
        <input
          type="url"
          value={recruitUrl}
          onChange={e => setRecruitUrl(e.target.value)}
          required
          placeholder="https://playtestflow.vercel.app/recruit/..."
          className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* Custom title override */}
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Custom title (optional)</label>
        <input
          type="text"
          value={customTitle}
          onChange={e => setCustomTitle(e.target.value)}
          placeholder={sessions.find(s => s.id === selectedSessionId)?.title ?? 'Playtest Session Open!'}
          className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* Result */}
      {result && (
        <div className={`text-xs rounded-xl px-3 py-2.5 border ${
          result.ok
            ? 'text-green-300 bg-green-500/10 border-green-500/20'
            : 'text-red-300 bg-red-500/10 border-red-500/20'
        }`}>
          {result.ok ? (
            result.demo_mode
              ? `Demo: ${result.message}`
              : 'Posted successfully!'
          ) : `Error: ${result.error}`}
        </div>
      )}

      <button
        type="submit"
        disabled={posting || !selectedGuildId || !recruitUrl}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
      >
        {posting ? 'Posting...' : 'Post Announcement'}
      </button>

      <p className="text-[10px] text-gray-600 text-center leading-relaxed">
        Posting will send an embed message to the selected channel with your recruit link.
        Members click through to sign up as testers.
      </p>
    </form>
  )
}
