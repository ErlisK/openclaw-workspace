// Google Workspace Admin SDK audit event classifier
// Based on Google Workspace Admin activity report event types:
// https://developers.google.com/admin-sdk/reports/v1/appendix/activity/admin-account-settings

export interface WorkspaceRiskEvent {
  risk_level: "high" | "medium" | "low";
  risk_category: "security" | "legal" | "operational";
  title: string;
  summary: string;
  remediation?: string;
}

// Admin SDK event_name → risk classification
export const WORKSPACE_EVENT_MAP: Record<string, WorkspaceRiskEvent> = {
  // ── Super Admin ─────────────────────────────────────────────────────────
  CHANGE_SUPER_ADMIN_STATUS: {
    risk_level: "high", risk_category: "security",
    title: "Google Workspace: Super admin status changed",
    summary: "A user's super admin privileges were granted or revoked. Unauthorized super admin access is a critical security risk.",
    remediation: "Review admin roles in Admin console → Account → Admin roles. Verify the change was intentional.",
  },
  ADD_TO_ADMIN: {
    risk_level: "high", risk_category: "security",
    title: "Google Workspace: User promoted to admin role",
    summary: "A user was granted an administrative role in Google Workspace.",
    remediation: "Confirm the role assignment was authorized in Admin console → Account → Admin roles.",
  },
  REMOVE_FROM_ADMIN: {
    risk_level: "medium", risk_category: "security",
    title: "Google Workspace: User removed from admin role",
    summary: "A user's administrative role was revoked in Google Workspace.",
  },
  SUPER_ADMIN_EMAIL_CREATED: {
    risk_level: "high", risk_category: "security",
    title: "Google Workspace: New super admin account created",
    summary: "A new super admin account was created. This grants full domain control.",
    remediation: "Review in Admin console → Account → Admin roles → Super Admin.",
  },
  // ── Two-Step Verification ────────────────────────────────────────────────
  CHANGE_ALLOWED_2SV_ENROLLMENT: {
    risk_level: "high", risk_category: "security",
    title: "Google Workspace: 2-Step Verification policy changed",
    summary: "The 2-Step Verification (2FA) enforcement policy was modified for your domain. Disabling enforcement increases account takeover risk.",
    remediation: "Review in Admin console → Security → Authentication → 2-Step Verification.",
  },
  ENFORCE_STRONG_AUTHENTICATION: {
    risk_level: "high", risk_category: "security",
    title: "Google Workspace: Strong authentication enforcement changed",
    summary: "The strong authentication (FIDO/security key) enforcement setting was modified.",
  },
  CHANGE_2SV_ENROLLMENT: {
    risk_level: "medium", risk_category: "security",
    title: "Google Workspace: 2FA enrollment changed for a user",
    summary: "A user's 2-Step Verification enrollment status changed. Disabled 2FA increases phishing risk.",
  },
  TOGGLE_CAA_ENABLEMENT: {
    risk_level: "medium", risk_category: "security",
    title: "Google Workspace: Context-Aware Access changed",
    summary: "Context-Aware Access (zero-trust device policy) was enabled or disabled.",
  },
  // ── External Sharing ─────────────────────────────────────────────────────
  CHANGE_EXTERNAL_SHARING_SETTING_FOR_ORG_UNIT: {
    risk_level: "high", risk_category: "security",
    title: "Google Workspace: External sharing settings changed",
    summary: "Google Drive external sharing settings were modified for an organizational unit. Data exfiltration risk may have increased.",
    remediation: "Review in Admin console → Apps → Google Workspace → Drive and Docs → Sharing settings.",
  },
  CHANGE_DATA_SHARING_SETTING: {
    risk_level: "high", risk_category: "security",
    title: "Google Workspace: Data sharing policy changed",
    summary: "Workspace data sharing settings were modified. External access to company data may have changed.",
  },
  TOGGLE_SERVICE_ENABLED: {
    risk_level: "medium", risk_category: "operational",
    title: "Google Workspace: Service toggled on/off",
    summary: "A Google Workspace service was enabled or disabled. Users may lose access to apps or data.",
  },
  CHANGE_APPLICATION_SETTING: {
    risk_level: "medium", risk_category: "operational",
    title: "Google Workspace: Application setting changed",
    summary: "An admin changed settings for a Google Workspace application.",
  },
  // ── Data Export / Privacy ────────────────────────────────────────────────
  INITIATE_EXPORT: {
    risk_level: "high", risk_category: "legal",
    title: "Google Workspace: Data export initiated",
    summary: "A bulk export of Google Workspace data was initiated. This could indicate a security incident or legal hold requirement.",
    remediation: "Verify the export was authorized. Check for data loss prevention (DLP) compliance.",
  },
  DOWNLOAD_USER_DATA: {
    risk_level: "medium", risk_category: "legal",
    title: "Google Workspace: User data downloaded",
    summary: "User data was exported from Google Workspace. Review if this was authorized.",
  },
  // ── User Management ──────────────────────────────────────────────────────
  CREATE_USER: {
    risk_level: "low", risk_category: "operational",
    title: "Google Workspace: New user account created",
    summary: "A new user account was provisioned in Google Workspace.",
  },
  DELETE_USER: {
    risk_level: "medium", risk_category: "operational",
    title: "Google Workspace: User account deleted",
    summary: "A user account was deleted from Google Workspace. Verify offboarding was intentional and data was retained.",
  },
  SUSPEND_USER: {
    risk_level: "medium", risk_category: "operational",
    title: "Google Workspace: User account suspended",
    summary: "A user account was suspended in Google Workspace.",
  },
  UNSUSPEND_USER: {
    risk_level: "medium", risk_category: "operational",
    title: "Google Workspace: User account unsuspended",
    summary: "A previously suspended user account was reactivated.",
  },
  // ── Security policies ────────────────────────────────────────────────────
  CHANGE_AUTHORIZED_NETWORKS: {
    risk_level: "high", risk_category: "security",
    title: "Google Workspace: Authorized networks changed",
    summary: "The list of networks authorized to access Google Workspace was modified. Unauthorized access may be possible from new IP ranges.",
  },
  CHANGE_ADVANCED_PROTECTION_SETTING: {
    risk_level: "high", risk_category: "security",
    title: "Google Workspace: Advanced Protection changed",
    summary: "Advanced Protection (strongest account security) setting was modified for a super admin.",
  },
  CHANGE_ALLOWED_DOMAINS: {
    risk_level: "high", risk_category: "security",
    title: "Google Workspace: Allowed domains list changed",
    summary: "The trusted domains list for Google Workspace was modified. Users may now be able to share data with new external domains.",
  },
  // ── Billing ──────────────────────────────────────────────────────────────
  CHANGE_BILLING_ADMIN: {
    risk_level: "high", risk_category: "operational",
    title: "Google Workspace: Billing admin changed",
    summary: "The billing administrator for Google Workspace was changed. Review subscription and payment access.",
  },
  // ── Audit settings ───────────────────────────────────────────────────────
  CHANGE_AUDIT_SETTING: {
    risk_level: "medium", risk_category: "legal",
    title: "Google Workspace: Audit settings changed",
    summary: "Admin audit logging settings were modified. This may affect compliance reporting capabilities.",
  },
};

// Fallback for events not in the map
export function classifyWorkspaceEvent(eventName: string, applicationName = "admin"): WorkspaceRiskEvent {
  if (WORKSPACE_EVENT_MAP[eventName]) return WORKSPACE_EVENT_MAP[eventName];

  // Pattern-based fallback
  if (eventName.includes("2SV") || eventName.includes("SECURITY") || eventName.includes("AUTH")) {
    return { risk_level: "high", risk_category: "security", title: `Google Workspace: ${eventName}`, summary: `Security-related admin event: ${eventName}` };
  }
  if (eventName.includes("SHARE") || eventName.includes("EXPORT") || eventName.includes("DATA")) {
    return { risk_level: "high", risk_category: "legal", title: `Google Workspace: ${eventName}`, summary: `Data-related admin event: ${eventName}` };
  }
  if (eventName.includes("ADMIN") || eventName.includes("SUPER")) {
    return { risk_level: "high", risk_category: "security", title: `Google Workspace: ${eventName}`, summary: `Admin privilege event: ${eventName}` };
  }
  return {
    risk_level: "medium", risk_category: "operational",
    title: `Google Workspace Admin event: ${eventName}`,
    summary: `An admin event was logged in Google Workspace (${applicationName}): ${eventName}`,
  };
}

// Events that should always trigger high-priority alerts
export const HIGH_PRIORITY_WORKSPACE_EVENTS = new Set([
  "CHANGE_SUPER_ADMIN_STATUS", "ADD_TO_ADMIN", "SUPER_ADMIN_EMAIL_CREATED",
  "CHANGE_ALLOWED_2SV_ENROLLMENT", "ENFORCE_STRONG_AUTHENTICATION",
  "CHANGE_EXTERNAL_SHARING_SETTING_FOR_ORG_UNIT", "CHANGE_DATA_SHARING_SETTING",
  "INITIATE_EXPORT", "CHANGE_AUTHORIZED_NETWORKS",
  "CHANGE_ADVANCED_PROTECTION_SETTING", "CHANGE_ALLOWED_DOMAINS",
]);

// Simulate realistic workspace events for demo orgs (no real OAuth needed)
export function generateSimulatedWorkspaceEvents(): Array<{
  event_name: string;
  actor_email: string;
  timestamp: string;
  details: Record<string, string>;
}> {
  const events: Array<{ event_name: string; actor_email: string; details: Record<string, string> }> = [
    { event_name: "CHANGE_ALLOWED_2SV_ENROLLMENT", actor_email: "admin@example.com", details: { new_value: "OPTIONAL", old_value: "ENFORCED" } },
    { event_name: "ADD_TO_ADMIN", actor_email: "superadmin@example.com", details: { affected_user: "newadmin@example.com", role: "User Management Admin" } },
    { event_name: "CHANGE_EXTERNAL_SHARING_SETTING_FOR_ORG_UNIT", actor_email: "admin@example.com", details: { org_unit: "/Engineering", new_value: "SHARING_ALLOWED", old_value: "SHARING_NOT_ALLOWED" } },
    { event_name: "CHANGE_APPLICATION_SETTING", actor_email: "admin@example.com", details: { application: "Gmail", setting: "DISABLE_EMAIL_AUTOFORWARD", new_value: "FALSE" } },
    { event_name: "CHANGE_AUTHORIZED_NETWORKS", actor_email: "securityadmin@example.com", details: { change_type: "ADD_IP_RANGE", ip_range: "203.0.113.0/24" } },
  ];
  const now = Date.now();
  return events.map((e, i) => ({
    ...e,
    timestamp: new Date(now - i * 86400000 * 2).toISOString(), // Spread over last 10 days
  }));
}
