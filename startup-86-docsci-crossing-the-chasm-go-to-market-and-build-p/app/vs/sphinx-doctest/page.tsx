import type { Metadata } from "next";
import { ComparisonPage, Check, Cross, Partial } from "@/components/ComparisonPage";

export const metadata: Metadata = {
  title: "DocsCI vs Sphinx doctest — Which is right for your docs?",
  description:
    "Sphinx doctest only runs Python doctests inside RST files. DocsCI runs multi-language snippets, detects API drift, checks accessibility, and integrates with GitHub CI — all without modifying your docs format.",
  alternates: { canonical: "https://snippetci.com/vs/sphinx-doctest" },
  openGraph: {
    title: "DocsCI vs Sphinx doctest",
    description: "Multi-language, zero-config vs Python-only, RST-bound.",
    url: "https://snippetci.com/vs/sphinx-doctest",
    siteName: "DocsCI",
    type: "website",
  },
};

const rows = [
  {
    feature: "Languages supported",
    docsci: <><Check /> Python, JS/TS, Bash, Go, Ruby, cURL</>,
    competitor: <><Partial label="Python only" /></>,
    winner: "docsci" as const,
  },
  {
    feature: "Doc format",
    docsci: <><Check /> Markdown, MDX, RST, AsciiDoc, HTML</>,
    competitor: <><Partial label="RST only (doctest directive)" /></>,
    winner: "docsci" as const,
  },
  {
    feature: "API drift detection",
    docsci: <><Check /> OpenAPI spec vs docs diff</>,
    competitor: <><Cross /> Not supported</>,
    winner: "docsci" as const,
  },
  {
    feature: "Accessibility checks",
    docsci: <><Check /> axe-core + structural rules</>,
    competitor: <><Cross /> Not supported</>,
    winner: "docsci" as const,
  },
  {
    feature: "GitHub PR comments",
    docsci: <><Check /> Precise inline comments with fixes</>,
    competitor: <><Cross /> Build logs only</>,
    winner: "docsci" as const,
  },
  {
    feature: "Secret scanning",
    docsci: <><Check /> 40+ patterns before execution</>,
    competitor: <><Cross /> Not supported</>,
    winner: "docsci" as const,
  },
  {
    feature: "Network isolation",
    docsci: <><Check /> Per-sandbox allowlist</>,
    competitor: <><Cross /> Python subprocess — no isolation</>,
    winner: "docsci" as const,
  },
  {
    feature: "CI integration",
    docsci: <><Check /> Native GitHub Action + GitLab CI</>,
    competitor: <><Partial label="Requires Sphinx build in CI" /></>,
    winner: "docsci" as const,
  },
  {
    feature: "AI-generated fixes",
    docsci: <><Check /> Claude-powered patch diffs</>,
    competitor: <><Cross /> None</>,
    winner: "docsci" as const,
  },
  {
    feature: "Docs format migration",
    docsci: <><Partial label="No RST migration help" /></>,
    competitor: <><Check /> RST-native ecosystem</>,
    winner: "competitor" as const,
  },
  {
    feature: "Python documentation testing",
    docsci: <><Check /> Sandbox-executed snippets</>,
    competitor: <><Check /> Built into Sphinx</>,
    winner: "tie" as const,
  },
  {
    feature: "Setup time",
    docsci: <><Check /> 5-minute GitHub Action</>,
    competitor: <><Partial label="Sphinx project setup required" /></>,
    winner: "docsci" as const,
  },
];

export default function Page() {
  return (
    <ComparisonPage
      slug="sphinx-doctest"
      competitor="Sphinx doctest"
      competitorUrl="https://www.sphinx-doc.org/en/master/usage/extensions/doctest.html"
      tagline="Sphinx doctest is great for Python library authors. DocsCI is built for API and platform teams shipping docs across every language."
      summary={
        <>
          <strong className="text-white">Sphinx doctest</strong> is a Python Sphinx extension that
          runs <code className="bg-gray-800 px-1 rounded text-green-300">&gt;&gt;&gt;</code>-style
          doctests embedded in RST source files. It works well for pure-Python library docs but stops
          there — no JavaScript, no curl examples, no API drift detection, and no GitHub native
          integration.{" "}
          <strong className="text-white">DocsCI</strong> runs multi-language sandboxed snippets from
          any doc format, detects when your OpenAPI spec diverges from doc examples, and posts inline
          PR comments with AI-generated fixes. It works alongside Sphinx, not instead of it.
        </>
      }
      rows={rows}
      docsciSummary={`Multi-language execution (Python, JS/TS, Bash, Go, cURL)
Works with Markdown, MDX, RST, AsciiDoc — any format
OpenAPI drift detection built-in
Sandboxed execution with secret scanning before run
Native GitHub Action with PR inline comments
AI-generated patch diffs for broken snippets`}
      competitorSummary={`Python only — non-Python snippets skipped entirely
Only works with RST/Sphinx projects
No API drift detection or accessibility checks
No secret scanning — any credentials in snippets get executed
Requires Sphinx build infrastructure in CI
No AI suggestions or automated fixes`}
      verdict={
        <>
          Choose <strong className="text-white">Sphinx doctest</strong> if you have a pure-Python
          library with RST docs and want a simple in-process test. Choose{" "}
          <strong className="text-white">DocsCI</strong> if you ship API docs, SDK guides, or
          platform documentation with multi-language examples — DocsCI handles every language in
          secure sandboxes, detects API drift, and posts fixes directly in your pull requests.
        </>
      }
      faqs={[
        {
          q: "Can I use DocsCI with a Sphinx project?",
          a: "Yes. DocsCI parses the rendered Markdown or RST output from Sphinx and runs snippets in its own sandboxes. You can run both in the same CI pipeline — DocsCI handles multi-language execution and drift detection while Sphinx doctest handles Python-specific inline examples.",
        },
        {
          q: "Does DocsCI replace pytest for documentation testing?",
          a: "DocsCI complements pytest, not replaces it. DocsCI focuses on the end-user perspective: verifying that code examples in documentation actually run, that API schemas match, and that accessibility and copy standards are met.",
        },
        {
          q: "What languages does DocsCI execute?",
          a: "JavaScript, TypeScript, Python (via Pyodide WebAssembly), Bash/shell (simulated), Go, Ruby, and cURL. Language support is configurable via docsci.yml.",
        },
      ]}
    />
  );
}
