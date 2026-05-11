# BMS CRUD & Integration Test Report
Date: 2026-05-11
Tester: Expert Council (Automated)
Branch: claude/distracted-hofstadter-c3d77a

## Test Environment
- Server: localhost:8009
- Auth: CAP dummy auth (privileged user)
- DB: SQLite (db.sqlite)
- CDS Version: v9.8.5
- Node Version: v20.19.6

---

## Summary Table

| Entity | CREATE | Read | UPDATE | Deactivate | Reactivate | Notes |
|--------|--------|------|--------|------------|------------|-------|
| Bridges | ✅ | ✅ | ✅ | ✅ (status=Inactive) | ✅ (status=Active) | Requires draftActivate; fix applied (see Defect #1) |
| BridgeInspections | ✅ | ✅ | ✅ | ✅ (active=false) | ✅ | Draft-enabled; INS-0001 auto-ref |
| BridgeDefects | ✅ | ✅ | ✅ | ✅ (active=false) | ✅ | Draft-enabled; DEF-0001 auto-ref |
| BridgeCapacities | ✅ | ✅ | ✅ | ✅ (capacityStatus=Superseded) | ✅ (Current) | Draft-enabled |
| BridgeConditionSurveys | ✅ | ✅ | ✅ | ✅ (active=false) | ✅ | submitForReview ✅; approveSurvey ✅ |
| BridgeLoadRatings | ✅ | ✅ | ✅ | ✅ (active=false, status=Superseded) | ✅ | validTo mandatory on activate |
| BridgePermits | ✅ | ✅ | ✅ | ✅ (active=false) | ✅ | approve() ✅; permitRef=PM-0001 |
| BridgeRiskAssessments | ✅ | ✅ | ✅ | ✅ (active=false) | ✅ | Fix applied (see Defect #2); inherentRiskScore=9 for 3×3 |
| BridgeScourAssessments | ✅ | ✅ | ✅ | ✅ (mitigationStatus=Superseded) | ✅ | Created via bridge draft navigation |
| NhvrRouteAssessments | ✅ | ✅ | ✅ | ✅ (assessmentStatus=Superseded) | ✅ (Current) | assessorName/assessorAccreditationNo mandatory |
| LoadRatingCertificates | ✅ | ✅ | ✅ | ✅ (status=Superseded) | ✅ (Current) | certificateNumber (not certificateRef) |
| Restrictions | ✅ | ✅ | ✅ | ✅ (active=false) | ✅ | Draft-enabled in restrictions app |
| AlertsAndNotifications | N/A | ✅ | ✅ | N/A | N/A | Insertable=false by design (system-generated) |
| BridgeElements | ✅ | ✅ | N/A | N/A | N/A | 1–5 scale for currentConditionRating |
| BridgeContacts | ✅ | ✅ | N/A | N/A | N/A | PASS |
| BridgeCarriageways | ✅ | ✅ | N/A | N/A | N/A | PASS |
| BridgeMehComponents | ✅ | ✅ | N/A | N/A | N/A | PASS |
| BridgeInspectionElements | ✅ | ✅ | N/A | N/A | N/A | bridge_ID resolved from inspection_ID |

---

## Test Data Created

| Entity | ID | Key Fields |
|--------|----|------------|
| Bridge | 57 | bridgeId=BRG-NSW-057, bridgeName=Expert Council Test Bridge, state=NSW |
| BridgeInspection | 51c3c8c7-cf45-4cb3-a275-6244587a46f9 | inspectionRef=INS-0001, type=Routine, rating=7 |
| BridgeDefect | bbc3d8b1-462f-49f8-b2c4-e8e7ad0b329a | defectId=DEF-0001, type=Corrosion, severity=3 |
| BridgeCapacity | 5a178224-3934-4b11-9e4d-692e1a051e3c | capacityType=Mass, grossMassLimit=45t |
| BridgeConditionSurvey | 7179036e-e3c7-486d-983d-1ff76ca81e4e | surveyRef=CS-0001, status=Approved (workflow tested) |
| BridgeLoadRating | 879d5a6a-0911-43a2-a511-7d86686e58c7 | ratingRef=LR-0001, vehicleClass=T44 |
| BridgePermit | c689d8a5-7445-448f-8016-43f310426ccd | permitRef=PM-0001, type=Oversize, status=Approved |
| BridgeRiskAssessment | b44f0cb6-19da-494f-b34f-df488748123e | assessmentId=RSK-0001, inherentRiskScore=9 (3×3) |
| BridgeScourAssessment | 37ffcab4-84ca-4691-9902-0dd59fd9278b | scourRisk=Medium, assessmentType=Visual |
| NhvrRouteAssessment | ef3f1198-fe6d-48fe-8e6e-9724a644bbd9 | assessmentId=NHVR-TEST-001, status=Current |
| LoadRatingCertificate | 4fef524d-8f18-4706-aea1-8638f4624254 | certificateNumber=LRC-TEST-001, ratingLevel=T44 |
| Restriction | d0a52836-51f9-4cba-8cec-b6aba874f27b | restrictionType=Mass Limit, value=40t |
| BridgeElement | 41f5bbb3-a4ae-4cd4-925e-0e274460554b | elementId=E001, elementName=Main Deck, rating=3 |
| BridgeContact | ebb5f70d-fec4-4e2a-b2a2-8bb02462eb47 | contactGroup=Maintenance, primaryContact=John Smith |
| BridgeCarriageway | a312d9eb-8245-4050-984e-6a7c1edb477d | roadNumber=M1, laneCount=4 |
| BridgeMehComponent | 484d8b2c-56fc-4bd9-84ad-0ef2b68fb03b | componentType=Bearing, name=North Bearing Assembly |
| BridgeInspectionElement | dc3fbecf-f502-4137-b606-ed55516b8a48 | elementType=Deck, conditionState1Qty=80 |
| AssetIQ Score | be0e9fb2-e64f-49d1-b040-977284bfdf27 | overallScore=35.29, ragStatus=AMBER |

---

## Report Endpoints

| Endpoint | HTTP Status | Data Quality | Notes |
|----------|-------------|--------------|-------|
| GET /reports/api/network-health | 200 | Good — returns KPIs, conditionDistribution, by-state breakdown | 56 bridges, NCI=96 |
| GET /reports/api/inspection-compliance | 200 | Sparse — all zeros (no inspection dates on seed bridges) | Correct given seed data |
| GET /reports/api/risk-register | 200 | Good — scour distribution, high-risk KPIs | 7 high-scour bridges |
| GET /reports/api/data-quality | 200 | Good — avg score 91%, 53 complete bridges | withScore=56 |
| GET /reports/api/regulatory-compliance | 200 | Sparse — no gazette/restriction data | Correct given seed data |
| GET /reports/api/bridges-restrictions | 200 | Good — posting breakdown, NHVR stats | 15 restricted, 41 unrestricted |
| GET /bhi-bsi/api/mode-params | 200 | Good — Road/Rail/Metro/Pedestrian parameters | Design life params correct |
| GET /mass-upload/api/datasets | 200 | Good — full dataset list with name/label/description | 25+ datasets available |
| GET /dashboard/api/analytics | 200 | Good — KPIs, condition distribution by state | NCI=67, deficiency 18% |
| GET /map/api/bridges | 200 | Good — full bridge list with GeoJSON | 56 bridges |
| GET /system/api/features | 200 | Good — all feature flags listed | 3 flags, all disabled |
| POST /mass-upload/api/validate | 200 | Good — validation works for CSV uploads | CSRF handling correct |
| POST /odata/v4/admin/scoreAllBridges | 200 | Good — 57 bridges scored | AMBER for test bridge |
| GET /quality/api/bridges | 404 | FAIL — endpoint not found | See Defect #3 |
| GET /admin-bridges/api/bridges | 404 | FAIL — endpoint not found | See Defect #3 |

---

## Workflow Actions Tested

| Action | Entity | Result | Notes |
|--------|--------|--------|-------|
| draftEdit + draftActivate | Bridges | PASS | Full create→edit→save cycle |
| submitForReview | BridgeConditionSurveys | PASS | Draft→Submitted |
| approveSurvey | BridgeConditionSurveys | PASS | Submitted→Approved |
| approve | BridgePermits | PASS | Pending→Approved |
| refreshKPISnapshots | (checked via scoreAllBridges) | N/A | Uses separate endpoint |
| deactivate/reactivate | All 11 entities | PASS | All soft-delete patterns verified |
| Audit trail (ChangeLog) | Permits, Surveys, Inspections | PASS | All mutations logged |

---

## Defects Found

| # | Severity | Entity/Endpoint | Description | Root Cause | Fix Applied |
|---|----------|-----------------|-------------|------------|-------------|
| 1 | HIGH | Bridges CREATE | New bridges could not be activated — `conditionRating` and `lastInspectionDate` declared as mandatory in `requiredFields.Bridges` but both are `@Common.FieldControl: #ReadOnly` in the UI (set via Inspect Now workflow). This blocked ALL new bridge creation via the Admin UI. | `srv/admin-service.js` lines 24–26: both fields in the `requiredFields.Bridges` array. CAP ignores ReadOnly fields on draft PATCH, so the fields stay null and the SAVE validation fires with a 400 error. | Removed `conditionRating` and `lastInspectionDate` from `requiredFields.Bridges` in `srv/admin-service.js`. These fields are populated by the inspection workflow only. A comment documents the design intent. |
| 2 | HIGH | BridgeRiskAssessments | `inherentRiskScore` was always `null` when creating risk assessments via AdminService. The field is critical for the network risk register and risk analytics. | `AdminService` (`srv/admin-service.js`) has no `before(['CREATE','UPDATE'])` handler for `BridgeRiskAssessments` that computes the score. The computation only exists in `BridgeManagementService`'s handler (`srv/handlers/risk-assessments.js`), which does not fire for AdminService (separate CAP service instances per CLAUDE.md). | Added `this.before(['CREATE', 'UPDATE'], BridgeRiskAssessments, ...)` handler in `srv/admin-service.js` that computes `inherentRiskScore = likelihood × consequence` and `inherentRiskLevel` using TfNSW 5×5 risk matrix thresholds (Low ≤4, Medium 5–9, High 10–14, Extreme ≥15). |
| 3 | LOW | /quality/api/bridges, /admin-bridges/api/bridges | Both endpoints return HTTP 404. | These may be legacy endpoints or not yet registered in `srv/server.js`. The quality API is referenced in the application but the router may not be mounted. | Not fixed — endpoints appear to be either removed or not yet implemented. Documented as endpoints to verify before BTP deployment. |
| 4 | INFO | BridgeLoadRatings | `validTo` field is `@assert.mandatory` (required for draftActivate) but is not shown in the initial CREATE documentation or the task spec. Users creating a load rating via the UI are blocked from saving without setting validTo. | `BridgeLoadRatings.validTo` declared `@assert.mandatory` in the schema without a sensible default. | Not changed — this is likely intentional (load ratings must have an expiry). Added test note that validTo must be provided. |
| 5 | INFO | NhvrRouteAssessments | Initial CREATE failed with `Property "vehicleClass" does not exist`. The correct field names are `vehicleClass` is not a field on this entity; the entity uses `assessorName`, `assessorAccreditationNo`, `validFrom` as mandatory fields. | Mismatched field name documentation in the task spec vs actual schema in `db/schema/nhvr-compliance.cds`. | Not a code defect. Test updated to use correct field names. |
| 6 | INFO | LoadRatingCertificates | `certificateRef` is not a field — the correct field is `certificateNumber`. | Task spec used wrong field name. | Not a code defect. Documented for API consumer awareness. |

---

## Improvements Identified

### High Priority
1. **New Bridge Create UX**: The mandatory validation for `conditionRating` and `lastInspectionDate` on bridge save was blocking all new bridge creation. Fixed (Defect #1). This would have been a critical UAT blocker.

2. **AdminService inherentRiskScore gap**: Risk assessments created through AdminService (the primary data entry path) had null risk scores, making the risk register report meaningless for new data. Fixed (Defect #2). This is a consequence of the "AdminService vs BridgeManagementService handler isolation" pattern documented in CLAUDE.md.

### Medium Priority
3. **BridgeScourAssessments standalone CREATE**: Creating scour assessments directly (`POST /odata/v4/admin/BridgeScourAssessments`) fails with `DRAFT_MODIFICATION_ONLY_VIA_ROOT` because the entity is a `Composition of many` child of Bridges (which is draft-enabled). Users must create them through the bridge draft navigation. The FLP tile UI should handle this automatically, but REST API callers must be aware.

4. **AlertsAndNotifications**: No system-generated alerts are created by the current seed data or manual CRUD operations. The alert generation logic (load rating expiry, inspection overdue) requires time-based triggers that are not yet wired up. Alerts should be tested when the scheduler is enabled.

5. **Inspection Compliance Report empty**: All seed bridges have `lastInspectionDate = null`, so the inspection compliance report shows zeros. This is a seed data quality issue that will be masked in production by real data.

### Low Priority
6. **BridgeElements `currentConditionRating` uses 1–5 scale** (not 1–10 like BridgeInspections). This inconsistency is documented in CLAUDE.md but the task spec used a value of 7 which caused an assertion error. API consumers should be aware.

7. **`/quality/api` and `/admin-bridges/api` missing**: Two custom API endpoints return 404. These should be verified before BTP deployment.

8. **Mass Upload CSRF**: The mass upload API requires CSRF token for POST requests. In local dev, the "unsafe" token is accepted. The test confirmed this works as expected.

---

## Test Data Cleanup

All test records created with bridgeId=`BRG-NSW-057` (bridge ID=57). The following actions leave the test bridge in a clean state:
- Bridge status: Active
- All sub-domain entities: reactivated at end of test
- BridgeConditionSurvey: status=Approved (workflow tested through full lifecycle)
- BridgePermit: status=Approved
- AssetIQ score: 35.29 AMBER

To remove test data, run:
```sql
-- Remove test bridge and all cascade entities
DELETE FROM AdminService_Bridges WHERE ID = 57;
-- Cascade: BridgeInspections, BridgeDefects, BridgeCapacities, etc. are
-- stored as independent entities in AdminService tables with bridge_ID = 57
```

---

## Server Changes Made

The following production code changes were made based on defects found:

1. **`srv/admin-service.js` line 16–27** — Removed `conditionRating` and `lastInspectionDate` from `requiredFields.Bridges` mandatory check. These fields are read-only on the Bridge form and populated by the inspection workflow.

2. **`srv/admin-service.js` after line 1086** — Added `this.before(['CREATE', 'UPDATE'], BridgeRiskAssessments, ...)` handler that computes `inherentRiskScore` and `inherentRiskLevel` for AdminService (mirrors the existing handler in `srv/handlers/risk-assessments.js` for BridgeManagementService).
