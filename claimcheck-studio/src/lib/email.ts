/**
 * Email alerting via AgentMail API.
 * Only sends if AGENTMAIL_API_KEY and TEAM_ALERT_EMAIL are set.
 */

const FROM_INBOX = "plainsociety456@agentmail.to";

export async function sendAlertEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  if (!apiKey) {
    console.warn("[email] AGENTMAIL_API_KEY not set — skipping alert");
    return;
  }

  const res = await fetch(
    `https://api.agentmail.to/v0/inboxes/${FROM_INBOX}/messages/send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("[email] Failed to send alert:", res.status, err);
  }
}
