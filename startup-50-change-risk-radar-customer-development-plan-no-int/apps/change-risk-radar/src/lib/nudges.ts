/**
 * nudges.ts — Automated trial nudge email sequences
 *
 * 7-email sequence tied to trial day and activation state:
 *
 *   day0_welcome     Immediately on signup
 *   day1_connect     Day 1 if no connector added yet
 *   day3_progress    Day 3 — recap of what was caught (or "here's what you're missing")
 *   day7_halfway     Day 7 — midpoint check-in with trial stats
 *   day10_nudge      Day 10 if not yet activated (< 2 connectors)
 *   day11_expiry     Day 11 — 3-day warning, upgrade CTA
 *   day14_last       Day 14 — final day, strong CTA
 *
 * Dedup: crr_nudge_log UNIQUE (org_id, nudge_type) prevents re-sends.
 */

import { supabaseAdmin } from "@/lib/supabase";

export type NudgeType =
  | "day0_welcome"
  | "day1_connect"
  | "day3_progress"
  | "day7_halfway"
  | "day10_nudge"
  | "day11_expiry"
  | "day14_last";

export interface NudgeContext {
  org_id: string;
  org_name: string;
  email: string;
  org_slug: string;
  magic_token: string;
  trial_day: number;
  days_left: number;
  connector_count: number;
  alert_count: number;
  reaction_count: number;
  activation_score: number;
  plan_id: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://change-risk-radar.vercel.app";
const FROM_EMAIL = "scide-founder@agentmail.to";
const FROM_NAME = "Erlis at Change Risk Radar";

// ─── Nudge Eligibility Rules ──────────────────────────────────────────────────

export function getNudgesEligible(ctx: NudgeContext): NudgeType[] {
  const eligible: NudgeType[] = [];
  const { trial_day, connector_count, activation_score } = ctx;

  // day0: always send on signup (day 0)
  if (trial_day === 0) eligible.push("day0_welcome");

  // day1: no connector by end of day 1
  if (trial_day >= 1 && connector_count === 0) eligible.push("day1_connect");

  // day3: always (different content based on activation)
  if (trial_day >= 3) eligible.push("day3_progress");

  // day7: halfway check-in
  if (trial_day >= 7) eligible.push("day7_halfway");

  // day10: if still not activated
  if (trial_day >= 10 && activation_score < 75) eligible.push("day10_nudge");

  // day11: 3-day warning (everyone)
  if (trial_day >= 11) eligible.push("day11_expiry");

  // day14: final day
  if (trial_day >= 14) eligible.push("day14_last");

  return eligible;
}

// ─── Email Template Builders ──────────────────────────────────────────────────

function dashboardUrl(ctx: NudgeContext, path = "") {
  return `${APP_URL}/dashboard/${ctx.org_slug}${path}?token=${ctx.magic_token}`;
}

export function buildNudgeEmail(type: NudgeType, ctx: NudgeContext): {
  subject: string;
  html: string;
  text: string;
} {
  const dash = dashboardUrl(ctx);
  const connect = dashboardUrl(ctx, "/connect");
  const billing = dashboardUrl(ctx, "/billing");
  const pricing = `${APP_URL}/pricing`;

  switch (type) {
    case "day0_welcome":
      return {
        subject: `Welcome to Change Risk Radar — here's how to get your first alert in 5 minutes`,
        text: `Hi there,

Thanks for signing up for Change Risk Radar. Your 14-day free trial starts now.

Here's how to get your first risk alert in under 5 minutes:

1. Add your first connector (Stripe, AWS, or Google Workspace):
   ${connect}

2. We'll monitor it in real-time and send you an alert the moment something changes.

3. Each alert includes:
   - What changed and why it matters
   - Specific action steps for your team
   - Risk level (Critical / High / Medium / Low)

Your dashboard: ${dash}

Questions? Just reply to this email.

— Erlis
Change Risk Radar`,
        html: buildEmailHtml({
          preheader: "Your 14-day trial starts now — first alert in 5 minutes",
          headline: `Welcome to Change Risk Radar 📡`,
          body: `<p>Your 14-day free trial just started. Here's how to get your first risk alert in under 5 minutes:</p>
<ol style="color:#e2e8f0;line-height:2;font-size:15px;">
  <li><strong>Connect your first integration</strong> — Stripe, AWS, or Google Workspace</li>
  <li>We monitor it in real-time (p95 latency ≤5 minutes)</li>
  <li>You get an alert with plain-English impact + action steps</li>
</ol>`,
          cta_text: "Connect your first integration →",
          cta_url: connect,
          footer_note: `You have <strong>14 days</strong> remaining in your free trial. No credit card required to start.`,
        }),
      };

    case "day1_connect":
      return {
        subject: `You haven't connected anything yet — takes 2 minutes`,
        text: `Hi,

You signed up for Change Risk Radar yesterday but haven't connected an integration yet.

It takes 2 minutes:
- Stripe: paste a read-only API key
- AWS: create a cross-account IAM role (we give you the exact policy)
- Google Workspace: OAuth in 3 clicks

Once connected, we'll detect changes within 5 minutes.

Connect now: ${connect}

If you're stuck on setup, just reply to this email.

— Erlis`,
        html: buildEmailHtml({
          preheader: "Connect your first integration in 2 minutes",
          headline: "You're one step away from your first alert",
          body: `<p>You signed up yesterday but haven't connected an integration yet. Takes 2 minutes — choose one to start:</p>
<table style="width:100%;border-collapse:collapse;margin:20px 0;">
  ${["💳 Stripe — paste a read-only API key", "☁️ AWS CloudTrail — cross-account IAM role", "🔵 Google Workspace — OAuth in 3 clicks", "🛍️ Shopify — Admin API token", "☁️ Salesforce — Connected App OAuth"].map(i => `<tr><td style="padding:8px 0;color:#e2e8f0;font-size:14px;">✓ ${i}</td></tr>`).join("")}
</table>`,
          cta_text: "Connect now →",
          cta_url: connect,
          footer_note: "13 days remaining in your free trial.",
        }),
      };

    case "day3_progress": {
      const hasAlerts = ctx.alert_count > 0;
      return {
        subject: hasAlerts
          ? `You've caught ${ctx.alert_count} vendor change${ctx.alert_count !== 1 ? "s" : ""} so far`
          : `Here's what you're missing without active monitoring`,
        text: hasAlerts
          ? `Hi,\n\nYou're 3 days into your trial and Change Risk Radar has already detected ${ctx.alert_count} change${ctx.alert_count !== 1 ? "s" : ""} across your vendor stack.\n\nView your alerts: ${dash}\n\nEach alert includes the specific impact to your business and the exact action to take.\n\n— Erlis`
          : `Hi,\n\nYou're 3 days into your trial but haven't connected an integration yet. While you're reading this, Stripe, AWS, and Workspace are making changes that could affect your billing, API integrations, or security posture — silently.\n\nConnect your first integration: ${connect}\n\n— Erlis`,
        html: buildEmailHtml({
          preheader: hasAlerts ? `${ctx.alert_count} changes caught so far` : "You're missing real-time vendor intelligence",
          headline: hasAlerts ? `${ctx.alert_count} change${ctx.alert_count !== 1 ? "s" : ""} caught so far 🎯` : "Here's what you're missing",
          body: hasAlerts
            ? `<p>You're 3 days into your trial. Change Risk Radar has detected <strong>${ctx.alert_count} vendor change${ctx.alert_count !== 1 ? "s" : ""}</strong> that could affect ${ctx.org_name}.</p>
<p style="color:#94a3b8;">Each alert includes: what changed, why it matters for your business, and the exact action to take. No noise — just signal.</p>`
            : `<p>You're 3 days into your trial but haven't connected an integration yet.</p>
<p>While you're reading this, vendors are making changes that affect your billing, security, and API integrations — silently. The average company discovers critical vendor changes <strong>days or weeks late</strong>.</p>`,
          cta_text: hasAlerts ? "View your alerts →" : "Connect now — takes 2 min →",
          cta_url: hasAlerts ? dash : connect,
          footer_note: `${14 - ctx.trial_day} days remaining in your trial.`,
        }),
      };
    }

    case "day7_halfway":
      return {
        subject: `Halfway through your trial — here's your risk summary`,
        text: `Hi,

You're halfway through your 14-day trial. Here's where things stand for ${ctx.org_name}:

- Connectors active: ${ctx.connector_count}
- Changes detected: ${ctx.alert_count}
- Alerts acted on: ${ctx.reaction_count}
- Activation score: ${ctx.activation_score}/100

${ctx.alert_count > 0 ? `You've already caught ${ctx.alert_count} changes your team would otherwise have missed.` : "You haven't connected an integration yet — you have 7 days left."}

View your dashboard: ${dash}
Upgrade to keep monitoring: ${billing}

— Erlis`,
        html: buildEmailHtml({
          preheader: "7 days in — here's your risk summary",
          headline: "You're halfway through your trial",
          body: `<p>Here's where things stand for <strong>${ctx.org_name}</strong> after 7 days:</p>
<table style="width:100%;border-collapse:collapse;margin:20px 0;">
  ${[
    ["Connectors active", ctx.connector_count.toString()],
    ["Vendor changes detected", ctx.alert_count.toString()],
    ["Alerts acted on", ctx.reaction_count.toString()],
    ["Activation score", `${ctx.activation_score}/100`],
  ].map(([k, v]) => `<tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">${k}</td><td style="padding:8px 0;color:#e2e8f0;font-weight:700;font-size:14px;text-align:right;">${v}</td></tr>`).join("")}
</table>
${ctx.alert_count > 0 ? `<p style="color:#10b981;">You've already caught ${ctx.alert_count} vendor change${ctx.alert_count !== 1 ? "s" : ""} your team would otherwise have missed.</p>` : `<p style="color:#f59e0b;">You haven't connected an integration yet — you have 7 days left to try it.</p>`}`,
          cta_text: "View dashboard →",
          cta_url: dash,
          footer_note: `<strong>7 days remaining</strong> in your trial. <a href="${billing}" style="color:#6366f1;">Upgrade before it expires</a>.`,
        }),
      };

    case "day10_nudge":
      return {
        subject: `3 days left and you haven't fully activated — can I help?`,
        text: `Hi,

Your trial ends in 4 days and your activation score is ${ctx.activation_score}/100.

If you're stuck on setup or evaluating whether this fits your stack, I'm happy to do a 15-min async walkthrough via Loom.

Just reply to this email and tell me:
1. Which vendors you're most worried about (Stripe, AWS, Workspace, Shopify, Salesforce)
2. What kind of changes keep you up at night (pricing, API deprecations, security, compliance)

I'll send you a custom setup guide for your stack.

Or just connect now: ${connect}

— Erlis`,
        html: buildEmailHtml({
          preheader: "4 days left — can I help you get set up?",
          headline: "Can I help you get set up?",
          body: `<p>Your trial ends in 4 days and your activation score is <strong>${ctx.activation_score}/100</strong>.</p>
<p>If you're evaluating whether this fits your stack, just reply to this email with:</p>
<ol style="color:#e2e8f0;line-height:2;">
  <li>Which vendors you're most worried about</li>
  <li>What kind of changes you need to catch (pricing, API, security, compliance)</li>
</ol>
<p>I'll send you a custom setup guide within a few hours.</p>`,
          cta_text: "Or connect now →",
          cta_url: connect,
          footer_note: "4 days remaining in your trial.",
        }),
      };

    case "day11_expiry":
      return {
        subject: `⏰ 3 days left — lock in your rate before trial ends`,
        text: `Hi,

Your trial ends in 3 days. Here's what happens when it expires:
- Your connector checks pause
- New alerts stop coming in
- Your alert history is kept for 30 days
- You can reactivate anytime

Lock in your rate now:
- Starter: $500/month (2 connectors, 500 alerts/mo) → ${billing}
- Growth: $1,500/month (5 connectors, 2,000 alerts/mo) → ${billing}
- Quarterly billing saves 10% — annual saves 20%

Don't want to upgrade yet? Just let the trial expire and come back anytime.

— Erlis`,
        html: buildEmailHtml({
          preheader: "3 days left — lock in your monitoring rate",
          headline: "⏰ 3 days left in your trial",
          body: `<p>Your trial ends in <strong>3 days</strong>. After expiry, connector checks pause — but you can reactivate anytime.</p>
<p><strong>Lock in your rate:</strong></p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:10px;background:rgba(99,102,241,0.1);border-radius:8px;color:#e2e8f0;">
    <strong style="color:#a5b4fc;">Starter</strong> — $500/mo<br/>
    <span style="font-size:13px;color:#94a3b8;">2 connectors · 500 alerts/mo</span>
  </td></tr>
  <tr><td style="padding:4px;"></td></tr>
  <tr><td style="padding:10px;background:rgba(99,102,241,0.15);border-radius:8px;color:#e2e8f0;border:1px solid rgba(99,102,241,0.3);">
    <strong style="color:#a5b4fc;">Growth</strong> — $1,500/mo <span style="font-size:12px;color:#10b981;">(most popular)</span><br/>
    <span style="font-size:13px;color:#94a3b8;">5 connectors · 2,000 alerts/mo</span>
  </td></tr>
</table>
<p style="color:#10b981;font-size:13px;">Quarterly billing = 10% off · Annual = 20% off</p>`,
          cta_text: "Upgrade now →",
          cta_url: billing,
          footer_note: "No action needed if you don't want to upgrade — your data is kept for 30 days.",
        }),
      };

    case "day14_last":
      return {
        subject: `Your Change Risk Radar trial ends today`,
        text: `Hi,

Your 14-day free trial ends today.

If you want to keep monitoring your vendor stack, upgrade now:
${billing}

What you'll lose access to today if you don't upgrade:
- Real-time connector checks
- New alert detection
- Weekly risk briefs

Your data (${ctx.alert_count} alerts, connector history) is kept for 30 days. You can reactivate anytime.

If this wasn't the right time, I'd appreciate 30 seconds of feedback: what would have made you upgrade? Just reply.

— Erlis`,
        html: buildEmailHtml({
          preheader: "Your trial ends today — upgrade or your data is kept 30 days",
          headline: "Your trial ends today",
          body: `<p>Your 14-day free trial ends today. After today:</p>
<ul style="color:#e2e8f0;line-height:2;">
  <li>Real-time connector checks pause</li>
  <li>New alert detection stops</li>
  <li>Your <strong>${ctx.alert_count} alerts</strong> are kept for 30 days</li>
  <li>You can reactivate anytime</li>
</ul>
<p style="color:#94a3b8;font-size:13px;">If this wasn't the right time, I'd appreciate a quick reply about what would have made you upgrade.</p>`,
          cta_text: "Upgrade and keep monitoring →",
          cta_url: billing,
          footer_note: `<a href="${pricing}" style="color:#6366f1;">View pricing</a> · Starter $500/mo · Growth $1,500/mo`,
        }),
      };
  }
}

// ─── HTML Email Builder ───────────────────────────────────────────────────────

function buildEmailHtml(opts: {
  preheader: string;
  headline: string;
  body: string;
  cta_text: string;
  cta_url: string;
  footer_note?: string;
}): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Change Risk Radar</title></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">${opts.preheader}</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
<tr><td>
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#1e293b;border-radius:12px;border:1px solid #334155;overflow:hidden;">
  <!-- Header -->
  <tr><td style="padding:24px 32px 20px;border-bottom:1px solid #334155;">
    <span style="font-size:18px;font-weight:900;color:#e2e8f0;">📡 Change Risk Radar</span>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:32px;">
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#f1f5f9;line-height:1.3;">${opts.headline}</h1>
    <div style="color:#cbd5e1;font-size:15px;line-height:1.7;">${opts.body}</div>
    <div style="margin:28px 0;">
      <a href="${opts.cta_url}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:15px;">${opts.cta_text}</a>
    </div>
    ${opts.footer_note ? `<p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">${opts.footer_note}</p>` : ""}
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding:16px 32px;border-top:1px solid #334155;">
    <p style="margin:0;font-size:12px;color:#475569;">
      Change Risk Radar · <a href="${APP_URL}" style="color:#6366f1;text-decoration:none;">change-risk-radar.vercel.app</a><br>
      Questions? Reply to this email or contact <a href="mailto:support@change-risk-radar.com" style="color:#6366f1;">support@change-risk-radar.com</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// ─── Send Nudge ───────────────────────────────────────────────────────────────

export async function sendNudge(
  orgId: string,
  nudgeType: NudgeType,
  ctx: NudgeContext
): Promise<{ ok: boolean; error?: string }> {
  // Check if already sent
  const { data: existing } = await supabaseAdmin
    .from("crr_nudge_log")
    .select("id")
    .eq("org_id", orgId)
    .eq("nudge_type", nudgeType)
    .single();

  if (existing) return { ok: true }; // already sent, skip

  const { subject, text } = buildNudgeEmail(nudgeType, ctx);

  try {
    const res = await fetch(`https://api.agentmail.to/v0/inboxes/${FROM_EMAIL}/messages/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.AGENTMAIL_API_KEY}`,
      },
      body: JSON.stringify({
        to: [ctx.email],
        subject,
        text,
        from_name: FROM_NAME,
      }),
    });

    const delivered = res.ok;
    const errText = delivered ? undefined : await res.text().catch(() => `HTTP ${res.status}`);

    // Log the send
    await supabaseAdmin.from("crr_nudge_log").insert({
      org_id: orgId,
      nudge_type: nudgeType,
      trial_day: ctx.trial_day,
      recipient: ctx.email,
      subject,
      delivered,
      error: errText ?? null,
    });

    return { ok: delivered, error: errText };
  } catch (err) {
    const errMsg = String(err);
    await supabaseAdmin.from("crr_nudge_log").insert({
      org_id: orgId,
      nudge_type: nudgeType,
      trial_day: ctx.trial_day,
      recipient: ctx.email,
      subject,
      delivered: false,
      error: errMsg,
    });
    return { ok: false, error: errMsg };
  }
}

// ─── Sweep — run all eligible nudges for all trialing orgs ───────────────────

export async function sweepNudges(): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  errors: string[];
}> {
  // Load all trialing orgs + their stats
  const { data: trialing } = await supabaseAdmin
    .from("crr_orgs")
    .select("id, slug, name, email, magic_token, activation_score, connector_count, first_alert_at, billing_plan, trial_started_at, trial_ends_at")
    .not("trial_started_at", "is", null);

  if (!trialing?.length) return { processed: 0, sent: 0, skipped: 0, errors: [] };

  let sent = 0, skipped = 0;
  const errors: string[] = [];

  for (const org of trialing) {
    // Skip paid orgs
    const { data: sub } = await supabaseAdmin
      .from("crr_subscriptions")
      .select("status, plan_id")
      .eq("org_id", org.id)
      .single();

    if (sub?.status === "active" && sub.plan_id !== "trial") {
      skipped++;
      continue;
    }

    const trialStart = new Date(org.trial_started_at!);
    const trialEnd = org.trial_ends_at ? new Date(org.trial_ends_at) : new Date(trialStart.getTime() + 14 * 86_400_000);
    const trialDay = Math.floor((Date.now() - trialStart.getTime()) / 86_400_000);
    const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86_400_000));

    // Get alert + reaction counts
    const [{ count: alertCount }, { count: reactionCount }] = await Promise.all([
      supabaseAdmin.from("crr_org_alerts").select("id", { count: "exact", head: true }).eq("org_id", org.id),
      supabaseAdmin.from("crr_alert_reactions").select("id", { count: "exact", head: true }).eq("org_id", org.id),
    ]);

    const ctx: NudgeContext = {
      org_id: org.id,
      org_name: org.name,
      email: org.email,
      org_slug: org.slug,
      magic_token: org.magic_token,
      trial_day: trialDay,
      days_left: daysLeft,
      connector_count: org.connector_count ?? 0,
      alert_count: alertCount ?? 0,
      reaction_count: reactionCount ?? 0,
      activation_score: org.activation_score ?? 0,
      plan_id: sub?.plan_id ?? "trial",
    };

    const eligible = getNudgesEligible(ctx);

    for (const nudgeType of eligible) {
      const result = await sendNudge(org.id, nudgeType, ctx);
      if (result.ok) {
        sent++;
      } else if (result.error?.includes("already sent") || !result.error) {
        skipped++;
      } else {
        errors.push(`${org.slug}:${nudgeType}: ${result.error}`);
      }
    }
  }

  return { processed: trialing.length, sent, skipped, errors };
}
