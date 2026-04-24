# PricePilot — Bayesian Pricing Engine v0 Math Spec
*HBS Steps 3–4 | Engine Architecture*
*Last updated: 2025-04-24*

---

## Design Principles

1. **Conservative by default** — All recommendations are lower-bounded; we never suggest the theoretically optimal price, only a safe test ceiling
2. **Bayesian, not frequentist** — Works with as few as 20–30 conversions per variant; no minimum sample size wall
3. **Plain-English output** — All outputs translate to $ and % impact; no p-values or confidence intervals exposed to users
4. **One direction at a time** — Engine always proposes a single price test (control vs. challenger), never a range
5. **No black box** — Every recommendation includes a human-readable `why` field

---

## Data Inputs

### Transaction Record (normalized from any source)

```typescript
interface Transaction {
  id: string;
  user_id: string;           // PricePilot user (seller)
  product_id: string;
  platform: 'gumroad' | 'stripe' | 'shopify' | 'csv';
  amount_cents: number;      // price at time of purchase
  currency: string;          // ISO 4217
  purchased_at: Date;
  is_refunded: boolean;
  customer_key: string;      // hashed/anonymized customer id
  metadata?: Record<string, unknown>;
}
```

### Experiment Observation (for live A/B tracking)

```typescript
interface ExperimentObservation {
  experiment_id: string;
  variant: 'A' | 'B';       // A = control, B = challenger
  visitor_key: string;       // hashed visitor fingerprint
  event: 'view' | 'purchase' | 'refund';
  price_cents: number;
  occurred_at: Date;
}
```

---

## Module 1: Historical Baseline Estimator

### Purpose
Given N historical transactions at price P, estimate:
- `baseline_conversion_rate` μ_c
- `baseline_revenue_per_visitor` μ_r
- `revenue_seasonality` (detect launch spikes vs. steady state)
- `data_quality_flags` (AppSumo cohort contamination, seasonal outliers)

### Conversion Rate Prior

Because we don't have visitor counts from Gumroad/CSV (only purchase events), we estimate conversion rate using platform benchmarks:

```
P(conversion | Gumroad digital product) ~ Beta(α=2, β=40)
  → prior mean ≈ 4.7% (industry estimate for Gumroad digital products)

P(conversion | Stripe SaaS trial→paid) ~ Beta(α=3, β=17)
  → prior mean ≈ 15% (industry estimate for SaaS free trials)
```

We update the prior with observed purchases using Bayesian conjugate update:

```
If we observe k purchases and estimate N visitors from monthly traffic data:
  posterior = Beta(α + k, β + (N - k))
  posterior_mean = (α + k) / (α + β + N)
```

**Conservative rule:** If N (visitors) is unknown (CSV-only), we assume:
```
N_estimated = max(purchases * 20, purchases * platform_benchmark_inverse)
```

### Revenue Per Visitor

```
μ_r = price_current * posterior_conversion_mean
σ_r = price_current * sqrt(posterior_variance)

where:
  posterior_variance = (α+k)(β+N-k) / [(α+β+N)² * (α+β+N+1)]
```

### Launch Spike Detection

Flag transactions as "spike cohort" if:
```
daily_sales > mean_daily_sales + 3 * std_daily_sales
```

Spike cohort transactions are downweighted by 0.3 in elasticity estimation (they represent atypical buyer behavior).

---

## Module 2: Price Elasticity Estimator

### Purpose
Given historical data at price P₀, estimate the demand curve and predict conversion rate / revenue at price P₁.

### Method: Log-Linear Demand Model with Bayesian Prior

The standard price elasticity model:

```
Q(P) = Q₀ * (P/P₀)^(-ε)

where:
  Q₀ = baseline quantity (conversions at P₀)
  ε  = price elasticity of demand (ε > 0 means higher price → less demand)
  P₁ = proposed new price
```

**Prior on elasticity:**

For digital products with no close substitutes (templates, courses, micro-SaaS):
```
ε ~ LogNormal(μ=0.8, σ=0.6)
  → median elasticity = exp(0.8) ≈ 2.2
  → 90th percentile = exp(0.8 + 1.28*0.6) ≈ 5.4
  → 10th percentile = exp(0.8 - 1.28*0.6) ≈ 0.9
```

Interpretation: At median elasticity, a 10% price increase → ~22% fewer units but +21% revenue (net positive).

**Bayesian update:**

If the user has historical data at multiple price points (e.g., changed price once before):
```
log(Q₁/Q₀) = -ε * log(P₁/P₀) + ε_noise

ε_posterior ∝ ε_prior * L(ε | observed_Q_at_P₁)
```

For single-price history (most common case), we use the prior exclusively.

### Revenue Prediction

```python
def predict_revenue(
    price_current: float,
    price_proposed: float,
    baseline_monthly_revenue: float,
    elasticity_samples: np.ndarray,  # 10,000 draws from ε_posterior
) -> RevenueEstimate:
    
    price_ratio = price_proposed / price_current
    
    # For each elasticity sample, compute revenue ratio
    quantity_ratios = price_ratio ** (-elasticity_samples)
    revenue_ratios = price_ratio * quantity_ratios
    
    return RevenueEstimate(
        p10=np.percentile(revenue_ratios, 10) * baseline_monthly_revenue,
        p50=np.percentile(revenue_ratios, 50) * baseline_monthly_revenue,
        p90=np.percentile(revenue_ratios, 90) * baseline_monthly_revenue,
        prob_revenue_increase=np.mean(revenue_ratios > 1.0),
    )
```

### Conservative Exploration Rules

The engine applies hard constraints to keep recommendations safe:

```python
CONSERVATIVE_RULES = {
    # Never recommend more than 2.5x current price in a single experiment
    "max_price_multiplier": 2.5,
    
    # Always recommend testing 1.5–2.5x current price first
    # (never go higher without prior experiment confirmation)
    "default_test_ceiling": 2.0,
    
    # Minimum probability of revenue increase to make a recommendation
    "min_prob_revenue_increase": 0.60,
    
    # If elasticity uncertainty is too high (σ > 1.5), widen the recommendation window
    # but still cap at 2.0x
    "high_uncertainty_cap": 2.0,
    
    # If baseline revenue < $200/mo, use even more conservative 1.5x cap
    # (small MRR founders have less buffer for bad experiments)
    "low_mrr_threshold_dollars": 200,
    "low_mrr_max_multiplier": 1.5,
    
    # Minimum data before making a recommendation
    "min_transactions_for_recommendation": 20,
    
    # Warn if data has seasonal spike contamination > 30%
    "spike_contamination_warning_threshold": 0.30,
}
```

**Price selection algorithm:**
```python
def select_challenger_price(
    price_current: float,
    elasticity_posterior: Distribution,
    baseline_mrr: float,
) -> ChallengerPrice:
    
    # Start at 1.5x, step up to find max price with P(lift) >= 60%
    max_multiplier = CONSERVATIVE_RULES["max_price_multiplier"]
    if baseline_mrr < CONSERVATIVE_RULES["low_mrr_threshold_dollars"]:
        max_multiplier = CONSERVATIVE_RULES["low_mrr_max_multiplier"]
    
    best_price = None
    best_expected_revenue = 0
    
    for multiplier in np.arange(1.2, max_multiplier + 0.1, 0.1):
        candidate_price = round(price_current * multiplier, -1)  # round to nearest $10
        estimate = predict_revenue(price_current, candidate_price, baseline_mrr, 
                                   elasticity_posterior.sample(10000))
        
        if estimate.prob_revenue_increase >= CONSERVATIVE_RULES["min_prob_revenue_increase"]:
            if estimate.p50 > best_expected_revenue:
                best_expected_revenue = estimate.p50
                best_price = candidate_price
    
    return ChallengerPrice(
        price=best_price,
        expected_monthly_lift_p50=best_expected_revenue - baseline_mrr,
        expected_monthly_lift_p10=estimate.p10 - baseline_mrr,  # conservative bound
        probability_of_lift=estimate.prob_revenue_increase,
    )
```

---

## Module 3: Live Experiment Bayesian Updater

### Purpose
Given live experiment observations (views + purchases per variant), maintain and update a Bayesian estimate of which variant wins, outputting a confidence score and predicted revenue lift.

### Beta-Binomial Model

Each variant's conversion rate θ is modeled as:
```
θ_A ~ Beta(α_A, β_A)   (control, initialized from historical baseline)
θ_B ~ Beta(α_B, β_B)   (challenger, initialized with same prior)
```

**Update rule (each new observation):**
```
purchase at variant A → α_A += 1
non-purchase at variant A → β_A += 1
```

**Confidence that B beats A (revenue per visitor):**
```python
def prob_b_beats_a(
    alpha_A, beta_A, price_A,
    alpha_B, beta_B, price_B,
    n_samples: int = 100_000,
) -> float:
    """
    Probability that revenue_per_visitor(B) > revenue_per_visitor(A).
    """
    samples_A = np.random.beta(alpha_A, beta_A, n_samples)
    samples_B = np.random.beta(alpha_B, beta_B, n_samples)
    
    rev_A = samples_A * price_A
    rev_B = samples_B * price_B
    
    return np.mean(rev_B > rev_A)
```

### Stopping Rules

Experiment ends when any of:
1. `P(B beats A) >= 0.90` → declare B winner
2. `P(A beats B) >= 0.90` → declare A winner (no change recommended)
3. `max_days_elapsed >= 60` → inconclusive, recommend extending
4. `min_purchases_per_variant >= 15` AND confidence `< 0.70` after 30 days → suggest "not enough signal, try 1.2x instead"

**Conservative stopping note:**
> We use 90% confidence (not 95%) because our users need faster results with smaller samples. The Bayesian approach naturally calibrates uncertainty, so this threshold corresponds to meaningful signal rather than arbitrary frequentist power calculations.

---

## Module 4: Revenue Lift Estimator (Post-Experiment)

### Purpose
After an experiment concludes with winner B, estimate actual revenue impact if the seller commits to price B permanently.

```python
def estimate_revenue_impact(
    winner_price: float,
    loser_price: float,
    winner_conversion_posterior: Beta,  # α, β from experiment
    baseline_monthly_visitors: int,
    current_monthly_revenue: float,
) -> ImpactEstimate:
    
    samples = winner_conversion_posterior.sample(10_000)
    
    new_monthly_revenue_samples = samples * winner_price * baseline_monthly_visitors
    
    return ImpactEstimate(
        monthly_lift_p10=np.percentile(new_monthly_revenue_samples - current_monthly_revenue, 10),
        monthly_lift_p50=np.percentile(new_monthly_revenue_samples - current_monthly_revenue, 50),
        monthly_lift_p90=np.percentile(new_monthly_revenue_samples - current_monthly_revenue, 90),
        annual_lift_p50=np.percentile(new_monthly_revenue_samples - current_monthly_revenue, 50) * 12,
        payback_period_days=calculate_payback(
            tool_monthly_cost=29,  # PricePilot monthly cost
            monthly_lift_p50=...,
        ),
    )
```

---

## Output Schema

Every engine call returns a structured recommendation object:

```typescript
interface PriceRecommendation {
  product_id: string;
  generated_at: Date;
  
  current_state: {
    price_cents: number;
    est_monthly_revenue: number;
    est_monthly_conversions: number;
    data_quality: 'high' | 'medium' | 'low';
    data_quality_notes: string[];       // e.g., "spike cohort detected"
  };
  
  recommendation: {
    action: 'test_higher' | 'test_lower' | 'stable' | 'insufficient_data';
    challenger_price_cents: number;
    
    projected_lift: {
      conservative_monthly: number;    // p10
      expected_monthly: number;        // p50
      optimistic_monthly: number;      // p90
    };
    
    probability_of_lift: number;       // 0–1
    confidence_label: string;          // "68% confident" in plain English
    
    why: string;                       // Human-readable explanation
    caveats: string[];                 // Warnings (low data, spike contamination, etc.)
    
    conservative_rules_applied: string[];  // Which caps/rules triggered
  };
  
  experiment_config: {
    variant_a_price: number;           // = current price
    variant_b_price: number;           // = recommended challenger
    suggested_split: number;           // 0.5 = 50/50, 0.2 = 20% to B
    estimated_days_to_result: number;
    min_conversions_needed: number;
  };
}
```

---

## Engine API (Internal)

```
POST /api/engine/recommend
  Body: { user_id, product_id, force_refresh?: boolean }
  Returns: PriceRecommendation

POST /api/engine/experiment/observe
  Body: { experiment_id, variant, event, price_cents }
  Returns: { confidence, winner?: 'A'|'B', should_stop: boolean }

GET /api/engine/experiment/:id/status
  Returns: { confidence, conversions_A, conversions_B, revenue_lift_estimate }

POST /api/engine/experiment/:id/conclude
  Body: { decision: 'commit_B' | 'rollback_A' | 'extend' }
  Returns: { success, new_price?, experiment_archived_at }
```

---

## Validation & Backtesting Plan

Before shipping engine v0:

1. **Synthetic data test:** Generate 1,000 simulated sellers with known elasticity. Verify that engine recommendations result in positive revenue lift > 70% of the time.

2. **Low-volume stress test:** Test with N=5, 10, 15, 20 transactions. Verify engine gracefully degrades to "insufficient data" recommendation rather than confidently suggesting a bad price.

3. **Spike contamination test:** Inject an AppSumo-style spike (5x normal sales for 3 days) and verify the spike-detection flag activates and the recommendation is appropriately uncertain.

4. **Conservative rule audit:** For every recommendation, assert that `challenger_price <= 2.5 * current_price`. No exceptions.

5. **Probability calibration:** Verify that experiments where engine says "P(lift) = 0.7" actually produce lift ~70% of the time in backtesting.
