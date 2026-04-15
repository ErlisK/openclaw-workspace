import type { Metadata } from 'next'
import Link from 'next/link'

const REPO = 'https://github.com/ErlisK/openclaw-workspace/tree/main/startup-87-agentqa-human-in-the-loop-e2e-testing-for-ai-built/examples/webhook-receiver'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://startup-87-agentqa-human-in-the-loop-e2e-testing-ouwi0qsjw.vercel.app'

export const metadata: Metadata = {
  title: 'Webhook Receiver Example — AgentQA Docs',
  description: 'Minimal Express server that receives AgentQA job completion webhooks and verifies HMAC signatures.',
  alternates: { canonical: `${BASE_URL}/docs/examples/webhook-receiver` },
}

export default function WebhookReceiverPage() {
  return (
    <article data-testid="docs-examples-webhook-receiver">
      <h1>Webhook Receiver</h1>
      <p className="lead text-xl text-gray-600 mb-6">
        Instead of polling, receive a push notification when your job completes. This minimal Express
        server handles <code>job.completed</code>, <code>job.failed</code>, and <code>job.claimed</code> events.
      </p>

      <div className="not-prose flex gap-3 mb-8">
        <a
          href={REPO}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 border border-gray-300 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 font-medium"
        >
          📁 View on GitHub
        </a>
        <Link href="/docs/examples" className="inline-flex items-center gap-1.5 text-sm text-gray-500 px-4 py-2">
          ← All examples
        </Link>
      </div>

      <h2>Setup</h2>
      <div className="not-prose bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto mb-6">
        <pre>{`cd examples/webhook-receiver
npm install

export AGENTQA_WEBHOOK_SECRET="whsec_..."  # from Settings → Webhooks
node server.js
# → Listening on port 3001`}</pre>
      </div>

      <h2>Testing locally</h2>
      <div className="not-prose bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto mb-6">
        <pre>{`# Expose to the internet with ngrok
ngrok http 3001

# Copy the ngrok URL:
# e.g. https://abc123.ngrok.io/webhook
# Paste into: AgentQA Settings → Webhooks → Add endpoint`}</pre>
      </div>

      <h2>Event payload — job.completed</h2>
      <div className="not-prose bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto mb-6">
        <pre>{`{
  "type": "job.completed",
  "data": {
    "id": "job_abc123",
    "status": "complete",
    "submitted_url": "https://your-app.vercel.app",
    "tier": "standard",
    "rating": 4,
    "summary": "Signup and checkout work. Found one medium bug.",
    "bugs": [
      {
        "severity": "medium",
        "title": "Email field accepts invalid addresses",
        "steps": "1. Go /signup\\n2. Enter 'user@'\\n3. Submit",
        "expected": "Validation error",
        "actual": "Server 500"
      }
    ],
    "network_log_url": "/report/job_abc123/network",
    "console_log_url": "/report/job_abc123/console",
    "completed_at": "2025-04-15T14:32:10Z"
  }
}`}</pre>
      </div>

      <h2>Signature verification</h2>
      <p>
        Every request includes <code>X-AgentQA-Signature: sha256=&lt;hmac&gt;</code>.
        The server verifies using <code>crypto.timingSafeEqual</code> to prevent timing attacks.
      </p>
      <div className="not-prose bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto mb-6">
        <pre>{`const expected = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(rawBody)        // express.raw() required
  .digest('hex')

// timingSafeEqual prevents timing attacks
crypto.timingSafeEqual(
  Buffer.from(expected, 'hex'),
  Buffer.from(received, 'hex'),
)`}</pre>
      </div>

      <h2>Common integrations</h2>
      <div className="not-prose bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto mb-6">
        <pre>{`case 'job.completed': {
  const job = event.data

  // Slack DM
  await slack.chat.postMessage({
    channel: '#qa-alerts',
    text: \`AgentQA: \${job.bugs.length} bug(s) in \${job.submitted_url}\`,
  })

  // Jira ticket per bug
  for (const bug of job.bugs) {
    await jira.issues.createIssue({
      summary: bug.title,
      description: bug.steps,
      priority: { name: bug.severity },
    })
  }

  // GitHub commit status
  await octokit.repos.createCommitStatus({
    state: job.bugs.length === 0 ? 'success' : 'failure',
    description: \`AgentQA: \${job.rating}/5 — \${job.summary}\`,
  })
}`}</pre>
      </div>

      <h2>Next steps</h2>
      <ul>
        <li><Link href="/docs/examples/node-quickstart">Node.js quickstart</Link> — polling-based alternative</li>
        <li><Link href="/docs/examples/typescript-pipeline">TypeScript pipeline</Link> — fully typed client</li>
        <li><Link href="/examples/sample-report">Sample report</Link></li>
      </ul>
    </article>
  )
}
