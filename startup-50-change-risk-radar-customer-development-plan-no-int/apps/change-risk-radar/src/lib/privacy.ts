/**
 * privacy.ts — PII redaction + privacy mode helpers
 *
 * Privacy mode (enabled by default for all orgs):
 *   - Redacts PII from alert summaries, raw_facts, and security audit logs
 *   - Masks customer IDs, IP addresses, email addresses in displayed text
 *   - Does NOT delete data — redaction is applied at display time only
 *   - Orgs can disable privacy mode to see full details (opt-out)
 *
 * Toggle: PATCH /api/orgs/privacy { privacy_mode: boolean }
 */

import { supabaseAdmin } from "@/lib/supabase";

// Re-export redaction utilities from synthetic-data (single source of truth)
export { redactPII, redactSummary, redactRawFacts } from "./synthetic-data";

// ─── Privacy Mode Settings ────────────────────────────────────────────────────

export async function getPrivacyMode(orgId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("crr_orgs")
    .select("privacy_mode")
    .eq("id", orgId)
    .single();
  // Default: true (privacy mode ON)
  return data?.privacy_mode ?? true;
}

export async function setPrivacyMode(orgId: string, enabled: boolean): Promise<void> {
  await supabaseAdmin
    .from("crr_orgs")
    .update({ privacy_mode: enabled })
    .eq("id", orgId);
}

// ─── Alert Privacy Application ────────────────────────────────────────────────

export interface AlertWithPrivacy {
  id: string;
  vendor_slug: string;
  risk_level: string;
  risk_category: string;
  severity?: string;
  title: string;
  summary?: string;
  impact_text?: string;
  action_text?: string;
  source_url?: string;
  raw_facts?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  privacy_redacted?: boolean;
  [key: string]: unknown;
}

/**
 * Apply privacy redaction to an alert row.
 * Called at display time — never modifies stored data.
 */
export function applyAlertPrivacy(
  alert: AlertWithPrivacy,
  privacyMode: boolean
): AlertWithPrivacy {
  if (!privacyMode) return alert;

  const { redactPII, redactRawFacts } = require("./synthetic-data") as typeof import("./synthetic-data");

  return {
    ...alert,
    summary: alert.summary ? redactPII(alert.summary) : alert.summary,
    impact_text: alert.impact_text ? redactPII(alert.impact_text) : alert.impact_text,
    action_text: alert.action_text ? redactPII(alert.action_text) : alert.action_text,
    raw_facts: alert.raw_facts ? redactRawFacts(alert.raw_facts) : undefined,
    privacy_redacted: true,
  };
}

export function applyAlertsPrivacy(
  alerts: AlertWithPrivacy[],
  privacyMode: boolean
): AlertWithPrivacy[] {
  if (!privacyMode) return alerts;
  return alerts.map(a => applyAlertPrivacy(a, privacyMode));
}

// ─── Privacy Redaction Report ─────────────────────────────────────────────────

export function getPrivacyRedactionStats(text: string): {
  emailsRedacted: number;
  ipsRedacted: number;
  idsRedacted: number;
} {
  const emailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
  const ipMatches = text.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g) ?? [];
  const idMatches = text.match(/\b(cus_|price_|prod_|evt_|sg-|arn:aws:)[a-zA-Z0-9-_/]+/g) ?? [];
  return {
    emailsRedacted: emailMatches.length,
    ipsRedacted: ipMatches.length,
    idsRedacted: idMatches.length,
  };
}
