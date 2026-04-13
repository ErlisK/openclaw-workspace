/**
 * summarizer.ts — Plain-English template engine + guarded LLM summarization
 *
 * Pipeline:
 *   1. Build RawFacts from event data (always stored, immutable audit trail)
 *   2. Try exact template (vendor.event_name)
 *   3. Try category template (risk_category.detection_method)
 *   4. Fall back to generic template
 *   5. Optionally enhance with LLM if ENABLE_LLM_SUMMARIES=true + API key present
 *
 * Summary output always includes:
 *   - title       — action-oriented, ≤80 chars
 *   - summary     — 1-2 sentence plain English, what happened
 *   - impact      — what it means for the org
 *   - action      — what to do about it
 *   - method      — 'template' | 'llm' | 'passthrough'
 *   - templateKey — which template was used (for A/B telemetry)
 */

import { supabaseAdmin } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RawFacts {
  // Common fields
  event_name?: string;
  vendor_slug?: string;
  vendor_display?: string;
  source?: string;            // 'stripe_webhook' | 'cloudtrail' | 'workspace_webhook' | 'content_diff'
  collected_at?: string;

  // Stripe webhook facts
  stripe_object?: string;     // 'price', 'customer', 'subscription', 'invoice', etc.
  stripe_event_id?: string;
  price_id?: string;
  product_id?: string;
  old_unit_amount?: number;
  new_unit_amount?: number;
  currency?: string;
  interval?: string;          // 'month' | 'year'
  customer_id?: string;
  subscription_id?: string;
  invoice_id?: string;
  amount_due?: number;
  status?: string;
  reason?: string;
  nickname?: string;
  lookup_key?: string;

  // AWS CloudTrail facts
  aws_event_name?: string;
  aws_user_name?: string;
  aws_account_id?: string;
  aws_region?: string;
  aws_resource_arn?: string;
  aws_source_ip?: string;
  aws_user_agent?: string;
  aws_error_code?: string;
  aws_error_msg?: string;
  policy_name?: string;
  role_name?: string;
  group_name?: string;
  bucket_name?: string;
  trail_name?: string;
  key_id?: string;
  instance_id?: string;
  sg_id?: string;

  // Google Workspace facts
  workspace_event?: string;
  workspace_actor?: string;
  workspace_target?: string;
  workspace_ip?: string;
  workspace_app?: string;
  admin_email?: string;
  target_email?: string;
  setting_name?: string;
  old_value?: string;
  new_value?: string;

  // Content diff facts (observatory)
  diff_id?: string;
  page_title?: string;
  page_url?: string;
  diff_type?: string;         // 'pricing_page_diff' | 'changelog_scrape' | 'tos_diff' | 'trust_page_diff'
  lines_added?: number;
  lines_removed?: number;
  keywords_found?: string[];
  snippet?: string;           // first 200 chars of the diff

  // Rule engine context
  rule_id?: string;
  rule_name?: string;
  rule_category?: string;
  confidence_score?: number;
  match_reason?: string;

  // Raw payload (for LLM context, truncated)
  raw_payload?: Record<string, unknown>;
}

export interface SummaryOutput {
  title: string;
  summary: string;
  impact: string;
  action: string;
  method: "template" | "llm" | "passthrough";
  templateKey: string;
  llmModel?: string;
  tokensUsed?: number;
  rawFacts: RawFacts;
}

// ─── Template Registry ────────────────────────────────────────────────────────

type TemplateFn = (f: RawFacts) => { title: string; summary: string; impact: string; action: string };

const vendor = (slug: string | undefined) =>
  (slug ?? "vendor").replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());

const amt = (cents: number | undefined, currency = "USD") =>
  cents != null ? `$${(cents / 100).toFixed(2)} ${currency.toUpperCase()}` : "an unknown amount";

const pct = (old_: number | undefined, new_: number | undefined) => {
  if (!old_ || !new_) return "";
  const d = ((new_ - old_) / old_) * 100;
  return ` (${d > 0 ? "+" : ""}${d.toFixed(1)}%)`;
};

// Registry: key = "vendor_slug.event_name" or "category.detection_method" or "generic"
const TEMPLATES: Record<string, TemplateFn> = {

  // ── Stripe Pricing ───────────────────────────────────────────────────────
  "stripe.price.updated": f => ({
    title: `Stripe price updated: ${f.nickname ?? f.price_id ?? "plan"} → ${amt(f.new_unit_amount, f.currency)}${pct(f.old_unit_amount, f.new_unit_amount)}`,
    summary: `Stripe sent a \`price.updated\` event for price ${f.price_id ?? "unknown"}. The unit amount changed from ${amt(f.old_unit_amount, f.currency)} to ${amt(f.new_unit_amount, f.currency)}${f.interval ? ` per ${f.interval}` : ""}.`,
    impact: `Any customers on this price will see their next invoice at the new amount. If you have fixed-price contracts, this may create billing discrepancies requiring manual reconciliation.`,
    action: `Review your customer list on this price. Communicate the change to affected customers within 30 days per Stripe's billing notice requirements. Update pricing pages and contracts.`,
  }),

  "stripe.price.created": f => ({
    title: `New Stripe price created: ${amt(f.new_unit_amount, f.currency)}${f.interval ? `/${f.interval}` : ""}`,
    summary: `A new price object (${f.price_id ?? "unknown"}) was created in your Stripe account for product ${f.product_id ?? "unknown"} at ${amt(f.new_unit_amount, f.currency)}${f.interval ? ` per ${f.interval}` : ""}.`,
    impact: `This price is now available for checkout sessions and subscriptions. Verify it matches your intended pricing strategy.`,
    action: `Confirm this price was created intentionally. If unexpected, audit your Stripe API keys for unauthorized access.`,
  }),

  "stripe.customer.subscription.updated": f => ({
    title: `Stripe subscription updated: status → ${f.status ?? "unknown"}`,
    summary: `Stripe sent a \`customer.subscription.updated\` event. Subscription ${f.subscription_id ?? "unknown"} for customer ${f.customer_id ?? "unknown"} changed status to \`${f.status ?? "unknown"}\`.`,
    impact: `Subscription status changes affect your MRR. A transition to \`past_due\` or \`canceled\` indicates revenue at risk.`,
    action: `Check your dunning configuration. For \`past_due\`, Stripe's Smart Retries will attempt recovery; review failed payment emails.`,
  }),

  "stripe.customer.subscription.deleted": f => ({
    title: `Stripe subscription canceled: ${f.subscription_id ?? "unknown"}`,
    summary: `Customer ${f.customer_id ?? "unknown"}'s subscription (${f.subscription_id ?? "unknown"}) was deleted${f.reason ? ` — reason: ${f.reason}` : ""}.`,
    impact: `This represents MRR churn. ${f.reason === "cancellation_requested" ? "Customer-initiated cancellation." : "This may be involuntary churn from failed payments."}`,
    action: `Trigger your win-back sequence. Review churn reason. For payment failures, offer an update payment method link.`,
  }),

  "stripe.invoice.payment_failed": f => ({
    title: `Stripe payment failed: ${amt(f.amount_due)} invoice ${f.invoice_id ?? ""}`,
    summary: `Invoice ${f.invoice_id ?? "unknown"} for ${amt(f.amount_due, f.currency)} failed to collect from customer ${f.customer_id ?? "unknown"}.`,
    impact: `Revenue at risk. Repeated failures result in subscription cancellation per your dunning settings. This may also trigger churn.`,
    action: `Verify your Smart Retry schedule in Stripe. Send a manual payment-update email to the customer. Check for card expiry.`,
  }),

  "stripe.invoice.payment_succeeded": f => ({
    title: `Stripe invoice paid: ${amt(f.amount_due)} from ${f.customer_id ?? "customer"}`,
    summary: `Invoice ${f.invoice_id ?? "unknown"} for ${amt(f.amount_due, f.currency)} was successfully paid by customer ${f.customer_id ?? "unknown"}.`,
    impact: `Revenue recognized. Subscription remains active.`,
    action: `No action required. Verify the amount matches expected MRR if amount looks unusual.`,
  }),

  "stripe.customer.created": f => ({
    title: `New Stripe customer created`,
    summary: `A new customer object (${f.customer_id ?? "unknown"}) was created in your Stripe account.`,
    impact: `New customer in your CRM pipeline. If this was unexpected, audit API key exposure.`,
    action: `Verify the customer creation was expected (signup flow). If suspicious, revoke the Stripe API key used.`,
  }),

  "stripe.radar.early_fraud_warning.created": f => ({
    title: `⚠️ Stripe fraud warning on charge ${f.customer_id ?? ""}`,
    summary: `Stripe Radar issued an early fraud warning. This indicates a high probability of fraudulent activity on this transaction.`,
    impact: `High risk. Chargebacks typically follow within 5–60 days. Stripe may auto-refund to reduce dispute fees.`,
    action: `Issue a refund proactively to avoid chargeback fees ($15–$25 each). Review account for additional suspicious activity. Consider enabling Stripe Radar rules.`,
  }),

  // ── AWS CloudTrail Security ──────────────────────────────────────────────
  "aws.CreateUser": f => ({
    title: `AWS IAM user created: ${f.aws_user_name ?? "unknown"}`,
    summary: `A new IAM user "${f.aws_user_name ?? "unknown"}" was created in AWS account ${f.aws_account_id ?? "unknown"} (region: ${f.aws_region ?? "unknown"}) by ${f.aws_user_agent ?? "unknown"} from IP ${f.aws_source_ip ?? "unknown"}.`,
    impact: `New IAM users expand your attack surface. Unrecognized users indicate possible account compromise or insider threat.`,
    action: `Verify the creator's identity and the user's purpose. If unexpected, disable the user immediately via IAM console. Enable MFA. Review recent CloudTrail logs for the source IP.`,
  }),

  "aws.DeleteUser": f => ({
    title: `AWS IAM user deleted: ${f.aws_user_name ?? "unknown"}`,
    summary: `IAM user "${f.aws_user_name ?? "unknown"}" was deleted from AWS account ${f.aws_account_id ?? "unknown"}.`,
    impact: `Deletion of users can break dependent services or applications using those credentials. If unexpected, may indicate account compromise.`,
    action: `Confirm this deletion was authorized. Check if any services used this user's access keys. Update service credentials if needed.`,
  }),

  "aws.AttachUserPolicy": f => ({
    title: `AWS IAM policy attached: ${f.policy_name ?? "unknown"} → ${f.aws_user_name ?? "user"}`,
    summary: `Policy "${f.policy_name ?? "unknown"}" was attached to IAM user "${f.aws_user_name ?? "unknown"}" in account ${f.aws_account_id ?? "unknown"}.`,
    impact: `Permission escalation. If this is an admin or broad policy, this user can now access sensitive resources or make destructive changes.`,
    action: `Review the attached policy's permissions. Verify the action was authorized. Apply principle of least privilege — consider whether a more restrictive policy would suffice.`,
  }),

  "aws.DetachUserPolicy": f => ({
    title: `AWS IAM policy detached: ${f.policy_name ?? "unknown"} from ${f.aws_user_name ?? "user"}`,
    summary: `Policy "${f.policy_name ?? "unknown"}" was detached from IAM user "${f.aws_user_name ?? "unknown"}".`,
    impact: `Reduced permissions for this user. May break dependent workflows if the policy was required for automation.`,
    action: `Verify this was intentional. Test dependent applications/scripts that ran as this user.`,
  }),

  "aws.StopLogging": f => ({
    title: `🚨 AWS CloudTrail logging STOPPED: ${f.trail_name ?? "trail"}`,
    summary: `CloudTrail trail "${f.trail_name ?? "unknown"}" had logging stopped in account ${f.aws_account_id ?? "unknown"} from IP ${f.aws_source_ip ?? "unknown"}.`,
    impact: `CRITICAL: You are now blind to all API calls in this account. Attackers often stop CloudTrail to cover their tracks. This is a top-3 indicator of account compromise.`,
    action: `Re-enable logging IMMEDIATELY. Review IAM activity in the last 15 minutes from other sources (VPC Flow Logs, GuardDuty). Consider this a potential active incident. Invoke your incident response playbook.`,
  }),

  "aws.DeleteTrail": f => ({
    title: `🚨 AWS CloudTrail trail deleted: ${f.trail_name ?? "trail"}`,
    summary: `CloudTrail trail "${f.trail_name ?? "unknown"}" was deleted in account ${f.aws_account_id ?? "unknown"}.`,
    impact: `CRITICAL: All API activity logging destroyed. This is a strong indicator of account compromise or insider threat. You have no audit trail of recent actions.`,
    action: `Recreate the trail immediately. Invoke your incident response process. Rotate all IAM credentials. Review S3 bucket for any pre-deletion logs.`,
  }),

  "aws.CreateAccessKey": f => ({
    title: `AWS access key created for ${f.aws_user_name ?? "user"}`,
    summary: `A new access key was created for IAM user "${f.aws_user_name ?? "unknown"}" in account ${f.aws_account_id ?? "unknown"}.`,
    impact: `New programmatic credentials increase your attack surface. Exposed keys can be used for unauthorized API calls, data exfiltration, or resource abuse.`,
    action: `Verify this key was created intentionally. Scan code repositories (GitHub, GitLab) for accidental key commits. Enable alerts for key usage from unexpected IPs.`,
  }),

  "aws.DeleteAccessKey": f => ({
    title: `AWS access key deleted for ${f.aws_user_name ?? "user"}`,
    summary: `An access key was deleted for IAM user "${f.aws_user_name ?? "unknown"}".`,
    impact: `Any services using this key will lose access immediately. Dependency breakage possible.`,
    action: `Confirm dependent services have been updated to use new credentials before deletion. Check for broken pipelines/apps.`,
  }),

  "aws.PutBucketPolicy": f => ({
    title: `AWS S3 bucket policy modified: ${f.bucket_name ?? "bucket"}`,
    summary: `Bucket policy for "${f.bucket_name ?? "unknown"}" was updated in account ${f.aws_account_id ?? "unknown"}.`,
    impact: `S3 policy changes can expose bucket contents publicly or restrict legitimate access. Public policies create data exposure risk.`,
    action: `Review the new policy for \`"Principal": "*"\` statements that allow public access. Use S3 Block Public Access as a safety net. Verify S3 Object Ownership settings.`,
  }),

  "aws.DeleteBucket": f => ({
    title: `⚠️ AWS S3 bucket deleted: ${f.bucket_name ?? "bucket"}`,
    summary: `S3 bucket "${f.bucket_name ?? "unknown"}" was permanently deleted in account ${f.aws_account_id ?? "unknown"}.`,
    impact: `Data loss risk. S3 object deletion is permanent (without versioning). All content in the bucket is gone unless versioning was enabled.`,
    action: `Check if versioning was enabled (enables recovery). If data is lost, check if cross-region replication existed. Review who made this call and why.`,
  }),

  "aws.AuthorizeSecurityGroupIngress": f => ({
    title: `AWS security group opened: ${f.sg_id ?? "sg"} (new inbound rule)`,
    summary: `New inbound rule added to security group "${f.sg_id ?? "unknown"}" in account ${f.aws_account_id ?? "unknown"}.`,
    impact: `Network exposure increased. Rules allowing 0.0.0.0/0 on ports 22 (SSH) or 3389 (RDP) are critical security risks.`,
    action: `Review the new rule's port range and source CIDR. Restrict SSH/RDP to known IP ranges. Use VPN or SSM Session Manager instead of direct SSH.`,
  }),

  "aws.ConsoleLogin": f => ({
    title: `AWS console login${f.aws_error_code ? " FAILED" : ""}: ${f.aws_user_name ?? "user"}`,
    summary: `${f.aws_error_code ? "Failed" : "Successful"} AWS console login by "${f.aws_user_name ?? "unknown"}" from IP ${f.aws_source_ip ?? "unknown"}${f.aws_error_code ? ` — error: ${f.aws_error_code}` : ""}.`,
    impact: `${f.aws_error_code ? "Repeated failures indicate a brute force or credential stuffing attempt." : "Console logins should always use MFA. Unexpected logins from unusual IPs may indicate compromised credentials."}`,
    action: `${f.aws_error_code ? "If this is unexpected, check for credential exposure. Consider temporarily disabling the user." : "Verify this login was expected. If from an unfamiliar IP, review for account compromise."}`,
  }),

  "aws.DisableKey": f => ({
    title: `AWS KMS key disabled: ${f.key_id ?? "key"}`,
    summary: `KMS key "${f.key_id ?? "unknown"}" was disabled in account ${f.aws_account_id ?? "unknown"}.`,
    impact: `All resources encrypted with this key (EBS volumes, S3 objects, RDS databases, Secrets Manager) will become inaccessible.`,
    action: `Verify this was intentional. If a mistake, re-enable the key immediately. Disabling KMS keys can cause data inaccessibility and application outages.`,
  }),

  "aws.ScheduleKeyDeletion": f => ({
    title: `⚠️ AWS KMS key scheduled for deletion: ${f.key_id ?? "key"}`,
    summary: `KMS key "${f.key_id ?? "unknown"}" has been scheduled for deletion in account ${f.aws_account_id ?? "unknown"}.`,
    impact: `IRREVERSIBLE after waiting period (7–30 days). Deletion of encryption keys permanently destroys access to all data encrypted by them.`,
    action: `Cancel the deletion immediately if not intentional using \`CancelKeyDeletion\`. Audit all resources using this key before proceeding. This action cannot be undone after the waiting period.`,
  }),

  // ── Google Workspace ─────────────────────────────────────────────────────
  "workspace.SUSPICIOUS_LOGIN": f => ({
    title: `🔒 Suspicious Workspace login: ${f.workspace_target ?? f.workspace_actor ?? "user"}`,
    summary: `Google Workspace flagged a suspicious sign-in for account "${f.workspace_target ?? f.workspace_actor ?? "unknown"}" from IP ${f.workspace_ip ?? "unknown"}.`,
    impact: `Potential account compromise. Attackers with Workspace access can exfiltrate email, calendar, Drive files, and Admin SDK data.`,
    action: `Force a password reset and revoke active sessions in Admin Console → Users. Enable 2-Step Verification enforcement. Review recent email forwarding rules for this account.`,
  }),

  "workspace.ADMIN_PRIVILEGE_GRANT": f => ({
    title: `Google Workspace admin privileges granted to ${f.workspace_target ?? "user"}`,
    summary: `Admin "${f.workspace_actor ?? "unknown"}" granted admin privileges to user "${f.workspace_target ?? "unknown"}" in Google Workspace.`,
    impact: `New admins can reset passwords, access all files, and disable security settings. Unexpected escalation is a top indicator of insider threat or compromised admin account.`,
    action: `Verify this was authorized. Review admin roles granted. Ensure 2FA is enforced for all admin accounts. Audit admin activity for the past 7 days.`,
  }),

  "workspace.CHANGE_APPLICATION_SETTING": f => ({
    title: `Workspace app setting changed: ${f.setting_name ?? "setting"} in ${f.workspace_app ?? "app"}`,
    summary: `Setting "${f.setting_name ?? "unknown"}" was changed from "${f.old_value ?? "??"}" to "${f.new_value ?? "??"}" in Google Workspace application "${f.workspace_app ?? "unknown"}" by ${f.workspace_actor ?? "admin"}.`,
    impact: `Application setting changes can affect security posture (e.g., disabling 2FA), data sharing policies, or user capabilities across your entire organization.`,
    action: `Review whether this setting change aligns with your security policy. Check the Google Workspace security checklist for the affected app.`,
  }),

  "workspace.ADD_APPLICATION": f => ({
    title: `New app authorized in Google Workspace: ${f.workspace_app ?? "unknown"}`,
    summary: `Application "${f.workspace_app ?? "unknown"}" was granted OAuth access to Google Workspace by ${f.workspace_actor ?? "admin"}.`,
    impact: `Third-party apps with admin SDK access can read organizational data, manage users, and access all Drive files. Unauthorized apps create data exfiltration risk.`,
    action: `Review the app's OAuth scopes in Admin Console → Security → API Controls. Remove if not recognized or not needed. Restrict third-party app installs to approved apps only.`,
  }),

  "workspace.REMOVE_APPLICATION": f => ({
    title: `App removed from Google Workspace: ${f.workspace_app ?? "unknown"}`,
    summary: `Application "${f.workspace_app ?? "unknown"}" had its OAuth authorization removed from Google Workspace.`,
    impact: `Any integrations depending on this app (Slack, Zapier, HR tools, etc.) will stop working.`,
    action: `Verify dependent integrations are still functional. If the removal was accidental, re-authorize via Admin Console.`,
  }),

  "workspace.DOWNLOAD": f => ({
    title: `Large data download in Google Workspace by ${f.workspace_actor ?? "user"}`,
    summary: `User "${f.workspace_actor ?? "unknown"}" performed a bulk download event in Google Workspace (${f.workspace_app ?? "Drive"}).`,
    impact: `Bulk downloads can indicate data exfiltration, especially near employee departure dates. Drive data includes sensitive business files.`,
    action: `Review what files were downloaded. Check if this user has recently resigned or been placed under an HR investigation. Consider a DLP policy for bulk exports.`,
  }),

  "workspace.CHANGE_BASIC_SETTING": f => ({
    title: `Workspace basic setting changed by ${f.workspace_actor ?? "admin"}`,
    summary: `A basic domain setting was modified in Google Workspace Admin Console by "${f.workspace_actor ?? "unknown"}".${f.setting_name ? ` Setting: ${f.setting_name}` : ""} ${f.old_value ? `Changed from "${f.old_value}" to "${f.new_value}".` : ""}`,
    impact: `Domain-wide settings affect all users. Changes to password policies, session length, or mobile management can weaken your security posture.`,
    action: `Review the changed setting against your security baseline. Revert if unauthorized or accidental.`,
  }),

  // ── Content Diff — Pricing Pages ─────────────────────────────────────────
  "pricing.pricing_page_diff": f => ({
    title: `${vendor(f.vendor_slug)} pricing page changed${f.keywords_found?.length ? `: ${f.keywords_found.slice(0, 3).join(", ")}` : ""}`,
    summary: `The pricing page for ${vendor(f.vendor_slug)} has changed (+${f.lines_added ?? 0} / -${f.lines_removed ?? 0} lines).${f.snippet ? ` Excerpt: "${f.snippet.slice(0, 150)}…"` : ""}`,
    impact: `Pricing changes may affect your costs, contract terms, or how you position against this vendor to customers. Feature tier changes may remove capabilities you depend on.`,
    action: `Compare old vs. new pricing tiers. Update internal cost models and customer-facing materials if you resell or reference this vendor's pricing.`,
  }),

  // ── Content Diff — Changelog ─────────────────────────────────────────────
  "pricing.changelog_scrape": f => ({
    title: `${vendor(f.vendor_slug)} changelog update detected`,
    summary: `${vendor(f.vendor_slug)} published a changelog update (+${f.lines_added ?? 0} / -${f.lines_removed ?? 0} lines).${f.snippet ? ` Preview: "${f.snippet.slice(0, 120)}…"` : ""}`,
    impact: `Changelog entries may include deprecations, breaking API changes, or security patches that require action.`,
    action: `Review the full changelog entry. Flag any deprecated features you use, scheduled API version sunsetting, or security patches requiring immediate upgrade.`,
  }),

  "operational.changelog_scrape": f => ({
    title: `${vendor(f.vendor_slug)} changelog: operational change detected`,
    summary: `${vendor(f.vendor_slug)}'s changelog includes updates that may affect operations (+${f.lines_added ?? 0} / -${f.lines_removed ?? 0} lines).${f.keywords_found?.length ? ` Keywords: ${f.keywords_found.slice(0, 4).join(", ")}.` : ""}`,
    impact: `API or product changes can break integrations, require configuration updates, or demand engineering effort to stay current.`,
    action: `Assign an engineer to review the changelog items. Check if any deprecated APIs you use have sunset dates. Schedule upgrade work.`,
  }),

  // ── Content Diff — ToS / Legal ───────────────────────────────────────────
  "legal.tos_diff": f => ({
    title: `${vendor(f.vendor_slug)} Terms of Service updated`,
    summary: `${vendor(f.vendor_slug)}'s Terms of Service document changed (+${f.lines_added ?? 0} / -${f.lines_removed ?? 0} lines).${f.snippet ? ` Changed section: "${f.snippet.slice(0, 150)}…"` : ""}`,
    impact: `ToS changes may include new data processing terms, jurisdiction changes, arbitration clauses, or liability limitations that affect your compliance posture and contracts.`,
    action: `Have legal review the diff before accepting. Pay attention to: data processing agreements (GDPR/CCPA implications), limitation of liability changes, and new prohibited uses that may affect your use case.`,
  }),

  "legal.trust_page_diff": f => ({
    title: `${vendor(f.vendor_slug)} security/trust page updated`,
    summary: `${vendor(f.vendor_slug)}'s trust or security page changed (+${f.lines_added ?? 0} / -${f.lines_removed ?? 0} lines).${f.snippet ? ` Preview: "${f.snippet.slice(0, 120)}…"` : ""}`,
    impact: `Trust page changes may reflect updates to certifications (SOC 2, ISO 27001), breach disclosures, or changes in security practices that affect your vendor risk assessment.`,
    action: `Review for: removed certifications (downgrade risk), new breach disclosures, changes to data residency, or incident response SLA changes.`,
  }),

  "vendor_risk.trust_page_diff": f => ({
    title: `${vendor(f.vendor_slug)} trust/security page updated`,
    summary: `${vendor(f.vendor_slug)}'s security posture page changed (+${f.lines_added ?? 0} / -${f.lines_removed ?? 0} lines). ${f.keywords_found?.length ? `Keywords: ${f.keywords_found.slice(0, 4).join(", ")}.` : ""}`,
    impact: `Security posture changes affect your third-party risk assessment. Removed certifications or added breach disclosures require review against your vendor risk policy.`,
    action: `Update your vendor risk register. If certifications were removed, verify current compliance status directly. Escalate to your security team if a breach is implied.`,
  }),

  // ── Category-Level Fallbacks ─────────────────────────────────────────────
  "security.cloudtrail_event": f => ({
    title: `Security event in ${vendor(f.vendor_slug)}: ${f.event_name ?? f.aws_event_name ?? "unknown"}`,
    summary: `A security-relevant CloudTrail event \`${f.aws_event_name ?? f.event_name ?? "unknown"}\` was recorded in account ${f.aws_account_id ?? "unknown"} by ${f.aws_user_name ?? "unknown"} from ${f.aws_source_ip ?? "unknown"}.`,
    impact: `Security events in AWS may indicate unauthorized access, privilege escalation, or configuration changes that weaken your security posture.`,
    action: `Review the CloudTrail event details. Verify the actor is authorized. Check for associated events in the same session using CloudTrail Lake or Athena queries.`,
  }),

  "security.stripe_webhook": f => ({
    title: `Security-relevant Stripe event: ${f.event_name ?? "unknown"}`,
    summary: `Stripe sent a security-related webhook event \`${f.event_name ?? "unknown"}\`${f.customer_id ? ` for customer ${f.customer_id}` : ""}.`,
    impact: `Stripe security events may indicate fraudulent activity, compromised API keys, or unauthorized account access.`,
    action: `Review Stripe dashboard for the specific event. If fraud-related, consider enabling Stripe Radar advanced rules. Rotate API keys if unauthorized access is suspected.`,
  }),

  "security.workspace_webhook": f => ({
    title: `Security event in Google Workspace: ${f.event_name ?? f.workspace_event ?? "unknown"}`,
    summary: `Google Workspace audit log recorded security event \`${f.workspace_event ?? f.event_name ?? "unknown"}\`${f.workspace_actor ? ` by ${f.workspace_actor}` : ""}${f.workspace_target ? ` affecting ${f.workspace_target}` : ""}.`,
    impact: `Workspace security events may indicate compromised accounts, unauthorized data access, or administrative changes that weaken your security posture.`,
    action: `Investigate in Admin Console → Reports → Audit. Enforce 2-step verification. Review recent login activity for affected accounts.`,
  }),

  "pricing.stripe_webhook": f => ({
    title: `Stripe pricing event: ${f.event_name ?? "unknown"}`,
    summary: `Stripe sent pricing-related event \`${f.event_name ?? "unknown"}\`${f.price_id ? ` for price ${f.price_id}` : ""}${f.new_unit_amount != null ? ` at ${amt(f.new_unit_amount, f.currency)}` : ""}.`,
    impact: `Pricing changes affect your revenue model and customer billing. Unexpected changes may indicate unauthorized API access.`,
    action: `Verify this change was authorized. Update pricing pages and customer communications if needed.`,
  }),

  "operational.cloudtrail_event": f => ({
    title: `AWS operational change: ${f.aws_event_name ?? f.event_name ?? "unknown"}`,
    summary: `CloudTrail recorded \`${f.aws_event_name ?? f.event_name ?? "unknown"}\` in account ${f.aws_account_id ?? "unknown"}.`,
    impact: `Infrastructure changes can affect availability, performance, and costs. Unauthorized changes indicate security risk.`,
    action: `Verify this change was part of an approved change management process. Review for impact on running workloads.`,
  }),

  "vendor_risk.pricing_page_diff": f => ({
    title: `${vendor(f.vendor_slug)} vendor risk: pricing page changed`,
    summary: `${vendor(f.vendor_slug)}'s pricing page changed (+${f.lines_added ?? 0} / -${f.lines_removed ?? 0} lines), which may indicate a pricing model shift or vendor financial pressure.`,
    impact: `Vendor pricing changes can affect your SaaS costs and margin. Significant increases may require contract renegotiation or vendor replacement.`,
    action: `Compare new pricing to current contract. Assess renewal risk. Consider reaching out to your account manager for clarification.`,
  }),

  // ── Generic Fallback ─────────────────────────────────────────────────────
  "generic": f => ({
    title: `${vendor(f.vendor_slug)} change detected${f.event_name ? `: ${f.event_name}` : ""}`,
    summary: `A change was detected for ${vendor(f.vendor_slug)}${f.event_name ? ` (event: \`${f.event_name}\`)` : ""}${f.rule_name ? ` matching rule "${f.rule_name}"` : ""}.${f.snippet ? ` Detail: "${f.snippet.slice(0, 150)}"` : ""}`,
    impact: `This change may affect your operational, financial, legal, or security posture depending on the nature of the change.`,
    action: `Review the source URL or event details. React with 'Acknowledge' once reviewed, or 'Not useful' if this is a false positive to improve future detection.`,
  }),
};

// ─── Template Lookup ──────────────────────────────────────────────────────────

export function lookupTemplate(facts: RawFacts, category?: string, detectionMethod?: string): { fn: TemplateFn; key: string } {
  // 1. Exact: vendor.event_name
  const vendorKey = `${facts.vendor_slug}.${facts.event_name}`;
  if (facts.vendor_slug && facts.event_name && TEMPLATES[vendorKey]) {
    return { fn: TEMPLATES[vendorKey], key: vendorKey };
  }

  // 2. Category shorthand (e.g., "stripe.price.updated" without vendor prefix)
  const eventKey = facts.event_name ?? "";
  if (eventKey && TEMPLATES[eventKey]) {
    return { fn: TEMPLATES[eventKey], key: eventKey };
  }

  // 3. category.detection_method (e.g., "legal.tos_diff")
  if (category && detectionMethod) {
    const catKey = `${category}.${detectionMethod}`;
    if (TEMPLATES[catKey]) {
      return { fn: TEMPLATES[catKey], key: catKey };
    }
  }

  // 4. Source-based fallback (e.g., "security.cloudtrail_event")
  if (category && facts.source) {
    const sourceKey = `${category}.${facts.source}`;
    if (TEMPLATES[sourceKey]) {
      return { fn: TEMPLATES[sourceKey], key: sourceKey };
    }
  }

  // 5. Generic fallback
  return { fn: TEMPLATES["generic"], key: "generic" };
}

// ─── LLM Summarizer (guarded) ─────────────────────────────────────────────────

const LLM_ENABLED = process.env.ENABLE_LLM_SUMMARIES === "true";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL ?? "gpt-4o-mini";
const LLM_MAX_FACTS_CHARS = 800; // Limit context sent to LLM for cost control

/** Budget guard: check DB budget before calling LLM */
async function checkLLMBudget(orgId: string, estimatedTokens = 300): Promise<boolean> {
  if (!LLM_ENABLED || !OPENAI_API_KEY) return false;
  try {
    const { data } = await supabaseAdmin
      .from("crr_orgs")
      .select("llm_summaries_enabled, llm_daily_budget_cents, llm_tokens_used_today, llm_budget_reset_at")
      .eq("id", orgId)
      .single();
    if (!data?.llm_summaries_enabled) return false;
    // Reset daily counter
    const resetAt = new Date(data.llm_budget_reset_at);
    const now = new Date();
    if (now.getTime() - resetAt.getTime() > 24 * 60 * 60 * 1000) {
      await supabaseAdmin.from("crr_orgs").update({ llm_tokens_used_today: 0, llm_budget_reset_at: now.toISOString() }).eq("id", orgId);
      data.llm_tokens_used_today = 0;
    }
    // Cost: ~$0.0002/1K tokens for gpt-4o-mini; daily_budget_cents in cents
    const costCents = Math.ceil((estimatedTokens / 1000) * 2);
    const todayCostCents = Math.ceil((data.llm_tokens_used_today / 1000) * 2);
    return (todayCostCents + costCents) <= data.llm_daily_budget_cents;
  } catch {
    return false;
  }
}

/** Call OpenAI (or compatible) to enhance a template summary */
async function callLLM(
  templateOutput: { title: string; summary: string; impact: string; action: string },
  facts: RawFacts,
  ruleContext: string,
): Promise<{ title: string; summary: string; impact: string; action: string; tokensUsed: number } | null> {
  if (!OPENAI_API_KEY) return null;

  const factsStr = JSON.stringify({
    ...facts,
    raw_payload: undefined, // exclude large payloads
  }).slice(0, LLM_MAX_FACTS_CHARS);

  const systemPrompt = `You are a business-risk analyst writing plain-English summaries for a SaaS change monitoring platform.
You receive structured facts about a vendor change and a template-generated summary. Your job is to:
1. Rewrite the summary to be more specific using the actual facts provided
2. Keep it concise (≤2 sentences for summary, ≤1 sentence for impact, ≤2 sentences for action)
3. Use exact numbers/names/IDs from the facts where available
4. Stay factual — do not speculate beyond the facts
5. Return JSON only: {"title":"...","summary":"...","impact":"...","action":"..."}

Context: ${ruleContext}
Template output (use as floor): ${JSON.stringify(templateOutput)}`;

  const userMsg = `Facts: ${factsStr}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMsg }],
        max_tokens: 300,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
      usage: { total_tokens: number };
    };
    const parsed = JSON.parse(data.choices[0]?.message?.content ?? "{}") as Record<string, string>;
    if (!parsed.summary || !parsed.title) return null;
    return {
      title: parsed.title ?? templateOutput.title,
      summary: parsed.summary ?? templateOutput.summary,
      impact: parsed.impact ?? templateOutput.impact,
      action: parsed.action ?? templateOutput.action,
      tokensUsed: data.usage?.total_tokens ?? 0,
    };
  } catch {
    return null;
  }
}

// ─── Main Summarizer ──────────────────────────────────────────────────────────

/**
 * Generate a plain-English summary for an alert.
 * Always stores raw facts. LLM is optional and guarded.
 */
export async function summarize(
  facts: RawFacts,
  opts: {
    orgId?: string;
    riskCategory?: string;
    detectionMethod?: string;
    ruleName?: string;
    allowLLM?: boolean;  // override; defaults to global LLM_ENABLED
  } = {}
): Promise<SummaryOutput> {
  const { orgId, riskCategory, detectionMethod, ruleName, allowLLM = LLM_ENABLED } = opts;

  // Always build template first (guaranteed fallback, no latency)
  const { fn, key } = lookupTemplate(facts, riskCategory, detectionMethod);
  const templateOut = fn(facts);

  // Try LLM enhancement if enabled + budget available
  let method: "template" | "llm" | "passthrough" = "template";
  let llmModel: string | undefined;
  let tokensUsed = 0;
  let finalOut = templateOut;

  if (allowLLM && orgId && LLM_ENABLED && OPENAI_API_KEY) {
    const budgetOk = await checkLLMBudget(orgId, 300);
    if (budgetOk) {
      const ruleCtx = [ruleName, riskCategory, detectionMethod, facts.vendor_slug].filter(Boolean).join(" / ");
      const llmOut = await callLLM(templateOut, facts, ruleCtx).catch(() => null);
      if (llmOut) {
        finalOut = { title: llmOut.title, summary: llmOut.summary, impact: llmOut.impact, action: llmOut.action };
        method = "llm";
        llmModel = LLM_MODEL;
        tokensUsed = llmOut.tokensUsed;
        // Update token usage
        if (tokensUsed > 0) {
          void supabaseAdmin.rpc("check_llm_budget", { p_org_id: orgId, p_tokens_estimate: tokensUsed });
        }
      }
    }
  }

  return {
    title: finalOut.title,
    summary: finalOut.summary,
    impact: finalOut.impact,
    action: finalOut.action,
    method,
    templateKey: key,
    llmModel,
    tokensUsed: tokensUsed || undefined,
    rawFacts: facts,
  };
}

/**
 * Log summary generation to audit table (async, fire-and-forget)
 */
export function logSummaryAudit(
  alertId: string,
  orgId: string,
  result: SummaryOutput,
  latencyMs: number,
  llmPrompt?: string,
  llmResponse?: string,
): void {
  void supabaseAdmin.from("crr_summary_audit").insert({
    alert_id: alertId,
    org_id: orgId,
    method: result.method,
    template_key: result.templateKey,
    llm_model: result.llmModel ?? null,
    llm_prompt: llmPrompt ?? null,
    llm_response: llmResponse ?? null,
    tokens_in: result.tokensUsed ?? 0,
    tokens_out: 0,
    latency_ms: latencyMs,
  });
}

/**
 * Build RawFacts from a Stripe webhook event payload
 */
export function stripeEventToFacts(event: Record<string, unknown>): RawFacts {
  const obj = (event.data as Record<string, unknown>)?.object as Record<string, unknown> ?? {};
  return {
    event_name: event.type as string,
    vendor_slug: "stripe",
    vendor_display: "Stripe",
    source: "stripe_webhook",
    stripe_event_id: event.id as string,
    stripe_object: obj.object as string,
    price_id: (obj.id as string) || undefined,
    product_id: (obj.product as string) || undefined,
    old_unit_amount: (event as Record<string, unknown> & { previous_attributes?: { unit_amount?: number } }).previous_attributes?.unit_amount,
    new_unit_amount: obj.unit_amount as number || undefined,
    currency: obj.currency as string || undefined,
    interval: (obj.recurring as Record<string, unknown>)?.interval as string || undefined,
    customer_id: (obj.customer as string) || undefined,
    subscription_id: (obj.subscription as string) || undefined,
    invoice_id: (obj.id as string) || undefined,
    amount_due: obj.amount_due as number || undefined,
    status: obj.status as string || undefined,
    reason: obj.cancellation_reason as string || obj.reason as string || undefined,
    nickname: obj.nickname as string || obj.lookup_key as string || undefined,
    raw_payload: { id: event.id, type: event.type },
  };
}

/**
 * Build RawFacts from a CloudTrail event
 */
export function cloudtrailEventToFacts(event: Record<string, unknown>): RawFacts {
  return {
    event_name: event.eventName as string,
    vendor_slug: "aws",
    vendor_display: "AWS",
    source: "cloudtrail",
    aws_event_name: event.eventName as string,
    aws_user_name: (event.userIdentity as Record<string, unknown>)?.userName as string || undefined,
    aws_account_id: (event.userIdentity as Record<string, unknown>)?.accountId as string || undefined,
    aws_region: event.awsRegion as string || undefined,
    aws_source_ip: event.sourceIPAddress as string || undefined,
    aws_user_agent: event.userAgent as string || undefined,
    aws_error_code: event.errorCode as string || undefined,
    aws_error_msg: event.errorMessage as string || undefined,
    policy_name: (event.requestParameters as Record<string, unknown>)?.policyName as string || undefined,
    role_name: (event.requestParameters as Record<string, unknown>)?.roleName as string || undefined,
    bucket_name: (event.requestParameters as Record<string, unknown>)?.bucketName as string || undefined,
    trail_name: (event.requestParameters as Record<string, unknown>)?.name as string || undefined,
    key_id: (event.requestParameters as Record<string, unknown>)?.keyId as string || undefined,
    raw_payload: { eventName: event.eventName, userIdentity: event.userIdentity },
  };
}

/**
 * Build RawFacts from a Google Workspace audit event
 */
export function workspaceEventToFacts(event: Record<string, unknown>): RawFacts {
  const params = (event.parameters as Array<Record<string, unknown>>) ?? [];
  const param = (name: string) => params.find(p => p.name === name)?.value as string | undefined;
  return {
    event_name: event.type as string || event.name as string,
    vendor_slug: "google-workspace",
    vendor_display: "Google Workspace",
    source: "workspace_webhook",
    workspace_event: event.type as string || event.name as string,
    workspace_actor: (event.actor as Record<string, unknown>)?.email as string || undefined,
    workspace_target: param("USER_EMAIL") || param("TARGET_USER") || undefined,
    workspace_ip: (event.ipAddress as string) || undefined,
    workspace_app: event.applicationName as string || undefined,
    admin_email: (event.actor as Record<string, unknown>)?.email as string || undefined,
    setting_name: param("SETTING_NAME") || undefined,
    old_value: param("OLD_VALUE") || undefined,
    new_value: param("NEW_VALUE") || undefined,
    raw_payload: { type: event.type, applicationName: event.applicationName },
  };
}

/**
 * Build RawFacts from a content diff row
 */
export function diffToFacts(diff: {
  id?: string;
  vendor_slug: string;
  title?: string;
  description?: string;
  source_url?: string;
  risk_category?: string;
  detection_method?: string;
  lines_added?: number;
  lines_removed?: number;
}): RawFacts {
  const keywords = extractKeywords(diff.description ?? diff.title ?? "", diff.risk_category);
  return {
    vendor_slug: diff.vendor_slug,
    vendor_display: diff.vendor_slug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    source: (diff.detection_method ?? "content_diff") as string,
    diff_id: diff.id,
    page_title: diff.title,
    page_url: diff.source_url,
    diff_type: diff.detection_method,
    snippet: (diff.description ?? "").slice(0, 200),
    keywords_found: keywords,
    lines_added: diff.lines_added,
    lines_removed: diff.lines_removed,
    raw_payload: { id: diff.id, vendor_slug: diff.vendor_slug },
  };
}

function extractKeywords(text: string, category?: string): string[] {
  const RISK_KEYWORDS: Record<string, string[]> = {
    pricing: ["price", "plan", "cost", "fee", "billing", "rate", "tier", "subscription", "increase", "decrease"],
    legal: ["terms", "policy", "agreement", "liability", "arbitration", "jurisdiction", "gdpr", "privacy", "data"],
    security: ["breach", "vulnerability", "cve", "patch", "exploit", "incident", "compromise", "unauthorized"],
    operational: ["deprecat", "sunset", "breaking", "migration", "upgrade", "downtime", "maintenance", "end-of-life"],
    vendor_risk: ["shutdown", "acquire", "merge", "bankrupt", "discontinue", "pivot", "funding"],
  };
  const cat = category ?? "operational";
  const kws = RISK_KEYWORDS[cat] ?? RISK_KEYWORDS.operational;
  const lowerText = text.toLowerCase();
  return kws.filter(k => lowerText.includes(k));
}

// ─── Template Registry Stats (for admin) ─────────────────────────────────────

export function getTemplateStats() {
  const keys = Object.keys(TEMPLATES);
  const byCategory: Record<string, number> = {};
  for (const k of keys) {
    const cat = k.split(".")[0];
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
  }
  return {
    total: keys.length,
    byCategory,
    llmEnabled: LLM_ENABLED,
    llmModel: LLM_ENABLED ? LLM_MODEL : null,
    keys,
  };
}
