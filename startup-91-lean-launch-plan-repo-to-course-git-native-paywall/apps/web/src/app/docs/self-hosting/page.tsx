import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Self-Hosting Guide — TeachRepo Docs',
  description:
    'Deploy TeachRepo on your own infrastructure: fork the template, set up Supabase + Stripe, deploy to Vercel or any Node host, and automate with GitHub Actions.',
};

function Code({ children, lang = '' }: { children: string; lang?: string }) {
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

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-12">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
          {n}
        </span>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>
      <div className="pl-11">{children}</div>
    </div>
  );
}

const GHA_WORKFLOW = `# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  VERCEL_ORG_ID: \${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: \${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: startup-91-lean-launch-plan-repo-to-course-git-native-paywall/apps/web

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: |
            startup-91-lean-launch-plan-repo-to-course-git-native-paywall/apps/web/package-lock.json

      - run: npm ci

      - name: Type-check
        run: npm run type-check

      - name: Install Vercel CLI
        run: npm install -g vercel@latest

      - name: Pull Vercel env
        run: vercel pull --yes --environment=production --token=\${{ secrets.VERCEL_TOKEN }}

      - name: Build
        run: vercel build --prod --token=\${{ secrets.VERCEL_TOKEN }}

      - name: Deploy
        if: github.ref == 'refs/heads/main'
        run: vercel deploy --prebuilt --prod --token=\${{ secrets.VERCEL_TOKEN }}`;

export default function SelfHostingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm">
        <a href="/docs" className="text-violet-600 hover:underline">Docs</a>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-600">Self-Hosting</span>
      </nav>

      <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900">Self-Hosting Guide</h1>
      <p className="mb-6 text-lg text-gray-600">
        TeachRepo is <strong>MIT-licensed</strong>. Fork the template, wire up Supabase + Stripe,
        and deploy anywhere Node runs — Vercel, Railway, Fly.io, a plain VPS.
        No platform fees. No lock-in.
      </p>

      <Callout type="tip">
        <strong>Time to deploy: ~20 minutes</strong> for a fresh Vercel + Supabase setup using the
        one-click template. The GitHub Actions workflow then handles every subsequent deploy on push.
      </Callout>

      {/* ── Prerequisites ── */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Prerequisites</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          {[
            ['Node.js 18+', 'Check: node -v'],
            ['npm or pnpm', 'Check: npm -v'],
            ['Git', 'For repo-based course imports and the CLI'],
            ['Vercel account', 'Free tier works — vercel.com'],
            ['Supabase project', 'Free tier works up to ~50k rows — supabase.com'],
            ['Stripe account', 'Test mode is fine for dev — stripe.com'],
            ['GitHub account', 'For repo imports and CI/CD with GitHub Actions'],
          ].map(([name, note]) => (
            <li key={name} className="flex items-start gap-3">
              <span className="text-violet-500 mt-0.5 shrink-0">→</span>
              <span><strong>{name}</strong> — <span className="text-gray-500">{note}</span></span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Steps ── */}
      <Step n={1} title="Fork and clone the template">
        <p className="mb-3 text-sm text-gray-700">
          The full source is in the <code className="rounded bg-gray-100 px-1 font-mono text-xs">openclaw-workspace</code> monorepo.
          The web app lives at <code className="rounded bg-gray-100 px-1 font-mono text-xs">startup-91-lean-launch-plan-repo-to-course-git-native-paywall/apps/web/</code>.
        </p>
        <Code>{`# Fork on GitHub first, then:
git clone https://github.com/YOUR_ORG/YOUR_FORK.git
cd YOUR_FORK/startup-91-lean-launch-plan-repo-to-course-git-native-paywall/apps/web

npm install`}</Code>
        <Callout type="info">
          The monorepo root contains <code>startup-*/</code> directories. The teachrepo web app
          is entirely self-contained in <code>apps/web/</code> with its own <code>package.json</code>.
        </Callout>
      </Step>

      <Step n={2} title="Set up Supabase">
        <p className="mb-3 text-sm text-gray-700">
          Create a new project at <a href="https://supabase.com" className="text-violet-600 hover:underline" target="_blank" rel="noopener noreferrer">supabase.com</a>.
          Then apply the schema:
        </p>
        <Code>{`# In the Supabase SQL editor, run both files in order:
# 1. supabase/schema.sql   — tables, indexes, enums
# 2. supabase/rls.sql      — row-level security policies`}</Code>
        <p className="mt-4 mb-3 text-sm text-gray-700">
          Grab your credentials from <strong>Project Settings → API</strong>:
        </p>
        <ul className="space-y-1 text-sm text-gray-600 font-mono">
          <li><code>NEXT_PUBLIC_SUPABASE_URL</code> — Project URL (e.g. <code>https://xxxx.supabase.co</code>)</li>
          <li><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> — public anon key</li>
          <li><code>SUPABASE_SERVICE_ROLE_KEY</code> — secret service role key (never expose client-side)</li>
        </ul>
        <Callout type="warn">
          <code>SUPABASE_SERVICE_ROLE_KEY</code> bypasses RLS. Keep it server-only.
          Never put it in <code>NEXT_PUBLIC_*</code> env vars.
        </Callout>

        <h3 className="mt-6 mb-2 font-semibold text-gray-900">Enable email auth</h3>
        <p className="text-sm text-gray-700">
          Authentication → Email → Enable email confirmations. For development you can disable
          email confirmation to skip the verify step.
        </p>

        <h3 className="mt-6 mb-2 font-semibold text-gray-900">Storage bucket (optional)</h3>
        <p className="text-sm text-gray-700">
          Create a public bucket named <code className="rounded bg-gray-100 px-1 font-mono text-xs">course-assets</code> for
          cover images and attachments. The app falls back gracefully if the bucket is absent.
        </p>
      </Step>

      <Step n={3} title="Set up Stripe">
        <p className="mb-3 text-sm text-gray-700">
          Log in to <a href="https://dashboard.stripe.com" className="text-violet-600 hover:underline" target="_blank" rel="noopener noreferrer">dashboard.stripe.com</a>.
          In test mode, collect your keys:
        </p>
        <ul className="space-y-1 text-sm text-gray-600 font-mono mb-4">
          <li><code>STRIPE_SECRET_KEY</code> — starts with <code>sk_test_</code></li>
          <li><code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> — starts with <code>pk_test_</code></li>
          <li><code>STRIPE_WEBHOOK_SECRET</code> — generated when you create a webhook endpoint</li>
        </ul>

        <h3 className="mb-2 font-semibold text-gray-900">Create webhook endpoint</h3>
        <p className="mb-3 text-sm text-gray-700">
          In Stripe Dashboard → Developers → Webhooks → Add endpoint:
        </p>
        <Code>{`# Endpoint URL:
https://YOUR_DOMAIN/api/webhooks/stripe

# Events to listen for:
checkout.session.completed
invoice.payment_succeeded
customer.subscription.updated
customer.subscription.deleted`}</Code>
        <p className="mt-3 text-sm text-gray-700">
          Copy the <strong>Signing secret</strong> (starts with <code className="font-mono">whsec_</code>)
          into <code className="font-mono">STRIPE_WEBHOOK_SECRET</code>.
        </p>

        <h3 className="mt-6 mb-2 font-semibold text-gray-900">Course paywall pricing</h3>
        <p className="mb-3 text-sm text-gray-700">
          Course prices are set per-course in the dashboard — no hard-coded Stripe price IDs needed.
          The import pipeline creates a Stripe Price on first publish.
        </p>
        <Callout type="tip">
          For local webhook testing, use the Stripe CLI:<br />
          <code className="font-mono text-xs">stripe listen --forward-to localhost:3000/api/webhooks/stripe</code>
        </Callout>
      </Step>

      <Step n={4} title="Configure environment variables">
        <p className="mb-3 text-sm text-gray-700">
          Copy the example env file and fill in your values:
        </p>
        <Code>{`cp .env.example .env.local`}</Code>
        <p className="mb-3 text-sm text-gray-700">
          Minimum required variables:
        </p>
        <Code>{`# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000   # or https://yourdomain.com in prod

# GitHub (for repo-based imports)
GITHUB_TOKEN=ghp_...   # GitHub PAT with repo read scope`}</Code>
        <Callout type="info">
          Optional variables (AI quiz generation, analytics, PostHog, etc.) are documented
          in <code>.env.example</code>. The app boots without them — features degrade gracefully.
        </Callout>
      </Step>

      <Step n={5} title="Run locally">
        <Code>{`npm run dev
# → http://localhost:3000

# Type-check:
npm run type-check

# Build for production:
npm run build
npm start`}</Code>
        <p className="mt-3 text-sm text-gray-700">
          The first time you visit <code className="font-mono text-xs">/auth/signup</code>, create
          your founder account. The first signup auto-receives admin privileges if{' '}
          <code className="font-mono text-xs">FOUNDER_EMAIL</code> is set in env.
        </p>
      </Step>

      <Step n={6} title="Deploy to Vercel">
        <h3 className="mb-2 font-semibold text-gray-900">Option A — Vercel CLI (quickest)</h3>
        <Code>{`# From apps/web/
npx vercel --prod

# Follow prompts: link to your Vercel project, select framework = Next.js
# Set env vars when prompted, or add them in the Vercel dashboard`}</Code>

        <h3 className="mt-6 mb-2 font-semibold text-gray-900">Option B — Vercel dashboard import</h3>
        <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
          <li>New Project → Import Git Repository → select your fork</li>
          <li>Set <strong>Root Directory</strong> to <code className="font-mono text-xs">startup-91-lean-launch-plan-repo-to-course-git-native-paywall/apps/web</code></li>
          <li>Framework preset: <strong>Next.js</strong></li>
          <li>Add all env vars (see Step 4) in the Environment Variables section</li>
          <li>Deploy</li>
        </ol>

        <h3 className="mt-6 mb-2 font-semibold text-gray-900">Add your custom domain</h3>
        <Code>{`vercel domains add yourdomain.com
# Then set the A record / CNAME in your DNS provider per Vercel's instructions`}</Code>
        <p className="mt-2 text-sm text-gray-700">
          Update <code className="font-mono text-xs">NEXT_PUBLIC_APP_URL</code> to your custom
          domain and redeploy.
        </p>
      </Step>

      <Step n={7} title="Automate with GitHub Actions">
        <p className="mb-3 text-sm text-gray-700">
          Add this workflow to your fork for automatic deploy-on-push:
        </p>
        <Code>{GHA_WORKFLOW}</Code>

        <h3 className="mt-5 mb-2 font-semibold text-gray-900">GitHub Secrets to set</h3>
        <div className="rounded-xl border border-gray-200 overflow-hidden text-sm">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Secret name</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Where to get it</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ['VERCEL_TOKEN', 'Vercel → Account Settings → Tokens'],
                ['VERCEL_ORG_ID', 'vercel.com/account → General → Your ID, or .vercel/project.json'],
                ['VERCEL_PROJECT_ID', '.vercel/project.json after first vercel link'],
                ['SUPABASE_SERVICE_ROLE_KEY', 'Supabase → Project Settings → API'],
                ['STRIPE_SECRET_KEY', 'Stripe Dashboard → Developers → API keys'],
                ['STRIPE_WEBHOOK_SECRET', 'Stripe Dashboard → Developers → Webhooks'],
              ].map(([secret, note]) => (
                <tr key={secret}>
                  <td className="px-4 py-2 font-mono text-xs text-gray-800">{secret}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Go to your GitHub repo → Settings → Secrets and variables → Actions → New repository secret.
        </p>
      </Step>

      <Step n={8} title="(Optional) Run the TeachRepo CLI">
        <p className="mb-3 text-sm text-gray-700">
          The CLI lets you push course updates directly from your local repo:
        </p>
        <Code>{`npm install -g @teachrepo/cli

# Authenticate (generates an API token for your account)
teachrepo login

# In your course repo:
teachrepo push --url https://yourdomain.com

# Push a specific branch as a version
teachrepo push --branch v1.2 --label "v1.2"`}</Code>
        <p className="mt-3 text-sm text-gray-700">
          See the full <a href="/docs/cli-reference" className="text-violet-600 hover:underline">CLI Reference</a> for
          all commands.
        </p>
      </Step>

      <Step n={9} title="(Optional) Deploy on Railway or Fly.io">
        <p className="mb-3 text-sm text-gray-700">
          TeachRepo is a standard Next.js app. Any platform that runs Node 18+ works.
        </p>

        <h3 className="mb-2 font-semibold text-gray-900">Railway</h3>
        <Code>{`# railway.toml (place in apps/web/)
[build]
builder = "nixpacks"
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
restartPolicyType = "on_failure"`}</Code>

        <h3 className="mt-5 mb-2 font-semibold text-gray-900">Fly.io</h3>
        <Code>{`# From apps/web/:
fly launch --name teachrepo-app --region iad
fly secrets set NEXT_PUBLIC_SUPABASE_URL=... STRIPE_SECRET_KEY=... # etc.
fly deploy`}</Code>

        <h3 className="mt-5 mb-2 font-semibold text-gray-900">Docker (VPS / bare metal)</h3>
        <Code>{`FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]`}</Code>
        <Callout type="info">
          Add <code>output: 'standalone'</code> to <code>next.config.js</code> to enable the
          minimal Docker image (Next.js docs: <a href="https://nextjs.org/docs/app/api-reference/next-config-js/output" className="text-violet-600 hover:underline" target="_blank" rel="noopener noreferrer">output: standalone</a>).
        </Callout>
      </Step>

      {/* ── Differences vs Hosted ── */}
      <section className="mb-14">
        <h2 className="mb-5 text-2xl font-bold text-gray-900">Self-hosted vs. Hosted SaaS — differences</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Aspect</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Self-hosted</th>
                <th className="px-4 py-3 text-center font-semibold text-violet-700">Hosted (Creator plan)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ['Cost', 'Infra costs only (Vercel/Supabase free tiers = $0/mo)', '$29/mo managed'],
                ['Course limit', 'Unlimited (you own the DB)', '→ Unlimited (plan unlocked)'],
                ['Lesson limit', 'Unlimited', '→ Unlimited'],
                ['Custom domain', 'Yes — configure in Vercel', 'Yes — one-click in dashboard'],
                ['Stripe account', 'Your own', 'Your own (Connect)'],
                ['Platform fee', '0%', '0% direct, 10% marketplace'],
                ['Marketplace listing', 'No (self-hosted not indexed)', 'Yes'],
                ['Updates', 'Manual — merge upstream PRs', 'Automatic'],
                ['Devops burden', 'You manage Supabase, Vercel, webhooks', 'Managed for you'],
                ['Data ownership', 'Full — your Supabase project', 'Full — export anytime'],
                ['AI quiz generation', 'Unlimited (bring your own key)', 'Unlimited (included)'],
                ['Support', 'GitHub Issues / community', 'Priority email support'],
              ].map(([aspect, self, hosted]) => (
                <tr key={aspect} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-700">{aspect}</td>
                  <td className="px-4 py-2.5 text-center text-gray-500 text-xs">{self}</td>
                  <td className="px-4 py-2.5 text-center text-violet-700 text-xs font-medium">{hosted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Upgrading self-hosted ── */}
      <section className="mb-14">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Keeping your fork up to date</h2>
        <p className="mb-3 text-sm text-gray-700">
          Add the upstream remote and merge new releases:
        </p>
        <Code>{`git remote add upstream https://github.com/ErlisK/openclaw-workspace.git

# Check for new commits:
git fetch upstream

# Merge latest:
git merge upstream/main

# Or cherry-pick specific commits:
git cherry-pick <commit-sha>`}</Code>
        <Callout type="warn">
          Check the <a href="https://github.com/ErlisK/openclaw-workspace/releases" className="text-violet-600 hover:underline" target="_blank" rel="noopener noreferrer">release notes</a> before
          merging — database schema migrations need to be applied manually to your Supabase project
          via the SQL editor.
        </Callout>
      </section>

      {/* ── Troubleshooting ── */}
      <section className="mb-14">
        <h2 className="mb-5 text-2xl font-bold text-gray-900">Troubleshooting</h2>
        <div className="space-y-5">
          {[
            {
              problem: 'Stripe webhook returns 400 "No signatures found"',
              fix: 'Make sure STRIPE_WEBHOOK_SECRET matches the signing secret for the endpoint in your Stripe dashboard. For local dev, use the Stripe CLI to forward events.',
            },
            {
              problem: 'Supabase RLS blocking all reads',
              fix: 'Check that you applied supabase/rls.sql. If testing, temporarily disable RLS on a table via the Supabase dashboard to isolate the issue.',
            },
            {
              problem: 'Build fails with "SUPABASE_SERVICE_ROLE_KEY not found"',
              fix: 'Add the secret to Vercel env vars (Dashboard → Project → Settings → Environment Variables) or to your .env.local file.',
            },
            {
              problem: 'GitHub import returns 404',
              fix: 'Make sure GITHUB_TOKEN has repo read scope and the repo is not private (or the token has access to private repos).',
            },
            {
              problem: 'Vercel deploy fails with "Build Error"',
              fix: 'Run npm run build locally first. The most common cause is a missing env var — check the build log for "undefined" values.',
            },
          ].map(({ problem, fix }) => (
            <div key={problem} className="rounded-lg border border-gray-200 p-4">
              <p className="font-semibold text-gray-900 text-sm">❌ {problem}</p>
              <p className="mt-1.5 text-sm text-gray-600">✅ {fix}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Help ── */}
      <div className="rounded-xl bg-violet-50 border border-violet-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Need help?</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>📧 <a href="mailto:hello@teachrepo.com" className="text-violet-600 hover:underline">hello@teachrepo.com</a></li>
          <li>🐛 <a href="https://github.com/ErlisK/openclaw-workspace/issues" className="text-violet-600 hover:underline" target="_blank" rel="noopener noreferrer">GitHub Issues</a></li>
          <li>📖 <a href="/docs" className="text-violet-600 hover:underline">Full docs index</a></li>
        </ul>
      </div>
    </div>
  );
}
