import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'

const BASE_URL = 'https://pricingsim.com'

interface Guide {
  title: string
  description: string
  date: string
  readTime: string
  keywords: string[]
  content: string
}

const guides: Record<string, Guide> = {
  'micro-seller-pricing-experiments': {
    title: "The Solo Seller's Complete Guide to Pricing Experiments",
    description: 'Why pricing experiments matter for $500–$10k MRR sellers, how Bayesian testing works with small data, and how to run your first safe price test in under an hour.',
    date: '2025-03-01',
    readTime: '9 min read',
    keywords: ['pricing experiments', 'solo seller', 'micro-SaaS pricing', 'Bayesian A/B testing', 'price elasticity'],
    content: `
<p>If you sell digital products, templates, courses, or a micro-SaaS tool, you've probably wondered: <strong>am I charging the right amount?</strong> Almost every indie founder I've talked to believes they're undercharging — and most are right. But the fear of raising prices and losing customers keeps them stuck at whatever price they picked on launch day.</p>

<p>This guide is about how to stop guessing and start testing. Specifically: how to run a safe, reversible pricing experiment that gives you real data about what your customers will pay — without risking the revenue you already have.</p>

<h2>Why Pricing Experiments Matter at $500–$10k MRR</h2>

<p>At $500 MRR, a 30% price increase means $150 more per month. At $5,000 MRR, it means $1,500. These aren't life-changing numbers on their own, but they compound. And price is the one lever that improves margin without increasing your workload.</p>

<p>Unlike adding features (which takes weeks), running a content campaign (which takes months), or reducing churn (which is structurally hard), a pricing experiment takes a few hours to set up and delivers a result within 4–8 weeks. For a solo founder, that time-to-insight ratio is unbeatable.</p>

<p>The challenge is that most pricing advice assumes you're a large company with a dedicated data team. "Test prices" is easy to say. Doing it safely with 50–200 sales per month is harder. That's what this guide addresses.</p>

<h2>The Fear of Losing Customers — and Why It's Overblown</h2>

<p>The most common objection to running a price test is: "What if people stop buying?" It's a legitimate concern. But it assumes that your current conversion rate is fragile — that it will collapse the moment you raise your price. That's rarely true.</p>

<p>Consider what's actually happening when someone buys your product. They've already found it (traffic), they've already decided they want it (interest), and they've already started the checkout process (intent). The question at the payment step is whether the price is below their willingness to pay. For most buyers of digital products, templates, or software, the difference between $29 and $39 is not the deciding factor.</p>

<p>Research on price sensitivity consistently shows that conversion rates are more elastic at low price points (e.g., $10 vs $15) and less elastic at higher ones (e.g., $97 vs $127). Most indie founders price too low because they're anchoring to competitors or to their own perceived value — not to what customers actually demonstrate willingness to pay.</p>

<p>A pricing experiment doesn't answer "what's the highest price I could charge?" It answers "is my revenue higher at Price A or Price B?" That's a much safer question, and one that data can actually answer.</p>

<h2>Frequentist vs. Bayesian Testing: Why the Difference Matters for Small Sellers</h2>

<p>Traditional A/B testing — the kind used by large tech companies — is frequentist. You set a sample size in advance, you run the test until you hit it, and then you apply a statistical significance test (usually p &lt; 0.05). This approach works well with thousands of daily conversions, but it breaks down at low volumes.</p>

<p>Here's why: a frequentist test with 80% power and 5% significance level requires about 400–1,000 conversions per variant to detect a 10% difference in conversion rates. If you have 50 sales per month, that's 8–20 months of waiting. By then, your product, your market, and your competition have all changed.</p>

<p>Bayesian testing answers a different question: <em>given the data collected so far, what is the probability that Price B generates more revenue than Price A?</em> This probability updates continuously as each sale comes in. After 30–60 conversions per variant, you often have a clear signal — even without reaching the sample sizes frequentist methods require.</p>

<p>The tradeoff: Bayesian estimates have wider uncertainty bands at small sample sizes, and early results can be misleading. A good Bayesian pricing tool (like PricingSim) accounts for this by being conservative: it only recommends applying a test result when confidence is high, and it shows you the full probability distribution — not just the point estimate.</p>

<h2>What Makes a Safe Pricing Experiment</h2>

<p>A safe pricing experiment has five properties:</p>

<h3>1. Small scope</h3>
<p>Only a fraction of your visitors see the test price. This limits your downside if the new price converts poorly. A 50/50 split is standard, but for products with very low traffic, you might use a 70/30 split in favor of the known-good price.</p>

<h3>2. A clear success metric</h3>
<p>For most indie product sellers, the metric is <strong>revenue per visitor</strong> — not conversion rate alone. A price increase that drops conversion rate 10% but increases revenue per sale 40% is a win. Optimizing for conversion rate alone will push you toward the lowest possible price.</p>

<h3>3. A minimum run time</h3>
<p>Never call an experiment early because it looks good after a week. Early results are noisy. Most meaningful signals emerge after 3–6 weeks, depending on your traffic. Set a minimum run time before you look at results.</p>

<h3>4. A rollback mechanism</h3>
<p>If the test price performs worse, you need to be able to revert instantly. This means your experiment setup must not "lock in" the new price in a way that's hard to undo.</p>

<h3>5. A downside floor</h3>
<p>Define in advance what constitutes failure. For most solo founders, "failure" means revenue drops more than 5–10% below the current baseline. If your experiment hits this floor, stop it immediately.</p>

<h2>How to Set Up Your First Pricing Experiment</h2>

<h3>Step 1: Gather 90 days of transaction data</h3>
<p>Export your sales history from Stripe, Gumroad, or Shopify. You want at least 90 days of data, with transaction date, price, and quantity. This lets you estimate your current conversion rate and demand pattern.</p>

<h3>Step 2: Calculate your current revenue per visitor</h3>
<p>Divide your monthly revenue by your monthly visitors. This is your baseline metric. Everything gets measured against it.</p>

<h3>Step 3: Choose a test price</h3>
<p>Don't test more than one price at a time. Pick one candidate price, typically 20–40% above your current price. If your elasticity is near -1.0 (unit elastic), a 30% price increase with a 30% demand decrease leaves revenue flat — so your test price should be conservative enough that you expect positive revenue even if demand drops significantly.</p>

<h3>Step 4: Create the A/B page</h3>
<p>The test page shows your product at the new price. Half your visitors see the test, half see the control. PricingSim generates this page automatically — complete with tracking, variant assignment, and the rollback mechanism.</p>

<h3>Step 5: Let it run</h3>
<p>4–8 weeks, minimum. Check the confidence dashboard weekly but don't touch the experiment. The goal is data, not early optimization.</p>

<h3>Step 6: Apply or rollback</h3>
<p>When confidence reaches your threshold (typically 90–95%), apply the winner. If the test price underperforms your downside floor, roll back. If the test is inconclusive after 8 weeks, either run longer or accept that you need more data.</p>

<h2>Reading Confidence Scores</h2>

<p>A confidence score of 87% means: "given the data collected, there is an 87% probability that Price B generates higher revenue per visitor than Price A." It does <em>not</em> mean Price B is 87% better than Price A — it means the direction of the relationship is probably correct.</p>

<p>How to interpret common confidence levels:</p>
<ul>
  <li><strong>Below 70%:</strong> Inconclusive. Keep running.</li>
  <li><strong>70–80%:</strong> Directional signal but too uncertain to act on. Keep running.</li>
  <li><strong>80–90%:</strong> Meaningful evidence. You could apply if the experiment has been running 6+ weeks and the revenue uplift is significant.</li>
  <li><strong>90%+:</strong> Strong evidence. Apply the winner.</li>
  <li><strong>95%+:</strong> Very strong evidence. This is the "confident recommendation" threshold.</li>
</ul>

<h2>Common Mistakes in Pricing Experiments</h2>

<p><strong>Mistake 1: Testing during unusual periods.</strong> Don't run a pricing experiment during your biggest launch of the year, a holiday sale, or right after a major marketing push. Unusual traffic patterns pollute the results.</p>

<p><strong>Mistake 2: Not excluding promo cohorts.</strong> If you've run an AppSumo deal or a promotional discount campaign, those buyers are a different segment with different price sensitivity. Exclude them from your elasticity estimates or they'll drag your demand curve down artificially.</p>

<p><strong>Mistake 3: Looking at conversion rate instead of revenue.</strong> A price increase almost always lowers conversion rate. The question is whether revenue per visitor goes up. Always optimize for revenue.</p>

<p><strong>Mistake 4: Running multiple tests simultaneously.</strong> If you're testing two prices at once across different channels, you'll get confused results. One test at a time.</p>

<p><strong>Mistake 5: Not communicating the change.</strong> When your test succeeds and you apply the new price, tell your audience. A short email or tweet explaining why you raised prices — with an offer to lock in the old price for existing subscribers — turns a business decision into a marketing moment.</p>

<h2>Case Example: A Notion Template Seller</h2>

<p>Suppose you sell a Notion productivity template for $29. You have 200 monthly visitors and a 1% conversion rate — 2 sales per month, $58 revenue.</p>

<p>Your elasticity estimate from 6 months of data is ε = -0.9. You test $39 (34% increase). Predicted demand at -0.9 elasticity: 200 × (39/29)^(-0.9) ≈ 1.73 sales. Predicted revenue: $39 × 1.73 = $67.47. That's a 16% revenue increase.</p>

<p>But the 5th-percentile scenario (if elasticity is actually -1.5): 200 × (39/29)^(-1.5) ≈ 1.55 sales → $60.45. Still above your $58 baseline. The experiment passes the downside floor.</p>

<p>After 6 weeks, you see 1.8 sales per month at $39 → $70.20 revenue. Confidence is 92%. You apply the new price. Revenue is now $70/month instead of $58 — a 21% increase with no additional work.</p>

<h2>Tools for Running Safe Pricing Experiments</h2>

<p>PricingSim automates the entire workflow described above: data import, elasticity estimation, A/B page generation, confidence tracking, and one-click rollback. The free tier supports up to 3 simultaneous experiments and all major import formats.</p>

<p>The alternative is to do it manually: create two versions of your product page, split traffic with a Cloudflare Worker or Netlify redirect, and track conversions in a spreadsheet. This works but requires engineering and ongoing maintenance. For most solo founders, automation is worth it.</p>
    `,
  },

  'gumroad-pricing-updates-and-churn-risk': {
    title: 'How to Update Your Gumroad Price Without Losing Customers',
    description: "Gumroad's CSV export reveals who your price-sensitive buyers are. Here's how to use that data to raise prices safely and keep your best customers.",
    date: '2025-03-08',
    readTime: '8 min read',
    keywords: ['Gumroad pricing', 'price update', 'churn risk', 'digital products', 'pricing strategy'],
    content: `
<p>Gumroad is the platform of choice for thousands of indie creators, developers, and educators selling digital products. Its simplicity is its strength: list a product, set a price, share a link. But that same simplicity creates a blind spot around pricing. Most Gumroad sellers pick a price at launch and never change it — not because their product hasn't evolved, but because changing prices feels risky.</p>

<p>This guide shows you how to use Gumroad's own export data to make an informed, low-risk pricing decision. We'll cover what the data tells you, how to identify price-sensitive cohorts before you run a test, and how to communicate a price change to your audience without damaging trust.</p>

<h2>Understanding Gumroad's Pricing Model</h2>

<p>Gumroad charges a flat 10% fee per transaction (for free accounts) or a lower fee on paid plans. This means every pricing decision directly affects your net revenue, not just gross. A price increase that grows gross revenue by 20% grows your net revenue by the same amount — minus the fee, which stays proportional.</p>

<p>For subscriptions, Gumroad processes recurring charges at the price locked in at subscription time. If you raise your price today, existing subscribers continue paying their original price until you manually update them or they cancel and resubscribe. For one-time purchases (the most common Gumroad model), every new buyer pays the current price immediately.</p>

<p>This distinction matters for how you think about "churn risk." For one-time products, there's no ongoing subscriber base to worry about — only new buyer conversion. For subscription products, you have a segment of existing subscribers who will either stay, churn, or need to be migrated to the new price.</p>

<h2>What Your Gumroad CSV Export Reveals</h2>

<p>Every Gumroad account can export a CSV of all transactions. This file contains: purchase date, price paid, buyer email (hashed), product name, and whether the purchase was refunded. It's a goldmine of pricing data that most sellers never analyze.</p>

<h3>What to look for:</h3>

<p><strong>Price variance over time:</strong> If you've ever run a sale or offered discount codes, your CSV will show purchases at multiple price points. This is natural A/B test data — buyers who paid $19 vs buyers who paid $29 for the same product. The conversion rates at each price point are implicit in the data (purchases per time period × estimated traffic).</p>

<p><strong>Refund patterns by price:</strong> If higher-priced purchases have a higher refund rate, that's a signal that buyers feel the product doesn't justify the price. If refund rates are consistent across price points, that's a green light for testing higher prices.</p>

<p><strong>Purchase velocity over time:</strong> Are sales accelerating, stable, or declining? A declining trend might be due to market saturation, competition, or pricing. Understanding the trend helps you interpret the results of a price experiment correctly.</p>

<p><strong>Spike cohorts:</strong> Did you launch on ProductHunt, AppSumo, or a popular newsletter? Those periods show up as sales spikes in your CSV. Buyers from those channels are typically more price-sensitive (they're bargain-hunters or early adopters) and should be treated as a separate cohort when estimating your organic demand curve.</p>

<h2>Identifying Price-Sensitive Cohorts</h2>

<p>Not all your buyers are equally price-sensitive. A buyer who found your product through a Google search for a specific problem ("Notion template for project management") is much less price-sensitive than someone who bought during a 50% off promotion. The former has high intent; the latter was responding to a discount signal.</p>

<p>To identify cohorts in your Gumroad CSV:</p>

<ol>
  <li><strong>Group by acquisition period:</strong> Tag periods corresponding to launches, promotions, or viral moments (check your traffic data to match dates).</li>
  <li><strong>Compare refund rates:</strong> Promo cohorts typically have higher refund rates — another sign of lower product-market fit or price-value misalignment.</li>
  <li><strong>Calculate revenue per period:</strong> Your organic baseline revenue (excluding promo spikes) is the metric your pricing experiment should be measured against.</li>
</ol>

<p>PricingSim's import tool automatically detects spike cohorts using a Modified Absolute Deviation (MAD) filter and flags them. Your elasticity estimate is then calculated from organic sales only — the buyers whose behavior actually predicts how future organic buyers will respond to price changes.</p>

<h2>How Price Changes Affect Existing Subscribers</h2>

<p>For subscription products on Gumroad, raising your price requires a decision: do you grandfather existing subscribers at their current rate, or migrate them to the new price?</p>

<p><strong>Grandfathering (recommended):</strong> New subscribers pay the new price. Existing subscribers keep their current price forever (or until they cancel). This maximizes goodwill and minimizes churn from your best customers — the ones who've already demonstrated value alignment.</p>

<p><strong>Tiered migration:</strong> Existing subscribers get 30–60 days notice, and then automatically migrate to the new price. This is standard practice for SaaS but can generate churn if not communicated well.</p>

<p><strong>Opt-in migration:</strong> Email existing subscribers explaining the price change and offering them the option to "lock in" the old price for 12 months by prepaying. This turns a potential churn event into a cash flow positive moment.</p>

<p>For most Gumroad sellers, one-time products are more common than subscriptions. In that case, there's no churn risk from existing customers — only the question of whether the new price converts new buyers well enough.</p>

<h2>Testing a Higher Price Safely on Gumroad</h2>

<p>Gumroad doesn't have a built-in A/B testing feature, but you can approximate one with a few techniques:</p>

<h3>Method 1: Duplicate product + URL split</h3>
<p>Create a copy of your product at the new price. Use a simple redirect rule (Cloudflare Workers, Netlify redirect, or even a URL shortener that rotates destinations) to send 50% of traffic to each product page. Track sales on each product separately. After 6–8 weeks, compare revenue per visitor.</p>

<h3>Method 2: Time-series test</h3>
<p>Raise your price to the test price for 4–6 weeks, then revert and compare. This is less rigorous (seasonal variation can confound results) but requires zero engineering. It works best for products with stable, predictable traffic patterns.</p>

<h3>Method 3: PricingSim's A/B page</h3>
<p>Import your Gumroad CSV, let the Bayesian engine suggest test prices, and generate a hosted A/B experiment page that handles variant assignment, tracking, and rollback automatically. This is the fastest path from data to experiment to result.</p>

<h2>Communication Templates for Price Changes</h2>

<p>When you're ready to apply a price increase, communicate it proactively. Silence creates distrust; transparency builds it.</p>

<h3>Email to existing list:</h3>
<blockquote style="border-left: 3px solid #e5e7eb; padding-left: 1rem; color: #4b5563;">
  <p>Subject: Heads up: [Product Name] price is increasing on [Date]</p>
  <p>Hey [name],</p>
  <p>Quick heads up: [Product Name] is going from $[old price] to $[new price] on [date].</p>
  <p>If you've been on the fence, this is the best time to grab it at the current price: [link]</p>
  <p>Why the change? [One honest sentence: "The product has doubled in size since launch" / "I've added X, Y, Z features" / "To reflect the value it consistently delivers."]</p>
  <p>Thanks for being part of this.</p>
  <p>[Your name]</p>
</blockquote>

<h3>Tweet/social post:</h3>
<blockquote style="border-left: 3px solid #e5e7eb; padding-left: 1rem; color: #4b5563;">
  <p>[Product] price going up from $[X] to $[Y] on [date]. Grab it at the current price if you want: [link]. [One sentence of context if relevant.]</p>
</blockquote>

<p>Keep the communication simple and factual. Don't over-explain or apologize. A brief, direct announcement builds confidence; excessive justification suggests uncertainty.</p>

<h2>What to Do If Your Price Test Fails</h2>

<p>A "failed" price test — where the new price generates less revenue than the current price — is actually valuable data. It tells you your buyers are more price-sensitive than average, or that the specific price point you tested was above their willingness-to-pay threshold.</p>

<p>If your test fails, the right response is not to abandon pricing experiments. It's to test a smaller increment. Instead of $29 → $39 (34% increase), try $29 → $34 (17% increase). Or investigate whether you can reframe the product's value proposition to make the higher price feel more justified before running the experiment.</p>

<p>Pricing failures are not customer failures. They're data. The only failed experiment is the one that gives you no information.</p>
    `,
  },

  'stripe-price-testing-without-code': {
    title: "Stripe Price Testing Without Code: A Founder's Guide",
    description: "You don't need a developer to A/B test prices on Stripe. This guide covers the options, the tradeoffs, and the fastest path to knowing if your new price converts.",
    date: '2025-03-15',
    readTime: '8 min read',
    keywords: ['Stripe pricing', 'A/B test Stripe', 'price testing', 'SaaS pricing', 'no-code pricing'],
    content: `
<p>Stripe is the payments backbone for hundreds of thousands of SaaS products, developer tools, and online businesses. But when it comes to testing whether a different price would increase revenue, most founders are stuck. Stripe's dashboard lets you create prices and products — but not test them against each other with statistical rigor.</p>

<p>This guide covers every method for testing prices on Stripe, from the quick-and-dirty to the statistically sound, with particular focus on approaches that don't require a developer.</p>

<h2>Why Stripe Makes Price Testing Hard</h2>

<p>Stripe's architecture is built around a product-price model. You create a Product, then attach one or more Prices to it. Each Price has a fixed unit amount, currency, and billing interval. When a customer subscribes, they're locked to a specific Price ID.</p>

<p>This design is excellent for billing stability but creates friction for experimentation. If you want to test $29/month vs $39/month, you need two separate Prices. You need to route different customers to different checkout flows. And you need to track which checkout generated which subscription — without losing the ability to compare apples to apples.</p>

<p>Stripe does not have a built-in A/B testing feature. It has no concept of "this 50% of visitors should see Price A and this 50% should see Price B." That logic has to live outside Stripe, either in your application code, your checkout page, or a third-party tool.</p>

<h2>Method 1: Time-Series Comparison (No Code Required)</h2>

<p>The simplest approach: change your price, track the change in your Stripe dashboard, then revert if needed.</p>

<p><strong>How to do it:</strong>
<ol>
  <li>In Stripe Dashboard → Products, edit your product and add a new Price at the test amount.</li>
  <li>Update your checkout link or payment button to point to the new Price ID.</li>
  <li>Wait 4–6 weeks and compare monthly revenue and new subscription count.</li>
  <li>Revert to the original Price ID if results are negative.</li>
</ol>
</p>

<p><strong>Pros:</strong> Zero engineering. Works with any Stripe setup. Easy to revert.</p>

<p><strong>Cons:</strong> Not a true A/B test. Seasonal variation can confound results. You're exposing 100% of traffic to the test price, which means full downside risk if it performs poorly.</p>

<p><strong>Best for:</strong> Founders who want a quick directional signal without engineering investment. Works best when your traffic is stable and predictable.</p>

<h2>Method 2: Stripe Payment Links (No Code, Partial Split)</h2>

<p>Stripe Payment Links let you create checkout flows with a few clicks. You can create two Payment Links — one for your current price, one for your test price — and manually split traffic between them.</p>

<p><strong>How to do it:</strong>
<ol>
  <li>Create Payment Link A at your current price.</li>
  <li>Create Payment Link B at your test price.</li>
  <li>Share Link A in your regular channels and Link B in a different channel (e.g., your email list vs your social media following).</li>
  <li>Compare conversion rates and revenue across the two channels.</li>
</ol>
</p>

<p><strong>Caveat:</strong> This isn't a true A/B test because different channels have different audiences with different price sensitivities. Your email list subscribers may convert at higher rates regardless of price. Use this method for directional signals only.</p>

<h2>Method 3: Stripe + PricingSim (No Code, Statistically Sound)</h2>

<p>PricingSim imports your Stripe transaction history, estimates your price elasticity, and generates an A/B experiment page that routes visitors to different Stripe checkout URLs based on randomized variant assignment.</p>

<p><strong>How it works:</strong>
<ol>
  <li>Export your Stripe transaction CSV (Reports → Payments → Export).</li>
  <li>Upload to PricingSim. The Bayesian engine analyzes 90+ days of transaction data and suggests 2–3 test prices with confidence scores and projected revenue uplift.</li>
  <li>Click "Create Experiment." PricingSim generates a hosted A/B page with two Stripe checkout buttons — one at each price — and randomized variant assignment via cookie.</li>
  <li>Share the experiment page URL. PricingSim tracks which visitors see which price and which ones convert.</li>
  <li>After 4–8 weeks, the confidence dashboard shows the probability that the test price generates more revenue per visitor.</li>
  <li>Apply the winner (update your main checkout to the winning Price ID) or roll back in one click.</li>
</ol>
</p>

<p>This approach is statistically sound because it randomizes at the visitor level, tracks conversions for both variants simultaneously, and uses Bayesian inference to handle small sample sizes correctly.</p>

<h2>Method 4: Manual Split Testing with Stripe Metadata</h2>

<p>For developers who want full control, Stripe's product metadata can be used to store experiment parameters. Create two Price objects with a metadata field indicating the variant:</p>

<pre style="background: #f3f4f6; padding: 1rem; border-radius: 8px; overflow: auto; font-size: 0.85rem;"><code>// Price A (control)
stripe.prices.create({
  unit_amount: 2900,
  currency: 'usd',
  recurring: { interval: 'month' },
  product: 'prod_xxx',
  metadata: { experiment: 'price_test_q1', variant: 'control' }
})

// Price B (test)
stripe.prices.create({
  unit_amount: 3900,
  currency: 'usd',
  recurring: { interval: 'month' },
  product: 'prod_xxx',
  metadata: { experiment: 'price_test_q1', variant: 'treatment' }
})</code></pre>

<p>Your checkout route then assigns visitors randomly (70/30 or 50/50) and sends them to the corresponding Price ID. Stripe Webhooks capture which variant each subscription originated from.</p>

<p>This approach scales well but requires engineering time upfront.</p>

<h2>Price Point Psychology for SaaS Products</h2>

<p>Before running a price test, it's worth understanding why certain price points perform better than others — not just what the numbers say, but why buyers respond the way they do.</p>

<h3>The anchoring effect</h3>
<p>When buyers see your price, they don't evaluate it in isolation. They anchor to the first number they see. This is why $97 often outperforms $100 — not because buyers can't do the math, but because the visual anchor of "9X" feels lower than "1XX." For SaaS, the effect is real but small: focus on value first, then apply anchoring.</p>

<h3>The charm pricing threshold</h3>
<p>Prices ending in 9 ($29, $49, $99) outperform "round" prices ($30, $50, $100) in most B2C contexts. In B2B or developer-focused SaaS, the effect is weaker — professional buyers are less susceptible to retail price psychology.</p>

<h3>The good-better-best structure</h3>
<p>Products with 3 tiers see higher average revenue per user than products with 1 or 2 tiers. The middle tier anchors buyers away from the cheapest option and toward a mid-range choice that feels "reasonable." If you currently have only one price, adding a Pro tier at 2× often increases average revenue even if most buyers stick to the base tier.</p>

<h3>Annual vs monthly framing</h3>
<p>Offering an annual plan at an equivalent monthly discount of 15–20% consistently increases LTV. Buyers who commit to annual plans churn at significantly lower rates than monthly subscribers, improving cohort economics even when the monthly revenue per subscriber looks similar.</p>

<h2>Reading Your Stripe CSV for Price Signals</h2>

<p>Before running any test, download your Stripe Payments CSV and look for these signals:</p>

<p><strong>Average revenue per new subscriber over time:</strong> If it's declining, you may have traffic quality issues or you may have over-optimized for volume at the expense of price.</p>

<p><strong>Refund rate by acquisition period:</strong> Spikes in refunds often correspond to promotional periods when buyers had lower purchase intent. These periods should be excluded from elasticity estimates.</p>

<p><strong>Subscription age distribution:</strong> If most of your subscribers are recent, you don't have much data on long-term churn behavior. Price tests on new subscriber cohorts give you conversion data but not retention data.</p>

<p><strong>Failed payment rate:</strong> If you have a significant percentage of failed payments (involuntary churn), this is often a more urgent problem than pricing. Dunning sequences and payment recovery can have faster ROI than price optimization.</p>

<h2>The Fastest Path to a Stripe Price Test</h2>

<p>For most solo founders, the fastest path from "I want to test my Stripe price" to "I have statistically meaningful data" is:</p>

<ol>
  <li>Export your Stripe CSV (5 minutes)</li>
  <li>Import to PricingSim (2 minutes)</li>
  <li>Review the suggested prices and create an experiment (5 minutes)</li>
  <li>Update your marketing to drive traffic to the experiment page (30 minutes)</li>
  <li>Wait 4–8 weeks</li>
  <li>Apply the winner to your main Stripe checkout (2 minutes)</li>
</ol>

<p>Total active time: under an hour. Total wait time: 4–8 weeks. Expected outcome: a confident answer to "is my current price optimal?" — one of the most important and most neglected questions in any indie product business.</p>
    `,
  },

  'cohort-aware-simulations-explained': {
    title: 'Cohort-Aware Price Simulations: Why They Matter for Indie Founders',
    description: "Your ProductHunt launch cohort is not your organic cohort. Here's why mixing them ruins your elasticity estimates — and how cohort-aware simulations fix it.",
    date: '2025-03-22',
    readTime: '9 min read',
    keywords: ['cohort analysis', 'price simulation', 'price elasticity', 'MAD spike detection', 'Bayesian pricing'],
    content: `
<p>When you run a pricing experiment, you're trying to answer a deceptively simple question: <em>if I charge X instead of Y, will I make more or less money?</em> The challenge is that the answer depends entirely on which customers you're asking about. Your ProductHunt launch buyers, your AppSumo deal customers, and your organic search visitors are three completely different populations — with different willingness to pay, different reasons for buying, and different responses to price changes.</p>

<p>A pricing model that ignores these differences will give you wrong answers. This guide explains what a cohort is in the pricing context, why they need to be treated separately, and how cohort-aware simulations produce more accurate price recommendations for indie founders with limited data.</p>

<h2>What Is a Cohort in Pricing?</h2>

<p>In general analytics, a cohort is a group of users who share a common characteristic at a specific point in time. In pricing specifically, the most relevant cohort definition is: <strong>groups of buyers who came in through the same channel and at the same approximate price point.</strong></p>

<p>Here's why this matters: buyers who come through different channels have fundamentally different price sensitivities. Let's say your product normally sells for $49. You run an AppSumo deal that puts it in front of deal-hunters at $29. The buyers who respond to AppSumo are, by definition, more price-sensitive than your organic buyers — they found you because of a discount, not because they were searching for a solution to a specific problem.</p>

<p>If you mix these cohorts in a price elasticity model, the model sees high sales volume at $29 and lower sales at $49 and concludes: "this product has high price elasticity, demand drops a lot when price is high." But that's wrong. Your organic buyers at $49 represent your steady-state demand, and they're much less price-sensitive than the AppSumo cohort suggested.</p>

<p>The consequence of a mixed-cohort model: your price recommendation will be too conservative. It'll suggest prices closer to your current level than your data actually supports, because it's been contaminated by price-sensitive promotional buyers.</p>

<h2>The Common Cohort Patterns in Digital Product Sales</h2>

<h3>1. Organic cohort</h3>
<p>Buyers who found your product through search, word of mouth, or organic social. This is your baseline — the cohort that best represents "what will happen if I raise my price for a normal buyer?" Organic buyers tend to have the highest product-market fit and the lowest price sensitivity.</p>

<h3>2. Launch cohort</h3>
<p>Buyers who arrived during a ProductHunt launch, newsletter feature, or viral moment. These buyers are often early adopters: more price-tolerant on one hand (they're excited about new things), but also skeptical (they've seen dozens of launches and know many products don't last). Their behavior often doesn't predict steady-state demand.</p>

<h3>3. Promotional cohort</h3>
<p>Buyers who responded to a discount, sale, or bundle deal. These are definitionally price-sensitive. Their conversion rate at the promotional price tells you very little about conversion rate at your standard price.</p>

<h3>4. Referral cohort</h3>
<p>Buyers who came through a partner, affiliate, or recommendation. These buyers often have higher trust (they came via a recommendation) and may be willing to pay more, or may expect the "friend discount" that referral programs often provide.</p>

<h2>How Cohort Mixing Distorts Your Elasticity Estimate</h2>

<p>Price elasticity of demand (ε) measures how demand changes in response to price changes. Formally:</p>

<pre style="background: #f3f4f6; padding: 1rem; border-radius: 8px; overflow: auto; font-size: 0.85rem;"><code>ε = % change in quantity demanded / % change in price</code></pre>

<p>If ε = -1.0, a 10% price increase causes a 10% demand decrease — revenue stays roughly flat. If ε = -0.5, a 10% price increase only reduces demand by 5% — revenue increases. If ε = -2.0, a 10% price increase causes a 20% demand decrease — revenue falls significantly.</p>

<p>Now consider what happens when you mix your organic cohort (ε ≈ -0.6) with a promotional cohort (ε ≈ -2.5) in the same dataset. The blended elasticity might be ε ≈ -1.2 — worse than your organic baseline and systematically biased toward price sensitivity. Your model then recommends more conservative price tests than your actual organic data would justify.</p>

<p>This isn't a theoretical concern. In practice, AppSumo deals can drive 5–10× your normal monthly sales in a single campaign period. A single AppSumo deal in your dataset can dominate your elasticity estimate and make your organic buyers look 3–4× more price-sensitive than they actually are.</p>

<h2>MAD Spike Detection: The First Line of Defense</h2>

<p>PricingSim uses a Median Absolute Deviation (MAD) filter to automatically identify and flag sales spikes before estimating elasticity. Here's how it works:</p>

<p>For each transaction period, we calculate the daily sales rate (units per day). We then compute the median daily sales rate across all periods. The MAD is the median of the absolute deviations from that median:</p>

<pre style="background: #f3f4f6; padding: 1rem; border-radius: 8px; overflow: auto; font-size: 0.85rem;"><code>MAD = median(|qty_i - median(qty)|)

// Modified Z-score for each period:
z_i = 0.6745 × |qty_i - median(qty)| / MAD

// Flag as spike if z_i > 3.0</code></pre>

<p>The 0.6745 scaling factor makes the MAD score comparable to standard deviations for normally distributed data. The threshold of 3.0 corresponds to roughly 3 standard deviations — flagging only extreme outliers.</p>

<p>Why MAD instead of standard deviation? Because standard deviation is itself inflated by outliers. If you have one period with 200× normal sales (an AppSumo spike), the standard deviation becomes huge, and the spike no longer looks extreme relative to the inflated baseline. MAD is "robust to outliers" — it uses the median, which can't be moved by extreme values.</p>

<p>After spike removal, PricingSim also allows cohort tagging. If you know that a particular sales period was a promo deal, you can tag it directly and it's excluded from the elasticity estimation regardless of whether the spike detector flags it.</p>

<h2>The Cohort-Aware Simulation Model</h2>

<p>Once spikes are removed, the simulation model estimates elasticity from the cleaned, organic-cohort data. It uses a Normal-InvGamma Bayesian conjugate model with the following structure:</p>

<p>The model assumes:</p>
<ul>
  <li>Log(quantity change) = ε × Log(price change) + noise</li>
  <li>ε has a prior distribution: Normal(-1.0, 0.5²)</li>
  <li>Noise variance has an InvGamma prior: InvGamma(3, 0.5)</li>
</ul>

<p>The prior on ε is centered at -1.0 because most digital products have near-unit elasticity. But with standard deviation 0.5, it allows meaningful probability mass from -2.5 to 0 — covering both highly elastic products (>|1|) and inelastic ones.</p>

<p>As organic transaction data accumulates, the posterior distribution updates. With 5 data points, the posterior looks very similar to the prior — the data barely moves the estimate. With 50 data points, the data dominates — the prior's influence is small. This is exactly the right behavior: be cautious when you have little data, be confident when you have a lot.</p>

<h2>Interpreting Percentile Outcomes</h2>

<p>The simulation produces not just a point estimate of expected revenue at the test price, but a full probability distribution. PricingSim reports this as five percentiles: p05, p25, p50, p75, p95.</p>

<p>How to read them:</p>
<ul>
  <li><strong>p50 (median):</strong> The most likely revenue outcome. "If I had to pick one number, this is it."</li>
  <li><strong>p05:</strong> The 5th percentile — your downside scenario. "In the worst 5% of outcomes, revenue would be X." This is the floor used in the conservative recommendation rule.</li>
  <li><strong>p95:</strong> The 95th percentile — your upside scenario. "In the best 5% of outcomes, revenue would be Y."</li>
</ul>

<p>The recommendation to "test" a price is only made if <code>p05 &gt;= 0.95 × current_revenue</code>. This means that even in the pessimistic scenario, you don't lose more than 5% of your current revenue. It's a safety constraint, not a performance target.</p>

<h2>Worked Example With Numbers</h2>

<p>Suppose you have 12 months of Gumroad data for a $39 template. Here are your monthly sales figures:</p>

<ul>
  <li>Jan–Mar (organic): 3, 4, 2 sales/month at $39</li>
  <li>April (ProductHunt launch at $19): 47 sales</li>
  <li>May–Jun (post-launch at $39): 5, 3 sales/month</li>
  <li>Jul–Sep (organic at $39): 4, 3, 5 sales/month</li>
  <li>Oct (AppSumo deal at $29): 31 sales</li>
  <li>Nov–Dec (organic at $39): 4, 3 sales/month</li>
</ul>

<p>The MAD spike filter identifies April (47 sales) and October (31 sales) as spikes. Excluding these, your organic dataset has 10 periods with prices of $39 and average sales of 3.6/month.</p>

<p>Your elasticity estimate from this organic data is approximately ε = -0.7 (you only have one price point, so the prior dominates: the posterior is approximately Normal(-0.85, 0.35²)).</p>

<p>Testing a price of $49 (26% increase): predicted demand = 3.6 × (49/39)^(-0.85) ≈ 3.0 sales/month. Predicted revenue: $49 × 3.0 = $147/month vs current $140/month. A modest +5% expected lift.</p>

<p>At p05 (ε = -1.4): demand = 3.6 × (49/39)^(-1.4) ≈ 2.6 sales → $127/month — 9% below baseline. This fails the 5% downside floor. The system recommends a more conservative test: $45 instead of $49.</p>

<p>At $45 (15% increase): p50 revenue = $45 × 3.2 = $144/month (+3%). p05 revenue = $45 × 2.9 = $130/month (-7%). Still fails the downside floor, but barely. The system might recommend testing $43 instead.</p>

<p>This iterative tightening is exactly what the conservative optimizer does: it finds the highest price where the downside scenario still stays within 5% of your baseline. For data-sparse situations like this (10 organic periods, 1 price point), the recommendation is conservative by design. More data and more price variation gives tighter elasticity estimates and more aggressive recommendations.</p>

<h2>Why This Matters in Practice</h2>

<p>The difference between a naive elasticity model and a cohort-aware one isn't just academic. In the example above, a naive model including the April and October spikes would estimate ε ≈ -1.8 (very price sensitive) and recommend keeping prices at or below $39. The cohort-aware model, using only organic data, estimates ε ≈ -0.85 and recommends testing $43–$45.</p>

<p>If the cohort-aware model is right (and it usually is), the naive model is leaving 10–15% revenue on the table every month by being too conservative. Over 12 months, that's real money.</p>

<p>For founders doing $500–$5,000 MRR, a 10% revenue increase from a smarter pricing model can be the difference between a hobby project and a real business. That's the practical value of getting the statistics right.</p>
    `,
  },
}

const otherGuides: Record<string, { slug: string; title: string }[]> = {
  'micro-seller-pricing-experiments': [
    { slug: 'gumroad-pricing-updates-and-churn-risk', title: 'How to Update Your Gumroad Price Without Losing Customers' },
    { slug: 'stripe-price-testing-without-code', title: "Stripe Price Testing Without Code: A Founder's Guide" },
    { slug: 'cohort-aware-simulations-explained', title: 'Cohort-Aware Price Simulations: Why They Matter' },
  ],
  'gumroad-pricing-updates-and-churn-risk': [
    { slug: 'micro-seller-pricing-experiments', title: "The Solo Seller's Complete Guide to Pricing Experiments" },
    { slug: 'stripe-price-testing-without-code', title: "Stripe Price Testing Without Code" },
    { slug: 'cohort-aware-simulations-explained', title: 'Cohort-Aware Price Simulations Explained' },
  ],
  'stripe-price-testing-without-code': [
    { slug: 'micro-seller-pricing-experiments', title: "The Solo Seller's Complete Guide to Pricing Experiments" },
    { slug: 'gumroad-pricing-updates-and-churn-risk', title: 'Gumroad Pricing Updates and Churn Risk' },
    { slug: 'cohort-aware-simulations-explained', title: 'Cohort-Aware Price Simulations Explained' },
  ],
  'cohort-aware-simulations-explained': [
    { slug: 'micro-seller-pricing-experiments', title: "The Solo Seller's Complete Guide to Pricing Experiments" },
    { slug: 'gumroad-pricing-updates-and-churn-risk', title: 'Gumroad Pricing Without Losing Customers' },
    { slug: 'stripe-price-testing-without-code', title: "Stripe Price Testing Without Code" },
  ],
}

export async function generateStaticParams() {
  return Object.keys(guides).map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const guide = guides[slug]
  if (!guide) return { title: 'Not Found' }
  return {
    title: `${guide.title} — PricingSim Guides`,
    description: guide.description,
    keywords: guide.keywords,
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: `${BASE_URL}/guides/${slug}`,
      type: 'article',
      publishedTime: guide.date,
    },
  }
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const guide = guides[slug]
  if (!guide) notFound()

  const related = otherGuides[slug] ?? []

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    datePublished: guide.date,
    author: { '@type': 'Organization', name: 'PricingSim', url: BASE_URL },
    publisher: { '@type': 'Organization', name: 'PricingSim', url: BASE_URL },
    url: `${BASE_URL}/guides/${slug}`,
    keywords: guide.keywords.join(', '),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
          <Link href="/" style={{ color: '#6b7280', textDecoration: 'none' }}>← PricingSim</Link>
          <span style={{ color: '#d1d5db' }}>/</span>
          <Link href="/guides" style={{ color: '#6b7280', textDecoration: 'none' }}>Guides</Link>
        </div>

        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.25, marginBottom: '1rem' }}>{guide.title}</h1>
          <p style={{ color: '#6b7280', fontSize: '1rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>{guide.description}</p>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
            {new Date(guide.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · {guide.readTime}
          </p>
        </header>

        <article
          data-testid="guide-content"
          style={{ lineHeight: 1.8, color: '#374151', fontSize: '1rem' }}
          dangerouslySetInnerHTML={{ __html: guide.content }}
        />

        {/* CTA */}
        <div style={{ margin: '3rem 0', padding: '1.5rem', background: '#f5f3ff', borderRadius: 12, textAlign: 'center', borderLeft: '4px solid #4f46e5' }}>
          <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Ready to run your first safe pricing experiment?</p>
          <p style={{ color: '#6b7280', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            PricingSim connects to Stripe, Gumroad, and Shopify and gives you Bayesian price recommendations from your real data. Free tier, no credit card.
          </p>
          <Link
            href={`/signup?utm_source=guides&utm_medium=organic&utm_campaign=authority_content&utm_content=${slug}`}
            style={{
              background: '#4f46e5', color: '#fff',
              padding: '0.75rem 2rem', borderRadius: 8, fontWeight: 600,
              textDecoration: 'none', display: 'inline-block',
            }}
          >
            Start Free →
          </Link>
        </div>

        {/* Related guides */}
        <section data-testid="related-guides" style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Related Guides</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {related.map(r => (
              <Link
                key={r.slug}
                href={`/guides/${r.slug}`}
                data-testid={`related-${r.slug}`}
                style={{
                  display: 'block', padding: '0.875rem 1.25rem',
                  border: '1px solid #e5e7eb', borderRadius: 8,
                  textDecoration: 'none', color: '#374151',
                  background: '#fff',
                }}
              >
                <span style={{ color: '#4f46e5', marginRight: '0.5rem' }}>→</span>
                {r.title}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}
