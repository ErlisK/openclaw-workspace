/**
 * GET  /api/notifications/endpoints
 *   Returns active slack_webhook endpoints for the current org/user.
 *   Auth: magic token (x-org-token or ?token=) OR Supabase session (cookies).
 *
 * POST /api/notifications/endpoints
 *   Body: { type: 'slack_webhook', url: string }
 *   Upserts one active Slack webhook per org.
 *   Validates URL starts with https://hooks.slack.com/services/ and length < 512.
 *   Returns 200 and the saved record (URL masked in response).
 *   Auth: magic token (x-org-token or ?token=) OR Supabase session (cookies).
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─── Auth helpers ──────────────────────────────────────────────────────────

interface OrgContext {
  id: string;
  name: string;
  slug: string;
  via: "magic_token" | "session" | "user_id";
}

/**
 * Resolve org context from the request, supporting three auth methods:
 * 1. Magic token header/query param (legacy alpha auth)
 * 2. Supabase session cookie → look up org by user_id
 * 3. Returns null if no auth found
 */
async function resolveOrgContext(req: NextRequest): Promise<OrgContext | null> {
  // 1. Magic token
  const magicToken =
    req.headers.get("x-org-token") ||
    req.nextUrl.searchParams.get("token");

  if (magicToken) {
    const { data } = await supabaseAdmin
      .from("crr_orgs")
      .select("id, name, slug")
      .eq("magic_token", magicToken)
      .eq("status", "active")
      .single();
    if (data) return { ...data, via: "magic_token" };
  }

  // 2. Supabase session (cookie-based)
  try {
    const cookieStore = await cookies();
    const sessionClient = createSupabaseServerClient(cookieStore);
    const { data: { user } } = await sessionClient.auth.getUser();

    if (user) {
      // Look up org by user_id (owner) or org_members
      const { data: org } = await supabaseAdmin
        .from("crr_orgs")
        .select("id, name, slug")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (org) return { ...org, via: "session" };

      // Fallback: check org_members
      const { data: member } = await supabaseAdmin
        .from("crr_org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (member) {
        const { data: memberOrg } = await supabaseAdmin
          .from("crr_orgs")
          .select("id, name, slug")
          .eq("id", member.org_id)
          .eq("status", "active")
          .single();
        if (memberOrg) return { ...memberOrg, via: "session" };
      }

      // Last resort: synthesize org from user_id (no org_id context)
      return {
        id: user.id,
        name: user.email ?? user.id,
        slug: "me",
        via: "user_id",
      };
    }
  } catch {
    // cookies() or session errors — fall through to 401
  }

  return null;
}

// ─── GET ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const org = await resolveOrgContext(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Build query: filter by org_id (or user_id fallback)
  const baseField = org.via === "user_id" ? "created_by" : "org_id";

  const { data: endpoints, error } = await supabaseAdmin
    .from("notification_endpoints")
    .select(
      "id, type, is_active, url, last_test_at, last_test_status, last_error, created_at, updated_at"
    )
    .eq(baseField, org.id)
    .eq("type", "slack_webhook")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[notifications/endpoints GET] DB error", {
      org_id: org.id,
      via: org.via,
      error: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Mask URLs in response — never return raw webhook URLs
  const safeEndpoints = (endpoints ?? []).map((e) => ({
    ...e,
    url: e.url ? `...${String(e.url).slice(-8)}` : null,
  }));

  return NextResponse.json({ endpoints: safeEndpoints, total: safeEndpoints.length });
}

// ─── POST ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const org = await resolveOrgContext(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const { type, url } = body as { type?: string; url?: string };

  // Validate type
  if (!type || type !== "slack_webhook") {
    return NextResponse.json(
      { error: "type must be 'slack_webhook'" },
      { status: 400 }
    );
  }

  // Validate URL
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const trimmedUrl = url.trim();

  if (!trimmedUrl.startsWith("https://hooks.slack.com/services/")) {
    console.info("[notifications/endpoints POST] URL validation failed", {
      org_id: org.id,
      via: org.via,
      url_prefix: trimmedUrl.substring(0, 30),
      valid: false,
    });
    return NextResponse.json(
      {
        error:
          "url must start with https://hooks.slack.com/services/ — use a Slack Incoming Webhook URL",
      },
      { status: 400 }
    );
  }

  if (trimmedUrl.length >= 512) {
    return NextResponse.json(
      { error: "url must be less than 512 characters" },
      { status: 400 }
    );
  }

  console.info("[notifications/endpoints POST] Saving endpoint", {
    org_id: org.id,
    via: org.via,
    type,
    url_prefix: "https://hooks.slack.com/services/",
    valid: true,
  });

  // Determine field to use for org association
  const orgField = org.via === "user_id" ? "created_by" : "org_id";

  // Look for existing endpoint
  const { data: existing } = await supabaseAdmin
    .from("notification_endpoints")
    .select("id")
    .eq(orgField, org.id)
    .eq("type", "slack_webhook")
    .limit(1)
    .maybeSingle();

  const now = new Date().toISOString();
  let savedRecord;

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from("notification_endpoints")
      .update({
        url: trimmedUrl,
        // Also update config.webhook_url for backwards compatibility
        // with existing routes that read from config
        config: { webhook_url: trimmedUrl },
        is_active: true,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("id, type, is_active, updated_at")
      .single();

    if (error) {
      console.error("[notifications/endpoints POST] Update error", {
        org_id: org.id,
        error: error.message,
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    savedRecord = data;
  } else {
    const insertRow: Record<string, unknown> = {
      type: "slack_webhook",
      url: trimmedUrl,
      config: { webhook_url: trimmedUrl },
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    // Set org/user association
    if (org.via === "user_id") {
      insertRow.created_by = org.id;
    } else {
      insertRow.org_id = org.id;
    }

    const { data, error } = await supabaseAdmin
      .from("notification_endpoints")
      .insert(insertRow)
      .select("id, type, is_active, created_at")
      .single();

    if (error) {
      console.error("[notifications/endpoints POST] Insert error", {
        org_id: org.id,
        error: error.message,
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    savedRecord = data;
  }

  console.info("[notifications/endpoints POST] Saved successfully", {
    org_id: org.id,
    via: org.via,
    type,
    endpoint_id: savedRecord?.id,
  });

  return NextResponse.json({ ok: true, endpoint: savedRecord }, { status: 200 });
}
