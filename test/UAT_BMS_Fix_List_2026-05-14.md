# UAT Fix List — Bridge Management System
**Date:** 2026-05-14  
**Environment:** Local dev http://localhost:8008 — SQLite, dummy auth  
**Tester:** UAT Expert Team (QA Lead, Bridge SME, Security Auditor, UX, PO)  
**App version:** 1.2.0  

---

## P1 — Blocks core flow / security / data loss

### [P1-001] Risk Matrix buttons not rendering on BridgeRiskAssessments ObjectPage

- **File:** `app/admin-bridges/webapp/manifest.json`
- **Symptom:** "Inherent Risk Matrix" and "Residual Risk Matrix" action buttons configured in `content.header.actions` do not appear in the ObjectPage header toolbar. `headerTitle.getActionsToolbar().getContent()` returns 0 items.
- **Expected:** Two buttons visible in the ObjectPage header allowing the inspector to open the 5×5 risk matrix dialog.
- **Root cause:** The `BridgeRiskAssessmentsObjectPage` target has no `controllerName` or `controllerExtensions` registration. FE4 cannot resolve the `press` handler `BridgeManagement.adminbridges.ext.controller.RiskAssessmentsExt.onOpenInherentMatrix` because the extension controller is not wired to this routing target. Compare with `BridgeDetailsObjectPage` which has `"controllerName": "BridgeManagement.adminbridges.ext.controller.BridgeDetailExt"` and works correctly.
- **Fix:** Add `"controllerName": "BridgeManagement.adminbridges.ext.controller.RiskAssessmentsExt"` to the `BridgeRiskAssessmentsObjectPage` target `options.settings` block in `manifest.json`.
- **Test:** Navigate to a BridgeRiskAssessment ObjectPage; verify two buttons appear in the header; click "Inherent Risk Matrix" → dialog opens with 5×5 grid.
- **Persona:** Bridge Inspector (primary), Bridge Manager
- **Related:** Fragment ID was already fixed in prior session (`riskMatrixAssessmentsFrag`)

---

### [P1-002] Seed BridgeInspections missing `inspectionRef` (null in all 15 seed rows)

- **File:** `db/data/bridge.management-BridgeInspections.csv`
- **Symptom:** All 15 seed inspection records have `inspectionRef = null`. The ObjectPage title shows blank. The `inspectionRef` SelectionField filter bar field returns no results when searched. The Bridge Details "Inspection Status" tab shows no ref.
- **Expected:** Each record has a unique `inspectionRef` in `INS-NNNN` format.
- **Root cause:** The seed CSV was created before the `inspectionRef` auto-generation handler (`admin-service.js` `before('NEW', BridgeInspections.drafts)`) was added. The handler only fires on new FE4 draft creation — it does not backfill existing CSV-seeded records.
- **Fix:** Add `inspectionRef` values (`INS-0001` … `INS-0015`) to the seed CSV. The CSV columns must include an `inspectionRef` column with values for all rows. After fix, re-run `cds deploy` to verify.
- **Test:** `GET /odata/v4/admin/BridgeInspections?$select=inspectionRef&$top=5` → all rows return non-null `inspectionRef`; filter `inspectionRef eq 'INS-0001'` returns 1 result.
- **Persona:** Bridge Inspector, Data Steward

---

## P2 — Degrades UX or correctness, has workaround

### [P2-001] `ratingFactor` field referenced on `LoadRatingCertificates` annotations causes OData error

- **File:** `app/admin-bridges/fiori-service.cds` line ~2407
- **Symptom:** LoadRatingCertificates ListReport silently fails to load with OData `Invalid (navigation) property 'ratingFactor'`. The entity uses per-class rating factor fields (`rfT44`, `rfSM1600`, etc.) — there is no scalar `ratingFactor` property.
- **Expected:** LRC list report loads successfully showing `rfT44` column.
- **Root cause:** `@UI.LineItem` annotation references `{ Value: ratingFactor }` which does not exist on `LoadRatingCertificates`.
- **Fix:** Change `ratingFactor` → `rfT44` in the `LoadRatingCertificates` `@UI.LineItem` annotation block.
- **Test:** Navigate to Load Rating Certificates tile; list loads without console OData errors; `rfT44` column is visible.
- **Persona:** Bridge Manager, Data Steward
- **Note:** This was documented in CLAUDE.md `[2026-05-12]` — verify the fix was applied to worktree.

---

### [P2-002] `BridgeRiskAssessments` `riskType` and `riskCategory` are free-text — should be enum-backed dropdowns

- **File:** `db/schema/risk-assessments.cds`, `app/admin-bridges/fiori-service.cds`
- **Symptom:** `riskType` and `riskCategory` fields render as plain text inputs. Users can enter arbitrary values, leading to data quality issues (e.g. "structural" vs "Structural" vs "structural failure").
- **Expected:** Both fields show value-help dropdowns backed by allowed values or CDS enum types.
- **Root cause:** Fields are plain `String(60)` with no enum type or `@Common.ValueList` annotation.
- **Fix option A (recommended):** Define CDS enum types `RiskType` and `RiskCategory` in `db/schema/enum-types.cds` matching TfNSW risk register categories (Structural/Hydraulic/Geotechnical/Operational/Environmental/Compliance). Apply to the fields.
- **Fix option B (simpler):** Add `AttributeDefinitions` rows for these fields with allowed values in `bridge.management-AttributeAllowedValues.csv`.
- **Test:** Create a new BridgeRiskAssessment → `riskType` field shows dropdown with pre-defined values; free-text entry of unknown values is rejected.
- **Persona:** Bridge Inspector, Data Steward

---

### [P2-003] `BridgeScourAssessments` and `BridgeMaintenanceActions` are plain CRUD (no draft) — no FE4 draft workflow

- **File:** `db/schema/scour-assessments.cds`, `db/schema/gap-entities.cds`, `srv/admin-service.cds`
- **Symptom:** `BridgeScourAssessments` and `BridgeMaintenanceActions` entities do not have `@odata.draft.enabled`. Records are created immediately on POST with no validation dialog; there is no "discard" option if user fills wrong data.
- **Expected:** Consistent draft-based CRUD workflow matching other sub-domain entities (BridgeConditionSurveys, BridgeLoadRatings, etc.).
- **Root cause:** These entities were added to `gap-entities.cds` without `@odata.draft.enabled` annotation and without corresponding `AdminService` CDS projection including draft support.
- **Fix:** Add `@odata.draft.enabled` to both entities in `db/schema/` and update their service projections in `srv/admin-service.cds`. Add `before('NEW', Entity.drafts)` auto-ref handler in `srv/admin-service.js`.
- **Test:** Click Create on Scour Assessments tile → FE4 opens empty draft form; fill fields; Save → record activated. Clicking Cancel on empty draft discards it.
- **Persona:** Bridge Inspector, UX Designer

---

### [P2-004] `NhvrApprovedVehicleClasses` sub-table on NhvrRouteAssessments ObjectPage missing

- **File:** `app/admin-bridges/fiori-service.cds`, `srv/admin-service.cds`
- **Symptom:** NhvrRouteAssessments ObjectPage has no sub-table showing approved vehicle classes. Users cannot see which HML/PBS classes are approved on the route without navigating to a separate screen.
- **Expected:** ObjectPage shows an "Approved Vehicle Classes" table (from `NhvrApprovedVehicleClasses` entity) as a ReferenceFacet.
- **Root cause:** The `NhvrApprovedVehicleClasses` entity and its composition in `db/schema/nhvr-compliance.cds` may exist, but the `@UI.Facets` for the NhvrRouteAssessments ObjectPage does not include a `ReferenceFacet` targeting `approvedClasses/@UI.LineItem`.
- **Fix:** Add `{ $Type: 'UI.ReferenceFacet', Target: 'approvedClasses/@UI.LineItem', Label: 'Approved Vehicle Classes' }` to the NhvrRouteAssessments `@UI.Facets` in `fiori-service.cds`.
- **Test:** Navigate to a NhvrRouteAssessment ObjectPage; a section "Approved Vehicle Classes" is visible; clicking Add inserts a new class row.
- **Persona:** Bridge Manager (NHVR compliance reviewer)

---

### [P2-005] Mass upload: `BridgeConditionSurveys`, `BridgeLoadRatings`, `BridgePermits` not in mass-upload DATASETS

- **File:** `srv/mass-upload.js`
- **Symptom:** The three new sub-domain entities (CS/LRT/PRM) are accessible via FE4 CRUD but cannot be bulk-loaded via the mass upload tile. High-volume state agency workflows require bulk CSV ingestion for these entities.
- **Expected:** All three entities appear in the datasets dropdown in the Mass Upload tile with downloadable CSV templates.
- **Root cause:** `DATASETS` array in `mass-upload.js` was not updated when these entities were added in the May 2026 gap-closure sprint. Datasets check confirms: only `BridgeConditionSurveys`, `BridgeLoadRatings`, `BridgePermits` are absent.
- **Fix:** Add three new DATASET entries with `COLUMNS` definitions and `importRows` functions to `srv/mass-upload.js`. Template columns should match the entity metadata fields.
- **Test:** Navigate to Mass Upload tile → datasets dropdown shows "Condition Surveys", "Load Ratings", "Permits"; download template for each; upload valid CSV → records created.
- **Persona:** Data Steward, Power User

---

### [P2-006] `BridgeDefects` urgency field is `Integer @assert.range:[1,4]` — no value-help labels

- **File:** `app/admin-bridges/fiori-service.cds`, `db/schema/defects.cds`
- **Symptom:** `urgency` field on BridgeDefects ObjectPage renders as a plain number input (1-4). Users do not know that 1=Low, 2=Medium, 3=High, 4=Critical. Inspectors entering "3" without knowing it means "High" is error-prone.
- **Expected:** `urgency` renders as a dropdown or segmented button showing "1-Low", "2-Medium", "3-High", "4-Critical".
- **Root cause:** Field is `Integer` with range assertion — no CDS enum type or `@Common.ValueList` with labels.
- **Fix option A:** Change `urgency` to a `String(20)` CDS enum type `DefectUrgency { Low; Medium; High; Critical }`. Update existing seed data.  
- **Fix option B (quick):** Add `@Common.ValueList` annotation with fixed values `[{code:1,label:'Low'},{code:2,label:'Medium'},{code:3,label:'High'},{code:4,label:'Critical'}]`.
- **Test:** Create defect → urgency field shows dropdown with Low/Medium/High/Critical options.
- **Persona:** Bridge Inspector, New User

---

### [P2-007] `BridgeInspections` seed data missing `inspectionRef` does not appear on Bridge Details Inspection Status tab

- **File:** `db/data/bridge.management-BridgeInspections.csv` (same root cause as P1-002 but separate UX impact)
- **Symptom:** The Bridge Details ObjectPage "Inspection Status" tab shows "Last Inspection Reference" as blank for all seeded bridges, making the inspection record untraceable from the Bridge Details view.
- **Expected:** Each bridge shows its latest inspection reference (INS-XXXX) on the Inspection Status tab.
- **Root cause:** Same as P1-002 — seed CSV missing `inspectionRef` column values.
- **Fix:** Same fix as P1-002 (backfilling the CSV). Confirmed that the `conditionReportRef` field on `Bridges` is also blank for all seed bridges as a knock-on effect.
- **Test:** Navigate to any seeded Bridge → Inspection Status tab → Last Inspection Reference shows a non-blank value.
- **Persona:** Bridge Manager, Bridge Inspector

---

## P3 — Polish / accessibility / minor

### [P3-001] `assessmentId` mandatory on `NhvrRouteAssessments` blocks creation without auto-generation

- **File:** `db/schema/nhvr-compliance.cds` line 35, `srv/admin-service.js`
- **Symptom:** `assessmentId` is `@mandatory` in the schema but new records should have it auto-generated as `NRA-NNNN`. If the `before('NEW', NhvrRouteAssessments.drafts)` handler fires with a populated auto-ref, FE4 shows a blank mandatory field indicator briefly before the auto-gen runs, which confuses new users.
- **Expected:** `assessmentId` is `@Core.Computed @Common.FieldControl: #ReadOnly` — never shown as an editable mandatory field to users.
- **Fix:** Remove `@mandatory` from schema; add `@Core.Computed @Common.FieldControl: #ReadOnly` annotations in `fiori-service.cds`.
- **Test:** Create NhvrRouteAssessment → no mandatory indicator on `assessmentId` field; field is read-only showing auto-generated value after save.
- **Persona:** New User, Data Steward

---

### [P3-002] `BridgeScourAssessments` has no `assessmentRef` auto-generated field

- **File:** `db/schema/scour-assessments.cds`, `srv/admin-service.js`
- **Symptom:** Scour assessment records have no human-readable reference ID. The ObjectPage title shows a UUID. In the list report, records cannot be referenced by inspectors in written reports.
- **Expected:** Auto-generated `assessmentRef` in `SAR-NNNN` format, used as the `UI.HeaderInfo.Title`.
- **Fix:** Add `assessmentRef : String(40) @Core.Computed @Common.FieldControl: #ReadOnly` to `scour-assessments.cds`; add `before('NEW')` or `before('CREATE')` handler in `admin-service.js`; update `UI.HeaderInfo.Title` annotation.
- **Test:** Create new scour assessment → assessmentRef field shows `SAR-0001`.
- **Persona:** Bridge Inspector, Data Steward

---

### [P3-003] `MaintenanceActions` has no `actionTitle` mandatory validation — empty titles allowed

- **File:** `db/schema/gap-entities.cds`, `srv/admin-service.js`
- **Symptom:** `BridgeMaintenanceActions` can be created with an empty `actionTitle`. Work order management systems require a descriptive title for every action for traceability.
- **Expected:** `actionTitle` is required at create time with a meaningful error if omitted.
- **Fix:** Add `@mandatory` to `actionTitle` in schema or add server-side validation in `admin-service.js` `before(['CREATE','UPDATE'])`.
- **Test:** POST to `BridgeMaintenanceActions` without `actionTitle` → 400 error "Action Title is required".
- **Persona:** Data Steward, Bridge Manager

---

### [P3-004] `BridgeConditionSurveys.submitForReview` and `approveSurvey` actions not wired to AdminService

- **File:** `srv/admin-service.cds`, `srv/admin-service.js`
- **Symptom:** `submitForReview` and `approveSurvey` bound actions on `BridgeConditionSurveys` are declared in `srv/services/conditions.cds` (BridgeManagementService) but NOT in `srv/admin-service.cds`. Calling these actions via AdminService returns `Method Not Allowed`.
- **Expected:** Workflow actions available to admin users through the FE4 ObjectPage action buttons.
- **Fix:** Add action declarations to `srv/admin-service.cds` and handler registrations in `srv/admin-service.js` (see CLAUDE.md pattern for AdminService vs BridgeManagementService handler isolation).
- **Test:** Navigate to a Condition Survey ObjectPage in Draft status → "Submit for Review" button visible; click → status changes to "Submitted".
- **Persona:** Bridge Manager

---

### [P3-005] Mass upload: `previewTruncated` flag missing — users with many errors only see first 10

- **File:** `srv/mass-upload.js`, `app/mass-upload/webapp/controller/MassUpload.controller.js`
- **Symptom:** Validate response is capped at `previewRows.slice(0,10)` with no indicator to users that more errors exist. A 500-row CSV with 100 validation errors shows only 10 — users think 90% of the file is fine and proceed to upload.
- **Expected:** A warning MessageStrip: "Showing 10 of N errors — download the error report for full details."
- **Fix:** Add `previewTruncated: previewRows.length > 10, totalErrorCount: errors.length` to validate response; in `_showResults()` show a `MessageStrip` when `previewTruncated === true`.
- **Test:** Upload a CSV with 20+ validation errors → MessageStrip visible "Showing 10 of 22 errors…"
- **Persona:** Power User, Data Steward

---

### [P3-006] `LoadRatingCertificates` has no `certRef` auto-generated field — users must type `certificateNumber`

- **File:** `db/schema/load-ratings.cds`, `srv/admin-service.js`
- **Symptom:** Creating a load rating certificate requires manually entering a `certificateNumber` (no auto-generation). This differs from all other sub-domain entities (INS-NNNN, DEF-NNNN, CS-NNNN, etc.) and causes inconsistent referencing.
- **Expected:** Auto-generated `certRef` in `LRC-NNNN` format if `certificateNumber` is not provided.
- **Fix:** Add `before('NEW', LoadRatingCertificates.drafts)` handler in `admin-service.js` that sets `certificateNumber = LRC-NNNN` when not supplied.
- **Test:** Create LRC without `certificateNumber` → field auto-populates with `LRC-0001`.
- **Persona:** Data Steward

---

## CRUD Test Results Summary

| Tile | CREATE | PATCH | draftActivate | Deactivate | Status |
|------|--------|-------|---------------|-----------|--------|
| Bridges | ✅ | ✅ | ✅ | N/A (isActive) | ✅ Pass |
| BridgeInspections | ✅ INS-0001 | ✅ | ✅ | ✅ | ✅ Pass |
| BridgeDefects | ✅ DEF-0001 | ✅ | ✅ (urgency=int) | ✅ | ✅ Pass |
| BridgeRiskAssessments | ✅ RSK-0001 | ✅ score=12 | ✅ | ✅ | ✅ Pass* |
| BridgeConditionSurveys | ✅ CS-0001 | ✅ | ✅ | ✅ | ✅ Pass |
| BridgeLoadRatings | ✅ LR-0001 | ✅ | ✅ (needs validTo) | ✅ | ✅ Pass |
| BridgePermits | ✅ PM-0001 | ✅ | ✅ | ✅ | ✅ Pass |
| LoadRatingCertificates | ✅ LRC-UAT-001 | ✅ | ✅ | ✅ | ✅ Pass† |
| Restrictions | ✅ RST-0001 | ✅ | ✅ | ✅ | ✅ Pass |
| BridgeCapacities | ✅ | ✅ | ✅ (needs grossMass+clearance) | ✅ | ✅ Pass |
| BridgeScourAssessments | ✅ (plain CRUD) | ✅ | N/A | N/A | ✅ Pass (no draft) |
| NhvrRouteAssessments | ✅ NRA-0001 | ✅ | ✅ | ✅ | ✅ Pass |
| BridgeMaintenanceActions | ✅ MA-0001 (plain CRUD) | ✅ | N/A | N/A | ✅ Pass (no draft) |
| AlertsAndNotifications | N/A (system) | ✅ (ack) | N/A | N/A | ✅ Pass |

*Risk Matrix buttons not rendering (P1-001)  
†`ratingFactor` annotation bug causes silent list load failure (P2-001)

## Mass Upload Test Results

| Test | Result |
|------|--------|
| Validate 10-bridge CSV | ✅ totalCount=10, validCount=10, errorCount=0 |
| Upload CREATE (first run) | ✅ inserted=10, updated=0, processed=10 |
| Upload UPDATE (second run — idempotent) | ✅ inserted=0, updated=10, processed=10 |
| Bridge bridgeIds in DB | ✅ UAT-NSW-B01…UAT-TAS-B01 all present |
| CSRF token enforcement | ✅ 403 on missing/invalid token |
