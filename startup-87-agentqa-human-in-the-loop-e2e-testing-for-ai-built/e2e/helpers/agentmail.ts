const AGENTMAIL_API = 'https://api.agentmail.to/v0';

interface EmailMessage {
  id: string;
  subject?: string;
  body_text?: string;
  body_html?: string;
  from?: string;
  to?: string;
  received_at?: string;
}

/**
 * Poll an AgentMail inbox until an email arrives.
 * Returns the first matching email, or throws after timeout.
 */
export async function waitForEmail(
  inbox: string,
  apiKey: string,
  opts: { timeout?: number; subject?: string } = {}
): Promise<EmailMessage> {
  const timeout = opts.timeout || 30000;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const res = await fetch(`${AGENTMAIL_API}/inboxes/${inbox}/messages`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json();
    const messages: EmailMessage[] = data.messages || [];

    if (messages.length > 0) {
      const match = opts.subject
        ? messages.find((m) => m.subject?.includes(opts.subject!))
        : messages[0];
      if (match) return match;
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error(`No email received at ${inbox} within ${timeout}ms`);
}

/**
 * Wait for a confirmation/verification email and extract the confirmation link.
 */
export async function getConfirmationLink(
  inbox: string,
  apiKey: string
): Promise<string> {
  const email = await waitForEmail(inbox, apiKey, { subject: 'Confirm' });
  const body = email.body_text || email.body_html || '';
  const match = body.match(/https?:\/\/[^\s"<]+confirm[^\s"<]*/i);
  if (!match) throw new Error('No confirmation link found in email');
  return match[0];
}

/**
 * Create a new AgentMail inbox for testing.
 * Returns the inbox address.
 */
export async function createTestInbox(
  address: string,
  apiKey: string
): Promise<string> {
  const res = await fetch(`${AGENTMAIL_API}/inboxes`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ address }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create inbox ${address}: ${err}`);
  }

  return address;
}
