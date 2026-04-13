/**
 * GET  /api/demo?tenant=demo-acme|demo-techflow|demo-cloudbridge
 *      Returns synthetic demo dashboard data for the given tenant.
 *      No auth required.
 *
 * POST /api/demo/reset — regenerate demo tenant data (admin only)
 *
 * Query params:
 *   tenant    — which demo tenant to load (default: demo-acme-saas)
 *   privacy   — "true"|"false" — apply PII redaction (default: true)
 */
import { NextRequest, NextResponse } from "next/server";
import { buildDemoTenant, DEMO_TENANTS } from "@/lib/synthetic-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenant") ?? "demo-acme-saas";
  const privacyParam = req.nextUrl.searchParams.get("privacy");
  const privacyMode = privacyParam === "false" ? false : true; // default ON

  const tenantConfig = DEMO_TENANTS.find(t => t.id === tenantId || t.slug === tenantId);
  if (!tenantConfig) {
    return NextResponse.json(
      { error: "Unknown demo tenant", available: DEMO_TENANTS.map(t => ({ id: t.id, name: t.name })) },
      { status: 404 }
    );
  }

  const tenant = buildDemoTenant(tenantConfig, { privacyMode });

  return NextResponse.json({
    ok: true,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      industry: tenant.industry,
      tagline: tenant.tagline,
      plan: tenant.plan,
    },
    connectors: tenant.connectors,
    alerts: tenant.alerts,
    stats: tenant.stats,
    weekly_briefs: tenant.weekly_briefs,
    privacy_mode: privacyMode,
    meta: {
      is_demo: true,
      data_as_of: new Date().toISOString(),
      all_tenants: DEMO_TENANTS.map(t => ({ id: t.id, name: t.name, industry: t.industry, slug: t.slug })),
    },
  });
}
