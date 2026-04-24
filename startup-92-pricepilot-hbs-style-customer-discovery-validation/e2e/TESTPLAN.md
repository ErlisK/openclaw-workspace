# PricePilot — Playwright E2E Test Plan
*HBS Steps 3–4 | Test Architecture*
*Last updated: 2025-04-24*

---

## Test Philosophy

1. **Happy path first** — Every core user flow must have a green E2E test before merge
2. **Auth guard every protected route** — Unauthenticated access returns 401/redirect, not data
3. **RLS is tested at DB level** — Use seeded test users to verify cross-user data isolation
4. **Rollback is always testable** — The single most important safety feature must have dedicated tests
5. **Mobile viewport included** — Results emails are read on mobile; test at 390px viewport

---

## Test Suite Structure

```
e2e/
├── auth/
│   ├── signup.spec.ts
│   ├── login.spec.ts
│   └── auth-guards.spec.ts
├── onboarding/
│   ├── connect-gumroad.spec.ts
│   ├── connect-stripe.spec.ts
│   └── csv-upload.spec.ts
├── dashboard/
│   ├── product-list.spec.ts
│   └── recommendation.spec.ts
├── experiments/
│   ├── create-experiment.spec.ts
│   ├── live-view.spec.ts
│   ├── commit-decision.spec.ts
│   └── rollback.spec.ts
├── api/
│   ├── engine-recommend.spec.ts
│   ├── experiment-observe.spec.ts
│   └── health.spec.ts
├── rls/
│   └── cross-user-isolation.spec.ts
└── helpers/
    ├── auth.ts
    ├── seed.ts
    └── fixtures.ts
```

---

## Test Cases

### Suite 1: Authentication

#### TC-AUTH-001: Sign up with email + password
```
Given: User visits /signup
When: User submits valid email + password
Then: User is redirected to /onboard/connect
And: Profile row exists in public.profiles
And: Email confirmation sent (mocked in test)
```

#### TC-AUTH-002: Login with valid credentials
```
Given: User has an account (seeded via helper)
When: User submits email + password on /login
Then: User is redirected to /dashboard
And: Session cookie is set
```

#### TC-AUTH-003: Login with invalid password
```
Given: User has an account
When: User submits wrong password
Then: Error message "Invalid email or password" shown
And: User stays on /login
And: No session cookie set
```

#### TC-AUTH-004: Auth guard — protected routes redirect unauthenticated
```
Given: No session cookie
When: User navigates to /dashboard, /experiments, /settings
Then: Each route redirects to /login
And: No data is returned
```

#### TC-AUTH-005: Auth guard — API routes return 401 without session
```
Given: No Authorization header
When: GET /api/engine/recommend, POST /api/engine/experiment/observe
Then: 401 Unauthorized response
And: No data leaked
```

---

### Suite 2: Onboarding / Data Import

#### TC-ONBOARD-001: CSV upload — Gumroad format
```
Given: Authenticated as Maya (test user)
When: User uploads a valid Gumroad sales CSV (fixture: e2e/fixtures/gumroad_sample.csv)
Then: "Import successful" message shown
And: Product list shows products from CSV
And: Transaction count matches CSV row count
And: "Quick snapshot" shows correct total revenue
```

#### TC-ONBOARD-002: CSV upload — malformed file rejected
```
Given: Authenticated user
When: User uploads a CSV with missing required columns
Then: Error message "Missing required columns: price, date" shown
And: No transactions are created
```

#### TC-ONBOARD-003: CSV upload — deduplication
```
Given: 30 transactions already imported
When: User uploads same CSV again (60 rows, 30 overlap)
Then: Only 30 new transactions added (no duplicates)
And: Total count = 60
```

#### TC-ONBOARD-004: Stripe OAuth connect flow
```
Given: Authenticated as Marcus (test user)
When: User clicks "Connect Stripe" and completes mock OAuth
Then: Integration row created with status='active'
And: Products list populated from mock Stripe data
```

---

### Suite 3: Dashboard & Recommendations

#### TC-DASH-001: Product list renders
```
Given: Maya is logged in with 2 products + transactions imported
When: User visits /dashboard
Then: Both products visible with name, price, sales count
And: "Get recommendation" button available for each
```

#### TC-DASH-002: Recommendation generated
```
Given: Product with 30+ transactions
When: User clicks "Get recommendation" on product
Then: Recommendation card appears within 3 seconds
And: Card shows: current price, challenger price, projected lift ($ amount)
And: Card shows confidence label (e.g., "68% confident")
And: Card shows "why" explanation text
And: "Start experiment" button is visible
```

#### TC-DASH-003: Recommendation with insufficient data
```
Given: Product with only 5 transactions
When: User clicks "Get recommendation"
Then: "Insufficient data" message shown
And: Suggestion to "upload more sales history or wait for more sales"
And: No price recommendation shown
```

#### TC-DASH-004: Conservative cap applied
```
Given: Product priced at $5 with 50 transactions
When: Recommendation is generated
Then: Challenger price is ≤ $12.50 (2.5x cap)
And: API response includes conservative_rules_applied field
```

---

### Suite 4: Experiment Creation

#### TC-EXP-001: Create experiment from recommendation
```
Given: Recommendation exists for a product
When: User clicks "Start experiment: $12 vs $29"
Then: Experiment created with status='active'
And: Shareable slug URL generated (e.g., /e/abc123)
And: Copy link button shows the full URL
And: User redirected to /experiments/{id}
```

#### TC-EXP-002: Experiment slug URL serves correct split
```
Given: Active experiment with 50/50 split
When: 100 visitors access /e/{slug} in headless browser
Then: ~50 are redirected to variant A URL (within ±15%)
And: ~50 are redirected to variant B URL (within ±15%)
And: observation rows are created for each visit
```

#### TC-EXP-003: Experiment prevents duplicate products
```
Given: An active experiment already exists for product X
When: User tries to create another experiment for product X
Then: Error shown: "An active experiment already exists for this product"
And: No duplicate experiment created
```

#### TC-EXP-004: Experiment config — split ratio respected
```
Given: Experiment with 20% split to B (80/20)
When: 100 visitors access the experiment link
Then: ~80 go to variant A, ~20 to variant B (within ±10%)
```

---

### Suite 5: Live Monitoring

#### TC-MONITOR-001: Live view shows current state
```
Given: Active experiment with 15 observations
When: User visits /experiments/{id}
Then: Conversions_A and conversions_B shown correctly
And: Revenue per visitor calculated for each variant
And: Confidence percentage shown
And: "Days remaining" estimate shown
```

#### TC-MONITOR-002: Confidence updates on new observation
```
Given: Active experiment
When: POST /api/engine/experiment/observe called with new purchase
Then: GET /experiments/{id} shows updated confidence
And: Update happens within 2 seconds
```

#### TC-MONITOR-003: Progress bar fills toward 90%
```
Given: Experiment with confidence at 61%
When: User views experiment page
Then: Progress bar shows 61% fill
And: "Need ~18 more conversions" message is accurate
```

---

### Suite 6: Decision — Commit & Rollback

#### TC-DECISION-001: Commit B winner (Gumroad)
```
Given: Experiment with confidence ≥ 90%, winner=B
When: User clicks "Update to $29 now"
Then: Product price updated to 2900 cents in database
And: Experiment status set to 'concluded', decision='commit_b'
And: Audit log entry created: { action: 'price_changed', old_value: 1200, new_value: 2900 }
And: Success message shown with projected monthly lift
```

#### TC-DECISION-002: Rollback to A (one-click)
```
Given: Active experiment (any confidence level)
When: User clicks "Rollback to $12"
Then: Experiment status set to 'rolled_back', decision='rollback_a'
And: Product price reverts to variant A price (1200 cents)
And: Rollback completes in < 2 seconds
And: Audit log entry created: { action: 'rollback_executed' }
And: Confirmation message shown: "Reverted to $12. No customers affected."
```

#### TC-DECISION-003: Rollback button always visible
```
Given: Active experiment at any stage
When: User visits /experiments/{id}
Then: "Rollback" button is visible in DOM regardless of confidence %
And: Button is not hidden or disabled
```

#### TC-DECISION-004: Cannot commit on inconclusive experiment
```
Given: Experiment with confidence = 45% (below threshold)
When: User tries to access the commit endpoint directly (POST /api/experiments/{id}/conclude with decision=commit_b)
Then: 400 error: "Confidence too low to commit. Current: 45%. Required: 90%."
And: Experiment state unchanged
```

---

### Suite 7: API Health Checks

#### TC-API-001: Engine health endpoint
```
GET /api/health
→ 200 { status: 'ok', db: 'connected', version: '0.1.0' }
```

#### TC-API-002: Recommend endpoint returns valid schema
```
POST /api/engine/recommend { user_id, product_id }
→ 200 with all required fields:
  current_state.price_cents (number)
  recommendation.action (string)
  recommendation.challenger_price_cents (number)
  recommendation.prob_of_lift (0-1)
  recommendation.confidence_label (string)
  recommendation.why (string)
  experiment_config.estimated_days_to_result (number)
```

#### TC-API-003: Observe endpoint idempotent for same visitor
```
POST /api/engine/experiment/observe { experiment_id, variant: 'A', event: 'purchase', visitor_key: 'abc' }
→ 201 (first call)

POST /api/engine/experiment/observe { experiment_id, variant: 'A', event: 'purchase', visitor_key: 'abc' }
→ 200 (second call, idempotent — same visitor, same event)
And: conversions_a count NOT incremented again
```

---

### Suite 8: RLS Cross-User Isolation

#### TC-RLS-001: User A cannot read User B's products
```
Given: Maya (user A) and Marcus (user B) both have products
When: Request to GET /api/products authenticated as Maya
Then: Only Maya's products returned (not Marcus's)
And: Marcus's product IDs not in response
```

#### TC-RLS-002: User A cannot read User B's transactions
```
Given: Maya has 60 transactions, Marcus has 45
When: Request to GET /api/transactions authenticated as Maya
Then: Response contains exactly 60 transactions
And: None of Marcus's transaction IDs present
```

#### TC-RLS-003: User A cannot access User B's experiment
```
Given: Maya has experiment E1, Marcus has experiment E2
When: Request to GET /api/experiments/{E2_id} authenticated as Maya
Then: 404 Not Found (not 403, to avoid leaking experiment existence)
```

#### TC-RLS-004: User A cannot post observations to User B's experiment
```
Given: Marcus has active experiment E2
When: POST /api/engine/experiment/observe { experiment_id: E2_id } authenticated as Maya
Then: 404 Not Found
And: No observation row created for E2
```

#### TC-RLS-005: Public experiment slug readable without auth (for split redirect)
```
Given: Active experiment with slug 'test-abc123'
When: GET /e/test-abc123 (no auth cookie)
Then: 302 redirect to one of the two variant URLs
And: No user data, no pricing strategy data in response headers
```

#### TC-RLS-006: Concluded experiment slug returns 404
```
Given: Experiment with slug 'old-experiment' with status='concluded'
When: GET /e/old-experiment (no auth)
Then: 404 Not Found
And: Visitor NOT redirected to any variant
```

---

## Fixture Files

### `e2e/fixtures/gumroad_sample.csv`
```csv
date,product_title,product_permalink,product_price,purchase_email,purchase_refunded
2024-08-15,Ultimate Notion Dashboard,notion-dashboard,$12.00,buyer1@example.com,no
2024-08-16,Ultimate Notion Dashboard,notion-dashboard,$12.00,buyer2@example.com,no
2024-08-17,Ultimate Notion Dashboard,notion-dashboard,$12.00,buyer3@example.com,yes
...  (60 rows total, 3 refunded)
```

### `e2e/helpers/auth.ts`
```typescript
export async function loginAs(page: Page, user: 'maya' | 'marcus') {
  const creds = {
    maya:   { email: 'maya@test.pricepilot.local',   password: 'MayaTest123!' },
    marcus: { email: 'marcus@test.pricepilot.local', password: 'MarcusTest123!' },
  };
  await page.goto('/login');
  await page.fill('[name=email]', creds[user].email);
  await page.fill('[name=password]', creds[user].password);
  await page.click('[type=submit]');
  await page.waitForURL('/dashboard');
}
```

### `e2e/helpers/seed.ts`
```typescript
export async function seedTestUsers(supabase: SupabaseClient) {
  // Creates Maya and Marcus with transactions and one active experiment
  // Run before each test suite (idempotent via ON CONFLICT DO NOTHING)
  await supabase.rpc('run_seed_0002');
}

export async function cleanTestData(supabase: SupabaseClient) {
  // Deletes all test data (profiles with @test.pricepilot.local emails)
  await supabase.from('profiles').delete()
    .ilike('email', '%@test.pricepilot.local');
}
```

---

## CI / CD Integration

```yaml
# .github/workflows/e2e.yml (to be created)
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    env:
      BASE_URL: ${{ secrets.VERCEL_PREVIEW_URL }}
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install chromium
      - run: npm run test:e2e
```

---

## Coverage Checklist

| Area | Test Count | Status |
|---|---|---|
| Auth (signup, login, guards) | 5 | 📋 Planned |
| Onboarding / CSV import | 4 | 📋 Planned |
| Dashboard / recommendations | 4 | 📋 Planned |
| Experiment creation | 4 | 📋 Planned |
| Live monitoring | 3 | 📋 Planned |
| Decision / rollback | 4 | 📋 Planned |
| API health checks | 3 | 📋 Planned |
| RLS isolation | 6 | 📋 Planned |
| **Total** | **33** | **0 written** |

> ✅ Tests will be implemented in the Build phase (HBS Steps 5+) against the deployed app.
