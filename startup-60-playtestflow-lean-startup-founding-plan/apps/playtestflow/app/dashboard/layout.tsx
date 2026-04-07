import { createClient, createServiceClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import DashboardNav from '@/components/DashboardNav'
import VWSurveyTrigger from '@/components/VWSurveyTrigger'
import { Suspense } from 'react'
import ReferralConverter from '@/components/ReferralConverter'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Check subscription status for VW survey trigger (non-throwing)
  let isTrialing = false
  try {
    const svc = createServiceClient()
    const { data: sub } = await svc
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .single()
    isTrialing = sub?.status === 'trialing'
  } catch {}

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <DashboardNav userEmail={user.email ?? ''} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </main>
      <VWSurveyTrigger isTrialing={isTrialing} />
      <Suspense fallback={null}><ReferralConverter /></Suspense>
    </div>
  )
}
