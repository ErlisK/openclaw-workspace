import type { Metadata } from 'next'
import Link from 'next/link'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://betawindow.com'
const REPO_BASE = 'https://github.com/ErlisK/openclaw-workspace/tree/main/startup-87-betawindow-human-in-the-loop-e2e-testing-for-ai-built/examples'

export const metadata: Metadata = {
  title: 'Developer Examples — BetaWindow Docs',
  description: 'Runnable Node.js and TypeScript examples for integrating BetaWindow into your CI/CD pipeline or AI agent build loop.',
  alternates: { canonical: `${BASE_URL}/docs/examples` },
}

export default function ExamplesIndexPage() {
  const examples = [
    {
      title: 'Node.js Quickstart',
      slug: 'node-quickstart',
      description: 'Create a job, poll until complete, print the report. CommonJS, no dependencies, runs on Node 18+.',
      language: 'JavaScript',
      time: '2 min',
      ghPath: 'node-quickstart',
      tags: ['Node.js', 'CommonJS', 'CI'],
    },
    {
      title: 'TypeScript Pipeline',
      slug: 'typescript-pipeline',
      description: 'Full typed pipeline with BetaWindowClient class and quality gate assertions. Exits 1 on failed gates.',
      language: 'TypeScript',
      time: '5 min',
      ghPath: 'typescript-pipeline',
      tags: ['TypeScript', 'CI', 'Quality gates'],
    },
    {
      title: 'Webhook Receiver',
      slug: 'webhook-receiver',
      description: 'Express server that receives job.completed webhooks, verifies HMAC signatures, logs reports.',
      language: 'JavaScript',
      time: '3 min',
      ghPath: 'webhook-receiver',
      tags: ['Node.js', 'Express', 'Webhooks'],
    },
  ]

  return (
    <article data-testid="docs-examples">
      <h1>Developer Examples</h1>
      <p className="lead text-xl text-gray-600 mb-8">
        Runnable examples for Node.js and TypeScript. Each example is self-contained — clone, install, export
        your <code>AGENTQA_TOKEN</code>, and run.
      </p>

      <div className="not-prose grid gap-4 mb-10">
        {examples.map(ex => (
          <div key={ex.slug} className="border border-gray-200 rounded-xl p-5 hover:border-indigo-300 transition-colors">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h3 className="text-base font-bold text-gray-900">{ex.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{ex.description}</p>
              </div>
              <span className="shrink-0 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono">
                {ex.language}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs text-gray-500">⏱ {ex.time} to run</span>
              <span className="text-gray-300">|</span>
              {ex.tags.map(t => (
                <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
              ))}
              <div className="ml-auto flex gap-3">
                <Link
                  href={`/docs/examples/${ex.slug}`}
                  className="text-sm text-indigo-600 font-medium hover:underline"
                >
                  View guide →
                </Link>
                <a
                  href={`${REPO_BASE}/${ex.ghPath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
                >
                  GitHub ↗
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2>Prerequisites</h2>
      <ul>
        <li>Node.js 18 or newer</li>
        <li>An BetaWindow account — <Link href="/signup">sign up free</Link></li>
        <li>Your API token from <strong>Settings → API Token</strong></li>
      </ul>

      <h2>Common setup</h2>
      <div className="not-prose bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto mb-6">
        <pre>{`# Clone the repo
git clone https://github.com/ErlisK/openclaw-workspace
cd openclaw-workspace/startup-87-betawindow-human-in-the-loop-e2e-testing-for-ai-built/examples

# Export credentials
export AGENTQA_TOKEN="eyJ..."
export APP_URL="https://your-app.vercel.app"

# Pick an example and run it
cd node-quickstart && node index.js`}</pre>
      </div>

      <h2>Sample report output</h2>
      <p>
        See a <Link href="/examples/sample-report">live sample report</Link> to understand what your AI agent
        receives back after a test session.
      </p>

      <h2>CI/CD integration</h2>
      <p>
        The TypeScript pipeline exits with code <code>1</code> when quality gates fail, making it
        a drop-in step in any CI system:
      </p>
      <div className="not-prose bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto mb-6">
        <pre>{`# GitHub Actions
- name: Human QA
  env:
    AGENTQA_TOKEN: \${{ secrets.AGENTQA_TOKEN }}
    APP_URL: \${{ steps.deploy.outputs.url }}
  run: |
    cd examples/typescript-pipeline
    npm install
    npx ts-node pipeline.ts`}</pre>
      </div>

      <div className="not-prose mt-10 bg-indigo-50 border border-indigo-100 rounded-xl p-5">
        <p className="font-semibold text-indigo-900 mb-1">Ready to try it?</p>
        <p className="text-sm text-indigo-700 mb-3">
          Create your first test job from the dashboard — no code required.
        </p>
        <Link
          href="/signup?utm_source=docs&utm_medium=internal&utm_campaign=examples_cta"
          className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700"
        >
          Get started free →
        </Link>
      </div>
    </article>
  )
}
