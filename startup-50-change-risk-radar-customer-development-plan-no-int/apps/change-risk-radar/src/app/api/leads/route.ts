/**
 * POST /api/leads  — capture a lead (gated asset request)
 * GET  /api/leads  — list leads (admin)
 */
import { NextRequest, NextResponse } from "next/server";
import { captureLead, getLeadStats, type LeadInput } from "@/lib/lead-gen";

export const dynamic = "force-dynamic";

function checkAdmin(req: NextRequest) {
  const secret = req.headers.get("x-portal-secret") ?? req.nextUrl.searchParams.get("secret");
  return secret === (process.env.PORTAL_SECRET ?? "crr-portal-2025");
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const stats = await getLeadStats();
  return NextResponse.json({ ok: true, ...stats });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as LeadInput;
  if (!body.email) return NextResponse.json({ error: "email required" }, { status: 400 });

  // Extract IP (anonymized)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? undefined;

  try {
    const { lead, is_new } = await captureLead({ ...body, ip });
    return NextResponse.json({ ok: true, lead_id: lead.id, is_new });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
