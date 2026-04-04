// Weekly brief email composer via agentmail

const AGENTMAIL_INBOX = "scide-founder@agentmail.to";
const AGENTMAIL_BASE = "https://api.agentmail.to/v0";

const RISK_EMOJI: Record<string, string> = { high: "🔴", medium: "🟡", low: "🟢" };
const CAT_EMOJI: Record<string, string> = {
  pricing: "💰", legal: "⚖️", operational: "🔧", security: "🔒", vendor_risk: "🏢",
};

interface Alert {
  id: string;
  vendor_slug: string;
  risk_level: string;
  risk_category: string;
  title: string;
  summary?: string;
  source_url?: string;
  created_at: string;
}

export function buildWeeklyBriefHtml(opts: {
  orgName: string;
  orgSlug: string;
  magicToken: string;
  weekOf: string;
  alerts: Alert[];
  baseUrl?: string;
}): string {
  const { orgName, orgSlug, magicToken, weekOf, alerts, baseUrl = "https://change-risk-radar.vercel.app" } = opts;
  const dashUrl = `${baseUrl}/dashboard/${orgSlug}?token=${magicToken}`;

  const high = alerts.filter(a => a.risk_level === "high");
  const medium = alerts.filter(a => a.risk_level === "medium");
  const low = alerts.filter(a => a.risk_level === "low");

  const alertRows = alerts.slice(0, 10).map(a => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 10px 8px; white-space: nowrap;">
        <span style="display:inline-block; padding:2px 8px; border-radius:9999px; font-size:11px; font-weight:700;
          background:${a.risk_level==='high'?'#fee2e2':a.risk_level==='medium'?'#fef3c7':'#d1fae5'};
          color:${a.risk_level==='high'?'#991b1b':a.risk_level==='medium'?'#92400e':'#065f46'}">
          ${RISK_EMOJI[a.risk_level] ?? ''} ${a.risk_level.toUpperCase()}
        </span>
      </td>
      <td style="padding: 10px 8px; font-size:12px; color:#6b7280;">${CAT_EMOJI[a.risk_category] ?? '📊'} ${a.risk_category}</td>
      <td style="padding: 10px 8px; font-size:13px; color:#111827; font-weight:600;">${a.vendor_slug}</td>
      <td style="padding: 10px 8px; font-size:13px; color:#374151;">${a.title}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#f9fafb; margin:0; padding:0;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:32px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff; border-radius:12px; border:1px solid #e5e7eb; overflow:hidden;">
      
      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#1e1b4b,#312e81); padding:28px 32px;">
        <div style="font-size:20px; font-weight:800; color:#fff;">📡 Change Risk Radar</div>
        <div style="font-size:13px; color:#a5b4fc; margin-top:4px;">Weekly Brief · Week of ${weekOf}</div>
        <div style="font-size:15px; color:#e0e7ff; margin-top:8px; font-weight:600;">${orgName}</div>
      </td></tr>

      <!-- Stats row -->
      <tr><td style="padding:20px 32px; background:#f8fafc; border-bottom:1px solid #e5e7eb;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            ${[
              { label: "Total Alerts", value: alerts.length, color: "#6366f1" },
              { label: "🔴 High Risk", value: high.length, color: "#ef4444" },
              { label: "🟡 Medium", value: medium.length, color: "#f59e0b" },
              { label: "🟢 Low", value: low.length, color: "#10b981" },
            ].map(s => `<td align="center" style="width:25%">
              <div style="font-size:24px; font-weight:800; color:${s.color}">${s.value}</div>
              <div style="font-size:11px; color:#6b7280; margin-top:2px">${s.label}</div>
            </td>`).join("")}
          </tr>
        </table>
      </td></tr>

      <!-- Alert list -->
      <tr><td style="padding:24px 32px;">
        <div style="font-size:15px; font-weight:700; color:#111827; margin-bottom:12px;">
          This Week's Alerts ${alerts.length > 10 ? `(showing top 10 of ${alerts.length})` : ""}
        </div>
        ${alerts.length === 0 ? `<p style="color:#6b7280; font-size:14px;">No alerts this week — your vendors were quiet.</p>` : `
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; font-size:13px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:8px; text-align:left; font-size:11px; color:#6b7280; font-weight:600;">RISK</th>
              <th style="padding:8px; text-align:left; font-size:11px; color:#6b7280; font-weight:600;">CATEGORY</th>
              <th style="padding:8px; text-align:left; font-size:11px; color:#6b7280; font-weight:600;">VENDOR</th>
              <th style="padding:8px; text-align:left; font-size:11px; color:#6b7280; font-weight:600;">CHANGE</th>
            </tr>
          </thead>
          <tbody>${alertRows}</tbody>
        </table>`}
        
        <div style="margin-top:20px; text-align:center;">
          <a href="${dashUrl}" style="display:inline-block; background:#4f46e5; color:#fff; text-decoration:none;
            padding:12px 28px; border-radius:8px; font-weight:700; font-size:14px;">
            View Full Dashboard →
          </a>
        </div>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:20px 32px; background:#f8fafc; border-top:1px solid #e5e7eb;">
        <p style="font-size:12px; color:#9ca3af; margin:0;">
          Change Risk Radar · Early Access · 
          <a href="${baseUrl}/unsubscribe?token=${magicToken}" style="color:#9ca3af">Unsubscribe</a> · 
          All deposits 100% refundable
        </p>
        <p style="font-size:11px; color:#d1d5db; margin:4px 0 0;">
          You're receiving this because you signed up for early access. 
          Reply to this email with questions.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export async function sendWeeklyBrief(opts: {
  to: string;
  orgName: string;
  orgSlug: string;
  magicToken: string;
  weekOf: string;
  alerts: Alert[];
}): Promise<{ success: boolean; error?: string }> {
  const html = buildWeeklyBriefHtml(opts);
  const subject = `[Change Risk Radar] ${opts.alerts.length} alert${opts.alerts.length !== 1 ? "s" : ""} — Week of ${opts.weekOf}`;

  const apiKey = process.env.AGENTMAIL_API_KEY;
  if (!apiKey) return { success: false, error: "AGENTMAIL_API_KEY not set" };

  try {
    const res = await fetch(`${AGENTMAIL_BASE}/inboxes/${AGENTMAIL_INBOX}/messages/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        to: [opts.to],
        subject,
        html,
        text: `Change Risk Radar — Week of ${opts.weekOf}\n\n${opts.alerts.length} alert(s) for ${opts.orgName}.\n\nView at: https://change-risk-radar.vercel.app/dashboard/${opts.orgSlug}?token=${opts.magicToken}`,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: JSON.stringify(data) };
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function sendWelcomeEmail(opts: {
  to: string;
  orgName: string;
  orgSlug: string;
  magicToken: string;
  connectorTypes: string[];
}): Promise<{ success: boolean; error?: string }> {
  const dashUrl = `https://change-risk-radar.vercel.app/dashboard/${opts.orgSlug}?token=${opts.magicToken}`;
  const html = `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#f9fafb; padding:32px; margin:0;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff; border-radius:12px; border:1px solid #e5e7eb; padding:32px; margin:0 auto;">
  <tr><td>
    <div style="font-size:24px; font-weight:800; color:#312e81;">📡 Welcome to Change Risk Radar</div>
    <p style="color:#374151; font-size:15px;">Hi ${opts.orgName},</p>
    <p style="color:#374151; font-size:14px;">Your early access account is live. We've connected your vendors and are already scanning for changes that could impact your business.</p>
    
    <div style="background:#f0f0ff; border-radius:8px; padding:16px; margin:20px 0;">
      <div style="font-weight:700; color:#312e81; margin-bottom:8px;">Your Connected Detectors:</div>
      ${opts.connectorTypes.map(t => `<div style="color:#4f46e5; font-size:14px;">✓ ${t === "workspace" ? "Google Workspace" : t === "stripe" ? "Stripe" : t === "tos_url" ? "Custom Policy URLs" : t}</div>`).join("")}
    </div>
    
    <a href="${dashUrl}" style="display:inline-block; background:#4f46e5; color:#fff; text-decoration:none; padding:14px 32px; border-radius:8px; font-weight:700; font-size:15px; margin:16px 0;">
      Open Your Dashboard →
    </a>
    
    <p style="color:#6b7280; font-size:13px;">Bookmark that link — it's your personal dashboard URL. You'll also receive a weekly brief every Monday morning.</p>
    <p style="color:#6b7280; font-size:13px;">Questions? Just reply to this email.</p>
    <p style="color:#9ca3af; font-size:12px; margin-top:24px; border-top:1px solid #e5e7eb; padding-top:16px;">Change Risk Radar · Early Access · All deposits 100% refundable</p>
  </td></tr>
</table>
</body>
</html>`;

  const apiKey = process.env.AGENTMAIL_API_KEY;
  if (!apiKey) return { success: false, error: "AGENTMAIL_API_KEY not set" };

  try {
    const res = await fetch(`${AGENTMAIL_BASE}/inboxes/${AGENTMAIL_INBOX}/messages/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        to: [opts.to],
        subject: "🎉 Your Change Risk Radar early access is live",
        html,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: JSON.stringify(data) };
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
