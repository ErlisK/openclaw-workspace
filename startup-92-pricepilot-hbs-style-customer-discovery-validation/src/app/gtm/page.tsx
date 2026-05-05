import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Outreach Templates — PricingSim',
  description: 'Cold DM and forum reply templates for solo founders doing pricing outreach on Indie Hackers, Reddit, and X.',
  robots: 'noindex',
}

const templates = [
  {
    id: 'ih-x-dm',
    label: 'Indie Hacker / Micro-SaaS Founder (X DM or Email)',
    subject: 'Free pricing simulation for [their product name]',
    body: `Hey [Name] — I've been following your build-in-public updates and noticed you recently [mentioned pricing / crossed $X MRR / asked about raising prices].

I'm building PricingSim — it takes your Stripe transaction history and runs a Bayesian simulation to show the safest price increase your data supports, with a projected revenue lift and a one-click rollback if it doesn't work.

I'd love to run a free simulation on [product name] and share the output with you — no strings, just want to see if the tool produces something useful for a real product. Would that be interesting?

— [Your name]`,
    why: 'Specific to them, gives before it asks, removes risk, invites a low-commitment yes.',
    icon: '🐦',
  },
  {
    id: 'reddit-reply',
    label: 'Reddit / Indie Hackers Forum Reply (in a pricing thread)',
    subject: 'Use when: someone posts "I think I\'m underpriced but scared to raise — what do I do?"',
    body: `This exact situation is why I'm building PricingSim. The fear is rational — a blind price raise can hurt, but so is leaving money on the table for years.

What I've found works: run a Bayesian elasticity model on your existing transactions. Even with 50–100 data points you can get a directional read on what price your buyers would accept without significant churn. The confidence interval is wide, but it's better than guessing.

Happy to run a free simulation on your data if you want to share a Stripe CSV export (anonymized if you prefer). DM me or check out pricingsim.com — it does this automatically.`,
    why: 'Adds genuine value to the thread first; the CTA is soft and contextual.',
    icon: '💬',
  },
  {
    id: 'newsletter-pitch',
    label: 'Newsletter / Podcast Pitch (to Arvid Kahl or similar)',
    subject: 'Collab idea — live pricing audit for your audience',
    body: `Hi Arvid — longtime reader of The Bootstrapped Founder. I'm building PricingSim, a tool that runs Bayesian pricing simulations on Stripe/Gumroad data for solo founders who are nervous about raising prices.

I'd love to propose a collab: I run a live, unedited pricing audit on a volunteer from your community — we publish the output (what the data says, what the simulation recommends, what they actually decide to do). It'd make for a concrete, data-driven piece that's different from the usual "just raise your prices" advice.

No payment needed — just honest coverage if it produces something worth sharing. Interested?

— [Your name]`,
    why: 'Provides content value to the creator, creates a case study for PricingSim, and reaches exactly the right audience.',
    icon: '📧',
  },
  {
    id: 'show-ih',
    label: 'Indie Hackers "Show IH" Post',
    subject: 'Show IH: I built a Bayesian pricing engine for solo founders — free audit inside',
    body: `Hey IH 👋

I'm building PricingSim — a tool that takes your Stripe/Gumroad CSV, runs a Bayesian elasticity analysis, and tells you the safest price increase your data supports (with a confidence score and projected revenue lift).

The problem I kept seeing: solo founders set prices arbitrarily at launch, suspect they're underpriced, but won't touch them because they're scared of churn. There's no good way to test safely with small transaction volumes.

PricingSim uses a Normal-InvGamma conjugate prior (elasticity ε ~ N(-1.0, 0.5²)) that performs decently even with 30–100 data points. It's conservative by design — the rule is maximize E[R] subject to p05(R) >= 95% of current revenue.

**Free audit offer:** Drop your CSV at [link] — no account, no email, results in 30 seconds. Happy to run a manual analysis for anyone who wants to discuss their specific situation.

Would love feedback: does the output feel trustworthy, or does it feel like a black box?`,
    why: 'Technical enough to earn HN/IH credibility. Free audit hook removes friction. Ends with a genuine question to drive comments.',
    icon: '🚀',
  },
]

const targets = [
  { name: 'Arvid Kahl', handle: '@arvidkahl', why: 'Author of Zero to Sold, runs The Bootstrapped Founder (~25k subs). Audience is exactly micro-SaaS founders obsessing over pricing.', reach: 'X DM + Newsletter pitch (Template 3)', priority: 'High' },
  { name: 'Marc Louvion', handle: '@marc_louvion', why: 'Built 12+ micro-SaaS products. Frequently posts about revenue optimization and pricing.', reach: 'X DM — offer a live simulation on one of his products as a public case study', priority: 'High' },
  { name: 'Tony Dinh', handle: '@tdinh_me', why: 'BlackMagic.so, Xnapper, multiple indie tools. Has openly discussed pricing experiments and MRR.', reach: 'X DM or Product Hunt message', priority: 'High' },
  { name: 'Danny Postma', handle: '@dannypostma', why: 'Headshots AI, multiple digital products. Openly discusses revenue.', reach: 'X DM — offer free audit of one product', priority: 'Medium' },
  { name: 'Pat Walls', handle: '@thepatwalls', why: 'Starter Story — editorial potential + audience fit.', reach: 'X DM — pitch a "pricing teardown" story', priority: 'Medium' },
]

const communities = [
  { name: 'Indie Hackers Forum', url: 'https://indiehackers.com', approach: 'Post "Show IH" with free audit CTA. Reply helpfully in existing pricing threads.' },
  { name: 'r/SaaS', url: 'https://reddit.com/r/SaaS', approach: 'Reply to pricing pain threads. Use Template 2.' },
  { name: 'r/SideProject', url: 'https://reddit.com/r/SideProject', approach: 'Comment on launch posts offering a free pricing review.' },
  { name: 'Lemon Squeezy Discord', url: 'https://discord.gg/lemonsqueezy', approach: 'Join #pricing or #feedback channel. Offer free audits to 3–5 members.' },
  { name: 'Gumroad Creators (Facebook)', url: 'https://facebook.com/groups/gumroadcreators', approach: 'Post a help thread: how I would price your Gumroad product.' },
  { name: 'WIP.co', url: 'https://wip.co', approach: 'Post a maker update. Offer free audits to community members.' },
]

export default function OutreachTemplatesPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <nav style={{ borderBottom: '1px solid #e5e7eb', background: '#fff', padding: '0 1rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <Link href="/" style={{ textDecoration: 'none', color: '#111827', fontWeight: 700 }}>← PricingSim</Link>
          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Sales Outreach Playbook</span>
        </div>
      </nav>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1rem 5rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.75rem' }}>Sales Outreach Playbook</h1>
          <p style={{ color: '#6b7280', fontSize: '1rem', maxWidth: 600, lineHeight: 1.6 }}>
            The fastest path to the first 10 customers is direct DM outreach to founders publicly discussing pricing pain, combined with a sharp "free audit" hook. Use these templates and target lists.
          </p>
        </div>

        {/* Free Audit CTA */}
        <div style={{ background: 'linear-gradient(135deg, #6c47ff, #9333ea)', borderRadius: '0.875rem', padding: '1.5rem', marginBottom: '2.5rem', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.25rem' }}>Your main CTA: The Free Pricing Audit</h2>
            <p style={{ opacity: 0.85, fontSize: '0.9rem' }}>Link to this in every DM and forum reply. No signup required — results in 30 seconds.</p>
          </div>
          <Link href="/free-audit" style={{ background: '#fff', color: '#6c47ff', padding: '0.75rem 1.5rem', borderRadius: 8, textDecoration: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}>
            /free-audit →
          </Link>
        </div>

        {/* Templates */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.5rem' }}>Cold Outreach Templates</h2>
          {templates.map(t => (
            <div key={t.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.875rem', padding: '1.5rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{t.icon}</span>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>{t.label}</h3>
                  <p style={{ color: '#6b7280', fontSize: '0.8rem' }}>Subject / context: {t.subject}</p>
                </div>
              </div>
              <pre style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', fontSize: '0.85rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: '#374151', marginBottom: '0.75rem' }}>
                {t.body}
              </pre>
              <div style={{ background: '#fef9c3', borderRadius: '0.375rem', padding: '0.5rem 0.875rem' }}>
                <p style={{ fontSize: '0.8rem', color: '#854d0e' }}>💡 Why it works: {t.why}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Target Individuals */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.5rem' }}>Priority Individuals to Contact</h2>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.875rem', overflow: 'hidden' }}>
            {targets.map((t, i) => (
              <div key={t.name} style={{ padding: '1.25rem', borderBottom: i < targets.length - 1 ? '1px solid #f3f4f6' : 'none', display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <p style={{ fontWeight: 700, marginBottom: '0.1rem' }}>{t.name} <span style={{ color: '#6c47ff', fontSize: '0.85rem' }}>{t.handle}</span></p>
                  <p style={{ color: '#6b7280', fontSize: '0.8rem' }}>{t.why}</p>
                </div>
                <div style={{ flex: '2 1 280px' }}>
                  <p style={{ color: '#374151', fontSize: '0.85rem', marginBottom: '0.3rem' }}><strong>How to reach:</strong> {t.reach}</p>
                  <span style={{ background: t.priority === 'High' ? '#dcfce7' : '#fef9c3', color: t.priority === 'High' ? '#166534' : '#854d0e', padding: '0.15rem 0.5rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600 }}>
                    {t.priority} priority
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Communities */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.5rem' }}>Communities & Channels</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {communities.map(c => (
              <div key={c.name} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem' }}>
                <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                  <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: '#6c47ff', textDecoration: 'none' }}>{c.name} ↗</a>
                </p>
                <p style={{ color: '#6b7280', fontSize: '0.85rem', lineHeight: 1.6 }}>{c.approach}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Prioritized Action Plan */}
        <section>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.5rem' }}>10-Step Action Plan to First 10 Customers</h2>
          {[
            { n: 1, action: 'Post a "Show IH" on Indie Hackers with a free pricing audit CTA and a demo simulation', roi: 'HIGH', effort: 'Low', icon: '🚀' },
            { n: 2, action: 'Identify 10–15 founders on X who recently posted about pricing confusion — send Template 1 DMs', roi: 'HIGH', effort: 'Low–Medium', icon: '🐦' },
            { n: 3, action: 'Reply to 5 active pricing threads on r/SaaS and r/Entrepreneur using Template 2', roi: 'MEDIUM-HIGH', effort: 'Low', icon: '💬' },
            { n: 4, action: 'Link /free-audit in every DM and post — no signup, 30-second results, removes all friction', roi: 'HIGH', effort: 'Done ✅', icon: '🎯' },
            { n: 5, action: 'Reach out to Arvid Kahl and 2–3 other micro-SaaS newsletter operators with Template 3', roi: 'HIGH', effort: 'Low', icon: '📧' },
            { n: 6, action: 'Set up $200 Reddit Ads test targeting r/SaaS and r/Entrepreneur', roi: 'MEDIUM', effort: 'Low–Medium', icon: '📣' },
            { n: 7, action: 'Join Lemon Squeezy Discord and Gumroad Creators Facebook group — offer free audits', roi: 'MEDIUM', effort: 'Low', icon: '🤝' },
            { n: 8, action: 'Create a 3-tweet thread showing a real before/after pricing simulation', roi: 'MEDIUM-HIGH', effort: 'Low–Medium', icon: '🧵' },
            { n: 9, action: 'Pitch MicroConf for a lightning talk on "safe pricing experiments for sub-$10k MRR"', roi: 'HIGH if accepted', effort: 'Low', icon: '🎤' },
            { n: 10, action: 'Contact Gumroad and Lemon Squeezy about a "Featured Tool" listing or API partnership', roi: 'MEDIUM', effort: 'Medium', icon: '🤝' },
          ].map(item => (
            <div key={item.n} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '0.75rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ background: '#ede9fe', color: '#6c47ff', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
                {item.n}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, color: '#111827', marginBottom: '0.2rem', fontSize: '0.9rem' }}>{item.icon} {item.action}</p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <span style={{ background: item.roi.includes('HIGH') ? '#dcfce7' : '#fef9c3', color: item.roi.includes('HIGH') ? '#166534' : '#854d0e', padding: '0.1rem 0.5rem', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700 }}>
                    ROI: {item.roi}
                  </span>
                  <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '0.1rem 0.5rem', borderRadius: 10, fontSize: '0.7rem' }}>
                    Effort: {item.effort}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
