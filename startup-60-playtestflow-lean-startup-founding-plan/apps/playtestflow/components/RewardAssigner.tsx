'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Reward {
  id: string
  code: string
  reward_type: string
  reward_value: string | null
  status: string
}

export default function RewardAssigner({
  signupId,
  signupName,
  availableRewards,
  assignedReward,
}: {
  signupId: string
  signupName: string
  availableRewards: Reward[]
  assignedReward?: Reward
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  if (assignedReward) {
    return (
      <span className="text-xs font-mono text-green-400" title={`Assigned: ${assignedReward.code}`}>
        ✓ {assignedReward.code.slice(0, 12)}…
      </span>
    )
  }

  if (availableRewards.length === 0) {
    return <span className="text-xs text-gray-600">No codes available</span>
  }

  async function assign() {
    setLoading(true)
    const reward = availableRewards[0]
    const res = await fetch('/api/rewards', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codeId: reward.id, signupId }),
    })
    setLoading(false)
    if (res.ok) router.refresh()
  }

  return (
    <button
      onClick={assign}
      disabled={loading}
      className="text-xs text-orange-400 hover:text-orange-300 underline disabled:opacity-50 transition-colors"
      title={`Assign a reward code to ${signupName}`}
    >
      {loading ? 'Assigning…' : 'Assign code'}
    </button>
  )
}
