# PricePilot — Bayesian Elasticity Engine v0 Math Spec
*Precise specification for the pricing recommendation engine*
*Last updated: 2025-04-24*

---

## 1. Overview & Design Goals

The engine estimates **price elasticity of demand** from a seller's transaction history and uses the posterior distribution to recommend a price that:

1. **Maximizes expected revenue** at the proposed new price
2. **Subject to a downside constraint:** the 5th-percentile revenue outcome at the new price must be ≥ 95% of current revenue (i.e., we tolerate at most a 5% revenue loss at the conservative tail)
3. **Is cohort-aware:** elasticity is estimated per `(product_id, cohort_tag)` stratum when tagging data is available
4. **Degrades gracefully** for small-N: bootstrap confidence intervals replace asymptotic Normal approximations when N < 50

---

## 2. Data Model for the Engine

### Input: Transaction Cohort

```python
@dataclass
class TransactionCohort:
    product_id: str
    cohort_tag: str | None         # e.g. "reddit_promo", "appsumo", "organic", None
    price_history: list[PricePoint]

@dataclass
class PricePoint:
    price: float                   # USD, > 0
    quantity: int                  # units sold in this period
    period_days: int               # length of observation window
    is_spike: bool                 # flagged by spike detector (see §6)
```

### Normalized Input for Regression

For each non-spike `PricePoint`:
```
x_i = log(price_i / price_ref)    # log price ratio (dimensionless)
y_i = log(qty_per_day_i / qty_ref) # log quantity ratio (dimensionless)
```

Where `price_ref` and `qty_ref` are the reference period values (most recent stable period before any experiment). Using ratios rather than raw values makes the prior on elasticity scale-invariant.

---

## 3. The Demand Model

### 3.1 Log-Linear Demand (Power Law)

The standard constant-elasticity demand model:

```
log(Q) = α + ε · log(P) + noise
```

In ratio form:
```
y_i = ε · x_i + δ_i,    δ_i ~ Normal(0, σ²)
```

where:
- `y_i = log(Q_i / Q_ref)` — log quantity ratio
- `x_i = log(P_i / P_ref)` — log price ratio
- `ε` — **price elasticity of demand** (the key parameter; expected to be negative)
- `σ²` — observation noise variance

This is a simple linear regression through the origin (no intercept, since ratios are centered at zero).

### 3.2 Prior on Elasticity

Based on empirical literature for digital products and micro-SaaS:

```
ε ~ Normal(μ₀ = -1.0, σ₀² = 0.5²)
```

Interpretation:
- **Mean −1.0:** unit elastic — a 10% price increase reduces quantity by ~10%, leaving revenue approximately flat. This is the conservative prior: we assume we're near unit elasticity unless data tells us otherwise.
- **SD 0.5:** we're uncertain within ±1 elasticity unit at 2σ. The prior allows for inelastic goods (ε ∈ [−0.5, 0]) and moderately elastic (ε ∈ [−2, −1]).
- **90% prior interval:** ε ∈ [−1.82, −0.18] — spans from moderately elastic to slightly inelastic.

```python
PRIOR_MEAN_ELASTICITY = -1.0
PRIOR_SD_ELASTICITY   =  0.5
```

### 3.3 Prior on Noise Variance

```
σ² ~ InvGamma(a₀ = 3.0, b₀ = 0.5)
```

This gives a prior mean of `b₀ / (a₀ - 1) = 0.25` for σ², consistent with moderate observation noise in monthly sales data.

---

## 4. Posterior via Conjugate Bayesian Linear Regression

### 4.1 Setup

For the single-predictor model `y = ε·x + δ` with known prior `ε ~ N(μ₀, σ₀²)`, we use the **Normal-InvGamma conjugate** update.

Let the data be `{(x_i, y_i)}` for i = 1, …, N (non-spike observations).

### 4.2 Sufficient Statistics

```python
def compute_sufficient_stats(x: np.ndarray, y: np.ndarray) -> dict:
    """
    x: log price ratios, shape (N,)
    y: log quantity ratios, shape (N,)
    """
    N    = len(x)
    Sxx  = x @ x          # sum of x_i²
    Sxy  = x @ y          # sum of x_i * y_i
    Syy  = y @ y          # sum of y_i²
    return {"N": N, "Sxx": Sxx, "Sxy": Sxy, "Syy": Syy}
```

### 4.3 Posterior Parameters

**Posterior precision on ε:**
```
λ_post = 1/σ₀² + Sxx/σ²
       = (1/0.25) + Sxx/σ²
```

**Posterior mean of ε:**
```
μ_post = (μ₀/σ₀² + Sxy/σ²) / λ_post
```

**Posterior variance of ε:**
```
σ_post² = 1 / λ_post
```

In practice we integrate over σ² (using the NIG conjugate):

```python
def posterior_elasticity(
    x: np.ndarray,
    y: np.ndarray,
    prior_mean: float = -1.0,
    prior_sd: float = 0.5,
    prior_a: float = 3.0,
    prior_b: float = 0.5,
) -> tuple[float, float, float, float]:
    """
    Returns (post_mean, post_sd, post_a, post_b) of the NIG posterior.
    The marginal posterior of ε is a Student-t distribution.
    """
    N   = len(x)
    Sxx = float(x @ x)
    Sxy = float(x @ y)
    Syy = float(y @ y)

    # Prior precision
    lam0 = 1.0 / prior_sd**2

    # Posterior precision on ε
    lam_post = lam0 + Sxx

    # Posterior mean of ε
    mu_post = (prior_mean * lam0 + Sxy) / lam_post

    # Posterior shape
    a_post = prior_a + N / 2.0

    # Posterior scale (b_post)
    b_post = (
        prior_b
        + 0.5 * Syy
        + 0.5 * (prior_mean**2 * lam0)
        - 0.5 * (mu_post**2 * lam_post)
    )

    return mu_post, (b_post / (a_post * lam_post))**0.5, a_post, b_post
```

**Marginal posterior of ε (integrating over σ²):**
```
ε | data ~ t_{2·a_post}(μ_post, b_post / (a_post · λ_post))
```

This is a Student-t distribution — heavier tails than Normal, automatically reflecting uncertainty about σ².

### 4.4 Sampling from the Posterior

```python
def sample_elasticity_posterior(
    mu_post: float,
    sd_post: float,
    a_post: float,
    n_samples: int = 100_000,
) -> np.ndarray:
    """
    Draw samples from the marginal posterior of ε.
    Marginal is Student-t with df = 2 * a_post.
    """
    from scipy import stats
    df = 2.0 * a_post
    return stats.t.rvs(df=df, loc=mu_post, scale=sd_post, size=n_samples)
```

---

## 5. Bootstrap for Small-N Robustness

When `N < 50` (the common case for Gumroad template sellers), the asymptotic approximations in §4 may be unstable. We augment with bootstrap:

### 5.1 Bootstrap Protocol

```python
def bootstrap_elasticity_posterior(
    x: np.ndarray,
    y: np.ndarray,
    prior_mean: float = -1.0,
    prior_sd: float = 0.5,
    n_bootstrap: int = 2_000,
    random_seed: int = 42,
) -> np.ndarray:
    """
    Parametric bootstrap: for each bootstrap resample, compute
    the Bayesian posterior mean, then return the distribution of
    posterior means across resamples.

    For N < 10: use prior-heavy regularization (prior_sd = 0.3)
    For N 10-49: normal bootstrap
    For N >= 50: skip bootstrap, use direct posterior sampling (§4.4)
    """
    rng = np.random.default_rng(random_seed)
    N = len(x)

    if N >= 50:
        mu_p, sd_p, a_p, _ = posterior_elasticity(x, y, prior_mean, prior_sd)
        return sample_elasticity_posterior(mu_p, sd_p, a_p, n_bootstrap)

    # Tighten prior for very small N
    effective_prior_sd = 0.3 if N < 10 else prior_sd

    bootstrap_means = np.zeros(n_bootstrap)
    for i in range(n_bootstrap):
        idx = rng.integers(0, N, size=N)
        x_b, y_b = x[idx], y[idx]
        mu_p, sd_p, a_p, b_p = posterior_elasticity(
            x_b, y_b, prior_mean, effective_prior_sd
        )
        bootstrap_means[i] = mu_p

    return bootstrap_means
```

### 5.2 Effective Sample Size Flags

| N (non-spike obs) | Regime | Action |
|---|---|---|
| N < 5 | **Insufficient** | Return `action='insufficient_data'`, no recommendation |
| 5 ≤ N < 10 | **Very low** | Bootstrap with `prior_sd=0.3`; widen credible interval |
| 10 ≤ N < 50 | **Low** | Bootstrap with standard prior; note "low volume" in caveats |
| N ≥ 50 | **Adequate** | Direct NIG posterior sampling |

---

## 6. Spike Detection & Cohort Filtering

### 6.1 Spike Detector

Sales spikes (AppSumo promotions, viral posts, Product Hunt launches) distort elasticity estimates because they represent atypical buyer cohorts.

```python
def flag_spikes(
    daily_sales: np.ndarray,
    window: int = 30,
    z_threshold: float = 3.0,
) -> np.ndarray:
    """
    Returns boolean mask: True = spike day.
    Uses rolling median + MAD for robustness against existing spikes.
    """
    from scipy.ndimage import uniform_filter1d

    rolling_median = np.array([
        np.median(daily_sales[max(0, i-window):i+1])
        for i in range(len(daily_sales))
    ])
    mad = np.median(np.abs(daily_sales - rolling_median))
    modified_z = 0.6745 * (daily_sales - rolling_median) / (mad + 1e-9)
    return modified_z > z_threshold
```

Spike-contaminated `PricePoint` objects are excluded from elasticity regression but their revenue is reported separately in the suggestion output for transparency.

### 6.2 Cohort Stratification

When `coupon_code`, `referrer_tag`, or `acquisition_channel` metadata is present on transactions, we fit **separate elasticity models per cohort**:

```
Cohorts = {(product_id, cohort_tag)} where cohort_tag ∈ {
    'organic',       -- direct traffic, no tag
    'affiliate',     -- affiliate link purchases
    'promo_code',    -- any coupon code
    'appsumo',       -- AppSumo cohort (often price-insensitive)
    'product_hunt',  -- PH launch cohort
    'other',         -- catch-all
}
```

**Cohort mixing rule:** When recommending a price for the general catalog, use only the `organic` and `affiliate` cohorts (exclude spike/promo cohorts). When the seller explicitly wants to test promo pricing, use all cohorts.

```python
def filter_cohort(
    transactions: list[Transaction],
    exclude_tags: list[str] = ('appsumo', 'promo_code', 'product_hunt'),
) -> list[Transaction]:
    return [t for t in transactions if t.cohort_tag not in exclude_tags]
```

---

## 7. Revenue Prediction

Given a proposed price `P_new` and current reference state `(P_ref, Q_ref)`:

```python
def predict_revenue_distribution(
    price_proposed: float,
    price_ref: float,
    revenue_ref_monthly: float,
    elasticity_samples: np.ndarray,   # shape (S,)
) -> RevenueDistribution:
    """
    For each elasticity sample ε_s, compute predicted revenue ratio:
        R(P_new) / R(P_ref) = (P_new/P_ref) * (P_new/P_ref)^ε_s
                            = (P_new/P_ref)^(1 + ε_s)
    """
    price_ratio = price_proposed / price_ref
    revenue_ratios = price_ratio ** (1.0 + elasticity_samples)
    predicted_revenues = revenue_ratios * revenue_ref_monthly

    return RevenueDistribution(
        p05  = float(np.percentile(predicted_revenues, 5)),
        p25  = float(np.percentile(predicted_revenues, 25)),
        p50  = float(np.percentile(predicted_revenues, 50)),
        p75  = float(np.percentile(predicted_revenues, 75)),
        p95  = float(np.percentile(predicted_revenues, 95)),
        mean = float(np.mean(predicted_revenues)),
        prob_above_current = float(np.mean(predicted_revenues > revenue_ref_monthly)),
    )
```

---

## 8. Conservative Recommendation Rule

### 8.1 Formal Constraint

The engine selects the price `P*` that:

```
P* = argmax_{P} E[R(P) | data]

subject to:
    Quantile_5th(R(P) | data) >= R_ref * (1 - 0.05)
    P > P_ref                                          [only test higher prices]
    P <= P_ref * 2.5                                   [hard cap: never > 2.5x in one step]
    N_non_spike >= 5                                   [minimum data requirement]
```

Where:
- `R(P)` = predicted monthly revenue at price `P`
- `R_ref` = current monthly revenue at `P_ref`
- The 5th-percentile constraint means: in the worst realistic scenario (bottom 5% of the posterior), we lose at most 5% of current revenue

### 8.2 Algorithm

```python
def find_optimal_price(
    price_ref: float,
    revenue_ref: float,
    elasticity_samples: np.ndarray,
    price_grid_step: float = 1.0,     # $1 increments by default
    max_multiplier: float = 2.5,
    downside_tolerance: float = 0.05, # allow at most 5% revenue loss at p5
) -> PriceRecommendation | None:
    """
    Grid search over candidate prices from price_ref * 1.1 to price_ref * max_multiplier.
    Returns the price with maximum E[R] that satisfies the p5 constraint.
    """
    floor_revenue = revenue_ref * (1.0 - downside_tolerance)
    price_ceiling = price_ref * max_multiplier

    # Generate candidate prices (round to nearest dollar for UX clarity)
    candidates = np.arange(
        math.ceil(price_ref * 1.1),
        math.floor(price_ceiling) + price_grid_step,
        price_grid_step
    )

    best_price = None
    best_expected_revenue = -np.inf
    best_dist = None

    for p_candidate in candidates:
        dist = predict_revenue_distribution(
            price_proposed=p_candidate,
            price_ref=price_ref,
            revenue_ref_monthly=revenue_ref,
            elasticity_samples=elasticity_samples,
        )
        # Check downside constraint
        if dist.p05 < floor_revenue:
            continue                     # violates constraint — skip
        # Check if this is the best so far
        if dist.mean > best_expected_revenue:
            best_expected_revenue = dist.mean
            best_price = p_candidate
            best_dist = dist

    if best_price is None:
        return None   # no price satisfies the constraint — data is too noisy

    return PriceRecommendation(
        price_ref=price_ref,
        price_proposed=best_price,
        revenue_ref=revenue_ref,
        revenue_dist=best_dist,
        constraint_binding=(best_dist.p05 < revenue_ref * 1.05),  # close to floor
    )
```

### 8.3 Additional Hard Rules

```python
CONSERVATIVE_RULES = {
    # Never exceed 2.5x current price in a single experiment
    "max_price_multiplier":       2.5,

    # For MRR < $200/mo: tighter cap (founders have less buffer)
    "low_mrr_threshold_dollars":  200,
    "low_mrr_max_multiplier":     1.5,

    # For very high elasticity posterior (mean < -2.5): cap at 1.3x
    # (data suggests price-sensitive market; be extra conservative)
    "high_elasticity_cap_trigger": -2.5,
    "high_elasticity_max_multiplier": 1.3,

    # Minimum non-spike observations before any recommendation
    "min_observations":           5,

    # Minimum expected revenue lift to make a recommendation worth showing
    # (don't show a suggestion that only improves revenue by 2%)
    "min_expected_lift_pct":      0.08,  # 8%

    # Spike contamination warning threshold
    "spike_fraction_warning":     0.30,  # warn if >30% of obs are spikes
}
```

### 8.4 Applying MRR-Aware Caps

```python
def apply_conservative_caps(
    price_ref: float,
    revenue_ref_monthly: float,
    raw_proposed_price: float,
    elasticity_posterior_mean: float,
) -> tuple[float, list[str]]:
    """
    Returns (capped_price, list_of_rules_triggered).
    """
    rules_triggered = []
    max_mult = CONSERVATIVE_RULES["max_price_multiplier"]

    # Low MRR cap
    if revenue_ref_monthly < CONSERVATIVE_RULES["low_mrr_threshold_dollars"]:
        max_mult = min(max_mult, CONSERVATIVE_RULES["low_mrr_max_multiplier"])
        rules_triggered.append("low_mrr_1.5x_cap")

    # High elasticity cap
    if elasticity_posterior_mean < CONSERVATIVE_RULES["high_elasticity_cap_trigger"]:
        max_mult = min(max_mult, CONSERVATIVE_RULES["high_elasticity_max_multiplier"])
        rules_triggered.append("high_elasticity_1.3x_cap")

    price_ceiling = price_ref * max_mult
    if raw_proposed_price > price_ceiling:
        rules_triggered.append(f"hard_cap_at_{max_mult}x")
        return price_ceiling, rules_triggered

    return raw_proposed_price, rules_triggered
```

---

## 9. Full Engine Pipeline

```python
def run_engine(
    product_id: str,
    transactions: list[Transaction],
    cohort_tag_filter: list[str] | None = None,
) -> EngineResult:
    """
    Top-level engine entry point.
    Returns a structured EngineResult for use by the API layer.
    """

    # 1. Filter cohort
    filtered = filter_cohort(transactions, exclude_tags=cohort_tag_filter or ['appsumo'])

    # 2. Aggregate into PricePoints
    price_points = aggregate_to_price_points(filtered)  # groups by price, month

    # 3. Detect and flag spikes
    for pp in price_points:
        pp.is_spike = is_spike_period(pp, price_points)

    clean_points = [pp for pp in price_points if not pp.is_spike]
    spike_fraction = 1.0 - len(clean_points) / max(1, len(price_points))

    # 4. Compute reference state
    ref = compute_reference_state(clean_points)    # most recent stable period
    N = len(clean_points)

    # 5. Build regression arrays
    x = np.array([log(pp.price / ref.price) for pp in clean_points])
    y = np.array([log(pp.qty_per_day / ref.qty_per_day) for pp in clean_points])

    # 6. Check minimum data
    if N < CONSERVATIVE_RULES["min_observations"]:
        return EngineResult(
            product_id=product_id,
            action="insufficient_data",
            caveats=[f"Only {N} clean observations (need ≥5)"],
        )

    # 7. Get elasticity posterior (bootstrap if N < 50)
    elasticity_samples = bootstrap_elasticity_posterior(x, y)
    mu_e = float(np.mean(elasticity_samples))
    sd_e = float(np.std(elasticity_samples))

    # 8. Find optimal price subject to conservative constraint
    raw_recommendation = find_optimal_price(
        price_ref=ref.price,
        revenue_ref=ref.monthly_revenue,
        elasticity_samples=elasticity_samples,
    )

    if raw_recommendation is None:
        return EngineResult(
            product_id=product_id,
            action="insufficient_data",
            caveats=["No price satisfies the downside constraint. Data may be too noisy."],
        )

    # 9. Apply hard conservative caps
    final_price, rules = apply_conservative_caps(
        price_ref=ref.price,
        revenue_ref_monthly=ref.monthly_revenue,
        raw_proposed_price=raw_recommendation.price_proposed,
        elasticity_posterior_mean=mu_e,
    )

    # Recompute distribution at capped price if it changed
    if final_price != raw_recommendation.price_proposed:
        dist = predict_revenue_distribution(final_price, ref.price,
                                            ref.monthly_revenue, elasticity_samples)
    else:
        dist = raw_recommendation.revenue_dist

    # 10. Check minimum lift
    if dist.mean < ref.monthly_revenue * (1 + CONSERVATIVE_RULES["min_expected_lift_pct"]):
        return EngineResult(
            product_id=product_id,
            action="stable",
            caveats=["Expected lift < 8% — not worth the experiment friction"],
        )

    # 11. Build and return result
    return EngineResult(
        product_id=product_id,
        action="test_higher",
        price_ref_cents=round(ref.price * 100),
        price_proposed_cents=round(final_price * 100),
        elasticity_posterior_mean=mu_e,
        elasticity_posterior_sd=sd_e,
        n_observations=N,
        spike_fraction=spike_fraction,
        revenue_dist=dist,
        conservative_rules_applied=rules,
        caveats=build_caveats(N, spike_fraction, mu_e, rules),
        confidence_label=format_confidence(dist.prob_above_current),
        why_text=build_why_text(mu_e, sd_e, ref, final_price, dist),
    )
```

---

## 10. Cohort-Aware Variant: Stacked Estimation

When sufficient data exists across multiple cohorts, the engine uses a **hierarchical pooling** approach:

```python
def run_engine_cohort_aware(
    product_id: str,
    transactions_by_cohort: dict[str, list[Transaction]],
) -> EngineResult:
    """
    Runs the engine per cohort, then pools posteriors with weights
    proportional to cohort size for the final recommendation.

    Only organic + affiliate cohorts contribute to the price recommendation.
    Promo/spike cohorts are reported separately.
    """
    TARGET_COHORTS = ['organic', 'affiliate', None]

    posteriors = {}
    for tag, txns in transactions_by_cohort.items():
        if tag not in TARGET_COHORTS:
            continue
        x, y, N = build_regression_arrays(txns)
        if N >= 5:
            samples = bootstrap_elasticity_posterior(x, y)
            posteriors[tag] = (samples, N)

    if not posteriors:
        return EngineResult(product_id=product_id, action="insufficient_data",
                            caveats=["No target-cohort data available"])

    # Weighted pool: weight by sqrt(N) to prevent large noisy cohorts dominating
    weights = {tag: N**0.5 for tag, (_, N) in posteriors.items()}
    total_w = sum(weights.values())

    # Draw from weighted mixture of posteriors
    pooled_samples = np.concatenate([
        np.random.choice(samps, size=round(1e5 * weights[tag] / total_w), replace=True)
        for tag, (samps, _) in posteriors.items()
    ])

    return _finalize_recommendation(product_id, pooled_samples, transactions_by_cohort)
```

---

## 11. Output Schema

```typescript
interface EngineResult {
  product_id: string;
  generated_at: string;           // ISO timestamp

  action: 'test_higher' | 'test_lower' | 'stable' | 'insufficient_data';

  // Elasticity posterior summary
  elasticity_posterior_mean: number;      // e.g. -1.23
  elasticity_posterior_sd:   number;      // e.g. 0.41
  elasticity_ci_90: [number, number];     // [p05, p95] of posterior

  // Current state
  price_ref_cents:     number;
  revenue_ref_monthly: number;            // cents
  n_observations:      number;
  spike_fraction:      number;            // 0–1

  // Recommendation
  price_proposed_cents: number;
  revenue_dist: {
    p05:  number;    // conservative bound (the constraint floor)
    p25:  number;
    p50:  number;    // expected
    p75:  number;
    p95:  number;
    mean: number;
    prob_above_current: number;           // 0–1
  };

  // UX copy
  confidence_label: string;              // "74% likely to increase revenue"
  why_text:         string;              // plain-English rationale
  caveats:          string[];
  conservative_rules_applied: string[];
}
```

---

## 12. Validation Tests

| Test | Pass Criterion |
|---|---|
| **Unit elastic data** (ε_true = −1.0, N=30) | Posterior mean within 0.3 of truth |
| **Inelastic data** (ε_true = −0.3, N=30) | Posterior mean within 0.3; recommendation is aggressive |
| **Elastic data** (ε_true = −2.5, N=30) | Posterior mean within 0.4; 1.3x cap applied |
| **N=5 (tiny)** | Falls back to bootstrap; wide CI; conservative capped recommendation |
| **N=3 (too small)** | Returns `action='insufficient_data'` |
| **100% spike data** | Returns `action='insufficient_data'` |
| **30% spike data** | Caveat added; clean points used |
| **P5 constraint binding** | Final price ≤ theoretical optimum; constraint note in rules |
| **MRR < $200** | `low_mrr_1.5x_cap` in `conservative_rules_applied` |
| **5000-run backtests** | P5 constraint violated < 5% of the time (calibration) |

---

## 13. Glossary

| Symbol | Meaning |
|---|---|
| ε | Price elasticity of demand (negative = demand falls as price rises) |
| μ₀, σ₀ | Prior mean and SD on ε |
| λ_post | Posterior precision on ε |
| μ_post, σ_post | Posterior mean and SD on ε |
| a_post, b_post | NIG posterior shape and scale |
| P_ref, Q_ref | Reference price and quantity (current / most recent stable) |
| R_ref | Reference monthly revenue |
| P* | Optimal recommended price |
| p05(R) | 5th percentile of predicted revenue distribution at P* |
| N | Number of non-spike price observations available |
