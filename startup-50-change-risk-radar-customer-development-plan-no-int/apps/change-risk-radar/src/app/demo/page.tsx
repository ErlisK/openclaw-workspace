import { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import DemoClient from "./DemoClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Demo — Change Risk Radar",
  description: "See exactly what you would have been alerted to this week if Change Risk Radar was watching your stack.",
};

const FOUNDER_STACK = [
  "stripe", "aws", "google-workspace", "github", "shopify",
  "vercel", "slack", "hubspot", "twilio", "sendgrid", "cloudflare",
];

const STACK_META: Record<string, { name: string; icon: string; color: string; category: string }> = {
  stripe: { name: "Stripe", icon: "💳", color: "#635bff", category: "Payments" },
  aws: { name: "AWS", icon: "☁️", color: "#ff9900", category: "Infrastructure" },
  "google-workspace": { name: "Google Workspace", icon: "🔵", color: "#4285f4", category: "Productivity" },
  github: { name: "GitHub", icon: "🐙", color: "#24292e", category: "Dev Tools" },
  shopify: { name: "Shopify", icon: "🛍️", color: "#96bf48", category: "E-commerce" },
  vercel: { name: "Vercel", icon: "▲", color: "#000", category: "Infrastructure" },
  slack: { name: "Slack", icon: "💬", color: "#4a154b", category: "Communication" },
  hubspot: { name: "HubSpot", icon: "🟠", color: "#ff7a59", category: "CRM" },
  twilio: { name: "Twilio", icon: "📱", color: "#f22f46", category: "Messaging" },
  sendgrid: { name: "SendGrid", icon: "✉️", color: "#1a82e2", category: "Email" },
  cloudflare: { name: "Cloudflare", icon: "🌐", color: "#f38020", category: "Network" },
};

export default async function DemoPage() {
  // Fetch last 14 days of alerts for founder's stack
  const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: allDiffs } = await supabaseAdmin
    .from("crr_diffs")
    .select("*")
    .in("vendor_slug", FOUNDER_STACK)
    .gte("collected_at", since14d)
    .order("collected_at", { ascending: false })
    .limit(300);

  const diffs = allDiffs ?? [];

  // Compute stats
  const highRisk = diffs.filter(d => d.risk_level === "high");
  const recent7d = diffs.filter(d => d.collected_at >= since7d);
  const byVendor: Record<string, typeof diffs> = {};
  for (const d of diffs) {
    if (!byVendor[d.vendor_slug]) byVendor[d.vendor_slug] = [];
    byVendor[d.vendor_slug].push(d);
  }

  // First high-risk or first any alert
  const firstHighRisk = highRisk[0] ?? null;
  const latestAlert = diffs[0] ?? null;

  // Total ever in observatory for these vendors
  const { count: totalEver } = await supabaseAdmin
    .from("crr_diffs")
    .select("id", { count: "exact", head: true })
    .in("vendor_slug", FOUNDER_STACK);

  const stats = {
    total14d: diffs.length,
    total7d: recent7d.length,
    highRisk14d: highRisk.length,
    vendorsActive: Object.keys(byVendor).length,
    totalEver: totalEver ?? 0,
  };

  return (
    <DemoClient
      diffs={diffs}
      byVendor={byVendor}
      stats={stats}
      firstHighRisk={firstHighRisk}
      latestAlert={latestAlert}
      stackMeta={STACK_META}
      founderStack={FOUNDER_STACK}
    />
  );
}
