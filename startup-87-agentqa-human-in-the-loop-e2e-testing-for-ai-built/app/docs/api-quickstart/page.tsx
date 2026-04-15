import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API Quickstart — AgentQA Docs',
  description: 'Create and manage AgentQA test jobs via the REST API. Includes authentication, job creation, polling, and webhook examples.',
}

export default function ApiQuickstartPage() {
  return (
    <article data-testid="docs-api-quickstart">
      <h1>API Quickstart</h1>
      <p className="lead text-xl text-gray-600 mb-8">
        AgentQA has a REST API for programmatic job creation, status polling, and webhook delivery.
        This is ideal for CI/CD pipelines where you want to trigger a human test after every deployment.
      </p>

      <h2>Authentication</h2>
      <p>
        All API routes require a Bearer token. Sign in via the web UI, then copy your token from
        <strong> Settings → API Token</strong>, or exchange credentials for a token:
      </p>
      <div className="not-prose bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto mb-6">
        <pre>{`# Exchange email/password for a JWT
curl -X POST https://sreaczlbclzysmntltdf.supabase.co/auth/v1/token?grant_type=password \\
  -H "apikey: <SUPABASE_ANON_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"your-password"}'

# Response:
# { "access_token": "eyJ...", "expires_in": 3600, ... }`}</pre>
      </div>
      <p>Use <code>access_token</code> as your Bearer token in all subsequent requests.</p>

      <h2>Create a job</h2>
      <div className="not-prose bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto mb-6">
        <pre>{`POST /api/jobs
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Test signup + onboarding",
  "url": "https://your-app.vercel.app",
  "tier": "standard",
  "instructions": "1. Sign up with a new email\\n2. Complete onboarding\\n3. Create a project"
}

# Response 201:
{
  "job": {
    "id": "job_abc123",
    "status": "draft",
    "tier": "standard",
    "credits_cost": 10,
    "url": "https://your-app.vercel.app",
    "created_at": "2025-06-01T12:00:00Z"
  }
}`}</pre>
      </div>

      <h3>Tier values</h3>
      <div className="not-prose overflow-x-auto mb-4">
        <table className="text-sm border-collapse w-full">
          <thead><tr className="bg-gray-50">
            <th className="px-3 py-2 border border-gray-200 text-left">tier</th>
            <th className="px-3 py-2 border border-gray-200 text-left">Credits</th>
            <th className="px-3 py-2 border border-gray-200 text-left">Duration</th>
          </tr></thead>
          <tbody>
            <tr><td className="px-3 py-2 border border-gray-200"><code>quick</code></td><td className="px-3 py-2 border border-gray-200">5</td><td className="px-3 py-2 border border-gray-200">10 min</td></tr>
            <tr><td className="px-3 py-2 border border-gray-200"><code>standard</code></td><td className="px-3 py-2 border border-gray-200">10</td><td className="px-3 py-2 border border-gray-200">20 min</td></tr>
            <tr><td className="px-3 py-2 border border-gray-200"><code>deep</code></td><td className="px-3 py-2 border border-gray-200">15</td><td className="px-3 py-2 border border-gray-200">30 min</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Publish a job</h2>
      <p>
        Jobs start in <code>draft</code> status. Publish to make them visible to testers.
        Publishing holds the credit cost from your balance.
      </p>
      <div className="not-prose bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto mb-6">
        <pre>{`POST /api/jobs/{id}/transition
Authorization: Bearer <token>
Content-Type: application/json

{ "to": "published" }

# Response 200:
{
  "job": {
    "id": "job_abc123",
    "status": "published",
    "credits_held": 10
  }
}`}</pre>
      </div>

      <h2>Poll job status</h2>
      <div className="not-prose bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto mb-6">
        <pre>{`GET /api/jobs/{id}
Authorization: Bearer <token>

# Response 200:
{
  "job": {
    "id": "job_abc123",
    "status": "completed",  // draft | published | in_progress | completed | cancelled | expired
    "credits_held": 0,
    "credits_spent": 10,
    "feedback_submitted_at": "2025-06-01T14:23:00Z"
  }
}`}</pre>
      </div>

      <h2>Job status lifecycle</h2>
      <div className="not-prose bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm font-mono mb-6">
        <pre>{`draft → published → in_progress → completed
                ↓                  ↓
            cancelled          cancelled (rejected re-queue)
                ↓
            expired  (24h no claim)`}</pre>
      </div>

      <h2>Get feedback report</h2>
      <div className="not-prose bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto mb-6">
        <pre>{`GET /api/jobs/{id}/feedback
Authorization: Bearer <token>

# Response 200:
{
  "feedback": {
    "verdict": "pass",
    "ux_score": 4,
    "summary": "Signup flow works. Minor issue with...",
    "bugs": [
      {
        "title": "Forgot password link 404s",
        "severity": "medium",
        "steps": "1. Go to /login\\n2. Click Forgot password\\n3. 404"
      }
    ],
    "network_log_url": "/api/sessions/{session_id}/network-log",
    "console_log_url": "/api/sessions/{session_id}/console-log"
  }
}`}</pre>
      </div>

      <h2>CI/CD integration example</h2>
      <p>Post a test job after every Vercel deployment in GitHub Actions:</p>
      <div className="not-prose bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto mb-6">
        <pre>{`# .github/workflows/e2e.yml
- name: Submit AgentQA test job
  env:
    AGENTQA_TOKEN: \${{ secrets.AGENTQA_TOKEN }}
    DEPLOY_URL: \${{ steps.deploy.outputs.url }}
  run: |
    JOB=$(curl -sf -X POST https://agentqa.vercel.app/api/jobs \\
      -H "Authorization: Bearer $AGENTQA_TOKEN" \\
      -H "Content-Type: application/json" \\
      -d "{\"title\":\"CI deploy test\",\"url\":\"$DEPLOY_URL\",\"tier\":\"quick\"}")
    JOB_ID=$(echo $JOB | jq -r '.job.id')
    
    # Publish the job
    curl -sf -X POST https://agentqa.vercel.app/api/jobs/$JOB_ID/transition \\
      -H "Authorization: Bearer $AGENTQA_TOKEN" \\
      -H "Content-Type: application/json" \\
      -d '{"to":"published"}'
    
    echo "Job $JOB_ID published — results within 4 hours"`}</pre>
      </div>

      <h2>Rate limits</h2>
      <ul>
        <li>Job creation: 20 jobs per hour per account</li>
        <li>Status polling: 60 requests per minute</li>
        <li>Feedback retrieval: 30 requests per minute</li>
      </ul>
      <p>
        Rate limit exceeded responses return HTTP 429 with a <code>Retry-After</code> header.
      </p>

      <h2>Errors</h2>
      <div className="not-prose overflow-x-auto mb-4">
        <table className="text-sm border-collapse w-full">
          <thead><tr className="bg-gray-50">
            <th className="px-3 py-2 border border-gray-200 text-left">Status</th>
            <th className="px-3 py-2 border border-gray-200 text-left">Meaning</th>
          </tr></thead>
          <tbody>
            {[
              ['400', 'Invalid request body (validation error)'],
              ['401', 'Missing or invalid Bearer token'],
              ['402', 'Insufficient credits to publish'],
              ['403', 'Forbidden (job belongs to another user)'],
              ['404', 'Job not found'],
              ['422', 'Invalid state transition (e.g. publish a completed job)'],
              ['429', 'Rate limit exceeded'],
              ['500', 'Internal server error'],
            ].map(([code, meaning]) => (
              <tr key={code}>
                <td className="px-3 py-2 border border-gray-200 font-mono">{code}</td>
                <td className="px-3 py-2 border border-gray-200">{meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}
