import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Agent API Reference — BetaWindow',
  description: 'REST API for AI agents to programmatically submit human-testing jobs on BetaWindow.',
}

const BASE = 'https://betawindow.com'

export default function ApiReferencePage() {
  return (
    <article className="prose prose-gray max-w-3xl mx-auto py-12 px-4">
      <h1>Agent API Reference</h1>
      <p className="lead">
        BetaWindow exposes a REST API so AI agents (Cursor, Replit Agent, v0, etc.) can
        programmatically hire human testers without any manual steps from the developer.
        This is the core "AI agents hiring humans" workflow.
      </p>

      <h2>Authentication</h2>
      <p>
        All <code>/api/v1/</code> endpoints use API key authentication. Generate a key in
        your{' '}
        <a href="/dashboard/api-keys">Dashboard → API Keys</a>.
      </p>
      <pre><code>{`Authorization: Bearer aqk_<your-key>`}</code></pre>

      <h2>Base URL</h2>
      <pre><code>{`${BASE}/api/v1`}</code></pre>

      <h2>Tiers &amp; Pricing</h2>
      <table>
        <thead>
          <tr><th>Tier</th><th>Duration</th><th>Price</th><th>Use when</th></tr>
        </thead>
        <tbody>
          <tr><td><code>quick</code></td><td>~10 min</td><td>$5</td><td>Smoke test, happy path only</td></tr>
          <tr><td><code>standard</code></td><td>~20 min</td><td>$10</td><td>Core flows + edge cases</td></tr>
          <tr><td><code>deep</code></td><td>~30 min</td><td>$15</td><td>Full regression + accessibility</td></tr>
        </tbody>
      </table>

      <hr />

      <h2>Endpoints</h2>

      {/* List jobs */}
      <h3>List jobs</h3>
      <pre><code>{`GET /api/v1/jobs?limit=20&offset=0`}</code></pre>
      <p>Returns a paginated list of test jobs you have submitted.</p>
      <h4>Response</h4>
      <pre><code>{JSON.stringify({
        jobs: [{ id: 'uuid', title: 'Check checkout flow', status: 'completed', tier: 'quick', price_cents: 500 }],
        pagination: { total: 42, limit: 20, offset: 0 },
      }, null, 2)}</code></pre>

      {/* Create job */}
      <h3>Create a job</h3>
      <pre><code>{`POST /api/v1/jobs`}</code></pre>
      <p>Creates a new test job. Set <code>auto_submit: true</code> to immediately queue it for a human tester (skips the draft step).</p>
      <h4>Request body</h4>
      <pre><code>{JSON.stringify({
        title: 'Test checkout flow on /checkout',
        url: 'https://my-app.vercel.app/checkout',
        tier: 'quick',
        instructions: 'Try adding an item to the cart and completing checkout. Report any errors.',
        auto_submit: true,
      }, null, 2)}</code></pre>
      <h4>Response <code>201</code></h4>
      <pre><code>{JSON.stringify({
        job: { id: 'uuid', status: 'pending', tier: 'quick', price_cents: 500 }
      }, null, 2)}</code></pre>

      {/* Get job */}
      <h3>Get job status &amp; results</h3>
      <pre><code>{`GET /api/v1/jobs/:id`}</code></pre>
      <p>Returns the job with its current status, feedback, and session info. Poll this until <code>status === "completed"</code>.</p>
      <h4>Job status lifecycle</h4>
      <pre><code>{`draft → pending → in_progress → completed\n                              ↘ cancelled`}</code></pre>

      {/* Update job */}
      <h3>Update / submit a draft</h3>
      <pre><code>{`PATCH /api/v1/jobs/:id`}</code></pre>
      <p>Update fields on a draft job. To submit it for testing, set <code>{"{ status: \"pending\" }"}</code>.</p>

      {/* Cancel job */}
      <h3>Cancel a job</h3>
      <pre><code>{`DELETE /api/v1/jobs/:id`}</code></pre>
      <p>Cancels a draft or pending job. Has no effect once a tester has started.</p>

      <hr />

      <h2>Quick-start (curl)</h2>
      <pre><code>{`# 1. Submit a test job
curl -X POST ${BASE}/api/v1/jobs \\
  -H "Authorization: Bearer aqk_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Smoke test homepage",
    "url": "https://my-app.vercel.app",
    "tier": "quick",
    "instructions": "Navigate the site and report any broken links or JS errors.",
    "auto_submit": true
  }'

# 2. Poll for results
curl ${BASE}/api/v1/jobs/JOB_ID \\
  -H "Authorization: Bearer aqk_YOUR_KEY"`}</code></pre>

      <h2>Quick-start (Python SDK)</h2>
      <pre><code>{`import httpx, time

API_KEY = "aqk_YOUR_KEY"
BASE = "${BASE}/api/v1"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

# Submit
resp = httpx.post(f"{BASE}/jobs", headers=HEADERS, json={
    "title": "Smoke test homepage",
    "url": "https://my-app.vercel.app",
    "tier": "quick",
    "auto_submit": True,
})
job = resp.json()["job"]
print(f"Job {job['id']} submitted")

# Poll until done
while job["status"] not in ("completed", "cancelled"):
    time.sleep(30)
    job = httpx.get(f"{BASE}/jobs/{job['id']}", headers=HEADERS).json()["job"]

print("Feedback:", job.get("feedback"))`}</code></pre>

      <h2>Rate limits</h2>
      <p>50 requests / minute per API key. Exceeding returns <code>429 Too Many Requests</code>.</p>

      <h2>Errors</h2>
      <p>All errors return JSON with an <code>error</code> field and a standard HTTP status code.</p>
      <pre><code>{JSON.stringify({ error: 'title and url are required' }, null, 2)}</code></pre>
    </article>
  )
}
