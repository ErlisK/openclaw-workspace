/**
 * lib/onboarding/steps.ts
 * Onboarding step definitions — single source of truth.
 */

export interface OnboardingStep {
  id: string
  title: string
  description: string
  cta: string              // button label
  href?: string            // navigate to this path
  action?: string          // client-side action to trigger
  icon: string             // emoji
  points: number           // completion credit (display only)
  tooltip?: {
    target: string         // data-onboarding-target attribute value
    placement: 'top' | 'bottom' | 'left' | 'right'
    text: string
  }
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'create_project',
    title: 'Create your first project',
    description: 'Organize your test jobs under a named project with a URL.',
    cta: 'Create project',
    action: 'open_new_project',
    icon: '📁',
    points: 0,
    tooltip: {
      target: 'new-project-btn',
      placement: 'bottom',
      text: 'Start here — create a project to group all your test jobs.',
    },
  },
  {
    id: 'draft_job',
    title: 'Draft a test job',
    description: 'Set the URL, tier, and instructions for your first test session.',
    cta: 'Draft job',
    action: 'open_new_job',
    icon: '✏️',
    points: 0,
    tooltip: {
      target: 'new-job-btn',
      placement: 'bottom',
      text: 'Describe what you want tested — the tester will follow these instructions.',
    },
  },
  {
    id: 'publish_job',
    title: 'Publish your job',
    description: 'Make it visible to testers. They can claim it in minutes.',
    cta: 'Go to jobs',
    href: '/dashboard',
    icon: '🚀',
    points: 0,
    tooltip: {
      target: 'publish-job-btn',
      placement: 'top',
      text: 'Publishing makes your job live — a real tester will pick it up within minutes.',
    },
  },
  {
    id: 'view_report',
    title: 'Read your first report',
    description: 'After testing completes, review the bugs, network log, and console output.',
    cta: 'View sample report',
    href: '/report/demo',
    icon: '📋',
    points: 0,
    tooltip: {
      target: 'view-report-btn',
      placement: 'top',
      text: "Here's what you'll get back — bugs, network log, console captures.",
    },
  },
  {
    id: 'add_credits',
    title: 'Add credits',
    description: 'Load up $10+ to run tests without interruption.',
    cta: 'Add credits',
    href: '/billing',
    icon: '💳',
    points: 0,
    tooltip: {
      target: 'add-credits-btn',
      placement: 'top',
      text: 'Credits are consumed when a job is published. Top up to keep testing.',
    },
  },
]

export const TOTAL_STEPS = ONBOARDING_STEPS.length
