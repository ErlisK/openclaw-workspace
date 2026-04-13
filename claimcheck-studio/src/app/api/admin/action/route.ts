import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "claimcheck-admin-2024";

function isAuthorized(req: NextRequest) {
  return req.headers.get("x-admin-secret") === ADMIN_SECRET;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, action } = await req.json();
  if (!id || !action) {
    return NextResponse.json({ error: "Missing id or action" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  if (action === "remove") {
    const { error } = await supabase.from("cc_waitlist").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "approve") {
    // Get the waitlist entry
    const { data: entry, error: fetchErr } = await supabase
      .from("cc_waitlist")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // Invite user via Supabase Auth (sends magic link email)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://citebundle.com";
    const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
      entry.email,
      {
        redirectTo: `${appUrl}/api/auth/callback?next=/dashboard`,
        data: {
          name: entry.name,
          company: entry.company,
          role: entry.role,
        },
      }
    );

    if (inviteErr) {
      return NextResponse.json({ error: inviteErr.message }, { status: 500 });
    }

    // Mark as invited in waitlist
    await supabase
      .from("cc_waitlist")
      .update({ status: "invited", invited_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ ok: true, user_id: inviteData?.user?.id });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
