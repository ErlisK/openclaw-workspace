import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, company, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Log the contact form submission
    console.log("[contact form]", { name, email, company, message: message.slice(0, 200) });

    // TODO: integrate with email service (Resend, SendGrid, etc.)
    // For now, we just acknowledge receipt

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[contact form error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
