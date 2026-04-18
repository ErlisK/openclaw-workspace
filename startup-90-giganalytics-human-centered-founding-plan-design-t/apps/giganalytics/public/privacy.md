# GigAnalytics Privacy Policy

**Effective date:** 2025-01-01  
**Last updated:** 2025-07-11

---

## 1. Who We Are

GigAnalytics ("we," "us," or "our") is a lightweight analytics dashboard for freelancers and gig workers managing 2–5 income streams. Our goal is to give you actionable ROI insights while handling your financial data with the strictest care.

Contact: privacy@giganalytics.app

---

## 2. What Data We Collect

### Data You Provide

| Data | Why |
|------|-----|
| Email address | Account creation and login |
| Payment records (Stripe/PayPal/CSV) | Core analytics — true hourly rates, ROI |
| Time entries | Billable hour tracking |
| Income stream names and platforms | Organizing your data |
| Monthly income target | "What-if" pricing suggestions |
| Subscription billing info | Processed by Stripe; we never store card numbers |

### Data We Collect Automatically

| Data | Why |
|------|-----|
| Anonymous usage events (PostHog) | Product improvement (opt-out below) |
| Error logs | Bug fixing |
| Deployment metadata | Performance monitoring via Vercel |

We do **not** collect: Social Security numbers, government IDs, banking credentials, or browser fingerprints.

---

## 3. Opt-In Benchmarking and k-Anonymity

### What is the Benchmark Layer?

The GigAnalytics benchmark layer shows you how your hourly rate compares to similar freelancers. It powers the "You're in the X percentile for [platform]" insight.

### How It Works — Technical Details

**Benchmarking is strictly opt-in.** It is disabled by default.

When you opt in:

1. Once per month, an aggregate function runs across all opted-in users.
2. It computes anonymized percentile rates (p25, p50, p75, p90) grouped by:
   - Service category (e.g., "design", "coaching", "development")
   - Platform (e.g., "stripe", "paypal")
3. **k-Anonymity enforcement:** Any group with fewer than **10 contributing users** is suppressed entirely — no rates are published for that group, and you cannot reverse-engineer individuals from it.
4. Only the aggregate percentiles are stored in `benchmark_snapshots` — never your individual rate, name, or user ID.
5. The `benchmark_snapshots` table is **write-locked** at the database level: the only write path is the `aggregate_benchmark_snapshots()` security-definer function. No application code — including ours — can insert raw individual data into that table.

### What Leaves Your Account

When benchmarking is enabled, the aggregate function reads (but never stores externally) your anonymized effective hourly rate for the current month. It is combined with ≥9 other users' rates and only the group percentiles are written.

### How to Opt Out

Navigate to **Settings → Privacy → Benchmark participation** and toggle off at any time. Your data is excluded from the next monthly aggregation. Historical aggregate data (which does not contain your individual rate) is not retroactively changed.

---

## 4. How We Use Your Data

- **Deliver the product:** compute ROI, true hourly rates, heatmaps, pricing experiments
- **Improve the product:** aggregate usage analytics (PostHog events; no PII attached)
- **Billing:** process subscription payments via Stripe
- **Support:** diagnose and fix reported issues

We do **not** sell your data. We do **not** share your data with third parties for advertising.

---

## 5. Data Storage and Security

| Layer | Detail |
|-------|--------|
| Database | Supabase (PostgreSQL) with Row Level Security on every table |
| Row Level Security | Every table enforces `auth.uid() = user_id` — no cross-user data access possible |
| Service keys | Stored only in Vercel environment variables; never in source code |
| Transport | TLS everywhere (HTTPS only) |
| Stripe | PCI-compliant; we receive subscription metadata only, never card data |
| Benchmark writes | Restricted to `SECURITY DEFINER` function only; `authenticated` role has `INSERT`/`UPDATE`/`DELETE` revoked on `benchmark_snapshots` |
| Anonymous role | Explicitly revoked from all user data tables |

### RLS Table Summary

| Table | User Access | Notes |
|-------|------------|-------|
| `transactions` | Own rows only | Payment records |
| `time_entries` | Own rows only | Timer logs |
| `streams` | Own rows only | Income stream config |
| `profiles` | Own row only | Account metadata |
| `subscriptions` | Read own only | Stripe data; writes via service role only |
| `benchmark_snapshots` | Read all (aggregates only) | Write via SECURITY DEFINER only |
| `benchmark_opt_ins` | Own row only | Your opt-in preference |
| `experiments` | Own rows only | Pricing A/B tests |
| `recommendations` | Own rows only | AI suggestions |
| `acquisition_costs` | Own rows only | Ad/fee ROI |
| `user_goals` | Own row only | Income target |
| `user_settings` | Own row only | App preferences |

---

## 6. Data Retention

- Your account data is retained while your account is active.
- Deleting your account removes all rows owned by your `user_id` via `ON DELETE CASCADE`.
- Aggregate benchmark data (which does not contain your individual rate) persists for historical trend analysis.

---

## 7. Your Rights

Depending on your jurisdiction (GDPR, CCPA, etc.) you may have the right to:

- **Access** a copy of your data
- **Delete** your account and all associated data
- **Correct** inaccurate data
- **Opt out** of benchmarking at any time
- **Opt out** of usage analytics (PostHog): clear local storage key `ph_` or use a browser extension that blocks analytics

To exercise these rights: email privacy@giganalytics.app

---

## 8. Cookies and Analytics

We use **PostHog** for product analytics. PostHog events capture anonymous actions (e.g., "import completed") without PII. No advertising cookies are set. No third-party ad trackers.

---

## 9. Children

GigAnalytics is not directed at children under 13. We do not knowingly collect data from children.

---

## 10. Changes to This Policy

We will notify registered users by email of material changes. The "Last updated" date at the top of this page will always reflect the most recent revision.

---

## 11. Contact

Questions or data requests: **privacy@giganalytics.app**
