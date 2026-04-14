import type { Metadata } from "next";
import { LandingPage } from "@/components/LandingPage";

export const metadata: Metadata = {
  title: "API Docs Testing — Automate verification of API documentation code examples",
  description:
    "DocsCI is purpose-built for API documentation testing. It executes code examples, validates request/response schemas against your OpenAPI spec, and catches drift before it reaches developers.",
  alternates: { canonical: "https://snippetci.com/for/api-docs-testing" },
  keywords: ["API docs testing", "API documentation testing", "test API code examples", "API documentation CI", "API docs verification"],
  openGraph: {
    title: "API Docs Testing — DocsCI",
    description: "Automate verification of API documentation code examples with DocsCI.",
    url: "https://snippetci.com/for/api-docs-testing",
    siteName: "DocsCI",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "DocsCI — API Docs Testing",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  url: "https://snippetci.com/for/api-docs-testing",
  description: "Automated API documentation testing: execute code examples, validate against OpenAPI, detect drift.",
  publisher: { "@type": "Organization", name: "DocsCI", url: "https://snippetci.com" },
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free tier available" },
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingPage
        slug="api-docs-testing"
        analyticsEvent="API docs testing"
        h1="Automated API Documentation Testing"
        tagline="Your API docs are the first thing developers see. DocsCI makes sure every curl example runs, every SDK snippet works, and every response schema matches your OpenAPI spec."
        problem={{
          heading: "API docs break quietly — until developers hit your support queue",
          body: "API documentation is updated after the API, not before. Every release cycle, some code example stops working, some parameter gets renamed, and some response field disappears. Your docs say one thing; the API does another.",
          bullets: [
            "curl examples with outdated auth headers silently return 401 — developers don't know why",
            "SDK snippets that worked in v1 break in v2 without a clear error in docs",
            "Response schemas in docs drift from actual API responses — developers write code that breaks",
            "Copy-pasting broken examples is the #1 cause of first-hour developer drop-off",
            "No automated test suite catches doc-level regressions before they ship",
          ],
        }}
        solution={{
          heading: "DocsCI: the automated test suite for your API docs",
          body: "DocsCI runs in your CI pipeline on every PR. It executes curl commands, SDK snippets, and code examples from your docs against your staging API. It diffs every documented endpoint and schema against your OpenAPI spec. Broken examples and drifted schemas are caught before merge — with AI-generated patches.",
        }}
        features={[
          {
            icon: "🌐",
            title: "Execute HTTP examples",
            description: "curl, HTTPie, fetch, axios — DocsCI runs every HTTP code example from your docs against your staging API. Configure the allowlist to permit your staging domain.",
          },
          {
            icon: "📐",
            title: "OpenAPI schema validation",
            description: "Import your OpenAPI spec. DocsCI validates every documented request body, query param, header, and response schema against the spec on each PR.",
          },
          {
            icon: "🔄",
            title: "SDK snippet execution",
            description: "Node.js, Python, Go, Ruby SDK examples all run in isolated sandboxes. Import errors, undefined method calls, and type errors are caught before users see them.",
          },
          {
            icon: "📌",
            title: "Inline PR comments",
            description: "DocsCI posts a comment on the exact line where the broken example lives — file, line number, error, and an AI-generated fix in one comment.",
          },
          {
            icon: "📈",
            title: "Drift trending",
            description: "Track schema drift over time. See which endpoints are most frequently documented incorrectly and catch patterns before they cause support tickets.",
          },
          {
            icon: "🔐",
            title: "Credential safety",
            description: "40+ regex patterns scan every snippet for API keys, tokens, and connection strings before execution. Sensitive snippets are flagged — not run.",
          },
        ]}
        steps={[
          {
            step: "1",
            title: "Connect your docs repository",
            description: "Add the DocsCI GitHub Action. It runs on every PR that touches documentation files.",
            code: `curl -X POST https://snippetci.com/api/runs/queue \\
  -H "Authorization: Bearer \$DOCSCI_TOKEN" \\
  -F "docs_archive=@docs.tar.gz" \\
  -F "openapi_url=https://api.example.com/openapi.json"`,
          },
          {
            step: "2",
            title: "Configure your staging endpoint",
            description: "Add your staging API domain to the docsci.yml allowlist so HTTP examples can run against your real API.",
            code: `security:
  allowlist:
    - api-staging.example.com
    - "*.example-staging.com"`,
          },
          {
            step: "3",
            title: "Get actionable results",
            description: "Every broken example, mismatched schema, and drift finding appears as a PR comment with line number and fix suggestion. Merge only verified docs.",
          },
        ]}
        stats={[
          { value: "<5min", label: "Time to first result" },
          { value: "100%", label: "Snippet coverage" },
          { value: "6+", label: "SDK languages" },
          { value: "SARIF", label: "GitHub Code Scanning" },
        ]}
        faqs={[
          {
            q: "Can DocsCI run examples against my live API?",
            a: "Yes. Configure the network allowlist in docsci.yml to permit your staging or production API domain. DocsCI will execute HTTP examples against those endpoints. All other outbound network access is blocked.",
          },
          {
            q: "Does DocsCI replace Postman/Newman?",
            a: "DocsCI tests documentation code examples — what your developers actually copy-paste. Postman tests API contracts. Use both: Postman for API testing, DocsCI for docs testing.",
          },
          {
            q: "What happens when an API key is found in a code example?",
            a: "DocsCI's secret scanner detects API keys, tokens, and credentials in snippets before execution. The snippet is flagged as a finding with severity 'error' — it is not executed.",
          },
          {
            q: "Can I test docs for a private API?",
            a: "Yes. Use the customer-hosted runner option to run DocsCI on your own infrastructure with access to your internal API. The runner connects to DocsCI's control plane but executes in your network.",
          },
        ]}
      />
    </>
  );
}
