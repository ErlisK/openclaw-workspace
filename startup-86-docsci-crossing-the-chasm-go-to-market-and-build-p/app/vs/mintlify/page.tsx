import type { Metadata } from "next";
import { ComparisonPage, Check, Cross, Partial } from "@/components/ComparisonPage";

export const metadata: Metadata = {
  title: "DocsCI vs Mintlify — CI pipeline for docs vs a docs hosting platform",
  description:
    "Mintlify is a beautiful docs platform. DocsCI is a docs CI pipeline. Mintlify won't catch broken code examples, API drift, or accessibility failures. DocsCI will — and it works with Mintlify sites.",
  alternates: { canonical: "https://snippetci.com/vs/mintlify" },
  openGraph: {
    title: "DocsCI vs Mintlify",
    description: "Docs hosting vs docs CI — they solve different problems.",
    url: "https://snippetci.com/vs/mintlify",
    siteName: "DocsCI",
    type: "website",
  },
};

const rows = [
  {
    feature: "Category",
    docsci: <><Check /> Docs CI pipeline</>,
    competitor: "Docs hosting platform",
    winner: "tie" as const,
  },
  {
    feature: "Code snippet execution",
    docsci: <><Check /> Sandboxed multi-language execution</>,
    competitor: <><Cross /> Static rendering only</>,
    winner: "docsci" as const,
  },
  {
    feature: "Broken example detection",
    docsci: <><Check /> Runtime verification per PR</>,
    competitor: <><Cross /> Not supported</>,
    winner: "docsci" as const,
  },
  {
    feature: "OpenAPI drift detection",
    docsci: <><Check /> Spec vs docs diff</>,
    competitor: <><Partial label="OpenAPI rendering, no drift check" /></>,
    winner: "docsci" as const,
  },
  {
    feature: "Accessibility checks",
    docsci: <><Check /> axe-core + structural</>,
    competitor: <><Partial label="Platform-level only" /></>,
    winner: "docsci" as const,
  },
  {
    feature: "PR inline comments",
    docsci: <><Check /> Line-level findings + AI patch</>,
    competitor: <><Cross /> No PR integration</>,
    winner: "docsci" as const,
  },
  {
    feature: "Docs hosting",
    docsci: <><Cross /> Not a hosting platform</>,
    competitor: <><Check /> Beautiful hosted docs site</>,
    winner: "competitor" as const,
  },
  {
    feature: "Custom components",
    docsci: <><Cross /> Not in scope</>,
    competitor: <><Check /> MDX components, custom UI</>,
    winner: "competitor" as const,
  },
  {
    feature: "Search",
    docsci: <><Cross /> Not in scope</>,
    competitor: <><Check /> Built-in semantic search</>,
    winner: "competitor" as const,
  },
  {
    feature: "AI content suggestions",
    docsci: <><Check /> Broken snippet + drift fixes</>,
    competitor: <><Check /> Mintlify AI writer</>,
    winner: "tie" as const,
  },
  {
    feature: "Secret scanning",
    docsci: <><Check /> Pre-execution, 40+ patterns</>,
    competitor: <><Cross /> Not in scope</>,
    winner: "docsci" as const,
  },
  {
    feature: "Works with any docs platform",
    docsci: <><Check /> GitHub repo, any format</>,
    competitor: <><Partial label="Requires Mintlify hosting" /></>,
    winner: "docsci" as const,
  },
];

export default function Page() {
  return (
    <ComparisonPage
      slug="mintlify"
      competitor="Mintlify"
      competitorUrl="https://mintlify.com"
      tagline="Mintlify hosts beautiful docs. DocsCI verifies they actually work. Use them together — DocsCI runs in your CI pipeline before Mintlify publishes."
      summary={
        <>
          <strong className="text-white">Mintlify</strong> is a modern documentation hosting
          platform with beautiful default themes, MDX components, built-in search, and an AI
          writing assistant. It excels at presentation.{" "}
          <strong className="text-white">DocsCI</strong> is a docs CI pipeline that runs before
          your docs are published: it executes every code snippet in sandboxed runtimes, detects
          when your OpenAPI spec diverges from what your docs describe, and posts PR comments with
          AI-generated fixes for broken examples. These tools are designed to work together — DocsCI
          in the CI pipeline, Mintlify for hosting and presentation.
        </>
      }
      rows={rows}
      docsciSummary={`Catches broken code examples before they reach users
Multi-language sandboxed execution — no risk of host contamination
OpenAPI drift detection: spec vs docs diff per PR
Accessibility and copy quality checks on every commit
Works with Mintlify, Nextra, Docusaurus, Sphinx, or any static site
No changes to your docs repo format required`}
      competitorSummary={`Static hosting only — no runtime verification of code examples
No drift detection between OpenAPI spec and documented API behavior
Mintlify AI Writer improves writing, not technical correctness
Requires hosting docs on Mintlify infrastructure
No pre-execution secret scanning
No CI pipeline integration for verification`}
      verdict={
        <>
          <strong className="text-white">DocsCI and Mintlify solve different problems and work
          best together.</strong> Add DocsCI to your GitHub Actions workflow — it runs on every PR
          and catches broken examples before merge. Then Mintlify publishes the verified, correct
          docs. If you're on Mintlify today and broken code examples are reaching your users,
          DocsCI is the missing layer.
        </>
      }
      faqs={[
        {
          q: "Does DocsCI work with Mintlify sites?",
          a: "Yes. DocsCI reads your docs from the GitHub repository (the same repo Mintlify deploys from) and runs checks on every PR. It doesn't require any changes to your Mintlify configuration.",
        },
        {
          q: "Does Mintlify have any built-in code verification?",
          a: "Mintlify can render code blocks and some platforms support interactive code runners, but there is no automated pre-merge verification that code examples execute without errors or that they match your API spec.",
        },
        {
          q: "Can DocsCI check Mintlify-specific MDX components?",
          a: "DocsCI focuses on fenced code blocks and standard Markdown content. Mintlify-specific MDX components (Cards, Tabs, Callouts) are not executed but accessibility checks apply to the rendered output.",
        },
      ]}
    />
  );
}
