# UAT Fix List — Bridge Management System
**Date:** 2026-04-20  
**Tester:** UAT Expert Team (PO · QA · UX · Dev · Security)  
**Build:** draftv5  
**Environment:** Local dev — http://localhost:5050  
**Method:** API testing + code audit (browser access unavailable)

---

## Priority Legend
- **P0** — System cannot start / complete data loss
- **P1** — Blocks core flow, no workaround
- **P2** — Degrades correctness or UX, has workaround
- **P3** — Polish / accessibility / minor

---

### [P0-001] Database never initialises — app is completely non-functional

- **File:** `db/data/bridge.management-Bridges.csv:21` / `db/schema.cds:17`
- **Symptom:** `cds deploy` fails with `table bridge_management_Bridges has no column named isActive`. All OData and custom-API endpoints respond with `"no such table"`. The application cannot serve any data.
- **Root cause:** The seed CSV `db/data/bridge.management-Bridges.csv` contains an `isActive` column (row 21 in headers). The `Bridges` entity defined in `db/schema.cds` does NOT include `isActive`. CDS deploys the SQLite schema from `db/schema.cds` (no `isActive` column in DDL) but then tries to insert CSV seed data that references `isActive`, causing a hard failure. The deploy exits without completing, leaving `db.sqlite` with no tables at all.
- **Secondary cause:** `db/schema/core.cds` (line 60) defines a `bridge.management.Bridges` entity extension that DOES include `isActive`, `conditionRatingTfnsw`, `isDeleted`, etc. The CDS runtime OData layer merges both definitions, producing queries that reference `isActive`. But the SQLite DDL generation produces a table without those extended columns. This dual-definition split is the architectural root cause.
- **Expected:** `npm start` should produce a fully-seeded database with 56 bridges, lookup tables, and restrictions. All OData queries should return data.
- **Fix:** Consolidate `db/schema.cds` and `db/schema/core.cds` into a single `Bridges` entity definition. Remove `isActive` from the seed CSV (use `status` instead, already in schema.cds line 57) OR add `isActive : Boolean` to `db/schema.cds:Bridges`. Then re-run `cds deploy`.
- **Test:** `cds deploy` completes without errors; `GET /odata/v4/admin/Bridges?$count=true` returns count > 0.
- **Persona:** Dev · PO

---

### [P0-002] importanceLevel type conflict between entity definitions

- **File:** `db/schema.cds:64` vs `db/schema/core.cds:71`
- **Symptom:** `db/schema.cds` declares `importanceLevel : Integer @assert.range: [1,4]` (numeric). `db/schema/core.cds` declares `importanceLevel : String(20)` ("Critical | Essential | Important | Ordinary"). Both are in the `bridge.management.Bridges` entity. When CDS merges them, the runtime type is ambiguous. The rebuild script (`scripts/rebuild-bridge-csvs.js`) works around this by clearing non-numeric values, losing all importance level data.
- **Expected:** A single canonical type for `importanceLevel`.
- **Fix:** Decide on Integer (1–4) or an enumerated String. Remove the conflicting definition from `core.cds`. Update seed data and mass-upload validation accordingly.
- **Test:** `cds deploy` seeds bridges with valid `importanceLevel` values; OData filter `?$filter=importanceLevel eq 2` works.
- **Persona:** Dev · PO

---

### [P1-001] CLAUDE.md documents wrong port — developers connect to wrong server

- **File:** `CLAUDE.md` (root)
- **Symptom:** CLAUDE.md states `npm start` serves on `http://localhost:4004`. Actual port is `5050` (`cds-serve --port 5050` per process 48830). A different project (`31 Bridge Info system`) occupies port 4004. Developers and AI assistants following the docs connect to the wrong project entirely, appearing to get valid OData responses (106 bridges) but from a different system.
- **Expected:** CLAUDE.md should document `http://localhost:5050`.
- **Fix:** Update all port references in CLAUDE.md from `4004` to `5050`. Also update `.claude/launch.json`.
- **Test:** Developer following README reaches the correct BMS Fiori launchpad at http://localhost:5050/fiori-apps.html.
- **Persona:** Dev · New user

---

### [P1-002] Template download fails (HTTP 500) — no template for users to start with

- **File:** `srv/server.js:1098-1106`, `srv/mass-upload.js:buildWorkbookTemplate()`
- **Symptom:** `GET /mass-upload/api/template.xlsx` returns `{"error":{"message":"no such table: bridge_management_AssetClasses"}}`. Template generation queries all lookup tables to build in-cell dropdowns. Since no tables exist (P0-001), it fails. Users cannot download the template, blocking the entire mass upload workflow.
- **Root cause:** Downstream of P0-001 — DB not initialised.
- **Expected:** Template download returns a valid `.xlsx` workbook with 18 sheets and in-cell dropdowns for all lookup-backed columns.
- **Fix:** Fix P0-001 first. Additionally, add a graceful fallback in `buildWorkbookTemplate()` that generates the workbook with empty dropdown lists (no database query required) if the DB is unavailable, so the template is always downloadable.
- **Test:** `GET /mass-upload/api/template.xlsx` returns a valid xlsx file with all 18 sheets (Instructions + 15 lookups + Bridges + Restrictions).
- **Persona:** PO · Power user · New user

---

### [P1-003] All OData entity reads return 500 — bridge list, restrictions, lookups, admin screens all broken

- **File:** All service handlers — downstream of P0-001
- **Symptom:** Every OData read against `/odata/v4/admin/Bridges`, `/odata/v4/admin/Restrictions`, `/bridge-management/Bridges`, `/bridge-management/Restrictions`, `/bridge-management/Lookups`, `/bridge-management/getNetworkKPIs()`, etc., returns SQLITE_ERROR "no such table".
- **Root cause:** Downstream of P0-001.
- **Affected screens:** Bridge list, Bridge detail, Restrictions list, Restriction detail, Map view, Dashboard KPIs, Reference Data, Change Documents, Data Quality.
- **Fix:** Fix P0-001.
- **Test:** All above endpoints return HTTP 200 with data.
- **Persona:** PO · Power user

---

### [P1-004] Map API config endpoint fails — map tiles cannot load

- **File:** `srv/server.js` map router, `bridge_management_GISConfig` table
- **Symptom:** `GET /map/api/config` returns `{"error":{"message":"no such table: bridge_management_GISConfig"}}`. The map view uses this to get tile layer API keys (HERE Maps, etc.). Without it the map initialises but may use hardcoded OpenStreetMap fallback only.
- **Root cause:** Downstream of P0-001.
- **Fix:** Fix P0-001. Also verify the map controller has a fallback tile layer (it does — OSM is hardcoded in the controller constants, so the map will render but without premium tile layers).
- **Test:** `GET /map/api/config` returns GIS config; map loads with configured tile provider.
- **Persona:** PO · Power user

---

### [P2-001] File size limit mismatch — 50MB UI promise vs 25MB actual limit

- **File:** `srv/server.js:1092` and `srv/server.js:1136`, `app/bms-admin/webapp/view/MassUpload.view.xml:38`
- **Symptom:** The UI label says "max 50 MB" and the server-side check (line 1136) also says "Maximum 50MB allowed." However, the `express.json({ limit: '25mb' })` body parser (line 1092) rejects the request with HTTP 413 before the 50MB check is ever reached. A 50MB binary file base64-encodes to ~67MB JSON body; even an ~18MB file base64-encodes to ~25MB and would be rejected.
- **Expected:** The effective limit should be ~18MB of raw file data (≈ 25MB base64 JSON body), OR the body parser limit should be raised to `'70mb'` to honour the 50MB file promise.
- **Fix:** Either raise `express.json({ limit: '70mb' })` to match the 50MB promise, or update the UI label to "max ~18 MB" to reflect reality. The more user-friendly fix is to raise the limit.
- **Test:** Upload a 30MB xlsx file — should succeed rather than return 413.
- **Persona:** Power user · PO

---

### [P2-002] Validate results panel: "Inserted" tile misleadingly shows valid row count

- **File:** `app/bms-admin/webapp/controller/MassUpload.controller.js:165` and `view/MassUpload.view.xml:83`
- **Symptom:** When Validate Only is used, the `numInserted` tile (labelled **"Inserted"**) is populated with `data.validCount` (lines 165: `inserted = data.validCount || 0`). No rows were inserted (it's a dry run), but the tile header says "Inserted" and shows a non-zero count. Users will be confused whether data was actually written to the database.
- **Expected:** During validation the tile should be labelled "Valid" (not "Inserted"). The KPI tiles should have dynamic labels based on `isUpload` state.
- **Fix:** Change `GenericTile#tileInserted header` to update dynamically: `"Valid"` during validate, `"Inserted"` during upload. Or use the `byId("tileInserted").setHeader(isUpload ? "Inserted" : "Valid")` call in `_showResults`.
- **Test:** After validate, tile shows "Valid: 56". After upload, tile shows "Inserted: 56".
- **Persona:** New user · PO

---

### [P2-003] Validate preview rows capped at 10 with no UI indication

- **File:** `srv/mass-upload.js:489`
- **Symptom:** `validateUpload()` returns `previewRows: previewRows.slice(0, 10)` — only the first 10 rows are shown in the validation results table regardless of how many errors there are. If a file has 100 errors, the user only sees the first 10 with no message indicating more exist.
- **Expected:** Either raise the cap (e.g. 100) or show a message like "Showing first 10 of N errors — fix these and re-validate for the remainder."
- **Fix:** Add a `previewTruncated: totalCount > 10` flag to the validate response, and show a MessageStrip in the UI when `previewTruncated` is true: _"Showing first 10 rows only. Fix these errors and re-validate to see remaining issues."_
- **Test:** Upload a file with 50 validation errors — UI shows note that only first 10 are displayed.
- **Persona:** Power user · PO

---

### [P2-004] Upload confirm dialog always says "bridge records" even for non-bridge uploads

- **File:** `app/bms-admin/webapp/controller/MassUpload.controller.js:94-96`
- **Symptom:** The upload confirmation text is hardcoded: `"Upload and upsert bridge records from \"" + this._fileName + "\"?\n\nExisting bridges (matched by Bridge ID) will be updated."`. If the user selects `AssetClasses`, `Restrictions`, or `All Datasets`, the dialog still says "bridge records" and "Bridge ID" which is inaccurate.
- **Expected:** Confirmation text should reflect the selected dataset. E.g. "Upload and upsert **AssetClasses** from file.csv? Existing entries (matched by code) will be updated."
- **Fix:** In `onUpload`, get the selected dataset display name and use it in the dialog text. For `All Datasets`, say "all datasets".
- **Test:** Select `Restrictions` dataset → confirm dialog says "Restriction records" / "Restriction Ref".
- **Persona:** PO · New user

---

### [P2-005] BMS Admin home route targets `changeDocuments` — no true home dashboard tile

- **File:** `app/bms-admin/webapp/manifest.json` routing
- **Symptom:** The `home` route pattern is `""` (empty) but its target is `changeDocuments`, meaning landing on the BMS Admin app immediately takes the user to Change Documents instead of a home/overview screen. There is no home dashboard tile.
- **Expected:** The home route should target a landing/home view or a meaningful default screen (e.g. the mass upload screen, or a home tile grid).
- **Fix:** Either create a `Home.view.xml` with navigation tiles, or change the default target to `massUpload` which is the primary use case of this app.
- **Test:** Navigate to `#BmsAdmin-manage` — user sees a meaningful home screen, not Change Documents.
- **Persona:** New user · PO

---

### [P2-006] `isActive` field inconsistency — OData queries reference it, DDL omits it

- **File:** `db/schema.cds:17-92`, `db/schema/core.cds:60`, `srv/services/map.cds:9`, `srv/services/restrictions.cds:37`, `srv/services/mass-edit.cds:14`
- **Symptom:** Even after P0-001 is fixed (table created without `isActive`), queries in `map.cds` (`condition, postingStatus, state, region, isActive`), `restrictions.cds` (`where isActive = true`), and `mass-edit.cds` (includes `isActive`) will all fail at runtime with "no such column: isActive" because the table won't have it.
- **Expected:** All service definitions must reference only columns that exist in the deployed table.
- **Fix:** Add `isActive : Boolean default true` to `db/schema.cds:Bridges` (the canonical entity), remove the conflicting definition from `core.cds`, and re-deploy.
- **Test:** All service queries succeed without column-not-found errors.
- **Persona:** Dev

---

### [P2-007] Map view fetches bridge data with hardcoded relative URL — breaks in BTP

- **File:** `app/map-view/webapp/controller/Main.controller.js:597-598`
- **Symptom:** `fetch("/map/api/bridges" + bboxParam)` uses a relative URL. In BTP/Cloud Foundry, the app router rewrites paths — the `xs-app.json` routes `/map/**` to the backend, but if the frontend is served from a different origin (HTML5 repo), the relative fetch will fail with a 404.
- **Expected:** The URL should resolve correctly in both local dev and BTP. Either use the SAPUI5 `sap.ui.require.toUrl()` mechanism or configure the data source in `manifest.json`.
- **Fix:** Add `mapApi` as a data source in the manifest and use `Component.getManifestEntry("sap.app/dataSources/mapApi")` to build the URL, making it configurable per environment.
- **Test:** Map loads bridges in BTP deployment without 404 errors.
- **Persona:** Dev · PO

---

### [P2-008] Mass upload API URL in controller is relative `/mass-upload/api` — may break in BTP

- **File:** `app/bms-admin/webapp/controller/MassUpload.controller.js:12`
- **Symptom:** `var BASE = "/mass-upload/api"` is a hardcoded relative path. In BTP, the Fiori app is served from the HTML5 app repository, while the backend is the CAP Node.js service. The routing is handled by the app router, but if the HTML5 app's origin differs from the backend origin, same-origin fetch calls to `/mass-upload/api` will fail with CORS or 404 errors.
- **Expected:** The URL should be configured via `manifest.json` data sources, not hardcoded.
- **Fix:** Add `massUploadApi` data source to `manifest.json`, read it in the controller via `Component.getManifestEntry`.
- **Test:** Mass upload validate/upload work in BTP deployment.
- **Persona:** Dev

---

### [P3-001] Dataset selector in MassUpload has static `Bridges` item in XML — duplicate after dynamic load

- **File:** `app/bms-admin/webapp/view/MassUpload.view.xml:35`
- **Symptom:** The view XML has a static `<core:Item key="bridges" text="Bridges" />` inside the `<Select>`. The controller's `_loadDatasets()` calls `sel.removeAllItems()` first (removing the static item) and then adds items dynamically. This is correct, but if `_loadDatasets()` fails (API error), the fallback adds hardcoded items that don't match the server's dataset keys (`bridges` vs `Bridges` — case difference). The fallback at line 41 uses keys `"Bridges"`, `"Restrictions"`, etc. (capitalised), but the static XML item uses key `"bridges"` (lowercase).
- **Expected:** Remove the static `<core:Item>` from the XML since it's always replaced dynamically. Ensure fallback keys match the server's dataset name convention.
- **Fix:** Remove `<items><core:Item ... /></items>` from `MassUpload.view.xml`. The controller manages all items programmatically.
- **Test:** Even when the `/datasets` API call fails, the fallback dropdown shows `Bridges` (uppercase, matching server) and validates against the correct dataset key.
- **Persona:** Dev · QA

---

### [P3-002] Validate results show "Updated: 0" tile which is meaningless for a dry run

- **File:** `app/bms-admin/webapp/controller/MassUpload.controller.js:141-169`
- **Symptom:** During validation (dry run), the "Updated" KPI tile shows `0`. Since no updates were performed, this tile is noise and may confuse users into thinking 0 records would be updated.
- **Expected:** During validation, hide or grey out the "Inserted" and "Updated" tiles (they have no meaning for a dry run). Show only "Total", "Valid", "Errors/Warnings".
- **Fix:** Set `tileInserted.setVisible(isUpload)` and `tileUpdated.setVisible(isUpload)` in `_showResults`.
- **Test:** After validate, only Total, Valid (was "Inserted"), Skipped (errors), and Errors tiles are shown.
- **Persona:** UX · New user

---

### [P3-003] `.xls` files are accepted by the file picker but rejected by the server

- **File:** `app/bms-admin/webapp/view/MassUpload.view.xml:44`
- **Symptom:** The hidden file input has `accept='.xlsx,.xls,.csv'` — it accepts old `.xls` format. The server-side validator in `mass-upload.js` only recognises `.xlsx` and `.csv` (checking `lowerName.endsWith('.xlsx')` and `.csv`). An `.xls` file passes the picker but gets rejected server-side as "Select a specific dataset for CSV uploads" or similar, producing a confusing error.
- **Expected:** Remove `.xls` from the file picker `accept` attribute, or add server-side support for `.xls` (convert via SheetJS which supports it).
- **Fix:** Change `accept='.xlsx,.xls,.csv'` to `accept='.xlsx,.csv'` in the view XML.
- **Test:** `.xls` files are not selectable in the file picker.
- **Persona:** New user · QA

---

### [P3-004] CLAUDE.md documents `fiori-apps.html` launchpad at wrong port

- **File:** `CLAUDE.md` (root), section "Running locally"
- **Symptom:** CLAUDE.md says `Fiori launchpad: http://localhost:4004/fiori-apps.html`. The BMS app runs on port 5050. All URL references in CLAUDE.md need updating.
- **Fix:** Update all `localhost:4004` references to `localhost:5050` in CLAUDE.md.
- **Test:** Developer following the CLAUDE.md quick-start URLs reaches the BMS app.
- **Persona:** New user · Dev

---

### [P3-005] `onUpload` button re-enabled after error even when no fix was made

- **File:** `app/bms-admin/webapp/controller/MassUpload.controller.js:122-137`
- **Symptom:** After a successful validate with errors or a failed upload, the Upload and Validate buttons are re-enabled (lines 122-123). The user could immediately re-click Upload without having corrected the file. While not blocking, it's a minor UX gap — a tooltip or indication that errors need to be fixed first would help.
- **Expected:** If the last validate had errors (`numErrors > 0`), the Upload button should remain disabled or show a warning that errors exist.
- **Fix:** After showing results with errors, set `uploadBtn.setEnabled(false)` and add a note: "Fix validation errors before uploading."
- **Test:** After validate finds errors, Upload button is disabled.
- **Persona:** New user · PO

---

## Summary Table

| ID | Priority | Area | Title | Status |
|----|----------|------|-------|--------|
| P0-001 | P0 | DB/Schema | Bridges CSV seed has `isActive` not in schema — deploy fails, no tables created | 🔴 Open |
| P0-002 | P0 | DB/Schema | `importanceLevel` type conflict: Integer in schema.cds vs String in core.cds | 🔴 Open |
| P1-001 | P1 | Docs/Config | CLAUDE.md documents wrong port (4004 vs 5050) | 🔴 Open |
| P1-002 | P1 | Mass Upload | Template download fails HTTP 500 (downstream of P0-001) | 🔴 Open |
| P1-003 | P1 | All screens | All OData reads fail "no such table" (downstream of P0-001) | 🔴 Open |
| P1-004 | P1 | Map | Map config endpoint fails, map tile keys unavailable | 🔴 Open |
| P2-001 | P2 | Mass Upload | File size: UI says 50MB, body parser rejects at ~18MB | 🟡 Open |
| P2-002 | P2 | Mass Upload | Validate "Inserted" tile misleadingly shows valid row count | 🟡 Open |
| P2-003 | P2 | Mass Upload | Validate preview truncated to 10 rows with no UI warning | 🟡 Open |
| P2-004 | P2 | Mass Upload | Upload confirm dialog always says "bridge records" for any dataset | 🟡 Open |
| P2-005 | P2 | BMS Admin | Home route targets Change Documents instead of a home screen | 🟡 Open |
| P2-006 | P2 | Schema | `isActive` in service CDS files references column not in DDL | 🔴 Open |
| P2-007 | P2 | Map | Map API fetch uses hardcoded relative URL — breaks in BTP | 🟡 Open |
| P2-008 | P2 | Mass Upload | Mass upload BASE URL hardcoded — breaks in BTP deployment | 🟡 Open |
| P3-001 | P3 | Mass Upload | Static `Bridges` XML item in dataset select has lowercase key mismatch | 🟢 Open |
| P3-002 | P3 | Mass Upload | Validate results show meaningless "Updated: 0" tile | 🟢 Open |
| P3-003 | P3 | Mass Upload | `.xls` accepted by file picker but rejected server-side | 🟢 Open |
| P3-004 | P3 | Docs | CLAUDE.md URLs all reference wrong port 4004 | 🟢 Open |
| P3-005 | P3 | Mass Upload | Upload button re-enabled after validation errors | 🟢 Open |
