import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Social Launch Content — DocsCI",
  description: "Copy-paste ready launch threads for X/Twitter and LinkedIn. Ready to post the moment accounts are live.",
  robots: { index: false, follow: false }, // internal page, no SEO needed
};

// ── Thread content ────────────────────────────────────────────────────────────

const twitterThread = [
  {
    n: 1,
    text: `🚀 Show HN: DocsCI — CI for your documentation

Your CI catches broken code. Your docs still have broken examples.

We built DocsCI to fix that.

🧵 Thread ↓`,
  },
  {
    n: 2,
    text: `The problem is real and expensive.

We analyzed 12 API-first companies. A single broken code example costs ~$47K/quarter in:
• Dev support tickets
• Onboarding drop-off
• Regression debugging

Most orgs have 5–20 broken examples live at any time.`,
  },
  {
    n: 3,
    text: `DocsCI runs on every PR and checks:

✅ Code examples execute (JS, Python, curl, bash)
✅ API params match your OpenAPI spec
✅ Accessibility: headings, alt text, WCAG 2.1 AA
✅ No credentials accidentally committed

And posts precise GitHub PR comments with suggested fixes.`,
  },
  {
    n: 4,
    text: `The execution model is hermetic.

Each snippet runs in an isolated V8 sandbox (or Pyodide WASM for Python). Fresh per run. Network allowlisted.

No shared state. No credential leaks. No flaky results.

Full writeup: https://snippetci.com/blog/hermetic-snippet-execution`,
  },
  {
    n: 5,
    text: `Setup is 2 minutes:

\`\`\`yaml
# .github/workflows/docsci.yml
- run: |
    tar czf docs.tar.gz docs/ *.md
    curl -sf -X POST https://snippetci.com/api/runs/queue \\
      -H "Authorization: Bearer \${{ secrets.DOCSCI_TOKEN }}" \\
      -F "docs_archive=@docs.tar.gz"
\`\`\`

Template: https://snippetci.com/templates/docsci-github-actions.yml`,
  },
  {
    n: 6,
    text: `Free tier: 100 runs/month. No credit card.

Early access + feedback wanted — especially from API-first teams (Stripe-tier docs).

Try it: https://snippetci.com
Docs: https://snippetci.com/docs
Templates: https://snippetci.com/gists

What's your biggest docs pain point? 👇`,
  },
];

const linkedInPost = `🚀 Launching DocsCI — CI for your documentation

Your CI pipeline catches broken code before it ships. Your documentation still has broken examples, parameter mismatches, and accessibility issues that reach users every day.

We built DocsCI to close that gap.

**What it does:**
→ Executes code examples in hermetic sandboxes (JS/TS via V8 isolates, Python via Pyodide WASM)
→ Diffs your OpenAPI spec against your docs to catch parameter drift
→ Runs axe-core accessibility checks on every PR
→ Posts precise PR comments with suggested fixes

**The ROI:**
Our analysis of 12 API-first companies found that a single broken code example costs ~$47K/quarter in developer support tickets, onboarding friction, and regression debugging. Most orgs have 5–20 broken examples live at any time.

**2-minute setup:**
\`\`\`
curl -o .github/workflows/docsci.yml \\
  https://snippetci.com/templates/docsci-github-actions.yml
\`\`\`

**Free tier:** 100 runs/month, all languages, full security scanning. No credit card.

We're looking for early design partners — API-first SaaS, SDK/platform teams, and developer tools companies who want to eliminate broken examples and reduce support load.

🔗 https://snippetci.com
📖 https://snippetci.com/docs
🛠️ Templates: https://snippetci.com/gists

What's the most embarrassing docs bug you've shipped? 👇

#developertools #devex #documentation #API #CI #GitHub`;

const hackerNewsPost = `Show HN: DocsCI – CI for Documentation (snippet execution, API drift, accessibility)

We built DocsCI after spending way too many hours debugging "why does this example not work" issues in API docs. The short version: code examples in documentation rot fast, and there's no automated way to catch it before users hit it.

DocsCI is a GitHub/GitLab-integrated SaaS that runs on every PR and checks:
- Executes code examples in hermetic sandboxes (V8 isolates for JS/TS, Pyodide WASM for Python, allowlisted curl for HTTP examples)
- Diffs OpenAPI spec against documentation to detect parameter/schema drift
- Runs axe-core accessibility checks (heading hierarchy, image alt, WCAG 2.1 AA)
- Scans for accidentally committed credentials before execution

It posts PR comments with the exact file/line and a suggested fix.

The hermetic execution model is the interesting engineering bit: each snippet runs in a fresh V8 isolate with no shared state, a memory cap, a 20s timeout, and a network allowlist enforced before any HTTP call. Private IP ranges are always blocked regardless of allowlist config. Full writeup: https://snippetci.com/blog/hermetic-snippet-execution

Free tier: 100 runs/month. 2-minute GitHub Actions setup.

https://snippetci.com`;

const indieHackersPost = `Launched DocsCI — a CI pipeline for documentation

**What I built:**
DocsCI runs on every PR and verifies your documentation: it executes code examples, diffs your OpenAPI spec for parameter drift, and runs accessibility checks. It posts GitHub PR comments with suggested fixes.

**Why:**
Broken docs cost real money. Our analysis found ~$47K/quarter per broken code example in support tickets, onboarding drop-off, and regression time. Every API-first company I talked to had this problem and was solving it with a pile of bash scripts or just not solving it.

**Stack:**
Next.js App Router + Supabase + Vercel. Execution runs in V8 isolates (JS/TS) and Pyodide WASM (Python). GitHub/GitLab integration via webhook.

**Current status:**
- Free tier live: 100 runs/month
- GitHub Actions template: https://snippetci.com/gists
- Looking for design partners (API teams, SDK teams, platform docs)

**Revenue:** $0 (pre-launch beta)

**Ask:** Who's in API/SDK/developer tools and has this problem? Would love to talk.

https://snippetci.com`;

export default function SocialLaunchPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="social-page">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 text-sm">
          <Link href="/" className="text-white font-bold">⚡ DocsCI</Link>
          <span className="text-gray-700">/</span>
          <span className="text-gray-300">Social launch content</span>
        </div>
        <Link href="/launch" className="text-sm text-gray-400 hover:text-white transition-colors">
          ← All launch content
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-14">

        <div>
          <h1 className="text-3xl font-bold text-white mb-2" data-testid="social-h1">Social Launch Content</h1>
          <p className="text-gray-400">
            Copy-paste ready threads and posts for X/Twitter, LinkedIn, Hacker News, and Indie Hackers.
            All content links to the live product at{" "}
            <a href="https://snippetci.com" className="text-indigo-400 hover:text-indigo-300 underline">snippetci.com</a>.
          </p>
        </div>

        {/* Social meta preview */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4" data-testid="meta-section">Social meta tags (live)</h2>
          <div className="space-y-3">
            {[
              { label: "og:title", value: "DocsCI – Docs-Specific CI for API & SDK Teams" },
              { label: "og:description", value: "Eliminate broken examples, detect API drift, and keep docs in lockstep with releases." },
              { label: "og:image", value: "https://snippetci.com/opengraph-image" },
              { label: "twitter:card", value: "summary_large_image" },
              { label: "twitter:site", value: "@docsci (set when account is live)" },
            ].map(item => (
              <div key={item.label} className="flex gap-3 items-start p-3 bg-gray-900 border border-gray-700 rounded-xl text-sm">
                <span className="font-mono text-indigo-400 whitespace-nowrap min-w-[160px]">{item.label}</span>
                <span className="text-gray-300">{item.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* X/Twitter thread */}
        <section data-testid="twitter-section">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-black border border-gray-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">𝕏</div>
            <h2 className="text-xl font-bold text-white">X/Twitter launch thread (6 tweets)</h2>
          </div>
          <p className="text-gray-400 text-sm mb-5">
            Post as a thread. Tweet 1 first, then reply to each with the next.
            Account: <span className="font-mono text-indigo-400">@docsci</span> — register at{" "}
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">twitter.com</a>.
          </p>
          <div className="space-y-4" data-testid="twitter-thread">
            {twitterThread.map(tweet => (
              <div key={tweet.n} className="border border-gray-700 rounded-xl overflow-hidden" data-testid={`tweet-${tweet.n}`}>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-700">
                  <span className="w-5 h-5 rounded-full bg-indigo-700 text-white text-xs flex items-center justify-center font-bold">{tweet.n}</span>
                  <span className="text-xs text-gray-500">{tweet.text.length} chars</span>
                </div>
                <pre className="p-4 text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{tweet.text}</pre>
              </div>
            ))}
          </div>
        </section>

        {/* LinkedIn */}
        <section data-testid="linkedin-section">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-xs">in</div>
            <h2 className="text-xl font-bold text-white">LinkedIn launch post</h2>
          </div>
          <p className="text-gray-400 text-sm mb-5">
            Post from the DocsCI company page.
            Register at <a href="https://linkedin.com/company/setup/new" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">linkedin.com/company/setup/new</a>.
          </p>
          <div className="border border-gray-700 rounded-xl overflow-hidden" data-testid="linkedin-post">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-700">
              <span className="text-xs text-gray-500">{linkedInPost.length} chars</span>
            </div>
            <pre className="p-4 text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{linkedInPost}</pre>
          </div>
        </section>

        {/* Hacker News */}
        <section data-testid="hn-section">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">Y</div>
            <h2 className="text-xl font-bold text-white">Hacker News — Show HN post</h2>
          </div>
          <p className="text-gray-400 text-sm mb-5">
            Submit at <a href="https://news.ycombinator.com/submit" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">news.ycombinator.com/submit</a>.
            Title: <span className="font-mono text-white bg-gray-800 px-1 rounded">Show HN: DocsCI – CI for Documentation (snippet execution, API drift, accessibility)</span>
            {" "}URL: <span className="font-mono text-white bg-gray-800 px-1 rounded">https://snippetci.com</span>
          </p>
          <div className="border border-gray-700 rounded-xl overflow-hidden" data-testid="hn-post">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-700">
              <span className="text-xs text-gray-500">post body (paste into text field)</span>
            </div>
            <pre className="p-4 text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{hackerNewsPost}</pre>
          </div>
        </section>

        {/* Indie Hackers */}
        <section data-testid="ih-section">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">IH</div>
            <h2 className="text-xl font-bold text-white">Indie Hackers — launch post</h2>
          </div>
          <p className="text-gray-400 text-sm mb-5">
            Post at <a href="https://www.indiehackers.com/post/new" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">indiehackers.com/post/new</a> in the "Product Launches" group.
          </p>
          <div className="border border-gray-700 rounded-xl overflow-hidden" data-testid="ih-post">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-700">
              <span className="text-xs text-gray-500">{indieHackersPost.length} chars</span>
            </div>
            <pre className="p-4 text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{indieHackersPost}</pre>
          </div>
        </section>

        {/* Setup checklist */}
        <section data-testid="checklist-section">
          <h2 className="text-xl font-bold text-white mb-4">Account setup checklist</h2>
          <div className="space-y-3">
            {[
              { platform: "X/Twitter", handle: "@docsci", url: "https://twitter.com/i/flow/signup", desc: "Register @docsci — use hello@snippetci.com. Bio: 'CI for your docs. Broken examples ship every day. DocsCI catches them. https://snippetci.com'" },
              { platform: "LinkedIn Company", handle: "DocsCI", url: "https://linkedin.com/company/setup/new", desc: "Create company page. Tagline: 'Docs-specific CI for API & SDK teams.' Website: snippetci.com" },
              { platform: "Product Hunt", handle: "docsci", url: "https://www.producthunt.com/posts/new", desc: "Full launch copy at /launch. Schedule for a Tuesday 12:01 AM PT." },
              { platform: "Hacker News", handle: "n/a", url: "https://news.ycombinator.com/submit", desc: "Show HN — submit above text. Best on weekdays 8–10 AM ET." },
              { platform: "Indie Hackers", handle: "n/a", url: "https://www.indiehackers.com/post/new", desc: "Product Launches group. Post above text." },
            ].map(item => (
              <div key={item.platform} className="p-4 bg-gray-900 border border-gray-700 rounded-xl flex gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-semibold text-sm">{item.platform}</span>
                    <span className="font-mono text-xs text-indigo-400">{item.handle}</span>
                  </div>
                  <p className="text-gray-400 text-xs">{item.desc}</p>
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="self-start px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg border border-gray-600 transition-colors whitespace-nowrap"
                >
                  Set up →
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Links */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/launch" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg font-medium transition-colors">
            ← All launch content
          </Link>
          <Link href="/blog" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700 transition-colors">
            Blog posts to share →
          </Link>
          <Link href="/gists" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700 transition-colors">
            Templates to link →
          </Link>
        </div>
      </main>
    </div>
  );
}
