import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Repo Format — TeachRepo Docs',
  description: 'Directory layout, frontmatter fields, and file naming conventions for TeachRepo courses.',
  alternates: { canonical: 'https://teachrepo.com/docs/repo-format' },
};

export default function RepoFormatPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/docs" className="text-sm text-violet-600 hover:text-violet-800">← Docs</Link>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Repo Format</h1>
      <p className="text-gray-600 mb-8 text-lg">
        A TeachRepo course is just a Git repo with a specific directory layout and YAML frontmatter.
        No build step required — push and it publishes.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Directory layout</h2>
        <pre className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-sm font-mono overflow-x-auto text-gray-800 leading-relaxed">
{`my-course/
├── course.yml          ← required: course metadata
├── 01-intro.md         ← lesson 1
├── 02-setup.md         ← lesson 2
├── 03-deep-dive/
│   ├── lesson.md       ← lesson in subfolder
│   └── sandbox.json    ← optional sandbox config
└── quizzes/
    └── intro-quiz.yml  ← auto-graded quiz`}
        </pre>
        <p className="mt-3 text-sm text-gray-500">
          Lessons are discovered by file order (<code className="bg-gray-100 px-1 rounded">01-</code>, <code className="bg-gray-100 px-1 rounded">02-</code>, …) or by <code className="bg-gray-100 px-1 rounded">order</code> frontmatter.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">course.yml fields</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Field</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Required</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ['title', 'Yes', 'Display name of the course'],
                ['slug', 'Yes', 'URL-safe identifier, e.g. git-for-engineers'],
                ['description', 'No', 'Short description shown in course cards'],
                ['price_cents', 'No', 'Price in cents. 0 = free. Default: 0'],
                ['currency', 'No', 'ISO 4217 code, e.g. usd. Default: usd'],
                ['repo_url', 'No', 'Source repo URL (for version tracking)'],
                ['version', 'No', 'Semver string, e.g. 1.0.0'],
                ['draft', 'No', 'true = hidden from marketplace'],
                ['tags', 'No', 'YAML list of topic tags'],
              ].map(([field, req, desc]) => (
                <tr key={field} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-violet-700">{field}</td>
                  <td className="px-4 py-2 text-gray-500">{req}</td>
                  <td className="px-4 py-2 text-gray-700">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Lesson frontmatter</h2>
        <pre className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-sm font-mono overflow-x-auto text-gray-800">
{`---
title: "Introduction to Git"
slug: intro-to-git           # URL-safe, auto-derived from filename if absent
order: 1
access: free                 # free | paid (default: paid)
estimated_minutes: 10
description: "Learn the basics of version control."
quiz_id: intro-quiz          # links to quizzes/intro-quiz.yml
sandbox_url: https://...     # optional: gated StackBlitz/CodeSandbox URL
---

Your lesson content in Markdown (MDX supported).`}
        </pre>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Full example</h2>
        <pre className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-sm font-mono overflow-x-auto text-gray-800">
{`# course.yml
title: "Git for Engineers"
slug: git-for-engineers
description: "Master Git workflows used in real engineering teams."
price_cents: 4900
currency: usd
repo_url: https://github.com/you/git-for-engineers
tags:
  - git
  - devops
  - version-control`}
        </pre>
      </section>

      <div className="mt-10 flex gap-4">
        <Link href="/docs/quizzes" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
          Next: Quizzes YAML →
        </Link>
        <Link href="/docs/cli" className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          CLI usage
        </Link>
      </div>
    </div>
  );
}
