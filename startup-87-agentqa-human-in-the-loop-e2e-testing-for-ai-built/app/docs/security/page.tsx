import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Security & Sandbox Limitations — BetaWindow Docs',
  description: 'Learn how BetaWindow secures the testing sandbox, what URLs are allowed, proxy restrictions, and data handling policies.',
}

export default function SecurityPage() {
  return (
    <article data-testid="docs-security">
      <h1>Security &amp; Sandbox Limitations</h1>
      <p className="lead text-xl text-gray-600 mb-8">
        BetaWindow captures sensitive data (network logs, console output) on behalf of job creators.
        This page explains how we handle that data, what protections are in place, and what
        the sandbox cannot do.
      </p>

      <h2>Tester sandbox</h2>
      <p>
        Each testing session runs in an isolated Chrome browser context (separate profile, no shared
        cookies or storage). The browser is instrumented via a content script that intercepts:
      </p>
      <ul>
        <li>All XHR / fetch network requests (URL, method, status, response size, timing)</li>
        <li>Browser console messages (log, warn, error, debug)</li>
        <li>Unhandled JavaScript errors (uncaught exceptions + promise rejections)</li>
        <li>Page navigation events (route changes, full-page loads)</li>
      </ul>
      <p>
        <strong>Response bodies are not captured by default.</strong> Only headers, status codes,
        and latency are logged. If you want response body capture for debugging, you can opt in
        per-job — response bodies are stored encrypted and auto-deleted after 7 days.
      </p>

      <h2>URL allowlist policy</h2>
      <p>
        The BetaWindow proxy only forwards requests to publicly reachable HTTPS URLs. The following
        are <strong>blocked</strong>:
      </p>
      <ul>
        <li><code>file://</code> URLs — filesystem access is prohibited</li>
        <li>Private IP ranges: <code>10.x.x.x</code>, <code>172.16–31.x.x</code>, <code>192.168.x.x</code></li>
        <li>Loopback: <code>127.0.0.1</code>, <code>localhost</code>, <code>::1</code></li>
        <li>Link-local: <code>169.254.x.x</code></li>
        <li>Cloud metadata endpoints: <code>169.254.169.254</code> (AWS/GCP/Azure IMDS)</li>
        <li><code>http://</code> plain-text URLs (HTTPS required)</li>
      </ul>
      <p>
        These restrictions prevent SSRF attacks where a malicious job URL could cause the proxy
        to access internal infrastructure.
      </p>

      <h2>Data retention</h2>
      <ul>
        <li><strong>Network logs:</strong> retained for 30 days after session completion, then deleted</li>
        <li><strong>Console logs:</strong> retained for 30 days</li>
        <li><strong>Screenshots:</strong> retained for 90 days</li>
        <li><strong>Response bodies (opt-in):</strong> retained for 7 days, AES-256 encrypted at rest</li>
        <li><strong>Feedback reports:</strong> retained indefinitely (part of your job record)</li>
      </ul>
      <p>You can manually delete any session data from your job dashboard at any time.</p>

      <h2>Authentication &amp; access control</h2>
      <ul>
        <li>All API routes require a valid Supabase JWT (Bearer token)</li>
        <li>Job creators can only view their own jobs and sessions</li>
        <li>Testers can only view jobs they have claimed</li>
        <li>Admin routes are restricted to service-role credentials</li>
        <li>Test/debug routes (<code>/api/test/*</code>) require a secret header (<code>x-e2e-secret</code>)
          and are disabled in production by default</li>
      </ul>

      <h2>Transport security</h2>
      <ul>
        <li>All traffic is HTTPS-only (HSTS with 2-year max-age)</li>
        <li>CSP header restricts script/connect sources to known domains (Stripe, PostHog, Supabase)</li>
        <li>X-Frame-Options: SAMEORIGIN prevents clickjacking</li>
        <li>X-Content-Type-Options: nosniff prevents MIME-type sniffing</li>
      </ul>

      <h2>Tester vetting</h2>
      <p>
        Testers complete a qualification test before joining the marketplace. Each tester has a
        quality score updated after every submission. Testers with a score below threshold are
        automatically suspended. Job creators can block specific testers from claiming their jobs.
      </p>

      <h2>What the sandbox cannot do</h2>
      <ul>
        <li>The tester cannot make purchases or enter payment details on your behalf —
          credit card fields are masked in screenshots</li>
        <li>The sandbox does not execute code outside the browser context</li>
        <li>Testers cannot export your session data — it is only viewable within the platform</li>
        <li>AI analysis of session content is opt-in and governed by separate data processing terms</li>
      </ul>

      <h2>Responsible disclosure</h2>
      <p>
        To report a security vulnerability, email{' '}
        <a href="mailto:security@betawindow.com">security@betawindow.com</a>.
        We aim to acknowledge within 24 hours and resolve critical issues within 72 hours.
      </p>
    </article>
  )
}
