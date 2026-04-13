/**
 * app/api/webhooks/stripe/route.ts
 * Handles Stripe webhook events and grants entitlements.
 *
 * checkout.session.completed:
 *   - subscription → upsert subscriptions row + entitlement (unlimited)
 *   - payment      → upsert purchases row + entitlement (premium_template)
 *
 * customer.subscription.updated/deleted:
 *   - Update subscription status; deactivate entitlement on cancel
 *
 * invoice.paid / invoice.payment_failed:
 *   - Extend/log subscription period
 */
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const body      = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[WEBHOOK] STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Signature verification failed';
    console.error('[WEBHOOK] Sig failed:', msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const svc = createServiceClient();

  switch (event.type) {

    // ── Checkout completed ────────────────────────────────────────────────
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta    = session.metadata ?? {};
      let userId  = meta.user_id || null;
      const mode    = session.mode;

      if (!userId) {
        // Fallback: lookup user by stripe_customer_id in subscriptions table
        const customerId = session.customer as string | null;
        if (customerId) {
          const { data: existingSub } = await svc
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();
          if (existingSub?.user_id) {
            userId = existingSub.user_id;
            console.log('[WEBHOOK] Resolved user_id via customer fallback:', userId);
          }
        }
        if (!userId) {
          console.error('[WEBHOOK] checkout.session.completed: cannot resolve user_id, skipping', session.id);
          break;
        }
      }

      if (mode === 'subscription') {
        // Fetch full subscription from Stripe
        const subId = session.subscription as string;
        const sub   = await stripe.subscriptions.retrieve(subId);

        const periodEnd = new Date(((sub.items?.data?.[0] as any)?.current_period_end ?? sub.billing_cycle_anchor) * 1000).toISOString();
        const periodStart = new Date((sub.billing_cycle_anchor * 1000)).toISOString();

        // Upsert subscription
        await svc.from('subscriptions').upsert({
          user_id:                 userId,
          stripe_subscription_id:  subId,
          stripe_customer_id:      session.customer as string,
          stripe_price_id:         meta.price_id,
          status:                  sub.status,
          plan:                    'unlimited',
          current_period_start:    periodStart,
          current_period_end:      periodEnd,
          unlimited_exports:       true,
          hosted_urls_enabled:     true,
          badges_enabled:          true,
          version_history_enabled: true,
          updated_at:              new Date().toISOString(),
        }, { onConflict: 'stripe_subscription_id' });

        // Grant entitlement
        await svc.from('entitlements').insert({
          user_id:          userId,
          entitlement_type: 'unlimited_exports',
          source:           'stripe_subscription',
          is_active:        true,
          valid_from:       periodStart,
          valid_until:      periodEnd,
          metadata: {
            stripe_subscription_id: subId,
            stripe_session_id:      session.id,
            plan:                   'unlimited',
          },
        });

        console.log(`[WEBHOOK] Unlimited subscription granted to ${userId}, sub=${subId}`);

      } else if (mode === 'payment') {
        // Premium template purchase
        const templateId   = meta.template_id   || null;
        const templateSlug = meta.template_slug  || null;

        // Record purchase
        const { data: purchase } = await svc.from('purchases').insert({
          user_id:                     userId,
          purchase_type:               'premium_template',
          template_id:                 templateId ?? undefined,
          template_slug:               templateSlug ?? undefined,
          stripe_checkout_session_id:  session.id,
          amount_cents:                session.amount_total ?? 500,
          currency:                    session.currency ?? 'usd',
          status:                      'completed',
          metadata: {
            stripe_session_id: session.id,
            stripe_customer:   session.customer,
            template_id:       templateId,
            template_slug:     templateSlug,
          },
          updated_at: new Date().toISOString(),
        }).select('id').single();

        // Grant entitlement (permanent for one-time purchase)
        await svc.from('entitlements').insert({
          user_id:          userId,
          entitlement_type: 'premium_template',
          source:           'stripe_payment',
          template_id:      templateId ?? undefined,
          purchase_id:      purchase?.id ?? undefined,
          is_active:        true,
          valid_from:       new Date().toISOString(),
          valid_until:      null,  // permanent
          metadata: {
            template_id:        templateId,
            template_slug:      templateSlug,
            stripe_session_id:  session.id,
          },
        });

        console.log(`[WEBHOOK] Premium template entitlement granted to ${userId}, template=${templateSlug ?? templateId}`);
      }
      break;
    }

    // ── Subscription updated ──────────────────────────────────────────────
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const meta = sub.metadata ?? {};
      const userId = meta.user_id || null;

      const periodEnd   = new Date(((sub.items?.data?.[0] as any)?.current_period_end ?? sub.billing_cycle_anchor) * 1000).toISOString();
      const periodStart = new Date((sub.billing_cycle_anchor * 1000)).toISOString();
      const isActive    = ['active', 'trialing'].includes(sub.status);

      await svc.from('subscriptions').upsert({
        stripe_subscription_id:  sub.id,
        status:                  sub.status,
        current_period_start:    periodStart,
        current_period_end:      periodEnd,
        cancel_at:               sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
        canceled_at:             sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
        unlimited_exports:       isActive,
        updated_at:              new Date().toISOString(),
      }, { onConflict: 'stripe_subscription_id' });

      // Update entitlement validity
      if (userId) {
        await svc.from('entitlements')
          .update({ is_active: isActive, valid_until: periodEnd })
          .eq('user_id', userId)
          .eq('entitlement_type', 'unlimited_exports')
          .eq('source', 'stripe_subscription');
      }

      console.log(`[WEBHOOK] Subscription ${sub.id} updated: status=${sub.status}`);
      break;
    }

    // ── Subscription cancelled ────────────────────────────────────────────
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const meta = sub.metadata ?? {};
      const userId = meta.user_id || null;

      await svc.from('subscriptions')
        .update({
          status:       'canceled',
          canceled_at:  new Date().toISOString(),
          unlimited_exports: false,
          updated_at:   new Date().toISOString(),
        })
        .eq('stripe_subscription_id', sub.id);

      if (userId) {
        await svc.from('entitlements')
          .update({ is_active: false })
          .eq('user_id', userId)
          .eq('entitlement_type', 'unlimited_exports')
          .eq('source', 'stripe_subscription');
      }

      console.log(`[WEBHOOK] Subscription ${sub.id} canceled`);
      break;
    }

    // ── Invoice paid ──────────────────────────────────────────────────────
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
      const subId   = ((invoice as any).subscription ?? (invoice as any).subscription_details?.subscription_id) as string | null | null;
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        const periodEnd = new Date(((sub.items?.data?.[0] as any)?.current_period_end ?? sub.billing_cycle_anchor) * 1000).toISOString();
        await svc.from('subscriptions').update({
          status:               'active',
          current_period_end:   periodEnd,
          unlimited_exports:    true,
          updated_at:           new Date().toISOString(),
        }).eq('stripe_subscription_id', subId);
        console.log(`[WEBHOOK] Invoice paid, extended subscription ${subId} to ${periodEnd}`);
      }
      break;
    }

    // ── Invoice payment failed ────────────────────────────────────────────
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
      console.warn(`[WEBHOOK] Payment failed: invoice=${invoice.id}, customer=${invoice.customer}`);
      // In production: send dunning email
      break;
    }

    default:
      console.log(`[WEBHOOK] Unhandled: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
