import { NextRequest, NextResponse } from "next/server";
import { appendJsonl, todayPath } from "@/lib/github";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = req.cookies.get("ccs_sid")?.value || "unknown";
    const event = {
      type: body.type || "unknown",
      pathname: body.pathname || "/",
      search: body.search || "",
      referrer: body.referrer || "",
      utm: body.utm || {},
      session_id: sessionId,
      timestamp: new Date().toISOString(),
    };
    appendJsonl(todayPath("events", "events"), event).catch((e) =>
      console.error("[event] github write failed:", e)
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
