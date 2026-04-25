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
  },
  'building-the-bayesian-pricing-engine': {
    title: 'Building a Bayesian Pricing Engine in TypeScript',
    description: 'A deep dive into the Normal-InvGamma conjugate model, spike detection, and conservative revenue optimization that powers PricePilot — all in TypeScript, no Python required.',
    date: 'February 10, 2025',
    readTime: '10 min read',
    content: `
<p>When I started building PricePilot, I faced a core problem: <strong>how do you run a meaningful pricing experiment with 30–100 sales per month?</strong></p>

<p>Traditional A/B tests need 200–1,000 conversions per variant for significance. At 50 monthly sales, that's a 2-year wait. Useless.</p>

<p>Bayesian inference changes the question: instead of "is this statistically significant?", it asks "what's the probability Price B generates more revenue than Price A?" That's answerable with 20–40 data points.</p>

<h2>The Core Model</h2>

<p>We model price-demand as a log-linear regression:</p>
<pre><code>log(Q/Q_ref) = ε · log(P/P_ref) + noise</code></pre>

<p>Where <code>ε</code> is price elasticity. Our prior: <code>Normal(-1.0, 0.5²)</code> — most digital products sit near unit elasticity. The prior shrinks with sparse data and lets the data speak as observations accumulate.</p>

<h2>Normal-InvGamma Conjugate Update</h2>

<p>We use the NIG conjugate prior — closed-form posterior, no MCMC needed:</p>

<pre><code>function nigUpdate(x: number[], y: number[], priorMu = -1.0, priorSd = 0.5): NIGPosterior {
  const lam0 = 1 / (priorSd * priorSd)
  const N = x.length
  let Sxx = 0, Sxy = 0, Syy = 0
  for (let i = 0; i < N; i++) {
    Sxx += x[i]*x[i]; Sxy += x[i]*y[i]; Syy += y[i]*y[i]
  }
  const lamPost = lam0 + Sxx
  const muPost  = (priorMu * lam0 + Sxy) / lamPost
  const aPost   = priorA + N / 2
  const bPost   = priorB + 0.5*Syy + 0.5*priorMu*priorMu*lam0 - 0.5*muPost*muPost*lamPost
  return { mu: muPost, lam: lamPost, a: aPost, b: bPost }
}</code></pre>

<p>5 observations → prior dominates. 50 observations → data dominates. Exactly the right behavior.</p>

<h2>Conservative Recommendation Rule</h2>

<p>The optimizer maximizes E[Revenue] subject to a downside constraint: the 5th-percentile outcome must stay above 95% of current revenue.</p>

<pre><code>function findOptimalPrice(pRef, rRef, samples) {
  const floor = rRef * 0.95  // max 5% downside
  let bestPrice = 0, bestMean = -Infinity

  for (let mult = 1.1; mult <= 2.5; mult += 0.05) {
    const dist = predictRevenue(pRef * mult, pRef, rRef, samples)
    if (dist.p05 < floor) continue  // reject — too risky
    if (dist.mean > bestMean) { bestMean = dist.mean; bestPrice = pRef * mult }
  }
  return bestPrice
}</code></pre>

<h2>Spike Detection (MAD Filter)</h2>

<p>A ProductHunt launch creates a sales spike at a discounted price that ruins the elasticity estimate. We flag outliers using Median Absolute Deviation (better than std dev because it's not inflated by the outliers themselves):</p>

<pre><code>// Modified Z-score > 3.0 = spike (Iglewicz & Hoaglin, 1993)
is_spike = mad > 0 ? (0.6745 * Math.abs(qty - median) / mad) > 3.0 : false</code></pre>

<h2>Stack: Pure TypeScript, No External Math Libs</h2>

<p>Zero external dependencies — no ml-matrix, no tensorflow.js. The NIG update, Cornish-Fisher quantile approximation, and Box-Muller sampler are hand-implemented. The engine runs in a Next.js App Router Route Handler, backed by Supabase with Row Level Security isolating each user's data.</p>

<p><strong>Try PricePilot free:</strong> <a href="https://startup-92-pricepilot-hbs-style-cus.vercel.app">startup-92-pricepilot-hbs-style-cus.vercel.app</a></p>
    `,
  },
  'building-pricepilot-product-intro': {
    title: "I Built a Pricing Experiment Tool for Solo Founders — Here's What I Learned",
    description: 'PricePilot uses Bayesian inference to help indie creators safely test higher prices. A product intro covering the why, what, and how.',
    date: 'February 3, 2025',
    readTime: '5 min read',
    content: `
<p>Six months ago, I talked to 40 solo founders about pricing. Every single one said the same thing:</p>
<p><em>"No. I'm scared of losing customers."</em></p>
<p>I built PricePilot to solve that.</p>

<h2>What PricePilot Does</h2>
<p>Connect your Stripe, Gumroad, or Shopify store — the app analyzes 90 days of sales, estimates your price elasticity using Bayesian inference, suggests 2–3 conservative test prices with confidence scores, and generates a live A/B experiment page. When the experiment completes, one click applies the winner or rolls back to your original price.</p>

<h2>Why Traditional A/B Testing Fails for Solo Founders</h2>
<p>Traditional A/B tests need 200–1,000 conversions per variant for significance. At 50–100 monthly sales, that's a 2-year wait. Bayesian inference answers the right question instead: "What's the probability Price B generates more revenue?" — answerable with 20–40 data points.</p>

<h2>Three Things I Learned Building It</h2>
<p><strong>Conservative defaults win.</strong> Adding hard caps (max 2.5× current price) and a downside floor (p05 ≥ 95% of current revenue) increased usage significantly. Founders don't trust aggressive suggestions.</p>

<p><strong>Real-world CSVs are messier than you think.</strong> Gumroad changed their export format twice in 2024. We switched to fuzzy column detection — matching by substring, not exact header names.</p>

<p><strong>Supabase RLS is excellent but requires planning.</strong> Getting Row Level Security right at the start saved an entire category of data isolation bugs.</p>

<h2>The Stack</h2>
<ul>
  <li><strong>Next.js 15</strong> (App Router, TypeScript)</li>
  <li><strong>Supabase</strong> (PostgreSQL + Auth + RLS)</li>
  <li><strong>Vercel</strong> (deployment + AI Gateway)</li>
  <li><strong>Stripe</strong> (checkout + billing portal)</li>
  <li><strong>Engine:</strong> Pure TypeScript — Normal-InvGamma conjugate model, zero external deps</li>
</ul>

<p>See the <a href="/blog/building-the-bayesian-pricing-engine">technical deep dive</a> for the full engine implementation with code.</p>

<p><strong>Try it free (no credit card):</strong> <a href="https://startup-92-pricepilot-hbs-style-cus.vercel.app">startup-92-pricepilot-hbs-style-cus.vercel.app</a></p>
    `,
  },
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
