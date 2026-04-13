import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

function checkPassword(submitted: string): boolean {
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminPw) return false;
  // constant-time compare
  const a = crypto.createHash("sha256").update(submitted).digest("hex");
  const b = crypto.createHash("sha256").update(adminPw).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (!password || !checkPassword(password)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set("admin_session", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
