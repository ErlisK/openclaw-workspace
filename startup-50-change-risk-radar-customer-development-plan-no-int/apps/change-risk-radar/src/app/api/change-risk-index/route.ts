/**
 * GET  /api/change-risk-index?month=YYYY-MM   — fetch or generate index
 * GET  /api/change-risk-index?list=1           — list published months
 * POST /api/change-risk-index                  — force regenerate (admin)
 */
import { NextRequest, NextResponse } from "next/server";
import { getRiskIndex, generateRiskIndex, publishRiskIndex, listRiskIndexMonths } from "@/lib/change-risk-index";

export const dynamic = "force-dynamic";

function checkAdmin(req: NextRequest) {
  const secret = req.headers.get("x-portal-secret") ?? req.nextUrl.searchParams.get("secret");
  return secret === (process.env.PORTAL_SECRET ?? "crr-portal-2025");
}

export async function GET(req: NextRequest) {
  const list = req.nextUrl.searchParams.get("list") === "1";
  const month = req.nextUrl.searchParams.get("month")
    ?? new Date().toISOString().slice(0, 7);

  if (list) {
    const months = await listRiskIndexMonths();
    return NextResponse.json({ ok: true, months });
  }

  const report = await getRiskIndex(month);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true, report });
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { month?: string };
  const month = body.month ?? new Date().toISOString().slice(0, 7);

  const report = await generateRiskIndex(month);
  await publishRiskIndex(report);

  return NextResponse.json({ ok: true, report });
}
