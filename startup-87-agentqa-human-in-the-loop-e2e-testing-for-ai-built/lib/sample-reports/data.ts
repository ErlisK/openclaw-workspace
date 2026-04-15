/**
 * lib/sample-reports/data.ts
 *
 * Three realistic scrubbed sample reports used for the public demo pages.
 * Each represents a different scenario: bug-heavy, mobile-specific, and clean pass.
 */

export type BugSeverity = 'critical' | 'high' | 'medium' | 'low'
export type Tier = 'quick' | 'standard' | 'deep'

export interface NetworkEntry {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  status: number
  ms: number
  size?: string
}

export interface ConsoleEntry {
  level: 'error' | 'warn' | 'log' | 'info'
  msg: string
  time: string // MM:SS
  source?: string
}

export interface Bug {
  id: string
  severity: BugSeverity
  title: string
  steps: string
  expected: string
  actual: string
  network_hint?: string
  screenshot_note?: string
}

export interface SampleReport {
  id: string
  slug: 'demo' | 'demo-mobile' | 'demo-clean'
  title: string
  scenario: string
  app_name: string
  app_url: string
  tier: Tier
  tester_initials: string
  duration_seconds: number
  rating: number
  summary: string
  bugs: Bug[]
  network_log: NetworkEntry[]
  console_log: ConsoleEntry[]
  completed_at: string
  // Meta
  seo_title: string
  seo_description: string
  og_headline: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Report 1: Bug-heavy — standard tier, SaaS checkout
// ─────────────────────────────────────────────────────────────────────────────
export const REPORT_DEMO: SampleReport = {
  id: 'rpt_demo_001',
  slug: 'demo',
  title: 'BetaWindow Sample Report — SaaS Checkout Flow',
  scenario: 'Standard 20-min session on a Stripe-powered SaaS signup',
  app_name: 'AcmeSaaS (demo)',
  app_url: 'https://acme-saas-demo.vercel.app',
  tier: 'standard',
  tester_initials: 'M.K.',
  duration_seconds: 1147,
  rating: 3,
  summary:
    'The homepage and pricing page load correctly. Signup breaks for emails containing "+" — a common address pattern. The checkout flow fails silently on card validation: no error message appears when an invalid card is used. Dashboard job list has a noticeable blank flash on first load. Found 4 bugs total: 1 high, 2 medium, 1 low.',
  bugs: [
    {
      id: 'bug_001',
      severity: 'high',
      title: 'Checkout silently fails on invalid card — no error shown',
      steps:
        '1. Go to /pricing\n2. Click "Get started" on Pro plan\n3. Enter card number 4000 0000 0000 9995 (decline test)\n4. Fill valid expiry/CVC\n5. Click "Subscribe"',
      expected: 'Error message: "Your card was declined. Please try a different card."',
      actual:
        'Button spinner runs for 3s, then stops. No error displayed. Form appears ready to resubmit. User has no way to know the charge failed.',
      network_hint: 'POST /api/checkout/create-session → 200 but Stripe returns decline_code: insufficient_funds',
      screenshot_note: 'Button returns to default state without any visible feedback',
    },
    {
      id: 'bug_002',
      severity: 'medium',
      title: 'Signup rejects emails with "+" alias (e.g. user+test@gmail.com)',
      steps:
        '1. Go to /signup\n2. Enter email: jane+work@example.com\n3. Enter valid password\n4. Click "Create account"',
      expected: 'Account created, redirect to dashboard',
      actual:
        'Inline error: "Please enter a valid email address." — The "+" character is valid per RFC 5321 and used by ~8% of Gmail users for email aliases.',
      network_hint: 'POST /api/auth/signup → 422 {"error":"Invalid email format"}',
    },
    {
      id: 'bug_003',
      severity: 'medium',
      title: 'Dashboard blank for 1.4s on first load — no loading state',
      steps:
        '1. Complete signup\n2. Observe /dashboard immediately after redirect',
      expected: 'Skeleton loader or spinner while data fetches',
      actual:
        'Completely blank white area for ~1.4s before job list renders. Looks like the page is broken.',
      network_hint: 'GET /api/jobs → 200 after 1412ms (slow Supabase cold start)',
    },
    {
      id: 'bug_004',
      severity: 'low',
      title: 'Page title unchanged on /pricing — shows generic "App" in tab',
      steps: '1. Navigate to /pricing\n2. Check browser tab title',
      expected: '"Pricing — AcmeSaaS"',
      actual: '"App" — metadata title not set for pricing route',
    },
  ],
  network_log: [
    { method: 'GET',  path: '/',                          status: 200, ms: 198,  size: '42 KB' },
    { method: 'GET',  path: '/pricing',                   status: 200, ms: 167,  size: '38 KB' },
    { method: 'POST', path: '/api/auth/signup',           status: 422, ms: 341,  size: '1.2 KB' },
    { method: 'POST', path: '/api/auth/signup',           status: 200, ms: 287,  size: '0.8 KB' },
    { method: 'GET',  path: '/dashboard',                 status: 200, ms: 154,  size: '55 KB' },
    { method: 'GET',  path: '/api/jobs',                  status: 200, ms: 1412, size: '3.1 KB' },
    { method: 'GET',  path: '/pricing',                   status: 200, ms: 163,  size: '38 KB' },
    { method: 'POST', path: '/api/checkout/create-session', status: 200, ms: 834, size: '1.8 KB' },
    { method: 'GET',  path: '/_next/static/chunks/main.js', status: 200, ms: 89, size: '124 KB' },
  ],
  console_log: [
    { level: 'error', msg: 'Error: Request failed with status code 422 at /api/auth/signup', time: '01:22', source: 'auth.ts:48' },
    { level: 'warn',  msg: 'Warning: Cannot update a component (`Dashboard`) while rendering a different component (`JobList`)', time: '03:41', source: 'react-dom.development.js:86' },
    { level: 'error', msg: 'Stripe: Payment method creation failed — card_declined', time: '16:09', source: 'checkout.ts:112' },
    { level: 'log',   msg: 'PostHog initialized — capturing enabled', time: '00:01', source: 'provider.tsx:18' },
    { level: 'warn',  msg: 'Image with src "/logo.png" was detected as the Largest Contentful Paint (LCP). Use priority prop.', time: '00:03', source: 'next/image' },
  ],
  completed_at: '2025-04-15T14:32:10Z',
  seo_title: 'Sample BetaWindow Report — SaaS Checkout Bug Found',
  seo_description:
    'See a real BetaWindow test session output: 4 bugs found in a SaaS checkout flow, with network logs, console errors, and step-by-step reproduction.',
  og_headline: '4 bugs found in 19 minutes — including a silent payment failure',
}

// ─────────────────────────────────────────────────────────────────────────────
// Report 2: Mobile-specific — quick tier, mobile viewport failures
// ─────────────────────────────────────────────────────────────────────────────
export const REPORT_DEMO_MOBILE: SampleReport = {
  id: 'rpt_demo_002',
  slug: 'demo-mobile',
  title: 'BetaWindow Sample Report — Mobile UX Issues',
  scenario: 'Quick 10-min session focused on mobile viewport (375px)',
  app_name: 'TodoFlow (demo)',
  app_url: 'https://todoflow-demo.vercel.app',
  tier: 'quick',
  tester_initials: 'A.R.',
  duration_seconds: 614,
  rating: 3,
  summary:
    'App works well on desktop. On iPhone SE viewport (375px), the navigation menu overflows and the "Add task" button is hidden behind the keyboard on iOS. The modal close button is too small to tap reliably at 16×16px. 3 mobile-specific bugs found.',
  bugs: [
    {
      id: 'bug_m01',
      severity: 'high',
      title: 'Navigation menu overflows at 375px — items cut off',
      steps:
        '1. Open app on mobile or set viewport to 375×812\n2. Look at the top navigation bar',
      expected: 'Hamburger menu or stacked nav links',
      actual:
        'Nav items overflow horizontally. "Settings" and "Profile" links are invisible without scrolling. No scroll indicator.',
      screenshot_note: 'Only 3 of 5 nav items visible; others clipped off-screen',
    },
    {
      id: 'bug_m02',
      severity: 'high',
      title: '"Add task" button hidden by iOS keyboard on mobile',
      steps:
        '1. Open app on iPhone (or 375px viewport)\n2. Tap in the task input field\n3. Keyboard opens',
      expected: '"Add task" button visible above keyboard',
      actual:
        'Button is positioned at bottom of screen. iOS keyboard covers it completely. No way to submit without closing keyboard first.',
    },
    {
      id: 'bug_m03',
      severity: 'medium',
      title: 'Modal close button (×) too small to tap — 16×16px touch target',
      steps:
        '1. Tap a task to open details modal\n2. Try to close with × button',
      expected: 'Close button ≥44×44px touch target (Apple HIG minimum)',
      actual:
        '× button renders at 16×16px. Required 3 attempts to tap successfully. WCAG 2.5.5 violation.',
    },
  ],
  network_log: [
    { method: 'GET',  path: '/',              status: 200, ms: 234, size: '28 KB' },
    { method: 'GET',  path: '/api/tasks',     status: 200, ms: 445, size: '12 KB' },
    { method: 'POST', path: '/api/tasks',     status: 201, ms: 312, size: '0.4 KB' },
    { method: 'DELETE', path: '/api/tasks/7', status: 204, ms: 198, size: '0 B' },
  ],
  console_log: [
    { level: 'warn',  msg: 'Touch target size below recommended minimum (44×44px) for element: .modal-close', time: '04:18', source: 'a11y.ts' },
    { level: 'log',   msg: 'Viewport: 375×667 (iPhone SE)', time: '00:00', source: 'debug.ts' },
  ],
  completed_at: '2025-04-15T10:15:44Z',
  seo_title: 'Sample BetaWindow Report — 3 Mobile Bugs in 10 Minutes',
  seo_description:
    'BetaWindow found 3 mobile-specific bugs in a quick 10-minute test session: nav overflow, hidden submit button, and inaccessible modal close.',
  og_headline: '3 mobile bugs in 10 minutes — nav overflow, hidden button, tiny touch target',
}

// ─────────────────────────────────────────────────────────────────────────────
// Report 3: Clean pass — deep tier, polished app
// ─────────────────────────────────────────────────────────────────────────────
export const REPORT_DEMO_CLEAN: SampleReport = {
  id: 'rpt_demo_003',
  slug: 'demo-clean',
  title: 'BetaWindow Sample Report — Clean Pass, 5/5 Rating',
  scenario: 'Deep 30-min session, no bugs found — shows what a clean report looks like',
  app_name: 'ShipFast (demo)',
  app_url: 'https://shipfast-demo.vercel.app',
  tier: 'deep',
  tester_initials: 'J.L.',
  duration_seconds: 1834,
  rating: 5,
  summary:
    'Excellent application quality. All flows — signup, team invite, billing, settings, and data export — work correctly on both desktop and mobile. Response times are fast (all API calls under 400ms). The UI is polished and consistent. No bugs found during the 30-minute deep session.',
  bugs: [],
  network_log: [
    { method: 'GET',  path: '/',                    status: 200, ms: 156, size: '38 KB' },
    { method: 'GET',  path: '/dashboard',           status: 200, ms: 178, size: '48 KB' },
    { method: 'GET',  path: '/api/user',            status: 200, ms: 124, size: '0.9 KB' },
    { method: 'POST', path: '/api/team/invite',     status: 201, ms: 287, size: '0.5 KB' },
    { method: 'GET',  path: '/billing',             status: 200, ms: 145, size: '42 KB' },
    { method: 'GET',  path: '/api/invoices',        status: 200, ms: 312, size: '4.2 KB' },
    { method: 'GET',  path: '/settings',            status: 200, ms: 134, size: '36 KB' },
    { method: 'POST', path: '/api/export/csv',      status: 200, ms: 398, size: '18 KB' },
  ],
  console_log: [
    { level: 'log', msg: 'App initialized — version 2.4.1', time: '00:00', source: 'app.ts' },
    { level: 'log', msg: 'PostHog initialized', time: '00:01', source: 'analytics.ts' },
  ],
  completed_at: '2025-04-14T09:22:31Z',
  seo_title: 'Sample BetaWindow Report — 5/5 Clean Pass, No Bugs',
  seo_description:
    'See what a perfect BetaWindow test report looks like: 5/5 rating, 0 bugs across a 30-minute deep session covering all major user flows.',
  og_headline: '5/5 — zero bugs across 30 minutes of deep testing',
}

export const ALL_SAMPLE_REPORTS: SampleReport[] = [
  REPORT_DEMO,
  REPORT_DEMO_MOBILE,
  REPORT_DEMO_CLEAN,
]

export function getSampleReport(slug: string): SampleReport | undefined {
  return ALL_SAMPLE_REPORTS.find(r => r.slug === slug)
}
