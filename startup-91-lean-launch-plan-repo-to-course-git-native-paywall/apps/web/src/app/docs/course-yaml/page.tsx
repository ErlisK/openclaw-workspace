import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'course.yml Reference — TeachRepo Docs',
  description: 'Complete reference for course.yml and lesson frontmatter fields.',
};

function Field({
  name, type, required, defaultVal, desc,
}: { name: string; type: string; required?: boolean; defaultVal?: string; desc: string }) {
  return (
    <tr>
      <td className="px-4 py-3 align-top">
        <code className="text-xs text-violet-700 font-mono">{name}</code>
        {required && <span className="ml-1 text-xs text-red-500">*</span>}
      </td>
      <td className="px-4 py-3 align-top">
        <code className="text-xs text-gray-500">{type}</code>
      </td>
      <td className="px-4 py-3 align-top text-xs text-gray-400">{defaultVal ?? '—'}</td>
      <td className="px-4 py-3 align-top text-sm text-gray-600">{desc}</td>
    </tr>
  );
}

export default function CourseYamlPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 lg:px-8">
      <nav className="mb-8 text-sm">
        <a href="/docs" className="text-violet-600 hover:underline">Docs</a>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-600">course.yml Reference</span>
      </nav>

      <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900">course.yml Reference</h1>
      <p className="mb-12 text-lg text-gray-600">
        Every field in <code className="bg-gray-100 px-1.5 rounded text-sm">course.yml</code> (course metadata)
        and lesson Markdown frontmatter. Fields marked <span className="text-red-500">*</span> are required.
      </p>

      {/* course.yml */}
      <h2 className="mb-4 text-2xl font-bold text-gray-900">course.yml</h2>
      <p className="mb-4 text-sm text-gray-600">
        Place this file at the root of your repository. All other paths are relative to it.
      </p>

      <div className="mb-4 overflow-x-auto rounded-xl border border-gray-100">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 w-36">Field</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 w-20">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 w-24">Default</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <Field name="title" type="string" required desc="Course title shown on the course page and marketplace." />
            <Field name="slug" type="string" required desc="URL-safe identifier. Must be unique per creator. Used in /courses/<slug>." />
            <Field name="description" type="string" desc="Short description shown in search results and the course card." />
            <Field name="price_cents" type="integer" defaultVal="0" desc="Price in cents (USD). 0 = free. E.g. 2900 = $29.00." />
            <Field name="currency" type="string" defaultVal="usd" desc="ISO 4217 currency code. Currently usd, eur, gbp supported." />
            <Field name="repo_url" type="string" desc="GitHub repository URL. Used for version tracking and re-imports." />
            <Field name="lessons_dir" type="string" defaultVal="lessons/" desc="Directory containing lesson Markdown files, relative to repo root." />
            <Field name="quizzes_dir" type="string" defaultVal="quizzes/" desc="Directory containing quiz YAML files, relative to repo root." />
            <Field name="cover_image" type="string" desc="URL or relative path to course cover image (1200×630 recommended)." />
            <Field name="tags" type="string[]" desc="Searchable tags displayed on the course card and marketplace." />
            <Field name="affiliate_pct" type="integer" defaultVal="0" desc="Affiliate commission percentage (0–80). Affiliates receive this % of each sale they refer." />
            <Field name="pricing_model" type="string" defaultVal="one_time" desc="one_time or subscription (subscription requires Stripe subscription config)." />
          </tbody>
        </table>
      </div>

      <div className="mb-12">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Example course.yml</h3>
        <pre className="overflow-x-auto rounded-xl bg-gray-900 px-5 py-4 text-sm text-green-300">
          <code>{`title: "TypeScript Deep Dive"
slug: "typescript-deep-dive"
description: "Master TypeScript from fundamentals to advanced patterns."
price_cents: 2900
currency: "usd"
repo_url: "https://github.com/you/typescript-deep-dive"
lessons_dir: "lessons/"
cover_image: "https://example.com/cover.png"
tags: ["typescript", "javascript", "programming"]
affiliate_pct: 20`}</code>
        </pre>
      </div>

      {/* Lesson frontmatter */}
      <h2 className="mb-4 text-2xl font-bold text-gray-900">Lesson Frontmatter</h2>
      <p className="mb-4 text-sm text-gray-600">
        Each Markdown lesson file must begin with YAML frontmatter between <code>---</code> delimiters.
      </p>

      <div className="mb-4 overflow-x-auto rounded-xl border border-gray-100">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 w-36">Field</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 w-20">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 w-24">Default</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <Field name="title" type="string" required desc="Lesson title shown in the sidebar and lesson header." />
            <Field name="slug" type="string" required desc="URL-safe identifier. Inferred from filename if omitted." />
            <Field name="order" type="integer" required desc="Sort order in the course sidebar. Start from 1." />
            <Field name="access" type="string" defaultVal="paid" desc="free = public preview (no enrollment required). paid = gated." />
            <Field name="description" type="string" desc="Short summary shown in the sidebar tooltip and lesson header." />
            <Field name="estimated_minutes" type="integer" desc="Estimated reading/watching time shown on the lesson header." />
            <Field name="sandbox_url" type="string" desc="StackBlitz, CodeSandbox, or CodePen embed URL. Gated for paid lessons." />
            <Field name="quiz_slug" type="string" desc="Slug of a quiz YAML file in quizzes_dir to attach to this lesson." />
          </tbody>
        </table>
      </div>

      <div className="mb-12">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Example lesson file</h3>
        <pre className="overflow-x-auto rounded-xl bg-gray-900 px-5 py-4 text-sm text-green-300">
          <code>{`---
title: "Generics in TypeScript"
slug: "generics"
order: 5
access: paid
description: "Use generics to write reusable, type-safe code."
estimated_minutes: 20
sandbox_url: "https://stackblitz.com/edit/ts-generics-demo?embed=1"
quiz_slug: "generics-quiz"
---

# Generics in TypeScript

Generics allow you to write functions and classes that work with
multiple types while maintaining type safety...`}</code>
        </pre>
      </div>

      {/* Quiz YAML */}
      <h2 className="mb-4 text-2xl font-bold text-gray-900">Quiz YAML</h2>
      <p className="mb-6 text-sm text-gray-600">
        Quiz files live in <code>quizzes/</code> and define auto-graded questions.
        They can be hand-authored or generated via <code>teachrepo quiz generate</code>.
      </p>
      <pre className="mb-12 overflow-x-auto rounded-xl bg-gray-900 px-5 py-4 text-sm text-green-300">
        <code>{`id: "generics-quiz"
title: "Generics Quiz"
pass_threshold: 70
questions:
  - type: multiple_choice
    prompt: "What is the primary purpose of generics?"
    choices:
      - "To make code run faster"
      - "To write reusable, type-safe code"
      - "To avoid null checks"
      - "To enable async/await"
    answer: 1
    explanation: "Generics let you write functions and classes that work with multiple types."
    points: 1

  - type: true_false
    prompt: "Generic constraints restrict which types can be used."
    answer: true
    explanation: "The 'extends' keyword adds constraints to generic type parameters."
    points: 1`}</code>
      </pre>
    </div>
  );
}
