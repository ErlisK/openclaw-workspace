import { createGateway } from '@ai-sdk/gateway';
import { generateObject } from 'ai';
import { z } from 'zod';

const gateway = createGateway();

// Cluster data from previous AI analysis
const CLUSTERS = [
  { id: 'C1', name: 'Fear-of-Churn Price-Increase Paralysis', severity: 'CRITICAL', freq: 13.3 },
  { id: 'C2', name: 'Statistically-Invalid Tiny-Sample Tests', severity: 'CRITICAL', freq: 10.0 },
  { id: 'C3', name: 'Data-Blind Pricing Guesswork', severity: 'CRITICAL', freq: 8.3 },
  { id: 'C4', name: 'Missing Value-to-Price Alignment', severity: 'HIGH', freq: 10.0 },
  { id: 'C5', name: 'Discount-Trap Revenue Ceiling', severity: 'HIGH', freq: 8.3 },
  { id: 'C6', name: 'Existing-Customer Migration Guilt', severity: 'HIGH', freq: 8.3 },
  { id: 'C7', name: 'Enterprise Tool Prices for Micro Ops', severity: 'HIGH', freq: 6.7 },
  { id: 'C8', name: 'Tier & Bundle Structure Uncertainty', severity: 'MEDIUM', freq: 8.3 },
  { id: 'C9', name: 'Low-Friction Test Execution Gap', severity: 'MEDIUM', freq: 6.7 },
  { id: 'C10', name: 'Payment Platform Analytics Gap', severity: 'MEDIUM', freq: 5.0 },
];

// Representative quotes from corpus
const KEY_QUOTES = [
  "I've been at $19/mo for 18 months. I think I could charge $49 but I'm scared of losing even 2 customers.",
  "I only have 80 paying users. Every A/B test calculator tells me I need 1000+ conversions. What do I do?",
  "My friend had absolutely no idea how to price his SaaS. He was literally guessing numbers: '$19? $49? Maybe $9?'",
  "I realized my $12 Figma kit had been downloaded 2,000 times. If I'd charged $29, I'd have $16k more.",
  "I've done so many sales that my audience waits for Black Friday now. Regular price barely sells anymore.",
  "60% of my MRR is from customers on my $9 launch price. Too scared to migrate the old ones.",
  "I want to test two prices with Stripe but the technical setup is above my frontend skills.",
  "Gumroad's analytics are basically useless for pricing decisions. Sales count, revenue, and that's it.",
  "The pricing mistake: I priced based on build cost. Later raised to $299. Nothing changed except the pricing logic.",
  "$24/mo said 'this is a side project.' $89+ says 'this is real infrastructure.'",
  "I raised my price and somehow got MORE customers. Was originally $29, scared to charge more.",
  "We lost $47K in MRR because I priced for 'fairness' instead of value.",
  "Baremetrics costs more than my first paying customer brought in.",
  "I downloaded my Gumroad CSV and tried to analyze in Google Sheets. Spent 3 hours, concluded nothing.",
  "What I want: a button that says 'safely test a higher price' and handles everything else.",
];

const PersonaSchema = z.object({
  personas: z.array(z.object({
    id: z.string(),
    name: z.string(),
    archetype: z.string(),
    mvp_priority: z.enum(['P0_PRIMARY', 'P1_SECONDARY', 'P2_LATER']),
    mvp_priority_rationale: z.string(),
    platform_stack: z.object({
      primary_payment: z.string(),
      storefront: z.string(),
      email: z.string(),
      analytics: z.string(),
    }),
    demographics: z.object({
      age_range: z.string(),
      background: z.string(),
      solo_or_team: z.string(),
      mrr_range: z.string(),
      customer_count_range: z.string(),
      time_at_current_price: z.string(),
    }),
    trigger_moment: z.string(),
    decision_context: z.object({
      what_they_know: z.string(),
      what_they_dont_know: z.string(),
      what_they_fear: z.string(),
      what_would_unlock_action: z.string(),
    }),
    pain_clusters_ranked: z.array(z.object({
      cluster_id: z.string(),
      cluster_name: z.string(),
      relevance: z.enum(['primary', 'secondary', 'not_relevant']),
    })),
    channel_footprint: z.object({
      daily_reads: z.array(z.string()),
      posts_in: z.array(z.string()),
      follows_on_twitter: z.array(z.string()),
      buys_from: z.array(z.string()),
    }),
    pricepilot_adoption_journey: z.object({
      discovery_trigger: z.string(),
      evaluation_question: z.string(),
      activation_moment: z.string(),
      success_metric: z.string(),
      churn_risk: z.string(),
    }),
    quote_that_defines_them: z.string(),
    willingness_to_pay: z.object({
      monthly_comfortable: z.string(),
      monthly_stretch: z.string(),
      preferred_model: z.string(),
      price_objection: z.string(),
    }),
  })),
  mvp_recommendation: z.object({
    primary_persona: z.string(),
    secondary_persona: z.string(),
    rationale: z.string(),
    first_60_days_focus: z.string(),
    positioning_statement: z.string(),
  }),
});

export async function GET() {
  try {
    const clusterSummary = CLUSTERS.map(c => `${c.id} (${c.severity}): ${c.name} — ${c.freq}%`).join('\n');
    const quotesList = KEY_QUOTES.map((q, i) => `${i+1}. "${q}"`).join('\n');

    const prompt = `You are a product strategist building PricePilot — a lightweight pricing experiment tool for solo creators and micro-SaaS founders at $500–$10k MRR.

You have completed pain-point cluster analysis of 95 public signals and identified 10 clusters. Now generate 5 deeply researched personas covering the specific platform archetypes the founder needs to target.

REQUIRED PERSONAS (one per archetype):
1. Notion/Figma/Template Seller on Gumroad (~$500–$3k MRR, mostly one-time sales)
2. Micro-SaaS Founder on Stripe (~$2k–$8k MRR, recurring subscriptions)  
3. Course Creator on Gumroad/Teachable/Podia (~$1k–$5k MRR, launch-model sales)
4. Digital Product Seller on Shopify (~$1k–$6k MRR, mix of one-time and subscription)
5. One-off Consultant/Productized Service via Stripe links (~$3k–$10k MRR)

PAIN CLUSTERS (from previous analysis):
${clusterSummary}

KEY QUOTES FROM TARGET USERS:
${quotesList}

For each persona:
- Assign MVPpriority: P0_PRIMARY (build for them first), P1_SECONDARY (second wave), or P2_LATER (backlog)
- Describe their exact platform stack (payment processor, storefront, email tool, analytics)
- Write the specific "trigger moment" that makes them search for a pricing tool RIGHT NOW
- Map which pain clusters are most/least relevant to them
- Describe their channel footprint: where they read, post, who they follow on Twitter
- Write their PricePilot adoption journey (how they discover → evaluate → activate → succeed)
- Be specific about WTP: actual dollar amounts, preferred billing model (monthly/annual/one-time)

IMPORTANT: The persona name should be a realistic first name + brief descriptor. The quote_that_defines_them should be a real-sounding verbatim quote in their voice.

Also provide an mvp_recommendation specifying which 2 personas to focus the first 60 days on and why.`;

    const result = await generateObject({
      model: gateway('anthropic/claude-sonnet-4-6'),
      schema: PersonaSchema,
      prompt,
      maxTokens: 8000,
    });

    return Response.json({
      success: true,
      data: result.object,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const error = err as Error;
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
