// ============================================================
// Affiliate + Referral domain types (v2)
// ============================================================

export interface Affiliate {
  id: string;
  affiliateUserId: string;
  creatorId: string;
  courseId: string | null;           // NULL = applies to all creator courses
  code: string;                      // The ?ref= value
  commissionPct: number;
  cookieDays: number;
  isActive: boolean;
  totalClicks: number;               // Denormalized for dashboard speed
  totalConversions: number;
  totalEarnedCents: number;
  createdAt: string;
}

export type UserAgentType = 'human' | 'bot' | 'unknown';

export interface Referral {
  id: string;
  affiliateId: string;
  courseId: string | null;
  referrerUrl: string | null;
  landingUrl: string | null;
  ipHash: string | null;
  userAgentType: UserAgentType;
  converted: boolean;
  purchaseId: string | null;
  commissionCents: number | null;
  paidAt: string | null;
  stripeTransferId: string | null;
  clickedAt: string;
  convertedAt: string | null;
}
