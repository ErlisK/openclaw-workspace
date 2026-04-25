import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog — PricePilot',
  description: 'Pricing strategy, A/B testing guides, and growth insights for solo founders and micro-SaaS builders.',
}

const posts = [
  {
    slug: 'building-the-bayesian-pricing-engine',
    title: 'Building a Bayesian Pricing Engine in TypeScript',
    description: 'A deep dive into the Normal-InvGamma conjugate model, spike detection, and conservative revenue optimization that powers PricePilot — all in TypeScript, no Python required.',
    date: 'February 10, 2025',
    readTime: '10 min read',
    tags: ['engineering', 'Bayesian', 'TypeScript', 'statistics'],
  },
  {
    slug: 'building-pricepilot-product-intro',
    title: "I Built a Pricing Experiment Tool for Solo Founders — Here's What I Learned",
    description: 'PricePilot uses Bayesian inference to help indie creators safely test higher prices. The why, what, and how — plus three hard-won lessons from building it.',
    date: 'February 3, 2025',
    readTime: '5 min read',
    tags: ['startup', 'SaaS', 'pricing', 'Next.js'],
  },
  {
    slug: 'how-to-run-a-price-test-without-losing-customers',
    title: 'How to Run a Price Test Without Losing Customers',
    description: 'A practical guide to Bayesian A/B pricing experiments for solo founders — safe, statistical, and reversible.',
    date: 'January 15, 2025',
    readTime: '5 min read',
    tags: ['pricing', 'A/B testing', 'founder tips'],
  },
  {
    slug: 'the-bayesian-advantage-why-we-dont-use-traditional-ab-tests',
    title: 'The Bayesian Advantage: Why We Don\'t Use Traditional A/B Tests',
    description: 'Traditional A/B testing is broken for small-scale sellers. Here\'s why Bayesian inference works better when you have less data.',
    date: 'January 28, 2025',
    readTime: '6 min read',
    tags: ['statistics', 'Bayesian', 'pricing science'],
  },
]

export default function BlogPage() {
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 1rem' }}>
      <div style={{ marginBottom: '0.5rem' }}>
        <Link href="/" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.9rem' }}>← PricePilot</Link>
      </div>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Blog</h1>
      <p style={{ color: '#6b7280', marginBottom: '2.5rem' }}>
        Pricing strategy, A/B testing, and growth playbooks for solo founders.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {posts.map(post => (
          <article
            key={post.slug}
            data-testid={`blog-post-${post.slug}`}
            style={{
              border: '1px solid #e5e7eb', borderRadius: 12,
              padding: '1.5rem', background: '#fff',
            }}
          >
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {post.tags.map(tag => (
                <span key={tag} style={{
                  background: '#eff6ff', color: '#1d4ed8',
                  padding: '0.2rem 0.6rem', borderRadius: 20,
                  fontSize: '0.75rem', fontWeight: 500,
                }}>{tag}</span>
              ))}
            </div>
            <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', lineHeight: 1.3 }}>
                {post.title}
              </h2>
            </Link>
            <p style={{ color: '#4b5563', marginBottom: '1rem', lineHeight: 1.6 }}>
              {post.description}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                {post.date} · {post.readTime}
              </span>
              <Link href={`/blog/${post.slug}`} style={{
                color: 'var(--brand, #4f46e5)', fontWeight: 600, fontSize: '0.875rem',
                textDecoration: 'none',
              }}>
                Read more →
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div style={{ marginTop: '3rem', padding: '1.5rem', background: '#f9fafb', borderRadius: 12, textAlign: 'center' }}>
        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Ready to run your first pricing experiment?</p>
        <Link href="/signup" style={{
          background: 'var(--brand, #4f46e5)', color: '#fff',
          padding: '0.6rem 1.5rem', borderRadius: 8, fontWeight: 600,
          textDecoration: 'none', display: 'inline-block',
        }}>Start Free →</Link>
      </div>
    </main>
  )
}
