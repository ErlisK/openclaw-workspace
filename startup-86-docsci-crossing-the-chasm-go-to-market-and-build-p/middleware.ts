import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Generate a nonce for CSP
  const nonce = Buffer.from(randomUUID()).toString("base64");

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protected routes — redirect to login if not authenticated
  if (!user && (pathname.startsWith("/dashboard") || pathname.startsWith("/runs"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // CORS: reflect only allowed origins for /api routes
  const allowedOrigins = new Set(
    (process.env.ALLOWED_ORIGINS || "https://snippetci.com").split(",").map((o) => o.trim())
  );
  const origin = request.headers.get("origin");
  if (pathname.startsWith("/api/") && origin && allowedOrigins.has(origin)) {
    supabaseResponse.headers.set("Access-Control-Allow-Origin", origin);
    supabaseResponse.headers.set("Vary", "Origin");
  }

  // Set nonce header so layout/pages can use it
  supabaseResponse.headers.set("x-nonce", nonce);

  // Nonce-based CSP — no unsafe-inline for scripts
  const csp = [
    "default-src 'self'",
    "img-src 'self' data: https:",
    `script-src 'self' 'nonce-${nonce}' blob:`,
    "worker-src blob:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    `connect-src 'self' https://api.posthog.com https://*.supabase.co wss://*.supabase.co`,
    "frame-ancestors 'none'",
  ].join("; ");

  supabaseResponse.headers.set("content-security-policy", csp);

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
