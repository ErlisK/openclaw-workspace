import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Gated Sandboxes: Teaching with Real Code — TeachRepo Blog',
  description: 'How TeachRepo embeds StackBlitz and CodeSandbox environments that unlock on course purchase — real code, zero setup, in-browser.',
  openGraph: {
    title: 'Gated Sandboxes: Teaching with Real Code',
    description: 'Interactive StackBlitz/CodeSandbox environments that unlock on course purchase — the right way to teach hands-on coding.',
    url: 'https://teachrepo.com/blog/gated-sandboxes',
    type: 'article',
    publishedTime: '2025-04-23',
  },
};

export default function GatedSandboxes() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/blog" className="text-sm text-gray-400 hover:text-violet-600 mb-8 inline-block">
          ← Back to blog
        </Link>

        <header className="mb-10">
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
            <time dateTime="2025-04-23">April 23, 2025</time>
            <span>·</span>
            <span>9 min read</span>
            <span className="rounded-full bg-violet-50 text-violet-600 px-2 py-0.5 font-medium">engineering</span>
            <span className="rounded-full bg-gray-50 text-gray-600 px-2 py-0.5 font-medium">sandboxes</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 leading-tight mb-4">
            Gated Sandboxes: Teaching with Real Code
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            How TeachRepo embeds StackBlitz and CodeSandbox environments that unlock on purchase —
            real, runnable code in the browser with zero student setup.
          </p>
        </header>

        <div className="space-y-6 text-gray-700 leading-relaxed">

          <h2 className="text-xl font-bold text-gray-900 mt-10">The Problem with Static Code Examples</h2>
          <p>
            Technical courses live or die by their code examples. But most platforms force you into one of two bad options:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Static code blocks:</strong> Easy to write, but students have to copy-paste into their local environment.
              That means &quot;it doesn&apos;t work on my machine&quot; support tickets, version conflicts, and high dropout at lesson 1.
            </li>
            <li>
              <strong>Recorded screencasts:</strong> Great to watch, but students can&apos;t modify the code, run it themselves,
              or experiment with edge cases.
            </li>
          </ul>
          <p>
            The right answer is a <strong>live, runnable code environment</strong> embedded directly in the lesson.
            Students click a button, a full dev environment boots in 3 seconds, they&apos;re writing and running code immediately.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10">The Solution: Embedded Sandboxes</h2>
          <p>
            TeachRepo integrates with two browser-based code environments:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>StackBlitz</strong> — runs Node.js, React, Angular, Vue, and more via WebContainers.
              The Node runtime is fully in-browser — no server-side execution, extremely fast startup.
            </li>
            <li>
              <strong>CodeSandbox</strong> — supports a broader range of templates, server-side execution,
              and has a better Docker environment for more complex setups.
            </li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Embedding a Sandbox in a Lesson</h2>
          <p>
            Add a <code className="bg-gray-100 px-1 rounded text-sm">sandbox</code> block to any lesson&apos;s YAML frontmatter:
          </p>

          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 overflow-x-auto text-sm leading-relaxed">
{`---
title: "Async Python: Hands-On"
access: paid
sandbox:
  provider: stackblitz            # stackblitz | codesandbox
  template: node                  # project template
  repo: "yourname/course-repo"    # GitHub repo with starter code
  branch: "lesson-03-starter"     # optional branch
  file: "src/index.py"            # file to open on launch
  height: 600                     # iframe height in px
---

# Async Python: Hands-On

In this lesson you'll implement a rate-limited HTTP client using
asyncio + aiohttp. The sandbox below has the starter code ready.

Hit **Run** to see the baseline, then follow the exercises below.

[sandbox will appear here for paid students]

## Exercise 1: Add Exponential Backoff

Modify the \`fetch_with_retry\` function to implement exponential backoff
with jitter. Target: 3 retries, base delay of 1 second.`}
          </pre>

          <h2 className="text-xl font-bold text-gray-900 mt-10">The Gating Mechanism</h2>
          <p>
            Sandboxes are gated behind the same access control as lesson content:
          </p>

          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 overflow-x-auto text-sm leading-relaxed">
{`// SandboxEmbed.tsx (simplified)
export function SandboxEmbed({ config, hasAccess }: Props) {
  if (!hasAccess) {
    return (
      <div className="sandbox-locked">
        <LockIcon />
        <p>Purchase the course to access this sandbox</p>
        <CheckoutButton courseId={config.courseId} />
      </div>
    );
  }

  return (
    <iframe
      src={getSandboxUrl(config)}  // StackBlitz or CodeSandbox embed URL
      height={config.height ?? 500}
      allow="cross-origin-isolated"
      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
    />
  );
}`}
          </pre>

          <p>
            The <code className="bg-gray-100 px-1 rounded text-sm">hasAccess</code> check hits the database exactly once per page
            load (when the lesson page is rendered server-side). After that, it&apos;s baked into the HTML. No per-sandbox API calls.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Generating the StackBlitz URL</h2>
          <p>
            StackBlitz supports several embed URL patterns. TeachRepo uses the GitHub-linked embed:
          </p>

          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 overflow-x-auto text-sm leading-relaxed">
{`// For a GitHub repo:
const url = \`https://stackblitz.com/github/\${repo}\` +
  (branch ? \`/tree/\${branch}\` : '') +
  \`?embed=1\` +
  \`&view=editor\` +
  \`&file=\${encodeURIComponent(file)}\` +
  \`&theme=dark\` +
  \`&hideNavigation=1\`;

// Example:
// https://stackblitz.com/github/yourname/course-repo/tree/lesson-03-starter
// ?embed=1&view=editor&file=src/index.py&theme=dark&hideNavigation=1`}
          </pre>

          <p>
            The student gets a fully-functional VS Code-like editor with the exact starter code for
            that lesson, already cloned, already running.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Best Practices for Sandbox-Driven Lessons</h2>

          <h3 className="text-lg font-semibold text-gray-900 mt-6">1. One branch per lesson</h3>
          <p>
            Keep your starter code on a dedicated branch per lesson (<code className="bg-gray-100 px-1 rounded text-sm">lesson-01-starter</code>,{' '}
            <code className="bg-gray-100 px-1 rounded text-sm">lesson-02-starter</code>, etc.).
            This makes it trivial to update starter code without breaking other lessons.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6">2. Include a solution branch too</h3>
          <p>
            Pair each <code className="bg-gray-100 px-1 rounded text-sm">lesson-N-starter</code> with a{' '}
            <code className="bg-gray-100 px-1 rounded text-sm">lesson-N-solution</code>. Students who get stuck can diff the
            two branches. You can embed the solution as a second, separately-gated sandbox (or just link to it as a spoiler).
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6">3. Keep sandboxes focused</h3>
          <p>
            Each sandbox should demonstrate one concept, not an entire feature. A 200-line starter file is too intimidating.
            A 40-line file with 3 clearly-marked TODO comments is exactly right.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6">4. Test your sandboxes on a slow connection</h3>
          <p>
            StackBlitz WebContainers are fast, but they still download a Node runtime. On a 3G connection this can take
            15–20 seconds. Provide a static fallback code block above the sandbox so students aren&apos;t staring at a
            loading spinner if they&apos;re on a slow connection.
          </p>

          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 overflow-x-auto text-sm leading-relaxed">
{`---
title: "Async Python: Hands-On"
access: paid
sandbox:
  provider: stackblitz
  repo: "yourname/course-repo"
  branch: "lesson-03-starter"
  fallback_code: |  # shown while sandbox loads
    import asyncio
    import aiohttp

    async def fetch(session, url):
        async with session.get(url) as response:
            return await response.json()
    # ... rest of starter code
---`}
          </pre>

          <h2 className="text-xl font-bold text-gray-900 mt-10">CodeSandbox vs StackBlitz: When to Use Which</h2>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-3 border border-gray-100 font-semibold">Feature</th>
                  <th className="text-left p-3 border border-gray-100 font-semibold">StackBlitz</th>
                  <th className="text-left p-3 border border-gray-100 font-semibold">CodeSandbox</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Startup time', '~2s (WebContainers)', '~5–15s (server-side)'],
                  ['Node.js support', 'Full (in-browser)', 'Full (cloud container)'],
                  ['Python/Ruby/etc.', 'Limited (WASM only)', 'Full (Docker)'],
                  ['File system', 'In-memory', 'Persistent'],
                  ['Network requests', 'Limited (CORS)', 'Full'],
                  ['Best for', 'JS/TS/Node lessons', 'Multi-language, complex apps'],
                ].map(([f, sb, cs]) => (
                  <tr key={f} className="border-b border-gray-50">
                    <td className="p-3 border border-gray-100 font-medium text-gray-900">{f}</td>
                    <td className="p-3 border border-gray-100 text-gray-600">{sb}</td>
                    <td className="p-3 border border-gray-100 text-gray-600">{cs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Sandbox Analytics</h2>
          <p>
            TeachRepo fires a <code className="bg-gray-100 px-1 rounded text-sm">sandbox_opened</code> event when a student
            interacts with a sandbox. This shows in your creator dashboard alongside lesson views and quiz completions —
            useful for understanding which exercises students actually engage with.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10">The Payoff</h2>
          <p>
            When a student can run, modify, and experiment with code inside the lesson — without cloning a repo,
            installing dependencies, or fighting their local environment — you get dramatically higher lesson completion rates.
          </p>
          <p>
            The setup cost is minimal: one extra YAML block per lesson, a GitHub branch with starter code.
            The payoff is a significantly better learning experience.
          </p>

          <div className="mt-10 rounded-2xl border border-violet-200 bg-violet-50 p-6">
            <p className="font-semibold text-violet-900 mb-2">Build a course with live sandbox exercises</p>
            <p className="text-violet-700 text-sm mb-4">
              Sandbox support is available on all TeachRepo plans — free and hosted.
              Add a <code className="bg-violet-100 text-violet-700 px-1 rounded text-xs">sandbox:</code> block to any lesson and ship.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="https://teachrepo.com/auth/signup" className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
                Start for free →
              </a>
              <a href="https://teachrepo.com/docs/sandboxes" className="rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-700 hover:border-violet-500">
                Sandbox docs
              </a>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-100 flex items-center justify-between text-sm text-gray-400">
          <Link href="/blog" className="hover:text-violet-600">← Back to blog</Link>
          <a href="https://teachrepo.com" className="hover:text-violet-600">teachrepo.com</a>
        </div>
      </div>
    </div>
  );
}
