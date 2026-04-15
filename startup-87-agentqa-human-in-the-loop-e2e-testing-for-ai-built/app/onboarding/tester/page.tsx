import { Suspense } from 'react'
import TesterOnboardingClient from './TesterOnboardingClient'

export const metadata = {
  title: 'Tester Onboarding — AgentQA',
  description: 'Set up your tester profile, payouts, and read the guidelines.',
}

export default function TesterOnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading…</div>}>
      <TesterOnboardingClient />
    </Suspense>
  )
}
