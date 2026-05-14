# BMS Expert Council v4 — Consolidated Findings Register

*Generated: 2026-05-14 | Total: 18 | Critical: 2 | High: 7 | Medium: 6 | Low: 3 | Fixed (full): 5 | Partially Fixed: 5 | Open: 8*

---

## Critical Findings

### BMS-2026-001: Unprotected Write Access to 7 AdminService Entities

- **Severity**: CRITICAL
- **Status**: PARTIAL FIX (BridgeInspections, BridgeDefects fixed; 7 remain open)
- **Source agents**: SEC-001, DOM-001, STD-006
- **File**: `srv/admin-service.cds:51-71`
- **Description**: BridgeElements, BridgeRiskAssessments, AlertsAndNotifications, BridgeInspectionElements, BridgeCarriageways, BridgeContacts, and BridgeMehComponents are projected in AdminService without any `@restrict` annotation. CAP's default for an unrestricted entity is full CRUD for any authenticated user. Under production XSUAA auth, a user with BMS_VIEWER (read-only) role can create, modify, or delete bridge elements, risk assessments, and alert records via OData. BridgeRiskAssessments and BridgeDefects/BridgeInspections are legally admissible evidence under Civil Liability Act 2002 §42 — unauthorised modification is a compliance violation.
- **Recommendation**: Add `@restrict` blocks to all 7 entities in `srv/admin-service.cds`. Pattern (copy from BridgeInspections lines 31-38):
  ```cds
  @restrict: [
    { grant: ['READ'],            to: ['view','inspect','manage','admin'] },
    { grant: ['CREATE','UPDATE'], to: ['manage','admin'] },
    { grant: ['DELETE'],          to: [] }
  ]
  ```
  For BridgeRiskAssessments, also add `{ grant: ['deactivate','reactivate'], to: ['manage','admin'] }`.
- **Effort**: S (1 hour — pattern copy 7 times)

---

### BMS-2026-002: Inspector Accreditation Level Check Allows Null Bypass — AS 5100-7 Violation

- **Severity**: CRITICAL
- **Status**: OPEN
- **Source agents**: SEC-002, DOM-002, STD-001
- **File**: `srv/handlers/inspections.js:24`
- **Description**: The guard `if (level && !allowed.includes(level))` allows a null or omitted `inspectorAccreditationLevel` to pass silently for Principal and Detailed inspection types. AS 5100-7 §3.2 and TfNSW-BIM §3.1 mandate Level 3 or Level 4 accreditation for these types. An inspector can create a formally invalid inspection record by simply not providing their accreditation level. Such records would be inadmissible in a negligence claim and create liability for the road authority.
- **Recommendation**: Change line 24 in `srv/handlers/inspections.js` to:
  ```js
  if (!level || !allowed.includes(level)) {
    return req.error(422, `${req.data.inspectionType} inspections require Level 3 or Level 4 accreditation. Please provide inspectorAccreditationLevel.`)
  }
  ```
- **Effort**: S (15 minutes)

---

## High Findings

### BMS-2026-003: INS- Sequence Extraction Uses String Replace — NaN Risk in inspections.js

- **Severity**: HIGH
- **Status**: OPEN (other handlers fixed; inspections.js missed)
- **Source agents**: CODE-001
- **File**: `srv/handlers/inspections.js:16`
- **Description**: `parseInt(last.inspectionRef.replace('INS-', ''), 10)` returns NaN when `inspectionRef` is empty, blank, or contains unexpected content (e.g. 'INS-DEMO-0001'), producing the sequence 'INS-0NaN'. All other auto-ref handlers (DEF, CS, LR, PM, RSK) were fixed to use regex match in a prior sprint. inspections.js was the sole omission. A NaN sequence breaks the entire inspection registry and subsequent records will all generate 'INS-NaN', making INS- refs unreliable for legal tracking.
- **Recommendation**: Replace line 16 in `srv/handlers/inspections.js`:
  ```js
  const m = last?.inspectionRef?.match(/^INS-(\d+)$/)
  const seq = m ? parseInt(m[1], 10) + 1 : 1
  ```
- **Effort**: S (5 minutes)

### BMS-2026-004: Australian Coordinate Bounds Not Enforced at DB Schema Level

- **Severity**: HIGH
- **Status**: OPEN
- **Source agents**: CODE-004, SEC-004, STD-003
- **Duplicates consolidated**: CODE-004, SEC-004, STD-003 (same issue, 3 agents)
- **File**: `db/schema/bridge-entity.cds:15-16` and `srv/admin-service.js:81-82`
- **Description**: The CDS schema defines `@assert.range: [-90, 90]` for latitude and `[-180, 180]` for longitude — global bounds. `srv/admin-service.js` range validation uses the same global bounds. The Fiori annotation layer (`fiori-service.cds:487-488`) correctly uses Australian bounds (-44 to -10, 112 to 154) with GDA2020 QuickInfo. The mismatch means a mass upload or direct OData call can store a coordinate for Antarctica (-89, 179) that passes all server validation but is outside Australia, corrupting map displays and haversine proximity searches.
- **Recommendation**: (1) Update `db/schema/bridge-entity.cds` lines 15-16 to `@assert.range: [-44, -10]` and `@assert.range: [112, 154]`. (2) Update `srv/admin-service.js` lines 81-82 to match.
- **Effort**: S (30 minutes + `cds deploy` verification)

### BMS-2026-005: Reports API and BHI/BSI API Lack Scope Enforcement

- **Severity**: HIGH
- **Status**: OPEN
- **Source agents**: CODE-005, SEC-005
- **Duplicates consolidated**: CODE-005 and SEC-005 (same root cause)
- **File**: `srv/server.js:2544-2545`, `srv/reports-api.js:500`, `srv/bhi-bsi-api.js:36,94`
- **Description**: `mountReportsApi` registers all report endpoints with `requiresAuthentication` only — no scope requirement. `mountBhiBsiApi` routes `/assess` and `/network-summary` with `requiresAuthentication` only. Any authenticated user (BMS_INSPECTOR with only `inspect` scope) can retrieve the full risk register, data quality reports, network BHI/BSI summary, and LRC expiry data. These contain sensitive network-wide financial and structural risk exposure data.
- **Recommendation**: In `srv/server.js` line 2544, change to: `mountReportsApi(app, requiresAuthentication, requireScope('view','inspect','manage','admin'))`. In `srv/bhi-bsi-api.js`, add `requireScope('manage','admin')` to the `/assess` and `/network-summary` route definitions (the `requireScope` function is passed in from server.js — update the `mountBhiBsiApi` signature to accept it).
- **Effort**: M (2 hours including testing)

### BMS-2026-006: Attributes API Lacks Scope Enforcement for Mutations

- **Severity**: HIGH
- **Status**: OPEN
- **Source agents**: SEC-003
- **File**: `srv/attributes-api.js:848-855`, `srv/server.js:1529`
- **Description**: The attributes API is mounted with only `requiresAuthentication`. The code comments document that template/import/export require 'admin' scope, but this is not enforced. Any authenticated user can POST to `/attributes/api/import`, modify attribute definitions, and delete attribute groups.
- **Recommendation**: Update `mountAttributesApi` call in `srv/server.js:1529` to pass `requireScope` and apply it to mutation routes. Alternatively, add scope check inline at the mutation route handlers.
- **Effort**: M (2 hours)

### BMS-2026-007: KPI Snapshot lrcExpiringCount Ignores State Filter

- **Severity**: HIGH
- **Status**: OPEN
- **Source agents**: DOM-003, PERF-001
- **Duplicates consolidated**: DOM-003 and PERF-001 (same root cause, domain + perf angle)
- **File**: `srv/admin-service.js:1771-1775`
- **Description**: The `refreshKPISnapshots` action queries all expiring LRCs without joining to Bridges for state filtering. For the NSW snapshot, `lrcExpiringCount` will show the network-wide count (all states), not NSW-only. This produces incorrect KPI tiles on state-filtered dashboards. Additionally, the same count is redundantly computed for every per-state iteration.
- **Recommendation**: Add a bridge join: `SELECT.from('bridge.management.LoadRatingCertificates as l JOIN bridge.management.Bridges as b ON l.bridge_ID = b.ID').columns('count(1) as cnt').where({ 'l.active': true, 'l.expiryDate': { '<=': ninetyDaysOut }, ...(state !== 'ALL' ? { 'b.state': state } : {}) })`.
- **Effort**: M (1 hour + test)

### BMS-2026-008: TfNSW Condition Scale Threshold Mismatch in Reports API

- **Severity**: HIGH
- **Status**: OPEN
- **Source agents**: DOM-004, STD-002
- **Duplicates consolidated**: DOM-004 and STD-002 (same issue)
- **File**: `srv/reports-api.js:14-26`
- **Description**: The `conditionKey()` function uses thresholds `>= 5 → critical`, `>= 4 → poor`, `>= 3 → fair` with a comment referencing TfNSW 1-5 scale. However `bridge.management.Bridges.conditionRating` is defined as `Integer @assert.range: [1, 10]` in the DB schema. If stored values are 1-10 and the function uses 1-5 thresholds, any bridge with rating 6-10 is classified as 'good' regardless of actual condition. The 2x scale compression creates catastrophically wrong risk distribution statistics.
- **Recommendation**: Align thresholds with the 1-10 stored scale: `if n >= 8 return 'critical'`, `if n >= 6 return 'poor'`, `if n >= 4 return 'fair'`, `else return 'good'`. Add a comment explaining the mapping and write a unit test for `conditionKey()` with known inputs.
- **Effort**: S (1 hour including tests)

---

## Medium Findings

### BMS-2026-009: Auto-Created Restriction from Defect Handler Missing Mandatory Fields

- **Severity**: MEDIUM
- **Status**: OPEN
- **Source agents**: CODE-002, DOM-005, STD-004
- **Duplicates consolidated**: CODE-002, DOM-005, STD-004
- **File**: `srv/handlers/defects.js:68-79`
- **Description**: When `requiresLoadRestriction=true`, defects.js inserts a `Restrictions` record directly to the DB, bypassing AdminService validators. The INSERT is missing `bridgeRef`, `restrictionValue`, and `restrictionUnit` — all required by AdminService validation. Under Roads Act 1993 NSW §121-124, a load limit order must specify a numeric limit and unit. The auto-suggested record is legally unenforceable as created.
- **Recommendation**: Add to the INSERT entries: `bridgeRef: defect.bridge?.bridgeId || ''`, `restrictionValue: 'TBD - Pending Engineering Review'`, `restrictionUnit: 'T'`. Optionally add a `restrictionRef` prefix 'AUTO-' to distinguish auto-suggested records.
- **Effort**: S (30 minutes)

### BMS-2026-010: KPI Snapshot Uses N×5 Per-State Queries Instead of Batch GROUP BY

- **Severity**: MEDIUM
- **Status**: OPEN
- **Source agents**: PERF-003
- **File**: `srv/admin-service.js:1729-1805`
- **Description**: For each of up to 9 states (8 + ALL), the function runs 5 separate SELECT queries (totals, overdue, restrictions, alerts, LRC). That is 45 DB round-trips per `refreshKPISnapshots()` call. At scale with frequent refresh calls (scheduled daily or user-triggered), this creates unnecessary DB load.
- **Recommendation**: Collapse to 5 GROUP BY queries returning all states at once, then reduce into a per-state map in JavaScript. Expected round-trips: 5 instead of 45.
- **Effort**: L (4 hours — complex refactor with correctness testing)

### BMS-2026-011: Dead DemoData View and Controller Files Remain After Demo Mode Removal

- **Severity**: MEDIUM
- **Status**: OPEN (PARTIAL FIX — backend removed, UI files remain)
- **Source agents**: CODE-003, SEC-008
- **Duplicates consolidated**: CODE-003 and SEC-008 (same root cause)
- **File**: `app/bms-admin/webapp/view/DemoData.view.xml`, `app/bms-admin/webapp/controller/DemoData.controller.js`
- **Description**: Demo mode was removed from the backend (`admin-service.cds`, `admin-service.js`, `server.js`, Shell nav). However `DemoData.view.xml` and `DemoData.controller.js` remain. The controller calls `/odata/v4/admin/loadDemoData` and `/odata/v4/admin/clearDemoData` which no longer exist — any user navigating directly to this view will receive 404/405 errors. The view is currently unreachable via Shell nav, but the files add confusion and bundle size.
- **Recommendation**: Delete both files. Verify no route in `manifest.json` or `fioriSandboxConfig.json` references `DemoData`.
- **Effort**: S (15 minutes)

### BMS-2026-012: elementHealthRating Formula Direction Is Counter-Intuitive

- **Severity**: MEDIUM
- **Status**: OPEN
- **Source agents**: CODE-008, DOM-007, STD-005
- **Duplicates consolidated**: CODE-008, DOM-007, STD-005 (same issue, 3 agents)
- **File**: `srv/handlers/inspections.js:38-41`
- **Description**: SIMS CS1=Good(1), CS4=Failed(4). The weighted average formula produces a score where 1=best and 4=worst. The field is named `elementHealthRating` which implies higher=healthier. A bridge with mostly CS4 elements scores 3.8 on a "health rating" — users reading the number see 3.8 out of 4 and may interpret it as very healthy (97.5%), when it actually means near-failure. SIMS convention is 100=new, 0=failed.
- **Recommendation**: Invert to SIMS-aligned 0-100 scale: `d.elementHealthRating = Math.round((1 - (weighted - 1) / 3) * 100 * 100) / 100`. Add `@Common.QuickInfo: 'Element health 0-100; 100=new/CS1, 0=failed/CS4 (SIMS convention)'` to the schema annotation.
- **Effort**: S (1 hour including annotation update + migration note)

### BMS-2026-013: CSRF Issuance Fallback to 'unsafe' Token in DemoData and Attachments Controllers

- **Severity**: MEDIUM
- **Status**: OPEN
- **Source agents**: SEC-006
- **File**: `app/bms-admin/webapp/controller/DemoData.controller.js:24` (and `Attachments.js` per CLAUDE.md)
- **Description**: The CSRF token fetch falls back to `|| 'unsafe'`. The string 'unsafe' is 6 characters, not equal to 'fetch', so it passes `validateCsrfToken`. If the server's HEAD endpoint does not return an `X-CSRF-Token` header, the fallback 'unsafe' token is accepted — circumventing the anti-CSRF goal. The DemoData controller is dead code, but the pattern is copied in the Attachments controller.
- **Recommendation**: Add a CSRF token issuance endpoint: add a `router.head('/token', (req, res) => { res.set('X-CSRF-Token', require('crypto').randomUUID()); res.end(); })` to `adminBridgeRouter`. Store issued tokens in a per-session Set (or use a short TTL). Reject tokens not in the issued set. Short-term: throw an error if the server returns no token instead of falling back to 'unsafe'.
- **Effort**: M (3 hours)

### BMS-2026-014: KPI Overdue Inspection Threshold Hardcoded at 5 Years

- **Severity**: MEDIUM
- **Status**: OPEN
- **Source agents**: DOM-006
- **File**: `srv/admin-service.js:1733`
- **Description**: The overdue inspection threshold is hardcoded as 5 years. TfNSW inspection frequency requirements vary by bridge class: Class 1 bridges require routine inspection every 2 years. A fixed 5-year threshold under-reports overdue inspections for Class 1 bridges by 3 years. Network-wide KPI tiles will show a misleadingly low overdue count.
- **Recommendation**: Add SystemConfig key `kpi.overdueInspectionYears` with default value `5`. Load in `refreshKPISnapshots` via `getConfigInt('kpi.overdueInspectionYears', 5)`. Add a seed row to `bridge.management-SystemConfig.csv`.
- **Effort**: S (1 hour)

---

## Low Findings

### BMS-2026-015: activeRestrictionCount GROUP BY Fires on All ObjectPage Navigations

- **Severity**: LOW
- **Status**: OPEN
- **Source agents**: CODE-007, PERF-004
- **Duplicates consolidated**: CODE-007, PERF-004
- **File**: `srv/admin-service.js:416`
- **Description**: The `$select` guard prevents the GROUP BY COUNT on list pages that don't include `activeRestrictionCount` in their select. However when `$select` is absent (default ObjectPage expand), the COUNT fires for every single-bridge fetch. The ObjectPage already shows a Restrictions tab with the full list — the count badge adds redundant DB overhead.
- **Recommendation**: Additionally check `req.params?.[0]` for single-record navigation and skip the COUNT. Or add a 30-second process-level cache keyed by bridge_ID.
- **Effort**: S (1 hour)

### BMS-2026-016: scoreAllBridges Loads Entire AssetIQScores Into Memory

- **Severity**: LOW
- **Status**: OPEN
- **Source agents**: PERF-005
- **File**: `srv/admin-service.js:1649`
- **Description**: `scoreAllBridges` loads the entire `AssetIQScores` table into a JavaScript Map for deduplication. At 5,000+ bridges this holds thousands of objects in memory during the action. Not a memory leak (map is discarded after), but blocks the event loop during a large batch operation.
- **Recommendation**: Process bridges in batches of 500 using SKIP/TOP pagination. Load only the existing score map for the current batch.
- **Effort**: M (2 hours)

### BMS-2026-017: GISConfig hereApiKey Exclusion Not Verified in Export Paths

- **Severity**: LOW
- **Status**: OPEN
- **Source agents**: SEC-007
- **File**: `srv/admin-service.cds:136`, `srv/server.js` GISConfig queries
- **Description**: `GISConfig` is correctly projected with `excluding { hereApiKey }` in AdminService OData. However, server.js custom Express routes that query GISConfig for map configuration (around line 1450) use explicit column lists — verify these do not include `hereApiKey`. If any export path serializes the full GISConfig row, the API key leaks.
- **Recommendation**: Audit all `SELECT.from('bridge.management.GISConfig')` calls in `srv/server.js` and `srv/attributes-api.js` and confirm `hereApiKey` is never included in the column list.
- **Effort**: S (30 minutes — read-only audit)

### BMS-2026-018: BridgeInspectionElements Health Rating Formula Lacks Documentation

- **Severity**: LOW
- **Status**: OPEN
- **Source agents**: CODE-008
- **File**: `srv/handlers/inspections.js:38`
- **Description**: The elementHealthRating formula (weighted average of CS values) is undocumented. Developers maintaining this code may not understand the scale direction (1=best, 4=worst) or the SIMS CS1-CS4 convention. This is secondary to BMS-2026-012 (formula inversion) — resolving that finding also resolves this one.
- **Recommendation**: Add a comment above the calculation explaining the SIMS CS1-CS4 scale and the formula's output range. See BMS-2026-012 for the full fix.
- **Effort**: S (15 minutes, merged into BMS-2026-012)

---

## Findings Status Summary

| ID | Severity | Status | Title |
|---|---|---|---|
| BMS-2026-001 | CRITICAL | PARTIAL FIX | Unprotected Write Access to 7 AdminService Entities |
| BMS-2026-002 | CRITICAL | OPEN | Inspector Accreditation Level Check Allows Null Bypass |
| BMS-2026-003 | HIGH | OPEN | INS- Sequence Uses String Replace — NaN Risk |
| BMS-2026-004 | HIGH | OPEN | Australian Coordinate Bounds Not Enforced at DB Level |
| BMS-2026-005 | HIGH | OPEN | Reports API and BHI/BSI API Lack Scope Enforcement |
| BMS-2026-006 | HIGH | OPEN | Attributes API Lacks Scope Enforcement for Mutations |
| BMS-2026-007 | HIGH | OPEN | KPI Snapshot lrcExpiringCount Ignores State Filter |
| BMS-2026-008 | HIGH | OPEN | TfNSW Condition Scale Threshold Mismatch in Reports API |
| BMS-2026-009 | MEDIUM | OPEN | Auto-Created Restriction Missing Mandatory Fields |
| BMS-2026-010 | MEDIUM | OPEN | KPI Snapshot N×5 Per-State Queries Instead of Batch |
| BMS-2026-011 | MEDIUM | OPEN (partial fix) | Dead DemoData Files Remain After Demo Mode Removal |
| BMS-2026-012 | MEDIUM | OPEN | elementHealthRating Formula Counter-Intuitive Direction |
| BMS-2026-013 | MEDIUM | OPEN | CSRF Fallback to 'unsafe' Token in Controllers |
| BMS-2026-014 | MEDIUM | OPEN | KPI Overdue Inspection Threshold Hardcoded at 5 Years |
| BMS-2026-015 | LOW | OPEN | activeRestrictionCount Fires on All ObjectPage Navigations |
| BMS-2026-016 | LOW | OPEN | scoreAllBridges Loads Entire AssetIQScores Into Memory |
| BMS-2026-017 | LOW | OPEN | GISConfig hereApiKey Exclusion Not Verified in Exports |
| BMS-2026-018 | LOW | OPEN | elementHealthRating Formula Lacks Documentation |

---

## Fully Resolved Findings (from fixes_applied.jsonl)

The following issues were identified and fully resolved in prior sprint commits:

- Defects, conditions, load-ratings-new, permits, risk-assessments handlers use safe regex match for auto-ref generation (FIX-001)
- BridgeInspections and BridgeDefects have explicit `@restrict` with DELETE blocked (FIX-003, FIX-011)
- ChangeLog entity has 6 indexes preventing slow audit queries (FIX-004 via ChangeLog indexes, confirmed in schema.cds:426-432)
- `validateCsrfToken` correctly rejects 'fetch' tokens and tokens shorter than 4 chars (FIX-009)
- AdminService `after('READ', Bridges)` `activeRestrictionCount` uses batch GROUP BY with $select guard (FIX-007)
- `conditionRating` and `lastInspectionDate` removed from Bridges required fields (FIX-008 context)
- `inherentRiskScore` auto-computed in AdminService `before(['CREATE','UPDATE'], BridgeRiskAssessments)` (referenced in admin-service.js:1094-1110)
- BridgeInspectionElements `bridge_ID` resolved from inspection in AdminService (FIX-008)
