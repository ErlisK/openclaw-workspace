/**
 * AgentQA — Webhook Receiver Example
 *
 * Minimal Express server that receives AgentQA job completion webhooks,
 * verifies the signature, and logs the report.
 *
 * Usage:
 *   export AGENTQA_WEBHOOK_SECRET="whsec_..."
 *   node server.js
 *
 * Then configure your webhook URL in AgentQA:
 *   Settings → Webhooks → Add endpoint: http://your-server:3001/webhook
 */

const express = require('express')
const crypto  = require('crypto')

const app    = express()
const PORT   = process.env.PORT ?? 3001
const SECRET = process.env.AGENTQA_WEBHOOK_SECRET ?? ''

// Parse raw body for signature verification
app.use(express.raw({ type: 'application/json' }))

// ── Signature verification ────────────────────────────────────────────────────

function verifySignature(payload, signature, secret) {
  if (!secret) {
    console.warn('⚠️  AGENTQA_WEBHOOK_SECRET not set — skipping signature verification')
    return true
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  const received = signature?.replace('sha256=', '') ?? ''

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(received.padEnd(expected.length, '0'), 'hex'),
    )
  } catch {
    return false
  }
}

// ── Webhook handler ───────────────────────────────────────────────────────────

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-agentqa-signature']
  const rawBody   = req.body // Buffer from express.raw()

  if (!verifySignature(rawBody, signature, SECRET)) {
    console.error('❌ Invalid webhook signature — rejecting')
    return res.status(401).json({ error: 'Invalid signature' })
  }

  let event
  try {
    event = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  console.log(`\n📦 Webhook received: ${event.type}`)

  switch (event.type) {
    case 'job.completed': {
      const job = event.data
      console.log(`\n✅ Job complete: ${job.id}`)
      console.log(`   URL:     ${job.submitted_url}`)
      console.log(`   Rating:  ${job.rating}/5`)
      console.log(`   Summary: ${job.summary}`)

      if (job.bugs?.length > 0) {
        console.log(`\n   Bugs (${job.bugs.length}):`)
        job.bugs.forEach((b, i) => {
          console.log(`   ${i + 1}. [${b.severity}] ${b.title}`)
        })
      }

      if (job.network_log_url) {
        console.log(`\n   Network log: ${job.network_log_url}`)
      }

      // ── YOUR INTEGRATION HERE ──────────────────────────────────────────
      // Examples:
      //   await postToSlack(job)
      //   await createJiraTickets(job.bugs)
      //   await updateDeploymentStatus(job)
      //   await sendEmailReport(job)
      // ──────────────────────────────────────────────────────────────────
      break
    }

    case 'job.failed': {
      console.error(`\n❌ Job failed: ${event.data.id} — ${event.data.error}`)
      break
    }

    case 'job.claimed': {
      console.log(`\n👤 Tester claimed job: ${event.data.id}`)
      break
    }

    default:
      console.log(`   (unhandled event type: ${event.type})`)
  }

  // Always return 200 quickly — process async work after responding
  res.status(200).json({ received: true })
})

// ── Health check ──────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\nAgentQA webhook receiver listening on port ${PORT}`)
  console.log(`Health: http://localhost:${PORT}/health`)
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook\n`)
  if (!SECRET) {
    console.warn('⚠️  Set AGENTQA_WEBHOOK_SECRET to verify signatures in production')
  }
})
