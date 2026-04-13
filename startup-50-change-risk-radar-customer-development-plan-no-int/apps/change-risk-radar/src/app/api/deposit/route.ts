import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";

const DEPOSIT_AMOUNT_CENTS = 10000; // $100
const DEPOSIT_AMOUNT_DISPLAY = "$100";

const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY;

async function notifyFounderDeposit(email: string, company: string, variant: string, stripeSessionId?: string) {
  if (!AGENTMAIL_API_KEY) return;
  try {
    await fetch("https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AGENTMAIL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: "scide-founder@agentmail.to",
        subject: `💎 ${stripeSessionId ? "NEW DEPOSIT" : "Deposit intent"}: ${email}`,
        text: `${stripeSessionId ? "💎 PAYMENT IN PROGRESS" : "🔔 DEPOSIT INTENT"}\n\nEmail: ${email}\nCompany: ${company || "—"}\nPricing variant: ${variant}\nAmount: ${DEPOSIT_AMOUNT_DISPLAY}\n${stripeSessionId ? `Stripe session: ${stripeSessionId}` : "Status: Intent recorded — no Stripe key yet"}\n\nView: https://app.supabase.com/project/lpxhxmpzqjygsaawkrva/editor`,
      }),
    });
  } catch(e) { /* fire-and-forget */ }
}

async function notifyUserDepositIntent(email: string) {
  if (!AGENTMAIL_API_KEY) return;
  try {
    await fetch("https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AGENTMAIL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: email,
        from: "scide-founder@agentmail.to",
        subject: "Your Change Risk Radar founding deposit — payment link",
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0a0a0f;color:#e2e8f0;border-radius:12px">
            <h2 style="color:#818cf8;margin-bottom:4px">💎 Your $100 founding deposit</h2>
            <p style="color:#94a3b8;margin-top:0">Thanks for reserving a spot on Change Risk Radar!</p>
            
            <div style="background:#1e1e2e;border:1px solid #2d2d44;border-radius:8px;padding:20px;margin:20px 0">
              <h3 style="margin:0 0 12px;font-size:1rem">What you're locking in:</h3>
              <ul style="color:#94a3b8;padding-left:20px;margin:0">
                <li style="margin-bottom:8px"><strong style="color:#e2e8f0">30% off forever</strong> — founding member pricing locked for life</li>
                <li style="margin-bottom:8px"><strong style="color:#e2e8f0">Priority access</strong> — you go live before public waitlist</li>
                <li style="margin-bottom:8px"><strong style="color:#e2e8f0">Direct input</strong> — shape which vendors we monitor first</li>
                <li><strong style="color:#10b981">100% refundable</strong> — if we don't deliver or you change your mind</li>
              </ul>
            </div>
            
            <p style="color:#94a3b8">We're setting up our payment processor now. We'll send you a <strong style="color:#e2e8f0">secure Stripe payment link for $100</strong> within 24 hours at this email address.</p>
            
            <p style="color:#94a3b8">In the meantime, explore the live demo:</p>
            <a href="https://change-risk-radar.vercel.app/demo" style="display:inline-block;background:#635bff;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold">🔴 View Live Demo →</a>
            
            <p style="color:#64748b;font-size:0.8rem;margin-top:24px">Questions? Reply to this email or visit <a href="https://change-risk-radar.vercel.app" style="color:#818cf8">change-risk-radar.vercel.app</a></p>
          </div>
        `,
      }),
    });
  } catch(e) { /* fire-and-forget */ }
}

export async function POST(req: NextRequest) {
  try {
    const { email, company, variant } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeKey) {
      // No Stripe — record intent and email the user
      await supabaseAdmin.from("crr_deposits").upsert({
        email: email.toLowerCase().trim(),
        amount_cents: DEPOSIT_AMOUNT_CENTS,
        status: "intent",
        metadata: { company, variant, source: "landing_page" },
      }, { onConflict: "email" });

      // Notify founder + user
      notifyFounderDeposit(email, company, variant);
      notifyUserDepositIntent(email);

      return NextResponse.json({ 
        url: null, 
        intent: true,
        message: "Deposit intent recorded! Payment link coming within 24h." 
      });
    }

    // Stripe is configured — create checkout session
    const stripe = new Stripe(stripeKey);
    const origin = req.headers.get("origin") || "https://change-risk-radar.vercel.app";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: "Change Risk Radar — Founding Member Deposit",
            description: "100% refundable. Locks in founding-member pricing (30% off Growth plan forever) + first in line for beta access.",
            images: [],
          },
          unit_amount: DEPOSIT_AMOUNT_CENTS,
        },
        quantity: 1,
      }],
      customer_email: email,
      metadata: { email, company: company || "", variant: variant || "A" },
      success_url: `${origin}/deposit-success?session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(email)}`,
      cancel_url: `${origin}/?deposit=cancelled`,
      payment_intent_data: {
        description: `CRR Founding Member Deposit — ${email}`,
        metadata: { company: company || "", variant: variant || "A" },
      },
    });

    await supabaseAdmin.from("crr_deposits").upsert({
      email: email.toLowerCase().trim(),
      amount_cents: DEPOSIT_AMOUNT_CENTS,
      stripe_session_id: session.id,
      status: "pending",
      metadata: { company, variant },
    }, { onConflict: "email" });

    notifyFounderDeposit(email, company, variant, session.id);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Deposit error:", err);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
