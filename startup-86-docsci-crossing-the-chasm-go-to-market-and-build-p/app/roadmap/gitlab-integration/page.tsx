import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Roadmap: GitLab Native Integration — DocsCI",
  description: "DocsCI's GitLab integration roadmap: native MR comments, pipeline status checks, GitLab component catalog entry, and self-managed instance support. ETA Q3 2025.",
  alternates: { canonical: "https://snippetci.com/roadmap/gitlab-integration" },
  openGraph: {
    title: "Roadmap: GitLab Native Integration — DocsCI",
    description: "Native GitLab MR comments, pipeline status checks, GitLab component, self-managed support. ETA Q3 2025.",
    url: "https://snippetci.com/roadmap/gitlab-integration",
    type: "article",
    siteName: "DocsCI",
  },
};

export default function GitLabIntegrationRoadmap() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="roadmap-gitlab">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3 text-sm flex-wrap">
        <Link href="/" className="text-white font-bold">⚡ DocsCI</Link>
        <span className="text-gray-700">/</span>
        <Link href="/roadmap" className="text-gray-400 hover:text-white">Roadmap</Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300">GitLab integration</span>
      </nav>

      <article className="max-w-2xl mx-auto px-6 py-12" data-testid="roadmap-article">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="px-2 py-0.5 text-xs font-medium rounded border bg-yellow-900 border-yellow-700 text-yellow-300">In progress</span>
          <span className="text-xs text-gray-500">ETA Q3 2025</span>
          <span className="ml-auto flex items-center gap-1 text-xs text-gray-500">
            <span className="text-base">▲</span><span className="font-mono">147 votes</span>
          </span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-4 leading-tight" data-testid="roadmap-h1">
          GitLab Native Integration
        </h1>
        <p className="text-gray-400 text-lg mb-8 leading-relaxed">
          DocsCI currently supports GitLab via a generic curl-based .gitlab-ci.yml job. The native integration
          replaces this with a first-class GitLab app: inline MR diff comments, pipeline status checks,
          self-managed instance support, and a GitLab Component Catalog entry.
        </p>

        <div className="space-y-8 text-sm text-gray-300 leading-relaxed">

          <section data-testid="section-current">
            <h2 className="text-xl font-bold text-white mb-3">Current state (curl workaround)</h2>
            <p className="text-gray-400 mb-3">
              Today, GitLab users add a <code className="bg-gray-800 px-1 rounded">docs:verify</code> job to their
              pipeline that archives docs and submits them via curl. Findings are posted as MR notes using
              a separate GitLab API call. This works, but it requires GITLAB_TOKEN setup and doesn't support
              inline diff comments on specific lines.
            </p>
            <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{`# Current approach (.gitlab-ci.yml)
docs:verify:
  stage: docs
  image: curlimages/curl:latest
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
  script:
    - tar czf docs.tar.gz docs/ *.md
    - |
      curl -sf -X POST https://snippetci.com/api/runs/queue \\
        -H "Authorization: Bearer $DOCSCI_TOKEN" \\
        -F "docs_archive=@docs.tar.gz" \\
        -F "repo_url=$CI_PROJECT_URL" \\
        -F "mr_iid=$CI_MERGE_REQUEST_IID"`}</pre>
          </section>

          <section data-testid="section-planned">
            <h2 className="text-xl font-bold text-white mb-3">What the native integration adds</h2>
            <div className="space-y-3">
              {[
                {
                  title: "Inline MR diff comments",
                  desc: "Findings appear as inline comments on the specific line of the MR diff — not just as MR notes. Developers see the finding in context while reviewing the change.",
                  status: "shipping Q3",
                },
                {
                  title: "Pipeline status checks",
                  desc: "DocsCI sets a named pipeline status check (docsci/docs-quality) that integrates with GitLab's merge checks. Critical findings block merge without requiring allow_failure configuration.",
                  status: "shipping Q3",
                },
                {
                  title: "GitLab Component Catalog entry",
                  desc: "A published GitLab CI component at gitlab.com/components/docsci. One line to include in your pipeline: `component: gitlab.com/components/docsci/verify@1.0`.",
                  status: "shipping Q3",
                },
                {
                  title: "Self-managed GitLab support",
                  desc: "OAuth app registration for self-managed GitLab instances. Supports GitLab 16.x and later. Webhook delivery to your instance without requiring a public IP.",
                  status: "shipping Q3",
                },
                {
                  title: "GitLab-native security scanning results",
                  desc: "DocsCI findings published to GitLab's Security Dashboard as SAST-format JSON artifacts. Findings appear in the MR security widget alongside your existing security scanners.",
                  status: "planned Q4",
                },
              ].map(item => (
                <div key={item.title} className="p-4 bg-gray-900 border border-gray-700 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-medium">{item.title}</h3>
                    <span className="text-xs text-gray-500 ml-auto">{item.status}</span>
                  </div>
                  <p className="text-gray-400 text-xs">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section data-testid="section-what-stays">
            <h2 className="text-xl font-bold text-white mb-3">What doesn&apos;t change</h2>
            <p className="text-gray-400">
              The curl-based .gitlab-ci.yml approach will continue to work indefinitely.
              The GitLab Component Catalog entry will use the same API under the hood —
              it&apos;s a convenience wrapper, not a replacement. Teams already using the curl method
              get inline diff comments automatically once they upgrade to using DOCSCI_TOKEN v2.
            </p>
          </section>

          <section data-testid="section-timeline">
            <h2 className="text-xl font-bold text-white mb-3">Timeline</h2>
            <div className="space-y-2">
              {[
                { date: "Now", label: "curl-based integration available (stable)", done: true },
                { date: "Jun 2025", label: "Private beta: inline MR diff comments + pipeline status checks", done: false },
                { date: "Aug 2025", label: "GitLab Component Catalog entry (gitlab.com/components/docsci)", done: false },
                { date: "Sep 2025", label: "Self-managed instance OAuth app", done: false },
                { date: "Q4 2025", label: "GitLab Security Dashboard integration (SAST JSON)", done: false },
              ].map(row => (
                <div key={row.date} className="flex items-start gap-3">
                  <span className={`text-xs font-mono w-20 shrink-0 pt-0.5 ${row.done ? "text-green-400" : "text-gray-500"}`}>{row.date}</span>
                  <span className={`text-sm ${row.done ? "text-white" : "text-gray-400"}`}>{row.label}</span>
                  {row.done && <span className="text-green-400 text-xs ml-auto">✓</span>}
                </div>
              ))}
            </div>
          </section>

          <div className="p-5 bg-indigo-950 border border-indigo-700 rounded-2xl mt-4">
            <h3 className="text-white font-semibold mb-2">Join the GitLab private beta</h3>
            <p className="text-indigo-200 text-sm mb-4">
              Get early access to inline MR diff comments when they launch in June 2025.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors">
                Join beta →
              </Link>
              <Link href="/for/gitlab-ci-docs" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold rounded-lg border border-gray-600 transition-colors">
                GitLab landing page →
              </Link>
              <a href="/templates/docsci-gitlab-ci.yml" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold rounded-lg border border-gray-600 transition-colors">
                Current template ↓
              </a>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
