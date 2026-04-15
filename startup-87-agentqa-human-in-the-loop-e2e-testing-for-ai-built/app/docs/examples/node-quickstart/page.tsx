import type { Metadata } from 'next'
import Link from 'next/link'

const REPO = 'https://github.com/ErlisK/openclaw-workspace/tree/main/startup-87-betawindow-human-in-the-loop-e2e-testing-for-ai-built/examples/node-quickstart'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://betawindow.com'

export const metadata: Metadata = {
  title: 'Node.js Quickstart Example — BetaWindow Docs',
  description: 'Create an BetaWindow job, poll for completion, and print the structured bug report in ~30 lines of JavaScript.',
  alternates: { canonical: `${BASE_URL}/docs/examples/node-quickstart` },
}

const CODE = `/**
 * BetaWindow — Node.js Quickstart
 * Create a job, poll until done, print the report.
 *
 * export AGENTQA_TOKEN="eyJ..."
 * export APP_URL="https://your-app.vercel.app"
 * node index.js
 */
const BASE_URL = process.env.AGENTQA_BASE_URL
  || 'https://betawindow.com'
const TOKEN = process.env.AGENTQA_TOKEN
const headers = { 'Authorization': \`Bearer \${TOKEN}\`, 'Content-Type': 'application/json' }

async function createJob({ url, tier, title, instructions }) {
  const res = await fetch(\`\${BASE_URL}/api/jobs\`, {
    method: 'POST', headers,
    body: JSON.stringify({ url, tier, title, instructions }),
  })
  if (!res.ok) throw new Error(\`\${res.status}: \${await res.text()}\`)
  return res.json()
}

async function pollJob(jobId, intervalMs = 10_000, timeoutMs = 30 * 60_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(\`\${BASE_URL}/api/jobs/\${jobId}\`, { headers })
    const job = await res.json()
    process.stdout.write(\`\\r  Status: \${job.status}\`)
    if (job.status === 'complete' || job.status === 'cancelled') return job
    if (job.status === 'failed') throw new Error(job.error)
    await new Promise(r => setTimeout(r, intervalMs))
  }
  throw new Error('Timeout')
}

async function main() {
  const job = await createJob({
    url: process.env.APP_URL,
    tier: 'quick',          // quick | standard | deep
    title: 'Smoke test',
    instructions: 'Load homepage, sign up, verify dashboard loads.',
  })
  console.log('Job created:', job.id)
  const done = await pollJob(job.id)
  console.log('\\nRating:', done.rating, '/ 5')
  console.log('Summary:', done.summary)
  if (done.bugs?.length > 0) {
    console.log('Bugs:')
    done.bugs.forEach(b => console.log(\`  [\${b.severity}] \${b.title}\`))
    process.exit(1) // fail CI on bugs
  }
}
main().catch(e => { console.error(e.message); process.exit(1) })`

export default function NodeQuickstartPage() {
  return (
    <article data-testid="docs-examples-node-quickstart">
      <h1>Node.js Quickstart</h1>
      <p className="lead text-xl text-gray-600 mb-6">
        Create a job, wait for a human tester, and print a structured bug report — in ~60 lines of JavaScript
        with no runtime dependencies (uses native <code>fetch</code>, Node 18+).
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
        <Link
          href="/docs/examples"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
        >
          ← All examples
        </Link>
      </div>

      <h2>Setup</h2>
      <div className="not-prose bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto mb-6">
        <pre>{`# Clone
git clone https://github.com/ErlisK/openclaw-workspace
cd openclaw-workspace/startup-87-betawindow-human-in-the-loop-e2e-testing-for-ai-built/examples/node-quickstart

# No dependencies to install (uses native fetch)
export AGENTQA_TOKEN="eyJ..."
export APP_URL="https://your-app.vercel.app"

node index.js`}</pre>
      </div>

      <h2>Full source</h2>
      <div className="not-prose bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto mb-6">
        <pre>{CODE}</pre>
      </div>

      <h2>What it does</h2>
      <ol>
        <li><strong>Creates</strong> a <code>quick</code> tier job (10 min, $5)</li>
        <li><strong>Polls</strong> every 10 seconds until the session completes</li>
        <li><strong>Prints</strong> rating, summary, and bug list</li>
        <li><strong>Exits&nbsp;1</strong> if any bugs are found (CI-friendly)</li>
      </ol>

      <h2>CI integration</h2>
      <div className="not-prose bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto mb-6">
        <pre>{`# .github/workflows/qa.yml
- name: Human QA
  env:
    AGENTQA_TOKEN: \${{ secrets.AGENTQA_TOKEN }}
    APP_URL: \${{ steps.deploy.outputs.url }}
  run: node examples/node-quickstart/index.js`}</pre>
      </div>

      <h2>Next steps</h2>
      <ul>
        <li><Link href="/docs/examples/typescript-pipeline">TypeScript pipeline</Link> — typed client + quality gate assertions</li>
        <li><Link href="/docs/examples/webhook-receiver">Webhook receiver</Link> — get notified async instead of polling</li>
        <li><Link href="/examples/sample-report">Sample report</Link> — see what the completed job looks like</li>
        <li><Link href="/docs/api-quickstart">Full API reference</Link></li>
      </ul>
    </article>
  )
}
