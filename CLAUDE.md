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
npm start          # cds-serve on http://localhost:4004
npm test           # Jest test suite
```

Fiori launchpad: `http://localhost:4004/fiori-apps.html`  
Mass upload UI: `http://localhost:4004/fiori-apps.html#MassUpload-display`  
Mass upload API: `http://localhost:4004/mass-upload/api/`

---

## Architecture rules

### CAP / CDS
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

---

## Contributing to this file

If you discover a new convention, fix a recurring mistake, or learn something about the
codebase that would have saved you time — add it here and commit it. Keep entries concise:
lead with the rule, follow with the reason if it is not obvious.
