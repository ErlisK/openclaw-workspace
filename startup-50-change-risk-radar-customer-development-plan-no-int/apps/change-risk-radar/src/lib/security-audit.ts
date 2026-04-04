/**
 * security-audit.ts — Security event logging + threat detection
 *
 * Logs auth events, connector changes, API access, and anomalous behaviour
 * to crr_security_audit for compliance, forensics, and alerting.
 *
 * Event categories:
 *   AUTH  — login, logout, token issue, auth failure
 *   CONNECTOR — create, update, delete, rotate credentials
 *   ALERT — alert viewed, reacted, exported
 *   ADMIN — rule change, org update, billing change
 *   API   — rate limit hit, suspicious payload, blocked request
 *   DATA  — bulk export, unusual access pattern
 */

import { supabaseAdmin } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SecurityEventType =
  // Auth events
  | "auth.login"
  | "auth.logout"
  | "auth.login_failed"
  | "auth.token_issued"
  | "auth.token_revoked"
  | "auth.password_reset"
  | "auth.magic_link_used"
  | "auth.oauth_connected"
  // Connector events
  | "connector.created"
  | "connector.updated"
  | "connector.deleted"
  | "connector.credentials_rotated"
  | "connector.test_failed"
  | "connector.unauthorized_access"
  // Alert events
  | "alert.viewed"
  | "alert.reacted"
  | "alert.bulk_export"
  // Admin events
  | "admin.rule_updated"
  | "admin.org_updated"
  | "admin.billing_changed"
  | "admin.notifications_changed"
  // API events
  | "api.rate_limit"
  | "api.invalid_token"
  | "api.blocked_payload"
  | "api.suspicious_pattern"
  // Data events
  | "data.bulk_read"
  | "data.export"
  | "data.deletion"
  // Security events
  | "security.rls_violation"
  | "security.privilege_escalation_attempt"
  | "security.unusual_ip";

export interface SecurityEvent {
  org_id?: string;
  event_type: SecurityEventType;
  actor?: string;           // user email, user_id, or "service"
  actor_ip?: string;
  resource_type?: string;   // "connector", "alert", "org", "rule"
  resource_id?: string;
  action: string;           // human-readable description
  result?: "success" | "failure" | "blocked";
  metadata?: Record<string, unknown>;
  risk_score?: number;      // 0–100; auto-calculated if not provided
}

// ─── Risk Score Calculation ───────────────────────────────────────────────────

const BASE_RISK_SCORES: Record<SecurityEventType, number> = {
  "auth.login": 5,
  "auth.logout": 0,
  "auth.login_failed": 40,
  "auth.token_issued": 10,
  "auth.token_revoked": 15,
  "auth.password_reset": 25,
  "auth.magic_link_used": 10,
  "auth.oauth_connected": 15,
  "connector.created": 20,
  "connector.updated": 25,
  "connector.deleted": 50,
  "connector.credentials_rotated": 30,
  "connector.test_failed": 35,
  "connector.unauthorized_access": 80,
  "alert.viewed": 2,
  "alert.reacted": 5,
  "alert.bulk_export": 40,
  "admin.rule_updated": 30,
  "admin.org_updated": 20,
  "admin.billing_changed": 35,
  "admin.notifications_changed": 15,
  "api.rate_limit": 50,
  "api.invalid_token": 60,
  "api.blocked_payload": 75,
  "api.suspicious_pattern": 70,
  "data.bulk_read": 35,
  "data.export": 45,
  "data.deletion": 60,
  "security.rls_violation": 90,
  "security.privilege_escalation_attempt": 95,
  "security.unusual_ip": 55,
};

function calcRiskScore(event: SecurityEvent): number {
  let score = BASE_RISK_SCORES[event.event_type] ?? 20;
  if (event.result === "failure") score = Math.min(100, score + 20);
  if (event.result === "blocked") score = Math.min(100, score + 10);
  return event.risk_score ?? score;
}

// ─── Core Log Function ────────────────────────────────────────────────────────

/**
 * Log a security event. Fire-and-forget by default.
 * Returns the inserted row id for correlation.
 */
export async function logSecurityEvent(
  event: SecurityEvent,
  opts: { await?: boolean } = {}
): Promise<string | null> {
  const risk_score = calcRiskScore(event);
  const row = {
    org_id: event.org_id ?? null,
    event_type: event.event_type,
    actor: event.actor ?? null,
    actor_ip: event.actor_ip ?? null,
    resource_type: event.resource_type ?? null,
    resource_id: event.resource_id ?? null,
    action: event.action,
    result: event.result ?? "success",
    metadata: event.metadata ?? {},
    risk_score,
  };

  const promise = supabaseAdmin
    .from("crr_security_audit")
    .insert(row)
    .select("id")
    .single();

  if (opts.await) {
    const { data } = await promise;
    return data?.id ?? null;
  }

  // Fire-and-forget, don't block the request
  void promise;
  return null;
}

/**
 * Batch log multiple security events.
 */
export async function logSecurityEvents(events: SecurityEvent[]): Promise<void> {
  const rows = events.map(e => ({
    org_id: e.org_id ?? null,
    event_type: e.event_type,
    actor: e.actor ?? null,
    actor_ip: e.actor_ip ?? null,
    resource_type: e.resource_type ?? null,
    resource_id: e.resource_id ?? null,
    action: e.action,
    result: e.result ?? "success",
    metadata: e.metadata ?? {},
    risk_score: calcRiskScore(e),
  }));
  void supabaseAdmin.from("crr_security_audit").insert(rows);
}

// ─── Typed Convenience Functions ─────────────────────────────────────────────

export function logAuthEvent(
  type: "auth.login" | "auth.logout" | "auth.login_failed" | "auth.token_issued"
    | "auth.magic_link_used" | "auth.oauth_connected" | "auth.password_reset",
  actor: string,
  orgId: string | undefined,
  ip: string | undefined,
  metadata?: Record<string, unknown>,
  result: "success" | "failure" = "success"
): void {
  const labels: Record<string, string> = {
    "auth.login": "User signed in",
    "auth.logout": "User signed out",
    "auth.login_failed": "Failed login attempt",
    "auth.token_issued": "Access token issued",
    "auth.magic_link_used": "Magic link access",
    "auth.oauth_connected": "OAuth provider connected",
    "auth.password_reset": "Password reset initiated",
  };
  void logSecurityEvent({
    org_id: orgId,
    event_type: type,
    actor,
    actor_ip: ip,
    action: labels[type] ?? type,
    result,
    metadata,
  });
}

export function logConnectorEvent(
  type: "connector.created" | "connector.updated" | "connector.deleted"
    | "connector.credentials_rotated" | "connector.test_failed"
    | "connector.unauthorized_access",
  orgId: string,
  connectorType: string,
  actor: string | undefined,
  ip: string | undefined,
  metadata?: Record<string, unknown>
): void {
  const labels: Record<string, string> = {
    "connector.created": `Connector '${connectorType}' connected`,
    "connector.updated": `Connector '${connectorType}' configuration updated`,
    "connector.deleted": `Connector '${connectorType}' removed`,
    "connector.credentials_rotated": `Connector '${connectorType}' credentials rotated`,
    "connector.test_failed": `Connector '${connectorType}' test failed`,
    "connector.unauthorized_access": `Unauthorized access attempt on '${connectorType}' connector`,
  };
  void logSecurityEvent({
    org_id: orgId,
    event_type: type,
    actor,
    actor_ip: ip,
    resource_type: "connector",
    resource_id: connectorType,
    action: labels[type] ?? type,
    result: type === "connector.unauthorized_access" ? "blocked" : "success",
    metadata,
  });
}

export function logAPIEvent(
  type: "api.rate_limit" | "api.invalid_token" | "api.blocked_payload" | "api.suspicious_pattern",
  ip: string | undefined,
  endpoint: string,
  orgId?: string,
  metadata?: Record<string, unknown>
): void {
  void logSecurityEvent({
    org_id: orgId,
    event_type: type,
    actor_ip: ip,
    resource_type: "api",
    resource_id: endpoint,
    action: `${type.replace("api.", "API ")} on ${endpoint}`,
    result: "blocked",
    metadata,
  });
}

// ─── Security Report ──────────────────────────────────────────────────────────

export interface SecurityReport {
  period_days: number;
  total_events: number;
  high_risk_events: number;         // risk_score >= 60
  blocked_events: number;
  failed_events: number;
  by_event_type: Record<string, number>;
  by_result: Record<string, number>;
  top_actor_ips: Array<{ ip: string; count: number }>;
  recent_high_risk: Array<{
    id: string;
    event_type: string;
    action: string;
    actor: string | null;
    actor_ip: string | null;
    risk_score: number;
    created_at: string;
  }>;
  connector_events: number;
  auth_failures: number;
  rls_violations: number;
}

export async function getSecurityReport(
  orgId: string | null,
  periodDays = 7
): Promise<SecurityReport> {
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

  let query = supabaseAdmin
    .from("crr_security_audit")
    .select("id, event_type, action, actor, actor_ip, result, risk_score, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);

  if (orgId) query = query.eq("org_id", orgId);

  const { data: rows } = await query;
  const events = rows ?? [];

  const byType: Record<string, number> = {};
  const byResult: Record<string, number> = {};
  const ipCounts: Record<string, number> = {};

  for (const e of events) {
    byType[e.event_type] = (byType[e.event_type] ?? 0) + 1;
    byResult[e.result ?? "success"] = (byResult[e.result ?? "success"] ?? 0) + 1;
    if (e.actor_ip) ipCounts[e.actor_ip] = (ipCounts[e.actor_ip] ?? 0) + 1;
  }

  const topIPs = Object.entries(ipCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([ip, count]) => ({ ip, count }));

  return {
    period_days: periodDays,
    total_events: events.length,
    high_risk_events: events.filter(e => (e.risk_score ?? 0) >= 60).length,
    blocked_events: events.filter(e => e.result === "blocked").length,
    failed_events: events.filter(e => e.result === "failure").length,
    by_event_type: byType,
    by_result: byResult,
    top_actor_ips: topIPs,
    recent_high_risk: events
      .filter(e => (e.risk_score ?? 0) >= 60)
      .slice(0, 20)
      .map(e => ({
        id: e.id,
        event_type: e.event_type,
        action: e.action,
        actor: e.actor ?? null,
        actor_ip: e.actor_ip ?? null,
        risk_score: e.risk_score ?? 0,
        created_at: e.created_at,
      })),
    connector_events: events.filter(e => e.event_type.startsWith("connector.")).length,
    auth_failures: events.filter(e => e.event_type === "auth.login_failed").length,
    rls_violations: events.filter(e => e.event_type === "security.rls_violation").length,
  };
}

// ─── Request IP Extraction ────────────────────────────────────────────────────

export function extractIP(req: { headers: { get(k: string): string | null } }): string | undefined {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    req.headers.get("cf-connecting-ip") ??
    undefined
  );
}

// ─── Rate Limit Tracker (in-memory, per-IP) ───────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 60;              // 60 requests/min per IP

export function checkRateLimit(ip: string, endpoint: string): { allowed: boolean; remaining: number } {
  const key = `${ip}:${endpoint}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  entry.count++;
  const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count);
  const allowed = entry.count <= RATE_LIMIT_MAX;

  if (!allowed) {
    void logSecurityEvent({
      event_type: "api.rate_limit",
      actor_ip: ip,
      resource_type: "api",
      resource_id: endpoint,
      action: `Rate limit exceeded on ${endpoint} (${entry.count} req/min)`,
      result: "blocked",
      metadata: { count: entry.count, limit: RATE_LIMIT_MAX },
    });
  }

  return { allowed, remaining };
}

// ─── Secret Validation ────────────────────────────────────────────────────────

/** Required env vars with their security classification */
export const REQUIRED_ENV_VARS: Array<{
  key: string;
  scope: "server" | "public";
  description: string;
  sensitive: boolean;
}> = [
  { key: "SUPABASE_SERVICE_ROLE_KEY", scope: "server", description: "Supabase admin access", sensitive: true },
  { key: "NEXT_PUBLIC_SUPABASE_URL", scope: "public", description: "Supabase project URL", sensitive: false },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", scope: "public", description: "Supabase anon key (read-only)", sensitive: false },
  { key: "CRON_SECRET", scope: "server", description: "Cron job authentication secret", sensitive: true },
  { key: "AGENTMAIL_API_KEY", scope: "server", description: "Email delivery API key", sensitive: true },
];

export const OPTIONAL_ENV_VARS: Array<{
  key: string;
  scope: "server";
  description: string;
  sensitive: boolean;
}> = [
  { key: "OPENAI_API_KEY", scope: "server", description: "LLM summarization (optional)", sensitive: true },
  { key: "GOOGLE_CLIENT_ID", scope: "server", description: "Google Workspace OAuth client ID", sensitive: false },
  { key: "GOOGLE_CLIENT_SECRET", scope: "server", description: "Google Workspace OAuth secret", sensitive: true },
  { key: "STRIPE_WEBHOOK_SECRET", scope: "server", description: "Stripe webhook signing secret", sensitive: true },
  { key: "ENABLE_LLM_SUMMARIES", scope: "server", description: "Feature flag for LLM summaries", sensitive: false },
];

export function validateEnvVars(): { ok: boolean; missing: string[]; warnings: string[] } {
  const missing = REQUIRED_ENV_VARS
    .filter(v => !process.env[v.key])
    .map(v => v.key);

  const warnings: string[] = [];
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && cronSecret.length < 24) {
    warnings.push("CRON_SECRET is shorter than 24 characters — consider a longer secret");
  }
  if (process.env.ENABLE_LLM_SUMMARIES === "true" && !process.env.OPENAI_API_KEY) {
    warnings.push("ENABLE_LLM_SUMMARIES=true but OPENAI_API_KEY is not set");
  }

  return { ok: missing.length === 0, missing, warnings };
}

// ─── Connector Scope Definitions (Least Privilege) ────────────────────────────

export interface ConnectorScopeSpec {
  connector: string;
  display_name: string;
  auth_method: string;
  required_scopes: string[];
  forbidden_scopes: string[];
  least_privilege_notes: string;
  iam_policy_json?: string;  // For AWS
  oauth_scopes?: string[];   // For OAuth connectors
}

export const CONNECTOR_SCOPES: ConnectorScopeSpec[] = [
  {
    connector: "stripe",
    display_name: "Stripe",
    auth_method: "API Key (Restricted Key recommended)",
    required_scopes: [
      "read:balance",
      "read:charges",
      "read:customers",
      "read:invoices",
      "read:prices",
      "read:products",
      "read:subscriptions",
      "read:events",
    ],
    forbidden_scopes: [
      "write:charges",
      "write:customers",
      "write:payouts",
      "write:refunds",
      "read:secret_keys",
    ],
    least_privilege_notes:
      "Create a Restricted Key in Stripe Dashboard → Developers → API Keys. " +
      "Grant READ-ONLY access to: Balance, Charges, Customers, Events, Invoices, Prices, Products, Subscriptions. " +
      "Do NOT grant write permissions or access to Connect/Payouts. " +
      "Webhook signing secret is separate and should be rotated after any compromise.",
  },
  {
    connector: "workspace",
    display_name: "Google Workspace",
    auth_method: "OAuth 2.0 Service Account or User OAuth",
    required_scopes: [
      "https://www.googleapis.com/auth/admin.reports.audit.readonly",
      "https://www.googleapis.com/auth/admin.directory.user.readonly",
    ],
    forbidden_scopes: [
      "https://www.googleapis.com/auth/admin.directory.user",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/calendar",
    ],
    least_privilege_notes:
      "Grant only Admin SDK Reports API (audit logs) and Directory API (user list, read-only). " +
      "Do NOT grant Gmail, Drive, Calendar, or write access to Directory. " +
      "OAuth tokens are stored encrypted as `oauth_refresh_token` in `crr_org_connectors`. " +
      "Tokens should be revoked in Google Admin Console if the connector is deleted.",
    oauth_scopes: [
      "https://www.googleapis.com/auth/admin.reports.audit.readonly",
      "https://www.googleapis.com/auth/admin.directory.user.readonly",
    ],
  },
  {
    connector: "aws",
    display_name: "AWS CloudTrail",
    auth_method: "IAM Role (cross-account with ExternalId, Read-Only)",
    required_scopes: [
      "cloudtrail:LookupEvents",
      "cloudtrail:DescribeTrails",
      "cloudtrail:GetTrailStatus",
      "s3:GetObject (on CloudTrail log bucket only)",
    ],
    forbidden_scopes: [
      "cloudtrail:StopLogging",
      "cloudtrail:DeleteTrail",
      "cloudtrail:UpdateTrail",
      "ec2:*",
      "iam:*",
      "s3:PutObject",
      "sts:AssumeRole (without ExternalId)",
    ],
    least_privilege_notes:
      "Create a cross-account IAM role in your AWS account that trusts our account. " +
      "Use ExternalId for confused-deputy protection. " +
      "Attach ONLY the CloudTrail read-only managed policy (arn:aws:iam::aws:policy/AWSCloudTrail_ReadOnlyAccess). " +
      "Do NOT use AdministratorAccess or PowerUserAccess. " +
      "The role ARN is stored (not the secret key) — no long-lived credentials at rest.",
    iam_policy_json: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "CloudTrailReadOnly",
          Effect: "Allow",
          Action: [
            "cloudtrail:LookupEvents",
            "cloudtrail:DescribeTrails",
            "cloudtrail:GetTrailStatus",
            "cloudtrail:GetEventSelectors",
          ],
          Resource: "*",
        },
        {
          Sid: "CloudTrailS3Logs",
          Effect: "Allow",
          Action: ["s3:GetObject", "s3:ListBucket"],
          Resource: ["arn:aws:s3:::YOUR-CLOUDTRAIL-BUCKET", "arn:aws:s3:::YOUR-CLOUDTRAIL-BUCKET/*"],
        },
      ],
    }, null, 2),
  },
];
