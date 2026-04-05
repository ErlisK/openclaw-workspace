import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/health/notifications
 * Sanity-check: confirms required tables exist in the database.
 * Returns: { channels_table: bool, dispatches_table: bool, endpoints_count: number }
 * No auth required — returns no sensitive data.
 */
export async function GET() {
  let channelsTable = false;
  let dispatchesTable = false;
  let endpointsCount = 0;

  try {
    // Check crr_notification_channels exists
    const { error: e1 } = await supabaseAdmin
      .from("crr_notification_channels")
      .select("id")
      .limit(1);
    channelsTable = !e1;

    if (channelsTable) {
      const { count } = await supabaseAdmin
        .from("crr_notification_channels")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .eq("type", "slack_webhook");
      endpointsCount = count ?? 0;
    }
  } catch {
    // table doesn't exist or RLS blocks
  }

  try {
    // Check crr_alert_dispatches exists
    const { error: e2 } = await supabaseAdmin
      .from("crr_alert_dispatches")
      .select("id")
      .limit(1);
    dispatchesTable = !e2;
  } catch {
    // table doesn't exist
  }

  const ok = channelsTable && dispatchesTable;

  return NextResponse.json(
    {
      ok,
      channels_table: channelsTable,
      dispatches_table: dispatchesTable,
      active_slack_endpoints: endpointsCount,
      checked_at: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 }
  );
}
