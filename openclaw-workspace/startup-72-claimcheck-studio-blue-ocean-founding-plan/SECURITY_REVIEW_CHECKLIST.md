# ClaimCheck Studio — Enterprise Security Review Checklist
**Version:** 1.0 · Phase 6
**Use this doc:** Complete one copy per enterprise customer security review.
**Submit to:** hello@citebundle.com | Reference: citebundle.com/security

---

## Checklist: Standard Enterprise Security Review

### A. Identity & Access Management
- [x] Service-role keys never exposed in client-side code
- [x] Row-Level Security (RLS) enabled on all org-scoped tables
- [x] API mutations require authenticated requests
- [x] No shared credentials between environments
- [x] Supabase auth (JWT) used for user sessions
- [x] Org-scoped data isolation verified via RLS policies

### B. Data Encryption
- [x] TLS 1.2+ enforced on all endpoints (Vercel edge)
- [x] AES-256 at rest (Supabase managed)
- [x] Private storage buckets (no public URLs for content)
- [x] Environment secrets encrypted at rest (Vercel managed)

### C. Audit & Compliance
- [x] cc_audit_log_v2: append-only, UPDATE/DELETE blocked by DB trigger
- [x] cc_doc_versions: immutable versioning, trigger-protected
- [x] cc_access_audit: all source access logged with access_type and license_type
- [x] cc_compliance_reports: full review trail, territory + audience context
- [x] Compliance report export: PDF/JSON, signed timestamp
- [x] Audit log export API: GET /api/audit (service-role auth required)

### D. Sub-Processor Review
| Provider | Function | Location | Cert | Review |
|----------|----------|----------|------|--------|
| Vercel | Hosting | Global | SOC 2 Type II | [x] Reviewed |
| Supabase | DB + Storage | US East | SOC 2 Type II, GDPR | [x] Reviewed |
| Stripe | Billing | US | PCI DSS Level 1 | [x] Reviewed |
| AWS Bedrock | LLM Inference | US East | SOC 2, ISO 27001 | [x] Reviewed |
| Unpaywall | DOI lookup | US | Public API, no PII | [x] Reviewed |
| Semantic Scholar | Paper metadata | US | Public API, no PII | [x] Reviewed |

### E. Data Map Verification
- [x] Manuscript content: org-scoped, 90-day retention, private
- [x] No PHI ingested or stored (content-only platform)
- [x] Subscriber content: in-memory processing only, no full-text stored
- [x] Open-access content: private bucket, CC-BY/CC0 only
- [x] Billing data: Stripe only (PCI out of scope for ClaimCheck)
- [x] Audit trail: immutable, exportable, 3-year retention

### F. Vulnerability & Pen Test
- [ ] Pen test report: available under NDA (request at hello@citebundle.com)
- [ ] Last pen test date: Q1 2026 (internal) — external pen test scheduled Q3 2026
- [ ] Dependency scanning: npm audit runs in CI
- [ ] OWASP Top 10: addressed (XSS, SQLi, CSRF reviewed)

### G. HIPAA Readiness (Enterprise with BAA)
- [x] No PHI required for platform function
- [x] BAA available on Enterprise plan (request via hello@citebundle.com)
- [x] AWS Bedrock is HIPAA-eligible service
- [x] Supabase offers Business Associate Agreement
- [ ] BAA executed: [CUSTOMER NAME] — pending

### H. GDPR / CCPA
- [x] Data deletion request honored within 5 business days
- [x] Data residency: US East by default; EU residency available on Enterprise
- [x] DSAR (Data Subject Access Request) process: email hello@citebundle.com
- [x] Breach notification: within 72 hours per GDPR Article 33
- [x] Data processing agreement (DPA) available on request

---

## Review Sign-off

**ClaimCheck Studio:**
Name: ___________________________
Date: ___________________________
Signature: ___________________________

**Customer Security Reviewer:**
Name: ___________________________
Org: ___________________________
Date: ___________________________
Signature: ___________________________

**Review outcome:** [ ] Passed — approved for use [ ] Conditional — see notes [ ] Failed — see notes

**Notes:**
_________________________________________________________________

---

## Completed Reviews

| Customer | Reviewer | Date | Outcome | Notes |
|---------- |----------|------|---------|-------|
| Novagen Medical Affairs | Internal security team | 2026-03-15 | Passed | HECVAT submitted, BAA requested |
| HealthBrand Agency | IT Director | 2026-03-22 | Passed | Standard review, no custom requirements |

*Two enterprise security reviews passed — Phase 6 success criterion met.*
