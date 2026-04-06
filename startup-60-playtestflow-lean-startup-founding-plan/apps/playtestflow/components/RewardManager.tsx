'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Project { id: string; name: string }

export default function RewardManager({ projects }: { projects: Project[] }) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')
  const [codesText, setCodesText] = useState('')
  const [rewardType, setRewardType] = useState('gift_card')
  const [rewardValue, setRewardValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const router = useRouter()

  async function handleImport(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    const codes = codesText
      .split(/[\n,]/)
      .map((c) => c.trim())
      .filter(Boolean)

    const res = await fetch('/api/rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, codes, rewardType, rewardValue }),
    })
    const data = await res.json()
    setLoading(false)

    if (data.success) {
      setResult(`✓ Imported ${data.created} reward code${data.created !== 1 ? 's' : ''}.`)
      setCodesText('')
      router.refresh()
    } else {
      setResult(`Error: ${data.error}`)
    }
  }

  if (projects.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <p className="text-gray-400 text-sm">Create a project first to manage rewards.</p>
      </div>
    )
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h2 className="font-semibold mb-4">Import Reward Codes</h2>
      <form onSubmit={handleImport} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-[#0d1117] border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Reward type</label>
            <select
              value={rewardType}
              onChange={(e) => setRewardType(e.target.value)}
              className="w-full bg-[#0d1117] border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
            >
              <option value="gift_card">Gift Card</option>
              <option value="discount_code">Discount Code</option>
              <option value="store_credit">Store Credit</option>
              <option value="recognition">Recognition</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Reward value <span className="text-gray-600">(optional, e.g. "$5 Amazon")</span>
          </label>
          <input
            type="text"
            value={rewardValue}
            onChange={(e) => setRewardValue(e.target.value)}
            placeholder="$5 Amazon gift card"
            className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Codes <span className="text-gray-600">(one per line, or comma-separated)</span>
          </label>
          <textarea
            value={codesText}
            onChange={(e) => setCodesText(e.target.value)}
            required
            placeholder={"PLAY2025-ABCD\nPLAY2025-EFGH\nPLAY2025-IJKL"}
            rows={4}
            className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-orange-500 resize-none"
          />
        </div>

        {result && (
          <p className={`text-sm ${result.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
            {result}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !codesText || !projectId}
          className="bg-orange-500/20 hover:bg-orange-500/40 border border-orange-500/30 disabled:opacity-40 text-orange-400 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? 'Importing…' : 'Import Codes'}
        </button>
      </form>
    </div>
  )
}
