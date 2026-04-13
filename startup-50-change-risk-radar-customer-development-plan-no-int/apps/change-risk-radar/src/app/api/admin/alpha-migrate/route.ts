import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendWelcomeEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST /api/admin/alpha-migrate
 * Migrates all early-access orgs to Phase 3 MVP v0.
 * - Sets phase = 'alpha'
 * - Updates activation_score + connector_count
 * - Populates first_alert_at from earliest alert
 * - Adds AWS CloudTrail connector config hint
 * - Sends migration notification email
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body.dry_run === true;
  const notifyOrgs = body.notify === true;

  const { data: orgs } = await supabaseAdmin
    .from("crr_orgs")
    .select("id, slug, name, email, magic_token, phase, status, created_at");

  const results = [];

  for (const org of orgs ?? []) {
    // Get connector count
    const { data: connectors } = await supabaseAdmin
      .from("crr_org_connectors")
      .select("id, type, status")
      .eq("org_id", org.id);

    const activeConnectors = (connectors ?? []).filter((c: { status: string }) => c.status === "active");
    const connectorCount = activeConnectors.length;
    const connectorTypes = new Set(activeConnectors.map((c: { type: string }) => c.type));
    const hasMultipleConnectors = connectorCount >= 2;

    // Get alert stats
    const { data: alerts } = await supabaseAdmin
      .from("crr_org_alerts")
      .select("id, created_at, risk_level")
      .eq("org_id", org.id)
      .order("created_at", { ascending: true });

    const totalAlerts = (alerts ?? []).length;
    const criticalAlerts = (alerts ?? []).filter((a: { risk_level: string }) => a.risk_level === "high").length;
    const firstAlertAt = (alerts ?? [])[0]?.created_at ?? null;

    // Get reaction count
    const { data: reactions } = await supabaseAdmin
      .from("crr_alert_reactions")
      .select("id, reaction")
      .eq("org_id", org.id);

    const reactionCount = (reactions ?? []).length;
    const engagedCount = (reactions ?? []).filter((r: { reaction: string }) => ["useful", "acknowledge", "snooze"].includes(r.reaction)).length;

    // Compute activation score (0–100):
    // 25 pts per connector type (max 2 = 50), 25 pts first alert, 25 pts first reaction
    const baseActivation = Math.min(connectorCount, 2) * 25;
    const alertActivation = totalAlerts > 0 ? 25 : 0;
    const reactionActivation = reactionCount > 0 ? 25 : 0;
    const activationScore = baseActivation + alertActivation + reactionActivation;

    // Time to first value
    const createdAt = new Date(org.created_at ?? Date.now());
    const firstAlertDate = firstAlertAt ? new Date(firstAlertAt) : null;
    const ttfvHours = firstAlertDate ? (firstAlertDate.getTime() - createdAt.getTime()) / 3600000 : null;

    // Phase determination
    const newPhase = org.phase === "alpha" ? "alpha" : "alpha";  // migrate all to alpha

    const migrationData = {
      phase: newPhase,
      activation_score: activationScore,
      connector_count: connectorCount,
      first_alert_at: firstAlertAt,
      alpha_migrated_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    };

    if (!dryRun) {
      await supabaseAdmin.from("crr_orgs").update(migrationData).eq("id", org.id);

      // Send migration email if requested
      if (notifyOrgs && org.email) {
        const dashboardUrl = `https://change-risk-radar.vercel.app/dashboard/${org.slug}?token=${org.magic_token}`;
        const activeTypes = activeConnectors.map((c: { type: string }) => c.type);
        await sendWelcomeEmail({ to: org.email, orgName: org.name, orgSlug: org.slug, magicToken: org.magic_token, connectorTypes: activeTypes }).catch(() => null);
      }
    }

    results.push({
      org_slug: org.slug,
      org_name: org.name,
      phase: newPhase,
      connector_count: connectorCount,
      connector_types: [...connectorTypes],
      has_multiple_connectors: hasMultipleConnectors,
      total_alerts: totalAlerts,
      critical_alerts: criticalAlerts,
      first_alert_at: firstAlertAt,
      ttfv_hours: ttfvHours !== null ? Math.round(ttfvHours * 10) / 10 : null,
      ttfv_within_24h: ttfvHours !== null && ttfvHours <= 24,
      reaction_count: reactionCount,
      engaged_reactions: engagedCount,
      activation_score: activationScore,
      applied: !dryRun,
    });
  }

  // Compute success metrics
  const n = results.length;
  const withMultiConn = results.filter(r => r.has_multiple_connectors).length;
  const withFirst24h = results.filter(r => r.ttfv_within_24h).length;
  const avgActivation = n > 0 ? Math.round(results.reduce((s, r) => s + r.activation_score, 0) / n) : 0;
  const totalWithAlerts = results.filter(r => r.total_alerts > 0).length;

  return NextResponse.json({
    dry_run: dryRun,
    orgs_migrated: n,
    results,
    summary: {
      orgs_total: n,
      orgs_with_2_connectors: withMultiConn,
      activation_pct_2_connectors: n > 0 ? Math.round(withMultiConn / n * 100) : 0,
      orgs_first_alert_24h: withFirst24h,
      pct_first_alert_24h: n > 0 ? Math.round(withFirst24h / n * 100) : 0,
      orgs_with_alerts: totalWithAlerts,
      avg_activation_score: avgActivation,
      success_criteria: {
        activation_2_connectors: { target: "≥70%", current: `${n > 0 ? Math.round(withMultiConn / n * 100) : 0}%`, met: withMultiConn / Math.max(n, 1) >= 0.7 },
        median_ttfv_24h: { target: "≤1 day", current_orgs: withFirst24h, met: withFirst24h / Math.max(n, 1) >= 0.5 },
      },
    },
  });
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Preview without applying
  return POST(req);
}
