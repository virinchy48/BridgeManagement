# ADR-006: CSV/Excel mass upload via REST instead of OData $batch

**Date:** 2025-Q4  
**Status:** Accepted  
**Deciders:** CAP_ARCHITECT, PRODUCT_MANAGER, QA_LEAD

---

## Context

Bridge asset registers managed by state agencies contain thousands of records. NSW TfNSW open data alone covers 5,152 bridges. Migrating these records into BMS requires a bulk import mechanism.

Two approaches were evaluated:

1. **OData `$batch`** — standard OData V4 batch request with multiple `POST EntitySet` operations in a single HTTP body
2. **Custom REST endpoint** — a dedicated `/mass-upload/api/upload` endpoint that accepts a base64-encoded CSV or Excel file and processes all rows server-side

---

## Decision

Implement **custom REST endpoints** at `/mass-upload/api/` for all bulk import operations. The endpoints accept `{ fileName, contentBase64, dataset }` JSON bodies and return `{ summaries, skipped, warnings }`. A separate `/validate` endpoint returns a preview of the first 10 rows with validation results before committing.

---

## Rationale

**File-based workflow matches agency practice.** Bridge data managers work with Excel workbooks — they export from state GIS systems, modify in Excel, and re-import. An OData $batch flow would require transformation tooling to generate hundreds of individual POST bodies. The REST endpoint accepts the Excel file directly.

**Excel data validation dropdowns.** The `buildWorkbookTemplate()` function generates an Excel workbook with in-cell dropdown lists for all lookup-backed columns (state, structure type, waterway type, etc.) using the `!validations` worksheet array. OData $batch cannot generate or validate against this workbook structure.

**Atomic batch processing with per-row error reporting.** The server processes all rows in a transaction-aware loop, collecting per-row errors into a `skipped` array without aborting the entire batch. OData $batch supports `continue-on-error` but individual error responses require client-side correlation.

**Performance.** A 5,152-row CSV import via OData $batch would generate 5,152 individual OData requests through the CAP framework, including hook invocation for each. The REST endpoint bypasses CAP hooks and uses direct `INSERT.into()` / `UPSERT` calls, reducing import time significantly.

**`dataset: "All"` for workbook imports.** A single Excel workbook can contain multiple sheets (Bridges, Restrictions, Lookups). The `dataset: "All"` parameter processes all sheets in sequence. OData $batch has no equivalent concept for multi-entity bulk import from a single file.

---

## Consequences

**Positive:**
- Business users can upload their existing Excel workbooks without transformation
- Validate-before-commit workflow reduces data quality errors
- Per-row error reporting with row numbers aids data correction
- Lookup sheets with data validation dropdowns guide correct data entry

**Negative / trade-offs:**
- The effective upload size limit is ~18 MB raw file (base64 encoding inflates to ~25 MB JSON body). The express.json limit is set to `'25mb'`. For 50 MB Excel files, the limit must be raised to `'70mb'`.
- CSV uploads require a specific `dataset` name — `dataset: "All"` is invalid for CSV. The UI does not currently validate this client-side.
- The REST endpoint bypasses CAP `before`/`after` hooks — business logic (auto-ref generation, audit logging, validation) must be duplicated in the importer functions or called explicitly. Currently only `writeChangeLogs()` is called from `upload.js`.
- Custom routers need explicit `requireScope()` middleware — CAP `@requires` annotations do not protect custom Express routes.
- CSRF token must be fetched via HEAD `X-CSRF-Token: Fetch` before every POST — the UI `_getCsrfToken()` pattern caches the token per session.
