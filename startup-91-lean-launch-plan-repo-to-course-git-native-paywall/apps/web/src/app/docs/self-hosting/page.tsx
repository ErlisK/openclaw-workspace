import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Self-Hosting Guide — TeachRepo Docs',
  description: 'Deploy TeachRepo on your own infrastructure with full control.',
};

function Code({ children }: { children: string }) {
  return (
    <pre className="my-3 overflow-x-auto rounded-lg bg-gray-900 px-4 py-3 text-sm text-green-300">
      <code>{children}</code>
    </pre>
  );
}

export default function SelfHostingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      <nav className="mb-8 text-sm">
        <a href="/docs" className="text-violet-600 hover:underline">Docs</a>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-600">Self-Hosting</span>
      </nav>

      <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900">Self-Hosting Guide</h1>
      <p className="mb-12 text-lg text-gray-600">
        Deploy TeachRepo on your own infrastructure. You get full control, zero platform fees,
        and can use your own Stripe account. Requires basic devops familiarity.
      </p>

      <h2 className="mb-4 text-2xl font-bold text-gray-900">Prerequisites</h2>
      <ul className="mb-8 space-y-2 text-sm text-gray-700">
        {[
          'Node.js 18+ and npm',
          'A Vercel account (free tier works) — or any Node-compatible host',
          'A Supabase project (free tier works for up to ~50k rows)',
          'A Stripe account (test mode is fine for development)',
          'A GitHub account (for repo imports)',
        ].map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="text-violet-500 mt-0.5">→</span>
            {item}
          </li>
        ))}
      </ul>

      <h2 className="mb-4 text-2xl font-bold text-gray-900">1. Clone the repo</h2>
      <Code>{`git clone https://github.com/ErlisK/openclaw-workspace.git
cd openclaw-workspace/startup-91-lean-launch-plan-repo-to-course-git-native-paywall/apps/web`}</Code>

      <h2 className="mb-4 mt-10 text-2xl font-bold text-gray-900">2. Set up Supabase</h2>
      <p className="mb-3 text-sm text-gray-700">
        Create a new Supabase project at <a href="https://supabase.com" className="text-violet-600 hover:underline">supabase.com</a>.
        Then run the schema migration:
      </p>
      <Code>{`# From the Supabase dashboard SQL editor, run:
# supabase/schema.sql
# supabase/rls.sql`}</Code>
      <p className="mb-3 text-sm text-gray-700">
        Copy your Supabase project URL and anon key from Project Settings → API.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-bold text-gray-900">3. Configure environment variables</h2>
      <p className="mb-3 text-sm text-gray-700">
        Create a <code className="bg-gray-100 px-1 rounded text-xs">.env.local</code> file:
      </p>
      <Code>{`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_APP_URL=https://yourdomain.com
STRIPE_WEBHOOK_SECRET=whsec_...`}</Code>

      <h2 className="mb-4 mt-10 text-2xl font-bold text-gray-900">4. Configure Stripe webhooks</h2>
      <p className="mb-3 text-sm text-gray-700">
        In Stripe Dashboard → Developers → Webhooks, add an endpoint:
      </p>
      <Code>{`https://yourdomain.com/api/webhooks/stripe`}</Code>
      <p className="mb-3 text-sm text-gray-700">Enable these events:</p>
      <Code>{`checkout.session.completed
checkout.session.expired
charge.refunded`}</Code>
      <p className="mb-3 text-sm text-gray-700">
        Copy the webhook signing secret into <code>STRIPE_WEBHOOK_SECRET</code>.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-bold text-gray-900">5. Deploy to Vercel</h2>
      <Code>{`npm install -g vercel
vercel login
vercel --prod`}</Code>
      <p className="mb-3 text-sm text-gray-700">
        Vercel will prompt you for a project name and auto-detect the Next.js framework.
        Add your environment variables in Vercel Dashboard → Settings → Environment Variables.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-bold text-gray-900">6. Custom domain</h2>
      <Code>{`vercel domains add yourdomain.com`}</Code>
      <p className="mb-3 text-sm text-gray-700">
        Add the DNS records Vercel gives you (A record + CNAME) to your DNS provider.
        Then update <code>NEXT_PUBLIC_APP_URL</code> to your domain.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-bold text-gray-900">7. (Optional) AI quiz generation</h2>
      <p className="mb-3 text-sm text-gray-700">
        AI quiz generation uses the Vercel AI Gateway and requires deploying on Vercel
        (the OIDC token is injected at Vercel runtime). If you deploy elsewhere,
        set <code className="bg-gray-100 px-1 rounded text-xs">ANTHROPIC_API_KEY</code> and update
        the quiz generate route to use it directly.
      </p>

      <div className="mt-12 rounded-xl bg-violet-50 p-6">
        <h2 className="mb-2 font-semibold text-gray-900">Need help?</h2>
        <p className="text-sm text-gray-600">
          Open an issue on{' '}
          <a href="https://github.com/ErlisK/openclaw-workspace" className="text-violet-600 hover:underline">
            GitHub
          </a>{' '}
          or email{' '}
          <a href="mailto:hello@teachrepo.com" className="text-violet-600 hover:underline">
            hello@teachrepo.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}
