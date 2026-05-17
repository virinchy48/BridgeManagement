# UAT Fix List — Bridge Management System
**Date:** 2026-05-17  
**Version:** 1.9.5  
**Environment:** Local dev http://localhost:8008 — SQLite, dummy auth  
**Tester:** UAT Expert Team (QA Lead, Bridge SME, Security Auditor, UX, PO)  

---

## Baseline Data Snapshot

| Entity | Pre-UAT | Post-UAT |
|--------|---------|----------|
| Bridges | 56 | 58 |
| BridgeInspections | 10 | 11 |
| BridgeDefects | 7 | 8 |
| Restrictions | 0 | 1 |
| BridgeRiskAssessments | 0 | 1 |
| BridgeConditionSurveys | 1 | 2 |
| BridgeLoadRatings | 1 | 2 |
| BridgePermits | 1 | 2 |
| LoadRatingCertificates | 5 | 6 |
| BridgeCapacities | 0 | 1 |
| BridgeScourAssessments | 1 | 2 |
| NhvrRouteAssessments | 1 | 2 |
| BridgeMaintenanceActions | 1 | 2 |

---

## P0 — Critical Blockers

*None found — all critical flows operational.*

---

## P1 — High Priority (2 found, 2 fixed)

### [P1-001] NhvrRouteAssessments deactivate rollback referenced non-existent `active` field — FIXED ✅
- **File:** `srv/admin-service.js` line 1302
- **Symptom:** `POST /NhvrRouteAssessments(ID,IsActiveEntity=true)/AdminService.deactivate` threw a CDS error because the rollback WHERE clause included `active: true` but `NhvrRouteAssessments` has no `active` field.
- **Root cause:** Rollback query used `{ bridge_ID, assessmentStatus: 'Current', active: true }` — `active` doesn't exist on this entity.
- **Fix:** Removed `active: true` from WHERE clause. Rollback now filters `{ bridge_ID, assessmentStatus: 'Current' }`.
- **Test:** Deactivate NRA-0001 → `assessmentStatus: Superseded` ✅, reactivate → `Current` ✅, Bridge.nhvrAssessed rolls back correctly ✅
- **Persona:** Bridge Manager

### [P1-002] Custom Attributes API case-sensitive objectType — capital `Bridge` returned empty panel — FIXED ✅
- **File:** `srv/attributes-api.js` — GET, POST, DELETE `/values/:objectType/:objectId`
- **Symptom:** Bridge Details custom attributes EAV panel rendered blank because the FE4 controller called `/attributes/api/values/Bridge/1` but DB lookups used raw casing; `bridge` returned 5 values while `Bridge` returned 0.
- **Root cause:** `loadValues(db, objectType, objectId)` used raw path param without normalisation.
- **Fix:** Added `objectType = objectType.toLowerCase()` at top of GET, POST, DELETE route handlers.
- **Test:** `GET /attributes/api/values/Bridge/1` → 5 values ✅ (same as `bridge`) ✅
- **Persona:** Bridge Inspector (custom attributes invisible), Data Steward

---

## P2 — Medium Priority

### [P2-001] Dashboard `activeBridges` and `bridgesWithRestrictions` return null
- **File:** `srv/dashboard-api.js` or similar
- **Symptom:** `GET /dashboard/api/analytics` returns `totalBridges: 58` but `activeBridges: null` and `bridgesWithRestrictions: null`.
- **Impact:** Dashboard KPI tiles may show 0 or blank for these metrics.
- **Fix:** Verify analytics query joins; add fallback `?? 0` for null aggregate results.
- **Priority:** P2 — not blocking, cosmetic impact on dashboard
- **Status:** Not fixed in this sprint — deferred to next

### [P2-002] Error messages in catch blocks may leak internal field names to API callers
- **File:** Multiple handlers in `srv/*.js`
- **Symptom:** `catch(err) { res.status(500).json({ error: err.message }) }` exposes internal CAP error details.
- **Fix:** Add error sanitiser middleware for production mode.
- **Status:** Not fixed — deferred to production hardening sprint

---

## P3 — Polish & Annotations

### [P3-001] Restrictions `effectiveFrom` mandatory field lacks `@Common.FieldControl: #Mandatory` annotation
- **File:** `app/restrictions/fiori-service.cds`
- **Symptom:** Users get "Value is required" on draftActivate without a visual asterisk indicator on the field.
- **Fix:** Add `@Common.FieldControl: #Mandatory` to `effectiveFrom` annotation.
- **Status:** Not fixed — deferred

### [P3-002] AttributeDefinitions `label` field returns null via OData
- **File:** `db/data/bridge.management-AttributeDefinitions.csv` or seed-attributes.js
- **Symptom:** All 10 AttributeDefinition records show `label: null` via `GET /odata/v4/admin/AttributeDefinitions`.
- **Impact:** Attribute config tile shows blank field labels.
- **Status:** Not fixed — deferred

---

## CRUD Test Results Summary (API-driven UAT)

| Tile | Entity | CREATE | draftActivate | Action | Deactivate | Result |
|------|--------|--------|---------------|--------|-----------|--------|
| A2 | Bridges | ✅ | ✅ | deactivate | ✅ | PASS |
| A3 | Restrictions | ✅ | ✅ | — | ✅ | PASS |
| A3 | RestrictionProvisions (sub-table) | ✅ (via nav) | draft | — | — | PASS |
| B1 | BridgeInspections | ✅ INS-0011 | ✅ | deactivate | ✅ | PASS |
| B2 | BridgeDefects | ✅ DEF-0001 | ✅ | deactivate | ✅ | PASS |
| B3 | BridgeCapacities | ✅ | ✅ | — | — | PASS |
| B4 | BridgeConditionSurveys | ✅ CS-0002 | ✅ | submitForReview ✅, approveSurvey ✅ | — | PASS |
| B5 | BridgeLoadRatings | ✅ LR-0002 | ✅ | — | — | PASS |
| B6 | BridgeRiskAssessments | ✅ RSK-0002 | ✅ (inherentRiskScore=9, Medium) | deactivate | ✅ | PASS |
| B7 | NhvrRouteAssessments | ✅ NRA-0002 | ✅ | deactivate (FIX-001) ✅, nhvrAssessed rollback ✅ | — | PASS |
| B8 | LoadRatingCertificates | ✅ LRC-0001 | ✅ | — | — | PASS |
| B9 | BridgePermits | ✅ PM-0002 | ✅ | approve ✅ | — | PASS |
| B10 | BridgeMaintenanceActions | ✅ MA-0002 | ✅ | deactivate | ✅ | PASS |
| SAR | BridgeScourAssessments | ✅ SAR-0002 | ✅ | deactivate (mitigationStatus=Superseded) ✅ | — | PASS |

---

## Mass Upload Test Results

| Test | Dataset | Result |
|------|---------|--------|
| Validate 1 row | Bridges | valid:1, errors:0 ✅ |
| Upload 1 row | Bridges | inserted:1, updated:0 ✅ |
| Dataset list | All | 7 user-facing datasets listed ✅ |
| History endpoint | — | Sessions recorded ✅ |

---

## Custom Attributes (EAV) Test Results

| Test | Result |
|------|--------|
| `GET /attributes/api/values/Bridge/1` | 5 values returned ✅ (FIX-002) |
| `GET /attributes/api/values/bridge/1` | 5 values returned ✅ |
| `GET /odata/v4/admin/AttributeGroups` | 5 groups returned ✅ |
| `GET /odata/v4/admin/AttributeDefinitions` | 10 definitions returned ✅ (labels null — P3-002) |

---

## Feature Flags Test

| Flag | Expected | Actual |
|------|---------|--------|
| bhiBsiAssessment | false | false ✅ |
| bhiBsiOrgComparison | false | false ✅ |
| bhiBsiScourPoa | false | false ✅ |
| bhiBsiCertificationWorkflow | false | false ✅ |
| bhiBsiAdminWeightConfig | false | false ✅ |

---

## Test Suite Results

- **421/421 tests passing** after FIX-001 and FIX-002 applied
- Run time: 0.82s
- No regressions introduced

---

## Routing Targets (Reference)

- BridgesList / BridgesDetails
- BridgeCapacities / BridgeCapacitiesDetails / BridgeCapacitiesObjectPage
- BridgeRestrictions / BridgeRestrictionsDetails
- BridgeInspections / BridgeInspectionsDetails / BridgeInspectionsObjectPage
- BridgeDefects / BridgeDefectsList / BridgeDefectsObjectPage
- BridgeRiskAssessments / BridgeRiskAssessmentsList / BridgeRiskAssessmentsObjectPage
- LoadRatingCertificates / LoadRatingCertificatesDetails / LoadRatingCertificatesObjectPage
- BridgeElements / BridgeElementsDetails
- NhvrRouteAssessments / NhvrRouteAssessmentsDetails / NhvrRouteAssessmentsObjectPage
- BridgeConditionSurveys / BridgeConditionSurveysList / BridgeConditionSurveysObjectPage
- BridgeLoadRatings / BridgeLoadRatingsList / BridgeLoadRatingsObjectPage
- BridgePermits / BridgePermitsList / BridgePermitsObjectPage
- AlertsAndNotifications / AlertsAndNotificationsDetails
- BridgeInspectionElements / BridgeInspectionElementsDetails
- BridgeCarriageways / BridgeCarriagewaysDetails
- BridgeContacts / BridgeContactsDetails
- BridgeMehComponents / BridgeMehComponentsDetails
- BridgeAttributes / BridgeAttributesDetails
- AssetIQScores / AssetIQScoresList / AssetIQScoresObjectPage
- WorkOrdersList / WorkOrdersObjectPage
- GISConfig
- NetworkReports

---

## AdminService Entities (Reference)

**Core:**
- Bridges, Restrictions, BridgeRestrictions, BridgeRestrictionProvisions

**Bridge Detail Sections:**
- BridgeInspections, BridgeDefects, BridgeElements, BridgeRiskAssessments
- LoadRatingCertificates, NhvrRouteAssessments, NhvrApprovedVehicleClasses
- AlertsAndNotifications, BridgeInspectionElements, BridgeCarriageways
- BridgeContacts, BridgeMehComponents, BridgeCapacities, BridgeScourAssessments

**Hub Tiles (Phase A):**
- BridgeConditionSurveys, BridgeLoadRatings, BridgePermits

**Configuration & Metadata:**
- AssetClasses, States, Regions, StructureTypes, DesignLoads
- ConditionStates, ScourRiskLevels, PbsApprovalClasses, VehicleClasses
- AttributeGroups, AttributeDefinitions, AttributeAllowedValues, AttributeValues
- GISConfig, ReferenceLayerConfig, SystemConfig, DataQualityRules

**Risk Scoring & Audit:**
- AssetIQScores, AssetIQModels, ChangeLog, UserActivity

**System:**
- BridgeMaintenanceActions, BridgeDocuments, BridgeAttributes
- UploadSessions, BnacEnvironment, BnacObjectIdMap, BnacLoadHistory
