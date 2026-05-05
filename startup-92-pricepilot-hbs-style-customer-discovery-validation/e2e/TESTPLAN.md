# PricingSim — Playwright E2E Test Plan
*Last updated: 2025-04-24*

---

## Overview

All tests run against the **deployed Vercel + Supabase stack** using real HTTP.
No mocks, no local server. Tests are sequential (workers: 1) to avoid Supabase
race conditions on shared test data.

```bash
# Run all tests
BASE_URL=https://<vercel-deploy-url> npx playwright test

# Run a single suite
BASE_URL=... npx playwright test --grep "CSV Import"

# Run with headed browser (debug)
BASE_URL=... npx playwright test --headed --slowmo=500
```

---

## Fixtures

### Fixture: gumroad_sample.csv
```csv
date,product_title,product_permalink,product_price,purchase_email,purchase_refunded
2024-08-15,Ultimate Notion Dashboard,notion-dashboard,$12.00,buyer1@example.com,no
2024-08-16,Ultimate Notion Dashboard,notion-dashboard,$12.00,buyer2@example.com,no
2024-09-01,Ultimate Notion Dashboard,notion-dashboard,$12.00,buyer3@example.com,yes
... (20 rows)
```

### Test Accounts (pre-seeded via migration 0002)
| Handle | Email | Password |
|---|---|---|
| maya | maya-e2e@test.pricepilot.local | MayaE2E_Test123! |
| marcus | marcus-e2e@test.pricepilot.local | MarcusE2E_Test123! |

---

## Test Suites

### Suite 1: API Health (3 tests)
| ID | Test | Expected |
|---|---|---|
| TC-HEALTH-001 | GET /api/health | 200 + `{ status: "ok" }` |
| TC-HEALTH-002 | /api/health includes db field | `db: "connected"` |
| TC-HEALTH-003 | /api/health includes version | `version: <string>` |

---

### Suite 2: Auth — Email/Password (10 tests)
| ID | Test | Expected |
|---|---|---|
| TC-AUTH-001 | Sign up with valid email+password | Redirect to /dashboard or /onboard |
| TC-AUTH-002 | Login with valid credentials | Lands on /dashboard |
| TC-AUTH-003 | Login with wrong password | Stays on /login, error message shown |
| TC-AUTH-004 | Unauth visit to /dashboard | Redirects to /login |
| TC-AUTH-005 | Unauth visit to /experiments | Redirects to /login |
| TC-AUTH-006 | Unauth visit to /import | Redirects to /login |
| TC-AUTH-007 | Unauth visit to /suggestions | Redirects to /login |
| TC-AUTH-008 | API endpoints return 401 without session | /api/engine/recommend, /api/experiments, /api/products |
| TC-AUTH-009 | Logout clears session | /dashboard redirects to /login post-logout |
| TC-AUTH-010 | Password < 8 chars shows validation error | Stays on /signup |

---

### Suite 3: Auth — Google OAuth (5 tests)
| ID | Test | Expected |
|---|---|---|
| TC-OAUTH-001 | "Continue with Google" button visible on /login | Button present |
| TC-OAUTH-002 | "Continue with Google" button visible on /signup | Button present |
| TC-OAUTH-003 | Clicking Google button initiates OAuth redirect | URL → accounts.google.com or supabase.co/auth |
| TC-OAUTH-004 | /auth/callback with invalid code → graceful error | HTTP < 500, no crash |
| TC-OAUTH-005 | /auth/callback with missing code → graceful redirect | HTTP < 500 |

> **Note:** Full Google OAuth with real credentials cannot be automated in CI
> without a Google test account. TC-OAUTH-003 validates the redirect initiation
> only. Manual verification required for the full OAuth callback round-trip.

---

### Suite 4: CSV Import and Column Mapping (6 tests)
| ID | Test | Expected |
|---|---|---|
| TC-CSV-001 | /import page renders file upload area | Upload input/dropzone visible |
| TC-CSV-002 | Upload valid Gumroad CSV shows column mapping UI | Mapping step appears |
| TC-CSV-003 | Column mapping shows date, price, product fields | All three required fields present |
| TC-CSV-004 | Submit with correct mapping shows success + transaction count | Success message |
| TC-CSV-005 | Upload malformed CSV (missing columns) shows error | Error/warning shown |
| TC-CSV-006 | Duplicate upload does not double-count transactions | Idempotent import |

**CSV fixture format (Gumroad):**
```
date, product_title, product_permalink, product_price, purchase_email, purchase_refunded
```

---

### Suite 5: Engine — Produce Suggestions (7 tests)
| ID | Test | Expected |
|---|---|---|
| TC-ENGINE-001 | /suggestions page renders after login | No redirect to /login |
| TC-ENGINE-002 | /api/engine/recommend returns valid schema | `action` field present, valid enum |
| TC-ENGINE-003 | Suggestions page shows card or "import data" prompt | Either suggestion card or empty state |
| TC-ENGINE-004 | Suggestion card shows price, lift, confidence | $ amount and % visible |
| TC-ENGINE-005 | Suggestion includes plain-English why text | Text > 20 chars |
| TC-ENGINE-006 | /api/engine/recommend returns 401 without auth | 401 response |
| TC-ENGINE-007 | Dismiss suggestion removes it from view | Card count decreases |

---

### Suite 6: Experiments — Create, Preview, Live View (8 tests)
| ID | Test | Expected |
|---|---|---|
| TC-EXP-001 | /experiments page renders | No redirect to /login |
| TC-EXP-002 | "New experiment" button visible | Button/link present |
| TC-EXP-003 | Create form accepts two price variants | Inputs fillable without error |
| TC-EXP-004 | Created experiment has /x/:slug URL | Slug matches pattern `/x/[a-z0-9-]+` |
| TC-EXP-005 | Experiment detail page /experiments/:id renders | Route accessible |
| TC-EXP-006 | Experiment page shows Variant A and B stats | "Variant A", "Variant B" or "Control"/"Challenger" present |
| TC-EXP-007 | /x/:slug public page accessible without auth | Not redirected to /login |
| TC-EXP-008 | Confidence percentage visible on experiment page | % shown with "confidence"/"likely" text |

---

### Suite 7: Rollback Flow (7 tests)
| ID | Test | Expected |
|---|---|---|
| TC-ROLLBACK-001 | Rollback button visible on active experiment page | Button present |
| TC-ROLLBACK-002 | Rollback button is not disabled | `disabled` attribute absent |
| TC-ROLLBACK-003 | Clicking rollback shows confirmation dialog | Modal/dialog appears |
| TC-ROLLBACK-004 | Confirming rollback updates experiment status | "rolled back" / "reverted" shown |
| TC-ROLLBACK-005 | Rollback completes in < 8 seconds (< 5s target) | elapsed < 8000ms |
| TC-ROLLBACK-006 | /api/experiments/:id/rollback returns 401 without auth | 401 |
| TC-ROLLBACK-007 | Audit log entry exists post-rollback | "rollback" present in audit trail |

---

### Suite 8: RLS Cross-User Isolation (2 tests)
| ID | Test | Expected |
|---|---|---|
| TC-RLS-001 | User A /api/products only returns own products | Array returned; no cross-user leak |
| TC-RLS-002 | Accessing other-user experiment by UUID returns 404/403 | Not 200 |

---

## Coverage Summary

| Suite | Tests | Implemented |
|---|---|---|
| API Health | 3 | ✅ pricepilot.spec.ts |
| Auth — Email/Password | 10 | ✅ pricepilot.spec.ts |
| Auth — Google OAuth | 5 | ✅ pricepilot.spec.ts |
| CSV Import | 6 | ✅ pricepilot.spec.ts |
| Engine / Suggestions | 7 | ✅ pricepilot.spec.ts |
| Experiments | 8 | ✅ pricepilot.spec.ts |
| Rollback Flow | 7 | ✅ pricepilot.spec.ts |
| RLS Isolation | 2 | ✅ pricepilot.spec.ts |
| **Total** | **48** | **48 test cases** |

---

## CI Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on:
  push:
    branches: [main]
  pull_request:

jobs:
  e2e:
    runs-on: ubuntu-latest
    env:
      BASE_URL: ${{ secrets.VERCEL_PREVIEW_URL }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - name: Install deps
        working-directory: startup-92-pricepilot-hbs-style-customer-discovery-validation
        run: npm ci
      - name: Install Playwright browsers
        working-directory: startup-92-pricepilot-hbs-style-customer-discovery-validation
        run: npx playwright install chromium
      - name: Run E2E tests
        working-directory: startup-92-pricepilot-hbs-style-customer-discovery-validation
        run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: startup-92-pricepilot-hbs-style-customer-discovery-validation/e2e/playwright-report/
```

---

## Selector Strategy

Tests use `data-testid` attributes as primary selectors, falling back to semantic
text/role selectors. When implementing the app, add these `data-testid` attributes:

| data-testid | Element |
|---|---|
| `email-input` | Email field on /login and /signup |
| `password-input` | Password field |
| `signup-btn` | Submit button on /signup |
| `login-btn` | Submit button on /login |
| `logout-btn` | Logout button in nav |
| `auth-error` | Auth error message container |
| `google-oauth-btn` | "Continue with Google" button |
| `csv-upload` | File input or dropzone on /import |
| `column-mapping` | Column mapping step container |
| `import-submit` | "Import" submit button |
| `import-success` | Success message after import |
| `suggestion-card` | Individual suggestion card |
| `suggestion-why` | Why/rationale text within suggestion |
| `dismiss-suggestion` | Dismiss/reject button on suggestion |
| `new-experiment-btn` | Create new experiment button |
| `experiment-row` | Row/item in experiments list |
| `rollback-btn` | Rollback button on experiment detail |
| `confirm-rollback-btn` | Confirm button in rollback dialog |
