# SAP Partner Application Certification (PAC) Readiness

Bridge Management System (BMS) — v1.7.2 | Updated: 2026-05-14  
Assessed by: SAP_PAC_SPECIALIST persona against BTP Certified App criteria

---

## Executive Summary

BMS is a single-tenant SAP BTP Cloud Foundry application. It is **not currently ready for SAP PAC submission**. The two blocking gaps are the unregistered PSTN namespace (`bridge.management`) and the absence of multi-tenancy. All other categories are partially or fully compliant. Estimated remediation effort before submission: 8–12 weeks.

---

## PAC Checklist

### Category 1: Namespace (PSTN)

| Check | Status | Detail |
|---|---|---|
| Registered PSTN namespace in use | **FAIL** | `bridge.management` namespace is not registered with SAP. SAP PAC requires all CDS entities and OData service namespaces to use a registered partner namespace (format: `com.partner-shortname.appname`). |
| Namespace consistency across MTA modules | Pass | All entities consistently use `bridge.management` or `nhvr` — no mixed namespacing |
| No `sap.*` namespace usage in custom code | Pass | No `sap.*` entities defined in custom CDS files |

**Action required:** Register a PSTN namespace at [partneredge.sap.com](https://partneredge.sap.com) before submission. Rename all `bridge.management.*` entities to the registered namespace. This is a breaking schema migration — all HDI artefacts, seed CSVs, OData service paths, and manifest.json data sources must be updated.

---

### Category 2: BTP Multi-Tenancy

| Check | Status | Detail |
|---|---|---|
| Tenant isolation implemented | **FAIL** | BMS is single-tenant. Each deployment serves one customer. SAP PAC for SaaS delivery requires HANA HDI tenant isolation, XSUAA tenant-aware configuration, and subscriber-specific data separation. |
| Onboarding/offboarding API | **FAIL** | No subscription/deprovisioning API implemented. BTP SaaS Registry service not declared in mta.yaml. |
| Tenant-aware routing | **FAIL** | App Router (`app/router`) uses a static `xs-app.json` — no tenant-header-based routing. |

**Action required:** Multi-tenancy is a significant architectural change. If single-tenant deployment per customer (separate BTP subaccounts) is the target model, this requirement may be waived — discuss with SAP Partner Certifications team.

---

### Category 3: Security

| Check | Status | Detail |
|---|---|---|
| XSUAA authentication on all endpoints | Pass | XSUAA configured in `xs-security.json`; all OData services require authenticated-user; custom routers use `requireScope()` middleware |
| CSRF protection on mutating endpoints | Pass | `validateCsrfToken` middleware on all POST/PUT/DELETE routes; rejects empty, short, or literal "fetch" tokens |
| No hardcoded credentials | Pass | All secrets via `VCAP_SERVICES`; `hereApiKey` excluded from AdminService projection |
| Helmet CSP headers | Pass | `srv/server.js` configures Helmet with content-security-policy, HSTS, X-Frame-Options |
| `'unsafe-eval'` in CSP script-src | Partial | Required for UI5 1.145 `requireSync` loader. Essential Eight application control maturity is reduced. Mitigate by upgrading to UI5 async loading when UI5 version allows. |
| Input validation at system boundaries | Pass | ISO date strings validated via regex; numeric query params capped with Math.max/min; field allowlists on dynamic property lookups |
| Row-level security via `@restrict` | Pass | All writable entities have `@restrict` annotations with scope requirements |
| No SQL injection risk | Pass | All queries use parameterised CDS queries — no string-concatenated SQL |

---

### Category 4: Accessibility (WCAG 2.1 AA)

| Check | Status | Detail |
|---|---|---|
| SAP Fiori Elements apps | Partial | `app/admin-bridges` uses FE4 with SAP UI5 — inherits WCAG AA from framework. No independent audit. |
| Custom XML view apps | Partial | Uses `sap.m` controls (accessible); Leaflet map has no keyboard navigation for feature selection; camera input via programmatic DOM `<input>` may not be screen-reader accessible |
| Colour contrast | Unknown | No contrast audit performed. Custom CSS in dashboard and map apps not reviewed. |
| Audit report | **FAIL** | SAP PAC requires a WCAG audit report. None produced. |

---

### Category 5: Performance and Scalability

| Check | Status | Detail |
|---|---|---|
| OData pagination ($top/$skip) | Pass | CAP enforces default $top limits; list reports use FE4 growing table |
| No unbounded queries | Partial | `/bhi-bsi/api/network-summary` capped at 200 bridges; reports API endpoints use `LIMIT` clauses; map viewport guarded at zoom < 8 |
| Load test results | **FAIL** | No formal load test performed. SAP PAC expects NFR evidence. |
| HANA column store design | Partial | `ChangeLog` has 6 persistence indexes; no column-store hints on other high-volume entities |

---

### Category 6: Data Quality and Governance

| Check | Status | Detail |
|---|---|---|
| Audit trail | Partial | `ChangeLog` entity with timestamps and user attribution; only `upload.js` and `admin-service.js` call `writeChangeLogs()` — 17 of 19 handler files do not audit-log mutations |
| Data retention policy | **FAIL** | No data retention or PII deletion workflow defined |
| Data classification | **FAIL** | No PII classification on `BridgeContacts` (name, phone, email) |

---

### Category 7: Supportability

| Check | Status | Detail |
|---|---|---|
| SAP BTP Application Logging | Pass | `BridgeManagement-logging` (application-logs) declared in mta.yaml |
| Health check endpoint | Unknown | CAP provides `/$metadata` liveness; no dedicated `/health` endpoint for BTP health monitoring |
| Correlation IDs | Unknown | Not verified whether X-CorrelationID header is propagated through custom Express routers |
| Error handling | Partial | 16 of 19 handler files lack try/catch — unhandled promise rejections crash the process |

---

### Category 8: SAP Fiori Guidelines Compliance

| Check | Status | Detail |
|---|---|---|
| Semantic objects and FLP intents | Pass | All 18 tiles registered with semantic object and action in `fioriSandboxConfig.json` |
| Fiori Elements for structured CRUD | Pass | `app/admin-bridges` uses FE4 ListReport + ObjectPage patterns |
| Custom apps use `sap.m` controls | Pass | No `sap.ui.commons` deprecated controls used |
| Shell bar title per route | Pass | Each routing target has a `"title"` property in `manifest.json` |
| Draft workflow | Pass | `@odata.draft.enabled` on Bridges; composition children with standalone CRUD changed to Association to avoid draft constraint |

---

## PSTN Namespace Registration

**Required namespace format:** `com.<partner-id>.<app-id>` (e.g. `com.acme.bridgemanagement`)

**Registration process:**
1. Log into [SAP PartnerEdge](https://partneredge.sap.com) with the partner account
2. Navigate to Build → Manage Products → Register Namespace
3. Submit the requested namespace string; approval typically takes 2–5 business days
4. After approval, perform the namespace migration:
   - Rename all `bridge.management.*` CDS entities to the new namespace
   - Update all `using` statements in service `.cds` files
   - Update all seed CSV filenames (`bridge.management-Bridges.csv` → `com.acme.bridgemanagement-Bridges.csv`)
   - Update OData service paths in all `manifest.json` data source `uri` fields
   - Regenerate HANA HDI artefacts via `cds build --production`
   - Re-deploy to HANA Cloud via `cf deploy`

---

## Submission Timeline

| Milestone | Estimated Effort | Prerequisite |
|---|---|---|
| PSTN namespace registration | 1 day (admin) | PartnerEdge partner account |
| Namespace migration across codebase | 5–8 days (dev) | Registered namespace |
| Multi-tenancy assessment (waiver or implement) | 2–4 weeks | Architecture decision |
| WCAG audit and remediation | 2–3 weeks | External accessibility auditor |
| Load test execution and NFR documentation | 1 week | BTP environment with representative data |
| PII classification and data retention policy | 1 week | Compliance/legal review |
| Full audit trail (all 19 handlers) | 1 week (dev) | — |
| PAC submission package preparation | 3–5 days | All above complete |
| **Total estimated** | **8–12 weeks** | |
