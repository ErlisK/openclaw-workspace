# BetaWindow Webhook Receiver

Minimal Express server that receives `job.completed`, `job.failed`, and `job.claimed` webhook events from BetaWindow.

## Setup

```bash
npm install

export AGENTQA_WEBHOOK_SECRET="whsec_..."  # from Settings → Webhooks
node server.js
```

## Testing locally with ngrok

```bash
# 1. Start the receiver
node server.js

# 2. Expose it publicly
ngrok http 3001

# 3. Copy the ngrok URL → paste into BetaWindow Settings → Webhooks
#    e.g. https://abc123.ngrok.io/webhook
```

## Event types

| Event | When |
|-------|------|
| `job.claimed` | A tester accepts your job |
| `job.completed` | Session done, report available |
| `job.failed` | Job could not be completed |

## Signature verification

Every webhook POST includes `X-BetaWindow-Signature: sha256=<hmac>`.
The server verifies this using `crypto.timingSafeEqual`. Set `AGENTQA_WEBHOOK_SECRET` in production.

## Integrations to add

In `server.js`, the `case 'job.completed'` block is where you'd add:

```javascript
// Slack notification
await postToSlack(`BetaWindow: ${job.bugs.length} bugs found in ${job.submitted_url}`)

// Create Jira tickets for each bug
for (const bug of job.bugs) {
  await createJiraIssue({ summary: bug.title, description: bug.steps })
}

// Update GitHub deployment status
await updateGitHubDeployment(job.id, job.bugs.length === 0 ? 'success' : 'failure')
```
