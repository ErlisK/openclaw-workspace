import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GitHub Actions CI/CD — TeachRepo Docs',
  description:
    'Automate TeachRepo deploys with GitHub Actions: deploy on push, run E2E tests, apply DB migrations, and notify Slack on release.',
};

// ── YAML snippets stored as consts to avoid JSX parsing ${{ }} ──────────────
const DEPLOY_WORKFLOW = [
  'name: CI / Deploy',
  '',
  'on:',
  '  push:',
  '    branches: [main]',
  '  pull_request:',
  '    branches: [main]',
  '',
  'env:',
  '  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}',
  '  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}',
  '  WORKING_DIR: startup-91-lean-launch-plan-repo-to-course-git-native-paywall/apps/web',
  '',
  'jobs:',
  '  # ── 1. Type-check ─────────────────────────────────────────────',
  '  typecheck:',
  '    name: Type-check',
  '    runs-on: ubuntu-latest',
  '    defaults:',
  '      run:',
  '        working-directory: ${{ env.WORKING_DIR }}',
  '    steps:',
  '      - uses: actions/checkout@v4',
  '      - uses: actions/setup-node@v4',
  '        with:',
  '          node-version: 20',
  '          cache: npm',
  '          cache-dependency-path: ${{ env.WORKING_DIR }}/package-lock.json',
  '      - run: npm ci',
  '      - run: npm run type-check',
  '',
  '  # ── 2. Deploy to Vercel ────────────────────────────────────────',
  '  deploy:',
  '    name: Deploy',
  '    runs-on: ubuntu-latest',
  '    needs: typecheck',
  '    defaults:',
  '      run:',
  '        working-directory: ${{ env.WORKING_DIR }}',
  '    outputs:',
  '      deployment-url: ${{ steps.deploy.outputs.url }}',
  '    steps:',
  '      - uses: actions/checkout@v4',
  '      - uses: actions/setup-node@v4',
  '        with:',
  '          node-version: 20',
  '          cache: npm',
  '          cache-dependency-path: ${{ env.WORKING_DIR }}/package-lock.json',
  '      - run: npm ci',
  '      - run: npm install -g vercel@latest',
  '      - name: Pull Vercel environment',
  '        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}',
  '      - name: Build',
  '        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}',
  '      - name: Deploy to production',
  '        id: deploy',
  "        if: github.ref == 'refs/heads/main'",
  '        run: |',
  '          URL=$(vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }})',
  '          echo "url=$URL" >> $GITHUB_OUTPUT',
  '          echo "Deployed: $URL"',
  '      - name: Deploy preview (PR)',
  '        if: github.event_name == \'pull_request\'',
  '        run: vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }}',
  '',
  '  # ── 3. E2E tests ─────────────────────────────────────────────',
  '  e2e:',
  '    name: E2E tests',
  '    runs-on: ubuntu-latest',
  '    needs: deploy',
  "    if: always() && needs.deploy.result == 'success'",
  '    defaults:',
  '      run:',
  '        working-directory: ${{ env.WORKING_DIR }}',
  '    steps:',
  '      - uses: actions/checkout@v4',
  '      - uses: actions/setup-node@v4',
  '        with:',
  '          node-version: 20',
  '          cache: npm',
  '          cache-dependency-path: ${{ env.WORKING_DIR }}/package-lock.json',
  '      - run: npm ci',
  '      - name: Install Playwright browsers',
  '        run: npx playwright install chromium --with-deps',
  '      - name: Run E2E tests',
  '        env:',
  '          BASE_URL: ${{ needs.deploy.outputs.deployment-url }}',
  '          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}',
  '          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}',
  '        run: npx playwright test --reporter=dot',
  '      - uses: actions/upload-artifact@v4',
  '        if: failure()',
  '        with:',
  '          name: playwright-report',
  '          path: ${{ env.WORKING_DIR }}/playwright-report/',
  '          retention-days: 7',
].join('\n');

const MIGRATION_STEP = [
  '# Add to your deploy job, before the Vercel build step:',
  '',
  '- name: Apply DB migrations',
  '  env:',
  '    SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}',
  '    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}',
  '  run: |',
  '    # Install Supabase CLI',
  '    npm install -g supabase',
  '',
  '    # Link to project (non-interactive)',
  '    supabase link --project-ref $SUPABASE_PROJECT_ID',
  '',
  '    # Push any pending migrations',
  '    supabase db push --linked',
].join('\n');

const COURSE_PUBLISH_WORKFLOW = [
  '# .github/workflows/publish-course.yml',
  'name: Publish course to TeachRepo',
  '',
  'on:',
  '  push:',
  '    branches: [main]',
  '  workflow_dispatch:',
  '    inputs:',
  '      label:',
  '        description: Version label (e.g. v1.2)',
  '        required: false',
  '',
  'jobs:',
  '  publish:',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - uses: actions/checkout@v4',
  '        with:',
  '          fetch-depth: 0   # needed for version history',
  '',
  '      - uses: actions/setup-node@v4',
  '        with:',
  '          node-version: 20',
  '',
  '      - name: Install TeachRepo CLI',
  '        run: npm install -g @teachrepo/cli',
  '',
  '      - name: Push course',
  '        env:',
  '          TEACHREPO_TOKEN: ${{ secrets.TEACHREPO_TOKEN }}',
  '          TEACHREPO_URL: ${{ secrets.TEACHREPO_URL }}',
  '        run: |',
  '          teachrepo push \\',
  '            --url "$TEACHREPO_URL" \\',
  '            --token "$TEACHREPO_TOKEN" \\',
  "            ${{ github.event.inputs.label && format('--label {0}', github.event.inputs.label) || '' }}",
].join('\n');

const SLACK_STEP = [
  '# Add as a final step in the deploy job:',
  '',
  '- name: Notify Slack on deploy',
  "  if: github.ref == 'refs/heads/main' && success()",
  '  env:',
  '    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}',
  '  run: |',
  "    curl -s -X POST \"$SLACK_WEBHOOK_URL\" \\",
  "      -H 'Content-Type: application/json' \\",
  "      -d '{",
  '        "text": "✅ TeachRepo deployed to production",',
  '        "attachments": [{',
  '          "color": "good",',
  '          "fields": [',
  '            {"title": "Commit", "value": "${{ github.sha }}", "short": true},',
  '            {"title": "Author", "value": "${{ github.actor }}", "short": true},',
  '            {"title": "URL", "value": "${{ needs.deploy.outputs.deployment-url }}", "short": false}',
  '          ]',
  "        }]",
  "      }'",
].join('\n');

function Code({ children }: { children: string }) {
  return (
    <pre className="my-4 overflow-x-auto rounded-xl bg-gray-950 px-5 py-4 text-sm text-green-300 leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function Callout({ type = 'info', children }: { type?: 'info' | 'warn' | 'tip'; children: React.ReactNode }) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warn: 'bg-amber-50 border-amber-200 text-amber-800',
    tip:  'bg-green-50 border-green-200 text-green-800',
  };
  const icons = { info: 'ℹ️', warn: '⚠️', tip: '💡' };
  return (
    <div className={`my-5 rounded-xl border px-5 py-4 text-sm ${styles[type]}`}>
      <span className="mr-2">{icons[type]}</span>{children}
    </div>
  );
}

export default function GitHubActionsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm">
        <a href="/docs" className="text-violet-600 hover:underline">Docs</a>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-600">GitHub Actions</span>
      </nav>

      <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900">GitHub Actions — CI/CD</h1>
      <p className="mb-10 text-lg text-gray-600">
        Deploy TeachRepo automatically on every push to{' '}
        <code className="rounded bg-gray-100 px-1 font-mono text-sm">main</code>,
        run type checks and E2E tests on pull requests, and apply database migrations safely.
      </p>

      {/* ── Complete workflow ── */}
      <section className="mb-14">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Complete deploy workflow</h2>
        <p className="mb-3 text-sm text-gray-700">
          Save as{' '}
          <code className="font-mono text-xs rounded bg-gray-100 px-1">.github/workflows/deploy.yml</code>{' '}
          in your fork root:
        </p>
        <Code>{DEPLOY_WORKFLOW}</Code>
      </section>

      {/* ── Required secrets ── */}
      <section className="mb-14">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Required GitHub secrets</h2>
        <p className="mb-3 text-sm text-gray-700">
          Settings → Secrets and variables → Actions → New repository secret:
        </p>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Secret</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Required?</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Where to get it</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ['VERCEL_TOKEN', 'Yes', 'Vercel → Account Settings → Tokens'],
                ['VERCEL_ORG_ID', 'Yes', 'Vercel dashboard URL or .vercel/project.json'],
                ['VERCEL_PROJECT_ID', 'Yes', '.vercel/project.json after vercel link'],
                ['TEST_USER_EMAIL', 'For E2E', 'Your test account email'],
                ['TEST_USER_PASSWORD', 'For E2E', 'Your test account password'],
                ['SLACK_WEBHOOK_URL', 'Optional', 'Slack → Incoming Webhooks app'],
              ].map(([secret, req, note]) => (
                <tr key={secret} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-800">{secret}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{req}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout type="info">
          Vercel env vars (Supabase keys, Stripe keys, etc.) are pulled automatically by{' '}
          <code className="mx-1 font-mono text-xs">vercel pull</code> in the workflow — you
          do not need to duplicate them as GitHub secrets.
        </Callout>
      </section>

      {/* ── DB migrations ── */}
      <section className="mb-14">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Database migrations</h2>
        <p className="mb-3 text-sm text-gray-700">
          Schema changes are plain SQL files in{' '}
          <code className="font-mono text-xs rounded bg-gray-100 px-1">supabase/migrations/</code>.
          Apply them from CI using the Supabase CLI:
        </p>
        <Code>{MIGRATION_STEP}</Code>
        <p className="mt-3 text-sm text-gray-700">
          Add <code className="font-mono text-xs">SUPABASE_PROJECT_ID</code> (the short ref, e.g.{' '}
          <code className="font-mono text-xs">zkwyfjrg</code>) and{' '}
          <code className="font-mono text-xs">SUPABASE_ACCESS_TOKEN</code> (from{' '}
          <a href="https://app.supabase.com/account/tokens" className="text-violet-600 hover:underline" target="_blank" rel="noopener noreferrer">
            supabase.com/account/tokens
          </a>) as GitHub secrets.
        </p>
        <Callout type="warn">
          Always commit migration files before merging a PR that requires them. The migration
          apply step runs before the build so the app has the schema it expects on deploy.
        </Callout>
      </section>

      {/* ── Course auto-publish ── */}
      <section className="mb-14">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Auto-publish courses on push</h2>
        <p className="mb-3 text-sm text-gray-700">
          Add this workflow to your <strong>course repository</strong> (not the app repo) to
          auto-publish whenever you push to <code className="font-mono text-xs">main</code>:
        </p>
        <Code>{COURSE_PUBLISH_WORKFLOW}</Code>
        <p className="mt-3 text-sm text-gray-700">
          Get your <code className="font-mono text-xs">TEACHREPO_TOKEN</code> from{' '}
          <a href="/dashboard/settings" className="text-violet-600 hover:underline">
            /dashboard/settings
          </a>{' '}
          → API tokens.
        </p>
      </section>

      {/* ── Slack notifications ── */}
      <section className="mb-14">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Slack deploy notifications (optional)</h2>
        <Code>{SLACK_STEP}</Code>
      </section>

      {/* ── Links ── */}
      <div className="flex flex-wrap gap-3">
        <a href="/docs/self-hosting" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          ← Self-Hosting Guide
        </a>
        <a href="/docs/cli-reference" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          CLI Reference →
        </a>
        <a href="/docs/pricing" className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100">
          Pricing & Billing →
        </a>
      </div>
    </div>
  );
}
