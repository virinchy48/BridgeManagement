# Bridge Management System — Developer Guide

Version 1.7.2 | Node 20+ | SAP CAP v9 | Last updated 2026-05-14

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Structure](#2-project-structure)
3. [Local Development Setup](#3-local-development-setup)
4. [Architecture: Service Isolation Rule](#4-architecture-service-isolation-rule)
5. [Entity Naming Conventions](#5-entity-naming-conventions)
6. [Draft vs Plain CRUD](#6-draft-vs-plain-crud)
7. [Auto-Ref Generation Pattern](#7-auto-ref-generation-pattern)
8. [Handler Registration](#8-handler-registration)
9. [Audit Logging](#9-audit-logging)
10. [Mass Upload](#10-mass-upload)
11. [Custom Attributes (EAV)](#11-custom-attributes-eav)
12. [Feature Flags](#12-feature-flags)
13. [CSRF Token Pattern](#13-csrf-token-pattern)
14. [Testing Patterns](#14-testing-patterns)
15. [Top 10 Gotchas](#15-top-10-gotchas)

---

## 1. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Backend framework | SAP CAP (`@sap/cds`) | ^9 |
| Runtime | Node.js | >=20.0.0 |
| Database (production) | SAP HANA Cloud (HDI container) | — |
| Database (local dev) | SQLite via `@cap-js/sqlite` | ^2 |
| Auth (production) | XSUAA via `@sap/xssec` | ^4 |
| Auth (local dev) | CAP `dummy` auth | — |
| Frontend | SAP Fiori Elements v4 + SAPUI5 `sap.m` | 1.145 |
| Mass upload | `xlsx` | 0.18.x |
| HTTP security | `helmet` | ^8.1.0 |
| QR code | `qrcode` | ^1.5.4 |
| Test runner | Jest | ^29.7.0 |
| Build tool | MTA Build Tool (`mbt`) | system |

---

## 2. Project Structure

```
BridgeManagement/
├── app/                        # All frontend HTML5 modules
│   ├── admin-bridges/          # Primary FE4 Fiori app (Bridge Asset Registry)
│   ├── bms-admin/              # Custom XML admin console (KPI, Mass Upload, etc.)
│   ├── mass-upload/            # Standalone mass upload wizard
│   ├── mass-edit/              # Bulk field-level editor
│   ├── map-view/               # Leaflet GIS map
│   ├── dashboard/              # KPI dashboard
│   ├── restrictions/           # Standalone Restrictions tile
│   ├── attributes-admin/       # Custom attributes EAV admin
│   ├── operations/             # Field-staff read-only apps (bridges, restrictions)
│   │   ├── bridges/
│   │   └── restrictions/
│   ├── appconfig/              # FLP sandbox config
│   │   ├── fioriSandboxConfig.json
│   │   └── launchpadConfig.json
│   ├── fiori-apps.html         # FLP shell entry point
│   └── router/                 # BTP App Router (xs-app.json, package.json)
│
├── db/
│   ├── schema.cds              # Barrel file — loads all sub-schema files
│   ├── schema/                 # Schema sub-files (one per domain)
│   │   ├── bridge-entity.cds   # Bridges entity (canonical source)
│   │   ├── enum-types.cds      # CDS enum types for FE4 value-help
│   │   ├── core.cds            # ChangeLog, KPISnapshots, SystemConfig
│   │   ├── admin.cds           # BridgeDocuments, BridgeContacts, etc.
│   │   ├── restrictions.cds    # Restrictions, BridgeRestrictions
│   │   ├── load-ratings.cds    # LoadRatingCertificates, BridgeLoadRatings
│   │   ├── risk-assessments.cds
│   │   ├── nhvr-compliance.cds # NhvrRouteAssessments, NhvrApprovedVehicleClasses
│   │   ├── elements.cds        # BridgeElements, BridgeInspectionElements
│   │   ├── defects.cds         # BridgeDefects
│   │   ├── alerts.cds          # AlertsAndNotifications
│   │   ├── scour-assessments.cds
│   │   ├── gap-entities.cds    # BridgeCarriageways, BridgeContacts, BridgeMehComponents
│   │   └── maintenance.cds
│   ├── attributes-schema.cds   # EAV: AttributeGroups, Definitions, Values
│   └── data/                   # Seed CSV files (loaded by cds deploy)
│
├── srv/
│   ├── service.js              # BridgeManagementService registration (barrel only)
│   ├── service.cds             # CDS service definition for BridgeManagementService
│   ├── admin-service.js        # AdminService implementation
│   ├── admin-service.cds       # AdminService CDS definition
│   ├── server.js               # Express server: Helmet, CSRF, custom routers
│   ├── audit-log.js            # diffRecords(), writeChangeLogs()
│   ├── mass-upload.js          # DATASETS, BRIDGE_COLUMNS, importers
│   ├── feature-flags.js        # KNOWN_FLAGS, isFeatureEnabled(), requireFeature()
│   ├── system-config.js        # getConfigBool(), getConfigInt() — SystemConfig cache
│   ├── bhi-bsi-engine.js       # Multi-modal BHI/BSI scoring formula
│   ├── bhi-bsi-api.js          # Express router mounted at /bhi-bsi/api
│   ├── attributes-api.js       # Express router mounted at /attributes/api
│   ├── reports-api.js          # Express router mounted at /reports/api
│   ├── qr-api.js               # QR code generation
│   ├── demo-data.js            # activateDemoData() / clearDemoData()
│   ├── notification-service.js # SAP Alert Notification integration
│   ├── user-activity.js        # recordActivity() for session tracking
│   ├── handlers/               # One handler file per domain
│   │   ├── common.js           # Shared helpers: getNextIntegerKey(), logAudit
│   │   ├── bridges.js
│   │   ├── restrictions.js
│   │   ├── inspections.js
│   │   ├── defects.js
│   │   ├── capacities.js
│   │   ├── conditions.js       # BridgeConditionSurveys
│   │   ├── load-ratings.js     # LoadRatingCertificates
│   │   ├── load-ratings-new.js # BridgeLoadRatings
│   │   ├── permits.js
│   │   ├── risk-assessments.js
│   │   ├── nhvr-compliance.js
│   │   ├── elements.js
│   │   ├── alerts.js
│   │   ├── maintenance.js
│   │   ├── dashboard.js
│   │   ├── admin.js
│   │   ├── mass-edit.js
│   │   └── upload.js
│   └── services/               # CDS service projection files
│       ├── bridges.cds
│       ├── restrictions.cds
│       ├── defects.cds
│       └── ... (one per domain)
│
├── test/
│   ├── unit/                   # Pure function tests (no CDS runtime)
│   ├── integration/            # Integration tests against SQLite in-memory
│   ├── attachments.test.js
│   ├── condition.test.js
│   ├── restrictions.test.js
│   └── ...
│
├── scripts/
│   ├── rebuild-bridge-csvs.js  # Remap bridge CSVs to exact BRIDGE_COLUMNS headers
│   ├── generate-bulk-bridges.js
│   ├── generate-mass-upload-workbook.js
│   └── seed-attributes.js
│
├── docs/                       # Technical documentation
├── mta.yaml                    # BTP MTA descriptor
├── package.json                # v1.3.0, engines: node>=20
└── xs-security.json            # XSUAA scope + role definitions
```

---

## 3. Local Development Setup

### Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 20.x (use `nvm use 20`) |
| `@sap/cds-dk` | installed globally or via devDependencies |
| SQLite | bundled via `@cap-js/sqlite` |

### Start server

```bash
nvm use 20
npm install
npm start          # cds-serve on http://localhost:8008
```

> Port 8008 is hardcoded because port 4004 is occupied by a separate project on this machine. Never change it to 4004.

### Key URLs

| URL | Purpose |
|---|---|
| `http://localhost:8008/fiori-apps.html` | Fiori Launchpad (all tiles) |
| `http://localhost:8008/odata/v4/admin/` | AdminService OData root |
| `http://localhost:8008/odata/v4/bridge-management/` | BridgeManagementService OData root |
| `http://localhost:8008/mass-upload/api/` | Mass upload REST API |
| `http://localhost:8008/health` | Health endpoint |
| `http://localhost:8008/health/deep` | Deep health with DB ping |

### FLP tile navigation (local)

Navigate between admin sub-screens via the component router — never set `window.location.hash` directly:

```js
// Open from browser console:
sap.ui.core.Component.registry.all()['application-BmsAdmin-manage-component']
  .getRouter().navTo('gisConfig')
```

Valid route names: `changeDocuments`, `dataQuality`, `userAccess`, `systemConfig`, `bnacConfig`, `gisConfig`, `attributeConfig`, `attributeReport`, `apiDocs`, `featureFlags`.

### Deploy to local SQLite

```bash
rm -f db.sqlite db.sqlite-wal db.sqlite-shm db.sqlite-journal   # clear stale WAL files
npx cds deploy --to sqlite:db.sqlite
```

Always verify `npm start` succeeds after schema changes — `cds deploy` returning 0 does not guarantee the runtime model loads.

---

## 4. Architecture: Service Isolation Rule

BMS runs two entirely separate CAP service instances. This is the single most important architectural rule.

```
AdminService          → /odata/v4/admin/
BridgeManagementService → /odata/v4/bridge-management/
PublicBridgeService   → /odata/v4/public/
```

**Handlers registered on one service DO NOT fire for the other**, even when they project the same underlying DB entities (`bridge.management.*`).

### Consequences

| If you add this to BridgeManagementService... | You MUST also add it to AdminService |
|---|---|
| `after('READ', Bridges)` virtual field computation | Yes — AdminService callers see `null` otherwise |
| `before('CREATE', BridgeInspections)` auto-ref | Yes — FE4 ObjectPage uses AdminService |
| Bound action `deactivate()` handler | Yes — declare in `admin-service.cds` AND implement in `admin-service.js` |
| `before(['CREATE','UPDATE'], BridgeRiskAssessments)` risk scoring | Yes — records created via AdminService have null risk scores otherwise |

### Service registration files (barrel only)

`srv/service.js` and `srv/admin-service.js` are registration files. Business logic lives in `srv/handlers/*.js`. Never put logic in the registration files.

```js
// srv/service.js — correct pattern
const helpers = registerCommonHelpers(this)
registerBridgeHandlers(this, helpers)
registerDefectHandlers(this, helpers)
// ...
```

---

## 5. Entity Naming Conventions

### Namespace

All entities live in the `bridge.management` namespace. Always prefix entity references:

```js
SELECT.from('bridge.management.Bridges')
SELECT.from('bridge.management.BridgeInspections')
```

### Primary keys

| Entity type | PK type | Notes |
|---|---|---|
| `Bridges` | `Integer` | Sequential; use `getNextIntegerKey()` from `handlers/common.js` |
| `Restrictions` | `cuid` (UUID) | Auto-generated by CAP |
| All other sub-domain entities | `cuid` (UUID) | Auto-generated by CAP |

Never use `crypto.randomUUID()` or `Math.random()` — use `cds.utils.uuid()` for explicit UUID generation.

### Auto-generated human-readable refs

| Entity | Ref field | Pattern |
|---|---|---|
| `BridgeInspections` | `inspectionRef` | `INS-0001` |
| `BridgeDefects` | `defectId` | `DEF-0001` |
| `BridgeRiskAssessments` | `assessmentId` | `RSK-0001` |
| `BridgeConditionSurveys` | `surveyRef` | `CS-0001` |
| `BridgeLoadRatings` | `ratingRef` | `LR-0001` |
| `BridgePermits` | `permitRef` | `PM-0001` |

---

## 6. Draft vs Plain CRUD

### Draft-enabled entities (`@odata.draft.enabled`)

These entities use the CAP draft flow — the FE4 "Create" button creates a draft, edits are PATCHes, save triggers `draftActivate`.

- `Bridges` (in `AdminService`)
- `Restrictions` (standalone)
- `BridgeConditionSurveys`
- `BridgeLoadRatings`
- `BridgePermits`
- `NhvrRouteAssessments`
- `LoadRatingCertificates`

**Critical**: bound actions on draft-enabled entities require `IsActiveEntity=true` in the URL:

```
POST /admin/Bridges(ID='uuid',IsActiveEntity=true)/deactivate
```

### Plain CRUD entities (no draft)

These are plain `POST / PATCH / DELETE` — no draft activation step.

- `BridgeInspections`
- `BridgeDefects`
- `BridgeCapacities`
- `BridgeRiskAssessments`
- `BridgeScourAssessments`
- `BridgeElements`
- `BridgeCarriageways`
- `AlertsAndNotifications`

These were changed from `Composition of many` to `Association to many` under `Bridges` so they can have standalone CRUD without the "draft-enabled entity can only be modified via its root entity" constraint.

---

## 7. Auto-Ref Generation Pattern

### For draft entities: `before('NEW', Entity.drafts)`

`before('CREATE')` fires after draft activation — too late. Use `before('NEW', Entity.drafts)` to generate the ref when the empty draft is first created.

```js
this.before('NEW', 'BridgeInspections.drafts', async req => {
  const db = await cds.connect.to('db')
  const last = await db.run(
    SELECT.one.from('bridge.management.BridgeInspections')
      .columns('inspectionRef')
      .orderBy('createdAt desc')
  )
  // Always use regex — never .replace('INS-', '') which returns NaN on empty string
  const m = last?.inspectionRef?.match(/^INS-(\d+)$/)
  const seq = m ? parseInt(m[1], 10) + 1 : 1
  req.data.inspectionRef = `INS-${String(seq).padStart(4, '0')}`
})
```

### For plain CRUD entities: `before(['CREATE', 'UPDATE'])`

```js
this.before(['CREATE', 'UPDATE'], 'BridgeDefects', async req => {
  const d = req.data
  if (req.event === 'CREATE' && !d.defectId) {
    const last = await db.run(SELECT.one.from('bridge.management.BridgeDefects')
      .columns('defectId').orderBy('createdAt desc'))
    const m = last?.defectId?.match(/^DEF-(\d+)$/)
    const seq = m ? parseInt(m[1], 10) + 1 : 1
    d.defectId = `DEF-${String(seq).padStart(4, '0')}`
  }
  // Also resolve bridge_ID from bridgeRef on BOTH events
  if (d.bridgeRef) {
    const bridge = await db.run(
      SELECT.one.from('bridge.management.Bridges').where({ bridgeId: d.bridgeRef })
    )
    if (bridge) d.bridge_ID = bridge.ID
  }
})
```

**Note**: `bridge_ID` resolution must run on both `CREATE` and `UPDATE`. Users fill `bridgeRef` via a PATCH (UPDATE), not at initial create time.

---

## 8. Handler Registration

### BridgeManagementService (`srv/service.js`)

```js
module.exports = class BridgeManagementService extends cds.ApplicationService { init() {
  const helpers = registerCommonHelpers(this)  // returns { logAudit, getNextIntegerKey, ... }

  registerBridgeHandlers(this, helpers)
  registerDefectHandlers(this, helpers)
  // Pass helpers to any handler that needs audit logging or key generation

  return super.init()
}}
```

### AdminService (`srv/admin-service.js`)

AdminService is implemented directly in the class body (not via separate registration files). Add new entity logic directly inside the `init()` method.

### Handler file pattern

```js
// srv/handlers/myentity.js
module.exports = function registerMyEntityHandlers(srv, helpers) {
  const { MyEntity } = srv.entities
  const { logAudit } = helpers

  srv.before(['CREATE', 'UPDATE'], MyEntity, async req => { /* ... */ })
  srv.after('READ', MyEntity, async (results, req) => { /* virtual fields */ })
  srv.on('deactivate', MyEntity, async req => { /* ... */ })
}
```

---

## 9. Audit Logging

Audit logging is **mandatory for all entity mutations**. Use `srv/audit-log.js`.

```js
const { diffRecords, writeChangeLogs, fetchCurrentRecord } = require('./audit-log')

// In a handler:
srv.on('UPDATE', Bridges, async req => {
  const db = await cds.connect.to('db')
  const old = await fetchCurrentRecord(db, 'bridge.management.Bridges', req.data.ID)

  // ... perform the update ...

  const diff = diffRecords(old, req.data)
  await writeChangeLogs(db, {
    objectType: 'Bridge',
    objectId:   String(req.data.ID),
    objectName: req.data.bridgeName,
    source:     'OData',
    batchId:    cds.utils.uuid(),
    changedBy:  req.user?.id || 'system',
    changes:    diff
  })
})
```

### `diffRecords(old, new)`

Returns only changed fields, skipping managed fields (`modifiedAt`, `modifiedBy`, `createdAt`, `createdBy`) and draft metadata. Safe to call with `null` old record (full create diff).

### `writeChangeLogs(db, payload)`

Writes to `bridge.management.ChangeLog`. Errors are caught internally — safe to call without try/catch. Never throws.

---

## 10. Mass Upload

### Key constants in `srv/mass-upload.js`

| Constant | Purpose |
|---|---|
| `BRIDGE_COLUMNS` | Column schema for the Bridges sheet |
| `RESTRICTION_COLUMNS` | Column schema for the Restrictions sheet |
| `LOOKUP_COLUMNS` | Schema for all lookup entity sheets |
| `ALLOWED_VALUES_COLUMNS` | Schema for the AllowedValues multi-entity sheet |
| `DATASETS` | Array of dataset descriptors — controls sheet order in workbook |
| `ALLOWED_VALUES_WHITELIST` | Set of entity names that AllowedValues upload is allowed to write to |

### Adding a new uploadable entity

1. Add a new entry to `DATASETS` — lookup sheets must come before `Bridges` and `Restrictions`
2. Define columns using the `column(name, type, opts)` helper
3. Write an `import<EntityName>Rows(rows, db)` function
4. Wire into the `dataset.entity === 'MyEntity'` branch in `importUpload()`
5. Update `REFERENCE_EXAMPLES` if any column is lookup-backed

Never modify the core pipeline (`parseSheetRows`, `importUpload` orchestration logic).

### `parseSheetRows(worksheet)`

Strips BOM (`﻿`), trailing `*`, and lowercases all headers. Do not change this logic.

### `addSheetValidations(ws, datasetRowsByName)`

Adds Excel in-cell dropdowns for all lookup-backed columns. Called inside the `for (const dataset of DATASETS)` loop — all lookup sheets are already in `datasetRowsByName` by the time Bridges/Restrictions are processed.

### CSV rules

- Use `XLSX.utils.sheet_to_csv()` + `fs.writeFileSync(path, csv, 'utf8')` — never `XLSX.writeFile` with `bookType: 'csv'` (adds BOM)
- Never rebuild `mass-upload-bridges-australia.csv` from itself — source from `BMS-MassUpload-Complete.xlsx`
- After any CSV edit: `awk -F',' '{print NF}' db/data/bridge.management-*.csv | sort -u` — all rows must have the same field count

---

## 11. Custom Attributes (EAV)

Custom attributes use a four-table EAV model. No schema changes are needed to add new attribute types.

```
AttributeGroups         — logical grouping (e.g. "Seismic Data")
  └── AttributeDefinitions  — individual attribute (key, label, type, required)
        └── AttributeAllowedValues  — FK: attribute_ID (NOT definition_ID)
AttributeValues         — per-bridge values (objectType + objectId + attributeKey + valueText)
```

### AttributeValues format

| Field | Example |
|---|---|
| `objectType` | `"Bridge"` |
| `objectId` | `"1"` (bridge integer PK as string) |
| `attributeKey` | `"SEISMIC_ZONE"` (matches `AttributeDefinitions.internalKey`) |
| `valueText` | `"Zone A"` |

Do not use UUID FK joins — use string key lookups.

### AttributeGroups: `internalKey` is NOT NULL

Always provide `internalKey` on create. Use `SCREAMING_SNAKE_CASE`: `"SEISMIC_DATA"`.

---

## 12. Feature Flags

### Source of truth: `srv/feature-flags.js`

```js
const KNOWN_FLAGS = [
  'bhiBsiAssessment',
  'bhiBsiOrgComparison',
  'bhiBsiScourPoa',
  'bhiBsiCertificationWorkflow',
  'bhiBsiAdminWeightConfig',
]
```

Flags live in `bridge.management.SystemConfig` with `category = 'Feature Flags'` and key pattern `feature.<flagKey>`.

### Using a flag in a handler

```js
const { isFeatureEnabled, requireFeature } = require('./feature-flags')

// Guard an entire action:
srv.on('assess', 'Bridges', async req => {
  const guard = await requireFeature('bhiBsiAssessment', req)
  if (guard) return guard    // returns req.error(403) if disabled
  // ... proceed
})

// Conditional virtual field:
srv.after('READ', 'Bridges', async (results, req) => {
  if (await isFeatureEnabled('bhiBsiAssessment')) {
    for (const b of results) {
      const scores = computeBhiBsi(b)
      b.bhi = scores.bhi
      b.nbi = scores.nbi
    }
  }
})
```

### 4-step checklist to add a new flag

1. Add a CSV row to `db/data/bridge.management-SystemConfig.csv` with `category=Feature Flags`, `key=feature.<flagKey>`, `value=false`, `dataType=boolean`
2. Add the key string to `KNOWN_FLAGS` in `srv/feature-flags.js`
3. Add to the defaults object in `initFeatureFlags()` in `app/admin-bridges/webapp/Component.js` (set to `false`)
4. Bind `visible="{featureFlags>/yourFlagKey}"` in the relevant view XML

If the flag has a parent dependency, also add to `DEPENDENCIES` map in `feature-flags.js`.

### UI binding

The `featureFlags` JSONModel is set on the Component and propagates to all views:

```xml
<IconTabFilter text="BHI/BSI Assessment"
               visible="{featureFlags>/bhiBsiAssessment}" />
```

---

## 13. CSRF Token Pattern

All mutating requests to custom Express routers (`/mass-upload/api`, `/admin-bridges/api`, `/quality/api`, etc.) require `X-CSRF-Token` in production (XSUAA enabled).

### Controller pattern (UI5)

```js
_getCsrfToken: async function() {
  if (this._csrfToken) return this._csrfToken
  const response = await fetch('/mass-upload/api/csrf', {
    method: 'HEAD',
    headers: { 'X-CSRF-Token': 'Fetch' }
  })
  this._csrfToken = response.headers.get('X-CSRF-Token')
  return this._csrfToken
},

_mutate: async function(url, method, body) {
  const token = await this._getCsrfToken()
  return fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': token
    },
    body: body ? JSON.stringify(body) : undefined
  })
}
```

### Server-side middleware

`validateCsrfToken` in `srv/server.js` checks: value is non-empty, length >= 4, and not the literal string `"fetch"` (case-insensitive). Applied to all mutating custom routes.

---

## 14. Testing Patterns

### Integration tests (real SQLite)

```js
// test/integration/bridges.test.js
const cds = require('@sap/cds')

describe('Bridge CRUD', () => {
  let srv

  beforeAll(async () => {
    srv = await cds.test('.').in(__dirname + '/../..')
  })

  it('creates a bridge', async () => {
    const { Bridges } = cds.entities('bridge.management')
    const result = await INSERT.into(Bridges).entries({ bridgeName: 'Test', ... })
    expect(result).toBeTruthy()
  })
})
```

Do not mock the database — tests use a real SQLite in-memory DB via `@cap-js/sqlite`.

### Unit tests: copy pure functions inline

```js
// test/unit/parseBoolean.test.js
// Copy the function verbatim from mass-upload.js — no imports from srv/
function parseBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const v = value.toLowerCase().trim()
    return v === 'true' || v === 'yes' || v === '1'
  }
  return value === 1
}

describe('parseBoolean', () => {
  it('parses truthy strings', () => {
    expect(parseBoolean('yes')).toBe(true)
    expect(parseBoolean('TRUE')).toBe(true)
  })
})
```

This keeps tests dependency-free (no CDS runtime) and fast.

### Run tests

```bash
npm test          # Jest with --forceExit
```

---

## 15. Top 10 Gotchas

### 1. `class:` is NOT a valid UI5 constructor property

```js
// WRONG — generates "encountered unknown setting 'class'" at runtime
new HBox({ items: [...], class: 'sapUiSmallMargin' })

// CORRECT
new HBox({ items: [...] }).addStyleClass('sapUiSmallMargin')
```

### 2. BOM on CSV headers

`XLSX.writeFile` with `bookType: 'csv'` prepends a UTF-8 BOM. The first column becomes `﻿ID`. Always use `XLSX.utils.sheet_to_csv()` + `fs.writeFileSync(path, csv, 'utf8')`.

### 3. `before('NEW', Entity.drafts)` vs `before('CREATE')`

For draft-enabled entities, `before('CREATE')` fires after draft activation. Use `before('NEW', Entity.drafts)` to populate auto-generated refs at draft creation time.

### 4. Auto-ref regex — never `.replace()`

```js
// WRONG — parseInt("", 10) = NaN → "DEF-0NaN"
const seq = parseInt(last.defectId.replace('DEF-', ''), 10) + 1

// CORRECT
const m = last?.defectId?.match(/^DEF-(\d+)$/)
const seq = m ? parseInt(m[1], 10) + 1 : 1
```

### 5. `fioriSandboxConfig.json` trailing comma

A single trailing comma after the last JSON object silently breaks ALL FLP navigation. Validate after every tile change:

```bash
node -e "require('./app/appconfig/fioriSandboxConfig.json')"
```

### 6. Stale SQLite WAL files

`cannot rollback - no transaction is active` on fresh deploy = leftover WAL files. Fix:

```bash
rm -f db.sqlite db.sqlite-wal db.sqlite-shm db.sqlite-journal
```

### 7. `unsafe-eval` required for UI5 1.145

Helmet CSP `script-src` must include `'unsafe-eval'`. UI5's `requireSync` loader uses `eval()`. Without it the entire component fails to load silently.

### 8. `bridge_ID` resolution on both CREATE and UPDATE

Users set `bridgeRef` via a PATCH (UPDATE) to the draft, not during the initial POST. If your handler only resolves `bridge_ID` on `CREATE`, it is always `null`.

### 9. FieldGroup ID collisions across entities

`FieldGroup#General` on two entities in the same service file — only the last survives at runtime. Always prefix: `BridgeIdentity`, `DefectCondition`, `InspElemCondition`.

### 10. SAP FE console errors in local FLP are expected

`"There should be a sap.fe.core.AppComponent as owner of the control"` errors in local shell are SAP FE framework limitations. They do not appear in BTP. Ignore them.
