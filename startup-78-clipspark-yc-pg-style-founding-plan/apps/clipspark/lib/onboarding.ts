/**
 * Onboarding checklist steps definition.
 * Each step has an id, label, description, and what action completes it.
 */

export interface ChecklistStep {
  id: string
  label: string
  desc: string
  cta: string
  cta_href?: string
  tip?: string
  completed?: boolean
  skippable?: boolean
}

export const CHECKLIST_STEPS: ChecklistStep[] = [
  {
    id: 'upload_first',
    label: 'Upload your first episode',
    desc: 'Upload an MP3, MP4, or paste a YouTube/podcast URL.',
    cta: 'Upload now →',
    cta_href: '/upload',
    tip: 'Tip: Even a 10-minute episode generates 3–5 great clips.',
  },
  {
    id: 'preview_clip',
    label: 'Watch a preview clip',
    desc: 'ClipSpark picks your best moments. Review the previews — no editing needed.',
    cta: 'View your clips →',
    cta_href: '/dashboard',
    tip: 'Tip: The hook score shown next to each clip predicts how engaging it will be.',
  },
  {
    id: 'approve_captions',
    label: 'Approve captions on one clip',
    desc: 'Open a clip, check the auto-captions, and tweak any words if needed.',
    cta: 'Edit a clip →',
    cta_href: '/dashboard',
    tip: 'Tip: Captions increase completion rate by ~40% on Shorts and Reels.',
  },
  {
    id: 'publish_clip',
    label: 'Publish your first clip',
    desc: 'Export and post to YouTube Shorts, LinkedIn, or TikTok.',
    cta: 'Publish a clip →',
    cta_href: '/dashboard',
    tip: 'Tip: Post within 24h of your episode drop for maximum reach.',
  },
  {
    id: 'save_template',
    label: 'Save or fork a template',
    desc: 'Browse the template library and save one that fits your style.',
    cta: 'Browse templates →',
    cta_href: '/templates',
    tip: 'Tip: Templates with high community upvotes get 2× more views on average.',
    skippable: true,
  },
  {
    id: 'connect_account',
    label: 'Connect YouTube or LinkedIn',
    desc: 'One-click publish — no copy-paste. Connect your account in Settings.',
    cta: 'Connect accounts →',
    cta_href: '/settings',
    tip: 'Tip: Connected accounts also auto-fetch view counts for heuristic tuning.',
    skippable: true,
  },
]

export const STEP_IDS = CHECKLIST_STEPS.map(s => s.id)
