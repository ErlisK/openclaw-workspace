import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — FocusDo",
  description: "Terms of service for FocusDo.",
};

export default function TermsPage() {
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
          <h1 className="text-2xl font-bold text-gray-100 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500">
            Effective date: <time dateTime="2026-04-01">April 1, 2026</time> · Version 0.1
          </p>
        </div>

        <div className="space-y-8 text-sm text-gray-400 leading-relaxed">

          {/* Summary callout */}
          <div className="p-4 rounded-xl bg-blue-500/8 border border-blue-500/20">
            <p className="text-sm text-blue-400 font-medium mb-1">Short version</p>
            <p className="text-xs text-blue-700 leading-relaxed">
              FocusDo is a personal productivity tool. Use it to manage your tasks.
              Don&apos;t use it to harm others. We provide it as-is during the MVP period.
              We&apos;ll give you reasonable notice before making material changes.
            </p>
          </div>

          <Section title="1. Acceptance">
            <p>
              By using FocusDo (&ldquo;the Service&rdquo;, &ldquo;the App&rdquo;), you agree to these Terms.
              If you do not agree, please do not use the Service.
            </p>
            <p>
              These Terms apply to all users, including those using the app without an account (&ldquo;local mode&rdquo;).
            </p>
          </Section>

          <Section title="2. Description of the Service">
            <p>
              FocusDo is a keyboard-first task management application that helps you focus on
              up to 3 tasks per day. It is available at{" "}
              <a href="https://focusdo-rho.vercel.app" className="text-emerald-500 hover:text-emerald-400" target="_blank" rel="noopener noreferrer">
                focusdo-rho.vercel.app
              </a>.
            </p>
            <p>
              The Service is provided in &ldquo;MVP&rdquo; (Minimum Viable Product) form during the initial
              validation period. Features may change, be added, or be removed without prior notice
              during this period.
            </p>
          </Section>

          <Section title="3. Accounts">
            <p>
              You may use FocusDo without an account. Task data will be stored locally in your browser.
            </p>
            <p>
              If you create an account (via magic-link email), you are responsible for:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Providing a valid email address</li>
              <li>Keeping your account secure</li>
              <li>All activity that occurs under your account</li>
            </ul>
            <p>
              We reserve the right to terminate accounts that violate these Terms.
            </p>
          </Section>

          <Section title="4. Acceptable use">
            <p>You agree not to:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorised access to other users&apos; data</li>
              <li>Reverse-engineer, scrape, or abuse the API in ways that degrade service for others</li>
              <li>Use the Service to store or transmit malicious code</li>
            </ul>
          </Section>

          <Section title="5. Your data">
            <p>
              You own your task data. We do not claim any intellectual property rights over your content.
            </p>
            <p>
              By using the sync feature (account mode), you grant us a limited licence to store and
              process your data solely to provide the Service.
            </p>
            <p>
              You may export or delete your data at any time. See our{" "}
              <a href="/privacy" className="text-emerald-500 hover:text-emerald-400">Privacy Policy</a> for details.
            </p>
          </Section>

          <Section title="6. Intellectual property">
            <p>
              The FocusDo application, its design, and all non-user-generated content are owned by
              the FocusDo team. The source code is available on GitHub under the MIT licence
              (see repository for details).
            </p>
          </Section>

          <Section title="7. Disclaimers & limitation of liability">
            <div className="p-3 rounded-lg bg-[#141414] border border-[#252525] space-y-2">
              <p>
                THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND,
                EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
                PURPOSE, OR NON-INFRINGEMENT.
              </p>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT,
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA,
                ARISING FROM YOUR USE OF THE SERVICE.
              </p>
            </div>
            <p>
              In particular: FocusDo is an MVP. During the MVP period, we make no guarantees of
              uptime, data persistence, or feature availability. We strongly recommend using the
              export feature to keep local backups of important tasks.
            </p>
          </Section>

          <Section title="8. Indemnification">
            <p>
              You agree to indemnify and hold harmless FocusDo and its operators from any claims,
              losses, or damages arising from your violation of these Terms.
            </p>
          </Section>

          <Section title="9. Changes to the Service">
            <p>
              We may modify or discontinue the Service at any time. For material changes, we will
              provide reasonable notice via the app or email (if you have an account).
            </p>
            <p>
              We will update the version and effective date of these Terms when they change.
              Continued use of the Service after changes constitutes acceptance of the updated Terms.
            </p>
          </Section>

          <Section title="10. Governing law">
            <p>
              These Terms are governed by the laws of the jurisdiction in which FocusDo is operated,
              without regard to conflict of law principles. Any disputes shall be resolved in the
              courts of that jurisdiction.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              Questions about these Terms? Contact us at{" "}
              <a href="mailto:hello@focusdo.app" className="text-emerald-500 hover:text-emerald-400">
                hello@focusdo.app
              </a>
            </p>
          </Section>

        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-[#1e1e1e] flex items-center justify-between text-[11px] text-gray-700">
          <span>© 2026 FocusDo</span>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-gray-500 transition-colors">Privacy</a>
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
      <div className="space-y-3">{children}</div>
    </section>
  );
}
