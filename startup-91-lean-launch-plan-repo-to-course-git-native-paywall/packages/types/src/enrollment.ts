// ============================================================
// Enrollment + Purchase domain types (v2)
// ============================================================

export type PurchaseStatus = 'pending' | 'completed' | 'refunded' | 'disputed';

export interface Purchase {
  id: string;
  userId: string;
  courseId: string;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  amountCents: number;
  currency: string;
  affiliateId: string | null;
  referralId: string | null;
  status: PurchaseStatus;
  refundedAt: string | null;
  purchasedAt: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  purchaseId: string | null;
  entitlementGrantedAt: string | null;
  entitlementRevokedAt: string | null;
  stripeSubscriptionId: string | null;
  lessonsCompleted: number;
  lastLessonId: string | null;
  completedAt: string | null;
  enrolledAt: string;
}

/** True if the student has active, unexpired access */
export function isEntitlementActive(enrollment: Enrollment): boolean {
  return (
    enrollment.entitlementGrantedAt !== null && enrollment.entitlementRevokedAt === null
  );
}
