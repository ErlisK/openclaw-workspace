import type { Metadata } from "next";
import { LandingPage } from "@/components/LandingPage";

export const metadata: Metadata = {
  title: "DocsCI for Next.js / MDX Documentation — Automated Docs Testing for Modern Stacks",
  description:
    "DocsCI integrates with Next.js and MDX-based documentation sites. Test every code block in your MDX files, validate component props against your design system, and catch accessibility issues on every PR.",
  alternates: { canonical: "https://snippetci.com/for/nextjs-mdx-docs" },
  keywords: [
    "Next.js documentation testing",
    "MDX code example testing",
    "Nextra CI",
    "Docusaurus CI",
    "MDX docs automation",
    "Next.js docs CI",
    "MDX snippet execution",
  ],
  openGraph: {
    title: "DocsCI for Next.js / MDX Documentation",
    description: "Automated documentation testing for Next.js and MDX-based docs sites. Test every code block, every component, every PR.",
    url: "https://snippetci.com/for/nextjs-mdx-docs",
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
  "url": "https://snippetci.com/for/nextjs-mdx-docs",
  "description": "Documentation CI for Next.js and MDX-based documentation sites.",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
};

export default function NextjsMdxDocsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingPage
        slug="nextjs-mdx-docs"
        analyticsEvent="nextjs-mdx-docs"
        h1="Documentation CI for Next.js and MDX-Based Docs Sites"
        tagline="MDX gives you React components in your docs. DocsCI makes sure every code block in every .mdx file actually works — before you deploy."
        problem={{
          heading: "MDX docs have unique quality problems that generic CI doesn't catch",
          body: "Next.js-based docs sites (Nextra, Mintlify, custom App Router setups) are powerful, but code blocks in MDX files are just strings — they're never executed. When your SDK changes, those examples break silently.",
          bullets: [
            "MDX code blocks are never type-checked or executed by the Next.js build",
            "Imported component prop changes break inline examples invisibly",
            "Heading structure in MDX drifts as pages grow and sections move",
            "Missing alt text on images in MDX is never caught until a user complains",
          ],
        }}
        solution={{
          heading: "DocsCI understands MDX — it executes fenced code blocks and validates your component usage",
          body: "Point DocsCI at your Next.js docs repo. It parses .mdx files, extracts code blocks by language, executes them in hermetic sandboxes, and checks heading structure and accessibility. Results appear as inline GitHub PR comments.",
        }}
        features={[
          {
            icon: "📝",
            title: "MDX-aware parsing",
            description: "Parses .mdx and .md files natively. Extracts fenced code blocks by language tag, skips non-executable blocks (like shell output marked with 'text'), and respects disable comments.",
          },
          {
            icon: "⚡",
            title: "JavaScript and TypeScript execution",
            description: "Runs JS/TS code blocks in V8 isolates with your type definitions injected. Catches TS type errors and runtime exceptions that would confuse users copying your examples.",
          },
          {
            icon: "🐍",
            title: "Python via Pyodide WASM",
            description: "Python examples in MDX execute via Pyodide WebAssembly — full CPython in the browser sandbox. No native dependencies to install. Catches ImportErrors from renamed modules.",
          },
          {
            icon: "🎨",
            title: "Component prop validation",
            description: "If you use custom MDX components (like <CodeGroup>, <Tabs>, <Callout>), DocsCI can validate that props match your component definitions — catching refactors that break examples.",
          },
          {
            icon: "♿",
            title: "Accessibility checks",
            description: "Heading hierarchy, image alt text, link text quality — all checked on the MDX source. axe-core rendered checks available for deployed Vercel previews.",
          },
          {
            icon: "🚀",
            title: "Vercel preview integration",
            description: "DocsCI can run against your Vercel preview deployments. Catches rendering issues and component errors that only appear after the MDX is compiled.",
          },
        ]}
        steps={[
          {
            step: "01",
            title: "Configure your MDX paths",
            description: "Tell DocsCI where your .mdx files live and which code block languages to execute. One line per language.",
            code: `# docsci.yml
snippets:
  extensions: [".mdx", ".md"]
  languages:
    javascript: true
    typescript: true
    python: true
    bash: false       # validate structure only
    text: false       # skip — output blocks
  component_defs: "components/mdx/"   # optional`,
          },
          {
            step: "02",
            title: "Archive and submit",
            description: "Your GitHub Action archives the docs directory and submits it. DocsCI handles parsing, execution, and accessibility checks.",
            code: `# .github/workflows/docsci.yml
- name: Run DocsCI on MDX docs
  run: |
    tar czf docs.tar.gz pages/ content/ *.mdx *.md 2>/dev/null
    curl -sf -X POST https://snippetci.com/api/runs/queue \\
      -H "Authorization: Bearer \${{ secrets.DOCSCI_TOKEN }}" \\
      -F "docs_archive=@docs.tar.gz"`,
          },
          {
            step: "03",
            title: "Fix inline — merge clean",
            description: "PR comments point to the exact .mdx file and line. Suggested fixes include the corrected code block. Accept, commit, and DocsCI re-runs.",
            code: `## ❌ DocsCI — Snippet failure — content/quickstart.mdx:84

\`\`\`typescript
// Your example (line 84):
import { createClient } from '@example/sdk/v2';
// ❌ Module '@example/sdk/v2' not found.

// Suggested fix:
import { createClient } from '@example/sdk';
\`\`\``,
          },
        ]}
        stats={[
          { value: ".mdx", label: "files parsed natively" },
          { value: "< 2 min", label: "setup time for most Next.js repos" },
          { value: "8 min", label: "median fix time per finding" },
          { value: "Free", label: "up to 100 runs/month" },
        ]}
        faqs={[
          {
            q: "Does DocsCI work with Nextra, Mintlify, and other Next.js doc frameworks?",
            a: "Yes — DocsCI reads the raw .mdx source files, not the rendered output. It works with any framework that uses standard Markdown fenced code blocks. Framework-specific components are also supported.",
          },
          {
            q: "How does DocsCI handle MDX imports and custom components?",
            a: "For code execution purposes, custom MDX component imports are stripped — only the fenced code block content is executed. For component prop validation (optional), you provide your component definition directory.",
          },
          {
            q: "Can I run DocsCI on Vercel preview deployments?",
            a: "Yes. You can pass a docs_site_url to DocsCI alongside the archive, and it will run axe-core against your preview URL for rendered accessibility checks.",
          },
          {
            q: "What about TypeScript examples that import from my own packages?",
            a: "You can include a type_stubs archive with your .d.ts files. DocsCI injects these into the V8 isolate so TS examples compile correctly against your type definitions.",
          },
          {
            q: "Is there a way to skip specific code blocks?",
            a: "Yes — add a comment `{/* docsci-skip */}` before the code block in your MDX file, or use the `docsci.yml` skip_patterns config to exclude blocks by content pattern.",
          },
        ]}
      />
    </>
  );
}
