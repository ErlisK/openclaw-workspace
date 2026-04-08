# ClaimCheck Studio — SOC 2 Type I Readiness Plan
**Target certification date:** September 30, 2026
**Version:** 1.0 · Phase 6
**Status:** 🟡 In progress — 80%+ of controls implemented or evidenced

---

## 1. Overview

ClaimCheck Studio is pursuing SOC 2 Type I certification to satisfy enterprise procurement requirements and demonstrate a mature security posture for healthcare and pharmaceutical customers.

**Scope:** ClaimCheck Studio SaaS platform (citebundle.com), including:
- Claim extraction and evidence matching pipeline
- Peer review microcommunity and audit trail
- Citation bundle generation and CMS export
- Compliance report generation

**Service Commitments:** Availability (A1) and Security (CC1–CC9), with Privacy (P1) for EU customers.

---

## 2. Readiness Status by TSC Category

### CC1 – Control Environment (3/3 controls: 100% ready)
- ✅ CC1.1 Board/management oversight — documented, reviewed quarterly
- ✅ CC1.2 CISO role defined — founder-as-CISO until Type II
- ✅ CC1.3 Background checks — NDAs + ORCID credential verification

### CC2 – Communication and Information (2/2: 100%)
- ✅ CC2.1 Security policies communicated — citebundle.com/security + runbooks
- ✅ CC2.2 Incident communication — SLA_POLICY.md P0–P3 matrix

### CC3 – Risk Assessment (2/2: 50% ready)
- 🟡 CC3.1 Annual risk assessment — in progress, Q3 2026
- ✅ CC3.2 Fraud risk — reviewer badge system + arbitration

### CC4 – Monitoring (2/2: 50%)
- ✅ CC4.1 Continuous monitoring — cc_uptime_checks (15 min), cron jobs
- 🟡 CC4.2 Internal audit — quarterly self-audit; external pen test Q3 2026

### CC5 – Control Activities (3/3: 100%)
- ✅ CC5.1 Policies documented — SLA_POLICY.md, SECURITY_REVIEW_CHECKLIST.md
- ✅ CC5.2 Change management — GitHub PRs, cc_schema_migrations
- ✅ CC5.3 Business continuity — Supabase PITR, Vercel zero-downtime

### CC6 – Logical Access (7/7: 100%)
- ✅ CC6.1 Access provisioning — service-role server-side only
- ✅ CC6.2 Authentication — Supabase Auth + SAML/OIDC SSO
- ✅ CC6.3 Authorization — RLS on all 66 cc_ tables
- ✅ CC6.4 Access revocation — Supabase user deactivation + key rotation log
- ✅ CC6.5 Least privilege — anon key restricted by RLS
- ✅ CC6.6 Encryption — TLS 1.2+ in transit, AES-256 at rest
- 🟡 CC6.7 Vulnerability management — npm audit in CI; external pen test Q3 2026

### CC7 – System Operations (4/4: 75%)
- ✅ CC7.1 Infrastructure monitoring — Vercel + Supabase + synthetic checks
- ✅ CC7.2 Anomaly detection — cc_audit_log_v2 immutable event stream
- ✅ CC7.3 Incident response — 5 runbooks at citebundle.com/runbooks
- ✅ CC7.4 Recovery — PATCH /api/sla + postmortem process

### CC8 – Change Management (1/1: 100%)
- ✅ CC8.1 SDLC controls — GitHub PRs + Vercel preview + schema versioning

### CC9 – Risk Mitigation (2/2: 100%)
- ✅ CC9.1 Vendor risk — 6 sub-processors reviewed, citebundle.com/security
- ✅ CC9.2 BAAs — HIPAA BAA via Supabase; documented

### A1 – Availability (3/3: 100%)
- ✅ A1.1 Availability monitoring — 99.5% SLA, cc_uptime_checks
- ✅ A1.2 Capacity planning — Vercel auto-scale + PgBouncer
- ✅ A1.3 Disaster recovery — PITR backups, RTO 4h

### P1 – Privacy (4/4: 75%)
- ✅ P1.1 Privacy notice — citebundle.com/security data map
- ✅ P1.2 DPIA — 3 DPIAs in cc_dpia_records
- ✅ P1.3 Data subject rights — 5-day deletion SLA
- ✅ P1.4 Data minimization — cc_data_inventory, 10 tables classified

---

## 3. Gap Closure Timeline

| Gap | Owner | Target |
|-----|-------|--------|
| External penetration test | CTO + security firm | Q3 2026 (Aug) |
| Formal risk register | CTO | Q2 2026 (Jun) |
| Employee security training records | CTO | Q2 2026 (May) |
| Vendor risk reassessments (annual) | CTO | Q3 2026 |
| SOC 2 auditor engagement | CTO | Q3 2026 (Jul) |
| Type I audit window | Auditor | Aug–Sep 2026 |
| Type I report | Auditor | Sep 30, 2026 |

---

## 4. Evidence Inventory

| Control | Evidence Location | Format |
|---------|------------------|--------|
| CC6.3 RLS policies | cc_rls_audit table | DB query |
| CC7.1 Uptime monitoring | cc_uptime_checks + citebundle.com/admin | Dashboard |
| CC7.3 Incident runbooks | citebundle.com/runbooks | Web page |
| CC5.1 Security policies | SECURITY_REVIEW_CHECKLIST.md + citebundle.com/security | Markdown + Web |
| A1.1 Uptime SLA | cc_sla_incidents + cc_uptime_checks | DB + Dashboard |
| P1.2 DPIAs | cc_dpia_records | DB |
| CC8.1 Change management | GitHub commit history + cc_schema_migrations | GitHub + DB |
| CC7.2 Audit trail | cc_audit_log_v2 (immutable, trigger-protected) | DB |
| CC6.6 Encryption | Vercel dashboard + Supabase dashboard | Screenshots |
| CC9.1 Sub-processors | SECURITY_REVIEW_CHECKLIST.md + citebundle.com/security | Markdown + Web |

---

## 5. Auditor Engagement Plan

**Auditor selection:** Target CPA firm with SaaS SOC 2 experience (Johanson Group, Schellman, or BARR Advisory)
**Engagement type:** Type I (point-in-time, no evidence period)
**Estimated cost:** $12,000–$18,000 for Type I
**Prep time:** 4–6 weeks of evidence gathering
**Timeline:** Engage auditor July 2026 → audit August 2026 → report September 2026

---

*Dashboard: citebundle.com/compliance · Security page: citebundle.com/security · Contact: hello@citebundle.com*
