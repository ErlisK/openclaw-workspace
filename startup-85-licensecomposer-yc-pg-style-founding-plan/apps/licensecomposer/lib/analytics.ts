/**
 * lib/analytics.ts
 * PostHog analytics event helpers.
 * All events are typed; call from client components or 'use client' wrappers.
 *
 * Events tracked:
 *   pageview            — auto via PostHogProvider
 *   wizard_start        — user opens wizard
 *   wizard_step         — user advances wizard step
 *   generate_success    — contract generated successfully
 *   generate_blocked    — generation blocked (cap / premium gate)
 *   export_pdf          — user exports PDF
 *   export_md           — user exports Markdown
 *   export_html         — user exports HTML
 *   accept_license      — buyer accepts a license page
 *   checkout_start      — user clicks checkout CTA
 *   checkout_success    — user lands on /checkout/success
 *   template_view       — user views a template card
 *   template_locked     — user clicks locked premium template
 *   upgrade_cta_click   — user clicks any upgrade/pricing CTA
 */
import posthog from 'posthog-js';

type EventName =
  | 'wizard_start'
  | 'wizard_step'
  | 'generate_success'
  | 'generate_blocked'
  | 'export_pdf'
  | 'export_md'
  | 'export_html'
  | 'accept_license'
  | 'checkout_start'
  | 'checkout_success'
  | 'template_view'
  | 'template_locked'
  | 'upgrade_cta_click';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = Record<string, any>;

/**
 * Capture a PostHog event client-side.
 * Safe to call during SSR (no-ops on server).
 */
export function track(event: EventName, props?: Props): void {
  if (typeof window === 'undefined') return;
  try {
    posthog.capture(event, props);
  } catch {
    // Silently fail — analytics must never break product
  }
}

// ─── Convenience wrappers ────────────────────────────────────────────────────

export const analytics = {
  /** User starts the wizard (any path to /wizard) */
  wizardStart(templateSlug?: string) {
    track('wizard_start', { template_slug: templateSlug });
  },

  /** User advances to a wizard step */
  wizardStep(step: number, licenseType?: string) {
    track('wizard_step', { step, license_type: licenseType });
  },

  /** Contract generated successfully */
  generateSuccess(props: { contractId: string; templateSlug: string; licenseType: string; jurisdictionCode: string }) {
    track('generate_success', props);
  },

  /** Generation blocked (cap or premium gate) */
  generateBlocked(reason: 'export_cap' | 'premium_template_locked', props?: Props) {
    track('generate_blocked', { reason, ...props });
  },

  /** User exports the contract as PDF */
  exportPdf(contractId: string) {
    track('export_pdf', { contract_id: contractId });
  },

  /** User exports the contract as Markdown */
  exportMd(contractId: string) {
    track('export_md', { contract_id: contractId });
  },

  /** User exports the contract as HTML */
  exportHtml(contractId: string) {
    track('export_html', { contract_id: contractId });
  },

  /** Buyer accepts a license page */
  acceptLicense(slug: string, licenseType?: string) {
    track('accept_license', { slug, license_type: licenseType });
  },

  /** User clicks checkout CTA */
  checkoutStart(priceId: string, mode: string, templateSlug?: string) {
    track('checkout_start', { price_id: priceId, mode, template_slug: templateSlug });
  },

  /** User lands on /checkout/success */
  checkoutSuccess(sessionId?: string, plan?: string) {
    track('checkout_success', { session_id: sessionId, plan });
  },

  /** User views a template card */
  templateView(slug: string, tier: string) {
    track('template_view', { slug, tier });
  },

  /** User clicks a locked premium template */
  templateLocked(slug: string) {
    track('template_locked', { slug });
  },

  /** User clicks any upgrade/pricing CTA */
  upgradeCtaClick(source: string) {
    track('upgrade_cta_click', { source });
  },
};
