import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendAlertNotifications, type NotificationChannel } from "@/lib/notifier";

export const dynamic = "force-dynamic";

async function getOrgId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  if (auth === `Bearer ${secret}`) {
    const body = await req.json().catch(() => ({}));
    return body.org_id ?? null;
  }
  const token = req.headers.get("x-org-token") || req.nextUrl.searchParams.get("token");
  if (!token) return null;
  const { data } = await supabaseAdmin.from("crr_orgs").select("id").eq("magic_token", token).eq("status", "active").single();
  return data?.id ?? null;
}

// GET /api/notifications/channels — list channels
export async function GET(req: NextRequest) {
  const token = req.headers.get("x-org-token") || req.nextUrl.searchParams.get("token");
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  const isAdmin = auth === `Bearer ${secret}`;

  let orgId: string | null = null;
  if (token) {
    const { data } = await supabaseAdmin.from("crr_orgs").select("id").eq("magic_token", token).eq("status", "active").single();
    orgId = data?.id ?? null;
  } else if (isAdmin) {
    orgId = req.nextUrl.searchParams.get("org_id") ?? null;
  }
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: channels } = await supabaseAdmin
    .from("crr_notification_channels")
    .select("id, type, label, config, is_active, trigger_count, error_count, last_triggered_at, last_error, created_at")
    .eq("org_id", orgId)
    .order("created_at");

  // Mask sensitive config fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safe = (channels ?? []).map((c: any) => ({
    ...c,
    config: {
      ...c.config,
      webhook_url: c.config?.webhook_url ? `...${String(c.config.webhook_url).slice(-8)}` : undefined,
      url: c.config?.url ? `...${String(c.config.url).slice(-8)}` : undefined,
      secret: c.config?.secret ? "***" : undefined,
      integration_key: c.config?.integration_key ? "***" : undefined,
    },
  }));

  return NextResponse.json({ channels: safe, total: safe.length });
}

// POST /api/notifications/channels — create a channel
export async function POST(req: NextRequest) {
  const token = req.headers.get("x-org-token") || req.nextUrl.searchParams.get("token");
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  let orgId: string | null = null;

  if (token) {
    const { data } = await supabaseAdmin.from("crr_orgs").select("id").eq("magic_token", token).eq("status", "active").single();
    orgId = data?.id ?? null;
  } else if (auth === `Bearer ${secret}`) {
    const body = await req.json().catch(() => ({}));
    orgId = body.org_id ?? null;
  }
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { type, label, config } = body;
  if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });

  const { data: channel, error } = await supabaseAdmin
    .from("crr_notification_channels")
    .insert({ org_id: orgId, type, label: label || type, config: config || {} })
    .select("id, type, label, is_active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, channel });
}

// PATCH /api/notifications/channels — update a channel
export async function PATCH(req: NextRequest) {
  const token = req.headers.get("x-org-token") || req.nextUrl.searchParams.get("token");
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  let orgId: string | null = null;

  if (token) {
    const { data } = await supabaseAdmin.from("crr_orgs").select("id").eq("magic_token", token).eq("status", "active").single();
    orgId = data?.id ?? null;
  } else if (auth === `Bearer ${secret}`) {
    const body = await req.json().catch(() => ({}));
    orgId = body.org_id ?? null;
  }
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const allowed = ["label", "config", "is_active"];
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) if (allowed.includes(k)) safe[k] = v;

  const { data, error } = await supabaseAdmin
    .from("crr_notification_channels")
    .update(safe)
    .eq("id", id)
    .eq("org_id", orgId)
    .select("id, type, label, is_active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, channel: data });
}

// DELETE /api/notifications/channels?id=... — delete a channel
export async function DELETE(req: NextRequest) {
  const token = req.headers.get("x-org-token") || req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabaseAdmin.from("crr_orgs").select("id").eq("magic_token", token).eq("status", "active").single();
  const orgId = data?.id;
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await supabaseAdmin.from("crr_notification_channels").delete().eq("id", id).eq("org_id", orgId);
  return NextResponse.json({ ok: true });
}
