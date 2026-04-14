import type { Metadata } from "next";
import { LandingPage } from "@/components/LandingPage";

export const metadata: Metadata = {
  title: "DocsCI for GitLab CI — Documentation Testing in Your GitLab Pipeline",
  description:
    "DocsCI integrates with GitLab CI to run documentation checks on every merge request. Executable snippet validation, OpenAPI drift detection, and inline MR comments — all in your existing GitLab workflow.",
  alternates: { canonical: "https://snippetci.com/for/gitlab-ci-docs" },
  keywords: [
    "GitLab CI documentation testing",
    "GitLab docs CI",
    "GitLab merge request docs check",
    "GitLab OpenAPI validation",
    "GitLab MDX CI",
    "docs CI GitLab pipeline",
  ],
  openGraph: {
    title: "DocsCI for GitLab CI Users",
    description: "Documentation CI for GitLab pipelines. Snippet execution, API drift detection, MR comments. No GitHub required.",
    url: "https://snippetci.com/for/gitlab-ci-docs",
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
  "url": "https://snippetci.com/for/gitlab-ci-docs",
  "description": "Documentation CI for GitLab CI pipelines.",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
};

export default function GitLabCIDocsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingPage
        slug="gitlab-ci-docs"
        analyticsEvent="gitlab-ci-docs"
        h1="Documentation CI for GitLab Pipelines"
        tagline="DocsCI runs inside your existing GitLab CI pipeline. No new tooling, no GitHub required. Broken examples and API drift get caught in merge request review — where they're cheapest to fix."
        problem={{
          heading: "GitLab teams don't have a docs quality gate",
          body: "Most GitLab CI pipelines have strong code quality gates — lint, test, security scan. Documentation is the exception: it's committed alongside code but never validated. GitLab's built-in CI has no native docs runner.",
          bullets: [
            "Code examples committed alongside the feature change that breaks them",
            "OpenAPI spec and documentation diverge silently across merges",
            "No native GitLab CI job for documentation quality",
            "MR comments have to be filed manually after user complaints",
          ],
        }}
        solution={{
          heading: "DocsCI drops into your .gitlab-ci.yml as a dedicated docs stage",
          body: "Add a docs:verify job to your pipeline. DocsCI archives your docs directory, runs snippet execution and drift detection, and posts inline MR comments with findings. The job fails on critical issues — blocking merge until docs are fixed.",
        }}
        features={[
          {
            icon: "🦊",
            title: "Native GitLab integration",
            description: "Posts findings as GitLab MR notes with file and line references. Integrates with GitLab CI/CD pipeline status checks. Works with GitLab SaaS, GitLab.com, and self-managed GitLab instances.",
          },
          {
            icon: "🔧",
            title: "Zero new tooling",
            description: "One curl command in your .gitlab-ci.yml. DocsCI handles execution, analysis, and reporting. No new agents to install, no Docker image to maintain.",
          },
          {
            icon: "🔐",
            title: "Self-managed and air-gapped support",
            description: "Customer-hosted runner option for on-prem GitLab installations. Runs inside your network with no outbound access to DocsCI servers. Satisfies air-gap and data residency requirements.",
          },
          {
            icon: "📋",
            title: "Merge request pipeline rules",
            description: "Configure DocsCI to run only on merge_request_event pipelines, only when docs paths change, or on every push to main. Full GitLab rules: syntax supported.",
          },
          {
            icon: "🔍",
            title: "OpenAPI drift in MR review",
            description: "Pass your OpenAPI spec URL alongside the docs archive. DocsCI diffs the spec against your documentation and surfaces drift directly in the MR where the change was made.",
          },
          {
            icon: "📊",
            title: "Pipeline artifacts and reports",
            description: "DocsCI generates a JSON run report as a GitLab pipeline artifact. Downloadable, searchable, and linkable from your MR description for compliance and audit trails.",
          },
        ]}
        steps={[
          {
            step: "01",
            title: "Add the DocsCI job to .gitlab-ci.yml",
            description: "Copy the template. Set the DOCSCI_TOKEN variable in your GitLab project's CI/CD settings.",
            code: `# .gitlab-ci.yml
stages:
  - test
  - docs

docs:verify:
  stage: docs
  image: curlimages/curl:latest
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
  script:
    - tar czf docs.tar.gz docs/ *.md 2>/dev/null || tar czf docs.tar.gz docs/
    - |
      curl -sf -X POST https://snippetci.com/api/runs/queue \\
        -H "Authorization: Bearer $DOCSCI_TOKEN" \\
        -F "docs_archive=@docs.tar.gz" \\
        -F "repo_url=$CI_PROJECT_URL" \\
        -F "mr_iid=$CI_MERGE_REQUEST_IID" \\
        | jq -e '.status != "failed"'`,
          },
          {
            step: "02",
            title: "Set DOCSCI_TOKEN in GitLab CI variables",
            description: "In your GitLab project, go to Settings → CI/CD → Variables. Add DOCSCI_TOKEN with the value from your DocsCI dashboard. Mark it as masked.",
            code: `# GitLab project settings path:
# Settings → CI/CD → Variables → Add variable
# Key:   DOCSCI_TOKEN
# Value: docsci_live_••••••••••••
# Type:  Variable (masked)
# Scope: All environments

# Full template: https://snippetci.com/templates/docsci-gitlab-ci.yml`,
          },
          {
            step: "03",
            title: "Findings appear as MR comments",
            description: "Each finding is posted as a GitLab MR note with the file, line, severity, and a suggested fix. Critical findings fail the pipeline job — blocking merge.",
            code: `## ❌ DocsCI — Snippet failure — docs/quickstart/python.md:47

Error: ImportError: No module named 'example_sdk.v2.auth'
       Module renamed to 'example_sdk.auth' in v3.0.0.

Suggested fix:
  - from example_sdk.v2 import auth
  + from example_sdk import auth

Impact: critical | Language: Python | Fix time: ~5 min`,
          },
        ]}
        stats={[
          { value: "GitLab SaaS", label: "and self-managed supported" },
          { value: "< 60s", label: "to first MR comment" },
          { value: "Air-gap", label: "option via customer-hosted runner" },
          { value: "Free", label: "up to 100 runs/month" },
        ]}
        faqs={[
          {
            q: "Does DocsCI support GitLab self-managed instances?",
            a: "Yes — MR comments are posted via the GitLab API using your GITLAB_TOKEN variable. Works with GitLab SaaS (gitlab.com), GitLab.com Premium, and self-managed instances on any supported version.",
          },
          {
            q: "Can we run DocsCI in an air-gapped environment?",
            a: "Yes. The customer-hosted runner option runs the DocsCI execution engine inside your network. Your documentation never leaves your environment. The only outbound call is a status report to the DocsCI dashboard (optional and configurable).",
          },
          {
            q: "How do we post MR comments from the DocsCI job?",
            a: "Set GITLAB_TOKEN in your CI/CD variables. DocsCI uses the GitLab MR Notes API to post inline comments. Alternatively, DocsCI can post to a webhook URL you configure instead.",
          },
          {
            q: "Can we add DocsCI to an existing monorepo pipeline?",
            a: "Yes. Use GitLab's 'changes' rules to run the docs job only when docs paths change. Set the 'allow_failure: true' flag if you want findings reported but not blocking.",
          },
          {
            q: "Is there a GitLab component available?",
            a: "A GitLab CI component (catalog entry) is on our roadmap for Q1. For now, use the template at snippetci.com/templates/docsci-gitlab-ci.yml — it's 50 lines and requires no external dependencies.",
          },
        ]}
      />
    </>
  );
}
