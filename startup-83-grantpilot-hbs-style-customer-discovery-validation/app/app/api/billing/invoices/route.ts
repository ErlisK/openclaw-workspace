import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient, createAdminClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: ent } = await admin
      .from('entitlements')
      .select('stripe_customer_id, tier, pack_credits, status, current_period_end, stripe_subscription_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!ent?.stripe_customer_id) {
      return NextResponse.json({ invoices: [], subscription: null, customer: null })
    }

    const customerId = ent.stripe_customer_id

    // Fetch in parallel: invoices + subscription
    const [invoiceList, customer] = await Promise.all([
      stripe.invoices.list({ customer: customerId, limit: 20 }),
      stripe.customers.retrieve(customerId),
    ])

    let subscription = null
    if (ent.stripe_subscription_id) {
      try {
        const raw = await stripe.subscriptions.retrieve(ent.stripe_subscription_id) as unknown as {
          id: string; status: string; current_period_end: number; current_period_start: number;
          cancel_at_period_end: boolean; items: { data: Array<{ price: { unit_amount: number; recurring?: { interval: string } } }> }
        }
        subscription = {
          id: raw.id,
          status: raw.status,
          current_period_end: new Date(raw.current_period_end * 1000).toISOString(),
          current_period_start: new Date(raw.current_period_start * 1000).toISOString(),
          cancel_at_period_end: raw.cancel_at_period_end,
          amount: raw.items.data[0]?.price?.unit_amount ?? 0,
          interval: raw.items.data[0]?.price?.recurring?.interval ?? 'month',
        }
      } catch {
        // subscription may have been deleted
      }
    }

    const invoices = invoiceList.data.map(inv => ({
      id: inv.id,
      number: inv.number,
      status: inv.status,
      amount_paid: inv.amount_paid,
      amount_due: inv.amount_due,
      currency: inv.currency,
      created: new Date((inv.created as number) * 1000).toISOString(),
      period_start: new Date((inv.period_start as number) * 1000).toISOString(),
      period_end: new Date((inv.period_end as number) * 1000).toISOString(),
      hosted_invoice_url: inv.hosted_invoice_url,
      invoice_pdf: inv.invoice_pdf,
      description: inv.description,
      lines: inv.lines.data.map(l => ({
        description: l.description,
        amount: l.amount,
        period_start: new Date((l.period?.start ?? 0) * 1000).toISOString(),
        period_end: new Date((l.period?.end ?? 0) * 1000).toISOString(),
      })),
    }))

    const customerData = 'deleted' in customer ? null : {
      id: customer.id,
      email: customer.email,
      name: customer.name,
    }

    return NextResponse.json({
      invoices,
      subscription,
      customer: customerData,
      entitlement: {
        tier: ent.tier,
        pack_credits: ent.pack_credits,
        status: ent.status,
        current_period_end: ent.current_period_end,
      },
    })
  } catch (err) {
    console.error('[BILLING INVOICES]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
