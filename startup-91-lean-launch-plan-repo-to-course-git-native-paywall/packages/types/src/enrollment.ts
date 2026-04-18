// ============================================================
// Enrollment / Entitlement types
// ============================================================

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  stripeSessionId: string | null;
  stripeSubscriptionId: string | null;
  enrolledAt: string;
  entitlementGrantedAt: string | null;
  entitlementRevokedAt: string | null;
}

/** True if the student has active, unexpired access */
export function isEntitlementActive(enrollment: Enrollment): boolean {
  return (
    enrollment.entitlementGrantedAt !== null && enrollment.entitlementRevokedAt === null
  );
}
