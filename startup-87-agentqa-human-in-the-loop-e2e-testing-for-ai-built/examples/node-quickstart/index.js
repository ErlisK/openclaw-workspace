/**
 * AgentQA — Node.js Quickstart Example
 *
 * Creates a test job, polls until complete, then prints the report.
 *
 * Usage:
 *   export AGENTQA_TOKEN="eyJ..."
 *   export AGENTQA_BASE_URL="https://startup-87-agentqa-human-in-the-loop-e2e-testing-ouwi0qsjw.vercel.app"
 *   node index.js
 */

const BASE_URL = process.env.AGENTQA_BASE_URL || 'https://startup-87-agentqa-human-in-the-loop-e2e-testing-ouwi0qsjw.vercel.app'
const TOKEN    = process.env.AGENTQA_TOKEN

if (!TOKEN) {
  console.error('Error: AGENTQA_TOKEN environment variable is required.')
  console.error('Get your token from: Settings → API Token')
  process.exit(1)
}

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
}

// ── Step 1: Create a test job ────────────────────────────────────────────────

async function createJob({ url, tier = 'standard', title, instructions }) {
  const res = await fetch(`${BASE_URL}/api/jobs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url, tier, title, instructions }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to create job: ${res.status} ${body}`)
  }

  return res.json()
}

// ── Step 2: Poll job until complete ─────────────────────────────────────────

async function pollJob(jobId, { intervalMs = 10_000, timeoutMs = 30 * 60_000 } = {}) {
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${BASE_URL}/api/jobs/${jobId}`, { headers })

    if (!res.ok) {
      throw new Error(`Failed to fetch job: ${res.status}`)
    }

    const job = await res.json()
    console.log(`  [${new Date().toISOString()}] Status: ${job.status}`)

    if (job.status === 'complete' || job.status === 'cancelled') {
      return job
    }

    if (job.status === 'failed') {
      throw new Error(`Job failed: ${job.error || 'unknown error'}`)
    }

    await new Promise(r => setTimeout(r, intervalMs))
  }

  throw new Error(`Timed out after ${timeoutMs / 1000}s waiting for job ${jobId}`)
}

// ── Step 3: Print the report ─────────────────────────────────────────────────

function printReport(job) {
  console.log('\n══════════════════════════════════════════════════════')
  console.log('  AgentQA Test Report')
  console.log('══════════════════════════════════════════════════════')
  console.log(`  Job ID:   ${job.id}`)
  console.log(`  URL:      ${job.submitted_url || job.url}`)
  console.log(`  Tier:     ${job.tier}`)
  console.log(`  Status:   ${job.status}`)
  console.log(`  Rating:   ${'★'.repeat(job.rating || 0)}${'☆'.repeat(5 - (job.rating || 0))} (${job.rating}/5)`)
  console.log(`  Duration: ${job.duration_seconds}s`)
  console.log('\n  Summary:')
  console.log(`  ${job.summary}`)

  if (job.bugs && job.bugs.length > 0) {
    console.log(`\n  Bugs Found (${job.bugs.length}):`)
    job.bugs.forEach((bug, i) => {
      console.log(`\n  ${i + 1}. [${bug.severity.toUpperCase()}] ${bug.title}`)
      console.log(`     Steps: ${bug.steps?.split('\n')[0]}...`)
    })
  } else {
    console.log('\n  ✅ No bugs found!')
  }

  if (job.network_log_url) {
    console.log(`\n  Network log: ${BASE_URL}${job.network_log_url}`)
  }
  if (job.console_log_url) {
    console.log(`  Console log: ${BASE_URL}${job.console_log_url}`)
  }

  console.log('\n══════════════════════════════════════════════════════\n')
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const appUrl = process.env.APP_URL || 'https://your-app.vercel.app'

  console.log(`\nAgentQA Quickstart`)
  console.log(`Target: ${appUrl}\n`)

  // 1. Create job
  console.log('Creating test job...')
  const job = await createJob({
    url: appUrl,
    tier: 'quick',
    title: 'Smoke test — homepage to signup',
    instructions: `
      1. Load the homepage and check it renders correctly
      2. Click "Get started" or "Sign up"
      3. Fill in a test email and password and submit
      4. Verify you reach the dashboard or a confirmation screen
      5. Note any broken layouts, console errors, or failed network requests
    `.trim(),
  })

  console.log(`✓ Job created: ${job.id}`)
  console.log(`  View live: ${BASE_URL}/run/${job.id}\n`)

  // 2. Poll for completion
  console.log('Waiting for tester to complete the session...')
  const completed = await pollJob(job.id)

  // 3. Print report
  printReport(completed)

  // 4. Exit with error code if bugs were found (useful in CI)
  const highSeverityBugs = (completed.bugs || []).filter(b =>
    b.severity === 'high' || b.severity === 'critical'
  )

  if (highSeverityBugs.length > 0) {
    console.error(`CI: Failing build — ${highSeverityBugs.length} high/critical bug(s) found.`)
    process.exit(1)
  }

  console.log('CI: All checks passed.')
}

main().catch(err => {
  console.error('\nError:', err.message)
  process.exit(1)
})
