import type { Metadata } from "next";
import { LandingPage } from "@/components/LandingPage";

export const metadata: Metadata = {
  title: "OpenAPI Docs Validation — Keep your API docs in sync with your OpenAPI spec",
  description:
    "DocsCI validates your API documentation against your OpenAPI spec on every PR. Catch parameter renames, response schema changes, and deprecated endpoints before they confuse developers.",
  alternates: { canonical: "https://snippetci.com/for/openapi-docs-validation" },
  keywords: ["OpenAPI docs validation", "OpenAPI documentation validation", "API spec drift detection", "OpenAPI CI", "docs spec sync"],
  openGraph: {
    title: "OpenAPI Docs Validation — DocsCI",
    description: "Automatically validate your API docs against OpenAPI spec on every commit.",
    url: "https://snippetci.com/for/openapi-docs-validation",
    siteName: "DocsCI",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "DocsCI — OpenAPI Docs Validation",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  url: "https://snippetci.com/for/openapi-docs-validation",
  description: "OpenAPI spec vs documentation drift detection. Validate every documented endpoint, parameter, and schema on every PR.",
  publisher: { "@type": "Organization", name: "DocsCI", url: "https://snippetci.com" },
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free tier available" },
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingPage
        slug="openapi-docs-validation"
        analyticsEvent="OpenAPI docs validation"
        h1="OpenAPI Docs Validation in CI"
        tagline="Your OpenAPI spec and your documentation drift apart with every release. DocsCI diffs them on every PR — catching renamed parameters, removed endpoints, and schema mismatches before developers encounter them."
        problem={{
          heading: "Your OpenAPI spec and your docs are never perfectly in sync",
          body: "The spec gets updated first. Or the docs get updated first. Either way, drift accumulates. Parameter names change, response fields are added or removed, authentication schemes evolve — and the docs lag behind.",
          bullets: [
            "A field renamed in the spec still appears under the old name in documentation for weeks",
            "Deprecated endpoints stay documented as 'current' — developers build on them and hit 410s",
            "New required fields appear in the spec but not in documented request body examples",
            "Response schema examples show fields that were removed in the last API version",
            "No one notices until a developer files a support ticket or opens a GitHub issue",
          ],
        }}
        solution={{
          heading: "Continuous OpenAPI drift detection",
          body: "DocsCI imports your OpenAPI spec (from a URL or file path) and compares it against every documented endpoint, parameter, and response schema in your Markdown, MDX, or RST docs. On every pull request, it reports what drifted — specific fields, line numbers, and AI-generated suggestions for how to fix the docs.",
        }}
        features={[
          {
            icon: "📄",
            title: "Spec vs docs diff",
            description: "For every documented API endpoint, DocsCI checks: does the spec agree? Mismatched paths, methods, params, and schemas are reported as findings with severity.",
          },
          {
            icon: "🔄",
            title: "Continuous validation",
            description: "Runs on every PR that touches docs or the spec file. Catches drift the moment it's introduced — not after it ships to users.",
          },
          {
            icon: "📝",
            title: "Per-field accuracy",
            description: "DocsCI validates field names, types, required/optional, enum values, and descriptions — not just endpoint existence. Granular accuracy at the field level.",
          },
          {
            icon: "🤖",
            title: "AI-generated doc fixes",
            description: "When a drift finding is reported, Claude generates the corrected docs snippet — ready to apply as a patch diff in your PR.",
          },
          {
            icon: "📊",
            title: "SARIF export",
            description: "Export findings as SARIF 2.1.0 for GitHub Code Scanning. Drift findings appear as code annotations in the GitHub UI alongside other CI checks.",
          },
          {
            icon: "⚙️",
            title: "Zero-config import",
            description: "Point at your spec with openapi.url in docsci.yml. Supports OpenAPI 3.x from a URL or a file path. Works with Swagger 2.0 via conversion.",
          },
        ]}
        steps={[
          {
            step: "1",
            title: "Add your OpenAPI spec",
            description: "Configure the spec URL or path in docsci.yml. DocsCI fetches it on every run.",
            code: `# docsci.yml
openapi:
  url: https://api.example.com/openapi.json
  # or path: ./openapi.yaml
checks:
  drift: true`,
          },
          {
            step: "2",
            title: "DocsCI diffs spec vs docs",
            description: "DocsCI parses your documentation, extracts API references, and diffs against the spec. Every divergence is a finding.",
          },
          {
            step: "3",
            title: "Fix before merge",
            description: "Drift findings appear as PR comments with exact line numbers and AI-suggested doc updates. Block the merge until docs match the spec.",
          },
        ]}
        stats={[
          { value: "Per-field", label: "Diff granularity" },
          { value: "OpenAPI 3.x", label: "Spec format" },
          { value: "SARIF", label: "Export format" },
          { value: "Every PR", label: "Check frequency" },
        ]}
        faqs={[
          {
            q: "Which OpenAPI versions does DocsCI support?",
            a: "DocsCI supports OpenAPI 3.0.x and 3.1.x natively. Swagger 2.0 specs are automatically converted during import.",
          },
          {
            q: "How does DocsCI parse documented endpoints from Markdown?",
            a: "DocsCI uses a combination of fenced code block parsing (for request/response examples) and heuristic Markdown parsing (for parameter tables, path descriptions). It recognizes common documentation patterns from Docusaurus, Mintlify, Nextra, and hand-written Markdown.",
          },
          {
            q: "Can I configure which drift types are blocking vs advisory?",
            a: "Yes. In docsci.yml, configure checks.drift_blocking: [renamed_field, removed_endpoint] to make specific drift types block the PR. Others are reported as warnings.",
          },
          {
            q: "Does DocsCI validate request body schemas?",
            a: "Yes. DocsCI extracts JSON request body examples from code blocks and validates them against the spec's requestBody schema. Missing required fields and type mismatches are reported.",
          },
        ]}
      />
    </>
  );
}
