/**
 * POST /api/partners/track — track referral link clicks (public, no auth)
 * Records: referral_code, utm params, landing page, hashed IP
 */
import { NextRequest, NextResponse } from "next/server";
import { trackReferralClick } from "@/lib/partner-portal";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    referral_code?: string;
    utm_source?: string;
    utm_medium?: string;
    landing_page?: string;
  };

  if (!body.referral_code) {
    return NextResponse.json({ error: "referral_code required" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? undefined;

  await trackReferralClick({
    referral_code: body.referral_code,
    ip,
    utm_source: body.utm_source,
    utm_medium: body.utm_medium,
    landing_page: body.landing_page,
  });

  return NextResponse.json({ ok: true });
}

// GET can also work for pixel-style tracking
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("ref") ?? req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ ok: false }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

  await trackReferralClick({
    referral_code: code,
    ip,
    utm_source: req.nextUrl.searchParams.get("utm_source") ?? undefined,
    utm_medium: req.nextUrl.searchParams.get("utm_medium") ?? undefined,
    landing_page: req.nextUrl.searchParams.get("page") ?? undefined,
  });

  // Return 1x1 transparent GIF for pixel tracking
  const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
  return new Response(gif, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-cache" },
  });
}
