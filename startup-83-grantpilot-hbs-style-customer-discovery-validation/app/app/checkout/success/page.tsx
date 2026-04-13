import { createClient } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams

  let tier = 'unknown'
  let packCredits = 0
  let customerEmail = ''

  if (session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ['line_items'],
      })
      tier = session.metadata?.tier || 'unknown'
      customerEmail = session.customer_email || session.metadata?.user_email || ''

      // Check entitlement granted via webhook
      const userId = session.metadata?.user_id
      if (userId) {
        const supabase = await createClient()
        const { data: ent } = await supabase
          .from('entitlements')
          .select('pack_credits, tier')
          .eq('user_id', userId)
          .maybeSingle()
        if (ent) {
          packCredits = ent.pack_credits ?? 0
          tier = ent.tier
        }
      }
    } catch (e) {
      console.error('[CHECKOUT SUCCESS]', e)
    }
  }

  const TIER_MESSAGES: Record<string, { headline: string; body: string; icon: string; cta: string; ctaHref: string }> = {
    deliverable_pack: {
      icon: '📦',
      headline: 'Your Deliverable Pack is ready!',
      body: `You now have ${packCredits} Deliverable Pack credit${packCredits !== 1 ? 's' : ''}. Head to your dashboard to create a new application — the AI Pilot will handle Discovery, Draft, and Submission automatically.`,
      cta: 'Start a new application →',
      ctaHref: '/rfp/new',
    },
    pipeline_pro: {
      icon: '🚀',
      headline: 'Welcome to Pipeline Pro!',
      body: `You now have ${packCredits} monthly credits, unlimited parsing, and a dedicated grant specialist. Your pipeline is ready.`,
      cta: 'Go to Dashboard →',
      ctaHref: '/dashboard',
    },
    unknown: {
      icon: '✅',
      headline: 'Payment successful!',
      body: 'Your entitlements are being activated. Check your dashboard in a moment.',
      cta: 'Go to Dashboard →',
      ctaHref: '/dashboard',
    },
  }

  const msg = TIER_MESSAGES[tier] || TIER_MESSAGES.unknown

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-6">{msg.icon}</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{msg.headline}</h1>
        <p className="text-gray-500 mb-2">{msg.body}</p>
        {customerEmail && (
          <p className="text-sm text-gray-400 mb-6">Confirmation sent to {customerEmail}</p>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 text-left">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">What happens next</div>
          <div className="space-y-3">
            {[
              { icon: '⚡', text: 'Entitlements granted immediately via webhook' },
              { icon: '🤖', text: 'AI Pilot ready to parse your next RFP' },
              tier === 'deliverable_pack' || tier === 'pipeline_pro'
                ? { icon: '👤', text: 'Human specialist assigned within 1 business day' }
                : { icon: '📄', text: 'Export up to 3 applications per month' },
              { icon: '📧', text: 'Receipt + order confirmation sent to your email' },
              { icon: '🧾', text: <><a href="/settings/billing" className="underline">Billing page</a> shows invoice history and plan details</> },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm text-gray-700">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <Link
          href={msg.ctaHref}
          className="inline-block bg-indigo-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          {msg.cta}
        </Link>

        <div className="mt-4">
          <Link href="/pricing" className="text-sm text-gray-400 hover:text-gray-600">
            ← Back to pricing
          </Link>
        </div>
      </div>
    </div>
  )
}
