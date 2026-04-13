import { NextResponse } from "next/server";

// Auth callback is no longer used (migrated to password auth)
export async function GET() {
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "https://citebundle.com"));
}
