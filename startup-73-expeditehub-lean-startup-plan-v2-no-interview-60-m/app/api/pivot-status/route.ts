import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

export async function GET() {
  const db = getSupabaseAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripe = new (Stripe as any)(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' }) as Stripe

  // Pull live data in parallel
  const [
    projectsRes,
    quotesRes,
    prosRes,
    leadsRes,
    templatesRes,
    paymentsRes,
  ] = await Promise.all([
    db.from('projects').select('id,status,packet_status,autofill_score,created_at').order('created_at', { ascending: false }),
    db.from('quotes').select('id,project_id,quote_amount,status,created_at'),
    db.from('pros').select('id,status,created_at'),
    db.from('leads').select('id,created_at'),
    db.from('form_templates').select('accuracy_score,version,updated_at').eq('form_type', 'ADU_BP001').limit(1).single(),
    stripe.paymentIntents.list({ limit: 100 }).catch(() => ({ data: [] })),
  ])

  const projects = projectsRes.data ?? []
  const quotes   = quotesRes.data ?? []
  const pros     = prosRes.data ?? []
  const leads    = leadsRes.data ?? []
  const template = templatesRes.data
  const payments = 'data' in paymentsRes ? paymentsRes.data : []

  const paidPayments = payments.filter((p) => p.status === 'succeeded')
  const totalRevenue = paidPayments.reduce((s, p) => s + p.amount, 0) / 100

  const organicProjects = projects.filter(p => p.created_at > '2026-04-10') // seeded project is older
  const organicPros     = pros.filter(p => p.status === 'active' && p.created_at > '2026-04-10')

  // Compute criteria
  const criteria = [
    {
      id: 'paid_deposit',
      label: '≥1 Paid Deposit',
      target: 1,
      actual: paidPayments.length,
      met: paidPayments.length >= 1,
      weight: 'required',
    },
    {
      id: 'packet_accuracy',
      label: 'AI Packet Accuracy ≥75%',
      target: 75,
      actual: template?.accuracy_score ?? 0,
      met: (template?.accuracy_score ?? 0) >= 75,
      weight: 'required',
    },
    {
      id: 'quotes_with_packet',
      label: '≥1 Quote on ≥75% Packet',
      target: 1,
      actual: quotes.length,
      met: quotes.length >= 1 && (template?.accuracy_score ?? 0) >= 75,
      weight: 'required',
    },
    {
      id: 'organic_leads',
      label: '≥1 Organic Homeowner Lead',
      target: 1,
      actual: leads.length,
      met: leads.length >= 1,
      weight: 'signal',
    },
    {
      id: 'organic_pros',
      label: '≥2 Organic Pro Signups',
      target: 2,
      actual: organicPros.length,
      met: organicPros.length >= 2,
      weight: 'signal',
    },
  ]

  const requiredMet = criteria.filter(c => c.weight === 'required' && c.met).length
  const requiredTotal = criteria.filter(c => c.weight === 'required').length
  const verdict = requiredMet === requiredTotal ? 'PERSEVERE' : paidPayments.length === 0 && leads.length === 0 ? 'DEMAND_TEST_FIRST' : 'PIVOT'

  return NextResponse.json({
    verdict,
    requiredMet,
    requiredTotal,
    criteria,
    stats: {
      projects: projects.length,
      quotes: quotes.length,
      pros: pros.length,
      leads: leads.length,
      organicPros: organicPros.length,
      paidDeposits: paidPayments.length,
      totalRevenue,
      packetAccuracy: template?.accuracy_score ?? 0,
      templateVersion: template?.version ?? 0,
    },
    nextAction: verdict === 'PERSEVERE'
      ? 'Scale: raise $25K, hire Austin expediter, add second metro'
      : verdict === 'DEMAND_TEST_FIRST'
      ? 'Run 5-day demand test: Reddit + Nextdoor + $20 Google Ads from residential IP'
      : 'Pivot Option A: B2B SaaS for permit expediters at $149/month',
    updatedAt: new Date().toISOString(),
  })
}
