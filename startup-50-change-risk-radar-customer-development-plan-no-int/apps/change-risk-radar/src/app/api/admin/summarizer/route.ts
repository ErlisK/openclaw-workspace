/**
 * GET  /api/admin/summarizer?mode=stats|templates|audit|test
 * POST /api/admin/summarizer — test summarize() with custom facts
 *
 * Auth: Authorization: Bearer <CRON_SECRET>
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  summarize,
  getTemplateStats,
  lookupTemplate,
  stripeEventToFacts,
  cloudtrailEventToFacts,
  workspaceEventToFacts,
  diffToFacts,
  type RawFacts,
} from "@/lib/summarizer";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET ?? "crr-cron-2025-secure";

function auth(req: NextRequest): boolean {
  const h = req.headers.get("authorization") ?? "";
  const t = req.nextUrl.searchParams.get("secret") ?? "";
  return h === `Bearer ${CRON_SECRET}` || t === CRON_SECRET;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mode = req.nextUrl.searchParams.get("mode") ?? "stats";

  // ── Stats ──────────────────────────────────────────────────────────────
  if (mode === "stats") {
    const stats = getTemplateStats();

    // Recent audit log summary
    const { data: auditRows } = await supabaseAdmin
      .from("crr_summary_audit")
      .select("method, template_key, llm_model, tokens_in, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    const auditStats = {
      total: auditRows?.length ?? 0,
      byMethod: {} as Record<string, number>,
      byTemplateKey: {} as Record<string, number>,
      totalTokens: 0,
    };
    for (const r of auditRows ?? []) {
      auditStats.byMethod[r.method] = (auditStats.byMethod[r.method] ?? 0) + 1;
      if (r.template_key) auditStats.byTemplateKey[r.template_key] = (auditStats.byTemplateKey[r.template_key] ?? 0) + 1;
      auditStats.totalTokens += r.tokens_in ?? 0;
    }

    // LLM usage by org
    const { data: llmUsage } = await supabaseAdmin
      .from("crr_summary_audit")
      .select("org_id, method")
      .eq("method", "llm")
      .limit(100);

    return NextResponse.json({
      ok: true,
      templates: stats,
      audit: auditStats,
      llm: {
        enabled: process.env.ENABLE_LLM_SUMMARIES === "true",
        hasApiKey: !!process.env.OPENAI_API_KEY,
        model: process.env.LLM_MODEL ?? "gpt-4o-mini",
        totalLLMSummaries: llmUsage?.length ?? 0,
      },
    });
  }

  // ── Templates list ─────────────────────────────────────────────────────
  if (mode === "templates") {
    const stats = getTemplateStats();

    // Show example output for each template
    const examples = stats.keys.slice(0, 30).map(key => {
      const parts = key.split(".");
      const vendor = parts[0] === "generic" ? "stripe" : parts[0];
      const eventName = parts.length > 1 ? parts.slice(1).join(".") : undefined;
      const facts: RawFacts = {
        vendor_slug: vendor,
        event_name: eventName,
        source: "stripe_webhook",
        aws_account_id: "123456789",
        aws_user_name: "deploy-bot",
        aws_source_ip: "10.0.0.1",
        price_id: "price_test_123",
        new_unit_amount: 9900,
        old_unit_amount: 7900,
        currency: "usd",
        interval: "month",
        customer_id: "cus_test_123",
        workspace_actor: "admin@example.com",
        workspace_target: "user@example.com",
        lines_added: 12,
        lines_removed: 4,
        snippet: "Annual plan pricing has been updated from $79/mo to $99/mo for new customers starting Feb 2025.",
      };
      const { fn } = lookupTemplate(facts, undefined, undefined);
      const out = fn(facts);
      return { key, title: out.title, summary: out.summary.slice(0, 120) + "…" };
    });

    return NextResponse.json({ ok: true, total: stats.total, byCategory: stats.byCategory, examples });
  }

  // ── Audit log ──────────────────────────────────────────────────────────
  if (mode === "audit") {
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50");
    const { data: rows } = await supabaseAdmin
      .from("crr_summary_audit")
      .select("id, alert_id, org_id, method, template_key, llm_model, tokens_in, latency_ms, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    return NextResponse.json({ ok: true, total: rows?.length ?? 0, rows: rows ?? [] });
  }

  // ── Test mode: show sample outputs for each source type ───────────────
  if (mode === "test") {
    const samples: Record<string, { title: string; summary: string; impact: string; action: string; templateKey: string }> = {};

    const test = async (label: string, facts: RawFacts, category?: string, method?: string) => {
      const result = await summarize(facts, { riskCategory: category, detectionMethod: method });
      samples[label] = { title: result.title, summary: result.summary, impact: result.impact, action: result.action, templateKey: result.templateKey };
    };

    await test("stripe_price_updated", stripeEventToFacts({
      id: "evt_test", type: "price.updated",
      data: { object: { object: "price", id: "price_123", unit_amount: 9900, currency: "usd", recurring: { interval: "month" }, product: "prod_abc", nickname: "Pro Plan" } },
      previous_attributes: { unit_amount: 7900 },
    }), "pricing");

    await test("stripe_fraud_warning", stripeEventToFacts({
      id: "evt_fw", type: "radar.early_fraud_warning.created",
      data: { object: { object: "early_fraud_warning", customer: "cus_xyz", charge: "ch_abc" } },
    }), "security");

    await test("aws_stop_logging", cloudtrailEventToFacts({
      eventName: "StopLogging", awsRegion: "us-east-1",
      userIdentity: { userName: "terraform-ci", accountId: "123456789012" },
      sourceIPAddress: "52.0.0.1",
      requestParameters: { name: "prod-trail" },
    }), "security");

    await test("aws_create_user", cloudtrailEventToFacts({
      eventName: "CreateUser", awsRegion: "us-east-1",
      userIdentity: { userName: "admin", accountId: "123456789012" },
      sourceIPAddress: "198.51.100.1",
      requestParameters: { userName: "new-backdoor" },
    }), "security");

    await test("workspace_suspicious_login", workspaceEventToFacts({
      type: "SUSPICIOUS_LOGIN", applicationName: "login",
      actor: { email: "user@company.com" }, ipAddress: "195.0.0.1",
      parameters: [{ name: "USER_EMAIL", value: "user@company.com" }],
    }), "security");

    await test("stripe_tos_diff", diffToFacts({
      vendor_slug: "stripe", title: "Stripe Services Agreement Updated",
      description: "Section 3.5 on liability limitation modified. Arbitration clause updated to require opt-out within 30 days.",
      source_url: "https://stripe.com/legal/ssa",
      risk_category: "legal", detection_method: "tos_diff",
      lines_added: 18, lines_removed: 7,
    }), "legal", "tos_diff");

    await test("pricing_page_diff", diffToFacts({
      vendor_slug: "stripe", title: "Stripe Pricing Page Updated",
      description: "Annual plan pricing updated: Starter from $29 to $39/mo, Professional from $79 to $99/mo.",
      source_url: "https://stripe.com/pricing",
      risk_category: "pricing", detection_method: "pricing_page_diff",
      lines_added: 6, lines_removed: 4,
    }), "pricing", "pricing_page_diff");

    await test("aws_security_generic", {
      vendor_slug: "aws", event_name: "PutBucketPolicy",
      source: "cloudtrail", aws_event_name: "PutBucketPolicy",
      aws_user_name: "devops-bot", aws_account_id: "123456789012", aws_region: "eu-west-1",
      bucket_name: "prod-customer-data",
    }, "security", "cloudtrail_event");

    return NextResponse.json({ ok: true, samples, count: Object.keys(samples).length });
  }

  return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    facts?: RawFacts;
    source?: string;
    payload?: Record<string, unknown>;
    category?: string;
    detection_method?: string;
    org_id?: string;
  };

  let facts: RawFacts = body.facts ?? {};

  // Auto-convert if payload is a Stripe/CloudTrail/Workspace event
  if (body.source === "stripe" && body.payload) {
    facts = { ...stripeEventToFacts(body.payload), ...facts };
  } else if (body.source === "cloudtrail" && body.payload) {
    facts = { ...cloudtrailEventToFacts(body.payload), ...facts };
  } else if (body.source === "workspace" && body.payload) {
    facts = { ...workspaceEventToFacts(body.payload), ...facts };
  }

  const t0 = Date.now();
  const result = await summarize(facts, {
    orgId: body.org_id,
    riskCategory: body.category,
    detectionMethod: body.detection_method,
    allowLLM: !!body.org_id,
  });
  const latencyMs = Date.now() - t0;

  return NextResponse.json({
    ok: true,
    latencyMs,
    title: result.title,
    summary: result.summary,
    impact: result.impact,
    action: result.action,
    method: result.method,
    templateKey: result.templateKey,
    llmModel: result.llmModel ?? null,
    tokensUsed: result.tokensUsed ?? 0,
    rawFacts: result.rawFacts,
  });
}
