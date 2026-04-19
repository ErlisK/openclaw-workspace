import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Course Template — TeachRepo Docs',
  description: 'Official TeachRepo course template. Clone it, write lessons in Markdown, configure in YAML, and deploy a paywalled course in minutes.',
};

export default function TemplateDocs() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-2">
          <Link href="/docs" className="text-sm text-gray-400 hover:text-violet-600">← Docs</Link>
        </div>

        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📁</span>
            <div>
              <h1 className="text-3xl font-black text-gray-900">Course Template</h1>
              <p className="text-sm text-gray-400 font-mono">github.com/ErlisK/teachrepo-template</p>
            </div>
          </div>
          <p className="text-lg text-gray-600">
            The official starting point for every TeachRepo course. Clone it, write your lessons, and ship.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="https://github.com/ErlisK/teachrepo-template"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300"
            >
              View on GitHub →
            </a>
            <a
              href="https://github.com/ErlisK/teachrepo-template/archive/refs/heads/main.zip"
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Download ZIP →
            </a>
          </div>
        </header>

        {/* Quick start */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Start</h2>
          <pre className="bg-gray-900 text-sm text-green-400 rounded-xl p-5 overflow-x-auto">{`# Clone the template
git clone https://github.com/ErlisK/teachrepo-template my-course
cd my-course

# Install the CLI
npm install -g @teachrepo/cli

# Scaffold (alternative to cloning)
teachrepo new "My Course Title"
teachrepo new "My Course Title" --template=quiz    # with quizzes
teachrepo new "My Course Title" --template=sandbox # with sandboxes`}</pre>
        </section>

        {/* File structure */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">File Structure</h2>
          <pre className="bg-gray-900 text-sm text-gray-300 rounded-xl p-5">{`teachrepo-template/
├── course.yml              ← course metadata, pricing, lesson order
├── lessons/
│   ├── 01-introduction.md  ← free preview lesson
│   ├── 02-core-concepts.md ← paid lesson with quiz
│   ├── 03-advanced.md      ← paid lesson with sandbox
│   └── 04-conclusion.md    ← paid lesson
├── .github/
│   └── workflows/
│       └── deploy.yml      ← auto-import on git push
├── .env.example            ← environment variable reference
├── .gitignore
└── README.md`}</pre>
        </section>

        {/* course.yml */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">course.yml</h2>
          <p className="text-gray-600 mb-4">
            The canonical configuration for your course. All metadata, pricing, and lesson order lives here.
          </p>
          <pre className="bg-gray-900 text-sm text-gray-100 rounded-xl p-5 overflow-x-auto">{`title: "Your Course Title"
slug: "your-course-slug"       # URL: teachrepo.com/courses/<slug>
price_cents: 2900               # $29.00 USD  |  0 = free
currency: usd
version: "1.0.0"
description: |
  Multi-line description. Markdown supported.
repo_url: "https://github.com/you/your-course"
tags: [tag1, tag2]

lessons:
  - filename: lessons/01-introduction.md
    title: "Introduction"
    access: free             # ← free preview

  - filename: lessons/02-core-concepts.md
    title: "Core Concepts"
    access: paid             # ← unlocks on purchase`}</pre>
        </section>

        {/* Lesson format */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Lesson Format</h2>
          <p className="text-gray-600 mb-4">
            Lessons are Markdown files. Add a YAML frontmatter block for metadata, quizzes, and sandboxes.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2 mt-6">Basic lesson</h3>
          <pre className="bg-gray-900 text-sm text-gray-100 rounded-xl p-4 overflow-x-auto">{`---
title: "Lesson Title"
access: free | paid
---

# Lesson Title

Lesson content. Full Markdown: code blocks, images, tables.`}</pre>

          <h3 className="text-base font-semibold text-gray-900 mb-2 mt-6">With quiz</h3>
          <pre className="bg-gray-900 text-sm text-gray-100 rounded-xl p-4 overflow-x-auto">{`---
title: "Core Concepts"
access: paid
quiz:
  - q: "Which answer is correct?"
    options: ["A", "B (correct)", "C", "D"]
    answer: "B (correct)"
    explanation: "B is correct because..."
---`}</pre>

          <h3 className="text-base font-semibold text-gray-900 mb-2 mt-6">With sandbox</h3>
          <pre className="bg-gray-900 text-sm text-gray-100 rounded-xl p-4 overflow-x-auto">{`---
title: "Advanced Patterns"
access: paid
sandbox:
  provider: stackblitz     # or codesandbox
  repo: "you/your-course"
  branch: "lesson-03-starter"
  file: "src/index.ts"
  height: 550
---`}</pre>
        </section>

        {/* CI/CD */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">GitHub Actions CI/CD</h2>
          <p className="text-gray-600 mb-4">
            The template includes <code className="bg-gray-100 px-1 rounded">.github/workflows/deploy.yml</code>.
            On every push to <code className="bg-gray-100 px-1 rounded">main</code>, it validates your YAML and
            auto-imports the course to TeachRepo.
          </p>
          <p className="text-gray-600 mb-4">
            Add one GitHub Actions secret to your repo: <code className="bg-gray-100 px-1 rounded">TEACHREPO_TOKEN</code>
            (get it from <a href="/dashboard/settings" className="text-violet-600 hover:underline">Dashboard → Settings</a>).
          </p>
        </section>

        {/* Links */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 mb-10">
          <h3 className="font-semibold text-gray-900 mb-4">Related</h3>
          <div className="space-y-2">
            {[
              { href: 'https://github.com/ErlisK/teachrepo-template', label: 'GitHub: teachrepo-template (MIT)', external: true },
              { href: 'https://github.com/ErlisK/teachrepo-cli', label: 'GitHub: teachrepo-cli (MIT)', external: true },
              { href: '/docs/cli', label: 'CLI Reference' },
              { href: '/docs/self-hosting', label: 'Self-Hosting Guide' },
              { href: '/docs/quickstart', label: 'Quick Start' },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                target={l.external ? '_blank' : undefined}
                rel={l.external ? 'noopener noreferrer' : undefined}
                className="flex items-center gap-2 text-sm text-violet-600 hover:underline"
              >
                {l.label} {l.external ? '↗' : '→'}
              </a>
            ))}
          </div>
        </div>

        <div className="flex gap-6 text-sm">
          <Link href="/docs" className="text-gray-400 hover:text-violet-600">← All docs</Link>
          <Link href="/docs/cli" className="text-violet-600 hover:underline">CLI Reference →</Link>
        </div>
      </div>
    </div>
  );
}
