'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewProjectPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [gameType, setGameType] = useState('board_game')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [upgradeRequired, setUpgradeRequired] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setUpgradeRequired(false)

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: description || null, game_type: gameType }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Failed to create project')
      if (data.upgrade_required) setUpgradeRequired(true)
      setLoading(false)
      return
    }

    router.push(`/dashboard/projects/${data.project.id}`)
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">New Project</h1>
        <p className="text-gray-400 text-sm mt-1">A project holds your rule versions and playtest sessions.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Game name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Starfall Tactics"
              className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your game..."
              rows={3}
              className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Game type
            </label>
            <select
              value={gameType}
              onChange={(e) => setGameType(e.target.value)}
              className="w-full bg-[#0d1117] border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
            >
              <option value="board_game">Board Game</option>
              <option value="ttrpg">TTRPG / RPG</option>
              <option value="card_game">Card Game</option>
              <option value="wargame">Wargame</option>
              <option value="other">Other</option>
            </select>
          </div>

          {error && (
            <div className={`text-sm rounded-lg px-4 py-3 ${upgradeRequired ? 'text-orange-300 bg-orange-500/10 border border-orange-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/20'}`}>
              <div>{error}</div>
              {upgradeRequired && (
                <Link href="/pricing" className="inline-block mt-2 text-orange-400 font-semibold underline underline-offset-2">
                  View upgrade options →
                </Link>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 border border-white/20 hover:border-white/40 text-white py-3 rounded-xl font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm transition-colors"
            >
              {loading ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
