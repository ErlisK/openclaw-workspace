import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY;
const FOUNDER_EMAIL = "scide-founder@agentmail.to";

async function notifyFounder(email: string, company: string, role: string, top_tool: string) {
  if (!AGENTMAIL_API_KEY) return;
  try {
    await fetch("https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AGENTMAIL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: FOUNDER_EMAIL,
        subject: `🎯 New waitlist signup: ${email}`,
        text: `New signup on Change Risk Radar!\n\nEmail: ${email}\nCompany: ${company || "—"}\nRole: ${role || "—"}\nTop concern: ${top_tool || "—"}\n\nSite: https://change-risk-radar.vercel.app\nDashboard: https://app.supabase.com/project/lpxhxmpzqjygsaawkrva`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:20px">
            <h2 style="color:#635bff">🎯 New Waitlist Signup!</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Email</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${email}</strong></td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Company</td><td style="padding:8px;border-bottom:1px solid #eee">${company || "—"}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Role</td><td style="padding:8px;border-bottom:1px solid #eee">${role || "—"}</td></tr>
              <tr><td style="padding:8px;color:#666">Top concern</td><td style="padding:8px">${top_tool || "—"}</td></tr>
            </table>
            <p style="margin-top:20px">
              <a href="https://change-risk-radar.vercel.app" style="color:#635bff">View site</a> ·
              <a href="https://app.supabase.com/project/lpxhxmpzqjygsaawkrva/editor" style="color:#635bff">View in Supabase</a>
            </p>
          </div>
        `,
      }),
    });
  } catch (err) {
    console.error("Agentmail notification failed:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, company, role, top_tool } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("crr_waitlist")
      .upsert(
        { email: email.toLowerCase().trim(), company, role, top_tool },
        { onConflict: "email" }
      );

    if (error) {
      console.error("Waitlist insert error:", error);
      return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
    }

    // Fire-and-forget founder notification
    notifyFounder(email, company, role, top_tool);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
