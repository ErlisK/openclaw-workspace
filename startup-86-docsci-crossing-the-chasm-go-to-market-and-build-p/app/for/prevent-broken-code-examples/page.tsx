import type { Metadata } from "next";
import { LandingPage } from "@/components/LandingPage";

export const metadata: Metadata = {
  title: "Prevent Broken Code Examples — Catch broken docs before developers do",
  description:
    "DocsCI catches broken code examples in your documentation before they ship. Every snippet is executed in a sandboxed runtime on every PR — so developers always get code that works.",
  alternates: { canonical: "https://snippetci.com/for/prevent-broken-code-examples" },
  keywords: ["prevent broken code examples", "fix broken documentation examples", "test documentation code snippets", "CI for code examples", "docs code testing"],
  openGraph: {
    title: "Prevent Broken Code Examples — DocsCI",
    description: "Execute every documentation code snippet in CI. Catch broken examples before developers hit them.",
    url: "https://snippetci.com/for/prevent-broken-code-examples",
    siteName: "DocsCI",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "DocsCI — Prevent Broken Code Examples",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  url: "https://snippetci.com/for/prevent-broken-code-examples",
  description: "Execute documentation code examples in CI. Prevent broken snippets from reaching developers.",
  publisher: { "@type": "Organization", name: "DocsCI", url: "https://snippetci.com" },
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free tier available" },
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingPage
        slug="prevent-broken-code-examples"
        analyticsEvent="prevent broken code examples"
        h1="Prevent Broken Code Examples in Docs"
        tagline="Broken code examples in documentation are the #1 cause of developer frustration and support tickets. DocsCI executes every snippet on every PR — so you ship docs that actually work."
        problem={{
          heading: "Broken examples cost you developers",
          body: "The first thing a developer does with your docs is copy a code example. If it doesn't work, they open a support ticket, file a GitHub issue, or just leave. Broken examples are silent churn.",
          bullets: [
            "An import path changes in v2.0 — the quick-start example breaks, nobody notices for 3 weeks",
            "A method is renamed in the SDK — the docs still show the old name, developers get TypeError",
            "A required parameter is added to an API endpoint — the curl example in docs returns 422",
            "Language runtime updates break old syntax in examples that never get re-tested",
            "Your team spends hours in support answering questions that a working code example would prevent",
          ],
        }}
        solution={{
          heading: "Execute every code example on every PR",
          body: "DocsCI extracts every fenced code block from your documentation and runs it in an isolated, hermetic sandbox. JavaScript runs in a V8 isolate. Python runs in Pyodide WASM. Bash is validated. HTTP examples run against your configured staging endpoint. If any snippet fails, DocsCI blocks the PR and posts a comment on the exact line — with an AI-generated fix.",
        }}
        features={[
          {
            icon: "🔬",
            title: "Extract and execute every snippet",
            description: "DocsCI finds every fenced code block in Markdown, MDX, RST, and AsciiDoc files. Each one is extracted, run in an isolated sandbox, and verified.",
          },
          {
            icon: "🏗️",
            title: "Hermetic sandboxes per snippet",
            description: "JavaScript and TypeScript run in V8 isolates (via isolated-vm). Python runs in Pyodide WebAssembly. No shared state, no host contamination, no side effects.",
          },
          {
            icon: "⚡",
            title: "Fast — even on large doc sets",
            description: "DocsCI runs analyzers in parallel with concurrency tuned for Vercel's compute limits. A 100-snippet doc set typically runs in under 30 seconds.",
          },
          {
            icon: "🎯",
            title: "Precise PR comments",
            description: "Every broken snippet gets a PR comment with: the file path, line number, the error message, and an AI-generated corrected code snippet.",
          },
          {
            icon: "🔑",
            title: "Secret scanning before execution",
            description: "40+ regex patterns scan snippets for API keys, tokens, private keys, and connection strings before execution. No credentials leak through execution.",
          },
          {
            icon: "🌐",
            title: "Network-isolated by default",
            description: "Snippets cannot make outbound network calls unless you add domains to the docsci.yml allowlist. RFC-1918 private ranges are always blocked.",
          },
        ]}
        steps={[
          {
            step: "1",
            title: "Add DocsCI to your CI pipeline",
            description: "One GitHub Action, one API call. DocsCI reads your docs from the repository — no git hooks or doc build step needed.",
            code: `- name: Run DocsCI
  run: |
    tar czf docs.tar.gz docs/
    curl -sf -X POST https://snippetci.com/api/runs/queue \\
      -H "Authorization: Bearer \${{ secrets.DOCSCI_TOKEN }}" \\
      -F "docs_archive=@docs.tar.gz" \\
      -o result.json
    jq -e '.status == "passed"' result.json`,
          },
          {
            step: "2",
            title: "DocsCI executes every fenced code block",
            description: "JS, TS, Python, Go, Ruby, Bash, cURL — every snippet runs in the right sandbox. Failures are collected with error messages and stack traces.",
          },
          {
            step: "3",
            title: "Broken snippets block the PR",
            description: "If any snippet fails, the CI check fails. DocsCI posts an inline comment on the broken snippet with the error and a patch diff. Merge only verified code.",
          },
        ]}
        stats={[
          { value: "< 30s", label: "Typical run time" },
          { value: "6+", label: "Languages tested" },
          { value: "100%", label: "Snippet coverage" },
          { value: "0", label: "Config changes to docs" },
        ]}
        faqs={[
          {
            q: "Does DocsCI catch all broken code examples?",
            a: "DocsCI executes all fenced code blocks in supported languages. Examples that require external services not in the allowlist will be flagged as skipped rather than failed. Configure your staging endpoint allowlist to test HTTP examples end-to-end.",
          },
          {
            q: "What languages does DocsCI execute?",
            a: "JavaScript, TypeScript, Python (via Pyodide WASM), Bash (simulated validation), Go (static check), Ruby (sandboxed), and cURL (executed against allowlisted endpoints). Unsupported languages are skipped.",
          },
          {
            q: "Can DocsCI handle code examples with external dependencies?",
            a: "Yes. DocsCI's sandbox supports npm packages (JS/TS) and PyPI packages (Python) via a curated allowlist. Configure additional packages in docsci.yml under snippets.packages.",
          },
          {
            q: "How do I exclude code examples that are intentionally invalid (e.g., showing error states)?",
            a: "Add a docsci-skip comment above the fenced block: <!-- docsci-skip --> in Markdown, or configure skip_patterns in docsci.yml to match blocks containing 'ERROR' or 'expected output' markers.",
          },
        ]}
      />
    </>
  );
}
