import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPartnerByCode } from "@/lib/partner-portal";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await props.params;
  const partner = await getPartnerByCode(code);
  if (!partner) return { title: "Not Found" };
  return {
    title: `${partner.company} × Change Risk Radar — Partner Referral`,
    description: `${partner.name} at ${partner.company} is using Change Risk Radar to monitor SaaS vendor changes. Start your free 14-day trial.`,
  };
}

export default async function PartnerReferralPage(props: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await props.params;
  const partner = await getPartnerByCode(code);

  if (!partner || partner.status !== "active") notFound();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-indigo-900 text-white">
      {/* Track click via script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            fetch('/api/partners/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                referral_code: '${partner.referral_code}',
                landing_page: window.location.pathname,
                utm_source: new URLSearchParams(window.location.search).get('utm_source') || undefined,
                utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
              })
            }).catch(() => {});
          `,
        }}
      />

      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        {/* Partner intro */}
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm text-indigo-200 mb-8">
          <span className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-xs font-bold">
            {partner.name[0]}
          </span>
          <span><strong>{partner.name}</strong> at {partner.company} recommended this tool</span>
        </div>

        <h1 className="text-5xl font-bold mb-5 leading-tight">
          Know When Your SaaS Stack Changes
        </h1>

        <p className="text-xl text-indigo-200 mb-8 max-w-2xl mx-auto">
          Change Risk Radar monitors Stripe, AWS, Shopify, Salesforce, and 25+ other vendors — 
          alerting your team in plain English when a change creates pricing, legal, security, or 
          operational risk.
        </p>

        {/* Social proof */}
        <div className="grid grid-cols-3 gap-4 mb-10 text-center">
          {[
            { stat: "374", label: "Changes detected this month" },
            { stat: "198", label: "High-severity alerts surfaced" },
            { stat: "28+", label: "SaaS vendors monitored" },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-4">
              <div className="text-3xl font-bold text-white">{s.stat}</div>
              <div className="text-xs text-indigo-300 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link
            href={`/auth/signup?ref=${partner.referral_code}`}
            className="px-8 py-4 bg-white text-indigo-700 rounded-xl font-bold text-lg hover:bg-indigo-50 transition-colors"
          >
            Start Free 14-Day Trial →
          </Link>
          <Link
            href="/sales"
            className="px-8 py-4 border border-indigo-500 text-white rounded-xl font-semibold text-lg hover:border-white transition-colors"
          >
            See Product Overview
          </Link>
        </div>

        <p className="text-xs text-indigo-400">
          No credit card required. Full access for 14 days. Referred by {partner.company}.
        </p>

        {/* What you get */}
        <div className="mt-16 bg-white/10 rounded-2xl p-8 text-left">
          <h2 className="text-xl font-bold mb-5 text-center">What You Get</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              "Plain-English alerts when vendors change pricing, terms, or permissions",
              "Real-time monitoring of Stripe, AWS, Shopify, Salesforce, Google Workspace",
              "Security alerts for IAM changes, OAuth scope expansions, sharing model updates",
              "GDPR compliance events and ToS change notifications",
              "Team collaboration with RBAC, invite members, and Slack/email routing",
              "Monthly SaaS Change Risk Index showing the riskiest vendors",
            ].map(item => (
              <div key={item} className="flex items-start gap-2 text-sm text-indigo-100">
                <span className="text-green-400 mt-0.5 shrink-0">✓</span>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Playbooks CTA */}
        <div className="mt-8 text-sm text-indigo-300">
          Already know you want it?{" "}
          <Link href={`/auth/signup?ref=${partner.referral_code}`} className="text-white hover:underline font-medium">
            Sign up now →
          </Link>
          {" · "}
          <Link href="/change-risk-index" className="hover:underline">
            Read the Risk Index
          </Link>
          {" · "}
          <Link href="/playbooks" className="hover:underline">
            Integration Playbooks
          </Link>
        </div>
      </div>
    </div>
  );
}
