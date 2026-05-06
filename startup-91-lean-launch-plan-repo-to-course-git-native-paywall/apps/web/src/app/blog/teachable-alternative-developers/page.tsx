import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'The Best Teachable Alternative for Developer Course Creators — TeachRepo',
  description:
    'Comparing TeachRepo vs Teachable, Podia, and Gumroad for engineers who want git-native workflows, Markdown authoring, and Stripe payouts — without drag-and-drop editors.',
  keywords: [
    'teachable alternative',
    'developer course platform',
    'sell programming course',
    'github course platform',
    'gumroad alternative developers',
    'podia alternative',
    'git native course',
  ].join(', '),
  openGraph: {
    title: 'The Best Teachable Alternative for Developer Course Creators',
    description:
      'TeachRepo vs Teachable, Podia, and Gumroad — which platform actually fits how engineers build and ship?',
    url: 'https://teachrepo.com/blog/teachable-alternative-developers',
    type: 'article',
    publishedTime: '2025-05-06',
  },
  alternates: { canonical: 'https://teachrepo.com/blog/teachable-alternative-developers' },
};

export default function TeachableAlternative() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/blog" className="text-sm text-gray-400 hover:text-violet-600 mb-8 inline-block">
          ← Back to blog
        </Link>

        <header className="mb-10">
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
            <time dateTime="2025-05-06">May 6, 2025</time>
            <span>·</span>
            <span>9 min read</span>
            <span>·</span>
            <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-violet-600">comparison</span>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-blue-600">tutorial</span>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 leading-tight mb-4">
            The Best Teachable Alternative for Developer Course Creators
          </h1>
          <p className="text-xl text-gray-500 leading-relaxed">
            Teachable is built for non-technical creators. If your course involves code, YAML, terminal output,
            or versioned lessons — you need something designed the way engineers think.
          </p>
        </header>

        <article className="prose prose-gray prose-lg max-w-none">

          <h2>Why Teachable Frustrates Developers</h2>
          <p>
            Teachable is genuinely good at what it does: drag-and-drop lesson builders, video hosting, and newsletter
            integrations. For a fitness instructor or life coach, it&apos;s excellent.
          </p>
          <p>But for engineers? It&apos;s a constant fight:</p>
          <ul>
            <li>Every lesson update means opening a browser and clicking through a rich-text editor</li>
            <li>Code blocks are syntax-highlighted inconsistently (or not at all)</li>
            <li>No version control — you can&apos;t roll back a lesson or branch a course</li>
            <li>No way to define quizzes programmatically — it&apos;s all forms</li>
            <li>You can&apos;t embed live, runnable code environments natively</li>
            <li>It costs 0–5% transaction fee <em>on top of</em> Stripe&apos;s fees</li>
          </ul>
          <p>
            Engineers think in files, commits, and diffs. Course platforms built for influencers don&apos;t accommodate that.
          </p>

          <h2>The Alternatives at a Glance</h2>
          <p>
            Let&apos;s compare the most popular options developers reach for when they outgrow Gumroad PDFs:
          </p>

          <div className="not-prose overflow-x-auto rounded-2xl border border-gray-200 mb-8">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Platform</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Authoring</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Version Control</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Code-first</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Fees</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { name: 'Teachable', authoring: 'Drag-and-drop', vc: '❌ None', code: '⚠️ Basic', fees: '0–5% txn + $39–$119/mo' },
                  { name: 'Podia', authoring: 'Rich text editor', vc: '❌ None', code: '❌ None', fees: '0% txn + $33–$89/mo' },
                  { name: 'Gumroad', authoring: 'File upload', vc: '❌ None', code: '❌ None', fees: '10% flat fee' },
                  { name: 'Thinkific', authoring: 'Block editor', vc: '❌ None', code: '⚠️ Via embed', fees: '0–5% txn + $36–$149/mo' },
                  { name: 'TeachRepo', authoring: 'Markdown + YAML', vc: '✅ Git-native', code: '✅ Sandboxes', fees: '0% + $0 (self-host) / $29/mo' },
                ].map((row) => (
                  <tr key={row.name} className={row.name === 'TeachRepo' ? 'bg-violet-50' : ''}>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                    <td className="px-4 py-3 text-gray-600">{row.authoring}</td>
                    <td className="px-4 py-3 text-gray-600">{row.vc}</td>
                    <td className="px-4 py-3 text-gray-600">{row.code}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{row.fees}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>What &quot;Git-native&quot; Actually Means</h2>
          <p>
            TeachRepo treats your GitHub repository as the single source of truth for your course. Here&apos;s what that unlocks:
          </p>

          <h3>Write lessons like code</h3>
          <p>
            Every lesson is a Markdown file. Frontmatter YAML sets the order, the paywall flag, and links to a quiz:
          </p>
          <pre className="bg-gray-950 text-gray-100 rounded-xl p-5 overflow-x-auto text-sm leading-relaxed">
            <code>{`---
title: "Setting Up Your Dev Environment"
order: 3
is_preview: true
quiz: ./quizzes/env-setup.yaml
---

# Setting Up Your Dev Environment

Open your terminal and run:

\`\`\`bash
brew install nvm
nvm install --lts
\`\`\``}
            </code>
          </pre>

          <h3>Quizzes in YAML, auto-graded</h3>
          <p>
            Define MCQs directly in YAML frontmatter — no forms, no CMS. TeachRepo auto-grades them client-side
            with zero server round-trips:
          </p>
          <pre className="bg-gray-950 text-gray-100 rounded-xl p-5 overflow-x-auto text-sm leading-relaxed">
            <code>{`questions:
  - prompt: "What flag shows all npm packages globally?"
    choices:
      - "-g --list"
      - "npm ls -g --depth=0"
      - "npm list all"
      - "npm show global"
    answer: 1
    explanation: "npm ls -g --depth=0 limits output to top-level packages."`}
            </code>
          </pre>

          <h3>Deploy with git push</h3>
          <p>
            Add a <code>course.yml</code> and a <code>lessons/</code> folder, then paste your repo URL into TeachRepo.
            Every <code>git push</code> creates a new version snapshot — roll back in one click.
          </p>

          <h2>Pricing: The Math That Matters</h2>
          <p>
            Say you sell a $79 course and move 20 copies/month ($1,580 MRR):
          </p>
          <ul>
            <li><strong>Teachable Basic ($39/mo + 5% txn):</strong> $39 + $79 = <strong>$118/mo in platform costs</strong></li>
            <li><strong>Gumroad (10% flat):</strong> $158/mo in fees</li>
            <li><strong>TeachRepo Creator ($29/mo + 0% txn):</strong> <strong>$29/mo total</strong> — save $89–$129/mo vs. alternatives</li>
            <li><strong>TeachRepo Self-hosted (free):</strong> $0/mo platform cost — only Stripe&apos;s standard 2.9% + $0.30</li>
          </ul>
          <p>
            At scale, those fee differences compound dramatically. A creator earning $10K/month saves{' '}
            <strong>$7,100–$9,700/year</strong> vs. Teachable + Gumroad combined.
          </p>

          <h2>When TeachRepo Is the Right Choice</h2>
          <p>TeachRepo is the right fit if:</p>
          <ul>
            <li>Your course has code, CLI output, or technical concepts that need syntax highlighting</li>
            <li>You already write in Markdown (README, docs, notes)</li>
            <li>You want version control for your curriculum — branch, merge, tag releases</li>
            <li>You want to self-host with 0% platform fees and MIT licensing</li>
            <li>You want quizzes without a CMS admin panel</li>
            <li>You need embedded live code environments (StackBlitz, CodeSandbox) that unlock on purchase</li>
          </ul>

          <h2>When to Stick with Teachable or Podia</h2>
          <p>
            Be honest: Teachable wins if you&apos;re selling video-heavy courses to non-technical audiences, need a
            built-in affiliate marketplace, or want native iOS/Android student apps. TeachRepo doesn&apos;t (yet)
            have a dedicated mobile app.
          </p>

          <h2>Getting Started in Under 15 Minutes</h2>
          <ol>
            <li>
              <strong>Fork the template:</strong>{' '}
              <a href="https://github.com/ErlisK/teachrepo-template" className="text-violet-600 hover:underline" target="_blank" rel="noopener noreferrer">
                github.com/ErlisK/teachrepo-template
              </a>{' '}
              — Markdown lessons, YAML quizzes, GitHub Actions CI/CD pre-wired.
            </li>
            <li>
              <strong>Paste your repo URL</strong> into{' '}
              <a href="https://teachrepo.com/dashboard" className="text-violet-600 hover:underline">teachrepo.com/dashboard</a>.
              Import takes ~10 seconds.
            </li>
            <li>
              <strong>Set your price</strong> in <code>course.yml</code>: <code>price_cents: 4900</code> for $49.
              Zero for a free lead-gen course.
            </li>
            <li>
              <strong>Hit Publish.</strong> Your course is live with Stripe checkout, SEO metadata, and a shareable link.
            </li>
          </ol>
          <p>No credit card needed to get started. Self-hosting is MIT-licensed and free forever.</p>

          <div className="not-prose mt-10 rounded-2xl bg-violet-50 border border-violet-200 p-8 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to try it?</h3>
            <p className="text-gray-600 mb-6">Import your first course free — no credit card, no lock-in.</p>
            <a
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-violet-500 transition-colors"
            >
              Start building free →
            </a>
          </div>

        </article>

        <div className="mt-16 border-t pt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-900 mb-1">TeachRepo Team</div>
            <div className="text-xs text-gray-400">Published May 6, 2025</div>
          </div>
          <Link href="/blog" className="text-sm text-violet-600 hover:underline">← Back to blog</Link>
        </div>
      </div>
    </div>
  );
}
