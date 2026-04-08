# ClaimCheck Studio — Service Level Agreement (SLA) Policy
**Version:** 1.0 · Phase 6 Operational Release
**Effective date:** 2026-04-01
**Contact:** hello@citebundle.com | citebundle.com

---

## 1. Service Availability

### 1.1 Uptime Commitment

| Plan | Monthly Uptime SLA | Measurement Window |
|------|-------------------|--------------------|
| Starter ($49/mo) | Best-effort (no SLA) | — |
| Pro ($149/mo) | 99.0% (best-effort target) | Rolling 30 days |
| Enterprise | **99.5% guaranteed** | Rolling 30 days |
| Enterprise (premium) | 99.9% (negotiated) | Rolling 30 days |

**Uptime** is defined as: the ClaimCheck Studio platform (app.citebundle.com + all API endpoints) returning 2xx/3xx responses within 5 seconds on ≥95% of synthetic health checks.

**Excluded from uptime calculation:**
- Scheduled maintenance (announced ≥24h in advance)
- Third-party outages outside ClaimCheck's direct control (PubMed API, CrossRef, Unpaywall)
- Force majeure events
- Customer-caused service degradation

### 1.2 Measurement
Uptime is measured via 15-minute synthetic checks logged in `cc_uptime_checks`. Reports available at `citebundle.com/admin`.

---

## 2. Review SLA (Peer Review Microcommunity)

| Plan | First Reviewer Assigned | Verdict Delivered | SLA Type |
|------|------------------------|-------------------|----------|
| Starter | Best-effort (72h) | Best-effort (72h) | None |
| Pro | Within 48h | Within 72h | Best-effort |
| Enterprise | **Within 24h** | **Within 48h** | Guaranteed |
| Enterprise (premium) | Within 12h | Within 24h | Guaranteed |

**SLA clock starts** when a microtask is created (i.e., a claim is submitted for peer review).
**SLA clock stops** when a reviewer submits a verdict.
**Escalation:** If no reviewer accepts within 50% of SLA window, task is automatically re-queued to standby reviewer pool. Logged in `cc_sla_events`.

---

## 3. Credit Policy

### 3.1 Uptime Credits (Enterprise only)

| Monthly Uptime | Service Credit |
|---------------|----------------|
| 99.0% – 99.5% | 10% of monthly fee |
| 98.0% – 99.0% | 25% of monthly fee |
| 95.0% – 98.0% | 50% of monthly fee |
| < 95.0% | 100% of monthly fee |

### 3.2 Review SLA Credits (Enterprise only)

| Breach | Service Credit |
|--------|---------------|
| First breach in calendar month | Waived (goodwill) |
| 2nd–3rd breach | 5% of monthly fee per breach |
| 4th+ breach | 10% of monthly fee per breach |

### 3.3 Credit Conditions
- Credits must be requested within 30 days of the incident
- Credits are applied to the next invoice; not refunded as cash
- Credits are the sole remedy for SLA breaches unless otherwise stated in a Master Service Agreement (MSA)

---

## 4. Time-to-Resolution (TTR) SLA

| Priority | Definition | TTR Target |
|----------|------------|-----------|
| P0 | Service down (≥30% endpoints returning 5xx) | ≤4 hours |
| P1 | Major degradation (p95 latency >2s, >20% error rate) | ≤8 hours |
| P2 | Review SLA near-breach, partial feature unavailability | ≤24 hours |
| P3 | Minor issues, cosmetic, single-user impact | ≤72 hours |

**TTR target for Phase 6 success criteria:** ≤8 hours for all P0/P1 incidents.

---

## 5. Maintenance Windows

- **Scheduled maintenance:** Sundays 02:00–04:00 UTC. Announced ≥24h in advance via status page and email.
- **Emergency maintenance:** May occur without notice. Counted against uptime if >15 minutes.
- **Database migrations:** Run during scheduled windows. cc_schema_migrations table logs all DDL changes.

---

## 6. Incident Communication

| Priority | Initial Notification | Update Frequency | Resolution Notification |
|----------|---------------------|-----------------|------------------------|
| P0 | Within 15 minutes | Every 30 minutes | Within 1 hour of resolution |
| P1 | Within 30 minutes | Every 1 hour | Within 2 hours of resolution |
| P2 | Within 2 hours | On change | Within 24 hours |
| P3 | Within 24 hours | On resolution | On resolution |

Enterprise customers receive direct email notification.
Status page: citebundle.com/status (planned) or Vercel status badge.

---

## 7. Data and Security SLA

| Commitment | Target |
|-----------|--------|
| Audit trail export turnaround | Within 5 business days |
| Data deletion request | Within 5 business days |
| Security questionnaire (HECVAT) response | Within 5 business days |
| Data breach notification (GDPR Art. 33) | Within 72 hours |
| BAA execution (Enterprise) | Within 10 business days |

---

## 8. Support SLA

| Plan | Support Channel | First Response |
|------|----------------|----------------|
| Starter | Email (hello@citebundle.com) | 3 business days |
| Pro | Email | 1 business day |
| Enterprise | Email + Slack | 4 business hours |
| Enterprise (premium) | Email + Slack + Video | 2 business hours |

---

## 9. Reviewer Pool Quality Guarantees (Enterprise)

| Metric | Guarantee |
|--------|-----------|
| Reviewer acceptance rate | ≥85% pool average |
| Inter-rater agreement (κ) | ≥0.70 pool average |
| Dispute rate | ≤5% pool average |
| Reviewer credentials | ≥ORCID-verified, relevant domain |

If pool metrics fall below guarantees for any 7-day period, ClaimCheck Studio will:
1. Notify enterprise customers within 24h
2. Implement remediation within 72h (calibration, standby pool activation, or reviewer replacement)
3. Issue credit if affected tasks are verifiably impacted

---

## 10. Exceptions and Escalation

Enterprise customers may escalate unresolved incidents to hello@citebundle.com with subject line `[SLA ESCALATION] <incident_id>`. ClaimCheck Studio will acknowledge within 2 business hours and assign a named account manager.

---

## 11. SLA Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-01 | Initial release — Phase 6 operational |

---

*This policy is part of the ClaimCheck Studio Master Service Agreement. Enterprise customers: request MSA at hello@citebundle.com*
*Runbooks: citebundle.com/runbooks · Dashboard: citebundle.com/admin · Security: citebundle.com/security*
