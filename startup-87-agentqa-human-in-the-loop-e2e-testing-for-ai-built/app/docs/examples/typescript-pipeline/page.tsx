import type { Metadata } from 'next'
import Link from 'next/link'

const REPO = 'https://github.com/ErlisK/openclaw-workspace/tree/main/startup-87-betawindow-human-in-the-loop-e2e-testing-for-ai-built/examples/typescript-pipeline'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://betawindow.com'

export const metadata: Metadata = {
  title: 'TypeScript Pipeline Example — BetaWindow Docs',
  description: 'Fully typed BetaWindow pipeline with BetaWindowClient class, quality gate assertions, and CI exit codes.',
  alternates: { canonical: `${BASE_URL}/docs/examples/typescript-pipeline` },
}

export default function TypeScriptPipelinePage() {
  return (
    <article data-testid="docs-examples-typescript-pipeline">
      <h1>TypeScript Pipeline</h1>
      <p className="lead text-xl text-gray-600 mb-6">
        A production-ready typed pipeline with an <code>BetaWindowClient</code> class, quality gate
        assertions, and CI-friendly exit codes.
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
        <pre>{`cd examples/typescript-pipeline
npm install   # installs typescript + ts-node

export AGENTQA_TOKEN="eyJ..."
export APP_URL="https://your-app.vercel.app"

# Run with ts-node (dev)
npx ts-node pipeline.ts

# Or compile first
npx tsc && node dist/pipeline.js`}</pre>
      </div>

      <h2>Types</h2>
      <div className="not-prose bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto mb-6">
        <pre>{`type Tier = 'quick' | 'standard' | 'deep'
type JobStatus = 'pending' | 'in_progress' | 'complete' | 'cancelled' | 'failed'
type BugSeverity = 'low' | 'medium' | 'high' | 'critical'

interface Job {
  id: string
  status: JobStatus
  tier: Tier
  submitted_url: string
  rating?: number        // 1–5
  summary?: string
  bugs: Bug[]
  network_log_url?: string
  console_log_url?: string
  duration_seconds?: number
}`}</pre>
      </div>

      <h2>BetaWindowClient</h2>
      <div className="not-prose bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto mb-6">
        <pre>{`const client = new BetaWindowClient(process.env.AGENTQA_TOKEN!)

// Create a job
const job = await client.createJob({
  url: 'https://your-app.vercel.app',
  tier: 'standard',
  title: 'Full smoke test',
  instructions: '...',
})

// Poll until complete (with progress callback)
const done = await client.pollUntilComplete(job.id, {
  intervalMs: 15_000,
  onProgress: (j) => console.log(j.status),
})`}</pre>
      </div>

      <h2>Quality gates</h2>
      <p>
        <code>assertJobQuality()</code> returns a typed result and the pipeline
        exits <code>1</code> on any failure:
      </p>
      <div className="not-prose bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto mb-6">
        <pre>{`const result = assertJobQuality(completedJob, {
  minRating: 3,                        // fail if rating < 3/5
  maxBugs: 5,                          // fail if > 5 bugs found
  forbiddenSeverities: ['critical'],   // fail on any critical bug
})

if (!result.passed) {
  console.error(result.failures)
  process.exit(1)
}`}</pre>
      </div>

      <h2>GitHub Actions</h2>
      <div className="not-prose bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto mb-6">
        <pre>{`jobs:
  human-qa:
    runs-on: ubuntu-latest
    needs: [deploy]   # run after Vercel deploy step
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: Install
        run: cd examples/typescript-pipeline && npm install
      - name: Run QA pipeline
        env:
          AGENTQA_TOKEN: \${{ secrets.AGENTQA_TOKEN }}
          APP_URL: \${{ needs.deploy.outputs.url }}
        run: |
          cd examples/typescript-pipeline
          npx ts-node pipeline.ts`}</pre>
      </div>

      <h2>Next steps</h2>
      <ul>
        <li><Link href="/docs/examples/node-quickstart">Node.js quickstart</Link> — simpler no-TypeScript version</li>
        <li><Link href="/docs/examples/webhook-receiver">Webhook receiver</Link> — async notifications instead of polling</li>
        <li><Link href="/examples/sample-report">Sample report</Link> — what a completed job returns</li>
      </ul>
    </article>
  )
}
