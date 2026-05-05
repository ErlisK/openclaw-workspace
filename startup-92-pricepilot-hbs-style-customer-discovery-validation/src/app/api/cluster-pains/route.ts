import { createGateway } from '@ai-sdk/gateway';
import { generateObject } from 'ai';
import { z } from 'zod';

const gateway = createGateway();

// Signals corpus embedded directly (from research/public_signals.jsonl)
const SIGNALS = [
  // Risk aversion / churn fear cluster
  "I've been at $19/mo for 18 months. I think I could charge $49 but I'm scared of losing even 2 customers.",
  "Raised prices once, lost 3 customers immediately, panicked and reverted within a week. Now I'm too scared to try again.",
  "My top fear about raising prices isn't even the revenue — it's the angry email I'll get from my 3 loudest customers.",
  "Everyone on Twitter says 'Just double your prices.' So I did. Went from $29/month to $59/month overnight. Signups dropped 70% immediately. Revenue was DOWN.",
  "I'm scared that if I raise my prices, I'll lose customers / revenue — Reddit post title alone shows how common this fear is.",
  "Started at $50/hour because I didn't feel qualified to charge more. Imposter syndrome pricing.",
  "Pricing is emotional. I literally get anxious setting prices. There has to be a better way.",
  "I raised my price and somehow got MORE customers. The starter kit was originally $29. I was scared to charge more.",
  "Doubled our prices and increased signups — a pricing experiment surprise. I've always heard 'charge more' but was scared.",
  "I underpriced my tool for a year trying to compete with free alternatives. Priced it at $5 a month because I was terrified.",
  
  // Insufficient data / methodology gap cluster
  "I only have 80 paying users. Every A/B test calculator tells me I need 1000+ conversions per variant. So what do I do?",
  "45 customers. They all pay $29/mo. Would love to know if I can charge $49 but 45 people isn't enough to A/B test anything.",
  "Every AB testing tool I look at requires like 5000 visitors a month. I get 400. I give up.",
  "Someone mentioned Bayesian A/B testing works with small samples. Is there actually software that implements this for pricing?",
  "My friend had absolutely no idea how to price his SaaS. He was literally guessing numbers. '$19? $49? Maybe $9?' Most of us are just guessing based on 'vibes' rather than data.",
  "How do people actually make pricing decisions? Gut? Twitter consensus? I feel like there should be a more rigorous way.",
  "Do customers who pay more churn less? I assume yes but I don't have the cohort analysis to prove it to myself.",
  "What I want: looks at my Stripe data, tells me where I should be pricing, and lets me run a test. Does this exist?",
  "The 'just raise prices' advice almost destroyed my SaaS. The problem: I doubled overnight with no data to support it.",
  
  // Pricing tool gap / mismatch cluster
  "ProfitWell is great but it's all subscriptions. I sell a mix of one-time and recurring and the metrics are useless for me.",
  "Baremetrics costs more than my first paying customer brought in. Slightly demotivating.",
  "Price Intelligently cheapest plan was more than my MRR. Good for them, useless for me.",
  "Gumroad's analytics are basically useless for pricing decisions. Sales count, revenue, and that's it.",
  "Lemon Squeezy has great billing but their analytics are almost nonexistent. I just see a list of orders.",
  "I don't need a complex A/B testing tool. I need a button that says 'safely test a higher price' and handles everything else.",
  "What I want: show the new price to 10% of visitors, see if conversion holds, then roll out. Is that technically possible?",
  "How to easily experiment with SaaS pricing? We are in a dilemma how to structure the pricing for our SaaS.",
  "I want a tool that watches what prices are working in my category and flags when I'm falling behind.",
  "Shopify has apps for everything except 'figure out if you're charging the right price for your digital products'.",
  
  // Underpricing / value capture gap cluster
  "My customers tell me I save them 5 hours/week. I charge $9/mo. I know I'm leaving money on the table but I don't know how much.",
  "I realized my $12 Figma kit had been downloaded 2,000 times. If I'd charged $29, same conversion rate gets me $16k more.",
  "I sent a 1-question survey asking what people would pay. Average answer was $47. I'm charging $19. I might be an idiot.",
  "The pricing mistake I made: for the first 6 months I priced based on build cost. Later raised to $299. Nothing about the product changed. Only the pricing logic.",
  "i was pricing my monitoring tool at $24/mo. competitors charge $89-$589. $24/mo said 'this is a side project.' $89+ says 'this is real infrastructure.'",
  "3 years in, I realize my biggest mistake wasn't the tech or the marketing. It was underpricing for 18 months because I was scared.",
  "My clients stay for 14 months on average. I charge $2k/mo. That's $28k LTV. I charge $200 for onboarding. This math doesn't make sense.",
  
  // Discount dependency / coupon distortion cluster
  "I've done so many sales that my audience waits for Black Friday now. Regular price barely sells anymore. I created this problem myself.",
  "I've been using fake urgency ('Only 10 spots left!') for 2 years. I hate it. I'd rather just charge the right price.",
  "My revenue looks like a seismograph — huge spikes on launch days, dead flat in between. My pricing strategy is 'discount until it sells'.",
  "I've done so many sales that my audience waits for Black Friday now. Regular price barely sells anymore.",
  
  // Grandfathering / legacy pricing trap cluster
  "60% of my MRR is from customers on my $9 launch price. I've raised to $29 for new customers but too scared to migrate the old ones.",
  "Early adopters at $7/mo make me feel guilty. Logically I should raise them. Emotionally I feel like I'd be betraying them.",
  "I charge $3k/month for my retainer. Been the same rate for 3 years. Inflation alone justifies raising it but I freeze every time.",
  
  // Communication anxiety cluster  
  "I know I need to raise prices. I just don't know what to say to existing customers. I've started that email 5 times and deleted it.",
  "Raised prices, communicated it badly, lost 3 great customers who said they 'felt blindsided.' I wish there was a playbook for this.",
  "Is there a good template for emailing existing customers about a price increase? I need it to sound human, not corporate.",
  
  // Bundle / tier design confusion cluster
  "Should I sell my 8 Notion templates individually or bundle them? If bundle, at what price? I've been going back and forth for 4 months.",
  "I added a $99/mo 'Pro' tier with 'advanced features' nobody asked for. Zero customers on it. I clearly don't know what people value.",
  "Added a bundle of my 3 best templates. It now outsells each individual product. Wish I'd done this 6 months ago.",
  "Added an annual plan but only 3 people chose it. I don't know if the discount isn't compelling enough or if nobody saw it.",
  "We lost $47K in MRR because I priced for 'fairness' instead of value — flattened usage-based pricing and lost our best customers.",
  
  // Safety / rollback need cluster
  "What's the safest way to test a price increase without fully committing? I want a rollback button basically.",
  "I want to test two prices with Stripe but the technical setup to route different users to different price IDs is above my frontend skills.",
  "Tested $29 vs $49 manually by changing Gumroad price and tracking for 2 weeks each. Completely invalid experiment but what else am I supposed to do?",
  "I don't need someone to tell me the 'perfect' price. I just need a confidence score on whether going higher is worth the risk.",
  "Changing from a soft paywall to a hard paywall generated us an extra 82% revenue. Sometimes it really is that simple — but you have to test.",
  
  // Technical barrier cluster
  "I want to test two prices with Stripe but the technical setup to route different users to different price IDs is above my frontend skills.",
  "Going freemium to grow faster. Now 800 free users and 20 paid. Conversion is terrible and I don't know if it's price or product.",
  "My AppSumo launch spike completely messes up my LTV and churn numbers. Any tool I use just shows garbage because of that one cohort.",
  "I downloaded my Gumroad CSV and tried to analyze it in Google Sheets. Spent 3 hours, concluded nothing useful, gave up.",
];

const ClusterSchema = z.object({
  clusters: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    signal_count: z.number(),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    persona_relevance: z.array(z.string()),
    representative_quotes: z.array(z.string()),
    pricepilot_feature_implication: z.string(),
    frequency_pct: z.number(),
  })),
  meta: z.object({
    total_signals_analyzed: z.number(),
    top_cluster_by_frequency: z.string(),
    cross_cluster_insight: z.string(),
    product_priority_order: z.array(z.string()),
  }),
});

export async function GET(request: Request) {
  // Restrict to authenticated users
  const { createClient } = await import('@/lib/supabase')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const { NextResponse } = await import('next/server')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const prompt = `You are an expert product researcher analyzing public signal data about solo founder and indie creator pricing pain points.

Below are ${SIGNALS.length} verbatim quotes/signals from Reddit, IndieHackers, HackerNews, and Twitter/X about pricing challenges faced by solo founders doing $500-$10k MRR.

Analyze and cluster these into 7-10 distinct pain point themes. For each cluster:
1. Give it a precise product-relevant name (e.g. "Fear-of-Churn Pricing Paralysis")
2. Describe the underlying job/frustration
3. Count how many of the signals belong to this cluster
4. Rate severity for PricingSim's business case (critical/high/medium/low)  
5. Note which personas it affects most (micro-SaaS founder, course creator, template seller, indie consultant)
6. Pick 2-3 most representative quotes
7. State the specific PricingSim feature that addresses this cluster

Also provide meta-analysis: which cluster is most frequent, a cross-cluster insight, and the feature build priority order.

SIGNALS:
${SIGNALS.map((s, i) => `${i+1}. "${s}"`).join('\n')}`;

    const result = await generateObject({
      model: gateway('anthropic/claude-haiku-4-5'),
      schema: ClusterSchema,
      prompt,
    });

    return Response.json({ 
      success: true, 
      data: result.object,
      signals_count: SIGNALS.length,
      timestamp: new Date().toISOString()
    });
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
