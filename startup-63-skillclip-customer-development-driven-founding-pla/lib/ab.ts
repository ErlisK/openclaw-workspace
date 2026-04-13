// lib/ab.ts — A/B variant definitions and assignment logic

export const VARIANT_KEYS = ['control', 'mentor', 'speed'] as const;
export type VariantKey = typeof VARIANT_KEYS[number];

export interface Variant {
  key: VariantKey;
  name: string;
  headline: string;
  subheadline: string;
  heroCta: string;
  badgeLabel: string;
  description: string;
  accentColor: string;
  heroEmoji: string;
}

export const VARIANTS: Record<VariantKey, Variant> = {
  control: {
    key: 'control',
    name: 'Code-Tagged Micro-Badges',
    headline: 'Your skills are real. Now prove it in 90 seconds.',
    subheadline:
      'Upload a short work-sample video, earn jurisdiction-tagged micro-badges reviewed by vetted journeymen, and carry credentials any employer can trust — anywhere.',
    heroCta: 'Get Your Free Badge →',
    badgeLabel: 'Code-Tagged Badges',
    description: 'Focuses on jurisdiction compliance and badge credentialing',
    accentColor: 'yellow',
    heroEmoji: '🏅',
  },
  mentor: {
    key: 'mentor',
    name: 'Live Mentor Verification',
    headline: 'Get verified by a real journeyman. In 30 minutes.',
    subheadline:
      'Book a live 30-minute skill verification with a licensed journeyman in your trade. Walk away with a signed credential that eliminates every employer\'s doubt.',
    heroCta: 'Book a Free Verification →',
    badgeLabel: 'Live Mentor Review',
    description: 'Focuses on human verification and trust',
    accentColor: 'blue',
    heroEmoji: '👷',
  },
  speed: {
    key: 'speed',
    name: '90-Second Proof',
    headline: 'Hired faster. One short video does the work of weeks of paperwork.',
    subheadline:
      'Film yourself doing the job. CertClip turns that clip into a verified credential with a QR code employers can trust instantly — no paperwork, no waiting, no phone tag.',
    heroCta: 'Upload Your First Clip →',
    badgeLabel: 'Instant Proof',
    description: 'Focuses on speed and eliminating friction',
    accentColor: 'green',
    heroEmoji: '⚡',
  },
};

// Deterministic bucket assignment based on session cookie
export function assignVariant(sessionId: string): VariantKey {
  // Simple hash to distribute evenly across 3 buckets
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = (hash * 31 + sessionId.charCodeAt(i)) >>> 0;
  }
  return VARIANT_KEYS[hash % VARIANT_KEYS.length];
}

const SESSION_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateSessionId(): string {
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += SESSION_CHARS[Math.floor(Math.random() * SESSION_CHARS.length)];
  }
  return result;
}
