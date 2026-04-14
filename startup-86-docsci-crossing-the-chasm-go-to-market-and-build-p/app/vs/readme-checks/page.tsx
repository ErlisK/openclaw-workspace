import type { Metadata } from "next";
import { ComparisonPage, Check, Cross, Partial } from "@/components/ComparisonPage";

export const metadata: Metadata = {
  title: "DocsCI vs README.io checks — Moving beyond basic link checking",
  description:
    "README.io (ReadMe) hosts your API docs beautifully but doesn't verify that code examples run, detect API drift, or check accessibility. DocsCI adds a CI verification layer that works with or without ReadMe.",
  alternates: { canonical: "https://snippetci.com/vs/readme-checks" },
  openGraph: {
    title: "DocsCI vs README.io / ReadMe checks",
    description: "API docs hosting vs docs CI pipeline.",
    url: "https://snippetci.com/vs/readme-checks",
    siteName: "DocsCI",
    type: "website",
  },
};

const rows = [
  {
    feature: "Code snippet execution",
    docsci: <><Check /> Sandboxed, multi-language</>,
    competitor: <><Cross /> Static display only</>,
    winner: "docsci" as const,
  },
  {
    feature: "API reference generation",
    docsci: <><Partial label="OpenAPI import for drift checks" /></>,
    competitor: <><Check /> Beautiful API reference from OpenAPI</>,
    winner: "competitor" as const,
  },
  {
    feature: "OpenAPI drift detection",
    docsci: <><Check /> Spec vs docs diff</>,
    competitor: <><Cross /> OpenAPI rendered, not verified</>,
    winner: "docsci" as const,
  },
  {
    feature: "Broken example detection",
    docsci: <><Check /> Runtime verification per PR</>,
    competitor: <><Cross /> Not supported</>,
    winner: "docsci" as const,
  },
  {
    feature: "Accessibility checks",
    docsci: <><Check /> axe-core on every doc</>,
    competitor: <><Partial label="Platform-level WCAG only" /></>,
    winner: "docsci" as const,
  },
  {
    feature: "PR inline comments",
    docsci: <><Check /> Line-level findings + AI patch</>,
    competitor: <><Cross /> No PR integration</>,
    winner: "docsci" as const,
  },
  {
    feature: "Developer hub / portal",
    docsci: <><Cross /> Not a portal</>,
    competitor: <><Check /> Developer hub with changelog, versioning</>,
    winner: "competitor" as const,
  },
  {
    feature: "User metrics / page analytics",
    docsci: <><Partial label="Run metrics in dashboard" /></>,
    competitor: <><Check /> Page views, search analytics</>,
    winner: "competitor" as const,
  },
  {
    feature: "Secret scanning",
    docsci: <><Check /> Pre-execution, 40+ patterns</>,
    competitor: <><Cross /> Not in scope</>,
    winner: "docsci" as const,
  },
  {
    feature: "Works with any hosting",
    docsci: <><Check /> GitHub repo, any format</>,
    competitor: <><Partial label="Requires ReadMe hosting" /></>,
    winner: "docsci" as const,
  },
  {
    feature: "AI-generated fixes",
    docsci: <><Check /> Claude patch diffs</>,
    competitor: <><Cross /> None</>,
    winner: "docsci" as const,
  },
  {
    feature: "Changelog management",
    docsci: <><Cross /> Not in scope</>,
    competitor: <><Check /> Built-in changelog</>,
    winner: "competitor" as const,
  },
];

export default function Page() {
  return (
    <ComparisonPage
      slug="readme-checks"
      competitor="README.io checks"
      competitorUrl="https://readme.com"
      tagline="ReadMe builds beautiful developer portals. DocsCI verifies the code inside them actually works. Add DocsCI to the CI pipeline that feeds your ReadMe docs."
      summary={
        <>
          <strong className="text-white">ReadMe (README.io)</strong> is a developer portal
          platform with beautiful API reference pages, changelogs, and user analytics. It excels
          at presenting documentation to developers. However, ReadMe doesn't verify that code
          examples in your guides are correct, that your OpenAPI spec matches what you've
          documented, or that your pages meet accessibility standards.{" "}
          <strong className="text-white">DocsCI</strong> fills that verification gap — running
          in your CI pipeline before docs are pushed to ReadMe, catching broken snippets,
          API drift, and accessibility issues before they reach users.
        </>
      }
      rows={rows}
      docsciSummary={`Catches broken code examples before they reach your ReadMe portal
OpenAPI drift detection: flags spec vs docs divergence
Multi-language sandboxed execution — Python, JS, cURL, Go, Bash
Pre-execution secret scanning on all code snippets
Accessibility checks on doc pages (axe-core)
Works with ReadMe, Docusaurus, Mintlify, or self-hosted docs`}
      competitorSummary={`Beautiful developer portal but no runtime code verification
OpenAPI is rendered as reference docs, not verified against actual doc content
No automated CI pipeline integration for pre-merge checks
No per-snippet execution or error detection
ReadMe metrics show page views, not broken snippet errors
Requires hosting on ReadMe infrastructure`}
      verdict={
        <>
          <strong className="text-white">DocsCI and ReadMe work best together.</strong> Use DocsCI
          in your CI pipeline (GitHub Actions or GitLab CI) to verify that every code snippet runs,
          every API parameter is documented accurately, and every page meets accessibility standards.
          Then sync to ReadMe for hosting, portal features, and user analytics. DocsCI gives you
          confidence that what ReadMe publishes is correct.
        </>
      }
      faqs={[
        {
          q: "Does DocsCI integrate with ReadMe?",
          a: "DocsCI works with your GitHub repository — the same source that feeds ReadMe. Run DocsCI checks in CI before the ReadMe sync step. Any broken snippets or drift findings block the merge, so only verified content reaches ReadMe.",
        },
        {
          q: "Can DocsCI verify ReadMe API Reference pages?",
          a: "DocsCI can import your OpenAPI spec and verify that the endpoints, parameters, and response schemas documented in your Markdown guides match the spec. The ReadMe-rendered API reference is separate.",
        },
        {
          q: "What about ReadMe's suggest-an-edit feature?",
          a: "ReadMe's suggest-an-edit creates GitHub PRs. DocsCI runs on those PRs automatically — so even user-suggested doc edits are verified for broken snippets before they merge.",
        },
      ]}
    />
  );
}
