import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set');
}

/**
 * Stripe SDK singleton — server-side only.
 * Import this file only from Server Components, Route Handlers, or Server Actions.
 * Never import from client components or client-side code.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
  appInfo: {
    name: 'TeachRepo',
    version: '0.1.0',
    url: 'https://teachrepo.com',
  },
});

/** App URL — used to construct success_url and cancel_url */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://teachrepo.com';
