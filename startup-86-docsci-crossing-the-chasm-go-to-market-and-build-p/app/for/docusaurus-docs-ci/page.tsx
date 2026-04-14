import type { Metadata } from "next";
import { LandingPage } from "@/components/LandingPage";

export const metadata: Metadata = {
  title: "Docusaurus Docs CI — Automate code example testing for Docusaurus sites",
  description:
    "Add a CI pipeline to your Docusaurus documentation. DocsCI executes every code snippet, detects API drift, checks accessibility, and posts PR comments — without modifying your Docusaurus config.",
  alternates: { canonical: "https://snippetci.com/for/docusaurus-docs-ci" },
  keywords: ["docusaurus docs CI", "docusaurus code example testing", "docusaurus API drift", "docusaurus CI pipeline"],
  openGraph: {
    title: "Docusaurus Docs CI — DocsCI",
    description: "Automated code testing and API drift detection for Docusaurus documentation.",
    url: "https://snippetci.com/for/docusaurus-docs-ci",
    siteName: "DocsCI",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "DocsCI for Docusaurus",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  url: "https://snippetci.com/for/docusaurus-docs-ci",
  description: "CI pipeline for Docusaurus documentation — execute code examples, detect API drift, check accessibility.",
  publisher: { "@type": "Organization", name: "DocsCI", url: "https://snippetci.com" },
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free tier available" },
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingPage
        slug="docusaurus-docs-ci"
        analyticsEvent="docusaurus docs CI"
        h1="CI for Docusaurus Documentation"
        tagline="Stop shipping broken code examples in your Docusaurus site. DocsCI runs on every PR — executing snippets, detecting API drift, and posting inline PR comments with fixes."
        problem={{
          heading: "Docusaurus is great. Your docs CI isn't.",
          body: "Docusaurus makes it easy to write beautiful documentation. But it doesn't verify that the code inside actually works — and neither does your default CI setup.",
          bullets: [
            "Code snippets in MDX files become stale as your API evolves — no automated check catches it",
            "Accessibility issues in custom React components go unnoticed until users report them",
            "When your OpenAPI spec changes, documented request/response examples silently diverge",
            "Broken examples in docs cause support tickets and damage developer trust",
            "Writing a custom test script for Docusaurus MDX fenced code blocks takes days and breaks often",
          ],
        }}
        solution={{
          heading: "DocsCI: the missing CI layer for Docusaurus",
          body: "DocsCI reads your Docusaurus repository, extracts every fenced code block from MDX and Markdown files, and executes them in sandboxed runtimes. It detects API drift between your OpenAPI spec and documented examples, checks accessibility in rendered components, and posts precise PR comments with AI-generated fixes. Add one GitHub Action — no changes to your Docusaurus config.",
        }}
        features={[
          {
            icon: "⚡",
            title: "MDX-native snippet extraction",
            description: "DocsCI parses Docusaurus MDX files and extracts fenced code blocks in JS, TS, Python, Go, Bash, and cURL — ignoring non-executable content blocks.",
          },
          {
            icon: "🔍",
            title: "OpenAPI drift detection",
            description: "Import your OpenAPI spec via docsci.yml. DocsCI diffs every documented endpoint, parameter, and response schema against the spec on each PR.",
          },
          {
            icon: "♿",
            title: "Accessibility checks",
            description: "axe-core checks run against your doc pages. WCAG violations — missing alt text, low contrast, invalid ARIA — are flagged as findings with line numbers.",
          },
          {
            icon: "🤖",
            title: "AI-generated fixes",
            description: "For every broken snippet or drift finding, Claude generates a patch diff and PR comment explaining the fix — so your team spends less time debugging.",
          },
          {
            icon: "🔒",
            title: "Hermetic sandboxes",
            description: "Each snippet runs in an isolated V8 or WASM sandbox. No shared state, no host contamination, no credential leaks. Secret scanning runs before execution.",
          },
          {
            icon: "📊",
            title: "Run metrics dashboard",
            description: "Track pass rates, finding trends, and snippet health over time. Export as JSON or SARIF for GitHub Code Scanning integration.",
          },
        ]}
        steps={[
          {
            step: "1",
            title: "Add the GitHub Action",
            description: "Copy the DocsCI action into .github/workflows/ — it runs on every push to main and every pull request.",
            code: `# .github/workflows/docsci.yml
- name: Run DocsCI
  run: |
    curl -sf -X POST https://snippetci.com/api/runs/queue \\
      -H "Authorization: Bearer \${{ secrets.DOCSCI_TOKEN }}" \\
      -F "docs_archive=@docs.tar.gz"`,
          },
          {
            step: "2",
            title: "Configure your docsci.yml (optional)",
            description: "Point at your OpenAPI spec, set language allowlist, configure network policy.",
            code: `# docsci.yml (optional)
docs:
  path: ./docs
  include: ["**/*.md", "**/*.mdx"]
openapi:
  url: https://api.example.com/openapi.json
checks:
  snippets: true
  accessibility: true
  drift: true`,
          },
          {
            step: "3",
            title: "Review PR comments",
            description: "DocsCI posts inline comments with exact file/line, error message, and an AI-generated fix — directly in your Docusaurus pull requests.",
          },
        ]}
        stats={[
          { value: "5 min", label: "Setup time" },
          { value: "6+", label: "Languages supported" },
          { value: "40+", label: "Secret scan patterns" },
          { value: "100%", label: "Hermetically isolated" },
        ]}
        faqs={[
          {
            q: "Does DocsCI work with Docusaurus MDX files?",
            a: "Yes. DocsCI parses both .md and .mdx files, extracting fenced code blocks. It handles standard MDX including imports and JSX — non-executable blocks are skipped.",
          },
          {
            q: "Do I need to modify my Docusaurus configuration?",
            a: "No. DocsCI reads your repository directly via GitHub. No changes to docusaurus.config.js or any other Docusaurus files are needed.",
          },
          {
            q: "Can DocsCI test interactive code blocks (live editor)?",
            a: "DocsCI executes standard fenced code blocks. Docusaurus live editor blocks (using react-live) are detected and executed in the appropriate sandbox.",
          },
          {
            q: "How does DocsCI handle Docusaurus versioned docs?",
            a: "DocsCI processes all files matching the include glob in docsci.yml. Configure include to target specific versions: ['versioned_docs/version-2.0/**/*.md'].",
          },
        ]}
      />
    </>
  );
}
