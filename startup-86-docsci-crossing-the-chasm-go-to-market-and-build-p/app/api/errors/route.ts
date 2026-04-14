/**
 * POST /api/errors
 *
 * Structured error ingestion for in-product error tracking.
 * Stores in docsci_error_log and forwards to PostHog if configured.
 *
 * GET /api/errors — list recent errors with optional filters
 */
import { NextRequest, NextResponse } from "next/server";
import { captureError } from "@/lib/analytics";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function svc() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { error_type, message, stack, context, severity, run_id, org_id } = body;

  if (!error_type || !message) {
    return NextResponse.json({ error: "error_type and message are required" }, { status: 400 });
  }

  await captureError({
    errorType: error_type as string,
    message: message as string,
    stack: stack as string | undefined,
    context: context as Record<string, unknown> | undefined,
    severity: severity as "fatal" | "error" | "warning" | "info" | undefined,
    runId: run_id as string | undefined,
    orgId: org_id as string | undefined,
  });

  return NextResponse.json({ captured: true }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(parseInt(sp.get("limit") ?? "50"), 200);
  const severity = sp.get("severity");
  const errorType = sp.get("error_type");
  const resolved = sp.get("resolved");

  let q = svc()
    .from("docsci_error_log")
    .select("id, error_type, message, severity, run_id, org_id, resolved, created_at, context")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (severity) q = q.eq("severity", severity);
  if (errorType) q = q.eq("error_type", errorType);
  if (resolved === "true") q = q.eq("resolved", true);
  if (resolved === "false") q = q.eq("resolved", false);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    errors: data ?? [],
    total: (data ?? []).length,
  });
}
