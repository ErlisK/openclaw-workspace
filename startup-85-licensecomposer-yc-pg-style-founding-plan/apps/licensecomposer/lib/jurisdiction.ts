/**
 * lib/jurisdiction.ts
 * V1 geofencing: only US and UK are fully supported.
 * Any other jurisdiction gets a warning banner but can still proceed.
 */

// ─── V1 supported jurisdictions ───────────────────────────────────────────────
export const V1_JURISDICTIONS = ['US', 'UK'] as const;
export type V1Jurisdiction = (typeof V1_JURISDICTIONS)[number];

export const JURISDICTION_LABELS: Record<string, string> = {
  US: 'United States',
  UK: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  NL: 'Netherlands',
  OTHER: 'Other / International',
};

// All selectable options (v1 supported + common others with warning flag)
export interface JurisdictionOption {
  code: string;
  label: string;
  supported: boolean;   // true = fully supported in v1
  warning?: string;     // shown if !supported
}

export const JURISDICTION_OPTIONS: JurisdictionOption[] = [
  { code: 'US', label: 'United States', supported: true },
  { code: 'UK', label: 'United Kingdom', supported: true },
  { code: 'CA', label: 'Canada', supported: false,
    warning: 'Canadian creators can use this template, but some clauses reference US/UK law. Consider a local attorney review before use in commercial disputes.' },
  { code: 'AU', label: 'Australia', supported: false,
    warning: 'Australian creators can use this template, but it has not been reviewed for Australian consumer-protection or copyright law specifics.' },
  { code: 'DE', label: 'Germany', supported: false,
    warning: 'EU creators: this template does not include GDPR data-processing terms, EU model clauses, or moral-rights waivers required in some EU jurisdictions.' },
  { code: 'FR', label: 'France', supported: false,
    warning: 'EU creators: this template does not include GDPR data-processing terms, EU model clauses, or moral-rights waivers required in some EU jurisdictions.' },
  { code: 'NL', label: 'Netherlands', supported: false,
    warning: 'EU creators: this template does not include GDPR data-processing terms, EU model clauses, or moral-rights waivers required in some EU jurisdictions.' },
  { code: 'OTHER', label: 'Other / International', supported: false,
    warning: 'We don\'t have a lawyer-reviewed template for your jurisdiction yet. This template uses internationally recognised terms but is not tailored to local law. We strongly recommend a local attorney review.' },
];

/**
 * Returns true if the code is a v1-supported jurisdiction.
 */
export function isV1Supported(code: string): code is V1Jurisdiction {
  return (V1_JURISDICTIONS as readonly string[]).includes(code);
}

/**
 * Returns the warning string for an unsupported jurisdiction, or null.
 */
export function getJurisdictionWarning(code: string): string | null {
  if (isV1Supported(code)) return null;
  const opt = JURISDICTION_OPTIONS.find((o) => o.code === code);
  return opt?.warning ?? JURISDICTION_OPTIONS.find(o => o.code === 'OTHER')!.warning!;
}

/**
 * For API use: validate a requested jurisdiction code.
 * Returns { valid, warning, normalised } where normalised maps aliases
 * (e.g. 'GB' → 'UK', 'en-US' → 'US').
 */
export function resolveJurisdiction(raw: string | null | undefined): {
  code: string;
  supported: boolean;
  warning: string | null;
} {
  if (!raw) return { code: 'US', supported: true, warning: null };

  // Normalise aliases
  const upper = raw.toUpperCase().trim();
  const normalised = ALIASES[upper] ?? upper;

  return {
    code: normalised,
    supported: isV1Supported(normalised),
    warning: getJurisdictionWarning(normalised),
  };
}

const ALIASES: Record<string, string> = {
  GB: 'UK',
  'EN-GB': 'UK',
  'EN-US': 'US',
  'EN': 'US',
  'UNITED STATES': 'US',
  'UNITED KINGDOM': 'UK',
  'GREAT BRITAIN': 'UK',
  'ENGLAND': 'UK',
  'WALES': 'UK',
  'SCOTLAND': 'UK',
};
