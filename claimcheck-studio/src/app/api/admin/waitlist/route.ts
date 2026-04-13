import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "claimcheck-admin-2024";

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get("x-admin-secret");
  return auth === ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("cc_waitlist")
    .select("id, name, email, company, role, use_case, status, invited_at, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
