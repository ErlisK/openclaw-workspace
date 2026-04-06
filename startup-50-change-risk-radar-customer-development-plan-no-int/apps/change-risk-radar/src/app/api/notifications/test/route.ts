/**
 * POST /api/notifications/test
 *
 * Four modes:
 *
 * 1. Direct webhook test (new, spec-compliant, no auth required):
 *    { webhook_url: string, text?: string, dry_run?: boolean }
 *    - Validates webhook_url (https; in production only hooks.slack.com)
 *    - Supports dry_run: returns echoed payload without making outbound request
 *    - Per-IP rate limit: 10 requests per 5 minutes
 *    - No webhook_url logged server-side
 *
 * 2. Legacy channel_id test:
 *    { channel_id: string }
 *    Auth: magic token (?token= or x-org-token).
 *
 * 3. Slack notification_endpoints test (legacy flag):
 *    { use_notification_endpoints: true }
 *    Auth: magic token (?token= or x-org-token).
 *
 * 4. Session-based test send:
 *    { type: 'slack_webhook' } or empty body
 *    Auth: Supabase session cookie OR magic token.
 *
 * GET /api/notifications/test?channel_id=...
 *   Returns recent delivery log for a channel.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-auth";
import { sendAlertNotifications } from "@/lib/notifier";
import { validateWebhookUrl, VERCEL_ENV } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const runtime = "nodejs";

// ─── In-memory per-IP rate limiter ─────────────────────────────────────────

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/** Returns true if the request is allowed; false if rate-limited */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;

  entry.count += 1;
  return true;
}

/** Extract client IP from Vercel / standard proxy headers */
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ─── Default Slack payload ──────────────────────────────────────────────────

function buildDefaultSlackPayload(customText?: string) {
  const text =
    customText?.trim() || "Change Risk Radar: Test notification";
  return {
    text,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Change Risk Radar* test notification is working. ✅",
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `You can adjust settings at /settings/notifications · env: ${VERCEL_ENV} · ts: ${new Date().toISOString()}`,
          },
        ],
      },
    ],
  };
}

// ─── Auth: resolve org from magic token OR Supabase session ────────────────

interface OrgContext {
  id: string;
  name: string;
  slug: string;
  via: "magic_token" | "session" | "user_id";
}

async function resolveOrgContext(req: NextRequest): Promise<OrgContext | null> {
  // 1. Magic token (legacy)
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
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    if (user) {
      const { data: org } = await supabaseAdmin
        .from("crr_orgs")
        .select("id, name, slug")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (org) return { ...org, via: "session" };

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

      // No org found, use user_id as fallback
      return {
        id: user.id,
        name: user.email ?? user.id,
        slug: "me",
        via: "user_id",
      };
    }
  } catch {
    // Session errors — fall through
  }

  return null;
}

// ─── POST ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Require application/json ──────────────────────────────────────────
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      { ok: false, error: "Content-Type must be application/json" },
      { status: 415 },
    );
  }

  // ── Parse body (max ~16 KB to avoid abuse) ────────────────────────────
  let body: Record<string, unknown>;
  try {
    const rawText = await req.text();
    if (rawText.length > 16_384) {
      return NextResponse.json(
        { ok: false, error: "Request body too large" },
        { status: 413 },
      );
    }
    body = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  // ── Mode 1: Direct webhook_url test (new spec-compliant, no auth) ──────
  if (body.webhook_url !== undefined) {
    const webhookUrl = typeof body.webhook_url === "string" ? body.webhook_url.trim() : "";

    if (!webhookUrl) {
      return NextResponse.json(
        { ok: false, error: "webhook_url is required" },
        { status: 400 },
      );
    }

    // Validate URL (host restriction in production)
    const validation = validateWebhookUrl(webhookUrl);
    if (!validation.ok) {
      return NextResponse.json(
        { ok: false, error: validation.error },
        { status: 400 },
      );
    }

    // Per-IP rate limiting
    const clientIp = getClientIp(req);
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Rate limit exceeded — maximum 10 requests per 5 minutes",
        },
        { status: 429 },
      );
    }

    const customText = typeof body.text === "string" ? body.text : undefined;
    const dryRun = body.dry_run === true;
    const payload = buildDefaultSlackPayload(customText);

    // Dry run: return without sending
    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dry_run: true,
        would_post_to: `[REDACTED — ${new URL(webhookUrl).hostname}]`,
        payload,
      });
    }

    // Live send — do NOT log webhook_url
    const start = Date.now();
    let slackRes: Response;
    try {
      slackRes = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Redact URL from error messages
      return NextResponse.json(
        { ok: false, error: "Outbound request failed", detail: msg },
        { status: 502 },
      );
    }

    const latency_ms = Date.now() - start;
    const responseText = await slackRes.text().catch(() => "");

    if (!slackRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Upstream non-2xx",
          status: slackRes.status,
          body: responseText.slice(0, 200),
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, latency_ms });
  }

  // ── Modes 2-4: Auth-required paths (existing behavior) ────────────────
  const org = await resolveOrgContext(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Mode 2: legacy channel_id test ────────────────────────────────────
  if (body.channel_id) {
    const { data: channel } = await supabaseAdmin
      .from("crr_notification_channels")
      .select("*")
      .eq("id", body.channel_id)
      .eq("org_id", org.id)
      .single();

    if (!channel)
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });

    const testAlert = {
      id: "00000000-0000-0000-0000-000000000001",
      org_id: org.id,
      vendor_slug: "stripe",
      risk_level: "high",
      risk_category: "pricing",
      severity: "critical",
      title: `[Test] Change Risk Radar — ${channel.type} notification test`,
      summary: `This is a test notification from Change Risk Radar for ${org.name}. Your ${channel.type} channel is configured correctly and will receive real alerts when risk changes are detected.`,
      source_url: "https://change-risk-radar.vercel.app",
      created_at: new Date().toISOString(),
    };

    const results = await sendAlertNotifications(testAlert, { dryRun: false });
    const result = results[0];

    return NextResponse.json({
      ok: result?.status === "sent",
      channel_type: channel.type,
      status: result?.status,
      error: result?.error,
      latency_ms: result?.latency_ms,
    });
  }

  // ── Modes 3 & 4: notification_endpoints Slack test ────────────────────
  const orgField = org.via === "user_id" ? "created_by" : "org_id";

  const { data: endpoint } = await supabaseAdmin
    .from("notification_endpoints")
    .select("id, url, config")
    .eq(orgField, org.id)
    .eq("type", "slack_webhook")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!endpoint) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No active Slack webhook configured. Save a webhook URL in Notification Settings first.",
      },
      { status: 400 },
    );
  }

  const webhookUrl: string | undefined =
    (endpoint.url as string | null) ||
    ((endpoint.config as Record<string, unknown>)?.webhook_url as
      | string
      | undefined);

  if (!webhookUrl) {
    return NextResponse.json(
      { ok: false, error: "No webhook URL found in endpoint config." },
      { status: 400 },
    );
  }

  const isLegacyMode = !!body.use_notification_endpoints;
  const testText = isLegacyMode
    ? `✅ Change Risk Radar test — your Slack notifications are set up for *${org.name}*.`
    : `Change Risk Radar — Test notification successful. If you can see this, Slack alerts are configured. (env: ${VERCEL_ENV}, ts: ${new Date().toISOString()})`;

  const payload = { text: testText };

  const start = Date.now();
  let slackRes: Response;

  try {
    slackRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabaseAdmin
      .from("notification_endpoints")
      .update({
        last_test_at: new Date().toISOString(),
        last_test_status: "error",
        last_error: msg.slice(0, 200),
        updated_at: new Date().toISOString(),
      })
      .eq("id", endpoint.id);
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }

  const latency_ms = Date.now() - start;
  const responseText = await slackRes.text().catch(() => "");

  if (!slackRes.ok) {
    const errMsg = `HTTP ${slackRes.status}: ${responseText.slice(0, 200)}`;
    await supabaseAdmin
      .from("notification_endpoints")
      .update({
        last_test_at: new Date().toISOString(),
        last_test_status: "error",
        last_error: errMsg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", endpoint.id);
    return NextResponse.json({ ok: false, error: errMsg }, { status: 502 });
  }

  await supabaseAdmin
    .from("notification_endpoints")
    .update({
      last_test_at: new Date().toISOString(),
      last_test_status: "ok",
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", endpoint.id);

  return NextResponse.json({ ok: true, latency_ms });
}

// ─── GET ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const org = await resolveOrgContext(req);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channelId = req.nextUrl.searchParams.get("channel_id");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabaseAdmin
    .from("crr_notification_log")
    .select("id, channel_type, status, error_message, latency_ms, created_at")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (channelId) query = query.eq("channel_id", channelId);

  const { data: logs } = await query;

  return NextResponse.json({
    logs: logs ?? [],
    summary: {
      total: logs?.length ?? 0,
      sent:
        logs?.filter((l: { status: string }) => l.status === "sent").length ??
        0,
      failed:
        logs?.filter((l: { status: string }) => l.status === "failed")
          .length ?? 0,
      avg_latency_ms: logs?.length
        ? Math.round(
            logs
              .filter((l: { latency_ms: number | null }) => l.latency_ms)
              .reduce(
                (s: number, l: { latency_ms: number }) => s + l.latency_ms,
                0,
              ) / logs.length,
          )
        : 0,
    },
  });
}
