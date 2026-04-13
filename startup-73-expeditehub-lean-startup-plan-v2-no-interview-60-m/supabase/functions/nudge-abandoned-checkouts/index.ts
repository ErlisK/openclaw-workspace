/**
 * nudge-abandoned-checkouts
 *
 * Scans checkout_events for sessions that:
 *  1. Have a checkout_view event > 30 minutes ago
 *  2. Have an email address
 *  3. Have NO checkout_success event
 *  4. Have NOT already been nudged (nudge_log dedup)
 *
 * For each, sends a nudge email via AgentMail and records in nudge_log.
 *
 * Invoked by pg_cron every 15 minutes (or manually via HTTP).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AGENTMAIL_API_KEY = Deno.env.get("AGENTMAIL_API_KEY")!;
const FROM_EMAIL = "scide-founder@agentmail.to";
const LP_URL = "https://startup-73-expeditehub-lean-startup.vercel.app/lp/adu-permit-austin";
const ADMIN_ALERT_EMAIL = "scide-founder@agentmail.to";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface CheckoutView {
  session_id: string;
  email: string;
  utm_source: string | null;
  utm_campaign: string | null;
  created_at: string;
}

async function sendEmail(to: string, subject: string, text: string, html: string): Promise<string | null> {
  const res = await fetch(
    `https://api.agentmail.to/v0/inboxes/${FROM_EMAIL}/messages/send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AGENTMAIL_API_KEY}`,
      },
      body: JSON.stringify({ to, subject, text, html }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    console.error(`[email] Failed to send to ${to}: ${err}`);
    return null;
  }
  const data = await res.json();
  return data.message_id || data.id || "sent";
}

Deno.serve(async (req) => {
  // Allow both GET (pg_cron) and POST (manual trigger)
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30m ago

  // Find abandoned checkout views: have email, no success, not yet nudged
  const { data: abandoned, error } = await supabase
    .from("checkout_events")
    .select("session_id, email, utm_source, utm_campaign, created_at")
    .eq("event_type", "checkout_view")
    .not("email", "is", null)
    .lt("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[query] Error fetching abandoned:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!abandoned || abandoned.length === 0) {
    console.log("[scan] No abandoned checkouts found.");
    return new Response(JSON.stringify({ nudged: 0 }), { status: 200 });
  }

  // Filter: only sessions without a checkout_success
  const sessionIds = abandoned.map((r: CheckoutView) => r.session_id);
  const { data: successes } = await supabase
    .from("checkout_events")
    .select("session_id")
    .eq("event_type", "checkout_success")
    .in("session_id", sessionIds);

  const successSet = new Set((successes || []).map((r: { session_id: string }) => r.session_id));

  // Filter: sessions not already nudged
  const { data: alreadyNudged } = await supabase
    .from("nudge_log")
    .select("session_id")
    .in("session_id", sessionIds)
    .eq("nudge_type", "checkout_abandon_30m");

  const nudgedSet = new Set((alreadyNudged || []).map((r: { session_id: string }) => r.session_id));

  const toNudge = (abandoned as CheckoutView[]).filter(
    (r) => !successSet.has(r.session_id) && !nudgedSet.has(r.session_id)
  );

  console.log(`[scan] ${abandoned.length} views, ${successSet.size} successes, ${toNudge.length} to nudge`);

  let nudgedCount = 0;
  const nudgedEmails: string[] = [];

  for (const row of toNudge) {
    const email = row.email!;
    const minutesAgo = Math.round((Date.now() - new Date(row.created_at).getTime()) / 60000);

    const subject = "Still thinking about your ADU permit? We saved your spot.";
    const text = `Hi,

You started the process ${minutesAgo} minutes ago — we saved your spot in our Austin ADU permit queue.

Our permit experts typically save homeowners 6–8 weeks of back-and-forth with the City of Austin Development Services Department.

Lock in your spot now (beta pricing ends this week):
${LP_URL}?utm_source=email&utm_medium=nudge&utm_campaign=abandon_30m&session=${row.session_id}

Questions? Just reply to this email.

— The ExpediteHub Team`;

    const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
  <h2 style="color:#1d4ed8">Still thinking about your ADU permit?</h2>
  <p>You started the process <strong>${minutesAgo} minutes ago</strong> — we saved your spot in our Austin ADU permit queue.</p>
  <p>Our permit experts typically save homeowners <strong>6–8 weeks of back-and-forth</strong> with the City of Austin Development Services Department.</p>
  <p style="margin:24px 0">
    <a href="${LP_URL}?utm_source=email&utm_medium=nudge&utm_campaign=abandon_30m&session=${row.session_id}"
       style="background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">
      Lock In My Spot →
    </a>
  </p>
  <p style="font-size:13px;color:#666">Beta pricing ends this week. Questions? Reply to this email.</p>
  <p style="font-size:13px;color:#666">— The ExpediteHub Team</p>
</div>`;

    const msgId = await sendEmail(email, subject, text, html);
    if (msgId) {
      // Record in nudge_log
      await supabase.from("nudge_log").upsert({
        session_id: row.session_id,
        email,
        nudge_type: "checkout_abandon_30m",
        agentmail_msg_id: msgId,
      }, { onConflict: "session_id,nudge_type" });

      nudgedCount++;
      nudgedEmails.push(email);
      console.log(`[nudge] Sent to ${email} (session ${row.session_id})`);
    }
  }

  // Send admin alert if any nudges were sent
  if (nudgedCount > 0) {
    await sendEmail(
      ADMIN_ALERT_EMAIL,
      `[ExpediteHub] ${nudgedCount} abandoned checkout nudge(s) sent`,
      `Nudge emails sent to:\n${nudgedEmails.join("\n")}\n\nCheck /admin for full details.`,
      `<b>${nudgedCount} nudge email(s) sent</b><br>${nudgedEmails.map(e => `• ${e}`).join("<br>")}`
    );
  }

  return new Response(
    JSON.stringify({ nudged: nudgedCount, emails: nudgedEmails }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
