import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'

const posts: Record<string, {
  title: string; description: string; date: string; readTime: string; content: string
}> = {
  'how-to-run-a-price-test-without-losing-customers': {
    title: 'How to Run a Price Test Without Losing Customers',
    description: 'A practical guide to Bayesian A/B pricing experiments for solo founders — safe, statistical, and reversible.',
    date: 'January 15, 2025',
    readTime: '5 min read',
    content: `
<p>Most founders avoid changing prices because they're scared of losing customers. That fear is valid — a bad price change, rolled out to everyone at once, <strong>can</strong> hurt revenue. But the solution isn't to never test prices. It's to test them safely.</p>

<h2>The Problem With "Just Raise Your Prices"</h2>
<p>Generic advice like "charge more" ignores your specific customers, your product's value perception, and your competitive landscape. What works for one SaaS won't work for another.</p>
<p>The only way to know your optimal price is to <strong>test it with real buyers</strong>.</p>

<h2>What a Safe Price Test Looks Like</h2>
<p>A safe pricing experiment has three properties:</p>
<ol>
  <li><strong>Small scope</strong> — only a fraction of your visitors see the new price</li>
  <li><strong>Clear success metric</strong> — usually conversion rate or revenue per visitor</li>
  <li><strong>Easy rollback</strong> — if the test fails, you're back to baseline in one click</li>
</ol>
<p>PricePilot automates all three.</p>

<h2>Step 1: Connect Your Sales Data</h2>
<p>Start by connecting your Stripe, Gumroad, or Shopify account. PricePilot analyzes your existing transaction history to understand your current conversion rate, seasonal patterns, and price-sensitive customer cohorts.</p>

<h2>Step 2: Let the Engine Suggest Prices</h2>
<p>The Bayesian engine looks at your last 90–180 days of data and proposes 2–3 candidate prices derived from a price elasticity model fitted to your actual sales.</p>

<h2>Step 3: Launch the Experiment</h2>
<p>Each experiment creates a public A/B page. Half your visitors see Price A, half see Price B. The engine tracks conversions in real time and calculates a <strong>confidence score</strong>.</p>

<h2>Step 4: Roll Out or Roll Back</h2>
<p>When your experiment reaches confidence, you get a clear recommendation. One click applies the winner — or reverts to your original price if the experiment failed.</p>

<p>Running a price test isn't risky. Running one <strong>without data</strong> is. PricePilot gives you the data, the stats, and the safety net.</p>
    `
  },
  'the-bayesian-advantage-why-we-dont-use-traditional-ab-tests': {
    title: "The Bayesian Advantage: Why We Don't Use Traditional A/B Tests",
    description: "Traditional A/B testing is broken for small-scale sellers. Here's why Bayesian inference works better when you have less data.",
    date: 'January 28, 2025',
    readTime: '6 min read',
    content: `
<p>If you've ever tried to run a traditional A/B test on a product with low traffic, you know the frustration: you wait weeks, the results come back "inconclusive," and you're back to square one.</p>
<p>Traditional A/B testing was designed for products with millions of monthly users. It <strong>does not work</strong> for solo founders doing $500–$10k MRR.</p>

<h2>The Problem With Frequentist Testing</h2>
<p>Traditional A/B tests use <strong>frequentist statistics</strong>. This framework requires pre-determined sample sizes, no peeking at results, and lots of data — typically 200–1000 conversions per variant.</p>
<p>If you have 50 sales a month, a traditional A/B test would take 6–12 months to reach significance. That's useless.</p>

<h2>What Bayesian Testing Does Differently</h2>
<p>Bayesian statistics answers: "Given the data I've seen so far, what is my best estimate of which price is better, and how confident am I?"</p>
<ul>
  <li><strong>Updates continuously</strong> as new data arrives</li>
  <li><strong>Expresses uncertainty directly</strong> as a probability</li>
  <li><strong>Works with small samples</strong> — even 20–30 conversions per variant give meaningful signal</li>
</ul>

<h2>How PricePilot's Engine Works</h2>
<p>We model each price point's conversion rate as a Beta distribution. When a new sale comes in, we update the distribution using Bayes' theorem. Over time, the distributions either converge (similar performance) or diverge (one is clearly better).</p>
<p>We also account for time effects, cohort effects, and seasonality that could confound results.</p>

<h2>The Bottom Line</h2>
<p>For low-traffic, high-intent products, Bayesian testing is the right tool. You get actionable insights in weeks, not months, with honest uncertainty quantification.</p>
    `
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = posts[slug]
  if (!post) return { title: 'Not Found' }
  return { title: `${post.title} — PricePilot Blog`, description: post.description }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = posts[slug]
  if (!post) notFound()

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1rem' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
        <Link href="/" style={{ color: '#6b7280', fontSize: '0.875rem', textDecoration: 'none' }}>PricePilot</Link>
        <span style={{ color: '#d1d5db' }}>›</span>
        <Link href="/blog" style={{ color: '#6b7280', fontSize: '0.875rem', textDecoration: 'none' }}>Blog</Link>
      </div>

      <article data-testid="blog-post-content">
        <h1 style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.25, marginBottom: '1rem' }}>
          {post.title}
        </h1>
        <div style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '2rem' }}>
          {post.date} · {post.readTime} · PricePilot Team
        </div>
        <div
          style={{ lineHeight: 1.75, color: '#374151' }}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>

      <div style={{ marginTop: '3rem', padding: '1.5rem', background: '#f5f3ff', borderRadius: 12, borderLeft: '4px solid var(--brand, #4f46e5)' }}>
        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Try PricePilot free</p>
        <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Connect your store and run your first pricing experiment in under 10 minutes.
        </p>
        <Link href="/signup" style={{
          background: 'var(--brand, #4f46e5)', color: '#fff',
          padding: '0.6rem 1.25rem', borderRadius: 8, fontWeight: 600,
          textDecoration: 'none', display: 'inline-block',
        }}>Get started free →</Link>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <Link href="/blog" style={{ color: 'var(--brand, #4f46e5)', fontSize: '0.9rem', textDecoration: 'none' }}>
          ← All posts
        </Link>
      </div>
    </main>
  )
}
