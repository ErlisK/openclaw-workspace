import type { Metadata } from "next";
import { ComparisonPage, Check, Cross, Partial } from "@/components/ComparisonPage";

export const metadata: Metadata = {
  title: "DocsCI vs Postman Collections in CI — Documentation testing beyond API testing",
  description:
    "Postman Collections verify your API endpoints but not your docs. DocsCI verifies the code examples in your documentation, detects API drift between OpenAPI specs and docs, and checks accessibility and copy — filling the gap Postman leaves.",
  alternates: { canonical: "https://snippetci.com/vs/postman-collections" },
  openGraph: {
    title: "DocsCI vs Postman Collections in CI",
    description: "API testing vs docs-specific CI — they solve different problems.",
    url: "https://snippetci.com/vs/postman-collections",
    siteName: "DocsCI",
    type: "website",
  },
};

const rows = [
  {
    feature: "Tests code examples in docs",
    docsci: <><Check /> Extracts and runs all fenced snippets</>,
    competitor: <><Cross /> Tests APIs, not documentation</>,
    winner: "docsci" as const,
  },
  {
    feature: "API endpoint smoke tests",
    docsci: <><Check /> HTTP calls from doc examples</>,
    competitor: <><Check /> Purpose-built API testing</>,
    winner: "tie" as const,
  },
  {
    feature: "OpenAPI drift detection",
    docsci: <><Check /> Spec vs doc diff, per-endpoint</>,
    competitor: <><Partial label="Schema validation only" /></>,
    winner: "docsci" as const,
  },
  {
    feature: "Multi-language snippet execution",
    docsci: <><Check /> JS, Python, Go, Ruby, cURL, Bash</>,
    competitor: <><Cross /> JavaScript (Collection runner) only</>,
    winner: "docsci" as const,
  },
  {
    feature: "Sandbox isolation",
    docsci: <><Check /> V8 isolate + WASM per snippet</>,
    competitor: <><Cross /> Node.js process, shared state</>,
    winner: "docsci" as const,
  },
  {
    feature: "Accessibility checks",
    docsci: <><Check /> axe-core on doc pages</>,
    competitor: <><Cross /> Not in scope</>,
    winner: "docsci" as const,
  },
  {
    feature: "Copy/content quality",
    docsci: <><Check /> Passive voice, sensitive terms, tone</>,
    competitor: <><Cross /> Not in scope</>,
    winner: "docsci" as const,
  },
  {
    feature: "PR inline comments",
    docsci: <><Check /> Line-level findings + AI fix</>,
    competitor: <><Cross /> Test results in Postman dashboard</>,
    winner: "docsci" as const,
  },
  {
    feature: "Secret scanning",
    docsci: <><Check /> Pre-execution, 40+ patterns</>,
    competitor: <><Cross /> API keys in collections are a risk</>,
    winner: "docsci" as const,
  },
  {
    feature: "Existing workflow integration",
    docsci: <><Check /> GitHub Action / GitLab CI native</>,
    competitor: <><Partial label="Newman CLI in CI (extra config)" /></>,
    winner: "docsci" as const,
  },
  {
    feature: "Performance testing",
    docsci: <><Cross /> Not in scope</>,
    competitor: <><Check /> Load testing with k6 + Postman</>,
    winner: "competitor" as const,
  },
  {
    feature: "Mock servers",
    docsci: <><Cross /> Not supported</>,
    competitor: <><Check /> Postman mock servers</>,
    winner: "competitor" as const,
  },
];

export default function Page() {
  return (
    <ComparisonPage
      slug="postman-collections"
      competitor="Postman Collections"
      competitorUrl="https://www.postman.com/collection/"
      tagline="Postman Collections test your API. DocsCI tests your documentation. They are complementary — but only one checks that your code examples actually run."
      summary={
        <>
          <strong className="text-white">Postman Collections in CI</strong> (via Newman) are
          excellent for verifying API endpoints respond correctly — but they don't test what your{" "}
          <em>documentation users</em> actually see: the code snippets, SDK examples, curl commands,
          and conceptual guides in your docs site.{" "}
          <strong className="text-white">DocsCI</strong> fills that gap. It extracts every fenced
          code block from your docs, executes them in sandboxed runtimes, detects when your OpenAPI
          spec diverges from documented parameters, and flags accessibility and copy issues — posting
          precise PR comments with AI-generated fixes. Most teams use both: Postman for API contract
          testing, DocsCI for documentation verification.
        </>
      }
      rows={rows}
      docsciSummary={`Verifies code examples that live in documentation files
Multi-language: Python, JS/TS, Go, Ruby, cURL, Bash
OpenAPI drift: detects when spec diverges from documented params/responses
Accessibility and copy quality checks built-in
Pre-execution secret scanning — no leaked credentials
PR-level findings with line numbers and AI-generated patches`}
      competitorSummary={`Only tests API endpoints — ignores documentation content entirely
No snippet extraction from Markdown or RST
No OpenAPI spec vs docs diff
Running Postman in CI requires Newman setup + collection export/sync
API keys stored in Collections are a security risk if exported
No accessibility or copy quality checks`}
      verdict={
        <>
          <strong className="text-white">These tools are complementary, not competing.</strong> Use
          Postman/Newman to verify your API contracts. Use DocsCI to verify your documentation — the
          code examples your users copy-paste, the parameters your guides describe, and the
          accessibility of your docs pages. Together they give you end-to-end coverage of both your
          API and your docs.
        </>
      }
      faqs={[
        {
          q: "Does DocsCI replace Newman/Postman in CI?",
          a: "No — they solve different problems. Postman tests API endpoints. DocsCI tests documentation. We recommend running both. Most teams add the DocsCI GitHub Action alongside their existing Newman step.",
        },
        {
          q: "Can DocsCI test HTTP requests in documentation?",
          a: "Yes. DocsCI executes curl and HTTP snippets from documentation files and validates responses. You can configure a staging API allowlist in docsci.yml to permit outbound calls to your staging environment.",
        },
        {
          q: "Does DocsCI handle OpenAPI specifications?",
          a: "Yes. Import your OpenAPI spec via the docsci.yml openapi.url or openapi.path field. DocsCI will compare every documented endpoint, parameter, and response schema against the spec and flag divergences.",
        },
      ]}
    />
  );
}
