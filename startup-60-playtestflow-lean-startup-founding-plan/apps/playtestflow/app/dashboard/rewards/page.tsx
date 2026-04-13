import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import RewardManager from '@/components/RewardManager'

export default async function RewardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('designer_id', user.id)
    .order('created_at', { ascending: false })

  const { data: rewards } = await supabase
    .from('reward_codes')
    .select('*, projects(name), session_signups(tester_name, tester_email)')
    .in('project_id', (projects ?? []).map((p: any) => p.id))
    .order('created_at', { ascending: false })

  const available = rewards?.filter((r: any) => r.status === 'available').length ?? 0
  const assigned = rewards?.filter((r: any) => r.status === 'assigned').length ?? 0
  const redeemed = rewards?.filter((r: any) => r.status === 'redeemed').length ?? 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Reward Codes</h1>
        <p className="text-gray-400 text-sm mt-1">Manage and assign reward codes to playtesters.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Available', value: available, color: 'text-green-400' },
          { label: 'Assigned', value: assigned, color: 'text-orange-400' },
          { label: 'Redeemed', value: redeemed, color: 'text-blue-400' },
        ].map((s) => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Reward manager (client component for bulk upload) */}
      <RewardManager projects={projects ?? []} />

      {/* Reward list */}
      {rewards && rewards.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">All Codes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-gray-500 text-left">
                  <th className="pb-3 pr-4">Code</th>
                  <th className="pb-3 pr-4">Type / Value</th>
                  <th className="pb-3 pr-4">Project</th>
                  <th className="pb-3 pr-4">Assigned to</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rewards.map((r: any) => (
                  <tr key={r.id}>
                    <td className="py-3 pr-4 font-mono text-xs text-orange-400">{r.code}</td>
                    <td className="py-3 pr-4 text-xs text-gray-400">
                      {r.reward_type}{r.reward_value ? ` — ${r.reward_value}` : ''}
                    </td>
                    <td className="py-3 pr-4 text-xs text-gray-400">{r.projects?.name ?? '—'}</td>
                    <td className="py-3 pr-4 text-xs text-gray-400">
                      {r.session_signups?.tester_name ?? '—'}
                    </td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        r.status === 'available' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                        r.status === 'assigned' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                        'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
