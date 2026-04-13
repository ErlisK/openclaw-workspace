/**
 * lib/wizard-types.ts
 * Shared types for the 5-step wizard.
 */

export type LicenseType =
  | 'digital_asset_license'
  | 'commission_agreement'
  | 'collaborator_split'
  | 'nft_license';

export interface WizardAnswers {
  // Step 1: What are you making?
  license_type: LicenseType;
  template_slug?: string;

  // Step 2: Platform & jurisdiction
  platform: string;        // 'itch', 'gumroad', 'opensea', 'direct', 'multiple'
  jurisdiction: string;    // 'US' | 'UK' | other

  // Step 3: License terms
  exclusivity: 'exclusive' | 'non-exclusive';
  attribution_required: boolean;
  duration: 'perpetual' | '1year' | '3year' | '5year';
  commercial_use: boolean;
  client_work: boolean;
  print_on_demand: boolean;
  no_ai_training: boolean;
  no_resale: boolean;

  // Step 4: Commercial / split terms
  // Used for commission_agreement:
  commission_type?: string;
  total_fee?: number;
  currency?: string;
  deposit_percent?: number;
  revision_count?: string;
  rights_type?: string;
  // Used for collaborator_split:
  split_a_percent?: number;
  split_b_percent?: number;
  party_a_name?: string;
  party_b_name?: string;
  // Used for asset_license / commission:
  product_name?: string;
  creator_name?: string;
  client_name?: string;
  delivery_format?: string;
  delivery_date?: string;

  // Step 5: Review (no new fields — just review)
}

export const STEP_LABELS = [
  'License type',
  'Platform & jurisdiction',
  'License terms',
  'Your details',
  'Review & generate',
] as const;

export const TOTAL_STEPS = STEP_LABELS.length;

export const LICENSE_TYPE_OPTIONS: {
  value: LicenseType;
  label: string;
  description: string;
  emoji: string;
}[] = [
  {
    value: 'digital_asset_license',
    label: 'Asset License',
    description: 'Sell a digital asset (sprites, fonts, audio, templates, brushes)',
    emoji: '📦',
  },
  {
    value: 'commission_agreement',
    label: 'Commission Agreement',
    description: 'Get hired for custom artwork, sprites, or design work',
    emoji: '🎨',
  },
  {
    value: 'collaborator_split',
    label: 'Collaborator Split',
    description: 'Co-creating something and splitting the revenue',
    emoji: '🤝',
  },
  {
    value: 'nft_license',
    label: 'NFT License',
    description: 'Sell digital art as an NFT on a marketplace',
    emoji: '🔗',
  },
];

export const PLATFORM_OPTIONS = [
  { value: 'itch',          label: 'itch.io' },
  { value: 'gumroad',       label: 'Gumroad' },
  { value: 'opensea',       label: 'OpenSea' },
  { value: 'personal_site', label: 'My own website' },
  { value: 'multiple',      label: 'Multiple platforms' },
  { value: 'direct',        label: 'Direct / offline' },
];

export const DURATION_OPTIONS = [
  { value: 'perpetual', label: 'Perpetual (forever)' },
  { value: '5year',     label: '5 years' },
  { value: '3year',     label: '3 years' },
  { value: '1year',     label: '1 year' },
];

export const CURRENCY_OPTIONS = [
  { value: 'USD', symbol: '$',  label: 'USD ($)' },
  { value: 'GBP', symbol: '£',  label: 'GBP (£)' },
  { value: 'EUR', symbol: '€',  label: 'EUR (€)' },
];

export const REVISION_OPTIONS = [
  { value: '1',         label: '1 round' },
  { value: '2',         label: '2 rounds' },
  { value: '3',         label: '3 rounds' },
  { value: 'unlimited', label: 'Unlimited (not recommended)' },
];

export const RIGHTS_TYPE_OPTIONS = [
  { value: 'personal_license',  label: 'Personal use license',          help: 'Client uses for personal enjoyment only. You keep copyright.' },
  { value: 'commercial_license', label: 'Commercial use license',        help: 'Client can use commercially. You keep copyright.' },
  { value: 'work_for_hire',     label: 'Work-for-hire (client owns)',    help: 'Client owns copyright from day one. Charge more for this.' },
  { value: 'full_transfer',     label: 'Full copyright transfer',        help: 'You transfer all rights after full payment.' },
];

export const DEPOSIT_OPTIONS = [
  { value: 25,  label: '25% upfront' },
  { value: 50,  label: '50% upfront (recommended)' },
  { value: 100, label: '100% upfront' },
];

/** Map license_type → best template slug */
export const DEFAULT_TEMPLATE: Record<LicenseType, string> = {
  digital_asset_license: 'game-asset-pack-commercial',
  commission_agreement:  'illustration-commission-commercial',
  collaborator_split:    'two-person-game-dev-split',
  nft_license:           'nft-commercial-license-opensea',
};

export const EMPTY_ANSWERS: WizardAnswers = {
  license_type: 'digital_asset_license',
  platform: 'itch',
  jurisdiction: 'US',
  exclusivity: 'non-exclusive',
  attribution_required: false,
  duration: 'perpetual',
  commercial_use: true,
  client_work: false,
  print_on_demand: false,
  no_ai_training: true,
  no_resale: true,
};
