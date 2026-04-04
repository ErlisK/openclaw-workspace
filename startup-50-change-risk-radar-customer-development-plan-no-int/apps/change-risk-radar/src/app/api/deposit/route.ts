import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      // Stripe not configured yet — record intent and return success
      await supabaseAdmin.from("crr_deposits").insert({
        email: email.toLowerCase().trim(),
        amount_cents: 5000,
        status: "intent",
      });
      return NextResponse.json({ url: null, message: "Deposit intent recorded. Payment coming soon." });
    }

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
            description: "100% refundable deposit. Locks in founding-member pricing (30% off forever) + priority access.",
          },
          unit_amount: 5000, // $50
        },
        quantity: 1,
      }],
      customer_email: email,
      metadata: { email },
      success_url: `${origin}/?deposit=success&email=${encodeURIComponent(email)}`,
      cancel_url: `${origin}/?deposit=cancelled`,
    });

    await supabaseAdmin.from("crr_deposits").insert({
      email: email.toLowerCase().trim(),
      amount_cents: 5000,
      stripe_session_id: session.id,
      status: "pending",
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
