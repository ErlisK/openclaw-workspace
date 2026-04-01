import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — FocusDo",
  description: "How FocusDo handles your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-svh bg-[#0a0a0a] text-gray-300">
      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* Back */}
        <a href="/"
          className="inline-flex items-center gap-2 text-xs text-gray-600 hover:text-gray-400 mb-8 transition-colors">
          ← Back to FocusDo
        </a>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-emerald-400 font-bold text-sm">FocusDo</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-100 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500">
            Effective date: <time dateTime="2026-04-01">April 1, 2026</time> · Version 0.1
          </p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-gray-400">

          {/* Summary callout */}
          <div className="p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/20 not-prose">
            <p className="text-sm text-emerald-400 font-medium mb-1">Short version</p>
            <p className="text-xs text-emerald-700 leading-relaxed">
              FocusDo stores your tasks <strong className="text-emerald-600">only on your device</strong> (browser localStorage).
              We don&apos;t sell your data. We don&apos;t share it with third parties except
              the analytics and error tools listed below, and only when you have an account.
            </p>
          </div>

          <Section title="1. What we collect">
            <p>
              <strong className="text-gray-300">Without an account (local mode):</strong> Nothing is sent to our servers.
              Your tasks and usage events are stored in your browser&apos;s <code>localStorage</code>.
              Clearing your browser data will delete all your tasks.
            </p>
            <p>
              <strong className="text-gray-300">With an account (sync mode):</strong> When you sign in with a magic link,
              we store your email address and your task data in our database (Supabase, hosted in the EU).
              Your data is protected by Row-Level Security — only you can read or write your own tasks.
            </p>
            <p>
              <strong className="text-gray-300">Analytics events:</strong> When configured, we send anonymous usage
              events to PostHog (e.g., &ldquo;task created&rdquo;, &ldquo;keyboard shortcut used&rdquo;).
              These events contain no task content — only action type, timestamp, and a random session ID.
              <code>autocapture</code> is disabled; we only send manually defined events.
            </p>
            <p>
              <strong className="text-gray-300">Error reports:</strong> When configured, JavaScript errors are reported
              to Sentry with a stack trace and browser metadata. No task content is included.
            </p>
          </Section>

          <Section title="2. What we do NOT collect">
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>The content of your tasks (never sent to analytics or error tools)</li>
              <li>Your IP address (beyond what your browser normally sends in HTTP requests)</li>
              <li>Cookies (we use <code>localStorage</code> and <code>sessionStorage</code> only)</li>
              <li>Payment information (FocusDo is currently free)</li>
              <li>Third-party tracking pixels or ad networks</li>
            </ul>
          </Section>

          <Section title="3. Data storage & security">
            <p>
              <strong className="text-gray-300">Local mode:</strong> Data lives in your browser.
              It is never transmitted to any server.
            </p>
            <p>
              <strong className="text-gray-300">Sync mode:</strong> Data is stored in Supabase (PostgreSQL)
              with row-level security enabled. All connections use TLS 1.2+.
              We run daily backups retained for 30 days.
            </p>
            <p>
              <strong className="text-gray-300">Soft-delete:</strong> When you delete a task, it is marked
              with <code>status=&apos;deleted&apos;</code> and removed from your view, but retained for 90 days
              before permanent erasure to allow recovery. You can request immediate deletion (see §6).
            </p>
          </Section>

          <Section title="4. Third-party services">
            <table className="w-full text-xs border-collapse not-prose">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="text-left py-2 text-gray-500 font-medium">Service</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Purpose</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Data sent</th>
                </tr>
              </thead>
              <tbody className="text-gray-500 divide-y divide-[#1a1a1a]">
                <tr><td className="py-2 pr-4">Vercel</td><td className="py-2 pr-4">Hosting</td><td className="py-2">Request logs (standard HTTP)</td></tr>
                <tr><td className="py-2 pr-4">Supabase</td><td className="py-2 pr-4">Auth + database (sync mode only)</td><td className="py-2">Email, task data</td></tr>
                <tr><td className="py-2 pr-4">PostHog</td><td className="py-2 pr-4">Usage analytics</td><td className="py-2">Anonymous events (no task content)</td></tr>
                <tr><td className="py-2 pr-4">Sentry</td><td className="py-2 pr-4">Error monitoring</td><td className="py-2">Stack traces (no task content)</td></tr>
              </tbody>
            </table>
          </Section>

          <Section title="5. Data retention">
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong className="text-gray-300">Active tasks:</strong> Retained until you delete or export them</li>
              <li><strong className="text-gray-300">Soft-deleted tasks:</strong> Retained 90 days then permanently erased</li>
              <li><strong className="text-gray-300">Analytics events:</strong> 90 days in PostHog (free tier)</li>
              <li><strong className="text-gray-300">Error logs:</strong> 30 days in Sentry</li>
              <li><strong className="text-gray-300">Auth sessions:</strong> 30 days of inactivity, then expired</li>
            </ul>
          </Section>

          <Section title="6. Your rights">
            <p>
              You have the right to access, correct, export, or delete your data at any time.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>
                <strong className="text-gray-300">Export:</strong> Use the &ldquo;Export&rdquo; button (📊 → Export) to download your tasks as CSV or JSON
              </li>
              <li>
                <strong className="text-gray-300">Delete (local):</strong> Clear <code>focusdo:tasks</code> from browser localStorage
              </li>
              <li>
                <strong className="text-gray-300">Delete (account):</strong> Email{" "}
                <a href="mailto:privacy@focusdo.app" className="text-emerald-600 hover:text-emerald-400">
                  privacy@focusdo.app
                </a>{" "}
                with subject &ldquo;Delete my account&rdquo;
              </li>
            </ul>
          </Section>

          <Section title="7. Children">
            <p>
              FocusDo is not directed at children under 13.
              We do not knowingly collect personal information from children under 13.
            </p>
          </Section>

          <Section title="8. Changes to this policy">
            <p>
              We will post any changes to this page and update the effective date above.
              Material changes will be announced via the app or email (if you have an account).
            </p>
          </Section>

          <Section title="9. Contact">
            <p>
              Questions? Email us at{" "}
              <a href="mailto:privacy@focusdo.app" className="text-emerald-500 hover:text-emerald-400">
                privacy@focusdo.app
              </a>
            </p>
          </Section>

        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-[#1e1e1e] flex items-center justify-between text-[11px] text-gray-700">
          <span>© 2026 FocusDo</span>
          <div className="flex gap-4">
            <a href="/terms" className="hover:text-gray-500 transition-colors">Terms</a>
            <a href="/" className="hover:text-gray-500 transition-colors">App</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-gray-200 mb-3">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}
