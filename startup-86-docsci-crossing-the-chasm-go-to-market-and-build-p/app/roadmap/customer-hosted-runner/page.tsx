import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Roadmap: Customer-Hosted Runner — DocsCI",
  description: "Run DocsCI's execution engine inside your own VPC. Available as a GitHub Actions composite action and a curl-deployable Docker image. Air-gap and enterprise-ready. ETA Q3 2025.",
  alternates: { canonical: "https://snippetci.com/roadmap/customer-hosted-runner" },
  openGraph: {
    title: "Roadmap: Customer-Hosted Runner — DocsCI",
    description: "DocsCI execution inside your VPC. GitHub Actions composite action + curl-deployable Docker image. Air-gap ready.",
    url: "https://snippetci.com/roadmap/customer-hosted-runner",
    type: "article",
    siteName: "DocsCI",
  },
};

export default function CustomerHostedRunnerRoadmap() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="roadmap-runner">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3 text-sm flex-wrap">
        <Link href="/" className="text-white font-bold">⚡ DocsCI</Link>
        <span className="text-gray-700">/</span>
        <Link href="/roadmap" className="text-gray-400 hover:text-white">Roadmap</Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300">Customer-hosted runner</span>
      </nav>

      <article className="max-w-2xl mx-auto px-6 py-12" data-testid="roadmap-article">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="px-2 py-0.5 text-xs font-medium rounded border bg-yellow-900 border-yellow-700 text-yellow-300">In progress</span>
          <span className="text-xs text-gray-500">ETA Q3 2025</span>
          <span className="ml-auto flex items-center gap-1 text-xs text-gray-500">
            <span className="text-base">▲</span><span className="font-mono">134 votes</span>
          </span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-4 leading-tight" data-testid="roadmap-h1">
          Customer-Hosted Runner
        </h1>
        <p className="text-gray-400 text-lg mb-8 leading-relaxed">
          Run the DocsCI execution engine entirely inside your own infrastructure. No documentation leaves your network.
          Designed for enterprise security reviews, air-gapped environments, and teams with data residency requirements.
          Available as a GitHub Actions composite action and a curl-deployable Docker image.
        </p>

        <div className="space-y-8 text-sm text-gray-300 leading-relaxed">

          <section data-testid="section-why">
            <h2 className="text-xl font-bold text-white mb-3">Why customer-hosted</h2>
            <div className="space-y-3">
              {[
                {
                  scenario: "Enterprise security review",
                  problem: "InfoSec requires that documentation containing internal architecture details never leaves the corporate network.",
                  solution: "Customer-hosted runner processes all docs locally. Only a summary report (finding counts, metadata) is sent to the DocsCI dashboard — and that can be disabled too.",
                },
                {
                  scenario: "Air-gapped GitLab / GitHub Enterprise",
                  problem: "CI pipelines have no outbound internet access. Can't POST to snippetci.com/api/runs/queue.",
                  solution: "The Docker image runs on your internal network. Results are posted back to your GitLab/GitHub instance via the internal API — no external network calls.",
                },
                {
                  scenario: "Data residency requirements (GDPR, etc.)",
                  problem: "Documentation data must stay in a specific region or jurisdiction.",
                  solution: "Customer-hosted runner ensures zero data egress. All processing happens inside the boundary.",
                },
              ].map(s => (
                <div key={s.scenario} className="p-4 bg-gray-900 border border-gray-700 rounded-xl">
                  <div className="text-white font-medium text-sm mb-2">{s.scenario}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-red-400 mb-1">Problem</div>
                      <p className="text-gray-400 text-xs">{s.problem}</p>
                    </div>
                    <div>
                      <div className="text-xs text-green-400 mb-1">Solution</div>
                      <p className="text-gray-400 text-xs">{s.solution}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section data-testid="section-github-action">
            <h2 className="text-xl font-bold text-white mb-3">Option A: GitHub Actions composite action</h2>
            <p className="text-gray-400 mb-3">
              Use the <code className="bg-gray-800 px-1 rounded">docsci/runner-action</code> composite action.
              It runs the DocsCI Docker image as a step in your GitHub Actions workflow on your self-hosted runner.
              Zero external network calls — all execution happens in your runner environment.
            </p>
            <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{`# .github/workflows/docsci.yml (customer-hosted runner)
name: DocsCI
on: [pull_request]

jobs:
  docs-ci:
    runs-on: self-hosted          # your runner — no outbound internet needed
    steps:
      - uses: actions/checkout@v4

      - name: Run DocsCI (customer-hosted)
        uses: docsci/runner-action@v1
        with:
          # Required
          docs_path: "docs/"
          token: \${{ secrets.DOCSCI_LICENSE_KEY }}

          # Optional: OpenAPI drift detection
          openapi_url: "http://internal-staging.corp/api/openapi.json"

          # Optional: post findings back to GitHub PR
          github_token: \${{ secrets.GITHUB_TOKEN }}
          post_pr_comments: true

          # Optional: disable telemetry to DocsCI dashboard entirely
          telemetry: false`}</pre>
          </section>

          <section data-testid="section-docker">
            <h2 className="text-xl font-bold text-white mb-3">Option B: Docker image (curl-deployable)</h2>
            <p className="text-gray-400 mb-3">
              For non-GitHub CI systems (GitLab, Jenkins, Buildkite, CircleCI) or one-off audits.
              Pull the image, mount your docs directory, and run. Output is a JSON report file.
            </p>
            <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{`# Pull the runner image (from your internal registry or Docker Hub)
docker pull docsci/runner:latest

# Run against a local docs directory
docker run --rm \\
  -v "$(pwd)/docs:/workspace/docs:ro" \\
  -v "$(pwd)/reports:/workspace/reports" \\
  -e DOCSCI_LICENSE_KEY=\$DOCSCI_LICENSE_KEY \\
  -e OPENAPI_URL="http://staging:8080/openapi.json" \\
  docsci/runner:latest \\
  --docs /workspace/docs \\
  --report /workspace/reports/docsci-report.json \\
  --exit-on-critical

# Output: reports/docsci-report.json
# Exit code: 0 (pass), 1 (critical findings), 2 (error)

# For GitLab CI (.gitlab-ci.yml):
docs:verify:
  stage: docs
  image: docsci/runner:latest
  script:
    - docsci-runner --docs docs/ --report docsci-report.json --exit-on-critical
  artifacts:
    paths: [docsci-report.json]
    expire_in: 1 week`}</pre>
          </section>

          <section data-testid="section-security-model">
            <h2 className="text-xl font-bold text-white mb-3">Security model</h2>
            <div className="space-y-2 text-sm text-gray-400">
              <p>
                <strong className="text-white">Execution isolation:</strong> The runner uses the same hermetic V8 isolate and Pyodide WASM
                execution as the hosted service. Each snippet runs in a fresh isolate with memory limits, timeouts,
                and network restrictions — even in customer-hosted mode.
              </p>
              <p>
                <strong className="text-white">No outbound calls in air-gap mode:</strong> When <code className="bg-gray-800 px-1 rounded">telemetry: false</code>,
                the runner makes zero external network calls. License validation happens at startup against a local
                key file — no internet required after initial activation.
              </p>
              <p>
                <strong className="text-white">Image signing:</strong> All runner Docker images are signed with cosign.
                Verify the signature before deploying to a production environment.
              </p>
              <p>
                <strong className="text-white">Network allowlist enforcement:</strong> The runner enforces the same
                network allowlist as the hosted service — snippets can only contact hosts you explicitly permit,
                plus always-blocked private IP ranges.
              </p>
            </div>
          </section>

          <section data-testid="section-timeline">
            <h2 className="text-xl font-bold text-white mb-3">Timeline</h2>
            <div className="space-y-2">
              {[
                { date: "Now", label: "Hosted runner available (default for all plans)", done: true },
                { date: "May 2025", label: "Private beta: Docker image (curl-deployable)", done: false },
                { date: "Jul 2025", label: "GitHub Actions composite action (docsci/runner-action@v1)", done: false },
                { date: "Sep 2025", label: "GA: customer-hosted runner on Enterprise plan", done: false },
                { date: "Q4 2025", label: "Air-gap mode with local license file activation", done: false },
              ].map(row => (
                <div key={row.date} className="flex items-start gap-3">
                  <span className={`text-xs font-mono w-20 shrink-0 pt-0.5 ${row.done ? "text-green-400" : "text-gray-500"}`}>{row.date}</span>
                  <span className={`text-sm ${row.done ? "text-white" : "text-gray-400"}`}>{row.label}</span>
                  {row.done && <span className="text-green-400 text-xs ml-auto">✓</span>}
                </div>
              ))}
            </div>
          </section>

          <div className="p-5 bg-indigo-950 border border-indigo-700 rounded-2xl">
            <h3 className="text-white font-semibold mb-2">Get early access to the runner</h3>
            <p className="text-indigo-200 text-sm mb-4">
              Joining the Docker image beta in May 2025 — tell us about your air-gap requirements.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="mailto:hello@snippetci.com?subject=Customer-Hosted%20Runner%20Beta"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Request beta access →
              </a>
              <Link href="/security" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold rounded-lg border border-gray-600 transition-colors">
                Security packet →
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
