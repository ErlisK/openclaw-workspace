import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, role, trade, region, company_name, pain_notes } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("waitlist").insert({
      email: email.toLowerCase().trim(),
      role,
      trade: trade || null,
      region: region || null,
      company_name: company_name || null,
      pain_notes: pain_notes || null,
      utm_source: req.headers.get("referer") ? new URL(req.headers.get("referer")!).searchParams.get("utm_source") : null,
      utm_medium: req.headers.get("referer") ? new URL(req.headers.get("referer")!).searchParams.get("utm_medium") : null,
      utm_campaign: req.headers.get("referer") ? new URL(req.headers.get("referer")!).searchParams.get("utm_campaign") : null,
      referrer: req.headers.get("referer"),
    });

    if (error && error.code !== "23505") {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
