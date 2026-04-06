'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

const STATUSES = ['draft', 'recruiting', 'scheduled', 'running', 'completed', 'cancelled']

export default function SessionStatusUpdater({
  sessionId,
  currentStatus,
}: {
  sessionId: string
  currentStatus: string
}) {
  const [status, setStatus] = useState(currentStatus)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function updateStatus(newStatus: string) {
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('playtest_sessions')
      .update({ status: newStatus })
      .eq('id', sessionId)
    setStatus(newStatus)
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Status:</span>
      <select
        value={status}
        onChange={(e) => updateStatus(e.target.value)}
        disabled={saving}
        className="bg-[#0d1117] border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  )
}
