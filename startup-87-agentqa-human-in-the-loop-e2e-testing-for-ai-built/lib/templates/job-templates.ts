/**
 * lib/templates/job-templates.ts
 * 5 ready-made instruction templates selectable by tier.
 * Public — no auth required to browse.
 */

import type { JobTier } from '@/lib/types'

export interface JobTemplate {
  id: string
  title: string
  slug: string
  description: string
  tier: JobTier
  tiers: JobTier[]           // all tiers this template is available in
  category: string
  tags: string[]
  instructions: string       // pre-filled instructions for the job form
  estimated_minutes: number
  what_youll_get: string[]   // bullet list shown in the card
  icon: string
  featured?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────

export const JOB_TEMPLATES: JobTemplate[] = [
  // 1. Signup & Auth smoke test
  {
    id: 'tpl_signup_auth',
    title: 'Signup & Authentication Smoke Test',
    slug: 'signup-auth-smoke-test',
    description:
      'Verify your signup, login, and password-reset flows work end-to-end from a fresh browser. Catches the most common auth bugs before users do.',
    tier: 'quick',
    tiers: ['quick', 'standard'],
    category: 'Authentication',
    tags: ['auth', 'signup', 'login', 'smoke test'],
    icon: '🔑',
    featured: true,
    estimated_minutes: 10,
    what_youll_get: [
      'Signup flow tested (including edge-case emails)',
      'Login and logout verified',
      'Password reset flow checked',
      'Network log of all auth requests',
      'Console error report',
    ],
    instructions: `## Goal
Verify the signup, login, and logout flows work correctly on this application.

## Steps

### 1. Signup
1. Open the app's homepage
2. Click "Sign up" or "Get started"
3. Fill in a test email: **qa-tester-{{timestamp}}@example.com** and a strong password
4. Submit the form
5. **Report:** Does the confirmation/dashboard load? Any errors?

### 2. Signup edge cases
6. Try signing up with an email containing a "+" alias: **qa+test@example.com**
7. Try submitting with an empty email — verify an error is shown
8. Try submitting with a weak password (e.g. "abc") — verify validation fires

### 3. Login
9. Log out if currently logged in
10. Log back in with the email/password from step 3
11. **Report:** Does the dashboard load within 3 seconds?

### 4. Password reset
12. Click "Forgot password" on the login page
13. Enter the test email and submit
14. **Report:** Does a confirmation message appear? Any errors shown?

### 5. Logout
15. Find and click the "Sign out" or "Logout" button
16. **Report:** Were you redirected to the homepage or login page?

## What to report
- Any form that submitted without showing a validation error when it should have
- Any redirect that went to a blank page or 404
- Any console errors (marked [ERROR] in the console log)
- Rating: How smooth did the auth feel for a first-time user?`,
  },

  // 2. Checkout & payments
  {
    id: 'tpl_checkout',
    title: 'Checkout & Payment Flow',
    slug: 'checkout-payment-flow',
    description:
      'Test your entire purchase funnel: pricing page → cart/checkout → Stripe form → confirmation. Finds silent payment failures and broken redirect loops.',
    tier: 'standard',
    tiers: ['standard', 'deep'],
    category: 'Payments',
    tags: ['checkout', 'stripe', 'payments', 'conversion'],
    icon: '💳',
    featured: true,
    estimated_minutes: 20,
    what_youll_get: [
      'Pricing page and plan selection tested',
      'Checkout form filled with Stripe test card',
      'Card decline scenario tested',
      'Post-purchase confirmation/redirect verified',
      'Full network log including Stripe API calls',
    ],
    instructions: `## Goal
Verify the end-to-end checkout and payment flow works correctly using Stripe test cards.

## Stripe test cards to use
- **Success:** 4242 4242 4242 4242, any future expiry, any CVC
- **Decline:** 4000 0000 0000 9995

---

## Steps

### 1. Find the pricing page
1. Navigate to the pricing or plans page (try /pricing, or look for a "Plans" link)
2. **Report:** Do all plans/tiers display correctly? Are prices clearly shown?

### 2. Start checkout — success path
3. Click the "Get started" or "Subscribe" button on any paid plan
4. If a signup is required first, complete it with: **checkout-test@example.com**
5. On the checkout/payment form, enter:
   - Card: **4242 4242 4242 4242**
   - Expiry: **12/34**, CVC: **123**, ZIP: **12345**
6. Click "Subscribe" or "Pay"
7. **Report:** 
   - Did the payment succeed?
   - Were you redirected to a confirmation or success page?
   - Did any error appear?

### 3. Decline path
8. Go back to checkout (or start a new checkout session)
9. Enter the **decline card: 4000 0000 0000 9995**, same expiry/CVC
10. Click "Subscribe"
11. **Report:**
    - Was an error message shown to the user?
    - Was the message clear (e.g. "Your card was declined") or confusing?
    - Could the user retry with a different card?

### 4. Post-purchase state
12. If payment succeeded, check the account/dashboard
13. **Report:** Does the account show the plan is active? Any broken states?

## What to report
- Silent failures (spinner stops, no error shown)
- Broken redirects after payment
- Any network errors (4xx/5xx) on payment endpoints
- Mobile layout issues on the checkout form (if testing on mobile)`,
  },

  // 3. Core app functionality
  {
    id: 'tpl_core_flow',
    title: 'Core App Flow (Create → Use → Result)',
    slug: 'core-app-flow',
    description:
      'Walk through the main user journey of your app: create something, use it, verify the output. Designed to catch the bugs that automated tests miss.',
    tier: 'standard',
    tiers: ['quick', 'standard', 'deep'],
    category: 'Core Product',
    tags: ['core flow', 'happy path', 'user journey', 'smoke test'],
    icon: '🔄',
    featured: true,
    estimated_minutes: 20,
    what_youll_get: [
      'Happy path from signup to main action',
      'Create, edit, and delete flow tested',
      'Loading states and empty states verified',
      'Mobile viewport check',
      'Network + console log',
    ],
    instructions: `## Goal
Test the core user journey of this application — from onboarding through to the main value-delivering action.

---

## Steps

### 1. First impression
1. Open the app URL in a fresh browser (no cookies/cache)
2. **Report:** What do you see first? Is the purpose of the app clear within 5 seconds?
3. Load the page on a 375px viewport (iPhone SE width) — is the layout broken?

### 2. Sign up (or use guest flow)
4. Create a new account, or use any guest/demo flow if available
5. Note: if signup requires email verification, describe the flow

### 3. Main action — CREATE
6. Find the primary "create" action (e.g. New project, New document, Add item)
7. Fill in a realistic test value — don't use "test" or "asdf"
8. Submit the form
9. **Report:** Does the item appear in the list/dashboard? Any errors?

### 4. Main action — READ/USE
10. Click on the item you just created
11. **Report:** Does the detail view load correctly? Is all the information shown?

### 5. Main action — EDIT
12. Find an edit button or inline editing
13. Change a field value and save
14. **Report:** Was the change saved? Did the UI update without a full page reload?

### 6. Main action — DELETE
15. Delete the item you created
16. **Report:** Was it removed from the list? Any confirmation dialog? Any errors?

### 7. Empty state
17. If you deleted all items, observe the empty state
18. **Report:** Is there a helpful empty state with a CTA, or just a blank screen?

### 8. Navigation
19. Test all top-level navigation links
20. **Report:** Any 404s or broken links?

## What to report
- Anything that required more than 2 clicks to figure out
- Any action that had no visual feedback (loading indicator, success message)
- Any content that looks broken on mobile
- All console errors`,
  },

  // 4. Mobile UX
  {
    id: 'tpl_mobile_ux',
    title: 'Mobile UX & Responsive Layout',
    slug: 'mobile-ux-responsive',
    description:
      'Full mobile-first test at 375px and 768px viewports. Finds overflow issues, tiny touch targets, keyboard-covering elements, and iOS-specific bugs.',
    tier: 'quick',
    tiers: ['quick', 'standard'],
    category: 'Mobile',
    tags: ['mobile', 'responsive', 'UX', 'accessibility'],
    icon: '📱',
    estimated_minutes: 10,
    what_youll_get: [
      '375px (iPhone SE) and 768px (iPad) tested',
      'Navigation menu behavior checked',
      'Form input / keyboard interaction tested',
      'Touch target sizes evaluated',
      'Overflow and scroll issues identified',
    ],
    instructions: `## Goal
Test the application on mobile viewports to find layout and UX issues that only appear on smaller screens.

## Viewports to test
- **Mobile:** 375 × 812 (iPhone SE / small Android)
- **Tablet:** 768 × 1024 (iPad)

---

## Steps

### 1. Set mobile viewport (375px)
1. Open the app at 375px width
2. **Check navigation:**
   - Is there a hamburger menu or collapsed nav?
   - Do all navigation links work?
   - Is anything cut off horizontally (requires scrolling left/right)?

### 2. Homepage / landing
3. Scroll through the homepage
4. **Report:** Any text that overflows its container? Any images that break the layout?

### 3. Forms & inputs
5. Find and tap a text input (search, sign up, etc.)
6. On mobile, the keyboard will open
7. **Report:** 
   - Is the submit button still visible above the keyboard?
   - Does the page scroll to show the focused input?
   - Are any inputs too small to tap?

### 4. Interactive elements
8. Check all buttons and links — tap each one
9. **Report:**
   - Any button with a tap target smaller than 44×44px? (feels too small to tap)
   - Any elements that require precise tapping?

### 5. Modals & overlays
10. If the app has modals or drawers, open one
11. **Report:**
    - Can it be closed easily on mobile?
    - Does it take up the full viewport correctly?
    - Is the close button reachable without scrolling?

### 6. Switch to 768px
12. Resize to 768px width and repeat the key checks
13. **Report:** Any elements that work at 375px but break at 768px, or vice versa?

### 7. iOS-specific
14. Look for: inputs that zoom in (font-size < 16px), position: fixed elements that disappear behind the address bar
15. **Report:** Any zoom-on-focus behavior?

## What to report
- Specific elements that overflow or are hidden
- Exact pixel width where layout breaks (if you can determine it)
- Any interaction that required multiple taps`,
  },

  // 5. Deep accessibility & edge cases
  {
    id: 'tpl_deep_ux',
    title: 'Deep UX Audit: Edge Cases & Error Handling',
    slug: 'deep-ux-audit-edge-cases',
    description:
      'A thorough 30-minute session probing error states, edge case inputs, loading behavior, and accessibility basics. Best for pre-launch validation.',
    tier: 'deep',
    tiers: ['deep'],
    category: 'UX Audit',
    tags: ['deep', 'UX', 'edge cases', 'error handling', 'accessibility'],
    icon: '🔬',
    estimated_minutes: 30,
    what_youll_get: [
      'Edge case inputs tested (long text, special chars, emojis)',
      'Error state and validation messages reviewed',
      'Loading/skeleton states evaluated',
      'Keyboard navigation (Tab key) tested',
      'WCAG contrast and focus indicators noted',
      'Full network + console log (30 min)',
    ],
    instructions: `## Goal
A comprehensive UX audit focusing on edge cases, error states, and accessibility basics. This 30-minute session should probe every failure mode the app might encounter.

---

## Section 1: Input edge cases (8 min)

### 1. Text fields
1. In every form on the page, try:
   - Very long text (100+ characters) — does the field handle it gracefully?
   - Special characters: \`<script>alert(1)</script>\`, \`' OR 1=1\`, emojis: 🎉🔥
   - Whitespace only — does the form accept a space as a valid value?
2. **Report:** Any crashes, garbled output, or missing validation?

### 2. Numbers and dates
3. If the app has numeric inputs: try negative numbers, 0, very large numbers (999999999)
4. If the app has date pickers: try past dates, future dates, invalid dates (Feb 30)
5. **Report:** Any unexpected behavior?

---

## Section 2: Error states (7 min)

### 3. API errors
6. Try actions that should fail:
   - Submit a form while offline (disable network in DevTools if possible, or disconnect WiFi)
   - Rapid-click a submit button multiple times
7. **Report:** Is a user-friendly error shown, or a raw error/blank state?

### 4. Validation messages
8. Submit every required form with fields empty
9. **Report:** 
   - Are validation errors shown inline (next to fields) or just at the top?
   - Are the messages helpful ("Email is required") or generic ("Invalid input")?

---

## Section 3: Loading & performance (5 min)

### 5. Loading states
10. Navigate between pages and observe loading
11. **Report:**
    - Is there a loading indicator (spinner, skeleton, progress bar)?
    - Any pages that show blank white for >1 second?
    - Any layout shift (content jumping) after load?

---

## Section 4: Keyboard & accessibility (10 min)

### 6. Keyboard navigation
12. Tab through the page using only the keyboard (no mouse)
13. **Report:**
    - Can you reach all interactive elements with Tab?
    - Is there a visible focus ring on each element?
    - Does Tab order make logical sense?

### 7. Screen reader basics
14. Check that images have alt text (right-click → Inspect → look for alt= attribute)
15. Check that form inputs have labels (not just placeholder text)
16. **Report:** Any inputs with no label? Any decorative images without alt=""?

### 8. Color contrast
17. Look at text on colored backgrounds (buttons, badges, banners)
18. **Report:** Any text that's hard to read (light gray on white, yellow on white, etc.)?

---

## What to report
- Any input that accepted clearly invalid data silently
- Any error that showed a blank screen instead of a message
- Any element unreachable by keyboard
- Overall rating of the app's polish and error handling`,
  },
]

export const TEMPLATE_CATEGORIES = [
  ...new Set(JOB_TEMPLATES.map(t => t.category)),
]

export function getTemplate(id: string): JobTemplate | undefined {
  return JOB_TEMPLATES.find(t => t.id === id || t.slug === id)
}

export function getTemplatesByTier(tier: JobTier): JobTemplate[] {
  return JOB_TEMPLATES.filter(t => t.tiers.includes(tier))
}
