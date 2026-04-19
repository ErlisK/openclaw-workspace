import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CLI Reference — TeachRepo Docs',
  description: 'Full reference for the teachrepo command-line interface.',
};

function Cmd({ name, args, desc, example }: { name: string; args?: string; desc: string; example?: string }) {
  return (
    <div className="mb-8 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <code className="rounded bg-gray-900 px-3 py-1 text-sm font-mono text-green-300">
          teachrepo {name}
        </code>
        {args && (
          <code className="rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-500">{args}</code>
        )}
      </div>
      <p className="mb-2 text-sm text-gray-700">{desc}</p>
      {example && (
        <pre className="mt-3 overflow-x-auto rounded-lg bg-gray-900 px-4 py-3 text-xs text-green-300">
          <code>{example}</code>
        </pre>
      )}
    </div>
  );
}

export default function CLIPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      <nav className="mb-8 text-sm">
        <a href="/docs" className="text-violet-600 hover:underline">Docs</a>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-600">CLI Reference</span>
      </nav>

      <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900">CLI Reference</h1>
      <p className="mb-12 text-lg text-gray-600">
        The <code className="bg-gray-100 px-1.5 rounded text-sm">teachrepo</code> CLI gives you a
        Git-native workflow for creating, importing, and deploying courses.
      </p>

      <h2 className="mb-6 text-xl font-bold text-gray-900">Authentication</h2>

      <Cmd
        name="login"
        desc="Authenticate with your TeachRepo account. Opens a browser window to complete OAuth."
        example="$ teachrepo login\n✓ Logged in as you@example.com"
      />

      <Cmd
        name="logout"
        desc="Remove stored credentials from your local machine."
        example="$ teachrepo logout\n✓ Credentials cleared"
      />

      <Cmd
        name="whoami"
        desc="Display the currently authenticated user and account details."
        example="$ teachrepo whoami\nyou@example.com (Pro tier)"
      />

      <h2 className="mb-6 mt-10 text-xl font-bold text-gray-900">Course Management</h2>

      <Cmd
        name="init"
        args="[directory]"
        desc="Scaffold a new course template in the given directory (or current directory)."
        example={`$ teachrepo init my-course\n✓ Created my-course/\n  ├── course.yml\n  ├── lessons/01-introduction.md\n  └── README.md`}
      />

      <Cmd
        name="import"
        args="<repo-url> [--branch <branch>] [--tag <tag>]"
        desc="Import a GitHub repository as a TeachRepo course. Parses course.yml, creates lessons, stores version."
        example={`$ teachrepo import https://github.com/you/my-course\n→ Fetching repo...\n→ Parsing course.yml...\n→ Created 8 lessons, 3 quizzes\n✓ Course imported: https://teachrepo.com/courses/my-course`}
      />

      <Cmd
        name="import"
        args="--dir <path>"
        desc="Import from a local directory of Markdown files instead of a GitHub repo."
        example="$ teachrepo import --dir ./my-notes"
      />

      <Cmd
        name="publish"
        args="<slug>"
        desc="Toggle a course live on TeachRepo. Published courses appear in the marketplace and are accessible at their URL."
        example="$ teachrepo publish typescript-deep-dive\n✓ Published: https://teachrepo.com/courses/typescript-deep-dive"
      />

      <Cmd
        name="unpublish"
        args="<slug>"
        desc="Take a course offline (it remains in your dashboard but is not publicly accessible)."
        example="$ teachrepo unpublish typescript-deep-dive"
      />

      <Cmd
        name="versions"
        args="<slug>"
        desc="List all imported versions of a course with commit SHAs, import dates, and current pointer."
        example={`$ teachrepo versions typescript-deep-dive\n  v-abc1234  2025-01-15  (current)\n  v-def5678  2025-01-08`}
      />

      <Cmd
        name="promote"
        args="<slug> <version-label>"
        desc="Promote an older version to current. Useful for rollbacks."
        example="$ teachrepo promote typescript-deep-dive v-def5678"
      />

      <h2 className="mb-6 mt-10 text-xl font-bold text-gray-900">Quizzes</h2>

      <Cmd
        name="quiz generate"
        args="<slug> <lesson-slug> [--count 5]"
        desc="Use AI to generate a quiz for a lesson. Opens an interactive editor to review questions before saving."
        example={`$ teachrepo quiz generate typescript-deep-dive intro-to-types --count 3\n→ Generating 3 questions with AI...\n→ Reviewing...\n✓ Saved quiz with 3 questions`}
      />

      <h2 className="mb-6 mt-10 text-xl font-bold text-gray-900">Global Options</h2>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Flag</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[
              ['--help', 'Show help for any command'],
              ['--version', 'Show CLI version'],
              ['--token <jwt>', 'Override auth token (useful in CI)'],
              ['--api-url <url>', 'Override API base URL (for self-hosted)'],
              ['--json', 'Output results as JSON (useful for scripting)'],
            ].map(([flag, desc]) => (
              <tr key={flag}>
                <td className="px-4 py-3 font-mono text-xs text-violet-700">{flag}</td>
                <td className="px-4 py-3 text-gray-600">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 rounded-xl bg-violet-50 p-6">
        <h2 className="mb-2 font-semibold text-gray-900">Install</h2>
        <pre className="rounded-lg bg-gray-900 px-4 py-3 text-sm text-green-300">
          <code>npm install -g @teachrepo/cli</code>
        </pre>
        <p className="mt-3 text-sm text-gray-600">
          Requires Node.js 18+. The CLI is open-source —
          <a href="https://github.com/ErlisK/openclaw-workspace" className="ml-1 text-violet-600 hover:underline">
            view on GitHub ↗
          </a>
        </p>
      </div>
    </div>
  );
}
