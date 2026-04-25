import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Launch — PricePilot',
  description: 'PricePilot is live. Submit to communities, share the press kit, and try the product.',
}

const APP_URL = 'https://startup-92-pricepilot-hbs-style-cus.vercel.app'

const submissions = [
  { platform: 'Product Hunt', url: 'https://www.producthunt.com/posts/new', status: 'ready', note: 'Requires PH account · Best launch day: Tuesday' },
  { platform: 'Hacker News (Show HN)', url: 'https://news.ycombinator.com/submit', status: 'ready', note: 'Best time: 9am ET weekdays' },
  { platform: 'Indie Hackers', url: 'https://www.indiehackers.com/products/new', status: 'ready', note: 'Also post in IH community' },
  { platform: 'BetaList', url: 'https://betalist.com/startups/new', status: 'ready', note: '1–2 week review queue' },
  { platform: 'AlternativeTo', url: 'https://alternativeto.net/software/add/', status: 'ready', note: 'Category: A/B Testing' },
  { platform: 'SaaS Hub', url: 'https://www.saashub.com/submit', status: 'ready', note: 'Free listing' },
  { platform: 'r/SaaS', url: 'https://reddit.com/r/SaaS/submit', status: 'ready', note: 'Use "Show r/SaaS" flair' },
  { platform: 'r/indiehackers', url: 'https://reddit.com/r/indiehackers/submit', status: 'ready', note: 'Cross-post from IH' },
]

const tweets = [
  `I spent 3 months asking solo founders why they don't test their prices.\n\nThe answer: "What if I lose customers?"\n\nSo I built PricePilot — safe A/B pricing experiments with statistical proof and one-click rollback.\n\nThread 🧵`,
  `The problem with traditional A/B testing for indie founders:\n\nMost tests need 1000+ conversions per variant for significance.\n\nIf you have 50 sales/month → 2-year wait.\n\nSo we don't test. We just guess.`,
  `PricePilot uses Bayesian inference instead.\n\nInstead of "is this significant?" it asks: "what's the probability Price B beats Price A given my data?"\n\nYou get a confidence score after 30–90 conversions. Not 2 years.`,
  `The flow:\n1. Connect Stripe/Gumroad (60s)\n2. Bayesian engine suggests safe prices\n3. Live A/B page with real tracking\n4. Confidence score updates in real time\n5. Apply winner or roll back\n\nNo stats degree needed.`,
  `Free tier, no credit card.\n\nTry it → ${APP_URL}\nPress kit + demo GIF → ${APP_URL}/press\n\nWhat price would you test first? 👇`,
]

export default function LaunchPage() {
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '3rem 1rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.9rem' }}>← PricePilot</Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
        <span style={{ background: '#dcfce7', color: '#166534', padding: '0.3rem 0.9rem', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700 }}>
          🚀 LIVE
        </span>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>Launch HQ</h1>
      </div>
      <p style={{ color: '#6b7280', marginBottom: '2.5rem' }}>
        PricePilot is live at <a href={APP_URL} style={{ color: '#4f46e5' }}>{APP_URL}</a>.
        All submission copy is ready to paste.
      </p>

      {/* Quick links */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
        {[
          { label: '📋 Press Kit', href: '/press' },
          { label: '🎬 Core Flow GIF', href: '/assets/core-flow-small.gif' },
          { label: '🖼 Logo SVG', href: '/assets/logo.svg' },
          { label: '📸 Screenshots', href: '/press#screenshots' },
        ].map(l => (
          <a key={l.label} href={l.href} style={{
            border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.5rem 1rem',
            fontSize: '0.875rem', textDecoration: 'none', color: '#374151',
            background: '#fff',
          }}>{l.label}</a>
        ))}
      </div>

      {/* Submission checklist */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Submission Checklist (8 platforms)</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {submissions.map(s => (
            <div key={s.platform} style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '0.875rem 1.25rem',
              border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff',
            }}>
              <span style={{ fontSize: '1.1rem' }}>✅</span>
              <div style={{ flex: 1 }}>
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontWeight: 600, color: '#4f46e5', textDecoration: 'none' }}>
                  {s.platform}
                </a>
                <span style={{ color: '#9ca3af', fontSize: '0.8rem', marginLeft: '0.75rem' }}>{s.note}</span>
              </div>
              <a href={s.url} target="_blank" rel="noopener noreferrer" style={{
                background: '#f3f4f6', padding: '0.35rem 0.75rem', borderRadius: 6,
                fontSize: '0.8rem', color: '#374151', textDecoration: 'none', flexShrink: 0,
              }}>Submit →</a>
            </div>
          ))}
        </div>
      </section>

      {/* One-liner copy */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>Ready-to-Paste: One-liners</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { label: 'Tagline (short)', text: 'Safe A/B pricing experiments for solo founders' },
            { label: 'Tagline (HN)', text: 'Bayesian A/B pricing experiments for solo founders ($500–$10k MRR)' },
            { label: 'Product Hunt tagline', text: 'Safe Bayesian pricing experiments for solo founders' },
            { label: '280-char pitch', text: `PricePilot: connect your Stripe/Gumroad/Shopify store and run safe A/B pricing experiments using Bayesian inference. Get results in weeks, not months — with one-click rollback. Free tier. ${APP_URL}` },
          ].map(item => (
            <div key={item.label} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.875rem 1.25rem', background: '#fff' }}>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</p>
              <p style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#111827', margin: 0, lineHeight: 1.5 }}>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Twitter thread */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>Twitter/X Launch Thread (5 tweets)</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {tweets.map((tweet, i) => (
            <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem 1.25rem', background: '#fff' }}>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.4rem', fontWeight: 600 }}>TWEET {i + 1}</p>
              <pre style={{ fontFamily: 'inherit', fontSize: '0.9rem', color: '#111827', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{tweet}</pre>
            </div>
          ))}
        </div>
      </section>

      {/* Show HN text */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>Show HN — Post Text</h2>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem', background: '#fff', fontFamily: 'monospace', fontSize: '0.875rem', lineHeight: 1.7, color: '#374151' }}>
          <p style={{ margin: '0 0 0.75rem', fontWeight: 700 }}>Title: Show HN: PricePilot – Bayesian A/B pricing experiments for solo founders ($500–$10k MRR)</p>
          <p style={{ margin: 0 }}>
            Hi HN, I built PricePilot — a tool for solo creators who want to safely test higher prices without risking their revenue.
            <br /><br />
            The core problem: traditional A/B testing needs 1000+ conversions per variant. Most indie founders have 50–200 sales/month — that's a 2-year wait. So we never test.
            <br /><br />
            The solution: a Bayesian inference engine that models each price&apos;s conversion rate as a Beta distribution. Each sale (or non-sale) updates the posterior. You get a confidence score in weeks, not months.
            <br /><br />
            Flow: connect Stripe/Gumroad → engine suggests 2–3 prices → get a live A/B page → confidence dashboard → apply winner or rollback.
            <br /><br />
            Free tier, open to feedback on the Bayesian approach.
          </p>
        </div>
      </section>

      <div style={{ padding: '1.25rem', background: '#f5f3ff', borderRadius: 12, textAlign: 'center', borderLeft: '4px solid #4f46e5' }}>
        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>All submissions link to the self-serve product</p>
        <a href={APP_URL} style={{ color: '#4f46e5', fontWeight: 700 }}>{APP_URL}</a>
        <span style={{ color: '#9ca3af', margin: '0 0.75rem' }}>·</span>
        <a href={`${APP_URL}/press`} style={{ color: '#4f46e5' }}>press kit</a>
        <span style={{ color: '#9ca3af', margin: '0 0.75rem' }}>·</span>
        <a href={`${APP_URL}/pricing`} style={{ color: '#4f46e5' }}>pricing</a>
      </div>
    </main>
  )
}
