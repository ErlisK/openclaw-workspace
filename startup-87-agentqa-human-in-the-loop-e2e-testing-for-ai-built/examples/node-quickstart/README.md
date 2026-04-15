# AgentQA Node.js Quickstart

Create a test job, wait for a human tester, and print the report — in ~30 lines of JavaScript.

## Setup

```bash
npm install   # no runtime deps — uses native fetch (Node 18+)

export AGENTQA_TOKEN="eyJ..."
export APP_URL="https://your-app.vercel.app"

node index.js
```

## What it does

1. **Creates** a `quick` tier test job (10-min session, $5)
2. **Polls** every 10 seconds until the tester completes
3. **Prints** a formatted report with rating, summary, and bugs
4. **Exits with code 1** if any high/critical bugs are found (CI-friendly)

## CI Integration

```yaml
# .github/workflows/qa.yml
- name: Human QA check
  env:
    AGENTQA_TOKEN: ${{ secrets.AGENTQA_TOKEN }}
    APP_URL: ${{ steps.deploy.outputs.url }}
  run: node examples/node-quickstart/index.js
```

## Get Your Token

1. Sign in at [AgentQA](https://startup-87-agentqa-human-in-the-loop-e2e-testing-ouwi0qsjw.vercel.app)
2. Go to **Settings → API Token**
3. Copy and export as `AGENTQA_TOKEN`
