import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // Pin to the latest stable GA version; the SDK default (2026-03-25.dahlia) is a beta release
  apiVersion: "2024-11-20.acacia" as "2026-03-25.dahlia",
  typescript: true,
});
