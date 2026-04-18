// Landing page copy variants for A/B testing
// ?v=1 → ROI-first | ?v=2 → time-saver | ?v=3 → pricing-lab
// Tracked via PostHog: landing_variant_viewed + landing_cta_clicked

export interface LandingVariant {
  id: string
  name: string          // internal label for PostHog
  badge: string
  headline: string
  subheadline: string
  cta_primary: string
  cta_secondary: string
  social_proof: string
  stat1: { value: string; label: string }
  stat2: { value: string; label: string }
  stat3: { value: string; label: string }
  features: Array<{ icon: string; title: string; body: string }>
  accentColor: string   // Tailwind color class
}

export const VARIANTS: Record<string, LandingVariant> = {
  '1': {
    id: '1',
    name: 'roi_first',
    badge: '📊 ROI-First Analytics',
    headline: 'Know your real hourly rate across every income stream',
    subheadline: 'GigAnalytics turns raw Stripe, PayPal, and Upwork exports into true ROI — so you know exactly which client work is actually worth your time.',
    cta_primary: 'Start tracking free',
    cta_secondary: 'See a live demo',
    social_proof: 'Used by 200+ freelancers managing 2–5 income streams',
    stat1: { value: '$87', label: 'avg true hourly rate discovered' },
    stat2: { value: '3.2×', label: 'ROAS on top acquisition channel' },
    stat3: { value: '11 min', label: 'to full ROI dashboard from CSV' },
    features: [
      {
        icon: '💰',
        title: 'True hourly rate — not just revenue',
        body: 'Divides net income by every hour logged (billable, proposals, admin) so you see what you\'re really earning per hour of effort.',
      },
      {
        icon: '📉',
        title: 'Acquisition ROI by channel',
        body: 'Track ad spend, platform fees, and referral costs against revenue — know your ROAS before you commit another dollar to a channel.',
      },
      {
        icon: '📈',
        title: 'Per-stream breakdowns',
        body: 'Compare Stripe vs. PayPal vs. Upwork side-by-side. Cut the low-ROI streams, double down on the winners.',
      },
    ],
    accentColor: 'blue',
  },

  '2': {
    id: '2',
    name: 'time_saver',
    badge: '⚡ Zero-Friction Tracking',
    headline: 'Stop losing money to invisible time drains',
    subheadline: 'One-tap timer, calendar import, and auto-detected CSV formats. GigAnalytics logs your time and payments with almost zero effort — and shows you where each hour actually went.',
    cta_primary: 'Try free — no setup',
    cta_secondary: 'Watch 2-min demo',
    social_proof: 'Saves the average multi-income freelancer 3h/week of manual tracking',
    stat1: { value: '< 1 min', label: 'to import 6 months of Stripe data' },
    stat2: { value: '1 tap', label: 'to start/stop the mobile timer' },
    stat3: { value: '4 platforms', label: 'auto-detected: Stripe · PayPal · Upwork · CSV' },
    features: [
      {
        icon: '⏱️',
        title: 'One-tap mobile timer',
        body: 'Start a timer from your phone in a single tap. Associate it with an income stream. Stop when you\'re done. That\'s it.',
      },
      {
        icon: '📅',
        title: 'Calendar inference (ICS import)',
        body: 'Upload your Google Calendar or Apple Calendar export. GigAnalytics automatically identifies work sessions and filters personal events.',
      },
      {
        icon: '🤖',
        title: 'Auto-detected CSV formats',
        body: 'Drop a Stripe Balance History, PayPal Activity, or Upwork Transaction export — GigAnalytics maps it automatically. No column matching required.',
      },
    ],
    accentColor: 'green',
  },

  '3': {
    id: '3',
    name: 'pricing_lab',
    badge: '🧪 Pricing Experiments',
    headline: 'Raise your rates with data — not guesswork',
    subheadline: 'GigAnalytics analyzes your transaction history to find your sweet-spot price range, then shows you exactly how much to charge to hit your monthly income target.',
    cta_primary: 'Find my optimal rate',
    cta_secondary: 'See pricing lab demo',
    social_proof: 'Users who acted on pricing suggestions increased monthly revenue by 28% on average',
    stat1: { value: '+28%', label: 'avg revenue lift from pricing suggestions' },
    stat2: { value: '$95/hr', label: 'median rate unlocked by top-quartile users' },
    stat3: { value: '4 scenarios', label: 'modelled to hit any monthly income target' },
    features: [
      {
        icon: '💡',
        title: 'Sweet-spot price detection',
        body: 'Buckets your transactions by price range and finds which band generates the highest revenue per hour — your data-driven sweet spot.',
      },
      {
        icon: '🎯',
        title: 'Target income calculator',
        body: 'Set a monthly goal and get 4 rule-based scenarios: raise rates 20%, raise rates 50%, add volume, or move to retainers.',
      },
      {
        icon: '📊',
        title: 'Market rate benchmarks',
        body: 'See anonymous p25/p50/p75/p90 rates for your service category — and where your effective rate sits in the distribution.',
      },
    ],
    accentColor: 'purple',
  },
}

export function getVariant(v: string | null | undefined): LandingVariant {
  const key = v?.toString() as keyof typeof VARIANTS
  return VARIANTS[key] ?? VARIANTS['1']
}
