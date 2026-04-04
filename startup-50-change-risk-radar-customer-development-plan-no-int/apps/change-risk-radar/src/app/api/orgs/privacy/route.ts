/**
 * GET  /api/orgs/privacy?token= — get privacy mode status
 * POST /api/orgs/privacy — toggle privacy mode
 *   body: { privacy_mode: boolean }
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getOrg(req: NextRequest) {
  const token = req.headers.get("x-org-token") ?? req.nextUrl.searchParams.get("token");
  if (!token) return null;
  const { data } = await supabaseAdmin
    .from("crr_orgs")
    .select("id, privacy_mode, name")
    .eq("magic_token", token)
    .single();
  return data;
}

export async function GET(req: NextRequest) {
  const org = await getOrg(req);
  if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    ok: true,
    privacy_mode: org.privacy_mode ?? true,
    description: org.privacy_mode
      ? "PII redaction is active. Emails, IPs, and identifiers are masked in alert text."
      : "Privacy mode is off. Full alert details including identifiers are visible.",
  });
}

export async function POST(req: NextRequest) {
  const org = await getOrg(req);
  if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { privacy_mode?: boolean };
  const newMode = body.privacy_mode ?? true;

  const { error } = await supabaseAdmin
    .from("crr_orgs")
    .update({ privacy_mode: newMode })
    .eq("id", org.id);

  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });

  return NextResponse.json({
    ok: true,
    privacy_mode: newMode,
    message: newMode
      ? "Privacy mode enabled. PII will be redacted in all alert displays."
      : "Privacy mode disabled. Full alert details now visible.",
  });
}

// Helper: redact text (for use in notifications, emails) — exported for other modules
