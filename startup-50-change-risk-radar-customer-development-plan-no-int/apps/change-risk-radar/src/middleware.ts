import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js middleware:
 * 1. Refreshes Supabase auth session on every request
 * 2. Assigns A/B pricing variant cookie on landing page
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next({
    request: { headers: req.headers },
  });

  const { pathname } = req.nextUrl;

  // Refresh Supabase session (keeps JWT fresh)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session (non-blocking — don't gate any routes on auth)
  await supabase.auth.getSession();

  // A/B pricing test on landing page only
  if (pathname === "/") {
    const existing = req.cookies.get("ab_pricing");
    if (!existing) {
      const variant = Math.random() < 0.5 ? "A" : "B";
      res.cookies.set("ab_pricing", variant, {
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
        httpOnly: false,
        sameSite: "lax",
      });
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
