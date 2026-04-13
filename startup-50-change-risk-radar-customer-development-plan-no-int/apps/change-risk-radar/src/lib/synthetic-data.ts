/**
 * synthetic-data.ts — Demo mode synthetic data generator
 *
 * Generates 100% realistic-looking but entirely fake vendor events for demo tenants.
 * No real credentials are ever used. Data is seeded deterministically by tenant.
 *
 * Demo tenants:
 *   acme-saas       — B2B SaaS (Stripe-heavy + Workspace)
 *   techflow        — E-commerce platform (Stripe + AWS-heavy)
 *   cloudbridge     — Developer tools startup (AWS + Workspace-heavy)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SyntheticAlert {
  id: string;
  vendor_slug: string;
  risk_level: "high" | "medium" | "low";
  risk_category: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  summary: string;
  impact_text: string;
  action_text: string;
  source_url: string;
  template_key: string;
  summary_method: string;
  is_synthetic: boolean;
  synthetic_scenario: string;
  created_at: string;
  privacy_redacted?: boolean;  // true when privacy mode is active
  // Privacy: some fields are redacted even in demo
  raw_facts?: Record<string, unknown>;
}

export interface SyntheticConnector {
  type: string;
  label: string;
  status: "active";
  last_run_at: string;
  last_diff_count: number;
}

export interface DemoTenant {
  id: string;
  name: string;
  slug: string;
  industry: string;
  tagline: string;
  email: string;
  plan: string;
  connectors: SyntheticConnector[];
  alerts: SyntheticAlert[];
  stats: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    unread: number;
    engagement: number;
    reacted: number;
  };
  weekly_briefs: Array<{
    week_of: string;
    alerts_count: number;
    critical_count: number;
    email_status: string;
  }>;
}

// ─── Seeded Pseudo-Random ─────────────────────────────────────────────────────

function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return Math.abs(s) / 0xffffffff;
  };
}

function daysAgo(d: number, rand?: () => number): string {
  const jitter = rand ? Math.floor(rand() * 20 * 60 * 1000) : 0; // up to 20 min jitter
  return new Date(Date.now() - d * 86400000 - jitter).toISOString();
}

function shortId(seed: number): string {
  return (seed * 2654435761 >>> 0).toString(16).padStart(8, "0");
}

// ─── Alert Scenarios ──────────────────────────────────────────────────────────

const STRIPE_SCENARIOS = [
  {
    severity: "critical" as const, risk_level: "high" as const,
    risk_category: "pricing", vendor_slug: "stripe",
    title: "Stripe price updated: Pro Monthly → $99.00 USD (+25.3%)",
    summary: "Stripe sent a `price.updated` event for price price_1Nv9Xs2. The unit amount changed from $79.00 USD to $99.00 USD per month.",
    impact_text: "Any customers on this price will see their next invoice at the new amount. Fixed-price contracts may create billing discrepancies.",
    action_text: "Review your customer list on this price. Communicate the change within 30 days per Stripe billing notice requirements.",
    source_url: "https://stripe.com/pricing",
    template_key: "stripe.price.updated",
    scenario: "stripe_price_increase",
  },
  {
    severity: "critical" as const, risk_level: "high" as const,
    risk_category: "pricing", vendor_slug: "stripe",
    title: "Stripe price updated: Enterprise Annual plan raised 18%",
    summary: "Stripe sent a `price.updated` event. The Enterprise Annual plan changed from $1,188/yr to $1,404/yr (+18%).",
    impact_text: "Enterprise customers locked in at the old price will need contract amendments at renewal. Your ARR projections may be affected.",
    action_text: "Notify enterprise customers 60 days before renewal. Update your pricing page and sales materials.",
    source_url: "https://stripe.com/pricing",
    template_key: "stripe.price.updated",
    scenario: "stripe_enterprise_price",
  },
  {
    severity: "critical" as const, risk_level: "high" as const,
    risk_category: "security", vendor_slug: "stripe",
    title: "⚠️ Stripe fraud warning on charge cus_OqHJvz",
    summary: "Stripe Radar issued an early fraud warning on a $2,400 charge. High probability of fraudulent activity on this transaction.",
    impact_text: "High risk of chargeback within 5–60 days. Stripe may auto-refund. Chargeback fee is $15–$25 per dispute.",
    action_text: "Issue a proactive refund to avoid chargeback fees. Review account for additional suspicious activity. Enable Stripe Radar rules.",
    source_url: "https://dashboard.stripe.com/radar",
    template_key: "stripe.radar.early_fraud_warning.created",
    scenario: "stripe_fraud",
  },
  {
    severity: "high" as const, risk_level: "medium" as const,
    risk_category: "legal", vendor_slug: "stripe",
    title: "Stripe Terms of Service updated — liability section modified",
    summary: "Stripe's Terms of Service changed (+18/-7 lines). Section 3.5 on liability limitation modified. Arbitration clause updated to require opt-out within 30 days.",
    impact_text: "Updated arbitration clause may limit your ability to pursue class action disputes. New liability caps affect chargebacks on high-value transactions.",
    action_text: "Have legal review the diff. If you want to opt out of arbitration, you must do so within 30 days of the effective date.",
    source_url: "https://stripe.com/legal/ssa",
    template_key: "legal.tos_diff",
    scenario: "stripe_tos_change",
  },
  {
    severity: "high" as const, risk_level: "medium" as const,
    risk_category: "pricing", vendor_slug: "stripe",
    title: "Stripe processing fees increased for UK/EU card-present",
    summary: "Stripe's pricing page updated (+6/-4 lines). Card-present processing fee for UK/EU raised from 1.5% + €0.25 to 1.8% + €0.25 effective June 2025.",
    impact_text: "If you process in-person payments in the UK or EU, your per-transaction cost increases. Impact depends on volume.",
    action_text: "Calculate impact based on your UK/EU card-present volume. Consider passing through the fee or adjusting pricing.",
    source_url: "https://stripe.com/en-gb/pricing",
    template_key: "pricing.pricing_page_diff",
    scenario: "stripe_fee_increase",
  },
  {
    severity: "medium" as const, risk_level: "medium" as const,
    risk_category: "operational", vendor_slug: "stripe",
    title: "Stripe API: `payment_method.card.wallet` field deprecated",
    summary: "Stripe changelog: `payment_method.card.wallet` field marked deprecated. Migration deadline: August 1, 2025. Use `payment_method.card.networks` instead.",
    impact_text: "If your checkout code references `payment_method.card.wallet`, it will break after the deprecation date.",
    action_text: "Search your codebase for `card.wallet` references. Migrate to `card.networks` before August 2025.",
    source_url: "https://stripe.com/docs/changelog",
    template_key: "operational.changelog_scrape",
    scenario: "stripe_api_deprecation",
  },
];

const AWS_SCENARIOS = [
  {
    severity: "critical" as const, risk_level: "high" as const,
    risk_category: "security", vendor_slug: "aws",
    title: "🚨 AWS CloudTrail logging STOPPED: prod-audit-trail",
    summary: "CloudTrail trail 'prod-audit-trail' had logging stopped in account 123456789012 from IP 185.220.101.5. Actor: terraform-ci.",
    impact_text: "CRITICAL: All API activity logging disabled. Attackers often stop CloudTrail to cover their tracks. You are now blind to all API calls.",
    action_text: "Re-enable logging IMMEDIATELY. Review IAM activity from the last 15 minutes via VPC Flow Logs or GuardDuty. Invoke incident response playbook.",
    source_url: "https://console.aws.amazon.com/cloudtrail",
    template_key: "aws.StopLogging",
    scenario: "aws_stop_logging",
  },
  {
    severity: "critical" as const, risk_level: "high" as const,
    risk_category: "security", vendor_slug: "aws",
    title: "AWS IAM user created: deploy-backdoor-user",
    summary: "A new IAM user 'deploy-backdoor-user' was created in account 123456789012 (us-east-1) from IP 198.51.100.42.",
    impact_text: "New IAM users expand your attack surface. Unrecognized users indicate possible account compromise or insider threat.",
    action_text: "Verify the creator's identity immediately. If unexpected, disable the user via IAM console and rotate all API keys. Enable MFA organization-wide.",
    source_url: "https://console.aws.amazon.com/iam",
    template_key: "aws.CreateUser",
    scenario: "aws_suspicious_user",
  },
  {
    severity: "critical" as const, risk_level: "high" as const,
    risk_category: "security", vendor_slug: "aws",
    title: "AWS IAM policy attached: AdministratorAccess → data-pipeline-role",
    summary: "Policy 'AdministratorAccess' was attached to IAM role 'data-pipeline-role' in account 123456789012 from IP 10.0.1.15.",
    impact_text: "Administrator-level permissions granted to an automated role. This violates least-privilege and creates critical blast radius if the role is compromised.",
    action_text: "Review why AdministratorAccess was granted. Replace with a scoped policy granting only the specific actions needed. Apply principle of least privilege.",
    source_url: "https://console.aws.amazon.com/iam",
    template_key: "aws.AttachUserPolicy",
    scenario: "aws_admin_policy",
  },
  {
    severity: "critical" as const, risk_level: "high" as const,
    risk_category: "security", vendor_slug: "aws",
    title: "AWS S3 bucket policy modified: prod-customer-data",
    summary: "Bucket policy for 'prod-customer-data' was updated in account 123456789012. Principal: '*' (public access) statement detected.",
    impact_text: "S3 bucket may be publicly accessible. All stored customer data could be exposed to the internet immediately.",
    action_text: "Check S3 Block Public Access settings immediately. Review the new policy for Principal: '*' statements. Enable S3 server access logging.",
    source_url: "https://console.aws.amazon.com/s3",
    template_key: "aws.PutBucketPolicy",
    scenario: "aws_s3_public",
  },
  {
    severity: "high" as const, risk_level: "medium" as const,
    risk_category: "security", vendor_slug: "aws",
    title: "AWS KMS key scheduled for deletion: prod-encryption-key",
    summary: "KMS key 'prod-encryption-key' (arn:aws:kms:us-east-1:123456789012:key/abc-123) has been scheduled for deletion with a 14-day waiting period.",
    impact_text: "IRREVERSIBLE after waiting period. All data encrypted with this key (RDS databases, S3 objects, Secrets Manager) will become permanently inaccessible.",
    action_text: "Cancel the deletion IMMEDIATELY using CancelKeyDeletion if this was a mistake. Audit all resources using this key before proceeding.",
    source_url: "https://console.aws.amazon.com/kms",
    template_key: "aws.ScheduleKeyDeletion",
    scenario: "aws_kms_deletion",
  },
  {
    severity: "medium" as const, risk_level: "medium" as const,
    risk_category: "security", vendor_slug: "aws",
    title: "AWS security group opened: port 22 (SSH) to 0.0.0.0/0",
    summary: "New inbound rule added to security group sg-0abc123 (prod-app-sg) in us-east-1: TCP port 22 from 0.0.0.0/0.",
    impact_text: "SSH exposed to the public internet. This is a top attack vector for brute-force and credential stuffing attacks on production servers.",
    action_text: "Remove the 0.0.0.0/0 rule immediately. Restrict SSH to your VPN CIDR or use AWS Systems Manager Session Manager instead.",
    source_url: "https://console.aws.amazon.com/vpc",
    template_key: "aws.AuthorizeSecurityGroupIngress",
    scenario: "aws_ssh_open",
  },
];

const WORKSPACE_SCENARIOS = [
  {
    severity: "critical" as const, risk_level: "high" as const,
    risk_category: "security", vendor_slug: "google-workspace",
    title: "🔒 Suspicious Workspace login: sarah.chen@company.com",
    summary: "Google Workspace flagged a suspicious sign-in for sarah.chen@company.com from IP 195.123.240.1 (Moscow, Russia).",
    impact_text: "Potential account compromise. Attacker with Workspace access can exfiltrate email, calendar, Drive files, and admin SDK data.",
    action_text: "Force a password reset and revoke active sessions immediately in Admin Console → Users. Enable 2-Step Verification enforcement. Review email forwarding rules.",
    source_url: "https://admin.google.com/ac/reporting/audit",
    template_key: "workspace.SUSPICIOUS_LOGIN",
    scenario: "workspace_suspicious_login",
  },
  {
    severity: "critical" as const, risk_level: "high" as const,
    risk_category: "security", vendor_slug: "google-workspace",
    title: "Google Workspace admin privileges granted to marcus.dev@company.com",
    summary: "Admin admin@company.com granted Super Admin privileges to marcus.dev@company.com in Google Workspace.",
    impact_text: "New super admins can reset passwords, access all files, disable security settings, and exfiltrate the entire Google Workspace. Unexpected escalation is a top insider threat indicator.",
    action_text: "Verify this was authorized by your security team. Review the admin roles granted. Ensure 2FA is enforced for all admin accounts. Audit the past 7 days of admin activity.",
    source_url: "https://admin.google.com/ac/reporting/audit",
    template_key: "workspace.ADMIN_PRIVILEGE_GRANT",
    scenario: "workspace_admin_grant",
  },
  {
    severity: "high" as const, risk_level: "medium" as const,
    risk_category: "security", vendor_slug: "google-workspace",
    title: "New app authorized in Google Workspace: 'DataSync Pro'",
    summary: "Application 'DataSync Pro' was granted OAuth access to Google Workspace by admin@company.com. Scopes include drive.readonly and gmail.readonly.",
    impact_text: "Third-party apps with broad OAuth access can read all Drive files and emails. Unauthorized apps create data exfiltration risk.",
    action_text: "Review the app's OAuth scopes in Admin Console → Security → API Controls. Verify it's from a known vendor. Restrict third-party app installs to approved list.",
    source_url: "https://admin.google.com/ac/security/api-controls",
    template_key: "workspace.ADD_APPLICATION",
    scenario: "workspace_oauth_app",
  },
  {
    severity: "high" as const, risk_level: "medium" as const,
    risk_category: "security", vendor_slug: "google-workspace",
    title: "Workspace 2-Step Verification disabled for domain",
    summary: "Admin setting 'ENFORCE_STRONG_AUTHENTICATION' changed from 'enforced' to 'optional' in Google Workspace by admin@company.com.",
    impact_text: "Disabling 2FA enforcement exposes all accounts to credential stuffing and phishing attacks. This weakens your entire organization's security posture.",
    action_text: "Re-enable 2-Step Verification enforcement immediately in Admin Console → Security → 2-Step Verification. Investigate why it was disabled.",
    source_url: "https://admin.google.com/ac/security",
    template_key: "workspace.CHANGE_APPLICATION_SETTING",
    scenario: "workspace_2fa_disabled",
  },
  {
    severity: "medium" as const, risk_level: "medium" as const,
    risk_category: "operational", vendor_slug: "google-workspace",
    title: "Google Workspace: Drive sharing settings changed to 'Anyone with link'",
    summary: "Admin setting for external sharing changed from 'restricted' to 'anyone with link' in Google Workspace.",
    impact_text: "All shared Drive links are now accessible by anyone on the internet, even without a Google account. Sensitive documents may be inadvertently public.",
    action_text: "Review current Drive sharing settings. Audit existing links. Consider using 'anyone in your organization' instead of 'anyone with link'.",
    source_url: "https://admin.google.com/ac/apps/drive",
    template_key: "workspace.CHANGE_BASIC_SETTING",
    scenario: "workspace_drive_sharing",
  },
];

// Additional vendors for a fuller demo
const VENDOR_EXTRAS = [
  {
    severity: "high" as const, risk_level: "medium" as const,
    risk_category: "legal", vendor_slug: "shopify",
    title: "Shopify Partners Program terms updated — revenue share changes",
    summary: "Shopify's Partner Program Agreement changed (+24/-11 lines). Revenue share for development stores changing from 20% to 15% effective Q3 2025.",
    impact_text: "If you build Shopify apps, your revenue share from development store upgrades decreases. Annual impact depends on your partner tier and app portfolio.",
    action_text: "Review the full diff. Update your financial model if you rely on Shopify Partner revenue. Consider Shopify Plus partnerships for better terms.",
    source_url: "https://www.shopify.com/partners/terms",
    template_key: "legal.tos_diff",
    scenario: "shopify_partner_terms",
  },
  {
    severity: "medium" as const, risk_level: "medium" as const,
    risk_category: "pricing", vendor_slug: "vercel",
    title: "Vercel Pro plan bandwidth pricing updated: overage rate +50%",
    summary: "Vercel pricing page changed (+8/-3 lines). Bandwidth overage rate for Pro plan increased from $0.40/GB to $0.60/GB.",
    impact_text: "If your Vercel usage regularly exceeds the 1TB included bandwidth, your monthly bill increases proportionally with traffic growth.",
    action_text: "Review your Vercel usage dashboard for bandwidth trends. Set up billing alerts at 80% of included bandwidth. Consider caching static assets on Cloudflare.",
    source_url: "https://vercel.com/pricing",
    template_key: "pricing.pricing_page_diff",
    scenario: "vercel_bandwidth_price",
  },
  {
    severity: "high" as const, risk_level: "high" as const,
    risk_category: "vendor_risk", vendor_slug: "sendgrid",
    title: "SendGrid (Twilio) trust page updated: SOC 2 certificate expires in 30 days",
    summary: "SendGrid's security/trust page changed. SOC 2 Type II certificate expiry date updated. Certificate expires April 30, 2025 — renewal pending.",
    impact_text: "If your security requirements mandate active SOC 2 certification from email providers, SendGrid's certification gap may trigger a compliance review obligation.",
    action_text: "Contact your SendGrid account manager to confirm renewal timeline. Update your vendor risk register. If your compliance deadline overlaps, evaluate fallback email providers.",
    source_url: "https://sendgrid.com/trust",
    template_key: "vendor_risk.trust_page_diff",
    scenario: "sendgrid_soc2_expiry",
  },
  {
    severity: "low" as const, risk_level: "low" as const,
    risk_category: "operational", vendor_slug: "github",
    title: "GitHub Actions: ubuntu-20.04 runner deprecated — deadline Feb 2025",
    summary: "GitHub changelog: ubuntu-20.04 hosted runner scheduled for deprecation. All workflows using ubuntu-20.04 must migrate to ubuntu-22.04 by February 28, 2025.",
    impact_text: "CI/CD pipelines using ubuntu-20.04 will fail after the deprecation date. Affects every repository using GitHub Actions.",
    action_text: "Search your .github/workflows/ directories for ubuntu-20.04 references. Migrate to ubuntu-22.04 or ubuntu-latest. Test workflows after migration.",
    source_url: "https://github.blog/changelog",
    template_key: "operational.changelog_scrape",
    scenario: "github_runner_deprecation",
  },
];

// ─── Demo Tenant Configurations ───────────────────────────────────────────────

export interface DemoTenantConfig {
  id: string;
  name: string;
  slug: string;
  industry: string;
  tagline: string;
  email: string;
  connectors: Array<{ type: string; label: string }>;
  scenarios: string[];  // which alert scenarios to include
}

export const DEMO_TENANTS: DemoTenantConfig[] = [
  {
    id: "demo-acme-saas",
    name: "Acme SaaS Corp",
    slug: "demo-acme",
    industry: "B2B SaaS",
    tagline: "Project management & collaboration platform",
    email: "demo+acme@change-risk-radar.com",
    connectors: [
      { type: "stripe", label: "Stripe Payments" },
      { type: "workspace", label: "Google Workspace" },
    ],
    scenarios: [
      "stripe_price_increase", "stripe_enterprise_price", "stripe_fraud",
      "stripe_tos_change", "stripe_fee_increase",
      "workspace_suspicious_login", "workspace_admin_grant",
      "shopify_partner_terms", "sendgrid_soc2_expiry",
    ],
  },
  {
    id: "demo-techflow",
    name: "TechFlow Commerce",
    slug: "demo-techflow",
    industry: "E-Commerce",
    tagline: "High-volume D2C brand on Stripe + AWS",
    email: "demo+techflow@change-risk-radar.com",
    connectors: [
      { type: "stripe", label: "Stripe Payments" },
      { type: "aws_cloudtrail", label: "AWS CloudTrail" },
    ],
    scenarios: [
      "stripe_price_increase", "stripe_fraud", "stripe_fee_increase",
      "stripe_api_deprecation",
      "aws_stop_logging", "aws_suspicious_user", "aws_s3_public",
      "aws_ssh_open", "vercel_bandwidth_price",
    ],
  },
  {
    id: "demo-cloudbridge",
    name: "CloudBridge DevTools",
    slug: "demo-cloudbridge",
    industry: "Developer Tools",
    tagline: "Cloud infrastructure tooling startup",
    email: "demo+cloudbridge@change-risk-radar.com",
    connectors: [
      { type: "aws_cloudtrail", label: "AWS CloudTrail" },
      { type: "workspace", label: "Google Workspace" },
    ],
    scenarios: [
      "aws_stop_logging", "aws_admin_policy", "aws_kms_deletion",
      "aws_suspicious_user", "aws_ssh_open",
      "workspace_suspicious_login", "workspace_2fa_disabled",
      "workspace_oauth_app", "workspace_drive_sharing",
      "github_runner_deprecation",
    ],
  },
];

// ─── Generator ────────────────────────────────────────────────────────────────

export function generateDemoAlerts(
  tenantConfig: DemoTenantConfig,
  opts: { privacyMode?: boolean } = {}
): SyntheticAlert[] {
  const rand = seededRand(tenantConfig.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0));
  const allScenarios = [...STRIPE_SCENARIOS, ...AWS_SCENARIOS, ...WORKSPACE_SCENARIOS, ...VENDOR_EXTRAS] as Array<{
    severity: "critical" | "high" | "medium" | "low";
    risk_level: "high" | "medium" | "low";
    risk_category: string;
    vendor_slug: string;
    title: string;
    summary: string;
    impact_text: string;
    action_text: string;
    source_url: string;
    template_key: string;
    scenario: string;
  }>;

  // Filter to this tenant's scenarios
  const tenantScenarios = allScenarios.filter(s =>
    tenantConfig.scenarios.includes(s.scenario)
  );

  // Sort by severity for display
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  tenantScenarios.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return tenantScenarios.map((s, i) => {
    const dayOffset = Math.floor(rand() * 12) + (i * 0.7);
    const id = `demo-${shortId(tenantConfig.id.length * 7 + i * 13)}`;

    // Privacy mode redacts PII in raw_facts and summaries
    const summary = opts.privacyMode
      ? redactSummary(s.summary)
      : s.summary;

    return {
      id,
      vendor_slug: s.vendor_slug,
      risk_level: s.risk_level,
      risk_category: s.risk_category,
      severity: s.severity,
      title: s.title,
      summary,
      impact_text: s.impact_text,
      action_text: s.action_text,
      source_url: s.source_url,
      template_key: s.template_key,
      summary_method: "template",
      is_synthetic: true,
      synthetic_scenario: s.scenario,
      created_at: daysAgo(dayOffset, rand),
      raw_facts: opts.privacyMode ? undefined : buildRawFacts(s, rand),
    };
  });
}

export function generateDemoBriefs(tenantId: string): DemoTenant["weekly_briefs"] {
  const rand = seededRand(tenantId.length * 17);
  return Array.from({ length: 4 }, (_, i) => {
    const d = new Date(Date.now() - (i + 1) * 7 * 86400000);
    return {
      week_of: d.toISOString().split("T")[0],
      alerts_count: Math.floor(rand() * 8) + 3,
      critical_count: Math.floor(rand() * 3) + 1,
      email_status: "sent",
    };
  });
}

function buildRawFacts(s: { vendor_slug: string; scenario: string; template_key: string }, rand: () => number): Record<string, unknown> {
  if (s.vendor_slug === "stripe") {
    return {
      event_name: s.template_key.replace("stripe.", ""),
      vendor_slug: "stripe",
      source: "stripe_webhook",
      stripe_event_id: `evt_${shortId(Math.floor(rand() * 1000000))}`,
      price_id: `price_${shortId(Math.floor(rand() * 1000000))}`,
      new_unit_amount: 9900,
      old_unit_amount: 7900,
      currency: "usd",
    };
  }
  if (s.vendor_slug === "aws") {
    return {
      event_name: s.scenario.replace("aws_", ""),
      vendor_slug: "aws",
      source: "cloudtrail",
      aws_account_id: "1234****9012",  // already masked
      aws_region: "us-east-1",
      aws_user_name: "terraform-ci",
    };
  }
  if (s.vendor_slug === "google-workspace") {
    return {
      event_name: s.template_key.replace("workspace.", ""),
      vendor_slug: "google-workspace",
      source: "workspace_webhook",
      workspace_actor: "admin@[redacted]",
    };
  }
  return { vendor_slug: s.vendor_slug, source: "content_diff" };
}

// ─── Privacy / PII Redaction ───────────────────────────────────────────────────

/** Patterns to redact from alert text */
const PII_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // Email addresses
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: "user@[redacted]" },
  // IPv4 addresses
  { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: "[IP redacted]" },
  // Stripe customer IDs
  { pattern: /\bcus_[a-zA-Z0-9]{8,}\b/g, replacement: "cus_[redacted]" },
  // Stripe price/product IDs
  { pattern: /\bprice_[a-zA-Z0-9]{8,}\b/g, replacement: "price_[redacted]" },
  { pattern: /\bprod_[a-zA-Z0-9]{8,}\b/g, replacement: "prod_[redacted]" },
  // Stripe event IDs
  { pattern: /\bevt_[a-zA-Z0-9]{8,}\b/g, replacement: "evt_[redacted]" },
  // AWS account IDs (12 digits)
  { pattern: /\b\d{12}\b/g, replacement: "****[AWS acct]" },
  // AWS ARNs
  { pattern: /arn:aws:[a-z0-9-]+:[a-z0-9-]*:\d{12}:[a-zA-Z0-9/_-]+/g, replacement: "arn:aws:[redacted]" },
  // AWS KMS key IDs
  { pattern: /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/g, replacement: "[key-id-redacted]" },
  // S3 bucket names (heuristic: word-word-word or containing "bucket")
  { pattern: /\b(?:prod|dev|staging|s3)-[a-z0-9-]{4,30}\b/g, replacement: "[bucket-redacted]" },
  // Security group IDs
  { pattern: /\bsg-[a-f0-9]{8,}\b/g, replacement: "sg-[redacted]" },
  // Names that look like IAM users/roles (snake_case with hyphens, suspicious patterns)
  { pattern: /\b(?:deploy-backdoor|suspicious|attacker|hacker|malicious)-[a-z0-9-]+\b/g, replacement: "[actor-redacted]" },
];

export function redactPII(text: string): string {
  let result = text;
  for (const { pattern, replacement } of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function redactSummary(text: string): string {
  return redactPII(text);
}

export function redactRawFacts(facts: Record<string, unknown>): Record<string, unknown> {
  const SENSITIVE_KEYS = [
    "actor_ip", "aws_source_ip", "workspace_ip", "stripe_event_id",
    "customer_id", "aws_user_name", "workspace_actor", "workspace_target",
    "aws_account_id", "key_id", "bucket_name", "sg_id",
  ];
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(facts)) {
    if (SENSITIVE_KEYS.includes(k)) {
      result[k] = "[redacted]";
    } else if (typeof v === "string") {
      result[k] = redactPII(v);
    } else {
      result[k] = v;
    }
  }
  return result;
}

// ─── Build Full Demo Tenant ───────────────────────────────────────────────────

export function buildDemoTenant(
  config: DemoTenantConfig,
  opts: { privacyMode?: boolean } = {}
): DemoTenant {
  const alerts = generateDemoAlerts(config, opts);
  const bySeverity = (s: string) => alerts.filter(a => a.severity === s).length;

  return {
    id: config.id,
    name: config.name,
    slug: config.slug,
    industry: config.industry,
    tagline: config.tagline,
    email: config.email,
    plan: "early_access",
    connectors: config.connectors.map(c => ({
      ...c,
      status: "active" as const,
      last_run_at: daysAgo(0.5),
      last_diff_count: Math.floor(Math.random() * 5) + 2,
    })),
    alerts,
    stats: {
      total: alerts.length,
      critical: bySeverity("critical"),
      high: bySeverity("high"),
      medium: bySeverity("medium"),
      low: bySeverity("low"),
      unread: Math.floor(alerts.length * 0.4),
      engagement: 72,
      reacted: Math.floor(alerts.length * 0.72),
    },
    weekly_briefs: generateDemoBriefs(config.id),
  };
}

export { STRIPE_SCENARIOS, AWS_SCENARIOS, WORKSPACE_SCENARIOS };
