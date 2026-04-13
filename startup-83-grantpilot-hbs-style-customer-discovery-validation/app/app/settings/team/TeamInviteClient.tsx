'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'

const ROLES = [
  { value: 'member', label: 'Member — can create and edit applications' },
  { value: 'admin', label: 'Admin — can manage team and settings' },
  { value: 'viewer', label: 'Viewer — read-only access' },
]

export default function TeamInviteClient({ orgId, userId }: { orgId: string; userId: string }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteLink, setInviteLink] = useState('')

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setInviteLink('')
    const supabase = createClient()

    const { data, error: err } = await supabase
      .from('team_invites')
      .insert({ organization_id: orgId, invited_by: userId, email, role })
      .select('token')
      .single()

    if (err) { setError(err.message); setLoading(false); return }

    const link = `${window.location.origin}/invite/${data.token}`
    setInviteLink(link)
    setEmail('')
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Invite a team member</h2>
      <form onSubmit={handleInvite} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
          <input
            type="email" required value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            placeholder="colleague@organization.org"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            value={role} onChange={e => setRole(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        {error && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{error}</div>}

        <button
          type="submit" disabled={loading}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 text-sm"
        >
          {loading ? 'Sending invite…' : 'Send invite'}
        </button>
      </form>

      {inviteLink && (
        <div className="mt-5 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-sm font-medium text-green-800 mb-2">✅ Invite created! Share this link:</div>
          <div className="flex gap-2">
            <input
              readOnly value={inviteLink}
              className="flex-1 text-xs bg-white border border-green-300 rounded px-2 py-1.5 font-mono text-gray-700"
            />
            <button
              onClick={() => navigator.clipboard.writeText(inviteLink)}
              className="text-xs bg-green-100 text-green-800 px-3 py-1.5 rounded hover:bg-green-200"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-green-600 mt-2">Expires in 7 days. The invitee must have (or create) a GrantPilot account.</p>
        </div>
      )}
    </div>
  )
}
