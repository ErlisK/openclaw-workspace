import { createClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

async function getOrgData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, current_organization_id, onboarded_at')
    .eq('id', user.id)
    .single()

  if (!profile?.onboarded_at) redirect('/onboarding')

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.current_organization_id!)
    .single()

  const { data: members } = await supabase
    .from('organization_members')
    .select('user_id, role, joined_at')
    .eq('organization_id', org?.id!)

  const { data: applications } = await supabase
    .from('grant_applications')
    .select('id, title, status, deadline, funder_name, ask_amount_usd, created_at')
    .eq('organization_id', org?.id!)
    .order('created_at', { ascending: false })
    .limit(10)

  return { user, profile, org, members: members || [], applications: applications || [] }
}

function computeCompletedItems(
  org: Record<string, unknown> | null,
  applications: unknown[]
): string[] {
  const done: string[] = []
  if (org) {
    done.push('org_created')
    const ft = org.funder_types as string[] | null
    const gf = org.grant_focus_areas as string[] | null
    if ((ft && ft.length > 0) || (gf && gf.length > 0)) done.push('funder_focus')
  }
  if (applications.length > 0) {
    done.push('rfp_parsed')
  }
  return done
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>
}) {
  const sp = await searchParams
  const { user, profile, org, members, applications } = await getOrgData()
  const firstName = (profile?.full_name || user.email || 'there').split(' ')[0]
  const showWelcome = sp.welcome === '1'
  const completedChecklistItems = computeCompletedItems(org, applications)

  return (
    <DashboardClient
      firstName={firstName}
      org={org}
      members={members}
      applications={applications}
      showWelcome={showWelcome}
      completedChecklistItems={completedChecklistItems}
    />
  )
}
