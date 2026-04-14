import Link from "next/link";
import NavBar from "@/components/NavBar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Getting Started — DocsCI",
  description: "Set up DocsCI in 5 minutes: connect your repo, run your first CI check.",
};

export default function GettingStartedPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <NavBar />
      {/* Breadcrumb */}
      <div className="border-b border-gray-800 px-6 py-2 flex items-center gap-3 text-sm max-w-7xl mx-auto">
        <Link href="/docs" className="text-gray-500 hover:text-gray-300">Docs</Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-400">Getting Started</span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-indigo-400 text-xs font-medium uppercase tracking-wide mb-2">Getting Started</div>
        <h1 className="text-3xl font-bold text-white mb-3">Set up DocsCI in 5 minutes</h1>
        <p className="text-gray-400 mb-10">
          Connect a GitHub repository, point DocsCI at your docs folder, and trigger your first CI run.
        </p>

        {/* Steps */}
        {[
          {
            n: 1,
            title: "Create an account",
            content: (
              <p className="text-gray-400 text-sm">
                <Link href="/signup" className="text-indigo-400 underline">Sign up</Link> with your work email.
                No credit card required for the free tier. A personal org is created automatically.
              </p>
            ),
          },
          {
            n: 2,
            title: "Create a project",
            content: (
              <>
                <p className="text-gray-400 text-sm mb-2">
                  Go to <Link href="/dashboard/projects" className="text-indigo-400 underline">Projects</Link> and click <strong className="text-white">+ New Project</strong>.
                  The wizard will ask for:
                </p>
                <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside ml-2">
                  <li><strong className="text-white">GitHub repo URL</strong> — validated format: https://github.com/owner/repo</li>
                  <li><strong className="text-white">Docs path</strong> — folder containing your Markdown files (default: <code className="bg-gray-800 px-1 rounded">docs</code>)</li>
                  <li><strong className="text-white">OpenAPI spec</strong> — optional: path in repo or remote URL for drift detection</li>
                  <li><strong className="text-white">Network allowlist</strong> — domains your code examples may call</li>
                </ul>
                <p className="text-gray-500 text-xs mt-2">
                  💡 Tip: Click <strong>"Use stripe/stripe-node (sample)"</strong> to start with a pre-filled public repo.
                </p>
              </>
            ),
          },
          {
            n: 3,
            title: "Trigger your first run",
            content: (
              <p className="text-gray-400 text-sm">
                Click <strong className="text-white">▶ Run CI</strong> on your project page. DocsCI will:
                execute all code snippets in sandboxes, run accessibility checks, lint copy,
                and detect API drift — in parallel. Typical duration: 15–60 seconds.
              </p>
            ),
          },
          {
            n: 4,
            title: "Review findings",
            content: (
              <p className="text-gray-400 text-sm">
                Each finding has a severity (<span className="text-red-400">error</span>, <span className="text-yellow-400">warning</span>, <span className="text-blue-400">info</span>),
                kind (snippet failure, API drift, accessibility, copy), and an
                AI-generated fix with a patch diff you can download.
              </p>
            ),
          },
          {
            n: 5,
            title: "Add the GitHub Action",
            content: (
              <>
                <p className="text-gray-400 text-sm mb-2">
                  Copy the workflow from <Link href="/docs/templates#github-actions" className="text-indigo-400 underline">CI Templates</Link> to auto-run DocsCI on every push:
                </p>
                <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-xs text-green-300 overflow-x-auto">{`# .github/workflows/docsci.yml
name: DocsCI
on: [push, pull_request]
jobs:
  docs-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          curl -X POST https://snippetci.com/api/runs/queue \\
            -H "Authorization: Bearer \${{ secrets.DOCSCI_TOKEN }}" \\
            -H "Content-Type: application/json" \\
            -d '{"mode":"repo","repo_id":"\${{ vars.DOCSCI_PROJECT_ID }}"}'`}</pre>
              </>
            ),
          },
        ].map(({ n, title, content }) => (
          <div key={n} className="mb-8 flex gap-5">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
              {n}
            </div>
            <div className="flex-1">
              <h2 className="text-white font-semibold text-lg mb-2">{title}</h2>
              {content}
            </div>
          </div>
        ))}

        <div className="bg-indigo-950 border border-indigo-800 rounded-xl p-6 mt-8">
          <h3 className="text-indigo-200 font-semibold mb-2">Next: Explore guides</h3>
          <p className="text-indigo-300 text-sm mb-3">
            Learn how each analyzer works, how to configure drift detection, and how to tune copy lint rules.
          </p>
          <Link
            href="/docs/guides"
            className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors"
          >
            Read the guides →
          </Link>
        </div>
      </div>
    </div>
  );
}
