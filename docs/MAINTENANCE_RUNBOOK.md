# Bridge Management System — Maintenance Runbook

Version 1.7.2 | Last updated 2026-05-14

---

## Table of Contents

1. [Deployment Pipeline](#1-deployment-pipeline)
2. [Pre-Deploy Checklist](#2-pre-deploy-checklist)
3. [Post-Deploy Smoke Tests](#3-post-deploy-smoke-tests)
4. [Stuck Deploy Recovery](#4-stuck-deploy-recovery)
5. [Incident Response](#5-incident-response)
6. [Schema Migration](#6-schema-migration)
7. [Seed CSV Rules](#7-seed-csv-rules)
8. [Adding a New Entity](#8-adding-a-new-entity)
9. [Adding a New FLP Tile](#9-adding-a-new-flp-tile)
10. [Mass Upload Extension](#10-mass-upload-extension)
11. [Feature Flag Lifecycle](#11-feature-flag-lifecycle)
12. [Monthly Maintenance Tasks](#12-monthly-maintenance-tasks)

---

## 1. Deployment Pipeline

### Build validation (run before every deploy)

```bash
npm run validate-build
# Runs: npx cds build --production && mbt build --mtar BridgeManagement-validate.mtar
# Both must pass. If either fails, do not deploy.
```

### Deploy sequence

```bash
# 1. Ensure Node 20
nvm use 20

# 2. Validate build
npm run validate-build

# 3. Build the production MTAR
mbt build

# 4. Deploy to BTP CF
cf deploy mta_archives/BridgeManagement_1.7.2.mtar

# 5. Smoke test
curl https://<app-url>/health/deep
```

### MTA module deploy order (managed by CF MTA deployer)

1. `BridgeManagement-db-deployer` — HDI container deploy (schema + seed CSVs)
2. `BridgeManagement-srv` — Node.js server
3. HTML5 app modules — parallel (`enable-parallel-deployments: true`)
4. `BridgeManagement-app-deployer` — uploads HTML5 artifacts to HTML5 Repo
5. `BridgeManagement` (App Router) — restaged after app-deployer

### Version bump

Update `version` in both `package.json` and `mta.yaml` before building the MTAR. The version string appears in the App Router shell bar badge.

---

## 2. Pre-Deploy Checklist

Run all of these before `mbt build`. A single failure blocks deploy.

### 1. CDS compile check

```bash
npx cds compile db/ srv/
# Must exit 0 with no errors. Warnings for missing @odata.draft.enabled on sub-domain entities are expected.
```

### 2. Local SQLite deploy (schema + seeds)

```bash
rm -f db.sqlite db.sqlite-wal db.sqlite-shm db.sqlite-journal
npx cds deploy --to sqlite:db.sqlite
# Must exit 0. Then verify the server starts:
npm start &
sleep 5
curl http://localhost:8008/health/deep
kill %1
```

### 3. FLP config JSON validation

```bash
node -e "require('./app/appconfig/fioriSandboxConfig.json')"
# Trailing comma in a JSON array silently breaks ALL FLP navigation.
```

### 4. CSV field count check

```bash
awk -F',' '{print NF}' db/data/bridge.management-*.csv | sort -u
# Each file should print a single number. Multiple numbers = rows with different field counts = deploy failure.
```

### 5. XML namespace check on UI5 views

```bash
find app/ -name '*.view.xml' -o -name '*.fragment.xml' | \
  xargs -I{} python3 -c "import xml.etree.ElementTree as ET; ET.parse('{}'); print('OK: {}')" 2>&1 | grep -v OK
# Any output = XML parse error = component fails to load
```

### 6. ui5.yaml metadata name format

```bash
grep -r "metadata:" app/*/ui5.yaml | grep "name:"
# All names must match [a-z0-9._-]+ (UI5 CLI v4 rule).
# BridgeManagement.bridgespublic is invalid; bridges-public is valid.
```

---

## 3. Post-Deploy Smoke Tests

### Health check

```bash
curl https://<app-url>/health/deep
# Expected: { "status": "ok", "db": "connected", "version": "1.7.2" }
```

### OData endpoint check

```bash
curl -H "Authorization: Bearer <token>" \
     https://<srv-url>/odata/v4/admin/Bridges?$top=1
# Expected: { "value": [ { "ID": ..., "bridgeName": ... } ] }
```

### FLP tile spot check

Open each of the following URLs in the browser after login:

| Intent | Tile |
|---|---|
| `#Bridges-manage` | Bridge Asset Registry list |
| `#BmsAdmin-manage` | BMS Admin console |
| `#Dashboard-display` | Executive KPI dashboard |
| `#Map-display` | GIS map with bridge markers |
| `#Restrictions-manage` | Restrictions register |
| `#Bridges-manage&/BridgeInspections` | Inspections tile |
| `#Bridges-manage&/BridgeDefects` | Defects tile |
| `#Bridges-manage&/AssetIQScores` | AssetIQ Scores tile |

### Mass upload check

```bash
curl -s -X POST https://<srv-url>/mass-upload/api/validate \
  -H "Authorization: Bearer <token>" \
  -H "X-CSRF-Token: <token>" \
  -H "Content-Type: application/json" \
  -d '{"dataset":"Bridges","fileName":"test.csv","contentBase64":"<base64>"}' \
  | jq .
# Expected: { "totalCount": N, "validCount": N, "errorCount": 0 }
```

---

## 4. Stuck Deploy Recovery

### Symptom

```
There is an ongoing operation for the MTA with ID "BridgeManagement" and version 1.7.2.
Do you want to abort the ongoing operation? y/n
```

### Auto-confirm and retry

```bash
printf 'y\n' | cf deploy mta_archives/BridgeManagement_1.7.2.mtar
```

### Monitor running operations

```bash
cf mta-ops
# Lists all running/failed/finished MTA operations with their operation IDs
```

### Download full logs from a failed operation

```bash
cf dmol -i <operation-id>
# Downloads OPERATION.log including the full HDI deployer output.
# Look for: "ERROR" lines, "record has more than expected N fields" (CSV issues),
#           "Cannot rollback - no transaction is active" (stale WAL files in HANA).
```

### HDI deploy failure: field count mismatch

```
ERROR: record has more than expected N fields in table DATA/<table>.hdbtabledata
```

1. Open the failing CSV in `db/data/`
2. Find the offending row: `awk -F',' '{print NF, NR, $0}' db/data/bridge.management-<Table>.csv | sort -n`
3. Count expected fields from the `import_columns` array in the corresponding `.hdbtabledata` file
4. Fix by quoting fields that contain commas, or removing extra trailing commas
5. Rebuild MTAR and redeploy

---

## 5. Incident Response

### P1 — System unavailable (all users affected)

| Step | Action |
|---|---|
| 1 | Check `cf app BridgeManagement-srv --guid` then `cf logs BridgeManagement-srv --recent` |
| 2 | Check `GET /health/deep` — if 500, problem is in the app layer |
| 3 | Check HANA service status in BTP cockpit — if HDI container unavailable, escalate to SAP support |
| 4 | Roll back: `cf deploy mta_archives/<previous-version>.mtar` |
| 5 | Notify stakeholders via SAP Alert Notification |

### P2 — Partial outage (specific tile broken)

| Symptom | Likely cause | Fix |
|---|---|---|
| Tile shows "App could not be opened" | Missing route in `manifest.json` or dead FLP intent | Add route + target in manifest; fix fioriSandboxConfig.json |
| OData 403 on a specific entity | Missing `@requires` annotation or XSUAA scope not in role | Check `admin-service.cds` for `@restrict` and `xs-security.json` for scope |
| Blank ObjectPage body | Missing `@UI.Facets` on the entity in `fiori-service.cds` | Add Facets with at least one FieldGroup |
| Grey map tiles | CSP blocking OpenStreetMap or Leaflet CDN | Check Helmet CSP in `srv/server.js`, add missing `img-src` / `connect-src` entries |
| Mass upload returns 413 | JSON body exceeds `express.json({ limit: '25mb' })` | Raise limit in `srv/server.js`; effective raw-file limit ~18 MB |

### P3 — Non-blocking issue (degraded functionality)

Log to JIRA/backlog. Include steps to reproduce and the affected FLP intent. Apply in next sprint.

---

## 6. Schema Migration

### Adding a new field to an existing entity

1. Add field to the relevant file in `db/schema/` (e.g. `db/schema/bridge-entity.cds`)
2. Add the field to the corresponding seed CSV header in `db/data/bridge.management-<Entity>.csv` with empty/default values for existing rows
3. Run `npx cds compile db/ srv/` — must pass
4. Run `npx cds deploy --to sqlite:db.sqlite` — must pass
5. Run `npm start` — must start without errors
6. Add annotations in `app/admin-bridges/fiori-service.cds` if the field should appear in FE4
7. Commit schema + seed CSV together

### Adding a new entity

See [Section 8](#8-adding-a-new-entity).

### WAL file errors during local deploy

```
Error: cannot rollback - no transaction is active
```

This is a SQLite artefact from a previous failed deploy, not a code bug. Fix:

```bash
rm -f db.sqlite db.sqlite-wal db.sqlite-shm db.sqlite-journal
npx cds deploy --to sqlite:db.sqlite
```

### HANA migration

For HANA deployments, schema changes are applied by the HDI deployer. Never alter HANA tables directly. After any schema change:

1. Run `cds build --production` to generate `gen/db/` artefacts
2. The `hdb` module in mta.yaml picks up `gen/db/` on the next deploy
3. HDI handles `ALTER TABLE` DDL for new columns automatically
4. For column removals or type changes: HDI requires a migration `.hdbmigrationtable` file — contact the HANA DBA

---

## 7. Seed CSV Rules

### Critical rules

| Rule | Detail |
|---|---|
| Uniform field count | Every data row must have exactly the same number of fields as the header. Trailing commas on rows produce extra empty columns that fail HDI deploy. |
| Quote commas in text | If a field value contains a comma, wrap it in double quotes: `"No waterway — spanning road, rail, or infrastructure"` |
| Never rebuild australia.csv from itself | `db/data/mass-upload-bridges-australia.csv` must be sourced from `BMS-MassUpload-Complete.xlsx` Bridges sheet. Use `node scripts/rebuild-bridge-csvs.js`. |
| Lookup CSV separators | Some lookups use `;` (semicolon) for multi-column definitions. Check before editing. |
| Code changes propagate | Do not change `code` values in lookup tables without migrating existing bridge/restriction records that reference them as foreign-key strings. |

### Verify field counts before deploy

```bash
# Each line shows unique NF counts for that file. Single number = OK. Multiple = problem.
for f in db/data/bridge.management-*.csv; do
  counts=$(awk -F',' '{print NF}' "$f" | sort -u | tr '\n' ' ')
  echo "$f: $counts"
done
```

### Regenerate bridge CSVs

```bash
node scripts/rebuild-bridge-csvs.js
# Reads 56 real bridges from BMS-MassUpload-Complete.xlsx
# Writes mass-upload-bridges-australia.csv with exact BRIDGE_COLUMNS headers
```

---

## 8. Adding a New Entity

Follow this 8-step checklist in order. Never skip the `cds compile` and `cds deploy` verification between steps.

### Step 1: Schema

Create or extend a file in `db/schema/`:

```cds
// db/schema/my-entity.cds
namespace bridge.management;
using { cuid, managed } from '@sap/cds/common';

entity MyEntities : cuid, managed {
  myEntityRef : String(40);  // e.g. MYE-0001 (auto-generated)
  bridge      : Association to Bridges;
  bridgeRef   : String(40);  // FK string for value-help
  active      : Boolean default true;
  // ... domain fields
}
```

Add `using from './schema/my-entity';` to `db/schema.cds`.

### Step 2: Service CDS projection

Create `srv/services/my-entity.cds`:

```cds
using { bridge.management as bm } from '../../db/schema';

extend service BridgeManagementService {
  @odata.draft.enabled: false
  entity MyEntities as projection on bm.MyEntities
    actions {
      action deactivate() returns MyEntities;
      action reactivate() returns MyEntities;
    };
}
```

Add the corresponding projection to `srv/admin-service.cds`.

### Step 3: Handler file

Create `srv/handlers/my-entity.js`:

```js
module.exports = function registerMyEntityHandlers(srv, helpers) {
  const { logAudit } = helpers || {}

  srv.before(['CREATE', 'UPDATE'], 'MyEntities', async req => {
    // Auto-ref generation, bridge_ID resolution
  })

  srv.after('READ', 'MyEntities', async (results, req) => {
    // Virtual fields
  })

  srv.on('deactivate', 'MyEntities', async req => {
    // Soft delete: UPDATE active = false
  })
}
```

### Step 4: Register in service.js and admin-service.js

In `srv/service.js`:

```js
const registerMyEntityHandlers = require('./handlers/my-entity')
// inside init():
registerMyEntityHandlers(this, helpers)
```

In `srv/admin-service.js`: implement the same logic directly in the `init()` body.

### Step 5: FE4 Annotations

Add to `app/admin-bridges/fiori-service.cds`:

```cds
// Minimum required for a functional standalone ListReport + ObjectPage
annotate AdminService.MyEntities with @(
  Capabilities: {
    InsertRestrictions.Insertable: true,
    UpdateRestrictions.Updatable: true,
    DeleteRestrictions.Deletable: false
  },
  UI.HeaderInfo: { TypeName: 'My Entity', TypeNamePlural: 'My Entities',
    Title: { Value: myEntityRef } },
  UI.SelectionFields: [bridge_ID, active],
  UI.LineItem: [
    { Value: myEntityRef, Label: 'Ref' },
    { Value: bridge.bridgeName, Label: 'Bridge' }
  ],
  UI.Facets: [{
    $Type: 'UI.CollectionFacet', Label: 'Details', ID: 'myDetails',
    Facets: [{ $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#MyIdentity' }]
  }],
  UI.FieldGroup#MyIdentity: {
    Label: 'Identity',
    Data: [{ Value: myEntityRef }, { Value: bridge.bridgeName }]
  }
);
```

### Step 6: manifest.json routes

Add to `app/admin-bridges/webapp/manifest.json` under `sap.ui5.routing`:

```json
{
  "name": "MyEntitiesList",
  "pattern": "MyEntities:?query:",
  "target": "MyEntitiesListTarget"
},
{
  "name": "MyEntitiesObjectPage",
  "pattern": "MyEntities({key}):?query:",
  "target": ["MyEntitiesListTarget", "MyEntitiesObjectPageTarget"]
}
```

And the corresponding targets:

```json
"MyEntitiesListTarget": {
  "type": "Component",
  "id": "MyEntitiesList",
  "name": "sap.fe.templates.ListReport",
  "options": { "settings": { "entitySet": "MyEntities", "title": "My Entities" } }
},
"MyEntitiesObjectPageTarget": {
  "type": "Component",
  "id": "MyEntitiesObjectPage",
  "name": "sap.fe.templates.ObjectPage",
  "options": { "settings": { "entitySet": "MyEntities" } }
}
```

### Step 7: FLP tile entries

See [Section 9](#9-adding-a-new-flp-tile).

### Step 8: Seed CSV

Create `db/data/bridge.management-MyEntities.csv` with the exact entity field names as headers:

```csv
ID,myEntityRef,bridge_ID,bridgeRef,active,createdAt,createdBy,modifiedAt,modifiedBy
```

Leave it empty or add sample rows. Run `npx cds deploy --to sqlite:db.sqlite` to verify.

---

## 9. Adding a New FLP Tile

Three files must be updated in sync. Missing any one leaves a dead intent.

### File 1: `app/fiori-apps.html`

Add to the `tiles` array of the appropriate group:

```json
{
  "id": "myEntitiesTile",
  "title": "My Entities",
  "subtitle": "View and manage",
  "icon": "sap-icon://document",
  "tileType": "sap.ushell.ui.tile.StaticTile",
  "properties": {
    "targetURL": "#Bridges-manage&/MyEntities"
  }
}
```

Add to the `inbounds` object:

```json
"Bridges-manage-MyEntities": {
  "semanticObject": "Bridges",
  "action": "manage",
  "title": "My Entities",
  "signature": {
    "parameters": {},
    "additionalParameters": "allowed"
  },
  "resolutionResult": {
    "applicationType": "SAPUI5",
    "additionalInformation": "SAPUI5.Component=admin-bridges",
    "url": "/admin-bridges/webapp"
  }
}
```

### File 2: `app/appconfig/fioriSandboxConfig.json`

Add to the tiles array of the correct group **and** to the `inbounds` object — same structure as `fiori-apps.html`.

### Validate after editing

```bash
node -e "require('./app/appconfig/fioriSandboxConfig.json')"
```

---

## 10. Mass Upload Extension

Adding a new entity to the mass upload pipeline requires only one new DATASETS entry — never modify the core pipeline.

### Add a DATASETS entry in `srv/mass-upload.js`

```js
{
  name:     'MyEntities',
  label:    'My Entities',
  entity:   'bridge.management.MyEntities',
  columns:  MY_ENTITY_COLUMNS,     // define above DATASETS
  importer: importMyEntityRows     // define separately
}
```

### Importer function pattern

```js
async function importMyEntityRows(rows, db) {
  const inserted = [], updated = [], skipped = []
  for (const row of rows) {
    // resolve bridge_ID from bridgeRef
    // upsert or insert
  }
  return { inserted, updated, skipped }
}
```

### Position in DATASETS array

Lookup sheets must come before `Bridges` and `Restrictions`. If your entity depends on lookup data, place it after those lookups but before `Bridges`.

---

## 11. Feature Flag Lifecycle

### Add a flag (dev)

1. Add CSV row to `db/data/bridge.management-SystemConfig.csv`
2. Add key to `KNOWN_FLAGS` in `srv/feature-flags.js`
3. Add to defaults in `initFeatureFlags()` in `Component.js`
4. Bind `visible="{featureFlags>/myFlag}"` in the view

### Enable in staging

Via BMS Admin → Feature Flags screen, or:

```bash
curl -X PATCH https://<srv-url>/system/api/features/myFlag \
  -H "Authorization: Bearer <admin-token>" \
  -H "X-CSRF-Token: <token>" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

### Ramp in production

Toggle via Feature Flags screen. The API returns `{ flagKey, previousValue, newValue, cascadeDisabled }`. Changes are written to ChangeLog.

### Remove when permanent

1. Remove the `visible=` binding from the view
2. Remove from `KNOWN_FLAGS` and `DEPENDENCIES`
3. Remove from `initFeatureFlags()` defaults in Component.js
4. Delete the SystemConfig CSV row
5. Remove `requireFeature()` guards from handlers

---

## 12. Monthly Maintenance Tasks

### Security

```bash
# Check for vulnerabilities
npm audit
npm audit fix   # auto-fix non-breaking patches
# Review any high/critical manually
```

### Database

```sql
-- Run in HANA cockpit or via cf ssh tunnel
-- Check ChangeLog growth
SELECT COUNT(*) FROM "BRIDGE_MANAGEMENT_CHANGELOG";
-- Delete entries older than 3 years (adjust retention policy)
DELETE FROM "BRIDGE_MANAGEMENT_CHANGELOG" WHERE CHANGEDAT < ADD_YEARS(NOW(), -3);
```

### Indexes

Verify the following indexes exist in HANA (should be created by HDI deployer, but check after any schema changes):

| Entity | Index columns |
|---|---|
| `ChangeLog` | `(objectId, changedAt)` |
| `Bridges` | `(state, isActive, bridgeId)` |
| `BridgeDefects` | `(bridge_ID, active, severity)` |
| `AlertsAndNotifications` | `(status, entityType)` |
| `BridgeInspections` | `(bridge_ID, inspectionDate)` |
| `BridgeRiskAssessments` | `(bridge_ID, reviewDueDate)` |

### Test suite

```bash
npm test
# All tests should pass. Any failure blocks the next release.
```

### Lookup table sync

Check that no bridge or restriction records reference lookup codes that have been removed or renamed:

```sql
SELECT b.bridgeId, b.state
FROM "BRIDGE_MANAGEMENT_BRIDGES" b
LEFT JOIN "BRIDGE_MANAGEMENT_STATES" s ON b.state = s.code
WHERE b.state IS NOT NULL AND s.code IS NULL;
```

### mtar archive cleanup

```bash
ls -lh mta_archives/
# Keep the last 3 versions. Delete older ones.
rm mta_archives/BridgeManagement_1.5.*.mtar
```
