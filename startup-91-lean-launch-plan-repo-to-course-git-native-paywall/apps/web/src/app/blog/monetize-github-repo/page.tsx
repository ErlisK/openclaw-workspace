import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Monetize Your GitHub Repository in 2025 — TeachRepo Blog',
  description:
    'A practical guide for engineers: turn your GitHub repos, READMEs, and workshop notes into paid courses with Stripe checkout — without leaving your git workflow.',
  openGraph: {
    title: 'How to Monetize Your GitHub Repository in 2025',
    description:
      'Turn your GitHub repos and Markdown notes into paid courses. No drag-and-drop. No platform lock-in. Just git push.',
    url: 'https://teachrepo.com/blog/monetize-github-repo',
    type: 'article',
    publishedTime: '2025-05-01',
  },
  alternates: { canonical: 'https://teachrepo.com/blog/monetize-github-repo' },
};

export default function MonetizeGitHubRepo() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/blog" className="text-sm text-gray-400 hover:text-violet-600 mb-8 inline-block">
          ← Back to blog
        </Link>

        <header className="mb-10">
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
            <time dateTime="2025-05-01">May 1, 2025</time>
            <span>·</span>
            <span>10 min read</span>
            <span className="rounded-full bg-blue-50 text-blue-600 px-2 py-0.5 font-medium">tutorial</span>
            <span className="rounded-full bg-violet-50 text-violet-600 px-2 py-0.5 font-medium">monetization</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 leading-tight mb-4">
            How to Monetize Your GitHub Repository in 2025
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            You already have the knowledge. It&apos;s sitting in a GitHub repo right now — workshop notes, a well-documented library, an internal training guide. Here&apos;s how to turn it into recurring revenue without touching a drag-and-drop editor.
          </p>
        </header>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">

          <h2 className="text-xl font-bold text-gray-900 mt-10">Why most engineers never monetize their repos</h2>
          <p>
            Developers write excellent technical content. README files, example code, workshop slides, internal training docs — this is genuinely valuable educational material. But almost none of it ever makes money.
          </p>
          <p>
            The reason isn&apos;t lack of audience. It&apos;s friction. Turning a repo into a paid course traditionally means: picking a platform (Teachable, Gumroad), manually copying content into a web editor, reformatting everything, losing code syntax highlighting, giving up 10–30% of revenue, and never being able to <code>git push</code> an update again.
          </p>
          <p>
            That workflow is broken for engineers. So most just leave their repos public and free forever.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10">The git-native approach</h2>
          <p>
            There&apos;s a better way that fits how engineers already work. The core idea: your <strong>GitHub repo is the source of truth</strong>. Lessons are Markdown files. Configuration is YAML frontmatter. Payments are configured with a single field in a <code>course.yml</code>. Deployment is <code>git push</code>.
          </p>
          <p>
            This is exactly what <a href="https://teachrepo.com" className="text-violet-600 hover:underline">TeachRepo</a> is built for. Let&apos;s walk through the entire monetization setup from scratch.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Step 1: Structure your repo as a course</h2>
          <p>
            Add two things to any existing GitHub repo:
          </p>
          <pre className="bg-gray-50 rounded-xl p-5 text-sm font-mono overflow-x-auto border border-gray-200">
{`your-repo/
├── course.yml          # course metadata + pricing
└── lessons/
    ├── 01-introduction.md
    ├── 02-core-concepts.md
    ├── 03-advanced-patterns.md
    └── 04-project.md`}
          </pre>
          <p>
            The <code>course.yml</code> is minimal:
          </p>
          <pre className="bg-gray-50 rounded-xl p-5 text-sm font-mono overflow-x-auto border border-gray-200">
{`title: "Advanced Rust for Systems Engineers"
description: "Memory management, lifetimes, and async from first principles."
price_cents: 4900    # $49 — set to 0 for free
author: "you"
version: "1.0.0"`}
          </pre>
          <p>
            Each lesson is a Markdown file with frontmatter that controls order and access:
          </p>
          <pre className="bg-gray-50 rounded-xl p-5 text-sm font-mono overflow-x-auto border border-gray-200">
{`---
title: "Ownership and Borrowing"
order: 2
is_preview: false    # true = free preview, false = paywalled
---

# Ownership and Borrowing

The ownership system is Rust's most distinctive feature...`}
          </pre>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Step 2: Import and publish</h2>
          <p>
            With your repo structured, importing takes under 2 minutes:
          </p>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Sign in to <a href="https://teachrepo.com/auth/signup" className="text-violet-600 hover:underline">TeachRepo</a></li>
            <li>Click <strong>Import from GitHub</strong> and paste your repo URL</li>
            <li>TeachRepo fetches all lessons, parses YAML, and previews the course</li>
            <li>Hit <strong>Publish</strong> — your course is live at <code>teachrepo.com/courses/your-slug</code></li>
          </ol>
          <p>
            Stripe Checkout is wired in automatically using your <code>price_cents</code> value. No webhook setup, no checkout page to build.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Step 3: Keep updating with git push</h2>
          <p>
            Unlike every other platform, TeachRepo keeps your repo as the source of truth. Every time you push to <code>main</code>, a webhook triggers a new version import. Your students automatically see the latest content. No copy-paste, no CMS login required.
          </p>
          <pre className="bg-gray-50 rounded-xl p-5 text-sm font-mono overflow-x-auto border border-gray-200">
{`# Add a new lesson
echo "# Async Rust" > lessons/05-async.md
git add . && git commit -m "add async lesson"
git push origin main
# → TeachRepo auto-imports, course updated`}
          </pre>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Pricing strategies that work for developers</h2>
          <p>
            Here&apos;s what we&apos;ve seen work for technical courses on TeachRepo:
          </p>
          <ul className="list-disc pl-6 space-y-3">
            <li>
              <strong>Free first 2 lessons, paid rest ($29–$99).</strong> Let learners get real value before asking for money. Set <code>is_preview: true</code> on your intro lessons.
            </li>
            <li>
              <strong>Low price for early access ($9–$19), raise on v1.0.</strong> Reward early supporters and build social proof before you charge full price.
            </li>
            <li>
              <strong>Companion to an open-source project.</strong> If you maintain an OSS library, a paid &quot;mastery course&quot; at $49–$149 converts extremely well from your existing GitHub stars.
            </li>
            <li>
              <strong>Corporate team licenses.</strong> Set a high price ($299+) and message companies directly via LinkedIn. Engineers buy for their teams from expense accounts.
            </li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900 mt-10">What about self-hosting?</h2>
          <p>
            TeachRepo is MIT-licensed and fully self-hostable. If you&apos;d rather deploy on your own Vercel + Supabase and keep 100% of revenue with zero platform fee, you can do that too — the full platform source is <a href="https://github.com/ErlisK/teachrepo" className="text-violet-600 hover:underline">on GitHub</a>.
          </p>
          <p>
            The hosted platform (<a href="https://teachrepo.com/pricing" className="text-violet-600 hover:underline">$29/mo Creator plan</a>) handles managed hosting, automatic HTTPS, marketplace discovery, and AI quiz generation — so most creators prefer it over running their own infra.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10">TL;DR</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Structure your repo: <code>course.yml</code> + <code>lessons/</code> folder</li>
            <li>Set <code>price_cents</code> in <code>course.yml</code></li>
            <li>Import to TeachRepo → instant Stripe checkout, no code</li>
            <li>Update with <code>git push</code> forever</li>
            <li>Start free, upgrade to Creator plan when you need marketplace + AI features</li>
          </ul>

          <div className="mt-12 rounded-2xl border border-violet-200 bg-violet-50 p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Ready to ship your first paid course?</h3>
            <p className="text-gray-600 mb-4">
              Free to start — no credit card, no lock-in. Your first course can be live in under 15 minutes.
            </p>
            <a
              href="https://teachrepo.com/auth/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
            >
              Import your first course →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
