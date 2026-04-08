export const PRICES = {
  starter: {
    name: 'Starter',
    monthly: { id: 'price_1TK3AiGt92XrRvUugLBaKuAx', amount: 49 },
    yearly:  { id: 'price_1TK3AiGt92XrRvUuUHDgJThX', amount: 399, perMonth: 33 },
  },
  pro: {
    name: 'Pro',
    monthly: { id: 'price_1TK3AjGt92XrRvUuDSNKbZmZ', amount: 149 },
    yearly:  { id: 'price_1TK3AkGt92XrRvUuGzNFrPNP', amount: 1199, perMonth: 99 },
  },
  enterprise: {
    name: 'Enterprise',
    monthly: { id: 'price_1TK3AkGt92XrRvUu3ZQkeGbK', amount: 499 },
    yearly:  { id: null, amount: null },
  },
} as const

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://citebundle.com'
