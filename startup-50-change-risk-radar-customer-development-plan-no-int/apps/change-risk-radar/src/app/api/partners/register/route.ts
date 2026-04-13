/**
 * POST /api/partners/register — public partner registration
 * GET  /api/partners/register — check referral code validity
 */
import { NextRequest, NextResponse } from "next/server";
import { registerPartner, getPartnerByCode } from "@/lib/partner-portal";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

  const partner = await getPartnerByCode(code);
  if (!partner) return NextResponse.json({ valid: false }, { status: 404 });

  return NextResponse.json({
    valid: true,
    code: partner.referral_code,
    partner_name: partner.name,
    company: partner.company,
    tier: partner.tier,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    name?: string;
    company?: string;
    email?: string;
    website?: string;
    partner_type?: string;
    description?: string;
  };

  if (!body.name || !body.company || !body.email) {
    return NextResponse.json({ error: "name, company, email required" }, { status: 400 });
  }

  try {
    const result = await registerPartner({
      name: body.name,
      company: body.company,
      email: body.email,
      website: body.website,
      partner_type: body.partner_type ?? "referral",
      description: body.description,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
