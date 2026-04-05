import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Integration Playbooks — Change Risk Radar",
  description: "Step-by-step guides for monitoring Stripe, AWS, Shopify, Salesforce, and Google Workspace for risk-creating changes.",
};

export const dynamic = "force-dynamic";

const PLAYBOOKS = [
  {
    slug: "stripe",
    vendor: "Stripe",
    emoji: "💳",
    color: "from-blue-500 to-indigo-600",
    description: "Monitor pricing changes, webhook failures, subscription billing events, and Stripe ToS updates in real time.",
    tags: ["pricing", "billing", "webhooks"],
    time_to_value: "5 minutes",
    difficulty: "Easy",
    scenarios: [
      "Stripe raised prices on a plan you depend on",
      "A webhook endpoint failed silently for 3 days",
      "Stripe updated their reserved funds policy",
      "A customer's subscription moved to 'past_due'",
    ],
    gated: false,
  },
  {
    slug: "aws",
    vendor: "AWS CloudTrail",
    emoji: "☁️",
    color: "from-orange-500 to-yellow-600",
    description: "Track IAM policy changes, privilege escalations, security group modifications, and CloudTrail configuration changes.",
    tags: ["security", "iam", "compliance"],
    time_to_value: "15 minutes",
    difficulty: "Intermediate",
    scenarios: [
      "An IAM user was granted AdministratorAccess",
      "A security group rule was opened to 0.0.0.0/0",
      "An S3 bucket policy was made public",
      "CloudTrail logging was disabled in a region",
    ],
    gated: false,
  },
  {
    slug: "shopify",
    vendor: "Shopify",
    emoji: "🛍️",
    color: "from-green-500 to-teal-600",
    description: "Detect app permission scope expansions, billing cap events, GDPR data requests, and Shopify platform policy changes.",
    tags: ["security", "permissions", "gdpr"],
    time_to_value: "10 minutes",
    difficulty: "Easy",
    scenarios: [
      "An app silently requested write_customers access",
      "Your app billing cap was reached mid-month",
      "Shopify changed their app store revenue share",
      "A GDPR data deletion request arrived",
    ],
    gated: false,
  },
  {
    slug: "salesforce",
    vendor: "Salesforce",
    emoji: "☁️",
    color: "from-sky-500 to-blue-600",
    description: "Monitor profile and permission set changes, sharing model modifications, connected app policy changes, and critical permission grants.",
    tags: ["security", "permissions", "crm"],
    time_to_value: "20 minutes",
    difficulty: "Advanced",
    scenarios: [
      "ModifyAllData was granted to a non-admin profile",
      "Organization-Wide Defaults were set to 'Public Read/Write'",
      "A new Connected App OAuth policy was created",
      "A user's profile was switched to System Administrator",
    ],
    gated: true,
  },
  {
    slug: "google-workspace",
    vendor: "Google Workspace",
    emoji: "🔵",
    color: "from-red-500 to-orange-600",
    description: "Track admin audit events, OAuth scope changes, directory admin grants, and Google Workspace Terms of Service updates.",
    tags: ["security", "admin", "oauth"],
    time_to_value: "15 minutes",
    difficulty: "Intermediate",
    scenarios: [
      "A user was granted Domain Admin access",
      "An app was granted drive.readonly scope to all users",
      "Google Workspace updated their DPA",
      "2-Step Verification was disabled org-wide",
    ],
    gated: true,
  },
  {
    slug: "incident-postmortem",
    vendor: "Incident Postmortems",
    emoji: "📋",
    color: "from-purple-500 to-pink-600",
    description: "Templates and best practices for writing vendor-caused incident postmortems. Includes root cause templates, timeline format, and prevention checklists.",
    tags: ["process", "templates", "incidents"],
    time_to_value: "30 minutes",
    difficulty: "Easy",
    scenarios: [
      "Stripe API was unavailable for 45 minutes",
      "AWS IAM change caused production auth failures",
      "Shopify app permission change broke checkout flow",
      "Unexpected Stripe price change hit your P&L",
    ],
    gated: true,
  },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "text-green-600 bg-green-50",
  Intermediate: "text-yellow-600 bg-yellow-50",
  Advanced: "text-red-600 bg-red-50",
};

export default function PlaybooksPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-700 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-3">Integration Playbooks</h1>
          <p className="text-gray-300 text-lg max-w-2xl">
            Step-by-step guides for connecting each vendor, understanding what we monitor,
            and responding when a risk-creating change is detected.
          </p>
          <div className="flex flex-wrap gap-3 mt-5 text-sm">
            <span className="bg-gray-700 px-3 py-1 rounded-full">Real scenarios</span>
            <span className="bg-gray-700 px-3 py-1 rounded-full">Setup walkthroughs</span>
            <span className="bg-gray-700 px-3 py-1 rounded-full">Response runbooks</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PLAYBOOKS.map(pb => (
            <div key={pb.slug} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Card header gradient */}
              <div className={`bg-gradient-to-r ${pb.color} p-5 text-white`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xl">{pb.emoji}</span>
                  {pb.gated && (
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">🔒 Free with email</span>
                  )}
                </div>
                <h2 className="text-xl font-bold">{pb.vendor}</h2>
                <div className="flex items-center gap-3 mt-1 text-xs opacity-80">
                  <span>⏱ {pb.time_to_value}</span>
                  <span className={`px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[pb.difficulty]} bg-white/20 text-white`}>
                    {pb.difficulty}
                  </span>
                </div>
              </div>

              {/* Card body */}
              <div className="p-5">
                <p className="text-sm text-gray-600 mb-4">{pb.description}</p>

                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Example Scenarios</p>
                  <ul className="space-y-1">
                    {pb.scenarios.slice(0, 3).map((s, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="text-indigo-400 mt-0.5">▸</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {pb.tags.map(t => (
                    <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{t}</span>
                  ))}
                </div>

                <Link
                  href={`/playbooks/${pb.slug}`}
                  className="block text-center text-sm bg-gray-900 text-white px-4 py-2.5 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  {pb.gated ? "Unlock Playbook →" : "Read Playbook →"}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Start trial CTA */}
        <div className="mt-12 bg-indigo-600 rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-2">See It Working on Your Stack</h2>
          <p className="text-indigo-100 mb-6 text-sm max-w-lg mx-auto">
            Connect your first vendor in 5 minutes and get real alerts — not just documentation.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block px-8 py-3 bg-white text-indigo-700 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
          >
            Start Free 14-Day Trial →
          </Link>
        </div>
      </div>
    </div>
  );
}
