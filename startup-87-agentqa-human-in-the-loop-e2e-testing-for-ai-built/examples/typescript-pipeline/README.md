# AgentQA TypeScript Pipeline

Fully typed pipeline with quality gate assertions. Integrates cleanly into CI.

## Setup

```bash
npm install

export AGENTQA_TOKEN="eyJ..."
export APP_URL="https://your-app.vercel.app"

# Run with ts-node (dev)
npx ts-node pipeline.ts

# Or compile first
npx tsc && node dist/pipeline.js
```

## Features

- **Full TypeScript types** for jobs, bugs, tiers, statuses
- **`AgentQAClient` class** — reusable across your codebase
- **`assertJobQuality()`** — configurable gates: min rating, max bugs, forbidden severities
- **CI exit codes** — exits 1 on quality gate failure, 0 on pass
- **Progress indicator** — real-time status while polling

## Quality Gates

```typescript
assertJobQuality(completedJob, {
  minRating: 3,            // fail if tester rates < 3/5
  maxBugs: 5,              // fail if more than 5 bugs
  forbiddenSeverities: ['critical'],  // fail on any critical bug
})
```

## GitHub Actions

```yaml
jobs:
  human-qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: Install
        run: cd examples/typescript-pipeline && npm install
      - name: Run QA pipeline
        env:
          AGENTQA_TOKEN: ${{ secrets.AGENTQA_TOKEN }}
          APP_URL: ${{ needs.deploy.outputs.url }}
        run: cd examples/typescript-pipeline && npx ts-node pipeline.ts
```
