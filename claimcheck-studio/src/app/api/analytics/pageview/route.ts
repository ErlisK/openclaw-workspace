import { NextRequest, NextResponse } from "next/server";

const PAGE_VIEWS_TABLE = "cc_page_views";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn("[pageview] Missing Supabase env vars — skipping analytics insert");
      return NextResponse.json({ ok: true });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      null;

    const row = {
      pathname: body.pathname || "/",
      search: body.search || null,
      referrer: body.referrer || null,
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      utm_term: body.utm_term || null,
      utm_content: body.utm_content || null,
      user_agent: body.user_agent || null,
      session_id: body.session_id || null,
      ip,
    };

    const res = await fetch(`${supabaseUrl}/rest/v1/${PAGE_VIEWS_TABLE}`, {
      method: "POST",
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });

    if (!res.ok) {
      const errText = await res.text();
      // Table likely doesn't exist yet — log clearly but don't crash
      console.warn(
        `[pageview] Supabase insert failed (${res.status}): ${errText}\n` +
          `ACTION REQUIRED: Create the "${PAGE_VIEWS_TABLE}" table in Supabase — see README for DDL.`
      );
      return NextResponse.json({ ok: true }); // fail open
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[pageview] Unexpected error:", err);
    return NextResponse.json({ ok: true }); // never crash the page
  }
}
