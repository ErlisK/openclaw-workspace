import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing Guides for Solo Founders — PricePilot',
  description: 'In-depth guides on pricing experiments, Gumroad price updates, Stripe A/B testing, and cohort-aware simulations for micro-SaaS and digital product sellers.',
}

const guides = [
  {
    slug: 'micro-seller-pricing-experiments',
    title: "The Solo Seller's Complete Guide to Pricing Experiments",
    description: 'Why pricing experiments matter for $500–$10k MRR sellers, how Bayesian testing works with small data, and how to run your first safe price test in under an hour.',
    readTime: '9 min read',
    tags: ['pricing strategy', 'A/B testing', 'micro-SaaS'],
    date: 'March 1, 2025',
  },
  {
    slug: 'gumroad-pricing-updates-and-churn-risk',
    title: 'How to Update Your Gumroad Price Without Losing Customers',
    description: "Gumroad's CSV export reveals who your price-sensitive buyers are. Here's how to use that data to raise prices safely and keep your best customers.",
    readTime: '8 min read',
    tags: ['Gumroad', 'pricing', 'churn'],
    date: 'March 8, 2025',
  },
  {
    slug: 'stripe-price-testing-without-code',
    title: "Stripe Price Testing Without Code: A Founder's Guide",
    description: "You don't need a developer to A/B test prices on Stripe. This guide covers the options, the tradeoffs, and the fastest path to knowing if your new price converts.",
    readTime: '8 min read',
    tags: ['Stripe', 'price testing', 'SaaS'],
    date: 'March 15, 2025',
  },
  {
    slug: 'cohort-aware-simulations-explained',
    title: 'Cohort-Aware Price Simulations: Why They Matter for Indie Founders',
    description: 'Your ProductHunt launch cohort is not your organic cohort. Here\'s why mixing them ruins your elasticity estimates — and how cohort-aware simulations fix it.',
    readTime: '9 min read',
    tags: ['statistics', 'cohort analysis', 'simulation'],
    date: 'March 22, 2025',
  },
]

export default function GuidesPage() {
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '3rem 1rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.9rem' }}>← PricePilot</Link>
      </div>

      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Pricing Guides</h1>
      <p style={{ color: '#6b7280', marginBottom: '2.5rem' }}>
        In-depth guides on pricing experiments, analytics, and revenue optimization for solo founders.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {guides.map(guide => (
          <article
            key={guide.slug}
            data-testid={`guide-${guide.slug}`}
            style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem', background: '#fff' }}
          >
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {guide.tags.map(tag => (
                <span key={tag} style={{
                  background: '#f0fdf4', color: '#166534',
                  padding: '0.2rem 0.6rem', borderRadius: 20,
                  fontSize: '0.75rem', fontWeight: 500,
                }}>{tag}</span>
              ))}
            </div>
            <Link href={`/guides/${guide.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', lineHeight: 1.3 }}>
                {guide.title}
              </h2>
            </Link>
            <p style={{ color: '#4b5563', marginBottom: '1rem', lineHeight: 1.6 }}>{guide.description}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>{guide.date} · {guide.readTime}</span>
              <Link href={`/guides/${guide.slug}`} style={{ color: '#4f46e5', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
                Read guide →
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div style={{ marginTop: '3rem', padding: '1.5rem', background: '#f5f3ff', borderRadius: 12, textAlign: 'center' }}>
        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Ready to run your first pricing experiment?</p>
        <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.9rem' }}>Connect your Stripe, Gumroad, or Shopify store and get Bayesian price suggestions in minutes.</p>
        <Link href="/signup?utm_source=guides&utm_medium=organic&utm_campaign=authority_content&utm_content=listing" style={{
          background: '#4f46e5', color: '#fff',
          padding: '0.6rem 1.5rem', borderRadius: 8, fontWeight: 600,
          textDecoration: 'none', display: 'inline-block',
        }}>Start Free — No Credit Card</Link>
      </div>
    </main>
  )
}
