import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Quizzes YAML Schema — TeachRepo Docs',
  description: 'Full YAML schema reference for auto-graded quizzes in TeachRepo courses.',
  alternates: { canonical: 'https://teachrepo.com/docs/quizzes' },
};

export default function QuizzesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/docs" className="text-sm text-violet-600 hover:text-violet-800">← Docs</Link>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Quizzes YAML Schema</h1>
      <p className="text-gray-600 mb-8 text-lg">
        Drop a <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">quizzes/*.yml</code> file
        in your repo and TeachRepo auto-grades it. Supports multiple-choice, true/false, and short-answer questions.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Full schema example</h2>
        <pre className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-sm font-mono overflow-x-auto text-gray-800 leading-relaxed">
{`# quizzes/intro-quiz.yml
id: intro-quiz
title: "Git Basics Quiz"
pass_threshold: 70         # percentage correct to pass
questions:
  - type: multiple_choice
    prompt: "What does 'git commit' do?"
    options:
      - "Saves changes to the remote"
      - "Records changes to the local repo"    # ← correct
      - "Deletes the staging area"
      - "Creates a new branch"
    answer: 1              # 0-indexed, or list for multi-select
    explanation: "git commit records staged changes to your local history."
    points: 2

  - type: true_false
    prompt: "A Git branch is a pointer to a commit."
    answer: true
    explanation: "Branches are just lightweight movable pointers."
    points: 1

  - type: short_answer
    prompt: "Name the command that shows the commit log."
    answer: "git log"      # case-insensitive, trimmed
    explanation: "git log shows the commit history."
    points: 1`}
        </pre>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Top-level fields</h2>
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
                ['id', 'Yes', 'Matches quiz_id in lesson frontmatter'],
                ['title', 'Yes', 'Display name shown above the quiz'],
                ['pass_threshold', 'No', 'Min % correct to pass (default: 70)'],
                ['questions', 'Yes', 'Array of question objects (see below)'],
              ].map(([f, r, d]) => (
                <tr key={f} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-violet-700">{f}</td>
                  <td className="px-4 py-2 text-gray-500">{r}</td>
                  <td className="px-4 py-2 text-gray-700">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Question types</h2>
        <div className="space-y-4">
          {[
            {
              type: 'multiple_choice',
              fields: 'prompt, options (array), answer (0-indexed int or int[]), explanation, points',
              note: 'Set answer to an array for multi-select questions.',
            },
            {
              type: 'true_false',
              fields: 'prompt, answer (true | false), explanation, points',
              note: 'Renders as two radio buttons.',
            },
            {
              type: 'short_answer',
              fields: 'prompt, answer (string), explanation, points',
              note: 'Case-insensitive, whitespace-trimmed match.',
            },
          ].map((q) => (
            <div key={q.type} className="border border-gray-200 rounded-xl p-4">
              <code className="text-sm font-mono bg-violet-50 text-violet-700 px-2 py-0.5 rounded">{q.type}</code>
              <p className="mt-2 text-sm text-gray-600"><strong>Fields:</strong> {q.fields}</p>
              <p className="mt-1 text-sm text-gray-500">{q.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">AI quiz generation</h2>
        <p className="text-gray-600 text-sm mb-3">
          Don&#39;t want to write quizzes by hand? Use the dashboard&#39;s <strong>AI Quiz Generator</strong>:
        </p>
        <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-600">
          <li>Open a lesson in your Dashboard → Course editor</li>
          <li>Click <strong>Generate quiz from lesson</strong></li>
          <li>Set the number of questions (3–10) and click Generate</li>
          <li>Edit any questions, then click <strong>Save quiz</strong></li>
        </ol>
        <p className="mt-3 text-sm text-gray-500">
          The AI reads your lesson content and produces a ready-to-use YAML quiz. You can export it back to your repo.
        </p>
      </section>

      <div className="mt-10 flex gap-4">
        <Link href="/docs/payments-affiliates" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
          Next: Payments & Affiliates →
        </Link>
        <Link href="/docs/repo-format" className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          ← Repo Format
        </Link>
      </div>
    </div>
  );
}
