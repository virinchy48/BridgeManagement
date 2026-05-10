# Phase C — Information Systems Architecture
## Bridge Management System (BMS) v1.1.0

**TOGAF ADM Phase:** C — Information Systems Architecture (Data + Application)  
**Document version:** 1.1.0  
**Date:** 2026-05-10  
**Status:** Approved for UAT

---

## Part 1: Data Architecture

### 1.1 Canonical Entity Model

```
Namespace: bridge.management  (managed entities — BTP HANA HDI)
Namespace: nhvr               (NHVR compliance entities — same HANA HDI)

bridge.management.Bridges  ──────────────────────────────────────────────
  ID                  : Integer (PK, auto-incremented)
  bridgeId            : String(40)  [unique external reference, BRG-NSW-SYD-001]
  bridgeName          : String(200) [required]
  state               : String(50)  [required]
  latitude/longitude  : Decimal     [required]
  assetOwner          : String(100) [required]
  conditionRating     : Integer     [0–10; criticality thresholds: ≥8=green, 5–7=amber, <5=red]
  postingStatus       : String(50)  [Unrestricted | Restricted | Under Review | Closed]
  lastInspectionDate  : Date
  ... (60+ additional fields — see BRIDGE_COLUMNS in mass-upload.js)
  ┌─ virtual ──────────────────────────────────────────────────────────────
  │ postingStatusCriticality : Integer  [computed: 3=green, 2=amber, 1=red]
  │ activeRestrictionCount   : Integer  [GROUP BY count from BridgeRestrictions]
  └──────────────────────────────────────────────────────────────────────

bridge.management.BridgeInspections  ────────────────────────────────────
  ID                  : UUID (cuid)
  bridge_ID           : Integer → Bridges
  inspectionDate      : Date     [natural dedup key with bridge_ID]
  inspectionType      : String   [Routine | Principal | Special | Underwater]
  inspector           : String   [required]
  inspectorAccreditationNumber / Level / Company
  inspectionScope / Standard / Notes
  s4InspectionOrderRef / s4NotificationRef  [future S/4HANA linkage]

bridge.management.BridgeDefects  ────────────────────────────────────────
  ID                  : UUID (cuid)
  bridge_ID           : Integer → Bridges
  inspection_ID       : UUID → BridgeInspections
  defectCode / defectCategory / severity (1–5)
  location / description / repairPriority / estimatedRepairCost
  status              : [Open | Closed | Monitored]
  photos              : Composition of many DefectPhotos

bridge.management.BridgeElements  ───────────────────────────────────────
  ID                  : UUID (cuid)
  bridge_ID           : Integer → Bridges
  elementId           : String  [natural key, e.g. DECK-001]
  elementType / elementName / spanNumber / pierNumber / position
  currentConditionRating / conditionRatingDate / conditionTrend
  material / yearConstructed / yearLastRehabbed
  maintenanceRequired / urgencyLevel / estimatedRepairCost
  s4EquipmentNumber   : String  [S/4HANA Equipment number for deep-link]

bridge.management.BridgeRestrictions  ───────────────────────────────────
  ID                  : UUID (cuid)
  bridge_ID           : Integer → Bridges
  restrictionRef      : String(40) [natural key, e.g. REST-GVL-001]
  name / descr / restrictionCategory / restrictionType
  restrictionValue / restrictionUnit / appliesToVehicleClass
  grossMassLimit / axleMassLimit / heightLimit / widthLimit / speedLimit
  active              : Boolean  [default true]
  effectiveFrom / effectiveTo / approvedBy / direction

bridge.management.LoadRatingCertificates  ────────────────────────────────
  ID                  : UUID (cuid)
  bridge_ID           : Integer → Bridges
  certificateNumber   : String  [natural key, e.g. LRC-SHB-2024-001]
  certificateVersion  : Integer [default 1]
  status              : String  [Current | Superseded | Expired]
  ratingStandard      : String  [AS 5100.7]
  ratingLevel         : String  [HML | GML | CML]
  certifyingEngineer / engineerQualification / engineerLicenseNumber / engineerOrganisation
  rfT44 / rfSM1600 / rfHML / rfHLP400 / dynamicLoadAllowance / fatigueSensitive
  certificateIssueDate / certificateExpiryDate / nextReviewDate
  expiryWarningDays   : Integer [default 90; alert threshold]

nhvr.Bridge  ────────────────────────────────────────────────────────────
  ID / bridgeNo / name / state / latitude / longitude
  [Separate table from bridge.management.Bridges — intentional isolation]

nhvr.Restriction  ───────────────────────────────────────────────────────
  ID / restrictionType / value / unit / bridge → nhvr.Bridge
  [NHVR-linked restrictions; separate from BridgeRestrictions]

bridge.management.Restrictions  ─────────────────────────────────────────
  Extended restriction registry with full NHVR HVNL fields
  restrictionRef (natural key) / bridgeRef / bridge_ID
  [Uploaded via mass-upload; linked to bridge.management.Bridges]

bridge.management.AuditLog  ─────────────────────────────────────────────
  batchId / objectType / objectId / objectName
  changedBy / changedAt / source / changes (JSON array of field diffs)

bridge.management.ChangeLogs  ───────────────────────────────────────────
  restriction_ID → Restrictions / changeType / oldValue / newValue
  changedAt / changedBy / reason / approvedBy

bridge.management.AttributeGroups / AttributeDefinitions / AttributeValues
  [Extensible custom attribute framework — any object type]

bridge.management.SystemConfig  ─────────────────────────────────────────
  key / value / category / description
  [S4_BASE_URL, EXPIRY_WARNING_DAYS, feature flags]
```

### 1.2 Data Flow

```
External Excel/CSV
      │
      ▼ POST /mass-upload/api/upload
MassUploadRouter (Express)
      │  normalizeRows → enrichRowsWithBridgeId → importerFn
      ▼
HANA HDI (bridge.management.*)
      │
      ├── AdminService OData V4 ── Fiori Elements UIs
      │
      ├── PublicBridgeService ── bridges-public (unauthenticated)
      │
      └── AuditLog ── written post-commit
```

### 1.3 Entity Relationship Summary

```
Bridges (1) ─── (*) BridgeInspections
Bridges (1) ─── (*) BridgeDefects
Bridges (1) ─── (*) BridgeElements
Bridges (1) ─── (*) BridgeRestrictions
Bridges (1) ─── (*) LoadRatingCertificates
Bridges (1) ─── (*) BridgeCapacities
Bridges (1) ─── (*) BridgeScourAssessments
BridgeInspections (1) ─── (*) BridgeDefects
Restrictions (1) ─── (*) ChangeLogs
Restrictions (1) ─── (*) PostingSigns
nhvr.Bridge (1) ─── (*) nhvr.Restriction
```

Note: AdminService exposes all child entities as **top-level projections** (e.g., `AdminService.BridgeInspections`). There are **no navigation paths** from `Bridges` to child entities in OData. Client code uses `$filter=bridge_ID eq {id}` for sub-entity queries.

---

## Part 2: Application Architecture

### 2.1 Application Service Catalogue

| Service | CDS Name | Type | Auth | Description |
|---|---|---|---|---|
| Admin Service | `AdminService` | CAP OData V4 | XSUAA (admin/manage/inspect) | All CRUD for bridge entities, draft-enabled |
| Bridges Service | `BridgesService` | CAP OData V4 | XSUAA | nhvr.Bridge projections for NHVR compliance |
| Public Bridge Service | `PublicBridgeService` | CAP OData V4 | None (public) | Curated view: bridge name + active restrictions only |
| Access Service | `AccessService` | Express Router | XSUAA | Access control entries (scope → bridge assignment) |
| Quality Service | `QualityService` | Express Router | XSUAA (manage) | Data quality checks and reports |
| Audit Service | `AuditService` | Express Router | XSUAA (admin) | Change audit log retrieval |
| System Service | `SystemService` | Express Router | XSUAA (admin) | SystemConfig CRUD |
| BNAC Service | `BnacService` | Express Router | XSUAA | BNAC (Bridge Network and Condition) data feed |
| Mass Upload Router | Express Router | XSUAA (admin/manage) | Excel/CSV import for all datasets |
| Mass Edit Router | Express Router | XSUAA (manage) | Batch field updates across bridge set |
| Admin Bridges Router | Express Router | XSUAA (admin) | Bridge admin API |

### 2.2 HTML5 Application Catalogue

| App Path | Module Name | Scope Required | Description |
|---|---|---|---|
| `app/admin-bridges` | BridgeManagementadminbridges | manage / admin | Bridge List Report + Detail ObjectPage (7 sections, draft) |
| `app/map-view` | BridgeManagementmapview | inspect+ | Geospatial map of bridges and restrictions |
| `app/mass-edit` | BridgeManagementmassedit | manage | Batch edit UI for bridge fields |
| `app/restrictions` | BridgeManagementrestrictions | manage | NHVR Restriction registry |
| `app/bms-admin` | BridgeManagementbmsadmin | admin | System administration (lookups, config, users) |
| `app/attributes-admin` | BridgeManagementattributesadmin | admin | Custom attribute group/definition management |
| `app/dashboard` | BridgeManagementdashboard | manage+ | Summary dashboard (KPI tiles, critical bridge list) |
| `app/mass-upload` | BridgeManagementmassupload | manage | Excel/CSV mass upload with preview and validation |
| `app/operations/bridges` | BridgeManagementoperationsbridges | manage | Operations view of bridges by region |
| `app/operations/dashboard` | BridgeManagementoperationsdashboard | manage | Operations dashboard |
| `app/operations/restrictions` | BridgeManagementoperationsrestrictions | manage | Operations restrictions view |
| `app/bridge-hierarchy` | BridgeManagementbridgehierarchy | manage | Bridge network hierarchy tree view |
| `app/bridges-public` | BridgeManagementbridgespublic | None | Public card — unauthenticated, external access |

### 2.3 Bridge Detail ObjectPage Sections (admin-bridges)

| Section | ID | Visible to |
|---|---|---|
| S1 — Bridge Overview | BridgeOverview | All authenticated |
| S2 — NHVR & Regulatory Compliance | NhvrCompliance | admin, manage |
| S3 — Condition & Inspections | ConditionInspections | All authenticated; Inspector auto-scrolled here |
| S4 — Load Rating Certificates | LoadRatingCertificates | admin, manage |
| S5 — Restrictions | Restrictions | admin, manage, inspect (read-only) |
| S6 — Documents & Attachments | DocumentsAttachments | admin, manage |
| S7 — History & Audit | HistoryAudit | admin only |

Executive users see the ExecutiveKpiPanel fragment instead of all 7 sections.

### 2.4 Key Custom Fragments

| Fragment | Controller | Purpose |
|---|---|---|
| `InspectionRegister.fragment.xml` | `InspectionRegister.js` | Inline inspection event table with defect sublist; photo capture button for Inspector |
| `ExecutiveKpiPanel.fragment.xml` | `ExecutiveKpiPanel.js` | 5-tile KPI panel (condition, open defects, last inspection, active restrictions, load rating) — executive view only |
| `Attachments.fragment.xml` | `Attachments.js` | Document upload/download using admin-bridges REST API |
| `CaptureCondition.fragment.xml` | `CaptureCondition.js` | Condition rating capture dialog for Inspector |

### 2.5 API Surface (Custom Routers, all under `/api/` prefix)

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/mass-upload/api/datasets` | GET | manage | List available upload datasets |
| `/mass-upload/api/template` | GET | manage | Download Excel workbook template |
| `/mass-upload/api/validate` | POST | manage | Validate upload file without committing |
| `/mass-upload/api/upload` | POST | manage | Execute upload (commit to HANA) |
| `/admin-bridges/api/bridges/:id/attachments` | POST | manage | Upload inspection photo/document |
| `/audit/api/logs` | GET | admin | Retrieve change audit log |
| `/quality/api/checks` | GET | manage | Run data quality checks |
| `/system/api/config` | GET/PUT | admin | SystemConfig key-value management |
| `/public-bridge/PublicBridges` | GET | None | OData feed for bridges-public app |

### 2.6 Mass Upload Dataset Coverage

All 6 major object types are upload-capable as of v1.1.0:

| Dataset | Entity | Natural Key | Dedup Strategy |
|---|---|---|---|
| Bridges | `bridge.management.Bridges` | `bridgeId` or `ID` | ID > bridgeId match, then insert |
| Restrictions | `bridge.management.Restrictions` | `restrictionRef` | ID > restrictionRef match |
| BridgeInspections | `bridge.management.BridgeInspections` | `bridgeRef + inspectionDate + type` | UUID match, then natural key |
| BridgeElements | `bridge.management.BridgeElements` | `elementId` | UUID match, then elementId |
| BridgeRestrictions | `bridge.management.BridgeRestrictions` | `restrictionRef` | UUID match, then restrictionRef |
| LoadRatingCertificates | `bridge.management.LoadRatingCertificates` | `certificateNumber` | UUID match, then certificateNumber |
| Lookup tables (22) | `bridge.management.*` | `code` | code match |
