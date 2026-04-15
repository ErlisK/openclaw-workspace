import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How It Works — BetaWindow Docs',
  description: 'Learn how BetaWindow connects AI builders with human testers for live E2E testing in under 4 hours.',
}

export default function HowItWorksPage() {
  return (
    <article data-testid="docs-how-it-works">
      <h1>How BetaWindow Works</h1>
      <p className="lead text-xl text-gray-600 mb-8">
        BetaWindow connects AI-built apps with real human testers who run live end-to-end test sessions —
        complete with network logs, console captures, and structured feedback — in under 4 hours.
      </p>

      <h2>Overview</h2>
      <p>
        When you ship an AI-built app, you need confidence that it actually works for a real person
        clicking through it, not just unit tests or synthetic checks. BetaWindow gives you that confidence
        at a fraction of the cost of a traditional QA team.
      </p>

      <h2>Step 1 — Create a job</h2>
      <p>
        Submit your app URL and pick a tier (Quick, Standard, or Deep). Write optional test instructions
        describing the flows you want covered — e.g. "sign up, create a project, invite a collaborator".
        Credits are held (not charged) when you publish the job.
      </p>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm font-mono">
        <p className="text-gray-500 mb-1">Example job creation via API:</p>
        <pre>{`POST /api/jobs
{
  "title": "Test signup + onboarding flow",
  "url": "https://your-app.vercel.app",
  "tier": "standard",
  "instructions": "1. Sign up with a new email\\n2. Complete onboarding\\n3. Create your first project"
}`}</pre>
      </div>

      <h2>Step 2 — A tester claims your job</h2>
      <p>
        Human testers browse the marketplace and claim open jobs. Once claimed, the tester opens a
        dedicated testing session with your app loaded in an instrumented Chrome frame.
        All network requests, console logs, and errors are captured automatically.
      </p>

      <h2>Step 3 — Live testing session</h2>
      <p>
        The tester follows your instructions, exploring the app naturally and noting any unexpected
        behaviour, UI issues, broken flows, or errors. The platform records:
      </p>
      <ul>
        <li>Every network request (method, URL, status, latency)</li>
        <li>Browser console logs and errors</li>
        <li>Annotated screenshots at each key step</li>
        <li>A session timeline with timestamps</li>
      </ul>

      <h2>Step 4 — Feedback report</h2>
      <p>
        When the tester finishes, they submit structured feedback including:
      </p>
      <ul>
        <li>Pass / fail verdict per flow</li>
        <li>Bug reports with steps to reproduce and severity</li>
        <li>Overall UX quality score (1–5)</li>
        <li>Free-form comments</li>
      </ul>
      <p>
        You receive the full report in your dashboard — with the raw network log and console capture
        attached — immediately after submission.
      </p>

      <h2>Step 5 — Credits settled</h2>
      <p>
        Credits on hold are converted to spent once the feedback is accepted.
        If no tester claims your job within 24 hours, the credits are fully refunded.
        If you reject a submission, it re-enters the queue for a new tester.
      </p>

      <h2>Who are the testers?</h2>
      <p>
        BetaWindow testers are vetted freelancers — designers, developers, and QA professionals — who
        have completed an onboarding qualification test. Each tester has a quality score based on
        accepted submissions. Low-quality submitters are automatically removed from the platform.
      </p>

      <h2>What kinds of apps can I test?</h2>
      <p>
        Any publicly accessible web app. The app must be reachable via HTTPS — staging environments,
        Vercel preview deployments, and production URLs all work. The platform does not support
        localhost URLs or apps behind VPN/basic-auth without a bypass token.
      </p>

      <div className="not-prose mt-10 p-6 bg-indigo-50 border border-indigo-200 rounded-xl">
        <h3 className="text-lg font-semibold text-indigo-900 mb-2">Ready to get started?</h3>
        <p className="text-indigo-700 text-sm mb-4">
          Create your first job in under 2 minutes. No SDK required.
        </p>
        <a
          href="/dashboard/jobs/new"
          className="inline-block px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg text-sm hover:bg-indigo-700"
        >
          Create a job →
        </a>
      </div>
    </article>
  )
}
