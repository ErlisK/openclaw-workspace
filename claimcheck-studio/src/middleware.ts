import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({
    request: { headers: req.headers },
  });

  // Set session ID cookie if not present
  if (!req.cookies.get("ccs_sid")) {
    const sid = crypto.randomUUID();
    res.cookies.set("ccs_sid", sid, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 180,
      path: "/",
    });
  }

  // Protect /admin routes with cookie auth
  // Allow /api/admin/login through without check
  if (
    req.nextUrl.pathname.startsWith("/admin") &&
    !req.nextUrl.pathname.startsWith("/api/admin/login")
  ) {
    const sessionCookie = req.cookies.get("admin_session");
    if (!sessionCookie || sessionCookie.value !== "1") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  // Protect /dashboard routes with cookie auth
  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    const sessionCookie = req.cookies.get("admin_session");
    if (!sessionCookie || sessionCookie.value !== "1") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
