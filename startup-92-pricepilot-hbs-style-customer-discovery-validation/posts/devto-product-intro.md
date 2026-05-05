---
title: "I Built a Pricing Experiment Tool for Solo Founders — Here's What I Learned"
description: "PricingSim uses Bayesian inference to help indie creators safely test higher prices. A product intro covering the why, what, and how."
tags: ["saas", "webdev", "startup", "beginners"]
canonical_url: "https://pricingsim.com/blog/building-pricepilot-product-intro"
cover_image: "https://pricingsim.com/assets/screenshot-pricing.png"
---

Six months ago, I talked to 40 solo founders about pricing. Every single one had the same answer when I asked if they'd ever tested their prices:

*"No. I'm scared of losing customers."*

I built PricingSim to solve that.

## What PricingSim Does

PricingSim is a web app that helps solo creators — Notion template sellers, micro-SaaS founders, course creators — run safe pricing experiments. Connect your Stripe, Gumroad, or Shopify store, and the app:

1. Analyzes your last 90 days of sales data
2. Estimates your price elasticity of demand using Bayesian inference
3. Suggests 2–3 conservative test prices with confidence scores and projected revenue
4. Generates a live A/B experiment page automatically
5. Gives you a dashboard with real-time confidence updates
6. Lets you apply the winner or roll back in one click

No code. No engineering. No stats degree required.

## The Problem With "Just Raise Your Prices"

Generic advice like "charge more" ignores a critical constraint: **you need data to know if your specific customers will follow you to a higher price**.

Theoretical frameworks (Value-Based Pricing, Competitor-Based Pricing) give you a starting point. But the only way to actually know your optimal price is to test it with real buyers.

The problem: traditional A/B testing frameworks require 200–1,000 conversions per variant to reach statistical significance. If you're doing 50–100 sales per month, that's a 2-year wait.

## The Bayesian Alternative

Bayesian inference doesn't ask "is this significant at p < 0.05?" It asks: "Given the data I have, what's the probability that Price B generates more revenue than Price A?"

That's a much more useful question, and it's answerable with 20–40 data points instead of 1,000.

PricingSim models your conversion rate at each price as a probability distribution (Beta distribution, specifically). Each sale updates that distribution. You get an evolving confidence score — "87% confident the higher price generates more revenue" — that narrows as more data comes in.

The engine also has a hard downside constraint: it will never recommend a test where the 5th-percentile outcome (the bad scenario) results in more than 5% revenue loss from your current baseline.

## What I Learned Building It

**The scary part for users isn't the statistics. It's the visibility.** Running a price test means some of your visitors see a different price than others. Founders worried this would feel dishonest or damage trust. We spent a lot of time on the experiment page design and the communication templates (AI-generated emails, tweets, and blog posts for announcing the change).

**Real-world CSVs are messier than you think.** Gumroad changed their export format twice in 2024. Stripe's export has 40+ columns. We ended up using fuzzy column detection — matching by substring rather than exact header names — and it works much better.

**Conservative defaults win.** Early beta users didn't trust a tool that suggested aggressive price increases. We added hard caps (max 2.5× current price), a minimum data threshold (5 clean observations), and a downside floor (p05 >= 95% of current revenue). Usage went up after adding constraints.

**Supabase's Row Level Security is excellent but requires planning.** We use RLS extensively — each user's experiments, imports, and results are isolated at the database level. Getting this right at the start saved us from a category of bugs that plagued early competitors.

## The Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **Deployment**: Vercel
- **Payments**: Stripe (checkout + billing portal)
- **AI features**: Vercel AI Gateway (Claude via OIDC — zero API key management)
- **Engine**: Pure TypeScript — Normal-InvGamma conjugate model, no external math libraries

The engine runs entirely server-side in Next.js Route Handlers. No external ML services, no Python microservices. The math is surprisingly straightforward to implement once you understand the conjugate update equations — see the [technical deep dive](/blog/building-the-bayesian-pricing-engine) if you want the implementation details.

## Try It

Free tier, no credit card required.

→ **https://pricingsim.com**

I'd love to hear from indie founders who've run pricing experiments — what worked, what didn't, what you wish you'd known. Drop a comment below.
