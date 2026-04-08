// Centralized price/product config with add-ons
export const PRICES = {
  starter: {
    name: 'Starter',
    tagline: 'For indie writers & small teams',
    monthly: { id: 'price_1TK3AiGt92XrRvUugLBaKuAx', amount: 49 },
    yearly:  { id: 'price_1TK3AiGt92XrRvUuUHDgJThX', amount: 399, perMonth: 33 },
    claimsIncluded: 50,
    users: 1,
  },
  pro: {
    name: 'Pro',
    tagline: 'For agencies & health media',
    monthly: { id: 'price_1TK3AjGt92XrRvUuDSNKbZmZ', amount: 149 },
    yearly:  { id: 'price_1TK3AkGt92XrRvUuGzNFrPNP', amount: 1199, perMonth: 99 },
    claimsIncluded: -1, // unlimited
    users: 5,
  },
  enterprise: {
    name: 'Enterprise',
    tagline: 'For pharma & health systems',
    monthly: { id: 'price_1TK3AkGt92XrRvUu3ZQkeGbK', amount: 499 },
    yearly:  { id: null, amount: null },
    claimsIncluded: -1,
    users: -1,
  },
} as const

export const ADDONS = {
  claims10: {
    id: 'price_1TK3PIGt92XrRvUuKJxpYLtI',
    name: '10-claim review pack',
    amount: 35,
    perClaim: 3.50,
    claims: 10,
  },
  claims50: {
    id: 'price_1TK3PIGt92XrRvUuL6ziVwO0',
    name: '50-claim review pack',
    amount: 125,
    perClaim: 2.50,
    claims: 50,
  },
  complianceSla: {
    id: 'price_1TK3PJGt92XrRvUunIg2m0Y3',
    name: 'Compliance SLA',
    amount: 99,
    per: 'month',
    description: '24h review turnaround + dedicated compliance report',
  },
} as const

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://citebundle.com'

// A/B pricing variants
export const PRICING_VARIANTS = {
  a: { name: 'Value anchor', starterPrice: 49, proPrice: 149, enterprisePrice: 499 },
  b: { name: 'Mid-market push', starterPrice: 39, proPrice: 129, enterprisePrice: 449 },
  c: { name: 'Premium signal', starterPrice: 69, proPrice: 199, enterprisePrice: 599 },
} as const

// Unit economics targets
export const UNIT_ECONOMICS = {
  targetCAC: 150,          // $ customer acquisition cost
  targetLTV: 2400,         // $ lifetime value (24mo avg)
  targetLTVCACRatio: 3,
  targetGrossMargin: 0.75, // 75%
  targetTrialConversion: 0.25, // 25% trial → paid
} as const
