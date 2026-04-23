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

### CDS sub-schema file circular reference pattern
- **`entity Bridges` lives in `db/schema/bridge-entity.cds`** — moved out of the `db/schema.cds` barrel so that other schema sub-files can import it without a circular dependency. `db/schema.cds` loads it via `using { bridge.management.Bridges } from './schema/bridge-entity'` and all sub-files that define associations to Bridges import it via `using { bridge.management.Bridges } from './bridge-entity'`.
- **`using from 'path'` (wildcard) does NOT make entities available to other files in the barrel** — only `using { X } from 'path'` (named import) resolves references across files. CDS deploy succeeds with wildcard imports but `cds-serve` runtime fails at model load. Always use named imports when one schema sub-file references an entity defined in another sub-file.
- **CDS linter strips `using { X } from '../schema'` (parent barrel) as circular** — any import that points back to the barrel file (`db/schema.cds`) will be silently removed. Fix: point the import to the defining file directly (`'./bridge-entity'`), not the barrel.
- **`action resolve()` conflicts with ApplicationService base class** — CDS CAP `ApplicationService` has a built-in `resolve()` method. Naming an OData bound action `resolve` on any entity generates a warning and shadows the base method. Use a domain-specific name like `resolveAlert` instead.
- **`npx cds deploy` tolerates circular imports at deploy-time; `cds-serve` does not** — a deploy that shows no errors does not guarantee the runtime server will start. Always test `npm start` (or `node -e "cds.load(...)"`) after schema changes, not just deploy.

---

## Contributing to this file

If you discover a new convention, fix a recurring mistake, or learn something about the
codebase that would have saved you time — add it here and commit it. Keep entries concise:
lead with the rule, follow with the reason if it is not obvious.
