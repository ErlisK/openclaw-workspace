import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Introducing TeachRepo — TeachRepo Blog',
  description: 'We built TeachRepo because we were tired of fighting drag-and-drop UIs to sell technical courses. Today we\'re launching the tool we wished existed.',
  openGraph: {
    title: 'Introducing TeachRepo: Turn Any GitHub Repo Into a Paywalled Course',
    description: 'Git-native course platform for engineers. Markdown → paywalled course in minutes.',
    url: 'https://teachrepo.com/blog/introducing-teachrepo',
    type: 'article',
    publishedTime: '2025-04-19',
  },
};

export default function IntroducingTeachRepo() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        {/* Back */}
        <Link href="/blog" className="text-sm text-gray-400 hover:text-violet-600 mb-8 inline-block">
          ← Back to blog
        </Link>

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
            <time dateTime="2025-04-19">April 19, 2025</time>
            <span>·</span>
            <span>5 min read</span>
            <span className="rounded-full bg-violet-50 text-violet-600 px-2 py-0.5 font-medium">launch</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 leading-tight mb-4">
            Introducing TeachRepo: Turn Any GitHub Repo Into a Paywalled Course
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            We built TeachRepo because we were tired of fighting drag-and-drop UIs to sell technical courses. Today we&apos;re launching the tool we wished existed.
          </p>
        </header>

        {/* Body */}
        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <h2 className="text-xl font-bold text-gray-900 mt-10">The Problem</h2>
          <p>
            If you&apos;re a developer who wants to sell a technical course, you have two bad options:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Platform lock-in:</strong> Teachable, Gumroad, Podia — they take 10–30% revenue cuts, force you into web editors, and have zero understanding of code.</li>
            <li><strong>Hand-roll everything:</strong> SSG + Stripe + auth + quizzes + versioning. A weekend project that takes three weeks and still has bugs.</li>
          </ul>
          <p>
            Neither is acceptable for engineers who live in their editor and want to ship courses the same way they ship software.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10">What We Built</h2>
          <p>
            TeachRepo turns a GitHub repository — or any folder of Markdown files — into a fully-deployed, paywalled course site in minutes.
          </p>
          <p>The workflow looks like this:</p>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Write lessons in <strong>Markdown</strong> with YAML frontmatter for metadata</li>
            <li>Add a <code className="bg-gray-100 px-1 rounded">course.yml</code> file with pricing and structure</li>
            <li>Run <code className="bg-gray-100 px-1 rounded">teachrepo import --repo=github.com/you/your-course</code></li>
            <li>Deploy to Vercel in one click</li>
            <li>Share the URL — Stripe checkout is already wired up</li>
          </ol>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Key Features</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Markdown-native authoring</strong> — write in the same repo as your code</li>
            <li><strong>Stripe checkout built-in</strong> — zero configuration, just add your Stripe keys</li>
            <li><strong>Auto-graded quizzes</strong> via YAML frontmatter — no backend needed</li>
            <li><strong>Gated code sandboxes</strong> — StackBlitz/CodeSandbox embeds that unlock on purchase</li>
            <li><strong>Git-versioned by default</strong> — every push updates your course, with full version history</li>
            <li><strong>Built-in affiliate tracking</strong> — share <code className="bg-gray-100 px-1 rounded">?ref=</code> links with promoters</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Pricing: Free Tier That Actually Means Free</h2>
          <p>
            The core is open-source and self-hostable. Deploy to your own Vercel account, keep 100% of revenue.
            No platform fee. No strings attached.
          </p>
          <p>
            For creators who want a hosted option with marketplace listing, analytics, and zero ops, we offer a flat subscription at $19/mo with a 5% platform fee on sales.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Try It Today</h2>
          <p>
            We have two free sample courses live right now:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Git for Engineers</strong> — master the git workflows used at top engineering teams</li>
            <li><strong>GitHub Actions for Engineers</strong> — automate CI/CD pipelines</li>
          </ul>
          <p>
            Both are completely free. No signup required for the first lesson.
          </p>

          <div className="mt-10 rounded-2xl border border-violet-200 bg-violet-50 p-6">
            <p className="font-semibold text-violet-900 mb-3">Ready to publish your first course?</p>
            <div className="flex flex-wrap gap-3">
              <a href="https://teachrepo.com/auth/signup" className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
                Start for free →
              </a>
              <a href="https://teachrepo.com/marketplace" className="rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-700 hover:border-violet-500">
                Browse courses
              </a>
              <a href="https://github.com/ErlisK/openclaw-workspace" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300">
                View on GitHub ↗
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-100 flex items-center justify-between text-sm text-gray-400">
          <Link href="/blog" className="hover:text-violet-600">← Back to blog</Link>
          <a href="https://teachrepo.com" className="hover:text-violet-600">teachrepo.com</a>
        </div>
      </div>
    </div>
  );
}
