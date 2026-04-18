// ============================================================
// User domain types
// ============================================================

export type SaasTier = 'free' | 'creator' | 'marketplace';

export interface User {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  websiteUrl: string | null;
  twitterHandle: string | null;
  githubHandle: string | null;
  stripeCustomerId: string | null;
  stripeConnectAccountId: string | null;
  saasTier: SaasTier;
  saasSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
}
