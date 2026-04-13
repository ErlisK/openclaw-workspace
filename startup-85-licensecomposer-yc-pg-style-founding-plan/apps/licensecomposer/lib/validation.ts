/**
 * lib/validation.ts
 * Shared Zod schemas for all API route inputs.
 */
import { z } from 'zod';

// ─── Wizard ────────────────────────────────────────────────────────────────

export const WizardAnswersSchema = z.object({
  license_type:      z.string().min(1).max(100),
  template_slug:     z.string().min(1).max(120).optional(),
  jurisdiction:      z.string().min(1).max(80).optional(),
  platform:          z.string().min(1).max(80).optional(),
  creator_name:      z.string().max(200).optional(),
  product_name:      z.string().max(300).optional(),
  buyer_name:        z.string().max(200).optional(),
  commercial_use:    z.boolean().optional(),
  modifications:     z.boolean().optional(),
  sublicensing:      z.boolean().optional(),
  attribution:       z.boolean().optional(),
  price:             z.number().min(0).max(1_000_000).optional(),
  currency:          z.string().length(3).optional(),
  effective_date:    z.string().max(30).optional(),
  expiry_date:       z.string().max(30).optional(),
  revenue_share:     z.number().min(0).max(100).optional(),
  exclusivity:       z.union([z.boolean(), z.enum(['exclusive', 'non-exclusive'])]).optional(),
  nft_contract:      z.string().max(200).optional(),
  chain:             z.string().max(50).optional(),
  additional_terms:  z.string().max(2000).optional(),
}).passthrough(); // allow extra fields — generator handles unknown keys safely

export const WizardDraftSchema = z.object({
  answers: WizardAnswersSchema.partial(),
  draftId: z.string().max(100).optional(),
});

export const WizardGenerateSchema = z.object({
  answers: WizardAnswersSchema,
  draftId: z.string().max(100).optional(),
});

// ─── Checkout ──────────────────────────────────────────────────────────────

// Allowlist known price IDs to prevent parameter tampering
const ALLOWED_PRICE_IDS = new Set([
  'price_1TLG8fGt92XrRvUuhLnkHLG2', // Unlimited yearly
  'price_1TLG8gGt92XrRvUuGCjTHIqi', // Premium template
]);

const APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://pacttailor.com').replace(/\/$/, '');

function isAllowedRedirectUrl(url: string | undefined): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.origin === APP_ORIGIN;
  } catch {
    return false;
  }
}

export const CheckoutSchema = z.object({
  priceId:      z.string().refine(id => ALLOWED_PRICE_IDS.has(id), {
    message: 'Invalid price ID',
  }),
  mode:         z.enum(['subscription', 'payment']),
  templateId:   z.string().max(100).optional(),
  templateSlug: z.string().max(120).optional(),
  successUrl:   z.string().url().optional().refine(
    url => isAllowedRedirectUrl(url),
    { message: 'successUrl must be on the app origin' }
  ),
  cancelUrl:    z.string().url().optional().refine(
    url => isAllowedRedirectUrl(url),
    { message: 'cancelUrl must be on the app origin' }
  ),
});

// ─── License acceptance ────────────────────────────────────────────────────

export const LicenseAcceptSchema = z.object({
  name:          z.string().min(1).max(200),
  email:         z.string().email().max(320),
  agreedToTerms: z.literal(true),
  message:       z.string().max(1000).optional(),
});

// ─── Exports ───────────────────────────────────────────────────────────────

export const ExportsSchema = z.object({
  contractId: z.string().min(1).max(100),
  formats:    z.array(z.enum(['pdf', 'html', 'md', 'txt', 'jsonld'])).min(1).max(5).optional(),
});

// ─── Contract revise ───────────────────────────────────────────────────────

export const ReviseSchema = z.object({
  note: z.string().min(1).max(500).transform(s => s.trim()),
});

// ─── License pages ─────────────────────────────────────────────────────────

export const LicensePageCreateSchema = z.object({
  contractId: z.string().min(1).max(100),
  slug:       z.string().min(3).max(80).regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens').optional(),
  title:      z.string().min(1).max(200).optional(),
  isPublic:   z.boolean().optional(),
});

// ─── Customer portal ───────────────────────────────────────────────────────

export const CustomerPortalSchema = z.object({
  returnUrl: z.string().url().optional(),
});
