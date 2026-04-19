import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quickstart Guide — TeachRepo Docs',
  description: 'Get your first TeachRepo course live in under 10 minutes.',
};

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 mt-0.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
          {n}
        </span>
      </div>
      <div className="pb-8">
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
        <div className="prose prose-sm text-gray-600 max-w-none">{children}</div>
      </div>
    </div>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="my-3 overflow-x-auto rounded-lg bg-gray-900 px-4 py-3 text-sm text-green-300">
      <code>{children}</code>
    </pre>
  );
}

export default function QuickstartPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      <nav className="mb-8 text-sm">
        <a href="/docs" className="text-violet-600 hover:underline">Docs</a>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-600">Quickstart</span>
      </nav>

      <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900">
        Quickstart Guide
      </h1>
      <p className="mb-12 text-lg text-gray-600">
        Get your first TeachRepo course live in under 10 minutes.
        You&apos;ll need: a GitHub repo with Markdown files, a TeachRepo account, and Stripe.
      </p>

      <div className="relative border-l-2 border-violet-100 pl-4">
        <Step n={1} title="Install the CLI">
          <p>Install the TeachRepo CLI globally:</p>
          <Code>npm install -g @teachrepo/cli</Code>
          <p>Verify the install:</p>
          <Code>teachrepo --version</Code>
        </Step>

        <Step n={2} title="Authenticate">
          <p>Log in to your TeachRepo account:</p>
          <Code>teachrepo login</Code>
          <p>
            This opens your browser to complete OAuth. Your API token is stored locally
            at <code className="bg-gray-100 px-1 rounded text-xs">~/.teachrepo/config.json</code>.
          </p>
        </Step>

        <Step n={3} title="Structure your repo">
          <p>
            TeachRepo expects a <code className="bg-gray-100 px-1 rounded text-xs">course.yml</code> at
            the root and Markdown lesson files:
          </p>
          <Code>{`my-course/
├── course.yml
├── lessons/
│   ├── 01-introduction.md
│   ├── 02-core-concepts.md
│   └── 03-advanced-topics.md
└── README.md`}</Code>
          <p>Minimal <code>course.yml</code>:</p>
          <Code>{`title: "TypeScript Deep Dive"
slug: "typescript-deep-dive"
price_cents: 2900
currency: "usd"
description: "Master TypeScript from fundamentals to advanced patterns."
repo_url: "https://github.com/yourname/typescript-deep-dive"`}</Code>
        </Step>

        <Step n={4} title="Add frontmatter to lessons">
          <p>Each lesson Markdown file needs YAML frontmatter:</p>
          <Code>{`---
title: "Introduction to TypeScript"
slug: "introduction"
order: 1
access: free          # free = public preview
estimated_minutes: 15
---

# Introduction to TypeScript

Your lesson content here...`}</Code>
          <p>
            Set <code className="bg-gray-100 px-1 rounded text-xs">access: paid</code> on lessons
            you want to gate behind enrollment.
          </p>
        </Step>

        <Step n={5} title="Import your course">
          <Code>{`teachrepo import https://github.com/yourname/typescript-deep-dive`}</Code>
          <p>
            This pulls your repo, parses lessons, creates the course in TeachRepo, and
            returns a preview URL.
          </p>
        </Step>

        <Step n={6} title="Connect Stripe">
          <p>
            Go to <strong>Dashboard → Settings → Payments</strong> and connect your Stripe
            account. TeachRepo handles checkout, webhooks, and enrollment automatically.
          </p>
          <p>
            Test mode is enabled by default — use Stripe test card <code className="bg-gray-100 px-1 rounded text-xs">4242 4242 4242 4242</code>.
          </p>
        </Step>

        <Step n={7} title="Publish your course">
          <p>
            In the dashboard, click <strong>Publish</strong> on your course. Your course
            is now live at <code className="bg-gray-100 px-1 rounded text-xs">https://teachrepo.com/courses/your-slug</code>.
          </p>
          <Code>{`teachrepo publish typescript-deep-dive`}</Code>
        </Step>
      </div>

      <div className="mt-12 rounded-xl bg-violet-50 p-6">
        <h2 className="mb-2 font-semibold text-gray-900">Next Steps</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>→ <a href="/docs/course-yaml" className="text-violet-600 hover:underline">Full course.yml reference</a></li>
          <li>→ <a href="/docs/cli" className="text-violet-600 hover:underline">CLI commands reference</a></li>
          <li>→ <a href="/docs/pricing" className="text-violet-600 hover:underline">Set up pricing & affiliates</a></li>
          <li>→ <a href="/docs/self-hosting" className="text-violet-600 hover:underline">Self-host on your own domain</a></li>
        </ul>
      </div>
    </div>
  );
}
