import Link from 'next/link'
import { Metadata } from 'next'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata: Metadata = {
  title: 'Cold Outreach Templates for Indie Founders — PricingSim',
  description: 'Proven DM and email templates for reaching out to potential beta users for your digital product or micro-SaaS. Built for solo founders doing $500–$10k MRR.',
}

const templates = [
  {
    id: 'twitter-template-seller',
    label: 'X/Twitter DM — Template Seller',
    target: 'Gumroad/Figma/Notion template creators with visible MRR',
    subject: 'Quick question about your pricing',
    body: `Hey [Name] — love what you're building with [product]. Quick question: have you ever tested a price change, or is it still the launch price?

I built PricingSim (pricingsim.com) — you upload your Gumroad CSV, and it tells you if your data supports a price increase, with a one-click rollback if it doesn't pan out.

Would love to give you free access in exchange for honest feedback. No pitch, just want to see if it's useful for someone in your exact situation. Interested?

— [Your name]`,
  },
  {
    id: 'ih-forum',
    label: 'IndieHackers DM / Forum Reply',
    target: 'Founders posting "how do I know if I should raise prices?" threads',
    subject: null,
    body: `Hey [Name], just saw your post — this is exactly the problem I've been trying to solve.

I built PricingSim for this: you connect Stripe or upload a CSV, and it runs a Bayesian simulation on your actual transaction data to find the highest price your data supports — with a confidence score and a one-click rollback if conversion drops.

If you want to try it free (no card, no commitment), just reply here or DM me. Happy to walk you through it on a 20-min call too if that's helpful.`,
  },
  {
    id: 'cold-email-saas',
    label: 'Cold Email — Micro-SaaS Founder',
    target: 'Stripe users at $2k–$8k MRR, found via IndieHackers or public revenue threads',
    subject: 'Quick tool for Stripe pricing experiments — free for you to try',
    body: `Hi [Name],

I've been following [their product] on Indie Hackers — congrats on reaching [$X MRR], that's a real milestone.

I'm building PricingSim (pricingsim.com) — it connects to Stripe and uses a Bayesian elasticity model to tell you if your pricing data supports a price increase, and ships a live A/B experiment page with one-click rollback. Built specifically for solo founders at your stage who don't have time to build this themselves.

Would love to give you free access in exchange for 15 minutes of honest feedback. Worth a look?

Best,
[Your Name]
hello@pricingsim.com | pricingsim.com`,
  },
]

const communities = [
  { name: 'r/SaaS', url: 'https://reddit.com/r/SaaS', tip: 'Post "how I validated pricing" case study; comment on pricing threads — add value first, link only when asked.' },
  { name: 'IndieHackers.com', url: 'https://indiehackers.com', tip: 'Post a build-in-public story; answer every comment; IH posts rank on Google.' },
  { name: 'r/Gumroad', url: 'https://reddit.com/r/Gumroad', tip: 'Offer free beta access on relevant threads. Exact niche audience.' },
  { name: '#buildinpublic on X/Twitter', url: 'https://twitter.com/search?q=%23buildinpublic', tip: 'Thread replies sharing case studies and real Bayesian output screenshots.' },
  { name: 'WIP.co', url: 'https://wip.co', tip: 'Makers tracking daily progress; post product updates, offer beta.' },
  { name: 'MicroConf Community', url: 'https://community.microconf.com', tip: 'Serious micro-SaaS founders. Post in "tools & resources" section.' },
]

export default function ColdOutreachPage() {
  return (
    <div>
      <nav className="nav">
        <div className="container nav-inner">
          <Link href="/" className="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <img src="/assets/logo-icon.svg" alt="PricingSim" width={32} height={32} style={{ borderRadius: 8 }} />
            PricingSim
          </Link>
          <div className="nav-links">
            <Link href="/free-audit">Free Audit</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/login">Sign in</Link>
            <Link href="/signup" className="btn btn-primary btn-sm">Start free</Link>
          </div>
        </div>
      </nav>

      <main className="container" style={{ paddingTop: '5rem', paddingBottom: '5rem', maxWidth: 800 }}>
        <div style={{ marginBottom: '1rem' }}>
          <Link href="/" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.9rem' }}>← PricingSim</Link>
        </div>

        <span className="badge badge-purple" style={{ marginBottom: '1rem' }}>For solo founders · beta outreach</span>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 900, marginBottom: '0.5rem', lineHeight: 1.1 }}>Cold Outreach Templates</h1>
        <p style={{ color: '#6b7280', fontSize: '1.1rem', marginBottom: '3rem', maxWidth: 580 }}>
          Copy-paste DM and email templates for finding your first 10 beta users.
          Built for indie founders who sell digital products at $500–$10k MRR.
        </p>

        {/* Templates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '4rem' }}>
          {templates.map(t => (
            <div key={t.id} className="card" style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '0.75rem', color: '#6c47ff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>{t.label}</p>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                <strong>Best for:</strong> {t.target}
              </p>
              {t.subject && (
                <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  <strong>Subject:</strong> <span style={{ color: '#374151' }}>{t.subject}</span>
                </p>
              )}
              <pre style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '1rem',
                fontSize: '0.85rem',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                color: '#374151',
                fontFamily: 'inherit',
                margin: 0,
              }}>{t.body}</pre>
            </div>
          ))}
        </div>

        {/* Communities */}
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: '#111827' }}>Where to find warm leads</h2>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Add value first. Drop your product link only when contextually appropriate or when someone asks.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '4rem' }}>
          {communities.map(c => (
            <div key={c.name} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.875rem 1rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: '#6c47ff', minWidth: 180, textDecoration: 'none', fontSize: '0.9rem' }}>{c.name}</a>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>{c.tip}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center' }}>
          <h3 style={{ fontWeight: 800, marginBottom: '0.5rem', color: '#111827' }}>Ready to test your own pricing?</h3>
          <p style={{ color: '#6b7280', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            Upload a Gumroad CSV and get a Bayesian price recommendation in 60 seconds. Free, no credit card.
          </p>
          <Link href="/free-audit" className="btn btn-primary" style={{ marginRight: '0.75rem', padding: '0.75rem 1.5rem' }}>
            🎯 Free pricing audit
          </Link>
          <Link href="/signup" className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>
            Start free →
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
