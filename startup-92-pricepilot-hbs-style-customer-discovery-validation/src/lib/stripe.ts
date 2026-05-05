import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia' as '2026-04-22.dahlia',
  typescript: true,
})

export const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || 'price_1TPsI4Gt92XrRvUutqwiM9uw'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pricingsim.com'
