# Bridge Management System — Code Quality Review

Version 1.7.2 | Expert council review | Last updated 2026-05-14

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Security Review](#2-security-review)
3. [Data Model Quality](#3-data-model-quality)
4. [Handler Pattern Review](#4-handler-pattern-review)
5. [Test Coverage](#5-test-coverage)
6. [Improvement Roadmap](#6-improvement-roadmap)

---

## 1. Executive Summary

| Area | Rating | Key finding |
|---|---|---|
| Security | Good | Authentication, CSRF, and CSP are correctly implemented. Rate limiting is in place. Gap: no correlation IDs in logs. |
| Data model | Good | Consistent soft-delete, managed mixin everywhere, EAV extensibility, CDS enum types. Gap: 6 DB indexes missing. |
| Handler patterns | Good | Batch virtual field computation, regex auto-ref generation, severity guard correct. Gap: AdminService isolation enforced manually, not architecturally. |
| Test coverage | Needs work | ~8 test files, estimated <20% line coverage. No CI/CD. No E2E tests. |
| Deployment | Good | validate-build script, pre-deploy checklist, WAL file cleanup documented. |

---

## 2. Security Review

### Authentication

| Control | Status | Notes |
|---|---|---|
| Production auth | XSUAA (JWT) | Configured in `cds.requires.[production].auth: xsuaa` in `package.json` |
| Local auth | CAP `dummy` | Development only — never deployed to BTP |
| JWT validation | `@sap/xssec` ^4 | Handled by CAP framework integration |
| OData endpoint gating | `@requires` in CDS files | All AdminService entities require at minimum `view` or `manage` scope |
| Custom router gating | `requireScope()` middleware | Applied to all custom Express routers in `srv/server.js` |

### CSRF Protection

`validateCsrfToken` middleware is applied to all mutating routes on custom Express routers. The check:

```js
// Correct implementation in srv/server.js
const token = req.headers['x-csrf-token'] || ''
if (!token || token.length < 4 || token.toLowerCase() === 'fetch') {
  return res.status(403).json({ error: 'Invalid CSRF token' })
}
```

The `"fetch"` literal check is critical — without it, the HEAD probe's request header itself passes as a valid token.

Note: OData mutations through CAP (`AdminService`, `BridgeManagementService`) have CSRF handled by the CAP framework and do not need this middleware.

### Rate Limiting

`express-rate-limit` is applied to:

- `/odata/v4/` endpoints — prevents OData enumeration attacks
- `/mass-upload/api/upload` — prevents file upload abuse

### Content Security Policy

Helmet CSP is configured in `srv/server.js`. Key directives:

| Directive | Values | Reason |
|---|---|---|
| `script-src` | `'self' 'unsafe-inline' 'unsafe-eval'` | `unsafe-eval` required for UI5 1.145 `requireSync` |
| `img-src` | `'self' data: https://*.tile.openstreetmap.org https://unpkg.com` | Leaflet basemap tiles |
| `connect-src` | `'self' https://*.tile.openstreetmap.org https://cdnjs.cloudflare.com` | Leaflet CDN + tile fetches |
| `default-src` | `'self'` | Deny-by-default |

`unsafe-eval` is a known UI5 limitation. Tracked as P2 item for upgrade to UI5 2.x which removes the need for it.

### Input Validation

| Attack vector | Mitigation |
|---|---|
| SQL injection | CAP parameterised queries exclusively — string concatenation into CDS queries is forbidden |
| Prototype pollution | `ALLOWED_RULE_FIELDS` Set whitelist on any `bridge[field]` dynamic property lookup |
| Date injection | ISO regex `/^\d{4}-\d{2}-\d{2}$/` + `isNaN(Date.parse(str))` before `new Date()` |
| Numeric overflow | `Math.max(min, Math.min(max, value))` on all numeric query parameters |
| JSON parse crash | `try { JSON.parse(v) } catch(_) { return null }` for all user-supplied JSON fields |
| File upload size | `express.json({ limit: '25mb' })` — effective raw-file limit ~18 MB |

### Security Gaps (current)

| Gap | Severity | Notes |
|---|---|---|
| No structured logging with correlation IDs | P2 | Requests cannot be traced end-to-end in incident investigations. Each log line is isolated. |
| Lat/lon range check is global (±90/±180) | P2 | Should be Australian bounding box (lat: -44 to -10, lon: 112 to 154) per GDA2020. Annotation exists in `fiori-service.cds` but server-side validation not enforced. |
| `/public-bridge/` route unauthenticated | Expected | By design — public bridge card. `xs-app.json` correctly routes with `authenticationType: none`. |

---

## 3. Data Model Quality

### Strengths

**Soft-delete consistency.** All major entities have `active: Boolean default true`. The pattern is enforced via `@Capabilities.DeleteRestrictions.Deletable: false` in annotations and `deactivate()` / `reactivate()` bound actions. Entities covered: `Bridges`, `Restrictions`, `BridgeInspections`, `BridgeDefects`, `BridgeRiskAssessments`, `NhvrRouteAssessments`, `LoadRatingCertificates`.

**`managed` mixin everywhere.** All entities include `managed` from `@sap/cds/common`. Fields `createdAt`, `createdBy`, `modifiedAt`, `modifiedBy` are set automatically by CAP and never manually assigned.

**PK strategy is deliberate.** Integer PKs only on `Bridges` and `Restrictions` (where legacy system alignment matters). UUID (`cuid`) on all other entities. `getNextIntegerKey()` in `srv/handlers/common.js` manages the sequence.

**EAV extensibility.** `AttributeGroups → AttributeDefinitions → AttributeValues` allows adding new custom fields to any bridge without schema changes. The `internalKey` string coupling (not UUID FK) means lookup is fast and readable in logs.

**CDS enum types.** `LoadRatingVehicleClass`, `LoadRatingMethod`, `InspectionStandard`, `RatingLevel` in `db/schema/enum-types.cds` auto-generate FE4 value-help dropdowns without any additional annotation. New fixed-domain fields should use this pattern.

**ChangeLog coverage.** All 18 major entities have `writeChangeLogs()` calls in their mutation handlers. The Change Documents screen makes this data queryable by bridge managers.

### Missing Indexes (P1)

These indexes are not currently defined in the schema. At scale (>10,000 bridges), queries will degrade significantly without them.

| Entity | Columns | Query that needs it |
|---|---|---|
| `ChangeLog` | `(objectId, changedAt)` | Change Documents screen — filter by bridge |
| `Bridges` | `(state, isActive, bridgeId)` | List Report filter by state |
| `BridgeDefects` | `(bridge_ID, active, severity)` | Risk dashboard — open high-severity defects |
| `AlertsAndNotifications` | `(status, entityType)` | Open alerts count per entity type |
| `BridgeInspections` | `(bridge_ID, inspectionDate)` | Last inspection date lookup on bridge load |
| `BridgeRiskAssessments` | `(bridge_ID, reviewDueDate)` | Overdue risk reviews report |

### Schema organisation

| Concern | Assessment |
|---|---|
| Barrel file (`db/schema.cds`) | Correct — loads all sub-files via `using from './schema/<file>'` |
| Named imports vs wildcard | Named imports (`using { X } from './bridge-entity'`) used between sub-files — correct. Wildcard imports within the barrel are acceptable. |
| Circular import prevention | `bridge-entity.cds` moved out of `db/schema.cds` for import by other sub-files without circular reference. |
| Enum types isolation | `db/schema/enum-types.cds` is the correct single location — prevents circular imports from sub-files that need both enum types and other entities. |

### Known model gaps

| Entity | Gap | Impact |
|---|---|---|
| `BridgeElements` | No mass-upload dataset entry yet | Elements can only be created via OData, not bulk upload |
| `BridgeCarriageways` | No mass-upload dataset entry | Same as above |
| `BridgeContacts` | No mass-upload dataset entry | Same as above |
| `BridgeMehComponents` | No mass-upload dataset entry | Same as above |

---

## 4. Handler Pattern Review

### Correct patterns in use

**Batch GROUP BY for virtual counts.** `activeRestrictionCount` on Bridges is computed using a single GROUP BY query across all result IDs — not N individual COUNT queries. This pattern scales to large list reports.

```js
// srv/admin-service.js — correct batch pattern
const counts = await db.run(
  SELECT.from('bridge.management.Restrictions')
    .columns('bridge_ID', 'count(1) as cnt')
    .where({ bridge_ID: { in: ids }, active: true })
    .groupBy('bridge_ID')
)
```

**Regex auto-ref extraction.** All auto-ref handlers (INS, DEF, RSK, CS, LR, PM) use the regex match pattern:

```js
const m = last?.defectId?.match(/^DEF-(\d+)$/)
const seq = m ? parseInt(m[1], 10) + 1 : 1
```

`parseInt('', 10)` returns `NaN` — never use `.replace('PREFIX-', '')` on a potentially empty or malformed string.

**`before(['CREATE', 'UPDATE'])` for `bridge_ID` resolution.** Handlers resolve `bridge_ID` from the human-readable `bridgeRef` on both CREATE and UPDATE. This is correct because FE4 draft PATCHes the `bridgeRef` field during editing, not at initial draft creation.

**`before('NEW', Entity.drafts)` for draft entities.** Auto-ref generation on draft-enabled entities uses this hook, not `before('CREATE')`, which fires after draft activation.

### Business rule correctness

**Severity escalation guard.** Alert auto-creation in `srv/handlers/defects.js` triggers when `severity >= 3` (High or Critical). The previous incorrect condition was `severity === 1` (Low) — this has been fixed.

**TfNSW 5×5 risk matrix.** `scoreToLevel()` in `srv/handlers/risk-assessments.js` uses:

| Score | Level |
|---|---|
| ≤4 | Low |
| 5–9 | Medium |
| 10–14 | High |
| ≥15 | Extreme |

**`inherentRiskScore` is always computed.** `before(['CREATE', 'UPDATE'], BridgeRiskAssessments)` always overwrites `inherentRiskScore = likelihood × consequence`. Users cannot set it manually. `residualRiskScore` is intentionally NOT auto-defaulted — it is a separate engineering input.

**Accreditation level guard.** `srv/handlers/inspections.js` enforces that Principal and Detailed inspection types (`inspectionStandard`) require inspector accreditation Level 3+. Enforced server-side in `before(['CREATE', 'UPDATE'], BridgeInspections)`.

### AdminService isolation

The `AdminService` and `BridgeManagementService` isolation is enforced by convention, not by architecture. Key duplicate implementations:

| Logic | BridgeManagementService | AdminService |
|---|---|---|
| `reviewCriticality` virtual field on Restrictions | `srv/handlers/restrictions.js` | `srv/admin-service.js` `after('READ')` |
| `inherentRiskScore` computation | `srv/handlers/risk-assessments.js` | `srv/admin-service.js` `before(['CREATE','UPDATE'])` |
| `bridge_ID` from `bridgeRef` on inspection create | `srv/handlers/inspections.js` | `srv/admin-service.js` |
| `activeRestrictionCount` batch count | `srv/handlers/bridges.js` | `srv/admin-service.js` |

This duplication is intentional and correct given the CAP service isolation model. Adding a new virtual field or business rule requires updates in both files.

### Handler registration — `helpers` passing

Some handlers require the `helpers` object (which contains `logAudit`, `getNextIntegerKey`, etc.) and some do not. The current `srv/service.js` is correct for all registrations. A regression would be adding a new handler that needs `helpers` but not passing it:

```js
// WRONG — logAudit will be undefined
registerMyHandler(this)

// CORRECT
registerMyHandler(this, helpers)
```

---

## 5. Test Coverage

### Current state

| Metric | Current | Target |
|---|---|---|
| Test files | ~8 | 85 |
| Estimated line coverage | <20% | 60% |
| Integration tests | Partial (bridges, restrictions, conditions, dashboard) | All 18 entities |
| Unit tests | Partial (parseBoolean, DQ rules) | All pure functions in mass-upload.js, audit-log.js |
| E2E tests | None | 5 golden paths |
| CI/CD | None | GitHub Actions on every push to `main` |

### Existing test files

| File | What it tests |
|---|---|
| `test/attachments.test.js` | Attachment CRUD via admin REST API |
| `test/condition.test.js` | BridgeConditionSurveys lifecycle |
| `test/dashboard.test.js` | Dashboard analytics aggregations |
| `test/dq-rules.test.js` | Data quality rule functions (unit) |
| `test/operations.test.js` | Operations read-only endpoints |
| `test/restrictions.test.js` | Restrictions CRUD + deactivate |
| `test/integration/` | Integration tests (real SQLite in-memory) |
| `test/unit/` | Pure function unit tests |

### Missing test coverage (priority order)

**P1 — before next release**

- `BridgeInspections` CRUD + accreditation guard enforcement
- `BridgeDefects` CRUD + severity >= 3 alert auto-creation
- `BridgePermits` approve/rejectPermit lifecycle
- Mass upload: Bridges sheet with valid + invalid rows
- Feature flag toggle + `requireFeature()` 403 guard

**P2 — within 30 days**

- All 18 entities: create, read, update, deactivate, reactivate
- Auto-ref NaN protection (empty `last` record case)
- AdminService isolation: verify handler fires on AdminService OData call
- `writeChangeLogs()` called for every mutation (audit completeness)

**P3 — quarter**

- Playwright E2E for 5 golden paths:
  1. Create bridge → add inspection → capture condition
  2. Bulk upload 56 bridges → verify all 56 appear on map
  3. Create restriction → deactivate → verify active filter
  4. Toggle feature flag → verify BHI tab appears/disappears
  5. Approve load rating cert → verify status = Active

### CI/CD configuration (to implement)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: node -e "require('./app/appconfig/fioriSandboxConfig.json')"
      - run: npx cds compile db/ srv/
      - run: npx cds deploy --to sqlite:db.sqlite
      - run: npm test -- --coverage --coverageThreshold='{"global":{"lines":60}}'
```

---

## 6. Improvement Roadmap

### P1 — Before go-live

| Item | Effort | Owner |
|---|---|---|
| CI/CD GitHub Actions pipeline | 1 day | Dev |
| Add 6 DB indexes to schema sub-files | 2h | Dev |
| Structured logging with correlation IDs (`x-request-id` propagation) | 1 day | Dev |
| Integration tests for BridgeInspections + BridgeDefects + BridgePermits | 1 day | Dev |
| `cds compile + cds deploy` added as CI step | 1h | Dev |

### P2 — Within 30 days

| Item | Effort | Notes |
|---|---|---|
| Email/SMS via SAP Alert Notification for overdue inspections | 2 days | `srv/notification-service.js` already scaffolded |
| Document attachments for Inspections, Defects, Permits | 3 days | Pattern exists in `BridgeDocuments`; replicate per entity |
| LookupValues admin screen in BMS Admin | 1 day | Allow code table editing without CSV rebuild + deploy |
| Demo data extension to all 18 sub-domain entities | 2 days | Currently only 3 demo bridges and minimal records |
| `CHANGELOG.md` maintained going forward | Ongoing | Add entry for every release |
| Mass upload datasets for `BridgeElements`, `BridgeCarriageways`, `BridgeContacts`, `BridgeMehComponents` | 2 days | 4 importer functions + DATASETS entries |
| Australian bounding box validation server-side for lat/lon | 2h | Add to `requiredFields` range check in `admin-service.js` |
| Playwright E2E for 5 golden paths | 3 days | See [Test Coverage](#5-test-coverage) |

### P3 — Quarter

| Item | Effort | Notes |
|---|---|---|
| Work Order entity + tile | 5 days | Field Work Orders linking Defect → Maintenance action → Completion |
| PDF inspection report generation | 3 days | Print-ready HTML pattern already used for bridge card |
| QR/NFC label for bridge physical tags | 2 days | QR API exists; NFC requires a write endpoint + mobile UI |
| Multi-tenant isolation | 8 days | If >1 client organisation; requires XSUAA tenant-mode: shared + row-level security |
| UI5 upgrade to 2.x | 5 days | Removes `unsafe-eval` from CSP; requires controller/view audit |
| Application Autoscaler rules in `mta.yaml` | 1 day | CPU threshold scaling rules for BTP production |
| ChangeLog retention policy enforcement | 1 day | Scheduled job to delete records older than 3 years |

### Technical debt register

| Debt item | Location | Risk if not addressed |
|---|---|---|
| `BridgeManagementService` vs `AdminService` logic must be manually kept in sync | `srv/service.js` + `srv/admin-service.js` | A new virtual field added to one service but not the other causes silent data discrepancies |
| `app/bridge-hierarchy/` and `app/bridges-public/` directories still present | `app/` | Dead code; will be included in HTML5 repo build unnecessarily |
| `mta-op-*` directories in project root | Project root | 10+ operation log directories — should be in `.gitignore` |
| `db.sqlite` committed to worktree | Worktree | Should be in `.gitignore` for the worktree; production SQLite is ephemeral |
| `"unsafe-eval"` in CSP script-src | `srv/server.js` | Required by UI5 1.145; resolved only by upgrading to UI5 2.x |
| Hardcoded `/mass-upload/api` base URL in `MassUpload.controller.js` | `app/bms-admin/webapp/controller/MassUpload.controller.js` | Breaks in BTP where origins differ from local; should come from `manifest.json` data sources |
