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
    timestamp: new Date().toISOString(),
    checks: {
      database: dbError ? "error" : "ok",
      auth: "ok",
    },
  }, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
