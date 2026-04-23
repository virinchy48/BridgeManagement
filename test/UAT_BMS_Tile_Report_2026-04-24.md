# UAT Tile Report — Bridge Management System
**Date:** 2026-04-24 | **Branch:** draftv8-btp-sid | **Tester:** Claude UAT Expert Team  
**Environment:** LOCAL — http://localhost:8008/fiori-apps.html | **Auth:** dummy | **Node:** 20

---

## Environment Baseline

| Metric | Value |
|---|---|
| Total Bridges | 30 |
| Active Restrictions | 0 |
| Bridges Closed | 0 |
| Scour Critical | 6 |
| Structurally Deficient | 7 |
| Sufficiency % | 60% |
| Condition: Good | 10 (33%) |
| Condition: Fair | 13 (43%) |
| Condition: Poor | 7 (23%) |
| OData `/admin/Bridges` | ✅ 200 — 30 records |
| OData `/admin/Restrictions` | ✅ 200 — 0 records |
| `mass-upload/api/datasets` | ✅ 200 — datasets returned |
| `dashboard/api/analytics` | ✅ 200 — all KPIs populated |
| `map/api/bridges?bbox=...` | ✅ 200 — bridges with geo data |
| `admin-bridges/api/.../card` | ❌ 404 — PDF card endpoint broken |

---

## Executive Summary

**Deployment readiness: HOLD** — 2 security gaps (no `@requires` on upload/edit actions) and 1 prod-only failure (missing CSRF token) must be fixed before BTP deployment. Core functionality is solid: map, dashboard, and OData service all work correctly.

**Top 3 findings:**
1. **P1 [P1-001]** — Map popup Close button unreliable; dialog does not close on click.
2. **P2 [P2-002/003]** — Mass Upload and Mass Edit actions have no role authorization (`@requires` missing).
3. **P2 [P2-004/005]** — CSRF tokens absent from MassUpload and MassEdit POST calls — will 403 on BTP.

---

## Summary Table

| Screen | Route | Status | Issues |
|---|---|---|---|
| Dashboard | `#Dashboard-display` | ✅ PASS | — |
| Map View — World/Cluster | `#MapView-display` | ✅ PASS | — |
| Map View — Bridge Popup | click marker | ⚠️ WARN | P1-001 Close btn |
| Map View — List Panel | List button | ⚠️ WARN | Panel blocked by narrow viewport |
| BMS Admin Shell | `#BmsAdmin-manage` | ✅ PASS | P3-005 mobile nav |
| Change Documents | nav → Change Documents | ✅ PASS | — |
| Data Quality | nav → Data Quality | ✅ PASS (DOM) | — |
| Mass Upload | `#BmsAdmin-manage&/mass-upload` | ⚠️ WARN | P2-004,006; P3-001,002,003 |
| Mass Edit | `#MassEdit-display` | ⚠️ WARN | P2-005 |
| Admin-Bridges OData | `odata/v4/admin/Bridges` | ✅ PASS | — |
| PDF Card | `/admin-bridges/api/.../card` | ❌ FAIL | P2-001 |
| Security — Upload Auth | upload.cds | ❌ FAIL | P2-002 |
| Security — Edit Auth | mass-edit.cds | ❌ FAIL | P2-003 |

---

## Screen-by-Screen Results

### A1 — Bridge Management Dashboard
**Route:** `#Dashboard-display`  
**Result:** ✅ PASS

- KPI tiles render: Total Assets **30**, Active Restrictions **0**, Bridges Closed **0**
- Condition State Distribution: 43% Fair, 33% Good, 23% Poor — bar chart renders
- Network Summary section visible with correct section labels
- `Last refreshed: 01:33` timestamp present
- Refresh (↺) and info (ℹ) buttons visible in header
- No actionable errors in console (SAP FE AppComponent errors are known framework noise from local shell emulator — documented in CLAUDE.md)

---

### A2 — Map View
**Route:** `#MapView-display`  
**Result:** ⚠️ WARN — P1-001

**Cluster view:**
- World map loads with Leaflet; all 30 bridges clustered as single marker near Australia ✅
- Mini-map (bottom-right) correctly shows Australia extent ✅
- Zoom controls (+/−) and compass visible ✅

**After clicking cluster (zoomed to NSW):**
- Individual bridge markers render with correct condition-based colours ✅
- Sub-clusters (green circles with counts: 2, 3, 7) for dense areas ✅
- OSM tile layer loads correctly at zoom level 8–12 ✅

**Bridge popup (Darling River Bridge, Bourke — BRG-NSW-WST-001):**
- Bridge name, ID, coordinates displayed ✅
- "Restricted" badge (orange) + "Poor (1–4)" label (red) shown correctly ✅
- Stats grid: Condition **2**, Clearance **6.2 m**, Year Built **1902**, Span **71.0 m** ✅
- Bridge type "Truss Bridge" shown ✅
- "Zoom to Bridge" button and "Open in Register" link both present ✅
- **❌ Close (✕) button click does not dismiss dialog** — requires `dialog.close()` programmatically [P1-001]

**Toolbar buttons verified:** Spatial Select, List, Expand/Collapse, Refresh, Info, Manage Bridges, Reports, Upload, Mass Edit, Export, Find Bridges ✅

---

### A3 — BMS Administration Shell
**Route:** `#BmsAdmin-manage`  
**Result:** ✅ PASS (with P3-005 mobile caveat)

- App title "BMS Administration" + version badge "v1.0.0 · LOCAL" ✅
- DQ alert badge: **"7 bridges with critical data quality issues"** — correctly wired to navigate to Data Quality (Shell.controller.js:67-68) ✅
- Navigation items all present: Change Documents, Data Quality, User Access, System Config, BNAC Config, GIS Config, Attribute Config, Attribute Report, API Reference, Demo Mode (10 items) ✅
- **⚠️ P3-005:** At 477px viewport the ToolPage nav covers full width — content panel invisible. Desktop users unaffected.

---

### A4 — Change Documents
**Route:** BmsAdmin nav → Change Documents  
**Result:** ✅ PASS

- Tabs: Record Changes, Attribute Changes, More ✅
- Filters: Object Type, Action Type, Change Source, Changed By, Record Name / ID, From Date, To Date ✅
- Buttons: Search Records, Clear ✅
- Table columns: Changed At, Action, Type, Fields, Source ✅
- Empty state message: "Apply filters above and click Search Records" ✅
- Note: Change Documents uses a custom Express endpoint (not OData ChangeLogs — that entity doesn't exist). Functionally correct [P3-004 informational].

---

### A5 — Data Quality
**Route:** BmsAdmin nav → Data Quality  
**Result:** ✅ PASS (DOM-verified)

- DataQuality.view.xml: KPI tiles, issue tracking table, rules engine — all well-formed ✅
- No broken bindings detected ✅
- 7 bridges flagged as having data quality issues (matching DQ badge count) ✅

---

### A6 — Mass Upload
**Route:** `#BmsAdmin-manage&/mass-upload`  
**Result:** ⚠️ WARN — P2-004, P2-006, P3-001, P3-002, P3-003

- Dataset dropdown uses correct `name`/`label` fields (not the broken `key`/`text`) ✅
- No static `<core:Item key="bridges">` in XML ✅
- Datasets API returns correctly: AssetClasses, States, Regions, StructureTypes, etc. ✅
- **❌ P2-004:** No CSRF token on POST — will 403 on BTP
- **❌ P2-006:** No client-side guard for CSV + "All Datasets" combination
- **❌ P3-001:** BASE_URL hard-coded as `/mass-upload/api`
- **❌ P3-002:** "Inserted" tile not relabelled "Valid" during validate-only mode
- **❌ P3-003:** Upload confirm dialog text hard-codes "bridge records / Bridge ID"

---

### A7 — Mass Edit
**Route:** `#MassEdit-display`  
**Result:** ⚠️ WARN — P2-005

- Dual entity switcher (Bridges / Restrictions) ✅
- `sap.ui.table.Table` grid with multi-select and dynamic columns ✅
- Filter bar: search, state, status, "Show Changed Only" toggle ✅
- **❌ P2-005:** `onSave()` POSTs without CSRF token — will 403 on BTP

---

### B1 — Security Audit Summary
**Result:** ❌ FAIL — P2-002, P2-003, P2-007

| Check | File | Result |
|---|---|---|
| @requires on upload actions | `srv/services/upload.cds:5-12` | ❌ Missing |
| @requires on mass-edit action | `srv/services/mass-edit.cds:17` | ❌ Missing |
| CSRF on mass-upload POST | `MassUpload.controller.js:232,290` | ❌ Missing |
| CSRF on mass-edit save | `MassEdit.controller.js:173` | ❌ Missing |
| lat/lng NaN guard | `srv/server.js:1317` | ❌ Missing |
| execRule field allowlist | `srv/server.js:1582-1592` | ⚠️ DB-sourced, low risk |
| JSON.parse try/catch | `srv/server.js:1290+` | ✅ OK |
| console.log of secrets | all handlers | ✅ Clean |
| express.json() ordering | `srv/server.js` | ✅ OK |
| CSRF middleware present | `srv/server.js:1057-1067` | ✅ OK |

---

### B2 — API Endpoint Health

| Endpoint | Status | Notes |
|---|---|---|
| `GET /odata/v4/admin/Bridges?$top=2` | ✅ 200 | 30 records total |
| `GET /odata/v4/admin/Restrictions?$top=2` | ✅ 200 | 0 records |
| `GET /mass-upload/api/datasets` | ✅ 200 | All datasets returned |
| `GET /dashboard/api/analytics` | ✅ 200 | All KPIs correct |
| `GET /map/api/bridges?bbox=...` | ✅ 200 | Geo data present |
| `GET /odata/v4/admin/ChangeLogs` | ⚠️ 404 | Entity not in OData (custom route) |
| `GET /admin-bridges/api/bridges/1001/card` | ❌ 404 | PDF card broken |
| `GET /odata/v4/admin/Bridges?$select=bridgeID` | ⚠️ 400 | Field is `ID` not `bridgeID` |

---

## Test Data Catalogue

No synthetic UAT records were created during this run (read-only pass).

---

## Cross-Reference

| Fix ID | Screen | Priority |
|---|---|---|
| [P1-001](UAT_BMS_Fix_List_2026-04-24.md#p1-001-map-bridge-popup-x-button-does-not-reliably-close-the-dialog) | Map View | P1 |
| [P2-001](UAT_BMS_Fix_List_2026-04-24.md#p2-001-pdf-bridge-card-endpoint-returns-404) | Admin Bridges | P2 |
| [P2-002](UAT_BMS_Fix_List_2026-04-24.md#p2-002-missing-requires-on-mass-upload-service-actions) | Security | P2 |
| [P2-003](UAT_BMS_Fix_List_2026-04-24.md#p2-003-missing-requires-on-masseditbridges-action) | Security | P2 |
| [P2-004](UAT_BMS_Fix_List_2026-04-24.md#p2-004-massupload--no-csrf-token-on-post-calls-will-fail-in-btpxsuaa) | Mass Upload | P2 |
| [P2-005](UAT_BMS_Fix_List_2026-04-24.md#p2-005-massedit--no-csrf-token-on-save-post-will-fail-in-btpxsuaa) | Mass Edit | P2 |
| [P2-006](UAT_BMS_Fix_List_2026-04-24.md#p2-006-massupload--csv--all-datasets-not-rejected-client-side) | Mass Upload | P2 |
| [P2-007](UAT_BMS_Fix_List_2026-04-24.md#p2-007-nan-can-be-passed-as-latlng-to-proximity-endpoint) | Map API | P2 |
| [P3-001](UAT_BMS_Fix_List_2026-04-24.md#p3-001-massupload--hard-coded-mass-uploadapi-base_url) | Mass Upload | P3 |
| [P3-002](UAT_BMS_Fix_List_2026-04-24.md#p3-002-massupload--inserted-tile-label-not-updated-to-valid-in-validate-only-mode) | Mass Upload | P3 |
| [P3-003](UAT_BMS_Fix_List_2026-04-24.md#p3-003-massupload--upload-confirm-dialog-text-does-not-reflect-selected-dataset) | Mass Upload | P3 |
| [P3-004](UAT_BMS_Fix_List_2026-04-24.md#p3-004-changelogs-odata-entity-does-not-exist-404) | Change Documents | P3 |
| [P3-005](UAT_BMS_Fix_List_2026-04-24.md#p3-005-bms-admin-toolpage-unusable-below-600px-viewport-width) | BMS Admin | P3 |
| [P3-006](UAT_BMS_Fix_List_2026-04-24.md#p3-006-dynamic-property-lookup-in-execrule-without-allowlist) | Server | P3 |
