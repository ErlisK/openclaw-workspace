import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email, company, role, top_tool } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("crr_waitlist")
      .upsert({ email: email.toLowerCase().trim(), company, role, top_tool }, { onConflict: "email" });

    if (error) {
      console.error("Waitlist insert error:", error);
      return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
