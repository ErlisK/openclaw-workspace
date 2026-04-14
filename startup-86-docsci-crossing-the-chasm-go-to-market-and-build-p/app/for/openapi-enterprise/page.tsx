import type { Metadata } from "next";
import { LandingPage } from "@/components/LandingPage";

export const metadata: Metadata = {
  title: "DocsCI for OpenAPI-First Enterprise Platforms — Keep Docs in Lockstep with Your API",
  description:
    "DocsCI diffs your OpenAPI spec against documentation on every release. Catch required-parameter drift, deprecated-endpoint surprises, and schema mismatches before enterprise customers file support tickets.",
  alternates: { canonical: "https://snippetci.com/for/openapi-enterprise" },
  keywords: [
    "OpenAPI documentation CI",
    "enterprise API docs",
    "OpenAPI spec drift",
    "API documentation validation",
    "OpenAPI CI pipeline",
    "enterprise developer documentation",
  ],
  openGraph: {
    title: "DocsCI for OpenAPI-First Enterprise Platforms",
    description: "Automated documentation validation for enterprise API teams. Detects OpenAPI spec drift on every PR.",
    url: "https://snippetci.com/for/openapi-enterprise",
    siteName: "DocsCI",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "DocsCI",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Web",
  "url": "https://snippetci.com/for/openapi-enterprise",
  "description": "Documentation CI for OpenAPI-first enterprise platforms.",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
};

export default function OpenAPIEnterprisePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingPage
        slug="openapi-enterprise"
        analyticsEvent="openapi-enterprise"
        h1="Documentation CI for OpenAPI-First Enterprise Platforms"
        tagline="Your OpenAPI spec and your documentation drift apart on every release. DocsCI runs on every PR and closes the gap — automatically."
        problem={{
          heading: "Enterprise API docs break in four predictable ways",
          body: "OpenAPI-first teams ship clean specs, but documentation is maintained separately. Every sprint introduces drift that compounds until an enterprise customer hits a 422 on a parameter your docs say is optional.",
          bullets: [
            "Required parameters added to OpenAPI spec but not updated in docs",
            "Deprecated endpoints still documented as current — no migration path shown",
            "Response schema changes not reflected in parameter tables",
            "Code examples use old SDK method names after breaking changes",
          ],
        }}
        solution={{
          heading: "DocsCI is the missing layer between your OpenAPI spec and your documentation",
          body: "Connect your OpenAPI spec URL and DocsCI diffs every PR against it. Critical drift fails the check. Warnings surface inline. AI-generated fixes make resolution a single click for your docs team.",
        }}
        features={[
          {
            icon: "🔍",
            title: "OpenAPI spec diffing",
            description: "Parses OpenAPI 2.x (Swagger) and 3.x. Extracts every endpoint contract and diffs it against documentation claims extracted from parameter tables, code examples, and prose.",
          },
          {
            icon: "⚠️",
            title: "Severity-tiered findings",
            description: "Critical (required param missing, wrong type), Warning (deprecated undocumented, extra field), Info (response field undocumented). Critical findings fail the CI check by default.",
          },
          {
            icon: "🤖",
            title: "AI-generated diff fixes",
            description: "Each drift finding includes a diff-format suggested fix. 71% acceptance rate in beta — your docs team resolves findings in 8 minutes median vs. 4+ hours without tooling.",
          },
          {
            icon: "🔒",
            title: "Enterprise security model",
            description: "Your OpenAPI spec is fetched from your staging environment with ephemeral credentials. Network allowlists enforced. SOC 2 report available. Customer-hosted runner option.",
          },
          {
            icon: "📊",
            title: "Drift history and trends",
            description: "Track drift findings over time across releases. Export run reports as JSON for compliance audits. Webhook delivery to Slack, PagerDuty, or any endpoint.",
          },
          {
            icon: "🔗",
            title: "GitHub and GitLab native",
            description: "Inline PR comments on the exact file and line. Status check blocks merge when critical drift is found. No new tools for your developers to learn.",
          },
        ]}
        steps={[
          {
            step: "01",
            title: "Add your OpenAPI spec URL",
            description: "Point DocsCI at your staging API's /openapi.json endpoint. Supports basic auth, bearer tokens, or private network access via customer-hosted runner.",
            code: `# docsci.yml
openapi_url: "https://staging-api.example.com/openapi.json"
# or a local file
# openapi_file: "api/openapi.yaml"`,
          },
          {
            step: "02",
            title: "Run on every PR",
            description: "DocsCI parses the spec, extracts claims from your docs, and runs the diff. Critical drift fails the check. Findings appear as inline PR comments within 60 seconds.",
            code: `# .github/workflows/docsci.yml
- run: |
    tar czf docs.tar.gz docs/ *.md
    curl -sf -X POST https://snippetci.com/api/runs/queue \\
      -H "Authorization: Bearer \${{ secrets.DOCSCI_TOKEN }}" \\
      -F "docs_archive=@docs.tar.gz" \\
      -F "openapi_url=https://staging.example.com/openapi.json"`,
          },
          {
            step: "03",
            title: "Accept fixes, merge clean",
            description: "AI-generated diff fixes appear directly in the PR comment. Your docs team accepts or edits them. DocsCI re-runs on the updated commit and marks the check green.",
            code: `## ⚠️ DocsCI — API Drift — docs/reference/payments.md:112
# POST /payments — parameter 'currency_code' is required in OpenAPI spec
# but documented as optional.
- | currency_code | string | No  | ISO 4217 code |
+ | currency_code | string | Yes | ISO 4217 code (required) |`,
          },
        ]}
        stats={[
          { value: "94%", label: "reduction in drift findings after 3 releases" },
          { value: "8 min", label: "median time to resolve a drift finding" },
          { value: "71%", label: "AI fix acceptance rate" },
          { value: "< 60s", label: "time to first PR comment" },
        ]}
        faqs={[
          {
            q: "Which OpenAPI versions are supported?",
            a: "OpenAPI 3.x (3.0, 3.1) and Swagger 2.x. YAML and JSON formats. We also support AsyncAPI 2.x for event-driven API docs.",
          },
          {
            q: "How does DocsCI access our staging OpenAPI spec?",
            a: "Via HTTPS with a configurable bearer token or basic auth header. For private networks, you can run a DocsCI customer-hosted runner inside your VPC — no outbound exposure of your staging environment.",
          },
          {
            q: "Can we set custom severity rules?",
            a: "Yes. In docsci.yml you can promote or demote specific finding types (e.g., treat 'response field undocumented' as blocking). You can also allowlist specific endpoints or parameters.",
          },
          {
            q: "Does DocsCI work with Redocly, Stoplight, or Apiary?",
            a: "DocsCI is spec-agnostic — it reads the OpenAPI output, not the tooling that generates it. It works with any toolchain that produces a valid OpenAPI spec file.",
          },
          {
            q: "What's the compliance story?",
            a: "SOC 2 Type II report available under NDA. Data processed in ephemeral runners with no persistent storage of spec contents. RLS isolation between organizations in the database. Security packet available at /security.",
          },
        ]}
      />
    </>
  );
}
