import type { Metadata } from 'next'
import { validateReferralCode } from '@/lib/referrals'
import InviteLanding from './InviteLanding'

interface Props {
  params: Promise<{ code: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  return {
    title: `You've been invited to AgentQA — claim your 3 free credits`,
    description: `Use invite code ${code.toUpperCase()} at signup to get 3 bonus credits on your first test purchase.`,
  }
}

export default async function InvitePage({ params }: Props) {
  const { code } = await params
  const validation = await validateReferralCode(code)
  return <InviteLanding code={code.toUpperCase()} valid={validation.valid} creditsBonus={validation.creditsBonus ?? 3} />
}
