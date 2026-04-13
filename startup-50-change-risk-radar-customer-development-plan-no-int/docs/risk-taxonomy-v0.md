# Risk Taxonomy v0 — Change Risk Radar
**35 Concrete Event Types · January 2025**

---

## Overview

This taxonomy defines the universe of vendor changes that create business risk. Each event type is mapped to:
- **Risk Level**: High / Medium / Low
- **Risk Category**: Pricing / Legal / Operational / Security / Vendor Risk
- **Detection Method**: How we detect this type of change
- **Typical Lead Time**: How much notice vendors typically give

---

## Detection Methods

| Method | Description |
|--------|-------------|
| `pricing_page_diff` | Daily snapshot + diff of vendor pricing pages |
| `changelog_scrape` | Scrape vendor changelog RSS feeds and HTML pages |
| `tos_diff` | Daily snapshot + diff of ToS, Privacy Policy, DPA pages |
| `docs_diff` | Monitor API reference docs for changes |
| `trust_page_diff` | Monitor vendor trust/status/compliance pages |
| `news_monitor` | Monitor press releases and tech news |

---

## Pricing Changes (6 event types)

| ID | Event | Risk | Detection | Lead Time |
|----|-------|------|-----------|-----------|
| PRICE-001 | Payment Processing Fee Increase | 🔴 High | pricing_page_diff | 0–30 days |
| PRICE-002 | SaaS Subscription Tier Restructuring | 🔴 High | pricing_page_diff | 30–90 days |
| PRICE-003 | Cloud Compute/Storage Pricing Change | 🟡 Medium | changelog_scrape | 0–60 days |
| PRICE-004 | API Rate Limit or Quota Reduction | 🔴 High | docs_diff | 7–30 days |
| PRICE-005 | Platform Transaction Fee Introduction | 🔴 High | changelog_scrape | 0–60 days |
| PRICE-006 | Storage Tier or Data Egress Cost Change | 🟡 Medium | pricing_page_diff | 30–90 days |

---

## Legal & Compliance (6 event types)

| ID | Event | Risk | Detection | Lead Time |
|----|-------|------|-----------|-----------|
| LEGAL-001 | Terms of Service Material Update | 🔴 High | tos_diff | 0–30 days |
| LEGAL-002 | Privacy Policy Change Affecting Data Processing | 🔴 High | tos_diff | 0–30 days |
| LEGAL-003 | Data Processing Agreement (DPA) Update | 🔴 High | tos_diff | 30 days |
| LEGAL-004 | Acceptable Use Policy Change | 🔴 High | tos_diff | 0–30 days |
| LEGAL-005 | Compliance Certification Lapse or Change | 🔴 High | trust_page_diff | 0 days |
| LEGAL-006 | Auto-Renewal or Contract Term Change | 🟡 Medium | tos_diff | 30–90 days |

---

## Operational / API Changes (12 event types)

| ID | Event | Risk | Detection | Lead Time |
|----|-------|------|-----------|-----------|
| OPS-001 | API Endpoint Deprecation Notice | 🔴 High | changelog_scrape | 3–12 months |
| OPS-002 | Webhook Payload Format Change | 🔴 High | changelog_scrape | 30–90 days |
| OPS-003 | SDK Major Version Breaking Change | 🔴 High | changelog_scrape | 6–12 months |
| OPS-004 | OAuth Scope or Permission Change | 🔴 High | docs_diff | 30–90 days |
| OPS-005 | Service Region or Data Center Change | 🟡 Medium | changelog_scrape | 60–180 days |
| OPS-006 | Checkout Flow or UX Breaking Change | 🔴 High | changelog_scrape | 30–90 days |
| OPS-007 | App Permission or Marketplace Policy Change | 🔴 High | changelog_scrape | 30–60 days |
| OPS-008 | Email/SMS Deliverability Policy Change | 🔴 High | changelog_scrape | 30–90 days |
| OPS-009 | Logistics API or Shipping Rate Change | 🔴 High | changelog_scrape | 90–180 days |
| OPS-010 | Payroll or HR Platform Compliance Update | 🔴 High | changelog_scrape | 30–90 days |
| OPS-011 | Ad Platform Targeting or Attribution Change | 🔴 High | changelog_scrape | 30–90 days |
| OPS-012 | Database or Infrastructure Service Sunset | 🔴 High | changelog_scrape | 6–12 months |

---

## Security (5 event types)

| ID | Event | Risk | Detection | Lead Time |
|----|-------|------|-----------|-----------|
| SEC-001 | Authentication Method Requirement Change | 🔴 High | changelog_scrape | 30–90 days |
| SEC-002 | TLS/Cipher Suite Requirement Upgrade | 🔴 High | changelog_scrape | 90–180 days |
| SEC-003 | API Key Format or Rotation Policy Change | 🟡 Medium | docs_diff | 30–90 days |
| SEC-004 | Security Incident or Breach Notification | 🔴 High | trust_page_diff | 0 days |
| SEC-005 | RBAC/Permission Model Restructuring | 🟡 Medium | docs_diff | 30–90 days |

---

## Vendor Risk (4 event types)

| ID | Event | Risk | Detection | Lead Time |
|----|-------|------|-----------|-----------|
| VENDOR-001 | Vendor Acquisition or Merger Announcement | 🔴 High | news_monitor | 0 days |
| VENDOR-002 | Product Line Discontinuation | 🔴 High | changelog_scrape | 3–12 months |
| VENDOR-003 | SLA Downgrade | 🟡 Medium | tos_diff | 30–90 days |
| VENDOR-004 | Support Tier Change or Removal | 🟡 Medium | pricing_page_diff | 30–90 days |

---

## Summary

| Category | Event Types | High Risk | Medium Risk |
|----------|-------------|-----------|-------------|
| Pricing | 6 | 4 | 2 |
| Legal | 6 | 5 | 1 |
| Operational | 12 | 11 | 1 |
| Security | 5 | 3 | 2 |
| Vendor Risk | 4 | 3 | 1 |
| **Total** | **33** | **26** | **7** |

*Note: 2 additional event types (PRICE-003, OPS-005) are medium risk*

---

## Vendor Coverage

Vendors currently monitored for each detection method:

**Changelog Scraping (30 vendors)**: Stripe, Shopify, AWS, GitHub, Cloudflare, Twilio, SendGrid, HubSpot, Salesforce, Slack, Zoom, Okta, Plaid, Intercom, Zendesk, QuickBooks, Xero, PayPal, Klaviyo, Mailchimp, Google Workspace, Meta Ads, Google Ads, Chargebee, Recurly, Vercel, Heroku, Datadog, PagerDuty, Netlify

**Pricing Page Diffs**: Stripe, Shopify, AWS, GitHub, Slack, Intercom, Zendesk, PayPal, Klaviyo, Cloudflare, Okta, HubSpot

**ToS/Legal Diffs**: Stripe, Shopify, AWS, Google Workspace, Salesforce, Okta, GitHub, Twilio, HubSpot, Slack, Zoom, PayPal, Klaviyo, Zendesk, Intercom
