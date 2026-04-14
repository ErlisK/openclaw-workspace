import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiting: max 5 requests per IP per 10 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQUESTS) return false;
  entry.count++;
  return true;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before submitting again." },
        { status: 429, headers: { "Retry-After": "600" } }
      );
    }

    const body = await req.json();
    const { name, email, company, message } = body;

    if (!name || typeof name !== "string" || name.trim().length < 1) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!message || typeof message !== "string" || message.trim().length < 10) {
      return NextResponse.json({ error: "Message must be at least 10 characters" }, { status: 400 });
    }

    // Sanitize lengths
    const sanitized = {
      name: name.slice(0, 120),
      email: email.slice(0, 320),
      company: (company ?? "").slice(0, 120),
      message: message.slice(0, 2000),
    };

    // Log the contact form submission
    console.log("[contact form]", { ...sanitized, message: sanitized.message.slice(0, 200) });

    // TODO: integrate with email service (Resend, SendGrid, etc.)
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[contact form error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
