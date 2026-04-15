# AgentQA — Developer Examples

This folder contains runnable examples for integrating AgentQA into your CI/CD pipeline, AI agent build loop, or standalone Node.js project.

## Examples

| Folder | Description | Language |
|--------|-------------|----------|
| [`node-quickstart/`](./node-quickstart/) | Create a job, poll for completion, print report | Node.js (CommonJS) |
| [`typescript-pipeline/`](./typescript-pipeline/) | Full typed pipeline: submit → wait → parse → assert | TypeScript |
| [`webhook-receiver/`](./webhook-receiver/) | Minimal Express server to receive AgentQA webhooks | Node.js + Express |

## Prerequisites

- Node.js 18+
- An AgentQA account — [sign up free](https://startup-87-agentqa-human-in-the-loop-e2e-testing-ouwi0qsjw.vercel.app/signup)
- Your API token from **Settings → API Token**

## Quick Start

```bash
# 1. Clone this repo
git clone https://github.com/ErlisK/openclaw-workspace
cd openclaw-workspace/startup-87-agentqa-human-in-the-loop-e2e-testing-for-ai-built/examples

# 2. Pick an example
cd node-quickstart
npm install

# 3. Set your token
export AGENTQA_TOKEN="eyJ..."
export AGENTQA_BASE_URL="https://startup-87-agentqa-human-in-the-loop-e2e-testing-ouwi0qsjw.vercel.app"

# 4. Run it
node index.js
```

## API Reference

Full API docs: [/docs/api-quickstart](https://startup-87-agentqa-human-in-the-loop-e2e-testing-ouwi0qsjw.vercel.app/docs/api-quickstart)

### Base URL
```
https://startup-87-agentqa-human-in-the-loop-e2e-testing-ouwi0qsjw.vercel.app
```

### Create a Job
```
POST /api/jobs
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://your-app.vercel.app",
  "tier": "standard",           // quick | standard | deep
  "title": "Test checkout flow",
  "instructions": "Go to /pricing, click 'Get started', fill the form, submit."
}
```

### Get Job Status
```
GET /api/jobs/:id
Authorization: Bearer <token>
```

### List Your Jobs
```
GET /api/jobs?status=pending|in_progress|complete
Authorization: Bearer <token>
```

## Tiers & Pricing

| Tier | Duration | Price |
|------|----------|-------|
| `quick` | ~10 min | $5 |
| `standard` | ~20 min | $10 |
| `deep` | ~30 min | $15 |

## Sample Report Output

```json
{
  "id": "job_abc123",
  "status": "complete",
  "tier": "standard",
  "submitted_url": "https://your-app.vercel.app",
  "tester_id": "tester_xyz",
  "rating": 4,
  "summary": "Signup and checkout flow works. Found one bug: the email field accepts '@' with no TLD.",
  "bugs": [
    {
      "severity": "medium",
      "title": "Email validation allows invalid addresses",
      "steps": "1. Go to /signup\n2. Enter 'user@'\n3. Click Submit\n4. Form submits without error",
      "expected": "Validation error shown",
      "actual": "Form submits, server returns 500"
    }
  ],
  "network_log_url": "/report/job_abc123/network",
  "console_log_url": "/report/job_abc123/console",
  "completed_at": "2025-04-15T14:32:10Z",
  "duration_seconds": 847
}
```
