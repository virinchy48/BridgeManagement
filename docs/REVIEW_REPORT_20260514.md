# BMS Expert Council v4 — Review Report

**Date**: 2026-05-14  
**Classification**: Internal — Infrastructure Management System  
**Prepared by**: Expert Council v4 (AGENT_CODE, AGENT_SECURITY, AGENT_DOMAIN, AGENT_STANDARDS, AGENT_PERF, AGENT_CHAIR)

---

## 1. Council Composition and Mandate

The BMS Expert Council v4 was convened to conduct a comprehensive pre-production review of the Bridge Management System prior to its SAP BTP Cloud Foundry deployment. Five specialist agents produced independent findings which were consolidated and adjudicated by the AGENT_CHAIR.

| Agent | Domain | Mandate |
|---|---|---|
| AGENT_CODE | Code quality and correctness | Identify defects, dead code, NaN-producing patterns, missing guards |
| AGENT_SECURITY | Application security | Identify access control gaps, CSRF weaknesses, data exposure risks |
| AGENT_DOMAIN | Bridge engineering and compliance | Identify violations of road authority obligations, Civil Liability Act requirements |
| AGENT_STANDARDS | Australian standards (AS 5100, SIMS, TfNSW-BIM, Roads Act) | Identify non-compliance with formal engineering and legal standards |
| AGENT_PERF | Performance and scalability | Identify N+1 queries, memory risks, unscalable patterns |
| AGENT_CHAIR | Consolidation and arbitration | Resolve conflicts, assign canonical IDs, produce deliverables |

---

## 2. Scope

**Repository**: Bridge Management System (BMS)  
**Branch reviewed**: `claude/distracted-hofstadter-c3d77a`  
**Commit basis**: `dda8fe7` (UAT 2026-05-12 learnings in CLAUDE.md)

| Layer | Files reviewed | Lines of code |
|---|---|---|
| Backend (srv/\*.js, srv/handlers/) | 21 files | 12,584 |
| Database schema (db/schema/\*.cds, db/schema.cds) | 18 files | 2,219 |
| Frontend (app/\*\*/\*.js, app/\*\*/\*.xml) | ~85 files | 17,954 |
| **Total** | **~124 files** | **32,757** |

**Schema entities surveyed**: 87 (confirmed via recon.json)  
**Service handlers surveyed**: 18 handler registrations  
**Custom Express routers surveyed**: 11 custom API paths  

---

## 3. Key Statistics

| Metric | Count |
|---|---|
| Total raw findings (across 5 agents) | 29 |
| Unique canonical findings (after deduplication) | 18 |
| Duplicates merged | 11 |
| Fully fixed in prior sprints | 5 |
| Partially fixed | 5 |
| Open and unaddressed | 8 |
| **Critical** | **2** |
| **High** | **6** |
| **Medium** | **6** |
| **Low** | **4** |

**Fix rate**: 28% of unique findings fully resolved before this review; a further 28% partially addressed.

---

## 4. Top 5 Risks If Left Unfixed

### Risk 1 — Legally Invalid Inspection Records (BMS-2026-002)
**Likelihood**: HIGH | **Impact**: CRITICAL

The inspector accreditation null bypass allows Principal and Detailed inspection records to be created without a valid accreditation level. Under TfNSW-BIM §3.1 and AS 5100-7 §3.2, such records are not legally valid for the road authority's statutory defence under Civil Liability Act 2002 §42. If BMS is used as the system of record for bridge inspections and a negligence claim is filed, inspection records without valid accreditation could be challenged in court. The fix requires one line of code.

### Risk 2 — Unauthorised Modification of Safety Records (BMS-2026-001)
**Likelihood**: MEDIUM (requires an authenticated user) | **Impact**: CRITICAL

Seven AdminService entities — including BridgeRiskAssessments, AlertsAndNotifications, and BridgeInspectionElements — are accessible for write operations by any authenticated user. A BMS_VIEWER with read-only access can POST to the OData endpoint and modify or create safety-critical records. This violates the principle of least privilege and creates an audit trail gap: changes made without proper scope cannot be attributed to an authorised role.

### Risk 3 — Corrupted Inspection Reference Registry (BMS-2026-003)
**Likelihood**: LOW (requires an unusual inspectionRef value) | **Impact**: HIGH

The INS- sequence extraction in `inspections.js` uses `String.replace()` rather than regex. A single malformed or empty `inspectionRef` in the database will cause all subsequent INS- sequences to be generated as 'INS-0NaN'. The inspection reference is the primary identifier used in NHVR communications, legal documents, and cross-system references. Corrupted INS- references cannot be reverse-engineered from the UUID primary key without manual DB intervention. All other auto-ref handlers were fixed in a prior sprint; this one was missed.

### Risk 4 — Incorrect Network Risk Statistics in Executive Reports (BMS-2026-008)
**Likelihood**: HIGH (affects all bridges) | **Impact**: HIGH

The condition rating classification in `conditionKey()` uses 1-5 thresholds against a 1-10 stored scale. Any bridge with a condition rating of 6-10 (poor to critical on the AS 5100 scale) is classified as 'good' in all network reports, risk registers, and KPI tiles. This means the reports API systematically under-reports network risk. Senior leadership making investment decisions based on these reports will see a significantly rosier picture than the actual asset condition warrants.

### Risk 5 — Any Authenticated User Can Access Sensitive Infrastructure Risk Data (BMS-2026-005)
**Likelihood**: HIGH (intentional access by any user with credentials) | **Impact**: MEDIUM

The reports API and BHI/BSI assessment API require only authentication, not a specific role. A BMS_INSPECTOR (who should only record inspections) can retrieve the full network risk register, data quality scores, BHI/BSI structural assessments, and LRC expiry data. For a system managing critical national infrastructure, this data should be restricted to management and executive scopes.

---

## 5. Deployment Readiness Verdict

### CONDITIONAL — NOT READY for production until 7 blocking conditions resolved

The BMS system is functionally feature-complete, has passed UAT smoke testing, and the codebase is well-structured. The architecture correctly follows CAP patterns, security headers are applied via Helmet, CSRF protection is implemented, audit logging covers primary entities, and the deployment pipeline (MTA/BTP) is proven functional.

**However, 7 findings must be resolved before production deployment:**

| # | Finding | Effort | Risk if skipped |
|---|---|---|---|
| 1 | BMS-2026-001: @restrict on 7 entities | 1 hr | Unauthorised write to safety records |
| 2 | BMS-2026-002: Accreditation null bypass | 15 min | Legally invalid inspection records |
| 3 | BMS-2026-003: INS- NaN sequence | 5 min | Corrupted inspection reference registry |
| 4 | BMS-2026-004: Australian lat/lon bounds | 30 min | Non-Australian coordinates stored silently |
| 5 | BMS-2026-005: Reports/BHI scope | 2 hr | Infrastructure risk data exposed to viewers |
| 6 | BMS-2026-006: Attributes API scope | 1 hr | Attribute definitions modifiable by any user |
| 7 | BMS-2026-008: conditionKey scale | 1 hr | Systematically wrong risk reports |

**Total estimated remediation time for blocking items: ~6 hours of dev work.**

After resolving the 7 blocking conditions, the system may be deployed with the remaining 11 findings tracked as post-launch backlog (BMS-2026-007 through BMS-2026-018).

---

## 6. Sign-off Table

| Agent | Domain | Findings raised | Verdict |
|---|---|---|---|
| AGENT_CODE | Code quality | 8 raw → 6 unique | CONDITIONAL |
| AGENT_SECURITY | Application security | 8 raw → 6 unique | NOT READY (until BMS-2026-001, 002, 005, 006 fixed) |
| AGENT_DOMAIN | Bridge engineering | 7 raw → 4 unique | CONDITIONAL |
| AGENT_STANDARDS | AS 5100 / TfNSW / Roads Act | 6 raw (4 duplicates) → 2 unique | CONDITIONAL |
| AGENT_PERF | Performance and scalability | 5 raw → 4 unique | CONDITIONAL |
| **AGENT_CHAIR** | **Consolidated** | **18 canonical findings** | **CONDITIONAL** |

All agents concur: the system architecture is sound and the codebase reflects significant engineering effort. The blocking findings are targeted and addressable within a single sprint day.

---

## 7. Reference Documents

- Full findings with recommendations: [`docs/CONSOLIDATED_FINDINGS_REGISTER.md`](CONSOLIDATED_FINDINGS_REGISTER.md)
- Ordered remediation steps: [`docs/NEXT_STEPS.md`](NEXT_STEPS.md)
- Conflict resolution decisions: [`docs/CHAIR_DECISIONS.md`](CHAIR_DECISIONS.md)
- Source findings (per-agent): `.council/findings_code.jsonl`, `.council/findings_security.jsonl`, `.council/findings_domain.jsonl`, `.council/findings_standards.jsonl`, `.council/findings_perf.jsonl`
- Fixes already applied: `.council/fixes_applied.jsonl`
- Repository survey: `.council/recon.json`

---

*This report was produced by the BMS Expert Council v4 automated review system on 2026-05-14. All findings are based on static analysis of the `claude/distracted-hofstadter-c3d77a` worktree. Dynamic analysis (runtime testing, penetration testing) is out of scope for this review.*
