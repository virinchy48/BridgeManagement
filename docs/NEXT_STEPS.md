# BMS Expert Council v4 — Next Steps

*Generated: 2026-05-14 | Ordered by priority. Complete P1 items before any BTP production deployment.*

---

### NS-001: Fix Inspector Accreditation Level Null Bypass

- **Priority**: P1
- **Effort**: S (15 minutes)
- **Addresses**: BMS-2026-002
- **Action**: In `srv/handlers/inspections.js` line 24, change `if (level && !allowed.includes(level))` to `if (!level || !allowed.includes(level))`. This ensures Principal and Detailed inspections always require a valid Level 3 or Level 4 accreditation — a null/absent level now rejects the request instead of silently passing.
- **Owner**: dev

---

### NS-002: Add @restrict to 7 Unprotected AdminService Entities

- **Priority**: P1
- **Effort**: S (1 hour)
- **Addresses**: BMS-2026-001
- **Action**: In `srv/admin-service.cds`, add `@restrict` blocks before entities: `BridgeElements` (line 51), `BridgeRiskAssessments` (line 53), `AlertsAndNotifications` (line 67), `BridgeInspectionElements` (line 68), `BridgeCarriageways` (line 69), `BridgeContacts` (line 70), `BridgeMehComponents` (line 71). Copy the pattern from `BridgeInspections` (lines 31-38). For `BridgeRiskAssessments`, also grant `['deactivate','reactivate']` to `['manage','admin']`. Run `npx cds compile db/ srv/` to verify no syntax errors.
- **Owner**: dev

---

### NS-003: Fix INS- Sequence Extraction Regex in inspections.js

- **Priority**: P1
- **Effort**: S (5 minutes)
- **Addresses**: BMS-2026-003
- **Action**: In `srv/handlers/inspections.js` line 16, replace:
  ```js
  const seq = last?.inspectionRef ? parseInt(last.inspectionRef.replace('INS-', ''), 10) + 1 : 1
  ```
  with:
  ```js
  const m = last?.inspectionRef?.match(/^INS-(\d+)$/)
  const seq = m ? parseInt(m[1], 10) + 1 : 1
  ```
  This matches the safe pattern already used in defects.js, conditions.js, load-ratings-new.js, permits.js, and risk-assessments.js.
- **Owner**: dev

---

### NS-004: Apply Australian Coordinate Bounds at DB Schema Level

- **Priority**: P1
- **Effort**: S (30 minutes + cds deploy)
- **Addresses**: BMS-2026-004
- **Action**: (1) In `db/schema/bridge-entity.cds` lines 15-16, change to `@assert.range: [-44, -10]` for latitude and `@assert.range: [112, 154]` for longitude. (2) In `srv/admin-service.js` lines 81-82, change `['latitude', 'Latitude', -90, 90]` and `['longitude', 'Longitude', -180, 180]` to use Australian bounds. (3) Run `npx cds deploy --to sqlite:db.sqlite` to verify deploy succeeds. Check existing seed data lat/lon values are within the new bounds before deploying.
- **Owner**: dev

---

### NS-005: Add Scope Enforcement to Reports and BHI/BSI APIs

- **Priority**: P1
- **Effort**: M (2 hours)
- **Addresses**: BMS-2026-005, BMS-2026-006
- **Action**: (1) In `srv/server.js` line 2544, pass `requireScope` to `mountReportsApi`: change to `mountReportsApi(app, requiresAuthentication, requireScope('view','inspect','manage','admin'))`. (2) Update `srv/reports-api.js` function `mountReportsApi` signature to `(app, requiresAuthentication, requireScope)` and apply `requireScope` to the `app.use('/reports/api', ...)` call. (3) Update `mountBhiBsiApi` in `srv/bhi-bsi-api.js` to accept a `requireScope` parameter and apply `requireScope('manage','admin')` to `/assess` and `/network-summary` routes (not `/mode-params`). (4) Update `srv/server.js` line 2545 call to pass `requireScope`. (5) For attributes API: in `srv/server.js` line 1529, update `mountAttributesApi` to pass `requireScope`; inside `srv/attributes-api.js` apply `requireScope('admin','manage')` to all mutation routes (POST import, DELETE).
- **Owner**: dev

---

### NS-006: Fix KPI Snapshot lrcExpiringCount State Filter

- **Priority**: P1
- **Effort**: M (1 hour)
- **Addresses**: BMS-2026-007
- **Action**: In `srv/admin-service.js` lines 1771-1775, replace the simple LoadRatingCertificates query with a joined query that filters by bridge state. Use a raw SQL join or CDS QL association path:
  ```js
  const [lrcResult] = await db.run(
    SELECT.from('bridge.management.LoadRatingCertificates as l')
      .join('bridge.management.Bridges as b').on('l.bridge_ID = b.ID')
      .columns('count(1) as cnt')
      .where({
        'l.active': true,
        'l.expiryDate': { '<=': ninetyDaysOut },
        ...(state !== 'ALL' ? { 'b.state': state } : {})
      })
  )
  ```
- **Owner**: dev

---

### NS-007: Fix conditionKey() Threshold Scale in reports-api.js

- **Priority**: P1
- **Effort**: S (1 hour)
- **Addresses**: BMS-2026-008
- **Action**: In `srv/reports-api.js` function `conditionKey()` lines 14-26, update numeric thresholds to use the 1-10 conditionRating scale: `if n >= 8 return 'critical'`, `if n >= 6 return 'poor'`, `if n >= 4 return 'fair'`, else `'good'`. Add a comment documenting the mapping. If the codebase also supports a 1-5 TfNSW scale in some data, add a threshold parameter: `const threshold = n <= 5 ? { crit: 5, poor: 4, fair: 3 } : { crit: 8, poor: 6, fair: 4 }`. Write a test in `test/` for `conditionKey` covering key boundary values.
- **Owner**: dev

---

### NS-008: Add Missing Fields to Auto-Created Restriction from Defect Handler

- **Priority**: P2
- **Effort**: S (30 minutes)
- **Addresses**: BMS-2026-009
- **Action**: In `srv/handlers/defects.js` lines 68-79, add the following fields to the auto-created restriction INSERT:
  ```js
  restrictionValue: 'TBD - Pending Engineering Review',
  restrictionUnit: 'T',
  bridgeRef: defect.bridge?.bridgeId || '',
  restrictionRef: `AUTO-${Date.now()}`
  ```
  This ensures the auto-created record passes AdminService required-field checks if accessed via the OData endpoint and satisfies the Roads Act minimum content requirement.
- **Owner**: dev

---

### NS-009: Delete Dead DemoData UI Files

- **Priority**: P2
- **Effort**: S (15 minutes)
- **Addresses**: BMS-2026-011
- **Action**: Delete the following files:
  - `app/bms-admin/webapp/view/DemoData.view.xml`
  - `app/bms-admin/webapp/controller/DemoData.controller.js`
  
  Verify neither is referenced in `app/bms-admin/webapp/manifest.json` routes/targets (confirmed: demo route was removed from Shell.controller.js and Shell.view.xml). Also verify `app/appconfig/fioriSandboxConfig.json` contains no `DemoData` or `demoMode` intent.
- **Owner**: dev

---

### NS-010: Fix elementHealthRating Formula to SIMS 0-100 Convention

- **Priority**: P2
- **Effort**: S (1 hour)
- **Addresses**: BMS-2026-012, BMS-2026-018
- **Action**: In `srv/handlers/inspections.js` lines 37-41, change the health rating formula:
  ```js
  // SIMS convention: 100=CS1/New, 0=CS4/Failed
  d.elementHealthRating = Math.round((1 - (weighted - 1) / 3) * 100 * 100) / 100
  ```
  In `app/admin-bridges/fiori-service.cds`, add `@Common.QuickInfo: 'Element health 0-100; 100=new/CS1, 0=failed/CS4 (SIMS convention)'` to the `elementHealthRating` annotation. Note: this is a breaking change for any existing stored data — add a note in CLAUDE.md that existing elementHealthRating values will be on the old 1-4 scale until recomputed.
- **Owner**: dev

---

### NS-011: Make KPI Overdue Inspection Threshold Configurable

- **Priority**: P2
- **Effort**: S (1 hour)
- **Addresses**: BMS-2026-014
- **Action**: (1) Add a SystemConfig seed row in `db/data/bridge.management-SystemConfig.csv`: `key=kpi.overdueInspectionYears, value=5, defaultValue=5, dataType=integer, category=KPI Configuration, label=Overdue Inspection Threshold (Years), description=Bridges not inspected within this many years are counted as overdue, isReadOnly=false`. (2) In `srv/admin-service.js` line 1733 area, replace the hardcoded `5 * 365 * ...` with:
  ```js
  const overdueYears = await getConfigInt('kpi.overdueInspectionYears', 5)
  const fiveYearsAgo = new Date(Date.now() - overdueYears * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  ```
  Import `getConfigInt` from `./system-config` if not already imported.
- **Owner**: dev

---

### NS-012: Implement Proper CSRF Token Issuance Endpoint

- **Priority**: P2
- **Effort**: M (3 hours)
- **Addresses**: BMS-2026-013
- **Action**: In `srv/server.js`, add a HEAD route to `adminBridgeRouter` that generates and caches a UUID CSRF token: `adminBridgeRouter.head('/token', (req, res) => { const token = require('crypto').randomUUID(); res.set('X-CSRF-Token', token); res.end(); })`. Update `validateCsrfToken` to maintain a per-session issued-token Set (or use a process-level Map with 30-min TTL). Update DemoData.controller.js (if not deleted per NS-009) and Attachments.controller.js to throw an error if the HEAD response has no token header, rather than falling back to 'unsafe'.
- **Owner**: dev / security

---

### NS-013: Refactor KPI Snapshot Queries to Batch GROUP BY

- **Priority**: P3
- **Effort**: L (4 hours)
- **Addresses**: BMS-2026-010
- **Action**: In `srv/admin-service.js` `refreshKPISnapshots` action (lines 1729-1805), replace the per-state loop with 5 batch queries:
  1. `SELECT state, count(1) as totalBridges, sum(conditionRating<=3) as criticalCondition FROM Bridges WHERE isActive GROUP BY state`
  2. `SELECT b.state, count(1) as overdueCount FROM Bridges b WHERE isActive AND lastInspectionDate <= fiveYearsAgo GROUP BY b.state`
  3. `SELECT b.state, count(1) as cnt FROM Restrictions r JOIN Bridges b ON r.bridge_ID=b.ID WHERE r.active GROUP BY b.state`
  4. `SELECT count(1) as openAlerts FROM AlertsAndNotifications WHERE active AND status='Open'` (no state field on alerts)
  5. `SELECT b.state, count(1) as lrcCnt FROM LRC l JOIN Bridges b ON l.bridge_ID=b.ID WHERE l.active AND l.expiryDate<=ninetyDaysOut GROUP BY b.state`
  
  Then reduce all 5 result sets into per-state snapshot objects. Add 'ALL' aggregation after. Expected result: 5 DB queries instead of 45.
- **Owner**: dev

---

### NS-014: Add GISConfig hereApiKey Export Audit

- **Priority**: P3
- **Effort**: S (30 minutes — read-only audit)
- **Addresses**: BMS-2026-017
- **Action**: Search `srv/server.js` for all `SELECT.from('bridge.management.GISConfig')` or `GISConfig` queries and confirm `hereApiKey` is never included in the column list. Search `srv/attributes-api.js` for same. If any query omits an explicit column list, add one that excludes `hereApiKey`. Document the finding in CLAUDE.md under "Security Patterns".
- **Owner**: dev / security

---

### NS-015: Optimize activeRestrictionCount for Single-Bridge Navigations

- **Priority**: P3
- **Effort**: S (1 hour)
- **Addresses**: BMS-2026-015
- **Action**: In `srv/admin-service.js` `after('READ', Bridges)` handler, add an additional guard: `if (list.length === 1 && !wantCount) return`. More specifically, add a 30-second process-level cache: `const countCache = new Map()` at module scope. Before running the GROUP BY, check if all bridge IDs have cached counts. After computing, store results with a 30-second TTL.
- **Owner**: dev
