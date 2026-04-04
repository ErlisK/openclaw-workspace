import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, session_id, path, referrer, variant, event, email, metadata } = body;

    if (!type || !session_id) {
      return NextResponse.json({ error: "type and session_id required" }, { status: 400 });
    }

    if (type === "pageview") {
      // Get rough country hint from CF header (Vercel forwards this)
      const country = req.headers.get("x-vercel-ip-country") || null;
      const ua_hint = (req.headers.get("user-agent") || "").slice(0, 120);

      await supabaseAdmin.from("crr_visitors").insert({
        session_id,
        path: path || "/",
        referrer: referrer || null,
        variant: variant || null,
        country,
        ua_hint,
      });
    } else if (type === "event") {
      // Write to ab_events
      if (event) {
        await supabaseAdmin.from("crr_ab_events").insert({
          event,
          variant: variant || "A",
          email: email || null,
          metadata: metadata || {},
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Analytics should never crash the user
    console.error("Track error:", err);
    return NextResponse.json({ ok: true });
  }
}
