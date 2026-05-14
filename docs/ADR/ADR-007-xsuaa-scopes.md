# ADR-007: Nine fine-grained XSUAA scopes

**Date:** 2025-Q4  
**Status:** Accepted  
**Deciders:** SECURITY_EXPERT, BTP_ARCHITECT, COMPLIANCE_OFFICER

---

## Context

BMS serves multiple user personas with distinct access needs: system administrators, bridge managers, field inspectors, executives viewing KPIs, external NHVR users viewing public data, and configuration managers controlling feature flags. Coarse role-based access (e.g. admin / read-only) would either over-privilege field staff or under-privilege certain management workflows.

Two models were evaluated:

1. **Coarse roles** — 2–3 roles (admin, operator, viewer) covering all access scenarios
2. **Fine-grained scopes** — 9 XSUAA scopes, each representing a specific capability, composed into role-templates

---

## Decision

Implement **9 XSUAA scopes** in `xs-security.json`:

| Scope | Purpose |
|---|---|
| `admin` | Full administrative access — system config, user management |
| `manage` | Create, update, deactivate bridge assets and sub-domain records |
| `operate` | Operational workflows — restrictions, work orders, route assessments |
| `inspect` | Inspection data entry — BridgeInspections, BridgeDefects, condition surveys |
| `view` | Read-only access to all entities |
| `certify` | Approve condition surveys and permits — requires qualified engineer (AS 5100-7, HVNL) |
| `config_manager` | Feature flag management — separate from admin to limit blast radius |
| `executive_view` | KPI dashboard access — read-only aggregate views |
| `external_view` | NHVR route assessment read-only — for external agency integration |

These are composed into 8 role-templates (`BMS_ADMIN`, `BMS_BRIDGE_MANAGER`, `BMS_OPERATOR`, `BMS_INSPECTOR`, `BMS_VIEWER`, `BMS_EXECUTIVE_VIEWER`, `BMS_EXTERNAL_VIEWER`, `BMS_CONFIG_MANAGER`).

---

## Rationale

**Legal obligations require scope separation.** Under HVNL and AS 5100-7, permit approvals and condition survey approvals are legal instruments requiring a qualified engineer. The `certify` scope restricts `BridgePermits.approve` and `BridgeConditionSurveys.approveSurvey` to role-collections that assert this qualification — a coarse admin/viewer split cannot enforce this.

**Principle of least privilege (ISM-0043).** Field inspectors (`inspect` scope) cannot modify bridge master data or approve permits. Bridge managers (`manage` scope) cannot change system configuration. `config_manager` is deliberately separate from `admin` to prevent accidental feature flag changes during administrative tasks.

**CAP `@restrict` enforcement.** CAP's `@restrict` annotation operates at scope level — `@restrict: [{ grant: 'CREATE', to: ['manage', 'admin'] }]` expresses fine-grained intent directly in CDS. A coarse 2-role model cannot express different write permissions on different entity types within the same service.

**Scope names are lowercase and case-sensitive.** CAP checks the exact XSUAA scope string. `BMS_ADMIN` (a role-template name) is not a valid `@restrict` `to` value — only the lowercase scope names (`admin`, `manage`, etc.) work. Capital-case role-template names pass in dummy auth but fail in production.

---

## Consequences

**Positive:**
- Least-privilege enforced at platform level — scope violations return HTTP 403 before reaching business logic
- Role-template composition is flexible — `BMS_ADMIN` includes all 9 scopes; a custom agency role can include only `inspect + view`
- `config_manager` scope limits feature flag management to designated config managers

**Negative / trade-offs:**
- 9 scopes require careful maintenance — adding a new workflow may need a new scope or an assessment of which existing scope covers it
- XSUAA scope names are case-sensitive and must exactly match `@restrict` annotations — `'Admin'` (capital A) silently passes in dummy auth and fails in production, a subtle production-only bug
- Custom Express routers (`/mass-upload/api`, `/quality/api`, etc.) are NOT protected by CAP `@restrict` — each router must apply `requireScope()` middleware explicitly. Missing this on a new router is a security gap.
- `BMS_ADMIN` must include `executive_view` and `external_view` scopes to allow admins to test every view mode — these are easy to omit because they appear UI-only but gate service projections.
- The stale SAP-generated `"admin"` role-template (description: "generated") with only the `admin` scope was removed from `xs-security.json` — it must not be re-introduced as it could be accidentally assigned via role-collection without the other required scopes.
