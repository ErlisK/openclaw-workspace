import { createClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import TeamInviteClient from './TeamInviteClient'

export const dynamic = 'force-dynamic'

async function getTeamData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_organization_id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.current_organization_id) redirect('/onboarding')

  const orgId = profile.current_organization_id

  const [{ data: org }, { data: members }, { data: invites }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', orgId).single(),
    supabase.from('organization_members').select('user_id, role, joined_at').eq('organization_id', orgId),
    supabase.from('team_invites').select('*').eq('organization_id', orgId).is('accepted_at', null).gt('expires_at', new Date().toISOString()),
  ])

  // Get member profiles
  const memberIds = (members || []).map(m => m.user_id)
  const { data: memberProfiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', memberIds)

  const profileMap = Object.fromEntries((memberProfiles || []).map(p => [p.id, p.full_name]))

  const enrichedMembers = (members || []).map(m => ({
    ...m,
    full_name: profileMap[m.user_id] || 'Unknown',
    is_you: m.user_id === user.id,
  }))

  return { user, org, members: enrichedMembers, invites: invites || [], orgId }
}

export default async function TeamSettingsPage() {
  const { user, org, members, invites, orgId } = await getTeamData()
  const currentMember = members.find(m => m.user_id === user.id)
  const canManage = ['owner', 'admin'].includes(currentMember?.role || '')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <a href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</a>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-900">Team Settings</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-500 text-sm mt-0.5">{org?.name} · {members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Current members */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Members</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {members.map(m => (
              <div key={m.user_id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">
                    {m.full_name}
                    {m.is_you && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                  </div>
                  <div className="text-xs text-gray-400">
                    Joined {new Date(m.joined_at).toLocaleDateString()}
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  m.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                  m.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                  m.role === 'viewer' ? 'bg-gray-100 text-gray-500' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending invites */}
        {invites.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Pending Invites</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {invites.map(inv => (
                <div key={inv.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-700">{inv.email}</div>
                    <div className="text-xs text-gray-400">
                      Expires {new Date(inv.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full font-medium">
                    {inv.role} · pending
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite form — client component */}
        {canManage && <TeamInviteClient orgId={orgId} userId={user.id} />}

        {!canManage && (
          <div className="text-sm text-gray-500 bg-white rounded-xl border border-gray-200 p-4 text-center">
            Only owners and admins can invite team members.
          </div>
        )}
      </main>
    </div>
  )
}
