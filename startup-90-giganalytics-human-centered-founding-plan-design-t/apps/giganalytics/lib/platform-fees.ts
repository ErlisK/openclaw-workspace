export interface PlatformFeeInfo {
  name: string
  feePercent: number
  fixedFee?: number
  notes: string
}

export const PLATFORM_FEES: Record<string, PlatformFeeInfo> = {
  upwork:    { name: 'Upwork',        feePercent: 20,  notes: 'Up to $500 earned; 10% after $10k' },
  fiverr:    { name: 'Fiverr',        feePercent: 20,  notes: 'Standard service fee' },
  etsy:      { name: 'Etsy',          feePercent: 6.5, fixedFee: 0.20, notes: '6.5% transaction + $0.20 listing' },
  paypal:    { name: 'PayPal',        feePercent: 2.9, fixedFee: 0.30, notes: '2.9% + $0.30 per transaction' },
  stripe:    { name: 'Stripe',        feePercent: 2.9, fixedFee: 0.30, notes: '2.9% + $0.30 per transaction' },
  toptal:    { name: 'Toptal',        feePercent: 0,   notes: 'No fee to freelancer (client pays)' },
  freelancer:{ name: 'Freelancer.com',feePercent: 10,  notes: '10% or $5 minimum' },
  gumroad:   { name: 'Gumroad',       feePercent: 10,  notes: 'Flat 10% fee' },
  substack:  { name: 'Substack',      feePercent: 10,  notes: '10% of paid subscriptions' },
  patreon:   { name: 'Patreon',       feePercent: 8,   notes: 'Pro plan ~8% + payment processing' },
  amazon:    { name: 'Amazon Merch',  feePercent: 15,  notes: '~15% royalty structure' },
  youtube:   { name: 'YouTube',       feePercent: 45,  notes: 'YouTube takes ~45% of ad revenue' },
  other:     { name: 'Other',         feePercent: 0,   notes: 'Enter custom fee percentage' },
}

export function getPlatformFee(platform: string): PlatformFeeInfo | null {
  if (!platform) return null
  const key = platform.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
  return PLATFORM_FEES[key] ?? null
}

/** All platforms as an array for display */
export const PLATFORM_FEES_LIST = Object.entries(PLATFORM_FEES).map(([key, val]) => ({
  key,
  ...val,
}))
