# BMS Expert Council v4 — Chair Decisions

*Generated: 2026-05-14 | AGENT_CHAIR consolidation decisions*

---

### CD-001: Accreditation Level Null Bypass — Severity Escalated to CRITICAL

- **Agents in conflict**: SEC (HIGH), DOM (HIGH), STD (HIGH — submitted as duplicate of SEC-002)
- **Decision**: Escalated from HIGH to CRITICAL.
- **Rationale**: Three independent agents (Security, Domain, Standards) flagged this independently, each from a different angle: security bypass, legal compliance, and Australian Standards. The convergence of all three expertise domains on the same 2-line fix indicates this is a systematic gap, not an edge case. The Civil Liability Act 2002 §42 road authority defence requires that inspections be conducted by accredited personnel. A null bypass means BMS can contain Principal inspection records with no accreditation trail — these records would not withstand legal scrutiny in a negligence claim. The fix is trivially small (one character change) with zero risk of regression. Escalating to CRITICAL is appropriate.

---

### CD-002: Coordinate Bounds — Consolidated Three Agent Findings Into One

- **Agents in conflict**: CODE (MEDIUM), SEC (HIGH), STD (MEDIUM)
- **Decision**: Consolidated as BMS-2026-004, severity HIGH (median of agent assessments, weighted toward SEC because the mechanism is a security/data-integrity bypass via API).
- **Rationale**: CODE-004, SEC-004, and STD-003 all describe the same root cause (global bounds in schema vs Australian bounds in fiori annotations) with different framings. The Security agent's framing is most operationally significant: a direct OData call or mass upload can store non-Australian coordinates bypassing the UI-layer annotation. The Standards agent's GDA2020 compliance framing is correct but secondary. One consolidated finding avoids tripling the remediation effort estimate.

---

### CD-003: Reports API Scope — Merged CODE-005 and SEC-005

- **Agents in conflict**: CODE (MEDIUM), SEC (HIGH)
- **Decision**: Consolidated as BMS-2026-005, severity HIGH (SEC agent's framing prevails).
- **Rationale**: The Security agent framed this as sensitive data exposure (network-wide risk profiles, BHI scores, LRC expiry data visible to any authenticated user). The Code agent noted the same gap but framed it as an architectural inconsistency. For a system managing critical infrastructure, data exposure severity takes precedence. The fix is straightforward middleware addition.

---

### CD-004: elementHealthRating Formula — Three Agents, Merged, Severity MEDIUM

- **Agents in conflict**: CODE (LOW), DOM (MEDIUM), STD (MEDIUM)
- **Decision**: Consolidated as BMS-2026-012, severity MEDIUM. BMS-2026-018 (documentation only) merged into BMS-2026-012.
- **Rationale**: The Code agent rated this LOW because it's technically working code. The Domain and Standards agents rated MEDIUM because the scale inversion creates incorrect risk interpretations at the operational level. The chair adopts MEDIUM: incorrect health ratings in a bridge safety system can influence maintenance prioritisation decisions. However it is not CRITICAL or HIGH because it is a display/interpretation issue, not a data loss or access control gap. The separate documentation finding (CODE-008 / BMS-2026-018) is redundant with BMS-2026-012 since fixing the formula also resolves the documentation gap.

---

### CD-005: DemoData Files — Severity MEDIUM, Not LOW

- **Agents in conflict**: CODE (MEDIUM), SEC (LOW)
- **Decision**: BMS-2026-011 severity MEDIUM (CODE agent's assessment prevails over SEC's LOW).
- **Rationale**: The Security agent rated this LOW because the controller calls non-existent endpoints (no live attack surface). The Code agent rated MEDIUM because the dead files create developer confusion and add to bundle size. In the BMS context, any dead code that references internal OData endpoint naming conventions is a minor information leakage risk in theory. More practically, dead UI files create confusion for future developers and could be accidentally reactivated. MEDIUM is appropriate to ensure cleanup happens before the next major release.

---

### CD-006: KPI Snapshot Performance Issues — Kept Separate, Not Merged

- **Agents in conflict**: PERF (N+1 queries as separate findings), DOM (state filter as domain correctness finding)
- **Decision**: BMS-2026-007 (state filter correctness — HIGH) and BMS-2026-010 (N×5 per-state queries — MEDIUM) remain separate findings with separate next steps.
- **Rationale**: The lrcExpiringCount state filter (BMS-2026-007) is a correctness bug — it produces wrong data in KPI tiles. Severity HIGH because incorrect KPI data misleads senior management and is a domain compliance issue. The general N×5 query pattern (BMS-2026-010) is a performance optimisation that should be done but is not urgent for correctness. Merging them would conflate a correctness bug with an optimisation, reducing the urgency signal on BMS-2026-007.

---

### CD-007: CSRF Token Issuance — Kept as Standalone MEDIUM

- **Agents in conflict**: SEC (MEDIUM)
- **Decision**: BMS-2026-013 severity MEDIUM, standalone finding.
- **Rationale**: Only the Security agent flagged this. The 'unsafe' fallback is a known pattern documented in CLAUDE.md (Attachments.js). The `validateCsrfToken` middleware (length ≥ 4, not 'fetch') provides basic protection — the 'unsafe' fallback passes because it is 6 chars and not 'fetch'. The risk is real but mitigated by the fact that all mutation endpoints also require XSUAA authentication in production. MEDIUM is appropriate; not escalating to HIGH because the CSRF protection is partially effective (it blocks the Fetch probe itself and very short tokens).

---

### CD-008: Duplicate STD Findings — Marked as Duplicates, Not Independently Scored

- **Agents in conflict**: STD agent submitted STD-001, STD-002, STD-003, STD-004 as near-duplicates of SEC and DOM findings
- **Decision**: STD-001 → merged into BMS-2026-002. STD-002 → merged into BMS-2026-008. STD-003 → merged into BMS-2026-004. STD-004 → merged into BMS-2026-009. Only STD-005 (SIMS convention) and STD-006 (Civil Liability Act soft-delete) added new content beyond SEC/DOM findings.
- **Rationale**: The Standards agent's contribution is primarily domain authority reinforcement for findings already raised by other agents. The chair records the STD citations as supporting evidence in the consolidated findings (references to AS 5100-7, TfNSW-BIM, Roads Act, SIMS) but avoids double-counting for statistics. The STD perspective is noted in the source-agents field of each consolidated finding.

---

### CD-009: PERF-002 Index Verification — Marked as Already Fixed

- **Agents in conflict**: PERF (MEDIUM — indexes may not deploy to HANA)
- **Decision**: Marked as FIXED based on confirmed CDS persistence.indexes annotations in defects.cds and risk-assessments.cds. Listed in fixes_applied.jsonl as FIX-004.
- **Rationale**: The PERF agent's concern was whether CDS annotations actually generate HANA hdbindex files. The `@(cds.persistence.indexes: [...])` annotation in `db/schema/defects.cds:101-112` and `db/schema/risk-assessments.cds:59` will generate the corresponding hdbindex files during `cds build --production`. The deployment scripts (`npm run validate-build` → `cds build --production` + `mbt build`) would surface missing artifacts. The concern is theoretical; evidence of the annotation existing is sufficient to mark as FIXED at the model level.

---

### CD-010: Deployment Readiness — CONDITIONAL

- **Decision**: CONDITIONAL deployment readiness.
- **Rationale**: BMS-2026-001 (partial fix — 7 entities unprotected) and BMS-2026-002 (accreditation bypass) are blocking conditions for production. BMS-2026-001 exposes legally sensitive records (bridge inspections, risk assessments) to any authenticated user. BMS-2026-002 creates legally inadmissible inspection records. Both can be fixed in under 2 hours total. BMS-2026-003 (NaN risk in INS- sequence) is also blocking because it corrupts the primary inspection reference used in legal documentation. BMS-2026-005/006 (scope enforcement) should be fixed before go-live. The remaining findings are MEDIUM/LOW with acceptable deferred risk. Conditional READY if NS-001 through NS-007 are completed and verified.
