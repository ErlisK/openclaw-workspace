/**
 * BetaWindow — TypeScript Pipeline Example
 *
 * Fully typed pipeline: submit → wait → parse → assert
 *
 * Usage:
 *   export AGENTQA_TOKEN="eyJ..."
 *   export APP_URL="https://your-app.vercel.app"
 *   npx ts-node pipeline.ts
 *
 * Or compile and run:
 *   npx tsc && node dist/pipeline.js
 */

const BASE_URL = process.env.AGENTQA_BASE_URL
  ?? 'https://betawindow.com'

const TOKEN = process.env.AGENTQA_TOKEN
if (!TOKEN) throw new Error('AGENTQA_TOKEN is required')

// ── Types ─────────────────────────────────────────────────────────────────────

type Tier = 'quick' | 'standard' | 'deep'
type JobStatus = 'pending' | 'in_progress' | 'complete' | 'cancelled' | 'failed'
type BugSeverity = 'low' | 'medium' | 'high' | 'critical'

interface CreateJobRequest {
  url: string
  tier: Tier
  title: string
  instructions: string
}

interface Bug {
  severity: BugSeverity
  title: string
  steps: string
  expected: string
  actual: string
  screenshot_url?: string
}

interface Job {
  id: string
  status: JobStatus
  tier: Tier
  submitted_url: string
  title: string
  tester_id?: string
  rating?: number            // 1–5
  summary?: string
  bugs: Bug[]
  network_log_url?: string
  console_log_url?: string
  duration_seconds?: number
  created_at: string
  completed_at?: string
  error?: string
}

interface PollOptions {
  intervalMs?: number
  timeoutMs?: number
  onProgress?: (job: Job) => void
}

// ── BetaWindow client ────────────────────────────────────────────────────────────

class BetaWindowClient {
  private headers: Record<string, string>

  constructor(token: string, private baseUrl = BASE_URL) {
    this.headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }

  async createJob(req: CreateJobRequest): Promise<Job> {
    const res = await fetch(`${this.baseUrl}/api/jobs`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(req),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`createJob failed ${res.status}: ${text}`)
    }
    return res.json() as Promise<Job>
  }

  async getJob(id: string): Promise<Job> {
    const res = await fetch(`${this.baseUrl}/api/jobs/${id}`, { headers: this.headers })
    if (!res.ok) throw new Error(`getJob failed: ${res.status}`)
    return res.json() as Promise<Job>
  }

  async listJobs(status?: JobStatus): Promise<Job[]> {
    const qs = status ? `?status=${status}` : ''
    const res = await fetch(`${this.baseUrl}/api/jobs${qs}`, { headers: this.headers })
    if (!res.ok) throw new Error(`listJobs failed: ${res.status}`)
    const data = await res.json() as { jobs: Job[] }
    return data.jobs ?? []
  }

  async pollUntilComplete(
    jobId: string,
    { intervalMs = 10_000, timeoutMs = 30 * 60_000, onProgress }: PollOptions = {},
  ): Promise<Job> {
    const start = Date.now()

    while (Date.now() - start < timeoutMs) {
      const job = await this.getJob(jobId)
      onProgress?.(job)

      if (job.status === 'complete' || job.status === 'cancelled') return job
      if (job.status === 'failed') throw new Error(`Job ${jobId} failed: ${job.error}`)

      await new Promise(r => setTimeout(r, intervalMs))
    }

    throw new Error(`Timeout: job ${jobId} not complete after ${timeoutMs / 1000}s`)
  }
}

// ── Assertions ────────────────────────────────────────────────────────────────

interface AssertionResult {
  passed: boolean
  failures: string[]
}

function assertJobQuality(
  job: Job,
  opts: {
    minRating?: number
    maxBugs?: number
    forbiddenSeverities?: BugSeverity[]
  } = {},
): AssertionResult {
  const {
    minRating = 3,
    maxBugs = Infinity,
    forbiddenSeverities = ['critical'],
  } = opts

  const failures: string[] = []

  if (job.rating !== undefined && job.rating < minRating) {
    failures.push(`Rating ${job.rating} is below minimum ${minRating}`)
  }

  if (job.bugs.length > maxBugs) {
    failures.push(`${job.bugs.length} bugs found (max allowed: ${maxBugs})`)
  }

  const blockers = job.bugs.filter(b => forbiddenSeverities.includes(b.severity))
  if (blockers.length > 0) {
    failures.push(`${blockers.length} ${forbiddenSeverities.join('/')} bug(s): ${blockers.map(b => b.title).join(', ')}`)
  }

  return { passed: failures.length === 0, failures }
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

async function runQAPipeline() {
  const client = new BetaWindowClient(TOKEN!)
  const appUrl = process.env.APP_URL ?? 'https://your-app.vercel.app'

  console.log(`\n🤖 BetaWindow TypeScript Pipeline`)
  console.log(`   Target: ${appUrl}`)
  console.log(`   Time:   ${new Date().toISOString()}\n`)

  // ── 1. Submit job ──────────────────────────────────────────────────────────
  console.log('📤 Submitting test job (tier: standard)...')
  const job = await client.createJob({
    url: appUrl,
    tier: 'standard',
    title: 'Full smoke test — auth + core flow',
    instructions: `
You are testing a web application. Please complete the following steps:

1. Load the homepage. Check that it renders without console errors.
2. Navigate to the pricing page. Verify all three tiers display correctly.
3. Click "Get started" on the Standard plan.
4. Complete signup with email: qa-test@example.com, password: QaTest123!
5. Verify the dashboard loads and shows the expected UI.
6. Create a new test job: enter URL "https://example.com", select "Quick" tier, submit.
7. Verify the job appears in the job list.

Report any broken UI, failed network requests (4xx/5xx), console errors, or confusing UX.
    `.trim(),
  })

  console.log(`✓ Job created: ${job.id}`)
  console.log(`  Dashboard: ${BASE_URL}/run/${job.id}\n`)

  // ── 2. Poll until complete ─────────────────────────────────────────────────
  console.log('⏳ Waiting for human tester...')
  const completed = await client.pollUntilComplete(job.id, {
    intervalMs: 15_000,
    onProgress: (j) => {
      const elapsed = Math.round((Date.now() - new Date(j.created_at).getTime()) / 1000)
      process.stdout.write(`\r   ${j.status} — ${elapsed}s elapsed`)
    },
  })
  console.log('\n')

  // ── 3. Parse & display results ─────────────────────────────────────────────
  console.log('📋 Test Report')
  console.log('─────────────────────────────────')
  console.log(`Status:   ${completed.status}`)
  console.log(`Rating:   ${completed.rating}/5`)
  console.log(`Duration: ${completed.duration_seconds}s`)
  console.log(`Summary:  ${completed.summary}`)

  if (completed.bugs.length > 0) {
    console.log(`\nBugs (${completed.bugs.length}):`)
    completed.bugs.forEach((bug, i) => {
      const icon = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[bug.severity] ?? '⚪'
      console.log(`  ${i + 1}. ${icon} [${bug.severity}] ${bug.title}`)
    })
  }

  if (completed.network_log_url) {
    console.log(`\nNetwork log: ${BASE_URL}${completed.network_log_url}`)
  }

  // ── 4. Assert quality gates ────────────────────────────────────────────────
  console.log('\n🔍 Checking quality gates...')
  const result = assertJobQuality(completed, {
    minRating: 3,
    maxBugs: 5,
    forbiddenSeverities: ['critical'],
  })

  if (result.passed) {
    console.log('✅ All quality gates passed!')
    process.exit(0)
  } else {
    console.error('\n❌ Quality gate failures:')
    result.failures.forEach(f => console.error(`  • ${f}`))
    process.exit(1)
  }
}

runQAPipeline().catch(err => {
  console.error('Pipeline error:', err.message)
  process.exit(1)
})
