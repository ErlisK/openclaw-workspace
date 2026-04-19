import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Why Git-Native Is the Right Foundation for Developer Education — TeachRepo Blog',
  description: 'Most course platforms treat code as an afterthought. We think the repo should be the source of truth — for content, versioning, and delivery.',
  openGraph: {
    title: 'Why Git-Native Is the Right Foundation for Developer Education',
    description: 'The repo as the source of truth — for content, versioning, and delivery.',
    url: 'https://teachrepo.com/blog/why-git-native-courses',
    type: 'article',
    publishedTime: '2025-04-20',
  },
};

export default function WhyGitNative() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/blog" className="text-sm text-gray-400 hover:text-violet-600 mb-8 inline-block">
          ← Back to blog
        </Link>

        <header className="mb-10">
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
            <time dateTime="2025-04-20">April 20, 2025</time>
            <span>·</span>
            <span>7 min read</span>
            <span className="rounded-full bg-violet-50 text-violet-600 px-2 py-0.5 font-medium">engineering</span>
            <span className="rounded-full bg-gray-50 text-gray-600 px-2 py-0.5 font-medium">philosophy</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 leading-tight mb-4">
            Why Git-Native Is the Right Foundation for Developer Education
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Most course platforms treat code as an afterthought. We think the repo should be the source of truth — for content, versioning, and delivery.
          </p>
        </header>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <h2 className="text-xl font-bold text-gray-900 mt-10">The Gap Between How Engineers Work and How They Teach</h2>
          <p>
            Developers spend their careers mastering version control, code review, CI/CD, and pull requests.
            These tools exist because plain text + git is a surprisingly powerful substrate: it&apos;s durable, diffable, auditable, and composable.
          </p>
          <p>
            Then they go to teach someone else, and suddenly they&apos;re in a WYSIWYG editor, dragging content blocks around,
            exporting ZIP files, and wondering why the &quot;published at&quot; timestamp is wrong by 3 hours.
          </p>
          <p>
            The mismatch is jarring. And it&apos;s unnecessary.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10">What Git Gives You for Free</h2>
          <p>
            When your course lives in a git repository, you get a set of properties that SaaS course platforms
            charge premium tiers to approximate:
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-8">1. Versioning that actually works</h3>
          <p>
            Git commits are your course version history. You can tag a release (<code className="bg-gray-100 px-1 rounded">v1.2.0</code>),
            roll back a lesson that introduced a bug, or maintain separate branches for &quot;beginner&quot; and
            &quot;advanced&quot; variants. No database migration required.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-8">2. Peer review for content</h3>
          <p>
            Pull requests work for course content too. A guest contributor fixes a typo? Opens a PR.
            You review it, suggest changes with inline comments, and merge. This is standard practice for
            documentation at most engineering teams — it should be standard for courses too.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-8">3. CI/CD for publishing</h3>
          <p>
            With TeachRepo, a GitHub Actions workflow runs on every push. It validates your course YAML,
            compiles the MDX, runs your quiz answer keys through the grading logic, and deploys to Vercel.
            Broken quizzes fail the build before any student sees them.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-8">4. The repo is the canonical source of truth</h3>
          <p>
            There&apos;s no &quot;export&quot; step that can get out of sync. No proprietary format to migrate away from.
            The Markdown files in your repo <em>are</em> the course. Clone them, fork them, move platforms — your
            content goes with you.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10">The Tradeoff: You Need to Know Markdown</h2>
          <p>
            Git-native isn&apos;t for everyone. If your audience is non-technical creators, a drag-and-drop interface
            is genuinely better. TeachRepo is explicitly not for that audience.
          </p>
          <p>
            It&apos;s for engineers, DevRel leads, open-source maintainers, and technical educators who already
            write READMEs, documentation, and blog posts in Markdown. For them, the mental model is immediately
            familiar, and the tooling just works.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Course YAML: Expressing Curriculum in Code</h2>
          <p>
            Here&apos;s what a <code className="bg-gray-100 px-1 rounded">course.yml</code> file looks like:
          </p>
          <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto text-sm leading-relaxed">
{`title: "Advanced Git for Engineers"
slug: "advanced-git"
price_cents: 2900
currency: usd
version: "2.1.0"
tags: [git, engineering, devops]

lessons:
  - filename: 01-rebasing.md
    title: "Interactive Rebasing"
    access: free
  - filename: 02-reflog.md
    title: "The Reflog: Your Safety Net"
    access: paid
  - filename: 03-hooks.md
    title: "Git Hooks and Automation"
    access: paid`}
          </pre>
          <p>
            Every field is intentional. Pricing, access control, versioning — all expressed as code,
            reviewable in a PR, tracked in git history.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Where This Goes</h2>
          <p>
            The thesis extends further than individual courses. Imagine:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>A company&apos;s onboarding course living as a git repo inside their org</li>
            <li>Open-source projects shipping official paid tutorials alongside their docs</li>
            <li>A curriculum that&apos;s forked, remixed, and PRed like any other open-source project</li>
          </ul>
          <p>
            Git isn&apos;t a constraint. For the right audience, it&apos;s a superpower.
          </p>

          <div className="mt-10 rounded-2xl border border-violet-200 bg-violet-50 p-6">
            <p className="font-semibold text-violet-900 mb-2">Build your first course the Git way.</p>
            <p className="text-violet-700 text-sm mb-4">Free tier — keep 100% of revenue. Deploy to your own Vercel account.</p>
            <div className="flex flex-wrap gap-3">
              <a href="https://teachrepo.com/auth/signup" className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
                Start for free →
              </a>
              <a href="https://teachrepo.com/docs/quickstart" className="rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-700 hover:border-violet-500">
                Read the docs
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
