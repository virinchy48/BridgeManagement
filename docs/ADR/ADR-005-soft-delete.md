# ADR-005: Soft delete for legally admissible records

**Date:** 2026-Q1  
**Status:** Accepted  
**Deciders:** CAP_ARCHITECT, COMPLIANCE_OFFICER, BRIDGE_DOMAIN_SME

---

## Context

Several BMS entity types constitute legally admissible evidence under Australian law:

- **BridgeInspections** — inspection records are required under NSW Roads Act 1993 and referenced in bridge management plans. Deletion would break audit trails and could expose the managing authority to liability.
- **BridgeDefects** — defect records underpin Civil Liability Act 2002 due-diligence obligations. Permanent deletion of a known defect record creates legal risk.
- **BridgeRiskAssessments** — risk register records may be subpoenaed in public inquiries (e.g. Royal Commission into infrastructure failures).

Additionally, the IRAP/ISM audit logging requirement (ISM-1055) mandates that deletions be traceable. Hard deletes remove the row and make the audit trail incomplete.

Two approaches were evaluated:

1. **Hard delete** — `DELETE FROM entity WHERE ID = ?`. Simple, no storage overhead.
2. **Soft delete** — set `active = false` via a `deactivate()` bound action; filter `WHERE active = true` in all reads. Records are never permanently removed.

---

## Decision

Apply **soft delete** to `BridgeInspections`, `BridgeDefects`, and `BridgeRiskAssessments`. All three entities have `active: Boolean default true`, a `deactivate()` bound action, and `@Capabilities.DeleteRestrictions.Deletable: false`. The Fiori Elements UI does not show a Delete button for these entity types. `reactivate()` is provided to reverse accidental deactivation.

Other entities (lookup tables, configuration) use hard delete where no legal admissibility requirement exists.

---

## Rationale

Soft delete satisfies the legal admissibility and audit trail requirements without requiring a separate archive database. The `active` flag is indexed (implicit via `WHERE` clause frequency) and all list reports filter `WHERE active = true`, so deactivated records do not appear in operational views.

The `ChangeLog` entity records every deactivation event via `writeChangeLogs()` — providing a timestamped, user-attributed audit trail of who deactivated which record and when.

---

## Consequences

**Positive:**
- Records are never permanently lost — compliance with Civil Liability Act 2002 and IRAP audit requirements
- Deactivated records visible to `admin` scope for dispute resolution
- `ChangeLog` captures deactivation with `changedBy`, `changedAt`, `oldValue: active=true`, `newValue: active=false`

**Negative / trade-offs:**
- All queries on these entities must include `WHERE active = true`. A missing filter would surface deactivated records — all list reports and OData filters must be reviewed when new queries are added.
- Storage grows indefinitely — deactivated records accumulate. For a network of 50,000+ bridges over 20 years, the `BridgeDefects` table could grow to millions of rows. A future archival policy (move to cold storage after N years) may be required.
- `@Capabilities.DeleteRestrictions.Deletable: false` must be set alongside `@restrict` annotations — the Capabilities annotation controls the FE4 UI Delete button; `@restrict` controls OData-level access. Both are required (omitting `@restrict` allows any authenticated user to attempt a hard delete via raw OData).
- Bound actions `deactivate`/`reactivate` declared in `srv/services/*.cds` are only available on BridgeManagementService. AdminService projections of the same entities must separately declare these actions in `srv/admin-service.cds` and implement handlers in `srv/admin-service.js`.
