import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type PlaybookContent = {
  vendor: string; emoji: string; color: string;
  intro: string; what_we_monitor: string[]; setup_steps: { title: string; desc: string }[];
  scenarios: { title: string; cause: string; detect: string; respond: string }[];
  gated: boolean;
};

const PLAYBOOKS: Record<string, PlaybookContent> = {
  stripe: {
    vendor: "Stripe", emoji: "💳", color: "from-blue-500 to-indigo-600",
    intro: "Stripe powers billing for millions of SaaS companies. Pricing changes, webhook failures, and ToS updates can directly impact your revenue — often without warning.",
    what_we_monitor: ["Price and product changes (unit amounts, intervals, currency)", "Subscription status transitions (cancellations, payment failures, past_due)", "Stripe webhook endpoint failures and retries", "Stripe ToS, privacy policy, and API terms updates", "Revenue share changes in Stripe Connect", "Restricted key permission scope changes"],
    setup_steps: [
      { title: "Create a Restricted API Key", desc: "In Stripe Dashboard → Developers → API Keys → Create Restricted Key. Enable Read on: Charges, Customers, Invoices, Plans, Prices, Products, Subscriptions. No write access needed." },
      { title: "Connect to Change Risk Radar", desc: "Go to Dashboard → Connect → Stripe and paste your Restricted Key. We verify it has the minimum required permissions." },
      { title: "Configure alert thresholds", desc: "Set your alert sensitivity in Dashboard → Rules. Boost confidence for billing-critical rules or add your own using our rule editor." },
      { title: "Set up Slack or email notifications", desc: "Go to Settings → Notifications to route high-severity billing alerts to your on-call Slack channel." },
    ],
    scenarios: [
      { title: "Stripe raises prices on a plan you depend on", cause: "Stripe updated the unit_amount on a price object you reference", detect: "CRR fires a 'Stripe Price Changed' alert with old/new amounts and affected product", respond: "Check if your checkout flow, upgrade emails, or pricing page hardcode the old price. Update references within 48h before confusion hits customers." },
      { title: "Webhook endpoint fails silently", cause: "Your endpoint returns 5xx for 3+ consecutive deliveries", detect: "CRR fires a 'Stripe Webhook Failures' alert with endpoint URL and first failure timestamp", respond: "Check your endpoint health. Replay failed events from Stripe Dashboard → Webhooks. Validate your webhook handler logic." },
      { title: "Subscription moves to past_due", cause: "A customer's payment method fails on renewal", detect: "CRR fires a 'Subscription Payment Failed' alert with customer_id and invoice_id", respond: "Trigger your dunning sequence. Check your Smart Retries config in Stripe. Consider adding a grace period before access revocation." },
    ],
    gated: false,
  },
  aws: {
    vendor: "AWS CloudTrail", emoji: "☁️", color: "from-orange-500 to-yellow-600",
    intro: "IAM changes are the most common root cause of AWS security incidents. CloudTrail captures every API call — Change Risk Radar filters for the ones that matter.",
    what_we_monitor: ["IAM user/role/policy creation, modification, and deletion", "Security group rule changes (especially 0.0.0.0/0)", "S3 bucket policy and ACL changes", "KMS key events (disable, schedule deletion, policy changes)", "CloudTrail configuration changes (disable, delete trail)", "Root account activity", "Cross-account role assumption from unexpected accounts"],
    setup_steps: [
      { title: "Create a Cross-Account IAM Role", desc: "In your AWS account, create an IAM role with a trust policy allowing our account. Set ExternalId to the value shown in setup form. Attach AWSCloudTrail_ReadOnlyAccess only." },
      { title: "Enable CloudTrail", desc: "Ensure CloudTrail is logging to an S3 bucket in your target region. Multi-region trail is recommended for full coverage." },
      { title: "Connect in CRR", desc: "Go to Dashboard → Connect → AWS and enter your Role ARN, ExternalId, Region, and S3 bucket name." },
      { title: "Apply the Security Baseline policy pack", desc: "Go to Dashboard → Policy Packs → Apply 'SaaS Security Baseline' to enable all 10 CloudTrail rules with recommended thresholds." },
    ],
    scenarios: [
      { title: "AdministratorAccess granted to IAM user", cause: "CreatePolicyVersion or AttachUserPolicy API call attaching AdministratorAccess or * action policy", detect: "CRR fires 'Critical AWS IAM Permission Granted' with actor, target user, and policy ARN", respond: "Immediately verify if this was authorized. If not: revoke policy, rotate credentials, audit CloudTrail for actions taken under that user in the window since grant." },
      { title: "Security group opened to 0.0.0.0/0", cause: "AuthorizeSecurityGroupIngress call with CIDR 0.0.0.0/0 or ::/0", detect: "CRR fires 'Security Group Rule Added' with port range and CIDR", respond: "Assess if the port was intentional (web server) or accidental (database port). Revert if unauthorized. Add VPN/IP restriction." },
      { title: "CloudTrail disabled", cause: "StopLogging or DeleteTrail API call", detect: "CRR fires 'CloudTrail Disabled/Deleted' — critical severity, immediate notification", respond: "This is a red flag for credential compromise. Immediately re-enable CloudTrail, audit IAM activity since disable, consider incident response protocol." },
    ],
    gated: false,
  },
  shopify: {
    vendor: "Shopify", emoji: "🛍️", color: "from-green-500 to-teal-600",
    intro: "Shopify apps have broad access to your store data. Scope expansions, billing changes, and GDPR requests require immediate attention — and often go unnoticed.",
    what_we_monitor: ["App OAuth scope changes (especially write_customers, read_all_orders)", "App billing subscription status (declined, cancelled, capped)", "GDPR data requests (customers/data_request, shop/redact)", "App install/uninstall events", "Shopify Platform API deprecations and breaking changes", "Partner Program revenue share and fee structure changes"],
    setup_steps: [
      { title: "Choose Observatory or Store mode", desc: "Observatory mode monitors Shopify platform docs/changelogs — no credentials needed. Store mode monitors your specific store's app events via webhooks." },
      { title: "For Store mode: Get webhook credentials", desc: "In your Shopify Partner Dashboard, create a webhook with a shared secret. You'll need your Shop domain and an access token with sufficient scopes." },
      { title: "Register webhook topics", desc: "CRR auto-registers for: app/authorization_granted, authorized_access_scopes/update, app_subscriptions/update, app_subscriptions/approaching_capped_amount, customers/data_request, shop/redact, app_uninstalled." },
      { title: "Configure GDPR response workflow", desc: "In Settings → Notifications, set a high-priority Slack/email channel for GDPR requests. You have 30 days (data access) or 48h (redact) to respond." },
    ],
    scenarios: [
      { title: "App silently requests new write_customers scope", cause: "App update triggers authorized_access_scopes/update with new high-risk scope added", detect: "CRR fires 'Shopify App High-Risk Scope Granted' with old scopes, new scopes, and app ID", respond: "Review the app's changelog. If the scope expansion is unexplained, contact the app vendor. Consider revoking and reinstalling with explicit scope review." },
      { title: "App billing cap reached", cause: "app_subscriptions/approaching_capped_amount webhook fired", detect: "CRR fires 'Shopify App Billing Cap Approaching' with app name, cap amount, and current usage", respond: "Decide: raise the cap in your Shopify admin, or prepare for app feature degradation when cap hits. Notify your team before the cap is hit." },
      { title: "GDPR deletion request received", cause: "shop/redact or customers/redact webhook from Shopify", detect: "CRR fires 'Shopify GDPR Redact Request' — critical severity, 48h response window", respond: "Run your data deletion workflow. Confirm to Shopify within 48h. Log the request and deletion confirmation in your GDPR response register." },
    ],
    gated: false,
  },
  "incident-postmortem": {
    vendor: "Incident Postmortems", emoji: "📋", color: "from-purple-500 to-pink-600",
    intro: "Vendor-caused incidents are different from infrastructure incidents — the root cause is outside your control. This playbook covers how to document, communicate, and prevent recurrence.",
    what_we_monitor: ["Not applicable — this is a process playbook, not a monitoring connector."],
    setup_steps: [
      { title: "Detect: Use CRR alerts as incident triggers", desc: "Configure CRR to send critical alerts to your incident management system (PagerDuty, OpsGenie, or Slack #incidents)." },
      { title: "Triage: Determine if vendor or internal", desc: "Check the CRR alert for root cause. Vendor change? Open a vendor-caused incident. Internal bug triggered by vendor change? Add context." },
      { title: "Communicate: Use incident comms templates", desc: "Use our built-in incident comms templates at /admin/support (Comms tab) to send structured status updates to customers." },
      { title: "Document: Write the postmortem", desc: "Use the postmortem template below. Focus on what you could control — your detection speed, alert routing, and response runbook." },
    ],
    scenarios: [
      { title: "Stripe API unavailable for 45 minutes", cause: "Stripe infrastructure incident — no warning in CRR (platform-level, not config change)", detect: "Webhook delivery failures trigger CRR alert. Stripe status page update confirms. CRR timeline: 8 minutes to detect.", respond: "Activate your payment processing graceful degradation. Message affected customers. File for Stripe SLA credit if applicable. Postmortem: improve webhook failure alerting threshold." },
      { title: "Unexpected Stripe price change hits P&L", cause: "Stripe changed unit amount on a plan — CRR detected it 2 days before renewal cycle", detect: "CRR fires 'Stripe Price Changed' with $29→$39 delta, affecting 840 subscriptions", respond: "Calculate revenue impact. Decide: absorb, pass through, or grandfather existing customers. Update your pricing page. Send customer communication before renewal. Add price lock contracts to new enterprise deals." },
    ],
    gated: true,
  },
  salesforce: {
    vendor: "Salesforce", emoji: "☁️", color: "from-sky-500 to-blue-600",
    intro: "Salesforce permission changes are among the hardest to track manually — profile edits, permission set assignments, and sharing model changes can expose sensitive data without triggering any native audit alert.",
    what_we_monitor: ["Profile and Permission Set modifications", "Permission Set assignments to users", "Organization-Wide Default (OWD) sharing changes", "Connected App OAuth policy changes", "Login IP restrictions and session policy changes", "Critical permission grants (ModifyAllData, ViewAllData, ManageUsers)"],
    setup_steps: [
      { title: "Create a Connected App", desc: "In Salesforce Setup → App Manager → New Connected App. Enable OAuth. Required scopes: api, refresh_token, full." },
      { title: "Authorize via OAuth", desc: "In CRR Dashboard → Connect → Salesforce → Audit Trail mode. Follow the OAuth flow to authorize CRR to read your SetupAuditTrail." },
      { title: "Configure polling interval", desc: "CRR polls SetupAuditTrail every 30 minutes for changes in the critical sections. Adjust in connector settings." },
      { title: "Apply Salesforce policy pack", desc: "Dashboard → Policy Packs → 'SaaS Security Baseline' includes 10 Salesforce permission rules with recommended thresholds." },
    ],
    scenarios: [
      { title: "ModifyAllData granted to non-admin profile", cause: "Profile modification adds PermissionsModifyAllData to a non-System-Admin profile", detect: "CRR fires 'Salesforce Critical Permission Granted' with actor, target profile, and permission", respond: "Immediately verify if this was authorized. Run a SOQL query to identify all users on this profile. Review actions taken under this profile in the last 24h via Event Monitoring." },
      { title: "OWD changed to Public Read/Write", cause: "Sharing settings update: OWD for Account or Opportunity set to Public Read/Write", detect: "CRR fires 'Salesforce Sharing Model Modified' with object, old setting, new setting, actor", respond: "This change is immediate and affects all records. Revert to Private/Read immediately. Audit who changed it and whether it was intentional. Check if data was accessed inappropriately during the window." },
    ],
    gated: true,
  },
  "google-workspace": {
    vendor: "Google Workspace", emoji: "🔵", color: "from-red-500 to-orange-600",
    intro: "Google Workspace admin events include the most sensitive actions in your company — domain admin grants, OAuth scope approvals, and 2FA policy changes — all silently logged in the Admin console.",
    what_we_monitor: ["Super Admin and Delegated Admin grants", "Third-party app OAuth scope approvals (drive, gmail, calendar)", "2-Step Verification policy changes", "Google Workspace ToS and DPA updates", "Google Workspace API deprecations", "Directory sharing settings and external sharing changes"],
    setup_steps: [
      { title: "Enable Admin SDK API", desc: "In Google Cloud Console for your Workspace org, enable Admin SDK API and create OAuth credentials (Web application type)." },
      { title: "Grant CRR OAuth access", desc: "In CRR Dashboard → Connect → Google Workspace, authorize with your Workspace admin account. Required scopes: admin.reports.audit.readonly, admin.directory.user.readonly." },
      { title: "Configure event filters", desc: "CRR watches: USER_SETTINGS (admin grants), OAUTH (app authorizations), LOGIN (suspicious activity), GROUP_SETTINGS. Disable categories you don't need." },
      { title: "Set admin email notifications", desc: "In Settings → Notifications, add your Security team email for critical Workspace events. Google Workspace admin events move fast — same-day response matters." },
    ],
    scenarios: [
      { title: "User granted Super Admin role", cause: "Admin privilege granted to user account via Admin console", detect: "CRR fires 'Workspace Admin Privilege Grant' with actor, target user, and timestamp", respond: "Verify with the granting admin if this was intentional. If unauthorized, revoke immediately. Audit actions taken under that account. Consider: was the granting admin account compromised?" },
      { title: "App granted drive.readonly to all users", cause: "Third-party app authorized with domain-wide delegation and drive.readonly scope", detect: "CRR fires 'Workspace OAuth Scope Expansion' with app name, scopes, and authorizing admin", respond: "Review the app in Admin console → Security → API controls. Revoke if not recognized. Check Google Workspace Marketplace for app legitimacy. Consider blocking third-party app installs without admin approval." },
    ],
    gated: true,
  },
};

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const pb = PLAYBOOKS[slug];
  if (!pb) return { title: "Playbook Not Found" };
  return { title: `${pb.vendor} Playbook — Change Risk Radar`, description: pb.intro };
}

export default async function PlaybookPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const pb = PLAYBOOKS[slug];
  if (!pb) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`bg-gradient-to-r ${pb.color} text-white py-14 px-6`}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-sm opacity-80 mb-4">
            <Link href="/playbooks" className="hover:underline">Playbooks</Link>
            <span>›</span>
            <span>{pb.vendor}</span>
          </div>
          <div className="text-4xl mb-2">{pb.emoji}</div>
          <h1 className="text-4xl font-bold mb-3">{pb.vendor} Integration Playbook</h1>
          <p className="text-lg opacity-90 max-w-xl">{pb.intro}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* What we monitor */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🔍 What We Monitor</h2>
          <ul className="space-y-2">
            {pb.what_we_monitor.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>{item}
              </li>
            ))}
          </ul>
        </div>

        {/* Setup steps */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">⚡ Setup Steps</h2>
          <div className="space-y-4">
            {pb.setup_steps.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex-shrink-0 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{step.title}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scenarios */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🎯 Real Scenarios</h2>
          <div className="space-y-6">
            {pb.scenarios.map((s, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-5">
                <h3 className="font-bold text-gray-900 mb-3">{s.title}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2"><span className="font-medium text-gray-500 w-16 shrink-0">Cause:</span><span className="text-gray-700">{s.cause}</span></div>
                  <div className="flex gap-2"><span className="font-medium text-indigo-600 w-16 shrink-0">Detect:</span><span className="text-gray-700">{s.detect}</span></div>
                  <div className="flex gap-2"><span className="font-medium text-green-600 w-16 shrink-0">Respond:</span><span className="text-gray-700">{s.respond}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-indigo-600 rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-2">Start Monitoring {pb.vendor}</h2>
          <p className="text-indigo-100 mb-5 text-sm">14-day free trial. Connect {pb.vendor} in 5 minutes.</p>
          <Link href="/auth/signup" className="inline-block px-8 py-3 bg-white text-indigo-700 rounded-lg font-bold hover:bg-indigo-50">
            Start Free Trial →
          </Link>
        </div>
      </div>
    </div>
  );
}
