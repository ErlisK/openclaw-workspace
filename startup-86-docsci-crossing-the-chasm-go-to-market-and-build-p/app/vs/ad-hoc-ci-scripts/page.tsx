import type { Metadata } from "next";
import { ComparisonPage, Check, Cross, Partial } from "@/components/ComparisonPage";

export const metadata: Metadata = {
  title: "DocsCI vs ad-hoc CI scripts — Stop maintaining broken doc test scripts",
  description:
    "Ad-hoc CI scripts for documentation testing require constant maintenance, have no drift detection, and produce noisy failures. DocsCI gives you a purpose-built docs CI pipeline with sandboxed execution, AI fixes, and zero maintenance overhead.",
  alternates: { canonical: "https://snippetci.com/vs/ad-hoc-ci-scripts" },
  openGraph: {
    title: "DocsCI vs ad-hoc CI scripts",
    description: "Purpose-built docs CI vs hand-rolled shell scripts.",
    url: "https://snippetci.com/vs/ad-hoc-ci-scripts",
    siteName: "DocsCI",
    type: "website",
  },
};

const rows = [
  {
    feature: "Setup time",
    docsci: <><Check /> 5-minute GitHub Action</>,
    competitor: <><Cross /> Days or weeks of script writing</>,
    winner: "docsci" as const,
  },
  {
    feature: "Maintenance burden",
    docsci: <><Check /> Zero — DocsCI maintains runtimes</>,
    competitor: <><Cross /> High — you own every script</>,
    winner: "docsci" as const,
  },
  {
    feature: "Snippet extraction from docs",
    docsci: <><Check /> Automatic fenced-code parsing</>,
    competitor: <><Cross /> Manual or fragile grep/awk patterns</>,
    winner: "docsci" as const,
  },
  {
    feature: "Sandbox isolation",
    docsci: <><Check /> Hermetic V8 isolate + Pyodide WASM</>,
    competitor: <><Cross /> Runs on host, shared state</>,
    winner: "docsci" as const,
  },
  {
    feature: "Secret scanning",
    docsci: <><Check /> Pre-execution scan, 40+ patterns</>,
    competitor: <><Cross /> None unless you add it yourself</>,
    winner: "docsci" as const,
  },
  {
    feature: "API drift detection",
    docsci: <><Check /> OpenAPI vs docs diff</>,
    competitor: <><Cross /> Requires custom tooling</>,
    winner: "docsci" as const,
  },
  {
    feature: "Accessibility checks",
    docsci: <><Check /> axe-core on every doc page</>,
    competitor: <><Cross /> Not typically included</>,
    winner: "docsci" as const,
  },
  {
    feature: "PR inline comments with fixes",
    docsci: <><Check /> Precise line-level comments</>,
    competitor: <><Partial label="Only raw CI logs" /></>,
    winner: "docsci" as const,
  },
  {
    feature: "AI-generated fixes",
    docsci: <><Check /> Claude patch diffs per finding</>,
    competitor: <><Cross /> None</>,
    winner: "docsci" as const,
  },
  {
    feature: "Realtime run progress",
    docsci: <><Check /> Supabase Realtime streaming UI</>,
    competitor: <><Cross /> CI log polling only</>,
    winner: "docsci" as const,
  },
  {
    feature: "Customizability",
    docsci: <><Partial label="docsci.yml config" /></>,
    competitor: <><Check /> Fully custom — you own the code</>,
    winner: "competitor" as const,
  },
  {
    feature: "Cost",
    docsci: <><Partial label="Paid SaaS (free tier available)" /></>,
    competitor: <><Partial label="'Free' but engineering time costly" /></>,
    winner: "tie" as const,
  },
];

export default function Page() {
  return (
    <ComparisonPage
      slug="ad-hoc-ci-scripts"
      competitor="ad-hoc CI scripts"
      tagline="Hand-rolled doc test scripts break silently, require constant maintenance, and never grow into API drift detection. DocsCI is the purpose-built alternative."
      summary={
        <>
          Many teams start by writing a bash script that extracts code blocks from docs and runs them
          in a temporary container. It works — until a runtime version changes, a new language is added,
          or someone needs to know <em>which</em> snippet broke and why.{" "}
          <strong className="text-white">DocsCI</strong> replaces these scripts with a maintained,
          sandboxed, observable pipeline: snippet execution across every language, OpenAPI drift
          detection, accessibility checks, and PR-level comments with AI-generated fixes. Your
          engineering team spends time on product, not on plumbing.
        </>
      }
      rows={rows}
      docsciSummary={`5-minute setup vs days of scripting
Zero maintenance — DocsCI handles runtime updates and parser changes
Sandboxed execution — no risk of host contamination
Pre-execution secret scanning prevents credential leaks
AI-generated patch diffs surfaced directly in PRs
Built-in API drift, accessibility, and copy checks`}
      competitorSummary={`High maintenance: runtime updates, parser changes, new languages all require script edits
No isolation: snippets run on the CI host, can leak credentials or mutate state
No drift detection: you'd need to build OpenAPI diffing yourself
Failures are raw CI logs — no per-finding actionability
No AI suggestions — humans must debug every failure manually
Real engineering cost: even a "simple" doc test script takes days to get right`}
      verdict={
        <>
          If your team already has ad-hoc scripts that work, great. But the moment you need drift
          detection, secret scanning, accessibility checks, or AI-assisted fixes, you're building
          DocsCI from scratch. <strong className="text-white">DocsCI</strong> gives you all of that
          in 5 minutes — and keeps it maintained so you don't have to.
        </>
      }
      faqs={[
        {
          q: "We already have CI scripts. Is it hard to migrate?",
          a: "No. Add the DocsCI GitHub Action alongside your existing scripts. Run both in parallel for a sprint, confirm DocsCI catches everything your scripts catch (plus more), then retire the scripts.",
        },
        {
          q: "Can DocsCI run arbitrary shell commands in docs?",
          a: "DocsCI executes shell/bash snippets in a simulated environment for command validation. For full shell execution with side effects, use the customer-hosted runner option.",
        },
        {
          q: "What if our docs have private/internal endpoints?",
          a: "Configure the allowlist in docsci.yml to permit your staging or internal API domains. DocsCI will allow outbound calls to those domains only — all other network access is blocked by default.",
        },
      ]}
    />
  );
}
