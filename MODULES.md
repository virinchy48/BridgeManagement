# MODULES.md — BMS Tile-to-File Registry

> **AI-assistant index.** When given a prompt about a specific tile or feature, read the
> relevant section below to identify the minimal set of files needed. Do NOT load all files.
>
> Format per section:
> - `schema`    → DB entity definition(s)
> - `handler`   → BridgeManagementService domain handler
> - `admin`     → AdminService handler section (file + line range)
> - `router`    → Custom Express REST router (if any)
> - `annot`     → FE4 OData annotations (fiori-service.cds line range, or split file after Phase 2)
> - `frontend`  → UI5 controller(s) and view(s)
> - `tests`     → Test files

---

## Bridges (core admin — Bridge Asset Registry)

```
schema:   db/schema/bridge-entity.cds         ← Bridges entity (canonical)
          db/schema/core.cds                   ← namespace, managed lookups
          db/schema/extensions.cds             ← virtual/computed fields
handler:  srv/handlers/bridges.js
admin:    srv/admin-service.js                 ← requiredFields, validateEntityFields, before/after Bridges CRUD,
                                                 virtual fields after READ, deactivate/reactivate, audit log
router:   (none — OData only)
annot:    app/admin-bridges/annotations/bridges.cds
frontend: app/admin-bridges/webapp/ext/controller/BridgeDetailExt.js
          app/admin-bridges/webapp/ext/controller/BridgeDetailExt.controller.js
          app/admin-bridges/webapp/ext/controller/CaptureCondition.js
          app/admin-bridges/webapp/ext/controller/ListReportExt.js
          app/admin-bridges/webapp/ext/controller/ExecutiveKpiPanel.js
tests:    test/integration/bridges.test.js
```

---

## BridgeRestrictions (sub-entity on Bridge Details — Restrictions tab)

```
schema:   db/schema/restrictions.cds           ← BridgeRestrictions + BridgeRestrictionProvisions
handler:  srv/handlers/restrictions.js
admin:    srv/admin-service.js                 ← BridgeRestrictions CRUD, deactivate/reactivate, audit log
annot:    app/admin-bridges/annotations/bridge-restrictions.cds
          app/admin-bridges/annotations/restriction-provisions.cds
frontend: app/admin-bridges/webapp/ext/controller/RestrictionsValidation.js
tests:    test/restrictions.test.js
```

---

## Restrictions (standalone tile — standalone restriction register)

```
schema:   db/schema/restrictions.cds           ← Restrictions entity + RestrictionProvisions
handler:  srv/handlers/restrictions.js
admin:    srv/admin-service.js                 ← Restrictions deactivate/reactivate, before/after CRUD, audit log + syncBridgeClosureStatus
router:   (none — OData only)
annot:    app/restrictions/fiori-service.cds   ← entire file (standalone app)
          app/admin-bridges/annotations/restrictions.cds
          app/admin-bridges/annotations/restriction-provisions.cds
frontend: (none — pure FE4)
tests:    test/restrictions.test.js
          test/integration/access-control.test.js
```

---

## BridgeCapacities (Capacity tile)

```
schema:   db/schema/gap-entities.cds           ← BridgeCapacities entity
handler:  srv/handlers/capacities.js
admin:    srv/admin-service.js                 ← CRUD audit + deactivate/reactivate/delete
annot:    app/admin-bridges/annotations/capacities.cds
frontend: (none — pure FE4)
tests:    test/capacities.test.js
```

---

## BridgeScourAssessments (Scour tile)

```
schema:   db/schema/scour-assessments.cds
handler:  srv/handlers/restrictions.js         ← no dedicated handler; uses restrictions
admin:    srv/admin-service.js                 ← CRUD audit, deactivate/reactivate, before NEW drafts
annot:    app/admin-bridges/annotations/scour.cds
frontend: (none — pure FE4)
tests:    test/scour-assessments.test.js
```

---

## BridgeDocuments (Attachments — on Inspections and Defects Object Pages)

```
schema:   db/schema/documents.cds
handler:  (none — REST only)
admin:    srv/admin-service.js                 ← BridgeDocuments before CREATE (handler wiring)
router:   srv/server.js  (POST/GET/DELETE /admin-bridges/api/documents/*)
annot:    app/admin-bridges/annotations/documents.cds
frontend: app/admin-bridges/webapp/ext/controller/Attachments.js
          app/admin-bridges/webapp/ext/controller/InspectionDocuments.js
tests:    test/attachments.test.js
```

---

## BridgeAttributes / Custom Attributes (EAV — on Bridge Details)

```
schema:   db/attributes-schema.cds             ← AttributeGroups, AttributeDefinitions, AttributeAllowedValues, AttributeValues
handler:  (none — REST only)
admin:    srv/admin/attributes.js              ← AttributeDefinitions/AllowedValues guards (58 lines)
router:   srv/attributes-api.js                ← /attributes/api/* all CRUD
annot:    app/admin-bridges/annotations/attributes.cds
frontend: app/admin-bridges/webapp/ext/controller/CustomAttributesInit.js
          app/attributes-admin/webapp/         ← standalone admin app
tests:    (none dedicated — covered by integration tests)
```

---

## BridgeInspections (Inspections tile + Bridge Details tab)

```
schema:   db/schema/gap-entities.cds           ← BridgeInspections entity
          db/schema/elements.cds               ← BridgeInspectionElements sub-entity
handler:  srv/handlers/inspections.js
admin:    srv/admin/inspections.js             ← before NEW drafts, deactivate/reactivate, complete action,
                                                 BridgeInspectionElements bridge_ID resolution (72 lines)
annot:    app/admin-bridges/annotations/inspections.cds
          app/admin-bridges/annotations/elements.cds  ← BridgeInspectionElements sub-table
frontend: app/admin-bridges/webapp/ext/controller/BridgeInspectionsExt.js
          app/admin-bridges/webapp/ext/controller/InspectionRegister.js
          app/admin-bridges/webapp/ext/controller/BatchElementEntryExt.js
          app/admin-bridges/webapp/ext/controller/NumericInputGuard.js
tests:    test/integration/inspections.test.js
```

---

## BridgeDefects (Defects tile)

```
schema:   db/schema/defects.cds
handler:  srv/handlers/defects.js
admin:    srv/admin/defects.js                 ← before NEW drafts, deactivate/reactivate (46 lines)
annot:    app/admin-bridges/annotations/defects.cds
frontend: (none — pure FE4)
tests:    test/integration/defects.test.js
```

---

## BridgeElements (Elements tile — structural components)

```
schema:   db/schema/elements.cds               ← BridgeElements + BridgeCarriageways + BridgeContacts + BridgeMehComponents
handler:  srv/handlers/elements.js
admin:    (none — plain CRUD, no special handlers)
annot:    app/admin-bridges/fiori-service.cds  lines 2337–2469  ← BridgeElements
          app/admin-bridges/fiori-service.cds  lines 3158–3461  ← Carriageways, Contacts, MEH
frontend: (none — pure FE4)
tests:    (none dedicated)
```

---

## BridgeRiskAssessments (Risk Assessments tile)

```
schema:   db/schema/risk-assessments.cds
handler:  srv/handlers/risk-assessments.js
admin:    srv/admin/risk-assessments.js        ← draft guards, before NEW, inherentRiskScore computation, deactivate/reactivate (88 lines)
annot:    app/admin-bridges/annotations/risk-assessments.cds
frontend: app/admin-bridges/webapp/ext/controller/RiskAssessmentsExt.js
          app/admin-bridges/webapp/ext/controller/RiskMatrixExt.js
tests:    test/risk-score.test.js
          test/integration/risk-assessments.test.js
```

---

## LoadRatingCertificates (Load Rating Certs tile)

```
schema:   db/schema/load-ratings.cds           ← LoadRatingCertificates entity
handler:  srv/handlers/load-ratings.js         ← legacy handler (still active)
admin:    srv/admin/load-rating-certs.js       ← before NEW drafts, deactivate→Superseded, reactivate (43 lines)
annot:    app/admin-bridges/annotations/load-ratings.cds
frontend: (none — pure FE4)
tests:    (none dedicated)
```

---

## NhvrRouteAssessments (NHVR tile)

```
schema:   db/schema/nhvr-compliance.cds        ← NhvrRouteAssessments + NhvrApprovedVehicleClasses
handler:  srv/handlers/nhvr-compliance.js
admin:    srv/admin/nhvr.js                    ← before NEW drafts, deactivate (rollback nhvrAssessed), reactivate,
                                                 after CREATE/UPDATE sync to Bridges.nhvrAssessed (72 lines)
annot:    app/admin-bridges/annotations/nhvr.cds
frontend: (none — pure FE4)
tests:    test/nhvr-route-assessments.test.js
```

---

## AlertsAndNotifications (Alerts tile)

```
schema:   db/schema/alerts.cds
handler:  srv/handlers/alerts.js
admin:    (none — system-generated, read-only for users)
router:   (none)
annot:    app/admin-bridges/fiori-service.cds  lines 2920–3065  ← AlertsAndNotifications annotations
frontend: (none — pure FE4)
tests:    test/alerts.test.js
```

---

## BridgeConditionSurveys (Condition Surveys tile)

```
schema:   db/schema/gap-entities.cds           ← BridgeConditionSurveys entity
handler:  srv/handlers/conditions.js
admin:    srv/admin/conditions.js              ← draft guards, before NEW, submitForReview/approveSurvey/rejectSurvey, CRUD audit (128 lines)
annot:    app/admin-bridges/annotations/conditions.cds
frontend: (none — pure FE4)
tests:    test/condition.test.js
```

---

## BridgeLoadRatings (Load Ratings tile)

```
schema:   db/schema/load-ratings.cds           ← BridgeLoadRatings entity
handler:  srv/handlers/load-ratings-new.js
admin:    srv/admin/load-ratings.js            ← before NEW drafts, deactivate/reactivate, CRUD audit, expiry alert (88 lines)
annot:    app/admin-bridges/annotations/load-ratings.cds
frontend: (none — pure FE4)
tests:    (none dedicated)
```

---

## BridgePermits (Permits tile)

```
schema:   db/schema/gap-entities.cds           ← BridgePermits entity
handler:  srv/handlers/permits.js
admin:    srv/admin/permits.js                 ← before NEW drafts, approve/rejectPermit, deactivate/reactivate, CRUD audit (110 lines)
annot:    app/admin-bridges/annotations/permits.cds
frontend: (none — pure FE4)
tests:    test/integration/permits.test.js
```

---

## BridgeMaintenanceActions / Work Orders (Maintenance tile)

```
schema:   db/schema/maintenance.cds
handler:  srv/handlers/maintenance.js
admin:    srv/admin/maintenance.js             ← before CRUD (auto-ref MA-NNNN), bridgeRef→bridge_ID, deactivate/reactivate, draft guards (45 lines)
annot:    app/admin-bridges/annotations/maintenance.cds
frontend: (none — pure FE4)
tests:    (none dedicated)
```

---

## AssetIQ Scores (AssetIQ tile)

```
schema:   db/schema/calculations.cds           ← AssetIQScores + AssetIQModels
handler:  (none — computed by scoreAllBridges action)
admin:    srv/admin/asset-iq.js               ← scoreAllBridges (batched 500), override/dismissOverride/activate, refreshKPISnapshots (160 lines)
annot:    app/admin-bridges/annotations/asset-iq.cds
frontend: (none — pure FE4)
tests:    (none dedicated)
```

---

## GIS Config (GIS Configuration screen — BMS Admin)

```
schema:   db/schema/core.cds                   ← GISConfig entity
handler:  (none — OData CRUD)
admin:    srv/admin-service.js                 ← before/after UPDATE GISConfig (audit log) — kept in main file
router:   srv/server.js  (GET /map/config, /map/api/bridges)
annot:    (none — custom XML view)
frontend: app/admin-bridges/webapp/view/GISConfig.view.xml
          app/admin-bridges/webapp/ext/controller/GISConfig.controller.js
          app/admin-bridges/webapp/ext/controller/gisMapInit.js
tests:    (none dedicated)
```

---

## Network Reports (Reports tab — embedded in Bridges app)

```
schema:   db/schema/bridge-entity.cds          ← queries Bridges entity
handler:  (none — REST only)
admin:    (none)
router:   srv/reports-api.js                   ← /reports/api/* all endpoints
annot:    (none — custom XML view)
frontend: app/admin-bridges/webapp/view/NetworkReports.view.xml
          app/admin-bridges/webapp/ext/controller/NetworkReports.controller.js
tests:    test/dq-rules.test.js
          test/operations.test.js
```

---

## Dashboard (KPI Dashboard tile)

```
schema:   db/schema/core.cds                   ← KPISnapshots, BridgeKpiView
handler:  srv/handlers/dashboard.js
admin:    (none)
router:   srv/routers/dashboard-router.js     ← loadDashboardAnalytics + /analytics + /overview (152 lines)
annot:    (none — custom XML view)
frontend: app/dashboard/webapp/
tests:    test/dashboard.test.js
```

---

## Map View (GIS/Map tile)

```
schema:   db/schema/bridge-entity.cds
handler:  (none — REST only)
admin:    (none)
router:   srv/routers/map-router.js           ← parseBbox, loadMapBridges, loadClusters, loadProximityBridges, buildBridgesCsv, buildRestrictionsCsv + 6 routes (591 lines)
annot:    (none — Leaflet map)
frontend: app/map-view/webapp/
tests:    (none dedicated)
```

---

## Mass Upload (Upload tile)

```
schema:   db/schema.cds                        ← UploadSessions entity
handler:  (none — custom REST only)
admin:    (none)
router:   srv/routers/mass-upload-router.js   ← upload, validate, template, history endpoints (126 lines)
engine:   srv/mass-upload.js                   ← DATASETS array (extension point), getDatasets(), importUpload(), validateUpload() (~786 lines)
          srv/importers/columns.js             ← ALL column definition arrays + column() + lookupDataset() helpers (485 lines)
          srv/importers/upload-engine.js       ← parseSheetRows, normalizeRows, importCuidEntityRows, batchGenerateRefs, enrichRowsWithBridgeId, queueAudit, readDatasetRows (665 lines)
          srv/importers/upload-template.js     ← buildWorkbookTemplate, buildCsvTemplate, buildHeaderRow (231 lines)
          srv/importers/upload-session.js      ← recordUploadSession, getUploadHistory, getUploadSessionById (57 lines)
          srv/importers/bridges-importer.js    ← importBridgeRows (118 lines)
          srv/importers/restrictions-importer.js ← importRestrictionRows (127 lines)
          srv/importers/lookup-importer.js     ← importLookupRows, importAllowedValueRows, fetchAllLookupValues (219 lines)
          srv/importers/gap-importers.js       ← importInspectionRows, importDefectRows, importCapacityRows, importScourRows, importConditionSurveyRows, importLoadRatingRows, importPermitRows + provisions (229 lines)
annot:    (none — custom XML view)
frontend: app/mass-upload/webapp/
tests:    test/integration/mass-upload-bridges.test.js
          test/integration/mass-upload-inspections.test.js
```

---

## Mass Edit (Bulk Edit tile)

```
schema:   db/schema/bridge-entity.cds
handler:  srv/handlers/mass-edit.js
admin:    (none)
router:   srv/routers/mass-edit-router.js     ← MASS_EDIT_* constants, normalize/load/save functions + 5 routes (321 lines)
annot:    (none — custom XML view)
frontend: app/mass-edit/webapp/
tests:    (none dedicated)
```

---

## BMS Admin — Change Documents screen

```
schema:   db/schema.cds                        ← ChangeLog entity (via audit-log.js)
handler:  srv/audit-log.js                     ← writeChangeLogs(), diffRecords()
admin:    (none — read-only OData projection)
router:   srv/routers/audit-router.js         ← /changes + /summary (76 lines)
annot:    (none — custom XML view)
frontend: app/bms-admin/webapp/controller/ChangeDocuments.controller.js
          app/bms-admin/webapp/view/ChangeDocuments.view.xml  (if exists)
tests:    test/integration/audit-log.test.js
```

---

## BMS Admin — Feature Flags screen

```
schema:   db/schema.cds                        ← SystemConfig entity
handler:  srv/feature-flags.js                 ← isFeatureEnabled(), requireFeature(), KNOWN_FLAGS
admin:    (none)
router:   srv/routers/feature-flags-router.js ← GET all flags + PATCH with cascade-disable (104 lines)
          srv/routers/system-router.js         ← /config, /config/:key, /banner (50 lines)
annot:    (none — custom XML view)
frontend: app/bms-admin/webapp/controller/FeatureFlags.controller.js
          app/bms-admin/webapp/view/FeatureFlags.view.xml
tests:    test/integration/feature-flags.test.js
```

---

## BMS Admin — User Access screen

```
schema:   db/schema/admin.cds                  ← UserAccess entity
handler:  srv/handlers/admin.js
admin:    (none)
router:   srv/routers/access-router.js        ← /activity + /summary (42 lines)
annot:    (none — custom XML view)
frontend: app/bms-admin/webapp/controller/UserAccess.controller.js
          app/bms-admin/webapp/view/UserAccess.view.xml  (if exists)
tests:    test/integration/access-control.test.js
```

---

## BMS Admin — System Config / Lookup Values / Attribute Config screens

```
schema:   db/schema.cds                        ← SystemConfig entity
          db/schema/core.cds                   ← lookup CodeList entities
          db/attributes-schema.cds             ← AttributeGroups, AttributeDefinitions
handler:  srv/system-config.js
admin:    (none)
router:   srv/server.js  (GET/PATCH /system/api/config, /system/api/user-info)
annot:    (none — custom XML views)
frontend: app/bms-admin/webapp/controller/SystemConfig.controller.js
          app/bms-admin/webapp/controller/LookupValues.controller.js
          app/bms-admin/webapp/controller/AttributeConfig.controller.js
          app/bms-admin/webapp/controller/AttributeReport.controller.js
tests:    (none dedicated)
```

---

## BHI / BSI Assessment Engine (feature-flagged)

```
schema:   db/schema/bridge-entity.cds          ← virtual bhi + nbi fields on Bridges
handler:  (none — computed on READ)
admin:    srv/admin-service.js                 ← after READ Bridges (virtual field population) — kept in main file
router:   srv/bhi-bsi-api.js                   ← /bhi-bsi/api/* (POST /assess, GET /network-summary, GET /mode-params)
engine:   srv/lib/bhi-calculator.js            ← canonical BHI formula (v2.1, 1-5 condition scale)
          srv/lib/bsi-calculator.js            ← BSI formula
          srv/bhi-bsi-engine.js               ← multi-modal engine (used only by /bhi-bsi/api)
annot:    (none)
frontend: (FLP tile only — content gated at API level when feature.bhiBsiAssessment=false)
tests:    test/bhi-formula.test.js
          test/unit/bhi-calculator.test.js
          test/unit/bsi-calculator.test.js
```

---

## Reusable Components

### Audit Log

```
files:    srv/audit-log.js                     ← writeChangeLogs(), diffRecords(), fetchCurrentRecord()
          db/schema.cds  (ChangeLog entity)
used-by:  all CRUD handlers in srv/admin-service.js via after UPDATE/CREATE
```

### Notification Service

```
files:    srv/notification-service.js          ← notifyInspectionOverdue(), notifyGazetteExpiry(), etc.
          env:  ALERT_NOTIFICATION_URL + ALERT_NOTIFICATION_TOKEN (BTP only)
used-by:  srv/handlers/alerts.js, srv/handlers/load-ratings-new.js
```

### Feature Flags

```
files:    srv/feature-flags.js                 ← isFeatureEnabled(), requireFeature(), KNOWN_FLAGS, DEPENDENCIES
          db/schema.cds  (SystemConfig rows with category='Feature Flags')
used-by:  srv/admin-service.js (BHI virtual fields), srv/bhi-bsi-api.js
```

### Upload Session Tracking

```
files:    srv/mass-upload.js  (recordUploadSession, getUploadHistory, getUploadSessionById)
          db/schema.cds  (UploadSessions entity)
used-by:  srv/server.js (/upload endpoint wires recordUploadSession)
```

---

## File→Tile reverse index (quick lookup)

| File | Tiles / Features |
|---|---|
| `srv/admin-service.js` | Bridges core + BridgeRestrictions + BridgeCapacities + BridgeScourAssessments + GIS Config (thin orchestrator — ~550 lines after Phase 3) |
| `srv/admin/attributes.js` | Custom Attributes guards |
| `srv/admin/inspections.js` | BridgeInspections + BridgeInspectionElements |
| `srv/admin/defects.js` | BridgeDefects |
| `srv/admin/risk-assessments.js` | BridgeRiskAssessments |
| `srv/admin/load-rating-certs.js` | LoadRatingCertificates |
| `srv/admin/nhvr.js` | NhvrRouteAssessments (+ nhvrAssessed sync) |
| `srv/admin/conditions.js` | BridgeConditionSurveys |
| `srv/admin/load-ratings.js` | BridgeLoadRatings |
| `srv/admin/permits.js` | BridgePermits |
| `srv/admin/asset-iq.js` | AssetIQScores + AssetIQModels + refreshKPISnapshots |
| `srv/admin/maintenance.js` | BridgeMaintenanceActions |
| `srv/server.js` | Thin bootstrap: UUID guard, Helmet, health endpoints, router mounting (~131 lines after Phase 4) |
| `srv/middleware.js` | `requiresAuthentication`, `validateCsrfToken`, `requireScope` — shared auth/CSRF middleware (46 lines) |
| `srv/routers/mass-upload-router.js` | MassUpload endpoints |
| `srv/routers/dashboard-router.js` | Dashboard analytics |
| `srv/routers/map-router.js` | Map/GIS endpoints |
| `srv/routers/mass-edit-router.js` | Mass Edit endpoints |
| `srv/routers/audit-router.js` | Change Documents REST endpoints |
| `srv/routers/access-router.js` | User Access REST endpoints |
| `srv/routers/quality-router.js` | Data Quality REST endpoints |
| `srv/routers/system-router.js` | System Config REST endpoints |
| `srv/routers/feature-flags-router.js` | Feature Flags REST endpoints |
| `srv/routers/admin-bridge-router.js` | Bridge attachments, card, QR, CSV export |
| `srv/routers/bnac-router.js` | BNAC integration REST endpoints |
| `srv/mass-upload.js` | MassUpload thin orchestrator — DATASETS array + public API (~786 lines after Phase 5) |
| `srv/importers/columns.js` | ALL mass-upload column definitions |
| `srv/importers/upload-engine.js` | Core mass-upload pipeline (parseSheetRows, importCuidEntityRows, batchGenerateRefs, etc.) |
| `srv/importers/upload-template.js` | Workbook + CSV template builder |
| `srv/importers/upload-session.js` | Upload history tracking |
| `srv/importers/bridges-importer.js` | Bridge mass-upload importer |
| `srv/importers/restrictions-importer.js` | Restrictions mass-upload importer |
| `srv/importers/lookup-importer.js` | Lookup / AllowedValues mass-upload importer |
| `srv/importers/gap-importers.js` | Sub-domain importers (inspections, defects, capacities, scour, surveys, load ratings, permits, provisions) |
| `app/admin-bridges/fiori-service.cds` | Barrel of `using from './annotations/*'` statements only (Phase 2 complete) |
| `app/admin-bridges/annotations/*.cds` | One file per tile — see tile sections above |
| `srv/handlers/bridges.js` | Bridges only |
| `srv/handlers/inspections.js` | BridgeInspections only |
| `srv/handlers/defects.js` | BridgeDefects only |
| `srv/handlers/restrictions.js` | Restrictions + BridgeRestrictions |
| `srv/handlers/risk-assessments.js` | BridgeRiskAssessments only |
| `srv/handlers/conditions.js` | BridgeConditionSurveys only |
| `srv/handlers/permits.js` | BridgePermits only |
| `srv/handlers/load-ratings-new.js` | BridgeLoadRatings only |
| `srv/handlers/nhvr-compliance.js` | NhvrRouteAssessments only |
| `srv/handlers/maintenance.js` | BridgeMaintenanceActions only |
| `srv/handlers/capacities.js` | BridgeCapacities only |
| `srv/handlers/elements.js` | BridgeElements + sub-entities |
| `srv/handlers/alerts.js` | AlertsAndNotifications only |
| `srv/handlers/dashboard.js` | Dashboard only |
| `srv/attributes-api.js` | CustomAttributes only |
| `srv/reports-api.js` | NetworkReports only |
| `srv/bhi-bsi-api.js` | BHI/BSI engine API only |
| `db/schema/bridge-entity.cds` | Bridges (canonical) |
| `db/schema/defects.cds` | BridgeDefects + InspectionElements sub-entities |
| `db/schema/elements.cds` | BridgeElements + Carriageways + Contacts + MEH |
| `db/schema/restrictions.cds` | Restrictions + BridgeRestrictions + Provisions |
| `db/schema/gap-entities.cds` | BridgeInspections + BridgeCapacities + BridgeConditionSurveys + BridgePermits |
| `db/schema/risk-assessments.cds` | BridgeRiskAssessments |
| `db/schema/scour-assessments.cds` | BridgeScourAssessments |
| `db/schema/load-ratings.cds` | BridgeLoadRatings + LoadRatingCertificates |
| `db/schema/nhvr-compliance.cds` | NhvrRouteAssessments |
| `db/schema/maintenance.cds` | BridgeMaintenanceActions |
| `db/schema/alerts.cds` | AlertsAndNotifications |
| `db/schema/documents.cds` | BridgeDocuments |
| `db/schema/calculations.cds` | AssetIQScores + AssetIQModels |

---

## How to use this file

**Rule:** When you receive a prompt naming a tile or entity, read the matching section above first.
Load only the files listed in that section. Do not read `srv/admin-service.js`, `srv/server.js`,
`srv/mass-upload.js`, or `app/admin-bridges/fiori-service.cds` in full — they are each 2,000–4,000 lines.
Use the line ranges given above to read only the relevant section via `Read` with `offset` + `limit`.

**Example:**
- Prompt: "Fix BridgeInspections deactivate button"
- Load: `db/schema/gap-entities.cds` (inspections entity), `srv/handlers/inspections.js`,
  `srv/admin/inspections.js` (72 lines), `app/admin-bridges/annotations/inspections.cds`

**Token budget per tile prompt:** ≤ 900 lines total. If you need more, you are reading the wrong files.
