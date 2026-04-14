import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Public Templates & Code Snippets — DocsCI",
  description: "Freely copy-paste DocsCI configuration templates: GitHub Actions workflow, GitLab CI pipeline, docsci.yml reference, and pre-commit hook. No login required.",
  alternates: { canonical: "https://snippetci.com/gists" },
  openGraph: {
    title: "Public Templates & Code Snippets — DocsCI",
    description: "GitHub Actions, GitLab CI, docsci.yml, and pre-commit templates for documentation CI.",
    url: "https://snippetci.com/gists",
    type: "website",
    siteName: "DocsCI",
  },
};

const templates = [
  {
    id: "github-actions",
    title: "GitHub Actions — DocsCI workflow",
    filename: ".github/workflows/docsci.yml",
    rawPath: "/templates/docsci-github-actions.yml",
    description: "Drop-in GitHub Actions workflow for documentation CI. Runs on push and pull_request, archives docs, posts results as PR comments. Includes a snippet execution step and OpenAPI drift detection when configured.",
    tags: ["GitHub Actions", "YAML", "CI"],
    docsLink: "/docs/integrations/github-actions",
    lines: 85,
  },
  {
    id: "docsci-config",
    title: "docsci.yml — project configuration reference",
    filename: "docsci.yml",
    rawPath: "/templates/docsci.yml",
    description: "Full docsci.yml configuration reference with all supported keys: snippet execution settings, network allowlist, OpenAPI drift detection, accessibility checks, copy linting, and notification rules.",
    tags: ["YAML", "config", "reference"],
    docsLink: "/docs/getting-started",
    lines: 68,
  },
  {
    id: "gitlab-ci",
    title: "GitLab CI — DocsCI pipeline",
    filename: ".gitlab-ci.yml (docsci stage)",
    rawPath: "/templates/docsci-gitlab-ci.yml",
    description: "GitLab CI configuration for documentation testing with DocsCI. Uses a dedicated `docs` stage that runs after build. Supports merge request pipelines and posts findings as MR comments via the GitLab API.",
    tags: ["GitLab CI", "YAML", "CI"],
    docsLink: "/docs/integrations/gitlab-ci",
    lines: 52,
  },
  {
    id: "pre-commit",
    title: "pre-commit hook — local snippet checks",
    filename: ".pre-commit-config.yaml",
    rawPath: "/templates/docsci-pre-commit.yaml",
    description: "Run DocsCI checks locally before committing. Catches broken snippets and credential patterns before they reach CI. Requires pre-commit and a DOCSCI_TOKEN environment variable.",
    tags: ["pre-commit", "YAML", "local dev"],
    docsLink: "/docs/guides",
    lines: 28,
  },
];

export default function GistsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="gists-page">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 text-sm">
          <Link href="/" className="text-white font-bold">⚡ DocsCI</Link>
          <span className="text-gray-700">/</span>
          <span className="text-gray-300">Public templates</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/docs" className="text-sm text-gray-400 hover:text-white transition-colors">Docs</Link>
          <Link href="/signup" className="text-sm px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors">
            Get started free
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-3" data-testid="gists-h1">Public Templates</h1>
          <p className="text-gray-400 leading-relaxed">
            Copy-paste ready DocsCI configuration templates. No login required.
            All templates are{" "}
            <a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">
              CC0 / public domain
            </a>{" "}
            — use them freely in any project.
          </p>
        </div>

        <div className="space-y-6" data-testid="templates-list">
          {templates.map(t => (
            <div key={t.id} className="border border-gray-700 rounded-2xl overflow-hidden" data-testid={`template-${t.id}`}>
              {/* Header */}
              <div className="bg-gray-900 px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-sm text-indigo-300">{t.filename}</span>
                    <span className="text-gray-600 text-xs">{t.lines} lines</span>
                  </div>
                  <h2 className="text-white font-semibold">{t.title}</h2>
                  <p className="text-gray-400 text-sm mt-1">{t.description}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {t.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs text-gray-400">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-gray-950 border-t border-gray-700 px-5 py-3 flex items-center gap-3 flex-wrap">
                <a
                  href={t.rawPath}
                  download={t.filename.split("/").pop()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
                  data-testid={`download-${t.id}`}
                >
                  ↓ Download
                </a>
                <a
                  href={t.rawPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-lg border border-gray-600 transition-colors"
                  data-testid={`raw-${t.id}`}
                >
                  Raw ↗
                </a>
                <Link
                  href={t.docsLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-lg border border-gray-600 transition-colors"
                >
                  Docs →
                </Link>
                <span className="ml-auto text-xs text-gray-600 font-mono">
                  {`https://snippetci.com${t.rawPath}`}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Usage section */}
        <div className="mt-12 p-6 bg-gray-900 border border-gray-700 rounded-2xl">
          <h2 className="text-white font-semibold mb-3">Quick start</h2>
          <p className="text-gray-400 text-sm mb-4">
            Download the GitHub Actions template and add your DocsCI token to get started in 2 minutes:
          </p>
          <pre className="text-xs text-green-300 overflow-x-auto whitespace-pre">{`# 1. Download the workflow
mkdir -p .github/workflows
curl -o .github/workflows/docsci.yml \\
  https://snippetci.com/templates/docsci-github-actions.yml

# 2. Add your API token to GitHub repository secrets
#    Settings → Secrets → Actions → New repository secret
#    Name: DOCSCI_TOKEN
#    Value: (from https://snippetci.com/signup)

# 3. Add the docsci.yml config to your repo root
curl -o docsci.yml \\
  https://snippetci.com/templates/docsci.yml

# 4. Commit and push — first CI run starts automatically
git add .github/workflows/docsci.yml docsci.yml
git commit -m "ci: add DocsCI documentation testing"
git push`}</pre>
        </div>

        {/* Links to docs */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/docs/integrations/github-actions" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700 transition-colors">
            GitHub Actions guide →
          </Link>
          <Link href="/docs/integrations/gitlab-ci" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700 transition-colors">
            GitLab CI guide →
          </Link>
          <Link href="/docs/getting-started" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700 transition-colors">
            Getting started →
          </Link>
        </div>
      </main>
    </div>
  );
}
