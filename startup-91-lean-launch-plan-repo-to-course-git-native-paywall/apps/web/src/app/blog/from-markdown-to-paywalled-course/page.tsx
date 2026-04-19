import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'From Markdown to Paywalled Course in Minutes — TeachRepo Blog',
  description: 'A step-by-step walkthrough of turning a folder of Markdown files into a deployed, Stripe-powered course site using TeachRepo.',
  openGraph: {
    title: 'From Markdown to Paywalled Course in Minutes',
    description: 'Step-by-step: Markdown files → deployed course with Stripe checkout in under 10 minutes.',
    url: 'https://teachrepo.com/blog/from-markdown-to-paywalled-course',
    type: 'article',
    publishedTime: '2025-04-21',
  },
};

export default function MarkdownToPaywalledCourse() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/blog" className="text-sm text-gray-400 hover:text-violet-600 mb-8 inline-block">
          ← Back to blog
        </Link>

        <header className="mb-10">
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
            <time dateTime="2025-04-21">April 21, 2025</time>
            <span>·</span>
            <span>8 min read</span>
            <span className="rounded-full bg-violet-50 text-violet-600 px-2 py-0.5 font-medium">tutorial</span>
            <span className="rounded-full bg-gray-50 text-gray-600 px-2 py-0.5 font-medium">quickstart</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 leading-tight mb-4">
            From Markdown to Paywalled Course in Minutes
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            A complete walkthrough: starting from a folder of <code className="bg-gray-100 px-1 rounded text-sm">.md</code> files,
            ending with a live, Stripe-powered course site — in under 10 minutes.
          </p>
        </header>

        <div className="space-y-6 text-gray-700 leading-relaxed">

          <h2 className="text-xl font-bold text-gray-900 mt-10">Prerequisites</h2>
          <p>You&apos;ll need:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>A folder of <code className="bg-gray-100 px-1 rounded text-sm">.md</code> files (lessons)</li>
            <li>A <a href="https://stripe.com" className="text-violet-600 hover:underline">Stripe account</a> (free)</li>
            <li>A <a href="https://vercel.com" className="text-violet-600 hover:underline">Vercel account</a> (free tier is fine)</li>
            <li>A <a href="https://teachrepo.com/auth/signup" className="text-violet-600 hover:underline">TeachRepo account</a></li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Step 1: Structure Your Lesson Files</h2>
          <p>
            TeachRepo expects your lessons to be Markdown files with YAML frontmatter. Here&apos;s the minimal structure:
          </p>

          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 overflow-x-auto text-sm leading-relaxed">
{`my-course/
├── course.yml          ← course metadata + pricing
├── 01-intro.md         ← free preview lesson
├── 02-core-concepts.md ← paid lesson
├── 03-advanced.md      ← paid lesson
└── 04-wrap-up.md       ← paid lesson`}
          </pre>

          <p>Each lesson file has a small frontmatter block at the top:</p>

          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 overflow-x-auto text-sm leading-relaxed">
{`---
title: "Core Concepts"
access: paid
---

# Core Concepts

Your lesson content goes here. Full Markdown is supported:
code blocks, images, tables, lists, callouts.

\`\`\`python
def hello_world():
    print("Hello from your lesson!")
\`\`\``}
          </pre>

          <p>
            The only required frontmatter fields are <code className="bg-gray-100 px-1 rounded text-sm">title</code> and{' '}
            <code className="bg-gray-100 px-1 rounded text-sm">access</code> (<code className="bg-gray-100 px-1 rounded text-sm">free</code> or{' '}
            <code className="bg-gray-100 px-1 rounded text-sm">paid</code>).
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Step 2: Write Your course.yml</h2>
          <p>
            The <code className="bg-gray-100 px-1 rounded text-sm">course.yml</code> is the canonical source of truth for your course.
            It controls pricing, lesson order, access tiers, and metadata:
          </p>

          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 overflow-x-auto text-sm leading-relaxed">
{`title: "Python Async for Web Developers"
slug: "python-async"
price_cents: 1900          # $19.00 USD
currency: usd
version: "1.0.0"
description: |
  Master Python's asyncio, aiohttp, and async patterns
  used at production scale. Practical, code-first.
repo_url: "https://github.com/yourname/python-async-course"
tags: [python, async, web, backend]

lessons:
  - filename: 01-intro.md
    title: "Why Async? A Mental Model"
    access: free

  - filename: 02-core-concepts.md
    title: "Coroutines, Tasks, and the Event Loop"
    access: paid

  - filename: 03-advanced.md
    title: "Real-World Patterns: Timeouts, Retries, Semaphores"
    access: paid

  - filename: 04-wrap-up.md
    title: "Putting It All Together"
    access: paid`}
          </pre>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Step 3: Import to TeachRepo</h2>
          <p>Two ways to import:</p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6">Option A: GitHub Import (recommended)</h3>
          <p>Push your course folder to a GitHub repo, then import via the dashboard or API:</p>

          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 overflow-x-auto text-sm leading-relaxed">
{`# Via the TeachRepo API (once you have your JWT)
curl -X POST https://teachrepo.com/api/import \\
  -H "Authorization: Bearer <your-token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "repoUrl": "https://github.com/yourname/python-async-course",
    "courseYml": "<your-course.yml-contents>"
  }'

# Response:
# { "courseId": "crs_abc123", "slug": "python-async", "status": "imported" }`}
          </pre>

          <h3 className="text-lg font-semibold text-gray-900 mt-6">Option B: Direct YAML Import</h3>
          <p>
            You can paste the full <code className="bg-gray-100 px-1 rounded text-sm">course.yml</code> directly into the
            TeachRepo dashboard. Lesson content is fetched from the linked GitHub repo.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Step 4: Connect Stripe</h2>
          <p>
            TeachRepo uses Stripe Checkout under the hood. You provide your Stripe secret key once (in your account settings
            or as a Vercel env var), and the platform handles everything else:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Creates a Stripe Checkout Session on &quot;Buy&quot; click</li>
            <li>Listens for the <code className="bg-gray-100 px-1 rounded text-sm">checkout.session.completed</code> webhook</li>
            <li>Grants <code className="bg-gray-100 px-1 rounded text-sm">course_entitlement</code> in the database</li>
            <li>Unlocks all paid lessons immediately</li>
          </ul>

          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 overflow-x-auto text-sm leading-relaxed">
{`# The checkout flow in 3 lines of code (simplified):
# 1. Student clicks "Buy Course" → POST /api/checkout
# 2. Stripe Checkout Session created → redirect to Stripe
# 3. Stripe webhook fires → entitlement granted → lessons unlocked

# No custom payment UI to build. No webhook handler to write.
# TeachRepo handles all of this.`}
          </pre>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Step 5: Deploy to Vercel</h2>
          <p>
            TeachRepo is a Next.js app. Deploy it to your own Vercel account in one command:
          </p>

          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 overflow-x-auto text-sm leading-relaxed">
{`# Clone the TeachRepo template
git clone https://github.com/ErlisK/teachrepo
cd teachrepo

# Add your environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase + Stripe keys

# Deploy
vercel --prod`}
          </pre>

          <p>Or use the TeachRepo hosted tier and skip all of this. Your call.</p>

          <h2 className="text-xl font-bold text-gray-900 mt-10">What Students See</h2>
          <p>Once deployed, students get:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>A course landing page with description, price, and lesson list</li>
            <li>Free lessons accessible immediately (no signup required)</li>
            <li>Signup prompt on gated lesson access attempt</li>
            <li>Stripe Checkout for purchase (card, Apple Pay, Google Pay)</li>
            <li>Instant access to all paid content post-purchase</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Total Time: ~8 Minutes</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Structure your Markdown files: 2 min</li>
            <li>Write course.yml: 3 min</li>
            <li>Import + connect Stripe: 2 min</li>
            <li>Deploy: 1 min</li>
          </ul>
          <p className="mt-4">
            That&apos;s it. Your course is live, Stripe checkout works, and students can start buying.
          </p>

          <div className="mt-10 rounded-2xl border border-violet-200 bg-violet-50 p-6">
            <p className="font-semibold text-violet-900 mb-2">Ready to try it?</p>
            <p className="text-violet-700 text-sm mb-4">
              Two free sample courses are already live on the TeachRepo marketplace.
              Sign up free and import your first course — no credit card required.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="https://teachrepo.com/auth/signup" className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
                Start for free →
              </a>
              <a href="https://teachrepo.com/docs/quickstart" className="rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-700 hover:border-violet-500">
                Read the docs
              </a>
              <a href="https://github.com/ErlisK/teachrepo" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300">
                GitHub ↗
              </a>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-100 flex items-center justify-between text-sm text-gray-400">
          <Link href="/blog" className="hover:text-violet-600">← Back to blog</Link>
          <a href="https://teachrepo.com" className="hover:text-violet-600">teachrepo.com</a>
        </div>
      </div>
    </div>
  );
}
