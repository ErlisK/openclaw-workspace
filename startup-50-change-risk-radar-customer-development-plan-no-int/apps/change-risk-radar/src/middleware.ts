import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  // Only run A/B test on landing page
  if (pathname !== "/") return res;

  // Assign variant if not already set (50/50 split)
  const existing = req.cookies.get("ab_pricing");
  if (!existing) {
    const variant = Math.random() < 0.5 ? "A" : "B";
    res.cookies.set("ab_pricing", variant, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
      httpOnly: false, // readable client-side for analytics
      sameSite: "lax",
    });
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
