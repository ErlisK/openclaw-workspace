import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Migration Guide — DocsCI",
  description: "Migrate from pytest doctest, Jupyter notebooks, and custom test scripts to DocsCI.",
};

export default function MigrationGuidePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4 text-sm">
        <Link href="/docs" className="text-white font-bold">← Docs</Link>
        <span className="text-gray-600">/</span>
        <Link href="/docs/guides" className="text-gray-400 hover:text-white">Guides</Link>
        <span className="text-gray-600">/</span>
        <span className="text-gray-400">Migration</span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-indigo-400 text-xs font-medium uppercase tracking-wide mb-2">Migration Guide</div>
        <h1 className="text-3xl font-bold text-white mb-3">
          Migrating from ad-hoc doctests
        </h1>
        <p className="text-gray-400 mb-2">
          If you&apos;re using pytest doctests, Jupyter notebooks, custom shell scripts, or manual spot-checks to
          verify code examples in your docs, this guide shows how to replace them with DocsCI
          — typically in under an hour, with zero friction for authors.
        </p>
        <p className="text-gray-500 text-sm mb-10">
          Migration effort: <span className="text-green-400">~30 min</span> for most repos.
        </p>

        {/* Comparison table */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Before vs. After</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 py-2 pr-8 font-medium">Before (ad-hoc)</th>
                  <th className="text-left text-gray-400 py-2 font-medium">After (DocsCI)</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {[
                  ["Run tests manually before releases", "Runs on every push automatically"],
                  ["Only Python supported via pytest", "Python + JavaScript + TypeScript"],
                  ["No accessibility or copy checks", "a11y + copy lint built in"],
                  ["No API drift detection", "OpenAPI spec drift detected"],
                  ["Failures discovered late", "PRs annotated with precise fixes"],
                  ["Test infra maintained by you", "Zero infra: hosted, scalable"],
                  ["Custom scripts per team", "Single docsci.yml per repo"],
                  ["No AI fix suggestions", "AI patch diffs for every error"],
                ].map(([before, after]) => (
                  <tr key={before} className="border-b border-gray-800">
                    <td className="py-2 pr-8 text-red-400">{before}</td>
                    <td className="py-2 text-green-400">{after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Step-by-step */}
        <h2 className="text-xl font-bold text-white mb-6">Step-by-step migration</h2>

        {[
          {
            n: 1,
            title: "Create a DocsCI project",
            time: "5 min",
            content: (
              <>
                <p className="text-gray-400 text-sm mb-3">
                  Go to <Link href="/dashboard/projects" className="text-indigo-400 underline">Projects</Link> and click{" "}
                  <strong className="text-white">+ New Project</strong>. In the wizard:
                </p>
                <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside ml-2">
                  <li>Point it at your GitHub repo</li>
                  <li>Set <strong className="text-white">docs path</strong> to wherever your Markdown lives (e.g. <code className="bg-gray-800 px-1 rounded">docs</code>)</li>
                  <li>Optionally set your OpenAPI spec path for drift detection</li>
                </ul>
              </>
            ),
          },
          {
            n: 2,
            title: "Run your first check",
            time: "2 min",
            content: (
              <>
                <p className="text-gray-400 text-sm mb-3">
                  Click <strong className="text-white">▶ Run CI</strong> on the project page. DocsCI will immediately
                  find the same issues your doctests would — plus accessibility and copy problems.
                </p>
                <p className="text-gray-500 text-xs">
                  Tip: review the findings before committing the CI template — this gives you a baseline.
                </p>
              </>
            ),
          },
          {
            n: 3,
            title: "Add docsci.yml (optional but recommended)",
            time: "5 min",
            content: (
              <>
                <p className="text-gray-400 text-sm mb-2">
                  Create <code className="bg-gray-800 px-1 rounded">docsci.yml</code> in your repo root to match your existing test scope:
                </p>
                <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-xs text-green-300 overflow-x-auto mb-2">{`# docsci.yml
docs:
  path: docs          # where your Markdown lives
  include:
    - "docs/**/*.md"
  exclude:
    - "docs/internal/**"  # exclude internal drafts

snippets:
  languages: [python, javascript]  # match your existing doctest languages
  skip_patterns:
    - "# doctest: skip"   # reuse your existing skip markers!
    - "# docsci: skip"

checks:
  accessibility: true
  copy_lint: true`}</pre>
                <p className="text-gray-500 text-xs">
                  The <code>skip_patterns</code> field is backward compatible — your existing{" "}
                  <code># doctest: skip</code> markers will work.
                </p>
              </>
            ),
          },
          {
            n: 4,
            title: "Add the CI template",
            time: "5 min",
            content: (
              <>
                <p className="text-gray-400 text-sm mb-2">
                  Pick the template for your CI system:
                </p>
                <div className="flex gap-2 flex-wrap mb-3">
                  {[
                    { label: "GitHub Actions", id: "github-actions", href: "/docs/templates#github-actions" },
                    { label: "GitLab CI", id: "gitlab-ci", href: "/docs/templates#gitlab-ci" },
                    { label: "curl script", id: "curl-fallback", href: "/docs/templates#curl-fallback" },
                  ].map((t) => (
                    <Link
                      key={t.id}
                      href={t.href}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-full border border-gray-600 transition-colors"
                    >
                      {t.label} →
                    </Link>
                  ))}
                </div>
                <p className="text-gray-500 text-xs">
                  Set <code className="bg-gray-800 px-1 rounded text-green-300">DOCSCI_TOKEN</code> as a CI secret and{" "}
                  <code className="bg-gray-800 px-1 rounded text-green-300">DOCSCI_PROJECT_ID</code> as a variable.
                </p>
              </>
            ),
          },
          {
            n: 5,
            title: "Remove your old doctest scripts",
            time: "10 min",
            content: (
              <>
                <p className="text-gray-400 text-sm mb-3">
                  Once DocsCI is running clean, remove the ad-hoc doctest infra:
                </p>
                <div className="space-y-3">
                  <MigrationCard
                    from="pytest --doctest-glob"
                    to="DocsCI snippet execution"
                    note="Same Python execution, plus JS/TS, plus AI fix suggestions"
                  />
                  <MigrationCard
                    from="nbval / nbmake (Jupyter)"
                    to="Extract code cells to .md and run via DocsCI"
                    note="Use nbconvert to export notebooks to Markdown first"
                  />
                  <MigrationCard
                    from="Custom bash test script"
                    to="docsci.yml + /api/runs/queue"
                    note="Replace with the curl fallback script template"
                  />
                  <MigrationCard
                    from="Manual review before releases"
                    to="PR comments with AI patch diffs"
                    note="Findings annotated on every PR automatically"
                  />
                </div>
              </>
            ),
          },
          {
            n: 6,
            title: "Configure skip markers (backward compat)",
            time: "5 min",
            content: (
              <>
                <p className="text-gray-400 text-sm mb-2">
                  If your docs already use skip markers, add them to <code className="bg-gray-800 px-1 rounded">docsci.yml</code>:
                </p>
                <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-xs text-green-300 overflow-x-auto">{`snippets:
  skip_patterns:
    - "# doctest: skip"       # pytest doctest marker
    - "# doctest: +SKIP"      # alternate pytest marker
    - "# type: ignore"        # mypy ignore (usually means untestable)
    - "# noqa"                # flake8 ignore
    - "# docsci: skip"        # DocsCI native marker
    - "// @ts-nocheck"        # TypeScript skip
    - "/* eslint-disable */"  # JS linting disable`}</pre>
              </>
            ),
          },
        ].map(({ n, title, time, content }) => (
          <div key={n} className="mb-10 flex gap-5">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                {n}
              </div>
              {n < 6 && <div className="w-0.5 bg-gray-700 flex-1 mt-2" />}
            </div>
            <div className="flex-1 pb-6">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-white font-semibold text-base">{title}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                  ~{time}
                </span>
              </div>
              {content}
            </div>
          </div>
        ))}

        {/* FAQ */}
        <div className="border-t border-gray-800 pt-8 mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Frequently asked questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "Can I keep running pytest doctests alongside DocsCI?",
                a: "Yes. DocsCI is additive — run both. Over time you can remove doctests as DocsCI covers the same ground plus more (a11y, drift, copy).",
              },
              {
                q: "What if my code examples need environment setup (pip install, env vars)?",
                a: "Use skip_patterns to skip snippets that require specific setup. DocsCI sandboxes are ephemeral — they can't install arbitrary packages yet (roadmap: custom runtime images).",
              },
              {
                q: "How do I handle examples that are intentionally wrong (showing error output)?",
                a: "Add `# docsci: skip` to those snippets, or configure a custom skip_pattern like `# expected error`.",
              },
              {
                q: "Can I migrate GitBook / Mintlify / ReadMe docs?",
                a: "Yes — DocsCI works with any Markdown. Point docs.path at the folder containing your .md files.",
              },
              {
                q: "Do I need to change how authors write docs?",
                a: "No. Fenced code blocks work as-is. Authors only need to add `# docsci: skip` to examples that can't run.",
              },
            ].map(({ q, a }) => (
              <div key={q}>
                <p className="text-white text-sm font-medium mb-1">Q: {q}</p>
                <p className="text-gray-400 text-sm">A: {a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-indigo-950 border border-indigo-800 rounded-xl p-6 flex items-start gap-4">
          <span className="text-3xl">🚀</span>
          <div>
            <h3 className="text-indigo-200 font-semibold mb-1">Ready to migrate?</h3>
            <p className="text-indigo-300 text-sm mb-3">
              Create your first project and run a check in under 5 minutes. No credit card required.
            </p>
            <div className="flex gap-3">
              <Link
                href="/signup"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors font-medium"
              >
                Get started free →
              </Link>
              <Link
                href="/docs/templates"
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm rounded-lg transition-colors"
              >
                View templates
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MigrationCard({ from, to, note }: { from: string; to: string; note: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start text-xs">
      <div className="bg-red-950 border border-red-800 rounded-lg p-3">
        <p className="text-red-400 font-medium mb-0.5">Remove</p>
        <p className="text-red-200">{from}</p>
      </div>
      <div className="text-gray-500 pt-4">→</div>
      <div className="bg-green-950 border border-green-800 rounded-lg p-3">
        <p className="text-green-400 font-medium mb-0.5">Replace with</p>
        <p className="text-green-200">{to}</p>
      </div>
      <div className="col-span-3 text-gray-500 text-xs pl-1">
        💡 {note}
      </div>
    </div>
  );
}
