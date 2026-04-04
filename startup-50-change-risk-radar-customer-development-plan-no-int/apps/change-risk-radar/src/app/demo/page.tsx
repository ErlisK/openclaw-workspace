import type { Metadata } from "next";
import { buildDemoTenant, DEMO_TENANTS } from "@/lib/synthetic-data";
import DemoPageClient from "./DemoPageClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Interactive Demo — Change Risk Radar",
  description: "See exactly what Change Risk Radar would have detected for your stack. Synthetic demo data — no credentials needed.",
};

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string; privacy?: string }>;
}) {
  const params = await searchParams;
  const tenantId = params.tenant ?? "demo-acme-saas";
  const privacyMode = params.privacy !== "false"; // default ON

  const tenantConfig = DEMO_TENANTS.find(t => t.id === tenantId || t.slug === tenantId)
    ?? DEMO_TENANTS[0];

  const tenant = buildDemoTenant(tenantConfig, { privacyMode });
  const allTenants = DEMO_TENANTS.map(t => ({ id: t.id, name: t.name, industry: t.industry, slug: t.slug }));

  return (
    <DemoPageClient
      initialData={{
        tenant: {
          id: tenant.id,
          name: tenant.name,
          industry: tenant.industry,
          tagline: tenant.tagline,
          plan: tenant.plan,
        },
        connectors: tenant.connectors,
        alerts: tenant.alerts,
        stats: tenant.stats,
        weekly_briefs: tenant.weekly_briefs,
        privacy_mode: privacyMode,
        meta: { all_tenants: allTenants },
      }}
    />
  );
}
