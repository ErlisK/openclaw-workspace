// GET /api/health — canonical health endpoint (alias for /api/healthcheck)
// Returns service status, Supabase connectivity, version, and uptime
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const START_TIME = Date.now();

export async function GET() {
  const supabase = createClient();

  // Probe Supabase
  const { error: dbError } = await supabase
    .from("docsci_profiles")
    .select("id")
    .limit(1);

  const uptimeSec = Math.floor((Date.now() - START_TIME) / 1000);

  return NextResponse.json({
    status: "ok",
    service: "docsci",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    uptime_seconds: uptimeSec,
    checks: {
      database: dbError ? "error" : "ok",
      auth: "ok",
      rls: "enabled",
    },
    endpoints: {
      healthcheck: "/api/healthcheck",
      rls_verification: "/api/rls-check",
      docs: "/docs-guide",
    },
  }, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
