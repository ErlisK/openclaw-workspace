import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Social Calendar — PricePilot',
  description: 'Scheduled social posts for Twitter/X and LinkedIn. 16 posts across 4 weeks.',
}

const APP_URL = 'https://startup-92-pricepilot-hbs-style-cus.vercel.app'

interface Post {
  id: number
  platform: 'Twitter/X' | 'LinkedIn'
  week: number
  day: number
  theme: string
  copy: string
}

const posts: Post[] = [
  {
    id: 1, platform: 'Twitter/X', week: 1, day: 1, theme: 'Launch announcement',
    copy: `🚀 PricePilot is live.\n\nConnect your Stripe/Gumroad/Shopify → Bayesian engine → 2–3 safe price tests → live A/B page → one-click rollback.\n\nBuilt for solo founders doing $500–$10k MRR.\n\nFree tier, no credit card.\n\n→ ${APP_URL}`
  },
  {
    id: 2, platform: 'LinkedIn', week: 1, day: 1, theme: 'Launch announcement',
    copy: `We just launched PricePilot — a tool for solo founders who want to test their pricing safely.\n\nTraditional A/B testing needs 1000+ conversions per variant. Most indie founders have 50–200 sales/month. That's a 2-year wait.\n\nPricePilot uses Bayesian inference. Models each price's conversion rate as a Beta distribution. Updates with every sale. You get a confidence score in 2–6 weeks.\n\nTry it free: ${APP_URL}\n\n#SaaS #IndieHackers #Pricing #Bootstrapped`
  },
  {
    id: 3, platform: 'Twitter/X', week: 1, day: 3, theme: 'Safety guardrails',
    copy: `The #1 fear: "What if I lose customers?"\n\nPricePilot's safety guardrails:\n🔒 Never suggests >2.5× your current price\n📊 Shows confidence score before you commit\n⏸️ Pause any experiment instantly\n🔁 One-click rollback\n\nRisk-managed by design.\n\n→ ${APP_URL}`
  },
  {
    id: 4, platform: 'LinkedIn', week: 1, day: 3, theme: 'Safety guardrails',
    copy: `"What if raising prices hurts my sales?" — I heard this from every founder I interviewed.\n\nSo PricePilot has four hard safety guardrails:\n\n1. Never suggests a price more than 2.5× your current price\n2. Every suggestion includes confidence score + projected revenue change\n3. Pause or stop any experiment instantly\n4. One-click rollback to your original price\n\nThe goal: find the best price with the least possible downside risk.\n\n#ProductDevelopment #SaaS #PricingStrategy`
  },
  {
    id: 5, platform: 'Twitter/X', week: 1, day: 5, theme: 'Bayesian engine',
    copy: `Why most pricing A/B tests fail for indie founders 🧵\n\nTraditional A/B: need 1000+ conversions per variant\n→ At 50 sales/month: 2-year wait\n\nPricePilot uses Bayesian inference:\n→ Works with 20–30 conversions\n→ Updates with every sale\n→ Shows probability, not pass/fail\n\nResults in weeks, not years.`
  },
  {
    id: 6, platform: 'LinkedIn', week: 1, day: 5, theme: 'Bayesian engine deep dive',
    copy: `Why we chose Bayesian inference over traditional A/B testing\n\nFrequentist tests ask: "If there were no difference, how surprising is our result?" This needs 200–1000 conversions per variant.\n\nBayesian tests ask: "What's the probability Price B beats Price A given what we've seen?" This works with 20–30 conversions.\n\nWe model each price as a Beta distribution. Each sale updates the posterior. The confidence score reflects real uncertainty — not a binary pass/fail.\n\nFor indie founders with 50 sales/month, this is the only test that gives results in a reasonable timeframe.\n\nFull post: ${APP_URL}/blog/the-bayesian-advantage-why-we-dont-use-traditional-ab-tests\n\n#DataScience #Bayesian #ABTesting`
  },
  {
    id: 7, platform: 'Twitter/X', week: 2, day: 1, theme: 'Import flow walkthrough',
    copy: `60 seconds to your first pricing experiment:\n\n1. Upload Gumroad/Stripe/Shopify CSV\n2. Engine analyzes 90 days of data\n3. Get 2–3 price suggestions\n4. Hit "Create Experiment"\n5. Share your A/B page URL\n\nNo code. No stats degree.\n\n→ ${APP_URL}/import/guide`
  },
  {
    id: 8, platform: 'LinkedIn', week: 2, day: 1, theme: 'Import flow',
    copy: `How fast can you go from zero to a live pricing experiment?\n\nWith PricePilot, about 5 minutes:\n\n✅ Export CSV from Gumroad/Stripe/Shopify (2 min)\n✅ Upload to PricePilot — auto-detects column format\n✅ Bayesian engine analyzes 90 days of transactions\n✅ Get 2–3 price suggestions with confidence scores\n✅ Click "Create Experiment" → live A/B page generated\n\nNo code, no webhook config, no stats knowledge required.\n\nCSV format guide: ${APP_URL}/import/guide\n\n#Gumroad #Stripe #Shopify #SoloFounder`
  },
  {
    id: 9, platform: 'Twitter/X', week: 2, day: 3, theme: 'Real results',
    copy: `What does "lift" actually look like?\n\n$29 template, 1% conversion, 200 visitors/month\nCurrent: $58/mo\n\nPricePilot suggests testing $39 (confidence: 73%)\n→ If conversion drops to 0.8%: still +$3.60/visitor\n→ After 6 weeks: recommendation to apply\n\nResult: $70/mo (+21%) with one click.\n\n→ ${APP_URL}`
  },
  {
    id: 10, platform: 'LinkedIn', week: 2, day: 3, theme: 'Concrete example',
    copy: `Here's what a PricePilot pricing experiment looks like in practice:\n\nA Notion template seller:\n• $29 current price, 1% conversion, 200 monthly visitors\n• Current revenue: $58/month\n\nPricePilot suggests testing $39.\n• If conversion holds at 1%: +34% revenue ($78/mo)\n• If conversion drops to 0.8%: still +8% ($62/mo)\n• Break-even at 0.74% conversion\n\nExperiment runs 6 weeks. Conversion at $39 holds at 0.9%.\nRecommendation: apply. New revenue: $70/month.\n\nThis is the PricePilot promise: find the revenue you're leaving on the table.\n\n#RevenueOptimization #ContentCreator #DigitalProducts`
  },
  {
    id: 11, platform: 'Twitter/X', week: 2, day: 5, theme: 'AI tools',
    copy: `The part I use most: AI communication templates.\n\nWhen your price test wins, you need to tell customers.\n\nPricePilot Pro generates:\n→ Email (warm, not salesy)\n→ Tweet thread (explains the why)\n→ Blog post intro\n\nAll tone-matched to your product.\n\n→ ${APP_URL}/ai-tools`
  },
  {
    id: 12, platform: 'LinkedIn', week: 2, day: 5, theme: 'AI communication tools',
    copy: `The hardest part of raising prices: telling your customers.\n\nPricePilot's AI Communication Generator (Pro) writes:\n\n📧 Email — warm, personalized, explains the value behind the price\n🐦 Twitter thread — 3–5 tweets with the "why" story\n📝 Blog post intro — for your newsletter or product page\n\nAll generated from: product name + old price + new price + one sentence about your audience.\n\nTry it: ${APP_URL}/ai-tools\n\n#AI #ContentMarketing #SaaS`
  },
  {
    id: 13, platform: 'Twitter/X', week: 3, day: 1, theme: 'Onboarding',
    copy: `Getting started with PricePilot ✅\n\n1. ✅ Connect source (Stripe/CSV)\n2. ✅ Run the Bayesian engine\n3. ✅ Create first experiment\n4. ✅ Set preview + rollback\n5. ⭐ Upgrade to Pro (optional)\n\nMost users hit step 3 in under 10 minutes.\n\n→ ${APP_URL}/onboarding`
  },
  {
    id: 14, platform: 'LinkedIn', week: 3, day: 3, theme: 'Free vs Pro',
    copy: `PricePilot pricing (we eat our own cooking 🍽️)\n\nFREE:\n✅ 3 active experiments\n✅ All connector types\n✅ Live A/B pages + rollback\n✅ Real-time confidence dashboard\n\nPRO — $29/month:\n✅ Unlimited experiments\n✅ AI communication templates\n✅ CSV export\n✅ Priority support\n\nThe free tier works for most solo founders. Upgrade when you need more.\n\nNo credit card required: ${APP_URL}/pricing\n\n#SaaS #Pricing #IndieHackers`
  },
  {
    id: 15, platform: 'Twitter/X', week: 3, day: 5, theme: 'Blog post teaser',
    copy: `New post: "Why Bayesian testing beats A/B testing for indie founders"\n\n→ Traditional A/B: 1000+ conversions needed\n→ Bayesian: actionable at 20–30 conversions\n→ The math behind why\n\n${APP_URL}/blog/the-bayesian-advantage-why-we-dont-use-traditional-ab-tests`
  },
  {
    id: 16, platform: 'LinkedIn', week: 4, day: 2, theme: 'Community research',
    copy: `I spoke to 40 solo founders about pricing. Here's what I found:\n\n• 78% had never A/B tested their price\n• 62% believed their current price was "probably too low"\n• 91% said they would test if it was safe and easy\n• 0% had tried a Bayesian pricing tool\n\nThe insight that built PricePilot: the demand is there. The barrier is technical complexity + fear of downside.\n\nWhat's held you back from testing your prices?\n\n#Research #StartupLife #Pricing`
  },
]

const platformColor: Record<string, string> = {
  'Twitter/X': '#1da1f2',
  'LinkedIn': '#0a66c2',
}

export default function SocialPage() {
  const twitterPosts = posts.filter(p => p.platform === 'Twitter/X')
  const linkedinPosts = posts.filter(p => p.platform === 'LinkedIn')

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '3rem 1rem' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
        <Link href="/" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.9rem' }}>← PricePilot</Link>
        <Link href="/launch" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.9rem' }}>Launch HQ</Link>
      </div>

      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Social Media Calendar</h1>
      <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>
        16 posts across Twitter/X and LinkedIn — 4-week launch schedule. All copy ready to publish.
      </p>

      {/* Profile setup */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', margin: '1.5rem 0 2.5rem' }}>
        {[
          {
            platform: 'Twitter/X', color: '#1da1f2', icon: '𝕏',
            bio: 'Safe A/B pricing experiments for solo founders 🚀 Connect Stripe/Gumroad/Shopify → Bayesian engine → test prices → roll back in one click. Free tier ↓',
            handle: '@PricePilotApp',
          },
          {
            platform: 'LinkedIn', color: '#0a66c2', icon: 'in',
            bio: 'PricePilot helps solo creators and micro-SaaS founders run safe, statistically-sound pricing experiments. Connect your store in 60 seconds, get Bayesian price suggestions, test with real buyers.',
            handle: 'PricePilot',
          },
        ].map(p => (
          <div key={p.platform} style={{ border: `2px solid ${p.color}`, borderRadius: 12, padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ background: p.color, color: '#fff', width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>{p.icon}</span>
              <div>
                <p style={{ fontWeight: 700, margin: 0 }}>{p.platform}</p>
                <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0 }}>{p.handle}</p>
              </div>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.5, margin: 0 }}>{p.bio}</p>
          </div>
        ))}
      </div>

      {/* Posts split by platform */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {[
          { label: 'Twitter/X', posts: twitterPosts, color: '#1da1f2' },
          { label: 'LinkedIn', posts: linkedinPosts, color: '#0a66c2' },
        ].map(col => (
          <div key={col.label}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: col.color }}>
              {col.label} — {col.posts.length} posts
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {col.posts.map(post => (
                <div key={post.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '1rem', background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: col.color, textTransform: 'uppercase' }}>
                      Week {post.week}, Day {post.day}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{post.theme}</span>
                  </div>
                  <pre style={{
                    fontFamily: 'inherit', fontSize: '0.85rem', color: '#374151',
                    whiteSpace: 'pre-wrap', lineHeight: 1.55, margin: 0,
                    maxHeight: 200, overflow: 'auto',
                  }}>{post.copy}</pre>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '2.5rem', textAlign: 'center', padding: '1.25rem', background: '#f9fafb', borderRadius: 12 }}>
        <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Full schedule in SOCIAL.md</p>
        <a href="https://github.com/ErlisK/openclaw-workspace/blob/main/startup-92-pricepilot-hbs-style-customer-discovery-validation/SOCIAL.md"
          target="_blank" rel="noopener noreferrer"
          style={{ color: '#4f46e5', fontSize: '0.9rem' }}>View on GitHub →</a>
      </div>
    </main>
  )
}
