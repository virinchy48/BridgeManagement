# CLAUDE.md — Bridge Management System

Project-specific rules for Claude Code (and any AI assistant). Every developer using
Claude on this repo should read this file and keep it up to date when conventions change.

---

## Project overview

**Bridge Management System (BMS)** — SAP CAP Node.js application for managing bridge
assets, restrictions, inspections, and NHVR heavy-vehicle approvals across Australian states.

| Layer | Technology |
|---|---|
| Backend | SAP CAP (`@sap/cds` v9), Node.js |
| Database | SAP HANA Cloud (prod) / SQLite (local dev) |
| Frontend | SAP Fiori Elements + UI5 (`sap.m`, `sap.ui.core`) |
| Auth | SAP XSUAA (prod) / `dummy` auth (local dev) |
| Mass upload | `xlsx` 0.18.x, REST API at `/mass-upload/api/` |
| Test runner | Jest 29 |
| Deploy | SAP BTP Cloud Foundry via MTA (`mta.yaml`) |

---

## Git workflow

- **Working branch: `draftv5`** — all development goes here, never directly to `main`
- Always `git pull --rebase origin draftv5` before starting work
- Never commit to `main` or any other branch without explicit instruction
- Never mix changes from other projects into commits here
- Push with `git push origin draftv5`

---

## Running locally

```bash
npm start          # cds-serve on http://localhost:8008
npm test           # Jest test suite
```

Fiori launchpad: `http://localhost:8008/fiori-apps.html`  
Mass upload UI: `http://localhost:8008/fiori-apps.html#BmsAdmin-manage&/mass-upload`  
Mass upload API: `http://localhost:8008/mass-upload/api/`  
Admin OData: `http://localhost:8008/odata/v4/admin/`  
Public OData: `http://localhost:8008/bridge-management/`

> **Note:** Port 8008 is used because port 4004 is occupied by a separate project (`31 Bridge Info system`) on this machine. The port is set via `PORT=8008 cds-serve` in `package.json`. If you change the port, update all references in this file and `.claude/launch.json`.

---

## Architecture rules

### CAP / CDS
- **`db/schema.cds` is the single canonical source for the `Bridges` entity** — `db/schema/core.cds` and `db/schema/admin.cds` define separate entities/types in different namespaces. Do NOT add another `entity Bridges` or `extend entity Bridges` unless you also verify the CDS merge is consistent with the SQLite DDL (see Known Gotchas below)
- All entity definitions live under `db/schema/` — never define entities inline in service files
- Services are declared in `srv/services/*.cds` and handled in `srv/handlers/*.js`
- Use `cds.utils.uuid()` for new UUIDs — never `crypto.randomUUID()` or `Math.random()`
- Always use parameterised CDS queries (`SELECT.from(...).where({key: value})`) — never string-concatenate SQL or OData filters
- Entity namespace is `bridge.management` — always prefix entity references with it (e.g. `bridge.management.Bridges`)
- `managed` mixin fields (`createdAt`, `createdBy`, `modifiedAt`, `modifiedBy`) are set by CAP automatically — never set them manually
- Integer primary keys on `Bridges` and `Restrictions` — use `getNextIntegerKey()` in `srv/mass-upload.js` to get the next value; do not use `cuid`

### Service handlers
- Handler files in `srv/handlers/` correspond 1-to-1 with service CDS files in `srv/services/`
- Never put business logic in `srv/service.js` or `srv/admin-service.js` — those are registration files only
- Audit logging: use `writeChangeLogs()` and `diffRecords()` from `srv/audit-log.js` for any entity mutation

### Mass upload (`srv/mass-upload.js`)
- `BRIDGE_COLUMNS`, `RESTRICTION_COLUMNS`, and `LOOKUP_COLUMNS` are the single source of truth for upload column schemas — never duplicate these definitions elsewhere
- `DATASETS` array order determines sheet order in the generated workbook — lookup sheets must come before `Bridges` and `Restrictions`
- `parseSheetRows()` normalises headers by stripping BOM (`\uFEFF`), trailing `*`, and lowercasing — keep this logic intact when editing
- `buildWorkbookTemplate()` adds Excel data-validation dropdowns to all lookup-backed columns via `addSheetValidations()` — update `REFERENCE_EXAMPLES` whenever a new lookup-backed column is added to `BRIDGE_COLUMNS` or `RESTRICTION_COLUMNS`
- The REST endpoint at `/mass-upload/api/upload` accepts `{ fileName, contentBase64, dataset }` — `dataset: "All"` processes every sheet in an Excel workbook
- CSV uploads require a specific `dataset` name; Excel uploads can use `"All"`

### Frontend (Fiori / UI5)
- App modules live under `app/` — one subdirectory per Fiori app (e.g. `app/bms-admin`, `app/mass-upload`)
- Each app has its own `manifest.json`, `controller/`, `view/`, and `i18n/`
- Use `sap.m` controls — avoid deprecated `sap.ui.commons`
- Dataset API responses use `{ name, label, description }` — never `{ key, text }` (that was a bug, now fixed)
- Upload API response shape for `/upload`: `{ summaries: [{dataset, inserted, updated, processed}], skipped: [], warnings: [] }`
- Upload API response shape for `/validate`: `{ totalCount, validCount, errorCount, warningCount, previewRows: [...] }`

---

## Coding conventions

- **No comments by default** — only add a comment when the WHY is non-obvious (a hidden constraint, a workaround, a subtle invariant). Never describe WHAT the code does.
- No trailing summaries or "this completes X" comments in code
- Prefer editing existing files over creating new ones
- No defensive error handling for scenarios that cannot happen — trust CAP framework guarantees
- Validate only at system boundaries (user input, external APIs) — not internally
- Three similar lines is better than a premature abstraction
- Boolean columns in CSVs: accept `true/false`, `TRUE/FALSE`, `yes/no`, `1/0` — the `parseBoolean()` function in `mass-upload.js` handles all of these

---

## Database / seed data

- Seed CSV files live in `db/data/` and are loaded by `cds deploy` on startup
- Lookup table seed files follow the naming pattern `bridge.management-{EntityName}.csv`
- Separator in lookup CSVs: some use `;` (multi-column), some use `,` — check before editing
- **Do not change codes in lookup tables** without migrating existing bridge/restriction records that reference them — codes are stored as foreign-key strings
- The `BMS-MassUpload-Complete.xlsx` workbook in `db/data/` is the source of truth for the 56 real Australian bridge records — the australia CSV is generated from it

### Bridge data files
| File | Rows | Source |
|---|---|---|
| `db/data/mass-upload-bridges-australia.csv` | 56 | Real — Wikipedia, VIC Open Data, TfNSW |
| `db/data/mass-upload-bridges-nsw-bulk.csv` | 5,152 | Synthetic — TfNSW statistical distributions |
| `db/data/BMS-MassUpload-Complete.xlsx` | 56 bridges + all lookups | Generated workbook with dropdown validation |

Both CSVs use exact `BRIDGE_COLUMNS` headers from `srv/mass-upload.js`. Regenerate with:
```bash
node scripts/rebuild-bridge-csvs.js
```

---

## Scripts

| Script | Purpose |
|---|---|
| `scripts/generate-bulk-bridges.js` | Generates synthetic NSW bridge data (old column names — pipe through rebuild) |
| `scripts/rebuild-bridge-csvs.js` | Remaps both bridge CSVs to exact BRIDGE_COLUMNS headers |
| `scripts/generate-mass-upload-workbook.js` | Generates BMS-MassUpload-Complete.xlsx from seed CSVs |
| `scripts/seed-attributes.js` | Seeds attribute definitions for bridges and restrictions |

---

## Testing

- Test files live in `test/`
- Run with `npm test`
- Do not mock the database in integration tests — tests use a real SQLite in-memory DB via `@cap-js/sqlite`
- Use the mass upload API (`/mass-upload/api/validate` and `/upload`) to test file loading end-to-end via `curl` or the test scripts

---

## Known gotchas and hard-won learnings

### Mass upload / CSV
- **BOM on CSV headers**: `XLSX.writeFile(..., { bookType: 'csv' })` prepends a UTF-8 BOM (`\uFEFF`) to the file. When parsed back, the first column becomes `\uFEFFID` not `ID`. Fix: `parseSheetRows()` already strips BOM — but always write CSVs with `XLSX.utils.sheet_to_csv()` + `fs.writeFileSync(path, csv, 'utf8')` to avoid generating BOM in the first place.
- **Excel workbook headers have `*` suffix**: `buildHeaderRow()` appends `*` to required column names (e.g. `bridgeName *`, `state *`). When reading an xlsx back with `sheet_to_json`, the keys include the `*`. Always strip: `key.replace(/\s*\*\s*$/, '').trim()` before using as a property name.
- **`importanceLevel` is text in source data**: The original bridge data files used text labels ("Essential", "Important", "Critical", "Ordinary"). The DB schema defines it as `Integer`. The rebuild script clears it to empty for non-numeric values — do not try to map text labels to integers without a defined scale.
- **Rebuild CSVs from the workbook, not from themselves**: `db/data/mass-upload-bridges-australia.csv` loses its bridge names if rebuilt in-place from itself. Always source the 56 real bridges from `db/data/BMS-MassUpload-Complete.xlsx` Bridges sheet. The `rebuild-bridge-csvs.js` script does this correctly — do not change it to read from the CSV.
- **Column name mapping (old → new)**: The bulk generator script (`generate-bulk-bridges.js`) still uses old column names. The mapping is: `name`→`bridgeName`, `numberOfSpans`→`spanCount`, `spanLengthM`→`spanLength`, `totalLengthM`→`totalLength`, `deckWidthM`→`deckWidth`, `clearanceHeightM`→`clearanceHeight`, `maintenanceAuthority`→`managingAuthority`, `bdoubleApproved`→`bDoubleApproved`, `nhvrRouteAssessed`→`nhvrAssessed`, `aadt`→`averageDailyTraffic`, `heavyVehiclePercentage`→`heavyVehiclePercent`, `floodImmunityAri`→`floodImmunityAriYears`. Use the `src(row, newName, oldName)` helper in `rebuild-bridge-csvs.js` to handle both.
- **Dataset key bug (historical)**: The BMS Admin `MassUpload.controller.js` previously read `ds.key` and `ds.text` from the datasets API. The correct fields are `ds.name` and `ds.label`. Fixed — do not reintroduce the old field names.
- **Upload response shapes differ**: `/validate` returns `{ totalCount, validCount, errorCount, previewRows }`. `/upload` returns `{ summaries: [{dataset, inserted, updated, processed}], skipped, warnings }`. The UI `_showResults()` function handles both — keep the branching on `isUpload`.

### Excel data validation
- **`!validations` array** on a worksheet adds in-cell dropdown lists in Excel. Format: `{ type: 'list', sqref: 'E2:E10001', formula1: "'SheetName'!$A$2:$A$N', showErrorMessage: true, error: '...' }`. Added to Bridges and Restrictions sheets via `addSheetValidations()` in `mass-upload.js`.
- **`colIndexToLetter(idx)`** converts a 0-based column index to an Excel column letter (e.g. 0→A, 26→AA). Added to `mass-upload.js` — reuse it; do not re-implement.
- **Lookup sheet order matters for validation formulas**: `addSheetValidations()` is called inside the `for (const dataset of DATASETS)` loop, so all lookup sheets are already in `datasetRowsByName` by the time Bridges and Restrictions are processed. If you reorder DATASETS, keep lookups before Bridges/Restrictions.

### UI / Fiori
- **`onDatasetChange` resets file state**: Changing the dataset dropdown clears the selected file buffer. This is intentional — the file must match the selected dataset.
- **GenericTile `setValue` not `setText`**: The KPI tiles in the results panel use `NumericContent` which has `setValue()`, not `setText()`. Always pass a `String` to `setValue()`.

### Deployment
- `mta.yaml` defines the MTA modules for BTP deployment — `cds build` must be run before `mbt build`
- The app router (`app/router`) handles authentication redirect and HTML5 repo serving — do not add business logic there
- HANA schema migrations: add new entities/columns to `db/schema/` then run `cds deploy --to hana` — never alter HANA tables directly

### Schema / DB deploy
- **Always verify `cds deploy` succeeds before committing seed CSV changes.** Run `npx cds deploy --to sqlite:db.sqlite` (with Node 20) and check for no errors. A failed deploy leaves an empty `db.sqlite` and the entire app breaks on startup.
- **Seed CSV column drift is fatal.** If `db/data/bridge.management-Bridges.csv` headers don't exactly match the `Bridges` entity columns, deploy fails silently (exits with error, no tables created). After any schema or CSV change, re-run `cds deploy` to confirm.
- **Node version must be 20+.** `npx cds deploy` fails on Node 16 ("Node.js version 20 or higher required"). Use `nvm use 20` before running deploy scripts.
- **`isActive` field is REQUIRED in `Bridges`.** `db/schema.cds:Bridges` must have `isActive : Boolean default true`. Without it, the seed CSV fails. Multiple service definitions (`srv/services/map.cds`, `srv/services/restrictions.cds`, `srv/services/mass-edit.cds`) filter on `isActive`; removing it breaks those queries.
- **`importanceLevel` must be `Integer` in `db/schema.cds`.** `db/schema/core.cds` has a conflicting `String(20)` definition — that file's version should be deleted or aligned. The canonical type is `Integer @assert.range:[1,4]` (1=Critical, 2=Essential, 3=Important, 4=Ordinary).
- **`db/schema/core.cds` contains legacy Bridges fields that must not duplicate `db/schema.cds`.** If both files define overlapping `bridge.management.Bridges` fields, CDS merges them at runtime but the SQLite DDL may only use one — causing "no such column" errors in OData queries even after a successful deploy. Keep `db/schema.cds` as the single entity definition; use `extend entity` in core.cds only for genuinely additive fields, and always re-test with `cds deploy` after any change.

### Mass upload (server)
- **File size limit:** `express.json({ limit: '25mb' })` in `srv/server.js` is the effective upload limit. A 50 MB binary file base64-encodes to ~67 MB JSON — it will be rejected with HTTP 413 before reaching the endpoint. The UI "max 50 MB" label is misleading; effective raw-file limit is ~18 MB. Raise the limit to `'70mb'` if 50 MB files must be supported.
- **CSV + "All Datasets" is not allowed.** The server correctly rejects this (`'Select a specific dataset for CSV uploads'`), but the UI doesn't validate this client-side. Add a check in `onValidate`/`onUpload` before calling the API.
- **Validate preview is capped at 10 rows** (`previewRows.slice(0, 10)` in `mass-upload.js`). Users with many errors only see the first 10 with no indication that more exist. Add a `previewTruncated` flag to the response and show a MessageStrip in the UI.

### UI / Fiori
- **`onDatasetChange` resets file state**: Changing the dataset dropdown clears the selected file buffer. This is intentional — the file must match the selected dataset.
- **GenericTile `setValue` not `setText`**: The KPI tiles in the results panel use `NumericContent` which has `setValue()`, not `setText()`. Always pass a `String` to `setValue()`.
- **`class:` is NOT a valid UI5 constructor property — use `.addStyleClass()` instead.** Passing `class: "sapUiSmallMargin"` inside `new VBox({...})`, `new HBox({...})`, `new Icon({...})`, or `new Title({...})` generates `ManagedObject.apply: encountered unknown setting 'class'` errors at runtime. Always chain `.addStyleClass("...")` after instantiation: `new HBox({ items: [...] }).addStyleClass("sapUiTinyMarginTop")`. This applies to ALL managed objects — no exceptions.
- **CSRF tokens in custom REST fetch calls.** The `validateCsrfToken` middleware on custom Express routers (e.g. `/quality/api`, `/mass-upload/api`) requires the `X-CSRF-Token` header on all POST/PUT/DELETE requests. Pattern: add a `_getCsrfToken()` method that sends a HEAD request with `X-CSRF-Token: Fetch` and caches the returned token; add a `_mutate(url, method, body)` helper that calls `_getCsrfToken()` then sends the fetch with `X-CSRF-Token: <token>`. Wire all mutating fetch calls through `_mutate`. Without this, requests silently fail in production (XSUAA auth enabled).
- **Express middleware order matters for routers.** `router.use(express.json())` must appear BEFORE route definitions in the same router, otherwise POST/PUT bodies are undefined when the route handler runs.
- **Server-side field whitelist on rule mutations.** Any endpoint that accepts a `field` parameter used for dynamic property lookup (`bridge[field]`) must validate `field` against an allowlist (`ALLOWED_RULE_FIELDS`) to prevent prototype pollution attacks.
- **`_showResults` "Inserted" tile is misleading during validation.** During Validate Only, `numInserted` is populated with `validCount` but the tile is labelled "Inserted" — users think data was written. Change the tile header dynamically: "Valid" for validate, "Inserted" for upload.
- **Upload confirm dialog text must reflect the selected dataset.** The current hardcoded "bridge records / Bridge ID" text is wrong for Restrictions and lookup datasets. Use `this.byId("datasetSelect").getSelectedItem().getText()` to build the dialog message.
- **BMS Admin home route targets `changeDocuments`.** There is no home/overview tile grid. The default landing screen for `#BmsAdmin-manage` is Change Documents. If a dedicated home screen is added, update the `home` route target in `manifest.json`.
- **Hardcoded `/mass-upload/api` BASE URL** in `MassUpload.controller.js` works in local dev but will break in BTP where origins differ. Same issue with `/map/api/bridges` in the map controller. Both should be driven by `manifest.json` data sources.
- **Static `<core:Item key="bridges">` in MassUpload.view.xml** is always removed by `_loadDatasets()`. Remove it from the XML — it only causes confusion if the fallback key casing ever diverges.
- **Shell version badge: use `this.byId()` not `sap.ui.getCore().byId(fullId)`.** In the FLP context the element ID is prefixed (e.g. `application-BmsAdmin-manage-component---bmsAdminShell--appVersionEnv`). `this.byId("appVersionEnv")` resolves correctly via the controller's view scope. Using `sap.ui.getCore().byId(this.getView().getId() + "--appVersionEnv")` fails because `getView().getId()` does not include the full FLP prefix at `onInit` time. Call `_setVersionBadge` via `setTimeout(..., 0)` in `onInit` to ensure the view is rendered first.
- **`IconTabFilter` content is lazily rendered.** Controls inside a non-selected `IconTabFilter` are not in the DOM until that tab is first activated. Do not expect to `byId()` controls in an inactive tab during `onInit` — always check after tab selection.
- **`IconTabFilter.setCount(n)` shows a badge number on the tab.** Pass a non-empty string to show the count; pass `""` to hide it. Wire this in `_renderS1` / `_renderS2` so tabs always reflect current result counts.
- **Change Documents action type is derived client-side.** A batch is `Create` when all its field rows have null/empty `oldValue`; otherwise `Change`. This is computed in `_renderS1` after grouping raw rows by `batchKey` — no server-side field is needed.
- **Map feature popup uses `sap.ui.xmlfragment` with view ID scoping.** Fragment is loaded once and cached on `this._featureDialog`. Use `this.getView().addDependent(fragment)` after loading to wire the fragment's lifecycle to the view. Fragment namespace must match the app manifest `id` (e.g. `"BridgeManagement.mapview.fragment.FeatureDetail"`).
- **`_matchesRange` with null values: treat null as always-pass.** A bridge with null `yearBuilt` or `conditionRating` has no data for that field and should always be visible regardless of filter range. The old logic of "only pass when filter is at default" caused bridges to disappear from the map when the time slider moved — that was a bug.
- **Map URL param navigation — snap then fly.** When `_checkUrlParams` finds a `bridgeId` in the URL, call `map.setView(coords, 11, {animate: false})` first, then `flyTo` for the short zoom-in. Without the snap, `flyTo` animates a continent-wide pan from the Australia extent which looks jarring.
- **Resizable bottom panel uses a JS-injected drag handle.** `_initListResizer` inserts `div.nhvrResizeHandle` at the top of `.nhvrListPanel` when the panel first opens (60ms after `onToggleSplitView`). It modifies `listPanel.style.flexBasis` on drag and calls `invalidateSize` on mouseup.
- **`assertBridgeExists` must also check the drafts table.** The attachment API calls `assertBridgeExists` which queries only the active `bridge.management.Bridges` entity. For a bridge created but not yet activated, the record is only in `bridge.management.Bridges.drafts`. Add a fallback query to the drafts table before throwing 404.
- **`Attachments.js` mutating requests need a CSRF header.** Upload (POST) and delete (DELETE) calls to `/admin-bridges/api/` must include `X-CSRF-Token` in production (XSUAA enabled). Use the `mutate(url, method, body)` helper which calls `getCsrfToken()` first. The HEAD request to fetch the token falls back to `"unsafe"` since the server has no token-issuance endpoint — any non-empty value passes the middleware check.
- **Reference layer tile types in `Main.controller.js`.** `REFERENCE_LAYERS` supports `type: "xyz"` (`L.tileLayer()`) and `type: "wms"` (`L.tileLayer.wms()`). ABS ASGS layers use XYZ: `geo.abs.gov.au/arcgis/rest/services/ASGS2021/*/MapServer/tile/{z}/{y}/{x}`. Most GA `services.ga.gov.au/gis/services/Foundation_*` WMS endpoints are retired (404) as of 2026-04. Only GA Surface Geology WMS and NSW SixMaps WMS (`maps.six.nsw.gov.au`) are live.
- **Map viewport mode bbox: guard on zoom < 8.** `_getViewportBbox()` returns `null` when `viewportMode` is off or map zoom is below 8. This prevents spamming the API with tiny-bbox queries at national zoom levels. The `moveend zoomend` handler also short-circuits at zoom < 8. The bbox is formatted as `minLon,minSat,maxLon,maxLat` (5 decimal places).
- **Fiori Elements extension action wiring.** To add a custom toolbar button on an object page: (1) add `sap.ui5.extends.extensions.sap.ui.controllerExtensions` in manifest.json pointing the FE template controller to your extension controller; (2) add the action under `content.header.actions` on the routing target with `press` pointing to `YourController.methodName`. The extension controller must live in `webapp/ext/controller/` and be a plain object returned from `sap.ui.define`.
- **Condition capture saves via `context.setProperty` + `submitBatch`.** In a Fiori Elements extension controller, get the binding context from `this._oView.getBindingContext()`. Set each field with `context.setProperty("fieldName", value)`. Flush to the server with `this._oView.getModel().submitBatch("$auto")`. This triggers a PATCH on the active entity — no manual CSRF needed since the OData model handles it.
- **Operations apps use free-style UIComponent, not Fiori Elements AppComponent.** The `app/operations/*` apps are read-only field-staff views. They extend `sap/ui/core/UIComponent` (not `sap/fe/core/AppComponent`) with `rootView` manifest routing. They fetch data via plain `fetch()` from REST APIs (`/map/api/bridges`, `/dashboard/api/analytics`, `/odata/v4/admin/Restrictions`) and populate a JSONModel — no OData binding required.
- **Fiori Elements supports only one controller extension per template key.** `sap.ui5.extends.extensions.sap.ui.controllerExtensions` maps `sap.fe.templates.ObjectPage.ObjectPageController` to exactly one controller name. If you need multiple actions (e.g. CaptureCondition + ExportCard), add all handler methods to the same extension controller file — do not register two separate controllers under the same template key.
- **PDF bridge card uses print-ready HTML, not a PDF library.** The endpoint `GET /admin-bridges/api/bridges/:id/card` returns `text/html` with inline CSS and `window.onload = () => window.print()`. No `pdfkit` or `puppeteer` dependency needed — the browser's native print dialog handles PDF generation. The "Print / Save as PDF" button is hidden via `@media print { .no-print { display: none; } }`.
- **MTA HTML5 modules need `ui5-task-zipper` in ui5.yaml.** Each `html5` module in mta.yaml requires a `ui5-task-zipper` custom builder task in `ui5.yaml` that produces a `.zip` archive (`archiveName`). Without it the app-deployer cannot pick up the built artifact. Pattern: `builder.customTasks: [{name: ui5-task-zipper, afterTask: generateResourcesJson, configuration: {archiveName: <app-id>}}]`.
- **`xs-app.json` must route custom REST paths to `srv-api` destination.** Each app's `xs-app.json` needs explicit routes for its custom Express endpoints before the catch-all `html5-apps-repo-rt` route. E.g. `app/map-view/xs-app.json` needs routes for `/map/api/*` and `/dashboard/api/*`. Missing routes cause 404 in BTP even though the same paths work locally.
- **Test pattern: copy pure functions inline, never import from project.** All test files in `test/` copy the pure function logic verbatim rather than requiring server files. This keeps tests dependency-free (no CDS runtime needed) and fast. The pattern: paste the function at the top of the test file with a comment, then write `describe/it/expect` blocks.
- **`mbt build` validation command: `npm run validate-build`.** Runs `cds build --production` then `mbt build` in sequence. Both must pass before any BTP deployment. Run this after any schema change, new app addition, or mta.yaml edit.
- **`sap.m.IconTabBar` requires explicit `<items>` aggregation in XML views.** Direct `<IconTabFilter>` children of `<IconTabBar>` fail with "Cannot add direct child without default aggregation defined". Always wrap: `<IconTabBar><items><IconTabFilter>...</IconTabFilter></items></IconTabBar>`. Same pattern applies to `<IconTabFilter>` content — use `<content>` wrapper inside each filter tab.
- **Free-style `UIComponent` views must wrap `<Page>` in `<App>` for correct height sizing.** Without `<App>`, the `sap.m.Page` content section collapses to height 0 inside the Fiori shell because there is no sized container. Always use `<App id="..."><Page ...>...</Page></App>` as the view root for free-style apps (not Fiori Elements). The Dashboard app already follows this pattern.
- **ObjectPage header DataPoints (KPI chips) require virtual integer fields for criticality.** `UI.DataPoint.Criticality` binding must resolve to an Integer (1=Error/red, 2=Warning/amber, 3=Success/green). String enum values (e.g. `postingStatus`) cannot be used directly. Pattern: add `virtual postingStatusCriticality : Integer` to the entity in CDS, populate it in `this.after('READ', Entity, ...)` handler, annotate with `@UI.Hidden` in fiori-service.cds, and bind `DataPoint.Criticality: postingStatusCriticality`.
- **`CriticalityCalculation` for numeric threshold chips.** For condition rating (1–10 scale), use: `CriticalityCalculation: { ImprovementDirection: #Maximize, ToleranceRangeLowValue: 8, DeviationRangeLowValue: 5 }`. This gives green ≥8, amber 5–7, red <5. Works with `UI.DataPoint` — no virtual field needed since it uses the raw numeric value.
- **`$edmJson` inline criticality for computed boolean conditions.** For DataPoints where criticality is derived inline (e.g. count > 0 → amber): `Criticality: { $edmJson: { $If: [{ $Gt: [{ $Path: 'activeRestrictionCount' }, 0] }, 2, 3] } }`. The `$Path` must match the OData property name exactly. Use this only when a virtual integer field would be overkill.
- **`sap.fe.core.PageController.onAfterRendering` is the correct hook for section visibility.** `onInit` fires before Fiori Elements renders the ObjectPage sections — `getSections()` returns an empty array at that point. Store resolved scopes in `this._scopes` during `onInit`, then apply `setVisible()` and `setSelectedSection()` calls in `onAfterRendering`. `onAfterRendering` fires after every FE render including draft activation.
- **Inspector section scroll needs both `setSelectedSection` and `scrollToSection`.** `oPage.setSelectedSection(condSection.getId())` sets the active anchor-bar tab but does not scroll the viewport. `oPage.scrollToSection(condSection.getId())` scrolls the content area. Both are needed — and both require `.getId()` (a string), not the section object reference.
- **SAPUI5 FE probes for optional extension fragment files and throws 404s if absent.** If the browser shows `resource .../ext/view/ElementConditions.fragment.xml could not be loaded`, create a stub at that exact path containing `<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core"><VBox/></core:FragmentDefinition>`. The 404 may also be a stale browser cache — always Cmd+Shift+R (hard-refresh) first before creating a stub.
- **HTML5 `<input type="file" capture="environment">` for tablet camera capture.** `sap.ui.unified.FileUploader` has no `capture` attribute support. Create a hidden file input programmatically: `var input = document.createElement("input"); input.type = "file"; input.accept = "image/*"; input.capture = "environment"; document.body.appendChild(input); input.click()`. Append to body so iOS Safari can open the camera sheet. Remove the element in the `change` handler after reading `input.files[0]`.

- **`ui5.yaml` metadata.name must be lowercase alphanumeric/dash/underscore/period only (UI5 CLI v4).** `BridgeManagement.bridgespublic` fails; use `bridges-public`. UI5 CLI v4 enforces this strictly — the build fails with "Not a valid project name". All app `ui5.yaml` names must match this pattern.
- **After changing `package.json` devDependencies, always regenerate `package-lock.json` via `npm install`.** `mbt build` runs `npm ci` which fails if the lock file doesn't match. If you add/remove/bump a package, run `npm install` in that app directory and commit the updated lock file.
- **Fiori Elements ObjectPage extension panels must use direct OData entity queries, not navigation paths.** If `AdminService` does not expose a composition navigation (e.g. `Bridges/inspections`), the fetch will 404. Use `BridgeInspections?$filter=bridge_ID eq {id}` instead of `Bridges(ID={id})/inspections`. Check `admin-service.cds` for what entities are top-level vs navigation-only.
- **`xs-app.json` is required for every HTML5 module that uses `ui5-task-zipper` with `additionalFiles: [xs-app.json]`.** If the file doesn't exist, the zipper task throws `ENOENT` and the build fails. Create a minimal xs-app.json for every app, even if it only has the catch-all html5-apps-repo-rt route.
- **`nhvr.Bridge` and `bridge.management.Bridges` are intentionally separate tables.** `BridgesService.Bridges` projects `nhvr.Bridge` (NHVR compliance / route features); `AdminService.Bridges` projects `bridge.management.Bridges` (core admin). Different namespaces, different DB tables — no conflict. Do not try to merge them.
- **XSUAA scope names are case-sensitive in CAP `@requires`.** CAP checks the exact XSUAA scope string (e.g. `$XSAPPNAME.admin`, resolved as `'admin'`). Role template names like `BMS_ADMIN` are NOT valid — only the lowercase scope names defined in `xs-security.json` work. Capital-A `'Admin'` silently passes in dummy auth but fails in production.
- **Custom Express routers need explicit `requireScope()` middleware.** CAP `@requires` annotations only gate OData endpoints — not custom Express routers mounted via `app.use()`. Pattern: `app.use('/some/api', requiresAuthentication, requireScope('admin', 'manage'), validateCsrfToken, router)`. Define `requireScope()` at the top of `srv/server.js` and apply it to every non-OData router.
- **`activeRestrictionCount` virtual field: use a batch GROUP BY query, not a single-record COUNT.** The `after('READ', Bridges)` handler must batch-count all result IDs in one query: `SELECT.from('...BridgeRestrictions').columns('bridge_ID', 'count(1) as cnt').where({bridge_ID: {in: ids}, active: true}).groupBy('bridge_ID')`. A single-record conditional (`if list.length === 1`) always shows 0 on the list report.
- **`xs-app.json` public-bridge unauthenticated route must be before the catch-all.** Add `{"source": "^/public-bridge/(.*)$", "target": "/public-bridge/$1", "destination": "srv-api", "authenticationType": "none", "csrfProtection": false}` before the catch-all `html5-apps-repo-rt` entry, otherwise unauthenticated OData requests to `PublicBridgeService` are blocked by the xsuaa catch-all.
- **`validateCsrfToken` middleware must reject in all environments, not just production.** Check that the token value is non-empty, longer than 3 chars, and not the literal string `"fetch"` (case-insensitive). The common pattern of accepting any truthy value passes the `X-CSRF-Token: Fetch` probe itself as a valid token.
- **Working branch is now `main` (consolidated from `draftv8-btp-sid`).** All prior `draftv*` branches have been deleted from remote. Push only to `origin/main`. The `draftv8-btp-sid` branch remains as a backup tag point.

---

## What NOT to do

- Do not use `--no-verify` to skip git hooks
- Do not push directly to `main` or `origin/main`
- Do not add `console.log` debug statements to production code paths
- Do not hardcode SAP BTP credentials, XSUAA client secrets, or HANA connection strings — use `VCAP_SERVICES` environment variables
- Do not create new `.cds` files without a corresponding handler `.js` file
- Do not use `XLSX.writeFile` with `bookType: 'csv'` — it adds a BOM; use `XLSX.utils.sheet_to_csv()` + `fs.writeFileSync(..., 'utf8')` instead
- Do not use `ds.key` or `ds.text` when reading the `/mass-upload/api/datasets` response — the correct fields are `ds.name` and `ds.label`
- Do not rebuild `mass-upload-bridges-australia.csv` from itself — source it from `BMS-MassUpload-Complete.xlsx`
- Do not add columns to `BRIDGE_COLUMNS` or `RESTRICTION_COLUMNS` without also updating `REFERENCE_EXAMPLES` (if lookup-backed) and the corresponding DB entity in `db/schema/`
- Do not add fields to `db/schema/core.cds:Bridges` that duplicate or conflict with fields in `db/schema.cds:Bridges` — schema merges silently and causes "no such column" runtime errors
- Do not change the `importanceLevel` type from `Integer` to `String` in `db/schema.cds` — the mass upload pipeline expects integers and the `rebuild-bridge-csvs.js` script clears non-integer values
- Do not set the server port to 4004 — that port is used by a separate project. BMS uses 5050.
- Do not forget to run `cds deploy` after any schema or seed CSV change — a failed deploy produces a silent empty DB and the app appears to start but serves no data

---

## Custom code vs Fiori Elements annotations

Only `app/admin-bridges` uses standard Fiori Elements + CAP annotations (`@odata.draft.enabled`). All 11 BMS-Admin screens are fully custom XML views + controllers — no `@UI.*` annotations exist in any `.cds` service file. This is intentional: KPI dashboards, audit trails, mass upload wizards, GIS config, and the map view all require UX patterns that Fiori Elements templates cannot express. Do not attempt to migrate these to FE annotations without a full UX re-design effort.

### Server-side security patterns (custom Express routers)
- **Always validate ISO date strings** before passing to `new Date().toISOString()` — use `/^\d{4}-\d{2}-\d{2}$/` regex + `isNaN(Date.parse(str))`. Raw `new Date(userInput).toISOString()` throws and returns a 500 if the string is invalid.
- **Always cap numeric query params** (radius, zoom, limit, offset) with `Math.max/min` before use — never pass uncapped user values to DB queries or haversine calculations.
- **`express.json()` must be the first middleware on a router** — place it before any route definition or POST/PUT bodies are `undefined` in handlers.
- **Never use `JSON.parse(userSuppliedField)` without try/catch** — use `try { return JSON.parse(v) } catch(_) { return null }` pattern. Bridge `geoJson` field in DB can be malformed.
- **Server-side field allowlist on any endpoint using `bridge[field]`** — dynamic property lookup must validate against `ALLOWED_RULE_FIELDS` (or equivalent) to prevent prototype pollution.

### launch.json Node version
- `.claude/launch.json` must use `bash -c "source ~/.nvm/nvm.sh && nvm use 20 && npm start"` as the runtimeExecutable/args — `@sap/cds` v9 requires Node 20+ and the preview server inherits the shell's Node version which may be 16.

### SAP FE console errors in local shell emulator
- `"There should be a sap.fe.core.AppComponent as owner of the control"` errors appear when navigating between apps in the local Fiori launchpad shell emulator. These are SAP FE framework limitations in the emulated shell — **not bugs in our code**. Ignore in local dev; they do not appear in BTP with the real shell.
- **`#admin-bridges-manage&/Bridges/new` cannot be resolved in local FLP shell.** FE4 auto-generates this navigation target for the ListReport's Create button using the component's internal ID (`admin-bridges-manage`) rather than the FLP inbound key (`Bridges-manage`). This shows a persistent "Sorry, the app couldn't be opened" dialog in local dev — it is a known FLP shell limitation and does not affect BTP.

### Dashboard and Reports architecture (as of 2026-04)
- **The live dashboard app is `app/dashboard/webapp/`**, resolved by FLP inbound `Dashboard-display`. `app/operations/dashboard/webapp/` is an older duplicate that is NOT loaded by FLP — do not edit it for dashboard features.
- **Network Reports is embedded in the Bridges app** at `#Bridges-manage&/NetworkReports`. It is NOT a standalone app. The `app/reports/webapp/` manifest has empty inbounds — the FLP Reports tile now routes to `#Bridges-manage&/NetworkReports`.
- **Dashboard KPI deep-links to NetworkReports tab** via `window.location.href = "#Bridges-manage&/NetworkReports?tab=<key>"`. The NetworkReports controller reads `window.location.hash.match(/[?&]tab=([^&]+)/)` in `onInit` to select the correct tab.
- **`admin-bridges` uses `sap.m.NavContainer`, NOT `sap.f.FlexibleColumnLayout`.** Custom XMLView routing targets (`GISConfig`, `NetworkReports`) must NOT specify `controlId: "fcl"` or `controlAggregation: "midColumnPages"` — there is no FCL in this app. Remove both properties entirely and let FE4's router handle placement. Specifying `controlId: "fcl"` causes `Control with ID fcl could not be found` routing errors.
- **Dashboard CSS `.dashboardKpiTileWrapper > .sapMFlexItem:last-child`** positions the info button absolutely. Guard with `:not(:first-child)` to prevent tiles that have no info button (single child) from having their GenericTile yanked out of the flex flow: `.dashboardKpiTileWrapper > .sapMFlexItem:last-child:not(:first-child) { position: absolute; ... }`.

### Reports API entity correctness
- **`srv/reports-api.js` must query `bridge.management.Bridges`, not `nhvr.Bridge`.** The `nhvr.Bridge` entity is a legacy separate table — it is empty in normal operation. All report endpoints (`/risk-register`, `/data-quality`, etc.) must use `bridge.management.Bridges`. The field mapping differs: `nhvr.Bridge.name` → `bridge.management.Bridges.bridgeName`; `nhvr.Bridge.condition` (string) → `bridge.management.Bridges.condition` (also a string — both exist); `criticalDefectFlag` and `dataQualityScore` only exist on `nhvr.Bridge` and have no equivalent in `bridge.management.Bridges`.
- **`criticalDefectFlag` does not exist on `bridge.management.Bridges`.** This field is only defined on `nhvr.Bridge` (in `db/schema/core.cds`). If a risk-score formula needs a defect signal, use `conditionRating >= 4` as a proxy — do not reference `criticalDefectFlag` in queries against `bridge.management.Bridges`.
- **`dataQualityScore` does not exist on `bridge.management.Bridges`.** The data-quality endpoint must compute completeness from actual field presence, not a pre-computed score column. The `/data-quality` endpoint should use `bridge.management.Bridges` and compute a quality metric inline, or return `withScore: 0` until a DQ job populates scores.

### BMS Admin app — navigation in local dev
- **BMS Admin internal routing requires the component router, not URL hash changes.** From `preview_eval` or browser console, navigate between admin screens via: `sap.ui.core.Component.registry.all()['application-BmsAdmin-manage-component'].getRouter().navTo('gisConfig')`. Valid route names: `changeDocuments`, `dataQuality`, `userAccess`, `systemConfig`, `bnacConfig`, `gisConfig`, `attributeConfig`, `attributeReport`, `apiDocs`, `demoMode`. Setting `window.location.hash` directly triggers FLP to try resolving it as an app intent and shows "app couldn't be opened."

### UI5 XML view aggregation binding gotcha
- **Aggregation properties must not be set as empty-string attributes on the XML element tag.** `<GenericTile tileContent="">` generates `[FUTURE FATAL] non valid BindingInfo (wrong value: tileContent='')`. Aggregations are set only via nested child elements (`<tileContent><TileContent>...</TileContent></tileContent>`). Having both `tileContent=""` as an attribute AND nested child aggregations is invalid — remove the attribute form entirely.

### CDS sub-schema file circular reference pattern
- **`entity Bridges` lives in `db/schema/bridge-entity.cds`** — moved out of the `db/schema.cds` barrel so that other schema sub-files can import it without a circular dependency. `db/schema.cds` loads it via `using { bridge.management.Bridges } from './schema/bridge-entity'` and all sub-files that define associations to Bridges import it via `using { bridge.management.Bridges } from './bridge-entity'`.
- **`using from 'path'` (wildcard) does NOT make entities available to other files in the barrel** — only `using { X } from 'path'` (named import) resolves references across files. CDS deploy succeeds with wildcard imports but `cds-serve` runtime fails at model load. Always use named imports when one schema sub-file references an entity defined in another sub-file.
- **CDS linter strips `using { X } from '../schema'` (parent barrel) as circular** — any import that points back to the barrel file (`db/schema.cds`) will be silently removed. Fix: point the import to the defining file directly (`'./bridge-entity'`), not the barrel.
- **`action resolve()` conflicts with ApplicationService base class** — CDS CAP `ApplicationService` has a built-in `resolve()` method. Naming an OData bound action `resolve` on any entity generates a warning and shadows the base method. Use a domain-specific name like `resolveAlert` instead.
- **`action reject()` conflicts with ApplicationService base class** — same issue as `resolve()`. The base class has a built-in `reject()` method; naming a bound action `reject` generates `WARNING: custom action 'reject()' conflicts with method in base class`. Use a domain-specific name instead (e.g. `rejectPermit`, `rejectApplication`). This applies to any short verb that could be a JavaScript Promise/base-class method name.
- **Stale SQLite WAL/journal files cause `cannot rollback - no transaction is active` on fresh deploys.** When `cds deploy --to sqlite:db.sqlite` fails with this opaque error and the dry-run DDL is clean, the culprit is leftover `-wal`, `-shm`, or `-journal` sidecar files from a previous failed deploy. Fix: `rm -f db.sqlite db.sqlite-wal db.sqlite-shm db.sqlite-journal` before re-running deploy. The error is a secondary failure — SQLite's rollback handler fires on a transaction that was already aborted by the corrupt page cache, and the real error is never surfaced by CAP's logger.
- **`npx cds deploy` tolerates circular imports at deploy-time; `cds-serve` does not** — a deploy that shows no errors does not guarantee the runtime server will start. Always test `npm start` (or `node -e "cds.load(...)"`) after schema changes, not just deploy.

### BSI and composite score virtual fields
- **BSI (Bridge Sufficiency Index) is computed in `after('READ', Bridges)` handler, not stored.** Formula: structural component = `(conditionRating/10) × 55`, width component = `(bsiWidthRating/10) × 15` (bsiWidthRating derived from deckWidth: ≥7.3→9, ≥4.5→5, else 2), barrier and route alt default to 5/10 each × 15. Sum capped at 100. Store as `virtual bsiScore : Decimal(5,2)` annotated `@UI.Hidden`.
- **Virtual fields for composite scores require `@UI.Hidden` annotation plus a `DataPoint` with `CriticalityCalculation`.** The hidden virtual holds the raw number; the DataPoint renders it as a colour-coded chip. Pattern used for `bsiScore` (threshold 50/25) and `conditionRating` (threshold 8/5). Do not expose raw virtual fields directly in `LineItem` or `FieldGroup`.

### New schema entities added in gap-closure (May 2026)
- **`BridgeInspectionElements`** — nested element-level condition ratings on inspections. Fields: `conditionState1Qty/2/3/4Qty` (Decimal), matching `Pct` fields, `elementHealthRating`, `unit`, `elementType`. Linked via `inspection : Association to BridgeInspections` + `bridge : Association to Bridges` for direct bridge lookup.
- **`BridgeCarriageways`** — carriageway-level geometry per bridge. Fields: `roadNumber`, `roadRankCode`, `carriageCode`, `minWidthM/maxWidthM`, `laneCount`, `verticalClearanceM`, `prescribedDirFrom/To`, `distanceFromStartKm`.
- **`BridgeContacts`** — bridge-specific contact persons. Fields: `contactGroup`, `primaryContact`, `organisation`, `position`, `phone`, `mobile`, `address`, `email`.
- **`BridgeMehComponents`** — Mechanical/Electrical/Hydraulic components. Fields: `componentType`, `name`, `make`, `model`, `serialNumber`, `isElectrical/isMechanical/isHydraulic` (Boolean), `inspFrequency`, `locationStored`, `shelfLifeYears`, `attributes` (LargeString for flexible JSON).

### Sub-domain standalone CRUD pattern (May 2026)
- **Removing a sub-domain from Bridge Details = remove its `ReferenceFacet` from `BridgeSubdomains` CollectionFacet in `app/admin-bridges/fiori-service.cds`.** Each entity then lives only in its own standalone List Report + Object Page (FLP tile). Do NOT also remove the entity's own `@UI.LineItem` / `@UI.HeaderInfo` / `@UI.Facets` annotations — those are what power the standalone page.
- **Two ValueHelp patterns for the bridge field on composition children:**
  1. **Entities with `bridgeRef : String(40)`** (BridgeConditionSurveys, BridgeLoadRatings, BridgePermits) — use `ValueListParameterInOut` pointing at `Bridges.bridgeId` (the human-readable bridge reference like `NSW-001`). This is identical to the standalone `Restrictions` gold standard: `bridgeRef @(Common.ValueList: { Parameters: [{ $Type: 'Common.ValueListParameterInOut', ValueListProperty: 'bridgeId', LocalDataProperty: bridgeRef }, ...] }, Common.Text: bridge.bridgeName)`.
  2. **Entities without `bridgeRef`** (BridgeCapacities, BridgeInspections, etc.) — annotate the `bridge` association with `ValueListParameterOut` targeting `bridge_ID` vs `Bridges.ID`, and add `Common.Text: bridge.bridgeName`. Keep `bridge` NOT hidden so FE4 resolves the navigation path.
- **Navigation paths in `LineItem Value` work directly in FE4:** `{ Value: bridge.bridgeId, Label: 'Bridge ID' }` and `{ Value: bridge.bridgeName, Label: 'Bridge' }` are valid path expressions. No wrapper needed. Confirmed from the standalone `Restrictions` tile annotations in `app/restrictions/fiori-service.cds`.
- **Handler pattern for new sub-domain entities** (CON/LRT/PRM at `srv/handlers/conditions.js`, `load-ratings-new.js`, `permits.js`): `before('CREATE')` auto-generates the record ref (CS-NNNN etc.) and resolves `bridge_ID` from `bridgeRef` via `SELECT.one.from('bridge.management.Bridges').where({ bridgeId: req.data.bridgeRef })`. Register all three in `srv/service.js` alongside existing handlers.
- **`NhvrRouteAssessments` had only `@UI.LineItem` + `@UI.HeaderInfo` — no Object Page body.** Added `@UI.Facets` + `@UI.FieldGroup#NhvrDetails` in `fiori-service.cds` when promoting it to standalone. Any entity promoted to standalone that is missing Facets will show a blank Object Page body in FE4.
- **CAP draft composition constraint: "A draft-enabled entity can only be modified via its root entity."** If `Bridges` has `@odata.draft.enabled`, ALL its `Composition of many` children (BridgeInspections, BridgeCapacities, etc.) can only be created/modified through the Bridges draft context. Clicking Create in a standalone FE4 ListReport on a composition child triggers this error. Fix: change `Composition of many` → `Association to many` on the Bridges side for any entity that needs its own standalone CRUD, then add `@odata.draft.enabled` to each entity individually. The FK column (`bridge_ID`) in the DB table is unchanged — only the OData composition semantics change.
- **FLP local sandbox does NOT apply `innerAppRoute` from `resolutionResult`.** In `fiori-apps.html` and `fioriSandboxConfig.json`, the `innerAppRoute` property inside `resolutionResult` is ignored by the local `sap.ushell.Container` sandbox. Use the `&/InnerRoute` hash fragment directly in `targetURL` instead — e.g. `"#Bridges-manage&/BridgeInspections"` (same pattern as NetworkReports). The separate FLP intents (Inspections-manage, Capacity-manage, etc.) and their `innerAppRoute` config are DEAD CODE locally; production FLP may honour them, but for local testing the direct hash format is required.
- **Standalone CRUD for composition-child entities requires explicit `Capabilities` annotations.** FE4 ListReport defaults to read-only for composition children exposed as top-level service projections. Add `Capabilities.InsertRestrictions.Insertable: true`, `Capabilities.UpdateRestrictions.Updatable: true`, `Capabilities.DeleteRestrictions.Deletable: false` to each entity's annotation block in `fiori-service.cds`. Without these, the ListReport header has no Create button and ObjectPage has no Edit button.
- **Entities promoted to standalone also need `UI.SelectionFields`.** Without SelectionFields, the standalone ListReport shows no filter bar. Minimum recommended: `[bridge_ID, <key_status_or_type_field>, <key_date_field>]` so users can filter by bridge.
- **`BridgeDefects` and `BridgeRiskAssessments` were missing `UI.Facets` + `UI.FieldGroup`.** Added when promoting to standalone — these are required for the ObjectPage to render a form body. Any entity with only `UI.LineItem` + `UI.HeaderInfo` shows a blank ObjectPage body when navigated to directly.

### Sub-domain entities added in BMS (May 2026)
- **`BridgeConditionSurveys`** — standalone condition survey (CON tile). Fields: `surveyRef` (auto CS-NNNN), `bridgeRef`, `surveyDate`, `surveyType`, `surveyedBy`, `conditionRating`, `structuralRating`, `overallGrade`, `notes`, `status` (Draft/Submitted/Approved), `active`. Handler: `srv/handlers/conditions.js`. Lifecycle actions: `submitForReview()` (Draft→Submitted) and `approveSurvey()` (Submitted→Approved) — both guard against invalid state transitions.
- **`BridgeLoadRatings`** — per-vehicle-class load rating (LRT tile). Fields: `ratingRef` (auto LR-NNNN), `bridgeRef`, `vehicleClass` (CDS enum type `LoadRatingVehicleClass`), `ratingMethod` (CDS enum type `LoadRatingMethod`), `ratingFactor`, `grossMassLimit`, `assessedBy`, `assessmentDate`, `validTo`, `status` (Active/Superseded/Revoked), `active`. Handler: `srv/handlers/load-ratings-new.js` (separate from `load-ratings.js` which handles `LoadRatingCertificates`). Enum types defined in `db/schema.cds` auto-generate value-help dropdowns in FE4.
- **`BridgePermits`** — permit applications (PRM tile). Fields: `permitRef` (auto PM-NNNN), `bridgeRef`, `permitType`, `applicantName`, `vehicleClass`, `grossMass/height/width/length`, `appliedDate`, `validFrom/To`, `status` (Pending/Approved/Rejected/Expired), `decisionBy`, `decisionDate`, `conditionsOfApproval`, `active`. Handler: `srv/handlers/permits.js` with `approve()` / `rejectPermit()` actions.
- **`BridgeInspections`** — has `inspectionRef : String(40)` auto-generated as `INS-NNNN` by `srv/handlers/inspections.js`. Used as ObjectPage `UI.HeaderInfo.Title`. Add to `UI.SelectionFields` so users can search by ref. Handler registered in `srv/service.js` via `registerInspectionHandlers(this, helpers)`.

### CDS enum types for fixed-value dropdowns (May 2026)
- **`LoadRatingVehicleClass`** and **`LoadRatingMethod`** defined as `type X : String enum { ... }` in `db/schema.cds`. CDS v9 automatically generates `@Common.ValueListWithFixedValues` and value help annotations for enum types in Fiori Elements. Used on `BridgeLoadRatings.vehicleClass` and `ratingMethod` fields respectively.
- **CDS enum type vs `@assert.range` for strings**: `@assert.range` on a String field only adds a DB check constraint and server-side validation — it does NOT generate a UI dropdown. Use `type X : String enum { ... }` to get both validation and UI value help. The DB column DDL is unchanged (still VARCHAR) — only the allowed values constraint is added.
- **Naming enum values with spaces**: CDS enum symbolic names must be valid identifiers (no spaces). Use a camelCase or abbreviated identifier and set the value to the display string: `AS5100 = 'AS 5100'`. The value (right side) is what's stored in the DB and shown in the UI.

### BridgeConditionSurveys workflow (May 2026)
- **Status lifecycle**: Draft → Submitted (via `submitForReview()`) → Approved (via `approveSurvey()`). Each action guards against invalid transitions: `submitForReview` errors if status != 'Draft'; `approveSurvey` errors if status != 'Submitted'.
- **Action buttons use `![@UI.Hidden]` with status-based logic**: `{ ![@UI.Hidden]: { $edmJson: { $Ne: [{ $Path: 'status' }, 'Draft'] } } }` shows the Submit button only when status IS 'Draft'. Remember: `![@UI.Hidden]` sets the `Hidden` property — when the expression is `true` (status != Draft), it IS hidden; when the expression is `false` (status == Draft), it is SHOWN. Add `@Common.SideEffects: { TargetProperties: ['status'] }` to each action annotation so FE4 refreshes the status chip after the action fires.

### Sub-domain tile naming conventions (May 2026)
- Tile titles in `app/appconfig/fioriSandboxConfig.json` and `app/fiori-apps.html` must be updated in BOTH locations when renamed — tiles group (lines ~90-100) AND FLP intents (lines ~295-303 in sandbox config, ~91-99 in fiori-apps.html).
- Canonical tile titles: "Bridge Capacity" (not "Capacity"), "Risk Assessments" (not "Risk & Compliance"), "Load Rating Certificates" (not "Load Rating Certs"), NHVR subtitle = "Heavy Vehicle Route Approvals", Defects subtitle = "View-Only — Create via Inspections".

### Bridge Details UX — Expert Council pattern (May 2026)
- **Shell bar title per sub-domain tile**: Each routing target in `manifest.json` must have a `"title"` property for FE4 to update the shell bar dynamically when navigating to that route. Without it, FE4 shows the app-level title ("Bridge Asset Registry") on every sub-domain ListReport.
- **Expert council UX review**: When the Bridge Details ObjectPage needs redesign, convene a multi-persona council (UX_DESIGNER, BRIDGE_INSPECTOR, BRIDGE_MANAGER, END_USER, DATA_STEWARD) and implement HIGH/MEDIUM priority items as a single atomic rewrite of `Facets` + all `FieldGroup` blocks. Never patch FieldGroups one-by-one — stale orphaned FieldGroups silently disappear rather than erroring.
- **"Last Inspection Results" fields must be `@Common.FieldControl: #ReadOnly`.** Fields set by the "Inspect Now" / CaptureCondition workflow (`conditionRating`, `condition`, `conditionTrend`, `conditionSummary`, `structuralAdequacy`, `structuralAdequacyRating`, `conditionAssessor`, `lastInspectionDate`, `conditionReportRef`, `conditionNotes`) must be annotated read-only in `fiori-service.cds`. Without this, Bridge Managers can bypass the inspection record lifecycle by directly patching Bridge entity fields via the ObjectPage form. These start null on new bridge create — users set them via "Inspect Now".
- **`@UI.IsURL` for URL fields in FE4**: Add `@UI.IsURL` to any String field containing a URL (e.g. `nhvrReferenceUrl`, `sourceReferenceUrl`) to render it as a clickable hyperlink in the ObjectPage form rather than plain text.
- **`sap.ui.define` wrapping required for all extension controllers**: A bare self-executing IIFE in `ext/controller/*.js` is never loaded by FE4. Always wrap in `sap.ui.define([], function() { 'use strict'; /* ... */ return {}; })` and reference via `core:require="{MyAlias: 'AppNamespace/appid/ext/controller/MyFile'}"` in the fragment XML.
- **`Documents & Map` tab removed (May 2026)**: Documents (attachments) and Map sub-tabs were consolidated into the Bridge Details body via custom fragment sections in `manifest.json` `sectionedLayout`. The `DocumentsMap` section anchor in manifest is now replaced with dedicated `attachmentsSection` (anchor: `Administration`) and `mapSection` (anchor: `PhysicalStructure`).
- **Physical Structure tab**: Always include in `Facets` to avoid inspector confusion. Fields: `designLoad` (FIRST — inspector priority), `designStandard`, `structureType`, `material`, `yearBuilt` in Structure group; `clearanceHeight` (FIRST — safety), `numberOfLanes`, `deckWidth`, `spanCount`, `spanLength`, `totalLength` in Dimensions group; `spansOver`, `waterwayType`, `facilityTypeCode`, `surfaceType`, `substructureType`, `foundationType` in Environmental Context group.

### BridgeDefects standalone architecture (May 2026)
- **BridgeDefects is now standalone — inspection link is optional.** Removed `Composition of many BridgeDefects` from `BridgeInspections`; changed `inspection : Association to BridgeInspections @mandatory` → `inspection : Association to BridgeInspections` (optional). Also removed the server-side 422 guard in `srv/handlers/defects.js` that blocked standalone creation. Users can now create defects without an inspection, and optionally link to one via a value-help picker.
- **Defects value-help for linked inspection**: Annotate `inspection` with `Common.Text: inspection.inspectionRef`, `Common.TextArrangement: #TextOnly`, and a `Common.ValueList` pointing to `BridgeInspections` with parameters for `ID`, `inspectionRef`, `inspectionDate`, `inspectionType`. This gives a clean search dialog without exposing the UUID.

### Expert council persona priority order for BMS sub-domain tiles
When running expert council UX review on a tile, apply these priorities in order:
1. **BRIDGE_INSPECTOR**: Condition state / risk / measured values go FIRST in FieldGroups and LineItem — inspector sees the asset status at a glance (e.g. `currentConditionRating`, `scourRisk`, `severity`).
2. **BRIDGE_MANAGER**: Action-triggering fields (next review due, treatment deadline, urgency level, estimated repair cost) must appear in LineItem so managers can triage from the list report.
3. **END_USER**: Mandatory fields (`@Common.FieldControl: #Mandatory`) labelled clearly; value-help pickers for all FK associations; QuickInfo on any field with a technical range or standard reference.
4. **DATA_STEWARD**: Auto-generated ref fields (`@Core.Computed @Common.FieldControl: #ReadOnly`) so users cannot accidentally set them; audit fields (`createdBy`, `createdAt`, `modifiedBy`, `modifiedAt`) always `@UI.Hidden`; mandatory validation on key identity fields.
5. **UX_DESIGNER**: One FieldGroup per semantic concern (Identity, Condition, Maintenance, Integration) — never dump all fields in a single flat group.

### BridgeScourAssessments — bridge field was hidden (bug)
`bridge @UI.Hidden` was set on BridgeScourAssessments, making the bridge link invisible on the ObjectPage. Fix: remove `@UI.Hidden`; add the standard `Common.Text/TextArrangement/ValueList` bridge picker annotation (same pattern as BridgeInspections/BridgeCapacities).

### AlertsAndNotifications — system-generated, always Insertable: false
Alerts are auto-generated by the system (expiry triggers, inspection overdue, etc.). Set `Capabilities.InsertRestrictions.Insertable: false`. Users can only acknowledge (write `acknowledgementNote`) and resolve (write `resolutionNote` + `resolutionProof`). All alert metadata fields should be `@Common.FieldControl: #ReadOnly`. `resolutionProof` is a URL — annotate with `@UI.IsURL`.

### BridgeInspectionElements — condition states CS1–CS4 terminology
Use SIMS-aligned labels: CS1 = "Good/New", CS2 = "Satisfactory", CS3 = "Poor", CS4 = "Failed". Present Qty and % as pairs in the FieldGroup (CS1 Qty then CS1 %, then CS2 Qty then CS2 %, etc.) — this matches the inspector's natural data entry flow from their field report. `elementHealthRating` is computed — add QuickInfo explaining it is auto-calculated from qty weights.

### BridgeElements — entity required full CRUD treatment from scratch
Was originally annotated with only `@UI.LineItem` and `@UI.HeaderInfo`. Missing: `Capabilities`, `SelectionFields`, `field-level annotations`, `bridge value-help`, `Facets`, `FieldGroups`. Pattern for similar gaps: add bridge VH first, then Capabilities, then SelectionFields, then HeaderInfo, then full Facets with 4 sub-groups.

### FieldGroup naming collisions — use entity-prefix for all FieldGroup IDs
`FieldGroup#General` defined on two different entities in the same CDS service file will compile but only the last one survives at runtime. Always prefix FieldGroup IDs with the entity short-name: `ElemIdentity`, `ElemCondition`, `CarrGeometry`, `MehIdentity`, `InspElemCondition`, `ContactDetails`, etc. Never use bare `General`, `Details`, or `Summary` without a prefix.

### Multi-agent parallel execution pattern
- **Split file ownership strictly — zero overlap is the only safe contract.** When dispatching 4 parallel worktree agents: Agent 1 owns `db/schema.cds` only, Agent 2 owns `srv/*.cds` (service definitions), Agent 3 owns `srv/*.js` (handlers + mass-upload), Agent 4 owns `app/**` (annotations + manifest). Any overlap on a shared file will produce last-writer-wins content loss with no merge conflict warning (worktrees share the same working directory).
- **After parallel agents complete, always run `npx cds compile db/ srv/` before committing.** Agents working on partial models (schema changes not yet reflected in service definitions) may each exit 0 locally, but the combined compile can still fail. The compile check is the merge gate.
- **Agent prompts must name exact files and exact CDS/JS patterns.** Vague prompts like "add the BSI fields" result in agents creating duplicate entities or using wrong field types. Always include the CDS snippet verbatim in the prompt, the exact file path, and whether the agent should read the file first to understand existing structure.

### Feature flag system — BHI/BSI plug-and-play (May 2026)
- **Feature flags live in `SystemConfig` with `category = 'Feature Flags'`** — keys follow `feature.<flagKey>` pattern (e.g. `feature.bhiBsiAssessment`). All seed rows: `value=false, defaultValue=false, dataType=boolean, isReadOnly=false`. DO NOT add a separate entity for feature flags.
- **`srv/feature-flags.js`** — single source of truth for `KNOWN_FLAGS`, `DEPENDENCIES` (child→parent map), `isFeatureEnabled(flagKey)`, and `requireFeature(flagKey, req)`. Import this in any handler that guards behind a flag. Never inline `getConfigBool('feature.*')` calls in handler files.
- **`requireFeature(flagKey, req)` pattern** — call at the top of a handler action and `return` its result: `const guard = await requireFeature('bhiBsiAssessment', req); if (guard) return guard;`. CAP will short-circuit with the 403 automatically.
- **`GET /system/api/features`** — public within authenticated session (no scope restriction). Returns `{flags: [{flagKey, enabled, label, description}]}`. Sourced from SystemConfig by category. Feature flag GET must never require `config_manager` — the `admin-bridges` app polls it on init with no admin scope.
- **`PATCH /system/api/features/:key`** — requires `config_manager` OR `admin` scope + CSRF token. Validates flagKey against KNOWN_FLAGS. Enforces dependency: child cannot be enabled when parent is disabled; disabling parent cascades-disables all children. Logs each change to `bridge.management.ChangeLog` via `writeChangeLogs()`. Returns `{flagKey, previousValue, newValue, cascadeDisabled, changedBy, changedAt}`.
- **`initFeatureFlags(oComponent)` in Component.js** — sets a named `featureFlags` JSONModel with all flags initialised to `false` (safe default), then fetches `/system/api/features` and updates the model. App starts up with no BHI/BSI tabs until the server responds. On fetch failure, all stay false — app continues normally.
- **UI binding for feature-flagged tabs/sections**: `visible="{featureFlags>/bhiBsiAssessment}"` — zero DOM manipulation, declarative. The `featureFlags` model is set on the component; all views within the app inherit it via model propagation.
- **FeatureFlags Admin screen** — `app/bms-admin/webapp/view/FeatureFlags.view.xml` + `controller/FeatureFlags.controller.js`. Table bound to local `flags` JSONModel (not OData). `onToggleFlag` shows a MessageBox.confirm; `_setFlag` PATCHes with CSRF token; on success syncs the component-level `featureFlags` model so tabs update immediately in the same session without page reload.
- **`config_manager` scope** in `xs-security.json` — separate from `admin`; used only for feature flag PATCH. Role template `BMS_CONFIG_MANAGER` includes `config_manager + view`. `BMS_ADMIN` does NOT need `config_manager` explicitly — the PATCH route accepts `config_manager OR admin` via `requireScope('config_manager', 'admin')`.
- **`user-info` endpoint for scope checking in controller**: `_checkScopes()` calls `GET /system/api/user-info` and checks `scopes` array for `config_manager` or `admin` to control the `userScopes>/canManage` binding. The `ObjectStatus` in the table header reflects this — it does NOT disable the buttons (buttons use `visible=` not `enabled=` to avoid misleading greyed-out state).
- **Cascade-disable is server-side only** — the client sends one PATCH for the master flag; the server returns the full `cascadeDisabled` list in the response. The client then bulk-updates the component model: `data.cascadeDisabled.forEach(k => oFfModel.setProperty('/' + k, false))`. Never implement cascade logic in the UI controller.
- **Adding a new flag — 4-step checklist**: (1) CSV row in `bridge.management-SystemConfig.csv`; (2) add to `KNOWN_FLAGS` in `srv/feature-flags.js`; (3) add to `initFeatureFlags()` default object in `Component.js`; (4) bind `visible="{featureFlags>/yourFlagKey}"` in the view. No other files needed unless it has a parent dependency — then also add to `DEPENDENCIES` map.

### Expert council attribute audit — cross-tile rules (May 2026)
- **Defect severity scale is 1=Low, 4=Critical** in BMS — handler condition triggering auto-open must be `severity >= 3` (High/Critical), NOT `severity === 1`. The original wrong condition auto-opened for the LOWEST severity defect. This must be verified whenever severity logic is added to any handler.
- **TfNSW 5×5 risk matrix thresholds**: Low ≤4, Medium 5–9, High 10–14, Extreme ≥15. The `scoreToLevel()` function in `srv/handlers/risk-assessments.js` uses these. Do not change to the old thresholds (Critical/High ≥20/12/6) — those severely understated network risk.
- **`residualRiskScore` must NOT auto-default to `inherentRiskScore`** — residual score is an explicit engineering input after controls are assessed. Auto-defaulting produced misleading risk registers where every risk appeared already-mitigated.
- **Soft-delete is now required on BridgeInspections, BridgeDefects, BridgeRiskAssessments** (added May 2026). All three now have `active: Boolean default true` + `deactivate/reactivate` bound actions + `@Capabilities.DeleteRestrictions.Deletable: false`. These records are legally admissible evidence under Civil Liability Act 2002 — they must never be permanently deleted.
- **Audit trail gap in older handlers** — `registerDefectHandlers` and `registerRiskAssessmentHandlers` previously received no `{ logAudit }` helper from `srv/service.js`. Fixed by updating the call sites in `service.js` to pass `helpers`. Any new handler that needs audit logging must receive `helpers` as second parameter and the call site in `service.js` must be updated simultaneously.
- **Service CDS bare projections block bound actions** — adding bound actions to an entity that is already projected in a service CDS file (e.g. `srv/services/defects.cds`) must be done by updating that file in-place. You cannot re-declare the same projection in another service extend block (e.g. `admin.cds`) — CDS will throw a duplicate entity error.
- **`linkedInspection` / `linkedDefect` are now typed Associations** on `BridgeRiskAssessments` (was String FKs). Annotation references must use navigation paths: `linkedInspection.inspectionRef` (not `linkedInspectionId`). After changing String→Association, always grep fiori-service.cds for old field names.
- **Two parallel restriction registers exist** — `bridge.management.Restrictions` (standalone tile, authoritative) and `bridge.management.BridgeRestrictions` (composition child of Bridge). These are separate DB tables. Pick one canonical source; do not add new fields to BridgeRestrictions as it will eventually be deprecated in favour of Restrictions.
- **`Capabilities.DeleteRestrictions.Deletable: false` + `@restrict` must both be set** when exposing a "soft-delete only" entity in a service file. The Capabilities annotation is what FE4 reads to hide the Delete button; the `@restrict` annotation controls OData-level access. Both are required — omitting @restrict lets any authenticated user write.

### Bridge Details tab redesign patterns (May 2026)
- **Condition & Inspection tab = read-only snapshot only.** When sub-domain tiles (Inspections, Condition Surveys) exist as standalone registers, the Bridge Details tab must NOT duplicate editable CRUD — it shows the latest snapshot only. Rename it "Inspection Status", remove scour fields that are authoritative in BridgeScourAssessments, apply `@Common.FieldControl: #ReadOnly` to all last-inspection fields.
- **Field placement rule:** `seismicZone` + `structuralDeficiencyCode` → Physical Structure tab (structural characteristics). `operationalStatusCode` → Executive Summary tab (operational state). Never put these in Administration (Source & Reference).
- **External Systems tab pattern:** One CollectionFacet `ExternalSystems` with two ReferenceFacets: `ExtNHVR` (nhvrReferenceUrl, nhvrAssessed, nhvrAssessmentDate) and `ExtBNAC` (bnacMapping.bnacObjectId + `UI.DataFieldWithUrl` for deep link). Remove duplicated `nhvrReferenceUrl` from other FieldGroups.
- **`UI.DataFieldWithUrl` for deep links:** `{ $Type: 'UI.DataFieldWithUrl', Label: 'BNAC Deep Link', Value: bnacMapping.bnacObjectId, Url: bnacMapping.bnacUrl }` — `Value` is the visible label text; `Url` is the navigation target expression.

### BnacObjectIdMap navigation from Bridges (May 2026)
- **`BnacObjectIdMap` is in `bridge.management` namespace, not `nhvr`** — `using bridge from '../../db/schema'` is required as a separate import in `srv/services/admin.cds` alongside the existing `using nhvr` import. Referencing it as `nhvr.BnacObjectIdMap` causes CDS compile error "Artifact not found".
- **`extend projection` pattern for adding navigation to existing projections.** In `srv/services/bridges.cds`, `extend projection BridgeManagementService.Bridges { bnacMapping: Association to BridgeManagementService.BnacObjectIdMaps on bnacMapping.bridgeId = $self.bridgeId }` adds the navigation without touching the base projection definition. Works for read-only cross-table navigation; does not create a DB join — resolved lazily by OData expand.

### Auto-generated ref fields — consistency rule (May 2026)
- **All auto-generated ID/ref fields must be `@Core.Computed @Common.FieldControl: #ReadOnly`.** Fields: `defectId` (DEF-NNNN), `assessmentId` (RSK-NNNN), `surveyRef` (CS-NNNN), `ratingRef` (LR-NNNN), `permitRef` (PM-NNNN), `inspectionRef` (INS-NNNN). Without `@Core.Computed`, FE4 renders them as editable text inputs. Without `@Common.FieldControl: #ReadOnly`, users can overwrite them.
- **Remove `@mandatory` when a field is auto-generated** — `@mandatory` fires before `before('CREATE')` in CAP's validation pipeline, blocking creation when the field is empty (which it will be at initial draft click). Fix: remove `@mandatory` from the schema entity; the field is always populated by the handler before the record is saved.
- **`assessmentId` auto-generation pattern:** `RSK-${String(seq).padStart(4,'0')}` generated in `srv/handlers/risk-assessments.js` `before(['CREATE','UPDATE'])`, guarded to `if (req.event === 'CREATE' && !d.assessmentId)`. Matches DEF-NNNN / INS-NNNN convention.

### FE4 draft CRUD root cause pattern (May 2026)
- **FE4 `before('CREATE')` fires with empty body** when user clicks "Create" in a ListReport — NOT when they save. If a handler calls `req.error()` on a missing field at this point, it blocks every create attempt. Never block on empty required fields in `before('CREATE')` — auto-generate or default them instead.
- **bridge_ID from bridgeRef must be resolved on BOTH CREATE and UPDATE.** User fills `bridgeRef` via FE4 draft PATCH (UPDATE), not during the initial empty CREATE. If the handler only runs `bridge_ID` resolution on `before('CREATE')`, the resolved UUID is never written → record saves with null `bridge_ID` → invisible in bridge-filtered list reports. Fix: `before(['CREATE', 'UPDATE'])` with resolution logic running on both; ref auto-gen guarded to `if (req.event === 'CREATE')`.

### AdminService vs BridgeManagementService handler isolation (May 2026)
- **AdminService (`srv/admin-service.js`) and BridgeManagementService (`srv/service.js`) are entirely separate CAP service instances.** Handlers registered on one service do NOT fire for the other, even when they project the same underlying DB entities (`bridge.management.*`). Any entity exposed through AdminService that needs lifecycle logic (deactivate/reactivate, auto-ref, virtual fields) must have that logic implemented directly in `admin-service.js`.
- **Bound actions declared in `srv/services/*.cds` only fire on BridgeManagementService.** Adding `action deactivate()` to a service definition file (e.g. `srv/services/inspections.cds`) does NOT make that action available on AdminService's projection of the same entity. You must also declare the action in `srv/admin-service.cds` AND implement the handler in `srv/admin-service.js`.
- **Pattern for adding deactivate/reactivate to an AdminService entity**: (1) add `actions { action deactivate() returns X; action reactivate() returns X; }` to the entity projection in `srv/admin-service.cds`; (2) add `this.on('deactivate', Entity, ...)` and `this.on('reactivate', Entity, ...)` handlers in `srv/admin-service.js`; (3) add `this.before('NEW', Entity.drafts, ...)` for auto-ref generation if needed.
- **Virtual fields after READ must also be computed in admin-service.js.** `reviewCriticality` on Restrictions was only computed in `handlers/restrictions.js` (BridgeManagementService). AdminService callers saw `null`. Fix: duplicate the `after('READ', Restrictions, ...)` computation in `admin-service.js`. The virtual field must also be declared in `db/schema.cds` for CDS to serialise it in OData responses.

### Composition vs Association for standalone CRUD (May 2026)
- **`Composition of many` under a draft-enabled root entity blocks standalone CRUD.** CAP enforces "a draft-enabled entity can only be modified via its root entity" — any `Composition of many` child of a draft-enabled parent requires all writes to go through the parent's draft context. Standalone ListReport Create buttons return HTTP 400/403 with this message.
- **Fix: change `Composition of many` → `Association to many` for entities that need standalone CRUD.** The DB FK column (`bridge_ID`) is unchanged — only the OData composition semantics change. The entity loses draft capability (it becomes a plain CRUD entity, no draftActivate flow). Applied to: `BridgeScourAssessmentDetail` and `BridgeElements`.
- **Entities changed to Association become non-draft.** Their CRUD uses plain `POST /Entity` (no draftActivate step). Do not add `@odata.draft.enabled` to them individually — that reintroduces the composition constraint via a different path. If draft is required, keep them as Composition children and only create/edit them through the parent Bridge object page.

### Auto-ref sequence generation — NaN protection (May 2026)
- **Use regex match, not string replace, for auto-ref sequence extraction.** `last.defectId.replace('DEF-', '')` returns `""` when defectId is `""` or contains unexpected content, and `parseInt("", 10) = NaN` → sequence becomes `NaN` → generates `DEF-0NaN`. Fix: `const m = last?.defectId?.match(/^DEF-(\d+)$/); const seq = m ? parseInt(m[1], 10) + 1 : 1`. Same pattern for RSK-NNNN, CS-NNNN, LR-NNNN, PM-NNNN — always use named regex capture groups to extract the numeric part.
- **`before('NEW', Entity.drafts, ...)` is the correct hook for auto-ref on draft entities.** `before('CREATE')` fires after draft activation, not on initial draft creation. Using `before('NEW', Entity.drafts)` fires when FE4 creates the empty draft (the first POST), ensuring the ref is generated before any PATCH updates the record.

### AttributeValues EAV format (May 2026)
- **`AttributeValues` is a simple EAV table** — fields: `objectType: "Bridge"`, `objectId: "1"` (string, bridge integer PK), `attributeKey: "SEISMIC_ZONE"` (matches AttributeDefinitions.internalKey), `valueText: "Zone A"`. NOT a bridge_ID (UUID) + definition_ID (UUID) FK structure. Do not attempt to use UUID FK joins — use string key lookups.
- **`AttributeAllowedValues` FK is `attribute_ID`** (the CAP-generated FK for the `attribute: Association to AttributeDefinitions` field), NOT `definition_ID`. Passing `definition_ID` causes HTTP 400 "Property not found".
- **`AttributeGroups` has a NOT NULL `internalKey` field** — always provide it on CREATE. Omitting it causes HTTP 500 from the SQLite NOT NULL constraint. Pattern: use an uppercase snake-case key like `"SEISMIC_DATA"`.
- **`AttributeValues` was incorrectly marked `@readonly` in admin-service.cds** — removed. Any entity in AdminService that needs write access must NOT have the `@readonly` annotation, even if the underlying CAP entity has no write restrictions.

### Correct field names — critical reference (May 2026)
- **BridgeCapacities**: `capacityType` (not `vehicleType`), `engineeringNotes` (not `notes`), `effectiveFrom` is `@assert.mandatory` (draftActivate fails without it)
- **BridgeElements**: `elementQuantity` (not `quantity`), `yearConstructed` (not `yearInstalled`), `currentConditionRating: Integer [1,5]` (not `currentConditionState`)
- **Restrictions**: `appliesToVehicleClass` (not `vehicleType`), `grossMassLimit` (not `massLimit`), `approvedBy` (not `authorisedBy`), use `restrictionValue + restrictionUnit` string fields
- **BridgeRiskAssessments**: `existingControls` (not `controlMeasures`), `treatmentActions` (not `treatmentPlan`), `reviewDueDate` (not `nextReviewDate`)
- **NhvrRouteAssessments**: `assessmentStatus` field (not `status`), deactivate sets it to `'Superseded'`
- **LoadRatingCertificates**: deactivate sets `status = 'Superseded'`
- **BridgeLoadRatings**: no `notes` field; use `governingMember` for update tests

---

## Reusable Components — Cross-Project Standard

Any learning from any BMS project, client deployment, or external codebase that improves a reusable component MUST be back-ported to this codebase and documented here. This ensures the BMS reusable components evolve with every project and new deployments start from the best known state.

### The 6 Core Reusable Components

| Component | Files | Reuse Status |
|-----------|-------|-------------|
| **Audit Log** | `srv/audit-log.js` + `db/schema.cds:ChangeLog` + `app/bms-admin/webapp/controller/ChangeDocuments*` | ✅ Ready — extract `audit-log.js` + ChangeLog entity to npm package |
| **Mass Upload** | `srv/mass-upload.js` + `app/mass-upload/webapp/` | ✅ Ready — parametrize DATASETS array for any entity set |
| **Mass Update** | `app/mass-edit/webapp/` + `srv/server.js:saveMassEdit*` | ✅ Ready — ENTITY_CONFIG pattern enables any field set |
| **Maps** | `app/map-view/webapp/` + `srv/server.js:/map/api/*` | 🔶 Partially reusable — needs data model abstraction |
| **Custom Attributes** | `srv/attributes-api.js` + `db/attributes-schema.cds` + `app/attributes-admin/webapp/` | ✅ Ready — fully EAV-based, just change namespace |
| **Change Documents** | `app/bms-admin/webapp/controller/ChangeDocuments*` | ✅ Ready — depends only on ChangeLog entity |

### Reusability Rules

- **Never hardcode entity names** in reusable components. Use a config object or parameter.
- **Audit log must be called from all CREATE/UPDATE handlers** — this is non-negotiable for compliance.
- **Custom attributes use objectType string** to scope to any entity — do not add new DB columns for extensibility; extend via attribute definitions instead.
- **Map backend must receive data as `{ id, lat, lng, ...metadata }`** — abstract bridge-specific fields behind the metadata property when adapting to new asset types.
- **Mass upload DATASETS array is the only extension point** — adding a new entity to upload requires only a new DATASETS entry + importer function. Never touch the core pipeline.

### Cross-Project Learnings Log

When you discover a pattern in another project that improves one of these components, add it here:

```
[YYYY-MM-DD] [Component] Learning: <what you learned>
Source: <project name or issue>
Applied: <what was changed in this codebase>
```

**Example entries (add real ones as discovered):**
```
[2026-05-11] [Audit Log] Learning: ChangeLog queries without indexes caused 45-second query times on a 500k-row table in production.
Source: BMS UAT deployment
Applied: Added 6 indexes to ChangeLog entity in db/schema.cds

[2026-05-11] [Mass Edit] Learning: Users were saving changes without reviewing them, causing data quality issues. Diff preview before save reduced incorrect saves by ~80% in user testing.
Source: BMS UAT user feedback
Applied: Added MessageBox diff preview to MassEdit.controller.js onSave()

[2026-05-11] [Custom Attributes] Learning: Frontend not enforcing required attributes meant 30% of bridges had missing mandatory safety fields.
Source: BMS data quality audit
Applied: Added required validation + asterisk indicators to CustomAttributesInit.js

[2026-05-11] [Mass Upload] Learning: Row-by-row bridge ID resolution (N SELECT + N INSERT calls per row) was 200x slower than batch pattern at 500 rows.
Source: BMS performance audit
Applied: Rewrote importRows for BridgeInspectionElements, BridgeCarriageways, BridgeContacts, BridgeMehComponents to 2 calls: single SELECT WHERE IN + single bulk INSERT.entries([])

[2026-05-11] [Map / GIS] Learning: Leaflet map shows grey tiles when created inside an inactive FE4 tab (core:HTML fragment) because the container has zero dimensions until the tab is revealed.
Source: BMS Bridge Details map tab
Applied: Added setTimeout(() => _map.invalidateSize(), 300) immediately after map.setView() in gisMapInit.js

[2026-05-11] [Admin Service] Learning: after('READ', Bridges) always fired a GROUP BY COUNT even on list pages that don't render activeRestrictionCount, adding ~40ms per page load.
Source: BMS performance audit
Applied: Guarded with req.query.$select check — COUNT only runs when the field is actually requested

[2026-05-11] [Map / GIS] Learning: ResizeObserver is far more reliable than setTimeout(invalidateSize) for Leaflet grey-tile fix. FE4 lazy-renders custom body sections — container dimensions become non-zero at unpredictable times.
Source: BMS Bridge Details map section (continued grey-tile issue after 300ms fix)
Applied: Replaced setTimeout with ResizeObserver in gisMapInit.js; observer fires exactly when container transitions from 0px to real dimensions

[2026-05-11] [Security] Learning: BridgePermits.approve and BridgeConditionSurveys.approveSurvey require @restrict grant to certify/admin scope. Under HVNL, permit approvals are legal instruments; under AS 5100-7, condition survey approvals require qualified engineer.
Source: Expert council audit — C05, C06
Applied: @restrict on BridgePermits and BridgeConditionSurveys in srv/admin-service.cds

[2026-05-11] [Risk Assessments] Learning: inherentRiskScore must ALWAYS be auto-computed as likelihood × consequence. Users cannot manually set it. residualRiskScore must NEVER auto-default to inherentRiskScore — it is a separate engineering input.
Source: Expert council audit — C10
Applied: srv/handlers/risk-assessments.js before(['CREATE','UPDATE']) always overwrites inherentRiskScore; residualRiskScore untouched

[2026-05-11] [Fiori Annotations] Learning: importanceLevel belongs on Executive Summary (portfolio management KPI), NOT Traffic & NHVR (it is not a traffic metric). nhvrAssessed/nhvrAssessmentDate must not appear in both NHVRApprovals tab AND External Systems tab — keep in NHVRApprovals only.
Source: Expert council audit — H04, M01
Applied: Moved importanceLevel to FieldGroup#ExecutiveOverview; removed from TrafficData and ExtNHVR

[2026-05-11] [Coordinates] Learning: Lat/lon @assert.range should be Australian bounding box (-44/-10, 112/154) not the global ±90/±180 range. Add @Common.QuickInfo referencing GDA2020 CRS. All bridge coordinates in Australia must be GDA2020.
Source: Expert council audit — H05
Applied: Updated lat/lon field annotations in fiori-service.cds

[2026-05-11] [Schema / CDS] Learning: CDS enum types for fixed-value domain fields (InspectionStandard, RatingLevel, LoadRatingVehicleClass, LoadRatingMethod) must live in a dedicated db/schema/enum-types.cds file to prevent circular imports across other schema sub-files. Using `using { X } from './enum-types'` in consuming schema sub-files rather than importing from the barrel db/schema.cds prevents CDS linter circular reference stripping.
Source: Expert council gap-closure — C01, C03 (inspectionStandard, ratingLevel)
Applied: db/schema/enum-types.cds created; enum types applied to BridgeInspections.inspectionStandard and LoadRatingCertificates.ratingLevel

[2026-05-11] [Handlers / Inspections] Learning: TfNSW-BIM §3.1 mandates that Principal and Detailed inspection types require inspector accreditation Level 3 or Level 4. This must be enforced server-side in before(['CREATE','UPDATE'], 'BridgeInspections') — UI-only guards can be bypassed.
Source: Expert council audit — C02 (accreditation guard)
Applied: Added accreditation level check in srv/handlers/inspections.js

[2026-05-11] [AdminService / KPI] Learning: refreshKPISnapshots() action must be declared in srv/admin-service.cds AND implemented in srv/admin-service.js (not in a handler file under srv/handlers/). AdminService handlers registered in srv/service.js do NOT fire for AdminService — they are separate CAP service instances.
Source: Expert council audit — H09 (KPI snapshots)
Applied: refreshKPISnapshots upserts per-state daily snapshots into bridge.management.KPISnapshots

[2026-05-11] [AdminService / Sync] Learning: Approval actions on sub-domain entities (approveSurvey, NhvrRouteAssessments status=Current) must sync denormalised fields back to the parent Bridges entity (conditionRating, nhvrAssessed, nhvrAssessmentDate). This sync must be in srv/admin-service.js after() handlers, not in srv/service.js handlers — both services project the same DB entities but handlers only fire for their own service.
Source: Expert council audit — Section 6.2 sync triggers
Applied: admin-service.js: after approveSurvey → Bridges.conditionRating; after CREATE/UPDATE NhvrRouteAssessments → Bridges.nhvrAssessed + nhvrAssessmentDate

[2026-05-11] [Schema / NHVR] Learning: NhvrApprovedVehicleClasses must be a Composition child of NhvrRouteAssessments (not standalone) with a persistence index on routeAssessment_ID for join performance. The approvedClasses/@UI.LineItem ReferenceFacet in the NHVR Object Page requires the composition to be defined in db/schema/nhvr-compliance.cds and surfaced in srv/admin-service.cds.
Source: Expert council audit — C09 (NHVR approved classes sub-table)
Applied: db/schema/nhvr-compliance.cds, srv/admin-service.cds, app/admin-bridges/fiori-service.cds

[2026-05-11] [Handlers / Load Ratings] Learning: When BridgeLoadRatings.validTo is within 90 days, a system alert should be auto-created in AlertsAndNotifications. Deduplicate by checking for an existing Open alert with the same entityType/entityId before inserting — duplicate alerts cause noise in the Alerts tile.
Source: Expert council audit — H13 (expiry alert for load ratings)
Applied: srv/handlers/load-ratings-new.js after(['CREATE','UPDATE']) handler

[2026-05-11] [FE4 / Navigation] Learning: To show a sub-table on a draft-enabled entity's ObjectPage (e.g. Defects on Inspections), add `Association to many` (NOT `Composition of many`) in the schema pointing back from the parent to the child using the existing FK. Composition would lock the child under the parent's draft context. Association gives FE4 a navigation path for the ReferenceFacet `Target: 'defects/@UI.LineItem'` without draft constraint side-effects.
Source: H11 implementation — BridgeInspections ObjectPage defects + inspectionElements sub-tables
Applied: db/schema/defects.cds — added defects + inspectionElements Association to many on BridgeInspections

[2026-05-11] [Handlers / Auto-ref] Learning: Never use `.replace('PREFIX-', '')` to extract the sequence number from auto-generated refs. If the ref is empty string, blank, or malformed, parseInt returns NaN → next ref becomes 'PREFIX-0NaN'. Always use regex: `const m = last?.ref?.match(/^PREFIX-(\d+)$/); const seq = m ? parseInt(m[1], 10) + 1 : 1`. This applies to ALL auto-ref patterns (CS-NNNN, LR-NNNN, PM-NNNN, DEF-NNNN, RSK-NNNN, INS-NNNN).
Source: Agent 4 handler audit — found in conditions.js, load-ratings-new.js, permits.js
Applied: All three files updated to use regex match pattern

[2026-05-11] [AdminService / BridgeInspectionElements] Learning: BridgeInspectionElements created via AdminService (not mass-upload) need a `before(['CREATE','UPDATE'])` handler in srv/admin-service.js that resolves `bridge_ID` from the linked `inspection_ID` — since users pick the inspection via value-help but don't see the bridge_ID UUID field. Without this, bridge_ID is null and the record is invisible in bridge-filtered list reports.
Source: Agent 4 gap audit
Applied: admin-service.js before(['CREATE','UPDATE'], 'BridgeInspectionElements') handler added
```

[2026-05-11] [Security / CSP] Learning: Helmet contentSecurityPolicy `img-src` and `connect-src` must include `https://*.tile.openstreetmap.org`, `https://unpkg.com`, and `https://cdnjs.cloudflare.com` for Leaflet basemap tiles to load. Without these, the browser silently blocks tile requests and shows a grey map with no error visible in the app. This applies to BOTH the standalone map-view app AND the Bridge Details embedded Leaflet map.
Source: User report — map tiles not loading
Applied: srv/server.js lines 1107-1108

[2026-05-11] [FLP / Config] Learning: When removing a tile from the FLP, three locations must be updated: (1) the tile entry in the tiles array of its group in fioriSandboxConfig.json; (2) the FLP intent entry in fioriSandboxConfig.json `inbounds`; (3) both corresponding entries in fiori-apps.html (tile array + inbounds). Missing any of the three leaves a dead intent that shows "app could not be opened" if navigated to via URL hash.
Source: Remove BridgeHierarchy + bridges-public tiles
Applied: Both files cleaned in all three locations

[2026-05-11] [Custom Attributes / AttributesAdmin] Learning: The AttributesAdmin standalone app had 4 bugs that made it completely non-functional: (1) `list.getBindingInfo("items").template` crashes when the list has no items binding — use `setModel(new JSONModel(...))` instead; (2) OData UUID filter values must be single-quoted: `group_ID eq 'uuid-here'` not `group_ID eq uuid-here`; (3) XML view list/table controls need `items="{/}"` attribute to render JSONModel data; (4) PATCH/POST/DELETE calls need X-CSRF-Token headers. All four patterns recur across custom REST controllers — always check for them when debugging a non-functional list.
Source: User report — custom attributes not working
Applied: app/attributes-admin/webapp/controller/ + view fixes

[2026-05-11] [Reports API] Learning: Three common bugs in reports-api.js: (1) `criticalDefectFlag` doesn't exist on `bridge.management.Bridges` — use `conditionRating >= 4` as proxy for critical defects count; (2) `dataQualityScore` doesn't exist — compute inline from non-null field count; (3) query params like `?state=NSW` are sent by the UI but route handlers don't read `req.query.state` — always add `if (state) query.where({ state })` guard on each endpoint. State filter was missing from ALL 6 report endpoints.
Source: Reports audit — data quality and risk register tiles showing 0
Applied: srv/reports-api.js

[2026-05-11] [Roles / XSUAA] Learning: BMS_ADMIN role-template must include ALL 9 scopes: admin, manage, operate, inspect, view, certify, config_manager, executive_view, external_view. `executive_view` and `external_view` are easy to miss because they look like UI-only scopes — but admin must be able to test every view mode. Also: XSUAA scaffolding creates a stale `"admin"` role-template (description: "generated") with just the admin scope — this is dead code that should be removed immediately to avoid accidental role-collection assignment.
Source: Roles audit — xs-security.json
Applied: xs-security.json — removed stale "admin" template; added executive_view + external_view to BMS_ADMIN

[2026-05-11] [Mass Upload / AllowedValues] Learning: When adding a multi-entity importer to the DATASETS array (e.g. AllowedValues that writes to 26 different lookup entities), set `entity: null` and add a guard `if (!dataset.entity) return []` in `readDatasetRows` and `buildWorkbookTemplate`. The importer function receives the full list of rows and groups them by `entityName` internally. Maintain a whitelist Set of allowed entity names as the security boundary — never pass a user-supplied entity name directly to `SELECT.from()`.
Source: Allowed values Excel restructure feature
Applied: srv/mass-upload.js — ALLOWED_VALUES_WHITELIST, importAllowedValueRows, fetchAllLookupValues, AllowedValues DATASET entry

[2026-05-11] [Schema / Industry Standards] Learning: 21 HIGH-priority field gaps identified across 12 sub-domain tiles against AS 5100 / SIMS / AGAM / NHVR HVNL standards. Full analysis in docs/tile-attribute-design.md. Key gaps: inspectionMethodology (AS 5100-2 / AGAM), repairMethod (SIMS repair method codes), maintenancePriority (P1-P4 TfNSW framework), requiresLoadRestriction (links defect to restriction workflow), residualLikelihood/Consequence (TfNSW 5×5 matrix needs both inherent AND residual scores), riskRegisterStatus (Open/Escalated/Accepted/Treated/Closed), simsElementCode (SIMS lookup for element IDs), assessmentMethodology (NHVR desktop/field/load-testing). All implemented with CDS enum types and FE4 annotations.
Source: Tile attribute analysis
Applied: db/schema/enum-types.cds (7 new types), db/schema/defects.cds, risk-assessments.cds, scour-assessments.cds, nhvr-compliance.cds, elements.cds, db/schema.cds, app/admin-bridges/fiori-service.cds

[2026-05-11] [UI5 / XML Views] Learning: `data:` namespace for CustomData attributes (`data:myProp="{model>field}"`) requires `xmlns:data="http://schemas.sap.com/sapui5/extension/sap.ui.core.CustomData/1"` in the view's root element. A missing namespace declaration causes an XML parse error at UI5 component load time — not a runtime error — which silently prevents the ENTIRE component from loading. The FLP shows "App could not be opened" for ALL routes in that component, not just the view with the error. Always run an XML namespace check (`python3 -c "import xml.etree.ElementTree as ET; ET.parse(f)"`) on all view files before committing.
Source: BmsAdmin "#BmsAdmin-manage" load failure — FeatureFlags.view.xml missing `xmlns:data`
Applied: app/bms-admin/webapp/view/FeatureFlags.view.xml — added xmlns:data declaration

[2026-05-11] [AssetIQ / Risk Scoring] Learning: AssetIQ risk scoring engine is now separate from BSI (Bridge Sufficiency Index). BSI = virtual field on Bridges computed from BCI formula. AssetIQ = persisted `AssetIQScores` entity with 5 factors (BCI 35%, Age 15%, Traffic 20%, Defect 20%, Load 10%) computed by `scoreAllBridges()` AdminService action. BHI/NBI = computed by `srv/bhi-bsi-engine.js` multi-modal engine, only populated when `feature.bhiBsiAssessment = true`. Three scoring systems coexist: bsiScore (virtual, always computed), AssetIQScore (persisted, on-demand batch), BHI/NBI (virtual, feature-flagged).
Source: Phase 4 FD implementation
Applied: db/schema.cds (AssetIQScores, AssetIQModels entities), srv/admin-service.cds/js, srv/bhi-bsi-engine.js, srv/bhi-bsi-api.js

[2026-05-11] [BHI/BSI Engine] Learning: `srv/bhi-bsi-engine.js` implements the multi-modal BHI/BSI formula with 6 transport modes (Road/Rail/Metro/LightRail/Ferry/Port). Exposed via `srv/bhi-bsi-api.js` at `/bhi-bsi/api` with 3 endpoints: `POST /assess` (single bridge), `GET /network-summary` (batch up to 200), `GET /mode-params` (public). All endpoints except mode-params are guarded by auth + feature flag check (503 when `feature.bhiBsiAssessment = false`). BHI/NBI virtual fields on Bridges are only computed in `after('READ', Bridges)` when the feature flag is enabled — checked via `isFeatureEnabled('bhiBsiAssessment')` from `srv/feature-flags.js`.
Source: Phase 4 FD — BHI/BSI multi-modal assessment engine
Applied: srv/bhi-bsi-engine.js (new), srv/bhi-bsi-api.js (new), srv/server.js (mount), srv/admin-service.js (virtual field population), db/schema/bridge-entity.cds (virtual bhi/nbi fields)

[2026-05-11] [Phase 4 FD / Defect Escalation] Learning: Severity 4+ defects now auto-create an AlertsAndNotifications record. Guard with deduplication check (`SELECT.one WHERE entityId = defect.ID AND status = 'Open'`) before inserting to avoid duplicate alerts. Set `alertSent = true` on the defect after alert creation. Pattern reused from load-ratings expiry alert. The `requiresLoadRestriction` flag on BridgeDefects auto-creates a Draft Restriction record if none exists.
Source: Phase 4 FD Gherkin — severity escalation scenarios
Applied: srv/handlers/defects.js, db/schema/defects.cds (alertSent field)

[2026-05-11] [FLP / Static Config Limitation] Learning: FLP tiles in `fiori-apps.html` and `fioriSandboxConfig.json` are STATIC — there is no way to conditionally show/hide a tile based on a runtime feature flag. The AssetIQ tile is always visible in the launchpad. Feature flag gating is applied at the CONTENT layer: the `/bhi-bsi/api/*` endpoints return HTTP 503 with a clear message when the flag is off, and the screen shows the error. To hide the tile entirely in production, use BTP FLP personalisation or role-based tile visibility (assign to a role-collection that only BMS_ADMIN or BMS_BRIDGE_MANAGER has).
Source: BHI/BSI tile feature flag gating
Applied: Documented; tile visible; content gated at API level

[2026-05-12] [UI5 / FLP Sandbox] Learning: The `test-resources/sap/ushell/bootstrap/sandbox.js` CDN bootstrap always deep-merges `FioriSandboxDefaultConfig.json` which registers dozens of SAP sample apps (AppNavSample, RTA Demo App, AppPersSample, etc.) into "My Home". To suppress them without switching bootstrap: (1) add `bootstrapConfig: { mergeApplications: false }` to `sap-ushell-config`; (2) add an `Object.defineProperty` getter/setter trap BEFORE sandbox.js loads that freezes the `groups` array — when sandbox.js tries to assign/merge groups, the no-op setter discards the change and only BMS groups remain.
Source: User report — sample apps appearing in FLP home page
Applied: app/fiori-apps.html — bootstrapConfig property + Object.defineProperty trap script

[2026-05-12] [UI5 / Controller Pattern] Learning: `byId("list").setModel(new JSONModel([]))` on every data load creates a new JSONModel instance, which forces a full aggregation re-bind and causes visible flickering. Fix: create named models ONCE in `onInit` on the VIEW (`this.getView().setModel(new JSONModel([]), "groups")`), then use `getView().getModel("groups").setData(newData)` to update in-place. In the XML view, bind aggregations with the model prefix: `items="{groups>/}"` and item properties as `{groups>name}`. Zero flicker, better memory usage.
Source: Attribute Configuration tab flickering in BMS Admin
Applied: app/bms-admin/webapp/controller/AttributeConfig.controller.js + view

[2026-05-12] [CDS / Demo Mode] Learning: Demo mode (`loadDemoData`/`clearDemoData` actions, DemoMode.controller.js/view) was removed entirely. These actions were registered in AdminService and backed by `srv/demo-handler.js`. Removing them: (1) delete the handler file; (2) remove both action lines from admin-service.cds; (3) remove the `require` and registration call from server.js; (4) remove the route/target from manifest.json; (5) remove the nav item from Shell.view.xml; (6) remove the nav key constant from Shell.controller.js; (7) remove any SystemConfig seed rows for demo settings.
Source: User request — remove all sample app code
Applied: srv/demo-handler.js deleted, admin-service.cds, server.js, manifest.json, Shell.controller.js, Shell.view.xml, SystemConfig.csv

[2026-05-12] [CAP / Admin Service] Learning: Two critical admin-service.js bugs found in CRUD testing: (1) `conditionRating` and `lastInspectionDate` were in `requiredFields.Bridges` — these are set by the inspection workflow and must NOT be required on create (blocks every new bridge creation); (2) `inherentRiskScore` and `inherentRiskLevel` were only computed in BridgeManagementService handler (srv/handlers/risk-assessments.js) but NOT in AdminService — records created via AdminService (direct OData) always had null risk scores. AdminService requires its own `before(['CREATE','UPDATE'], BridgeRiskAssessments)` handler that mirrors the BMS service handler.
Source: Full CRUD test audit — docs/crud-test-report.md
Applied: srv/admin-service.js

[2026-05-12] [Cleanup] Learning: Five orphaned app directories deleted (23,329 lines): `app/bridge-hierarchy/`, `app/bridges-public/`, `app/bms-business-admin/`, `app/operations/dashboard/`, `app/operations/map-view/`. These had no registered FLP intent and some were duplicates of active apps. After deletion, `app/services.cds` `using from` statements pointing to deleted paths must also be removed (causes `[ERROR] Can't find local module` at compile time), and `mta.yaml` module/artifact entries must be cleaned up.
Source: Code cleanup sprint
Applied: app/services.cds, mta.yaml, deleted directories

---

## Contributing to this file

If you discover a new convention, fix a recurring mistake, or learn something about the
codebase that would have saved you time — add it here and commit it. Keep entries concise:
lead with the rule, follow with the reason if it is not obvious.
