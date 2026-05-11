# BMS Reusable Components — Technical Reference

This document describes the 6 core reusable components in the Bridge Management System. Each component is designed for extraction and reuse across other SAP CAP asset-management applications.

---

## 1. Audit Log

**Purpose**: Field-level change tracking for all entity mutations.

**Files**:
- `srv/audit-log.js` — Core diff and write functions
- `db/schema.cds` entity `ChangeLog` — Storage
- `srv/admin-service.cds` entity `ChangeLog` — OData exposure (read-only)

**Public API**:
```javascript
const { writeChangeLogs, diffRecords, fetchCurrentRecord } = require('./audit-log')

// Compute what changed between two snapshots
const changes = diffRecords(oldRecord, newRecord)
// → [{ fieldName: 'condition', oldValue: 'Good', newValue: 'Fair' }]

// Write changes to ChangeLog table
await writeChangeLogs(db, {
  objectType: 'Bridge',      // Entity type label
  objectId:   String(id),    // Primary key as string
  objectName: bridge.bridgeName,
  source:     'OData',       // 'OData' | 'MassEdit' | 'MassUpload'
  batchId:    cds.utils.uuid(),  // Groups all fields from one save
  changedBy:  req.user?.id || 'system',
  changes                    // From diffRecords()
})
```

**Usage Pattern**:
```javascript
// In a CAP service handler:
this.before('UPDATE', MyEntity, async (req) => {
  if (!req.data?.ID) return
  const db = await cds.connect.to('db')
  req._auditOld = await fetchCurrentRecord(db, 'my.namespace.MyEntity', { ID: req.data.ID })
})

this.after('UPDATE', MyEntity, async (_result, req) => {
  if (!req._auditOld) return
  const db = await cds.connect.to('db')
  const fresh = await fetchCurrentRecord(db, 'my.namespace.MyEntity', { ID: req._auditOld.ID })
  const changes = diffRecords(req._auditOld, fresh)
  if (!changes.length) return
  await writeChangeLogs(db, { objectType: 'MyEntity', objectId: String(req._auditOld.ID),
    objectName: fresh.name || String(req._auditOld.ID), source: 'OData',
    batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system', changes })
})
```

**ChangeLog Entity** (add to your db/schema.cds):
```cds
entity ChangeLog {
  key ID         : UUID;
  changedAt      : Timestamp;
  changedBy      : String(111);
  objectType     : String(40);
  objectId       : String(111);
  objectName     : String(255);
  fieldName      : String(111);
  oldValue       : LargeString;
  newValue       : LargeString;
  changeSource   : String(40);
  batchId        : String(111);
}
annotate ChangeLog with @(cds.persistence.indexes: [
  { name: 'idx_cl_changedat',  columns: ['changedAt'] },
  { name: 'idx_cl_objecttype', columns: ['objectType'] },
  { name: 'idx_cl_composite',  columns: ['objectType', 'objectId', 'changedAt'] }
]);
```

**Performance**: Indexes are REQUIRED on changedAt, objectType, objectId, and batchId. Without them, queries on 100k+ rows will timeout.

---

## 2. Mass Upload

**Purpose**: CSV/Excel bulk import for any entity with template generation, validation preview, and audit trail.

**Files**:
- `srv/mass-upload.js` — All import logic; extend DATASETS array to add new entities
- `app/mass-upload/webapp/` — Upload wizard UI

**Extension Point** (add a new uploadable entity):
```javascript
// In srv/mass-upload.js, add to DATASETS array:
{
  name: 'MyEntities',
  label: 'My Entities',
  description: 'Bulk upload for My Entity records',
  entity: 'my.namespace.MyEntity',
  columns: MY_ENTITY_COLUMNS,
  orderBy: 'entityRef',
  importer: importMyEntityRows
}
```

**Column Definition Pattern**:
```javascript
const MY_ENTITY_COLUMNS = [
  column('entityRef',   'string', { required: true }),  // Natural key for upsert
  column('bridgeRef',   'string', { required: true }),  // FK reference (resolved to bridge_ID)
  column('description', 'string'),
  column('value',       'decimal'),
  column('active',      'boolean'),
]
```

**Importer Function Pattern** (for cuid entities with bridgeRef):
```javascript
async function importMyEntityRows(tx, dataset, rows, warnings, auditContext) {
  const normalized = normalizeRows(dataset, rows, warnings)
  if (!normalized.length) return emptySummary(dataset)
  await enrichRowsWithBridgeId(tx, normalized, dataset.name)  // resolves bridgeRef → bridge_ID
  for (const row of normalized) {
    if (!row.status) row.status = 'Active'  // default
    if (row.active === null || row.active === undefined) row.active = true
  }
  return importCuidEntityRows(tx, dataset, normalized.map(r => ({ ...r, __alreadyNormalized: true })), warnings, auditContext, {
    naturalKey: 'entityRef',   // Used for upsert lookup
    objectType: 'MyEntity',    // For audit log
    getName: r => `${r.bridgeRef} / ${r.entityRef}`
  })
}
```

**File size limit**: 50 MB raw file (~67 MB as base64). Enforced in `srv/server.js`.

---

## 3. Mass Update (Mass Edit)

**Purpose**: Inline spreadsheet-style editing for large entity lists without leaving the application.

**Files**:
- `app/mass-edit/webapp/controller/MassEdit.controller.js` — Core grid + save logic
- `app/mass-edit/webapp/view/MassEdit.view.xml` — Dynamic column table
- `srv/server.js` functions `loadMassEditBridges`, `saveMassEditBridges` — Backend data + save

**Extension Point** (add a new entity to mass edit):
Add a new key to `ENTITY_CONFIG` in the controller:
```javascript
MY_ENTITY: {
  key: 'MY_ENTITY',
  endpoint: 'api/my-entities',
  saveEndpoint: 'api/my-entities/save',
  statusField: 'status',
  statusOptionsPath: '/options/myStatuses',
  searchFields: ['entityRef', 'name'],
  fields: [
    { key: 'entityRef',   type: 'text',   editable: false, minWidth: 130 },
    { key: 'name',        type: 'text',   editable: true,  minWidth: 200 },
    { key: 'status',      type: 'select', editable: true,  minWidth: 140, optionsPath: '/options/myStatuses' },
    { key: 'active',      type: 'boolean',editable: true,  minWidth: 80 },
  ]
}
```

**Dirty tracking**: Rows are cloned to `_baselineRows` on load. Any cell change marks `row.__dirty = true`. Only dirty rows are sent to save endpoint. `onDiscard()` restores all rows from baseline.

---

## 4. Maps

**Purpose**: Geospatial viewer with bridge/asset markers, clustering, heatmap, draw tools, filters, and export.

**Files**:
- `app/map-view/webapp/controller/Main.controller.js` (2,328 lines) — All map logic
- `app/map-view/webapp/view/Main.view.xml` — Layout + controls
- `srv/server.js` routes `/map/api/*` — Data endpoints
- `srv/services/map.cds` — OData view for map data

**Data Contract** (backend must return for each bridge):
```json
{ "ID": 1, "bridgeId": "NSW-001", "bridgeName": "...", "lat": -33.8, "lng": 151.2,
  "condition": "Good", "conditionRating": 8, "postingStatus": "Unrestricted",
  "state": "NSW", "structureType": "...", "yearBuilt": 1995, "isActive": true }
```

**GIS Config** (`bridge.management.GISConfig` table): Controls feature flags (heatmap, time slider, proximity, clustering, stats panel), default basemap, alert threshold, custom WMS layers.

**Feature Flags**: All map features are controlled by `GISConfig.enableX` boolean fields. Load via `GET /map/api/config`.

**Reference Layers**: `REFERENCE_LAYERS` array in controller defines external tile/WMS layers (ABS boundaries, etc.). Add new layers by appending to this array — format: `{ id, label, type: 'xyz'|'wms', url, attribution }`.

---

## 5. Custom Attributes (EAV)

**Purpose**: Configurable metadata fields for any entity without schema changes.

**Files**:
- `db/attributes-schema.cds` — Schema (108 lines)
- `srv/attributes-api.js` — REST API (663 lines)
- `app/attributes-admin/webapp/` — Admin UI for managing groups/definitions
- `app/admin-bridges/webapp/ext/controller/CustomAttributesInit.js` — Rendering on Bridge ObjectPage
- `app/restrictions/webapp/ext/controller/CustomAttributesRestrInit.js` — Rendering on Restriction ObjectPage

**EAV Structure**:
```
AttributeGroups (grouping)
  └─ AttributeDefinitions (fields: name, dataType, unit, helpText, required, min/max)
       └─ AttributeAllowedValues (for SingleSelect/MultiSelect types)
AttributeValues (stored values: objectType + objectId + attributeKey → typed value columns)
AttributeValueHistory (audit trail of value changes)
```

**Data Types**: `Text | Integer | Decimal | Date | Boolean | SingleSelect | MultiSelect`

**To add a new object type** (e.g., 'inspection'):
1. Create AttributeGroups with `objectType: 'inspection'`
2. Define AttributeDefinitions with appropriate dataTypes
3. Create AttributeObjectTypeConfig rows to enable/require per type
4. Copy `CustomAttributesInit.js` pattern for the new ObjectPage
5. Wire `GET/POST /attributes/api/values/inspection/:id` for the new object page

**REST API**:
- `GET /attributes/api/config?objectType=X` — get schema (groups + definitions)
- `GET /attributes/api/values/X/:id` — get current values
- `POST /attributes/api/values/X/:id` — save values (upsert, validates required)
- `GET /attributes/api/history/X/:id/:key` — value history for one attribute
- `GET /attributes/api/export?objectType=X` — CSV export of all records × attributes
- `POST /attributes/api/import?objectType=X` — bulk import from CSV/Excel (admin only)

**Authentication**: All endpoints require `authenticated-user`. Import/export require `admin` scope.

---

## 6. Change Documents

**Purpose**: Two-tab audit UI showing record-level change events (Tab 1) and field-level diffs (Tab 2).

**Files**:
- `app/bms-admin/webapp/controller/ChangeDocuments.controller.js` (410 lines)
- `app/bms-admin/webapp/view/ChangeDocuments.view.xml` (236 lines)

**Data Source**: `GET /audit/api/changes?objectType=Bridge&from=2026-01-01&limit=200`

**Query Parameters**:
- `objectType` — filter by entity type
- `objectId` — filter by specific record
- `changedBy` — filter by user
- `source` — 'OData' | 'MassEdit' | 'MassUpload'
- `from`, `to` — date range (YYYY-MM-DD)
- `batchId` — specific batch
- `fieldName` — specific field
- `limit`, `offset` — pagination

**Architecture**: Frontend fetches all matching rows, groups by batchKey (objectType+objectId+batchId+changedAt), renders Tab 1 as one row per batch. Tab 2 shows field-level rows for the selected batch.

**Export**: Both tabs support CSV export. Tab 1 includes record-level data; Tab 2 includes field-level before/after values.

---

## Cross-App Reuse Guide

To use any of these components in a new SAP CAP project:

1. **Audit Log**: Copy `srv/audit-log.js`, add ChangeLog entity + indexes to your schema, register `before/after` handlers.
2. **Mass Upload**: Copy `srv/mass-upload.js`, configure `DATASETS` for your entities, mount the router in `srv/server.js`.
3. **Mass Edit**: Copy `app/mass-edit/webapp/`, define `ENTITY_CONFIG` for your entities, create backend load/save functions.
4. **Maps**: Copy `app/map-view/webapp/`, create `GET /map/api/bridges?bbox=...` endpoint returning `{ lat, lng, ...fields }`, add GISConfig entity.
5. **Custom Attributes**: Copy `db/attributes-schema.cds` + `srv/attributes-api.js` + admin UI, update namespace.
6. **Change Documents**: Copy the two files, ensure ChangeLog entity and `/audit/api` endpoint exist.

**Namespace convention**: All BMS entities use `bridge.management`. Change this to your app's namespace in CDS files.
