---
slug: quickstart
title: "Quickstart Guide"
description: "Get from zero to your first pricing experiment in under 10 minutes."
order: 1
---

## Connect Your Data Source

PricingSim supports three connection methods:

### Stripe (API)
Go to **Settings → Connections** and paste your Stripe API key (test or live). PricingSim validates the key and imports your last 200 charges automatically.

### Gumroad / Shopify CSV
Export a CSV from your platform's dashboard, then drag it onto the **Import** page. PricingSim auto-detects the column format and maps fields.

### Generic CSV
Any CSV with `Date`, `Product Name`, and `Amount` columns works. See the [CSV guide](/import/guide) for the full field mapping.

---

## Run the Engine

Once you have data, go to **Suggestions**. The Bayesian engine analyzes your last 90 days and proposes 2–3 candidate prices with projected revenue lift.

Each suggestion shows:
- **Current price** vs. **suggested price**
- **Confidence score** (how strong the signal is)
- **Projected monthly revenue change**

---

## Create an Experiment

Pick a suggestion and click **Create Experiment**. This generates a public A/B page at `/x/<your-experiment-slug>`.

The experiment page shows:
- Variant A (your current price)
- Variant B (the suggested price)

Share the link on your sales channels. PricingSim tracks conversions on both variants.

---

## Preview and Roll Back

On the Experiments page, you can:
- **Preview** what buyers see at each price
- **Pause** the experiment at any time
- **Roll back** to Variant A with one click if results disappoint

---

## Upgrade to Pro

The free plan supports 3 active experiments. Pro ($29/month) gives you:
- Unlimited experiments
- AI-generated communication templates
- CSV export of all experiment data
- Priority support

[Upgrade to Pro →](/pricing)
