import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { createServiceClient } from '@/lib/supabase/service';
import { syncSubscription } from '@/lib/subscription/server';

/**
 * POST /api/webhooks/stripe
 *
 * Optional reliability layer — handles edge cases where the user closes the
 * tab before the success_url redirect completes.
 *
 * The primary enrollment path is GET /api/enroll?session_id=xxx (success_url return).
 * This webhook catches the remaining ~5% of cases.
 *
 * Events handled:
 *   - checkout.session.completed → ensure enrollment exists
 *   - charge.refunded            → revoke enrollment
 *
 * All handlers are idempotent — processing the same event twice is safe.
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured — rejecting');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const body = await req.text();

  let stripeEvent: Awaited<ReturnType<(typeof stripe)['webhooks']['constructEventAsync']>>;

  try {
    stripeEvent = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', (err as Error).message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const serviceSupa = createServiceClient();

  switch (stripeEvent.type) {
    case 'checkout.session.completed': {
      const session = stripeEvent.data.object;

      const courseId = session.metadata?.course_id;
      const userId = session.client_reference_id ?? session.metadata?.user_id;
      const affiliateId = session.metadata?.affiliate_id ?? null;

      if (!courseId || !userId) {
        console.warn('[stripe-webhook] Missing metadata on session:', session.id);
        break;
      }

      if (session.payment_status !== 'paid') break;

      const paymentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent as { id: string } | null)?.id ?? null;

      // Idempotent purchase upsert
      const { data: purchase } = await serviceSupa
        .from('purchases')
        .upsert(
          {
            user_id: userId,
            course_id: courseId,
            stripe_session_id: session.id,
            stripe_payment_intent_id: paymentId,
            amount_cents: session.amount_total ?? 0,
            currency: session.currency ?? 'usd',
            status: 'completed',
            affiliate_id: affiliateId || null,
            purchased_at: new Date().toISOString(),
          },
          { onConflict: 'stripe_session_id' }
        )
        .select('id')
        .single();

      // Idempotent enrollment
      await serviceSupa.from('enrollments').upsert(
        {
          user_id: userId,
          course_id: courseId,
          purchase_id: purchase?.id ?? null,
          enrolled_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,course_id', ignoreDuplicates: true }
      );

      console.log(
        `[stripe-webhook] checkout.session.completed: enrolled user=${userId} course=${courseId}`
      );
      break;
    }

    case 'charge.refunded': {
      const charge = stripeEvent.data.object;
      const paymentIntentId = charge.payment_intent as string | null;

      if (!paymentIntentId) break;

      // Find purchase by payment intent ID
      const { data: purchase } = await serviceSupa
        .from('purchases')
        .update({ status: 'refunded' })
        .eq('stripe_payment_intent_id', paymentIntentId)
        .select('id, user_id, course_id')
        .single();

      if (purchase) {
        // Revoke enrollment (soft-delete via revoked_at)
        await serviceSupa
          .from('enrollments')
          .update({ entitlement_revoked_at: new Date().toISOString() })
          .eq('user_id', purchase.user_id)
          .eq('course_id', purchase.course_id)
          .is('revoked_at', null);

        console.log(
          `[stripe-webhook] charge.refunded: revoked enrollment user=${purchase.user_id} course=${purchase.course_id}`
        );
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = stripeEvent.data.object as {
        id: string; status: string; customer: string;
        current_period_end: number; metadata?: Record<string,string>;
        items: { data: Array<{ price: { id: string } }> };
      };
      const userId = sub.metadata?.user_id;
      if (userId) {
        await syncSubscription(userId, {
          id: sub.id, status: sub.status, customer: sub.customer as string,
          current_period_end: sub.current_period_end,
          price_id: sub.items?.data?.[0]?.price?.id,
        });
        console.log(`[stripe-webhook] subscription ${stripeEvent.type}: user=${userId} status=${sub.status}`);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = stripeEvent.data.object as {
        id: string; status: string; customer: string;
        current_period_end: number; metadata?: Record<string,string>;
      };
      const userId = sub.metadata?.user_id;
      if (userId) {
        await syncSubscription(userId, {
          id: sub.id, status: 'canceled', customer: sub.customer as string,
          current_period_end: sub.current_period_end,
        });
        console.log(`[stripe-webhook] subscription deleted: user=${userId}`);
      }
      break;
    }

    default:
      // Unhandled event — return 200 to acknowledge receipt
      break;
  }

  return new NextResponse(null, { status: 200 });
}
