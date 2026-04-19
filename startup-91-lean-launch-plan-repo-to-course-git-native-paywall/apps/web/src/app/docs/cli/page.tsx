import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'CLI Reference — TeachRepo Docs',
  description: 'Official TeachRepo CLI (@teachrepo/cli) reference. Import repos, validate course YAML, and scaffold new courses from your terminal.',
};

const commands = [
  {
    name: 'teachrepo import',
    desc: 'Import a GitHub repository as a TeachRepo course.',
    options: [
      { flag: '--repo <url>', desc: 'GitHub repository URL (required)' },
      { flag: '--token <token>', desc: 'TeachRepo API token (or set TEACHREPO_TOKEN)' },
      { flag: '--base-url <url>', desc: 'API base URL (default: https://teachrepo.com)' },
      { flag: '--dry-run', desc: 'Validate course.yml without importing' },
    ],
    examples: [
      'teachrepo import --repo=https://github.com/you/your-course',
      'teachrepo import --repo=https://github.com/you/your-course --dry-run',
      'TEACHREPO_TOKEN=tr_xxx teachrepo import --repo=https://github.com/you/your-course',
    ],
  },
  {
    name: 'teachrepo validate',
    desc: 'Validate a course.yml file without importing.',
    options: [
      { flag: '--file <path>', desc: 'Path to course.yml (default: ./course.yml)' },
      { flag: '--verbose', desc: 'Show detailed validation output including summary' },
    ],
    examples: [
      'teachrepo validate',
      'teachrepo validate --verbose',
      'teachrepo validate --file=./my-course.yml',
    ],
  },
  {
    name: 'teachrepo new <course-name>',
    desc: 'Scaffold a new course from the official template.',
    options: [
      { flag: '--template <t>', desc: 'Template: basic | quiz | sandbox (default: basic)' },
      { flag: '--slug <slug>', desc: 'URL slug (default: kebab-case of course-name)' },
    ],
    examples: [
      'teachrepo new "Advanced Git for Engineers"',
      'teachrepo new "Python Async" --template=sandbox',
      'teachrepo new "React Patterns" --slug=react-patterns --template=quiz',
    ],
  },
  {
    name: 'teachrepo whoami',
    desc: 'Show the authenticated TeachRepo user.',
    options: [
      { flag: '--token <token>', desc: 'TeachRepo API token (or set TEACHREPO_TOKEN)' },
    ],
    examples: [
      'teachrepo whoami',
    ],
  },
];

export default function CliDocs() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-2">
          <Link href="/docs" className="text-sm text-gray-400 hover:text-violet-600">← Docs</Link>
        </div>

        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⌨️</span>
            <div>
              <h1 className="text-3xl font-black text-gray-900">CLI Reference</h1>
              <p className="text-sm text-gray-400 font-mono">@teachrepo/cli</p>
            </div>
          </div>
          <p className="text-lg text-gray-600">
            Import repos, validate course YAML, and scaffold new courses from your terminal.
            Works standalone and in GitHub Actions CI/CD.
          </p>
        </header>

        {/* Install */}
        <div className="rounded-2xl bg-gray-900 p-5 mb-10">
          <p className="text-xs text-gray-400 mb-3 font-mono">Installation</p>
          <pre className="text-sm text-green-400 leading-relaxed">{`# Global install (recommended)
npm install -g @teachrepo/cli

# Or use without installing
npx @teachrepo/cli --help`}</pre>
        </div>

        {/* Auth */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Authentication</h2>
          <p className="text-gray-600 mb-4">
            Set your TeachRepo API token as an environment variable, or pass it with <code className="bg-gray-100 px-1 rounded">--token</code>.
            Get your token at <a href="/dashboard/settings" className="text-violet-600 hover:underline">Dashboard → Settings</a>.
          </p>
          <pre className="bg-gray-900 text-sm text-green-400 rounded-xl p-4">{`export TEACHREPO_TOKEN=tr_your_token_here`}</pre>
        </section>

        {/* Commands */}
        <section className="space-y-10">
          <h2 className="text-xl font-bold text-gray-900">Commands</h2>

          {commands.map((cmd) => (
            <div key={cmd.name} className="border border-gray-100 rounded-2xl overflow-hidden">
              <div className="bg-gray-50 px-5 py-4 border-b border-gray-100">
                <code className="text-base font-bold text-gray-900">{cmd.name}</code>
                <p className="text-sm text-gray-500 mt-1">{cmd.desc}</p>
              </div>
              <div className="p-5">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Options</h4>
                <div className="space-y-2 mb-6">
                  {cmd.options.map((opt) => (
                    <div key={opt.flag} className="flex gap-4">
                      <code className="text-sm font-mono text-violet-700 shrink-0 w-52">{opt.flag}</code>
                      <span className="text-sm text-gray-600">{opt.desc}</span>
                    </div>
                  ))}
                </div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Examples</h4>
                <pre className="bg-gray-900 text-sm text-green-400 rounded-xl p-4 overflow-x-auto">{cmd.examples.join('\n')}</pre>
              </div>
            </div>
          ))}
        </section>

        {/* CI/CD */}
        <section className="mt-14">
          <h2 className="text-xl font-bold text-gray-900 mb-4">GitHub Actions</h2>
          <p className="text-gray-600 mb-4">
            Add the CLI to your workflow to auto-import on every push to <code className="bg-gray-100 px-1 rounded">main</code>.
            The <Link href="/docs/template" className="text-violet-600 hover:underline">course template</Link> includes this workflow pre-configured.
          </p>
          <pre className="bg-gray-900 text-sm text-green-400 rounded-xl p-5 overflow-x-auto">{`name: Deploy to TeachRepo
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g @teachrepo/cli
      - run: teachrepo import --repo="\${{ github.repositoryUrl }}"
        env:
          TEACHREPO_TOKEN: \${{ secrets.TEACHREPO_TOKEN }}`}</pre>
        </section>

        {/* Source */}
        <div className="mt-14 rounded-2xl border border-gray-200 bg-gray-50 p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Source Code</h3>
          <p className="text-sm text-gray-600 mb-4">The CLI is open-source under MIT. Issues and PRs welcome.</p>
          <a
            href="https://github.com/ErlisK/teachrepo-cli"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300"
          >
            ⭐ github.com/ErlisK/teachrepo-cli →
          </a>
        </div>

        <div className="mt-12 flex gap-6 text-sm">
          <Link href="/docs" className="text-gray-400 hover:text-violet-600">← All docs</Link>
          <Link href="/docs/template" className="text-violet-600 hover:underline">Course Template →</Link>
        </div>
      </div>
    </div>
  );
}
