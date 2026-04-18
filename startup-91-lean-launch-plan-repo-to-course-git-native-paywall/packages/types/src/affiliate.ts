// ============================================================
// Affiliate domain types
// ============================================================

export interface Affiliate {
  id: string;
  userId: string;        // The affiliate (sharer)
  courseId: string | null;
  creatorId: string;     // The course creator
  code: string;          // The ?ref= value
  commissionPct: number;
  isActive: boolean;
  createdAt: string;
}

export interface AffiliateClick {
  id: string;
  affiliateId: string;
  courseId: string | null;
  referrerUrl: string | null;
  ipHash: string | null;
  userAgentType: 'human' | 'bot' | 'unknown';
  clickedAt: string;
}

export interface AffiliateConversion {
  id: string;
  affiliateId: string;
  enrollmentId: string | null;
  commissionCents: number;
  paidAt: string | null;
  stripeTransferId: string | null;
  createdAt: string;
}
