# BMS UAT Tile Report — 2026-05-12

**Environment:** Local dev — worktree `distracted-hofstadter-c3d77a`  
**URL:** http://localhost:8008/fiori-apps.html  
**Auth:** dummy (local)  
**UI5 version:** 1.145.0  
**CAP version:** @sap/cds v9.8.5  
**Date:** 2026-05-12  
**Tester:** UAT Expert Team (multi-agent)

---

## Baseline Row Counts (OData at test start)

| Entity | Count |
|--------|-------|
| Bridges | 56 |
| BridgeInspections | 10 |
| BridgeDefects | 7 |
| Restrictions | 3 |
| BridgeCapacities | 0 |
| LoadRatingCertificates | 0 |
| BridgeConditionSurveys | 0 |
| BridgeLoadRatings | 0 |
| BridgePermits | 0 |
| AssetIQScores | 0 |

---

## Executive Summary

All **5 targeted UAT acceptance criteria** passed after fixes applied this session. **19/19 FLP tiles** navigate without error dialogs. Two additional bugs (LRC ratingFactor field error, AssetIQ missing manifest route) were discovered and fixed during the tile navigation sweep.

**Deployment readiness verdict: CONDITIONALLY READY** — all 5 acceptance criteria met. The 5 code fixes committed in this session should be merged to `main` before BTP deployment.

### Top 3 Findings

1. **P1 — Worktree / main project divergence**: Four fixes present in main project were absent from the worktree. The preview server runs from the WORKTREE, not `~/39 18042026/`. Any future UAT sessions must verify the worktree file state independently of the main project.

2. **P2 — LRC ratingFactor stale field reference**: The Load Rating Certificates list report was broken silently — no error dialog shown to users, but OData binding failed to populate the list. Discovered via console log audit during tile sweep.

3. **P2 — AssetIQ tile had no manifest route**: The AssetIQ FLP tile produced silent stale content (showed the previously-loaded route). Fixed by adding the missing `AssetIQScoresList` route and target to manifest.json.

---

## UAT Acceptance Criteria Results

| # | Target | Result | Fix Applied |
|---|--------|--------|-------------|
| 1 | `#BmsAdmin-manage` loads without UI component error | ✅ PASS | CSP `unsafe-eval` added to `srv/server.js` |
| 2 | Attribute Configuration tab — no flicker | ✅ PASS | JSONModel single-instance pattern (prior fix) |
| 3 | Mass Upload dropdown — user datasets only | ✅ PASS | `templateOnly` filter in `mass-upload.js` |
| 4 | Bridge Details — no AssetIQ tab | ✅ PASS | Removed `RiskIntelligence` CollectionFacet |
| 5 | Full 19-tile navigation — no blocking errors | ✅ PASS | All tiles resolve; 2 additional bugs fixed |

---

## Tile-by-Tile Results

### OPERATIONS Group

#### A1 — Dashboard (`#Dashboard-display`)
- **Route:** `/dashboard/webapp`
- **Result:** ✅ PASS
- **Observations:** Shows "56 Total Assets" KPI. Condition distribution chart rendered. State filter chips visible (NSW, VIC, QLD, etc.). No console errors.

#### A2 — Bridges (`#Bridges-manage`)
- **Route:** `/admin-bridges/webapp`
- **Result:** ✅ PASS
- **Observations:** 56 bridge records in list. Filter bar with State, Region, LGA, Condition filters. Create button visible. No error dialog.

#### A3 — Restrictions (`#Restrictions-manage`)
- **Route:** `/restrictions/webapp`
- **Result:** ✅ PASS
- **Observations:** "Restrictions Registry" header. 3 seed restriction records. Create button present.

#### A4 — Map View (`#Map-display`)
- **Route:** `/map-view/webapp`
- **Result:** ✅ PASS
- **Observations:** Leaflet map loaded. OpenStreetMap basemap tiles visible. Bridge markers present across Australia. No CSP tile-blocking errors.

#### A5 — Network Reports (`#Bridges-manage&/NetworkReports`)
- **Route:** inner app route via `Bridges-manage`
- **Result:** ✅ PASS
- **Observations:** Title "Network Health" shown. Custom XMLView route resolves correctly.

### BRIDGE SUB-DOMAINS Group

#### B1 — Inspections (`#Bridges-manage&/BridgeInspections`)
- **Result:** ✅ PASS
- **Observations:** Filter bar with Bridge, Inspection Type, Status. Create button present. 10 seed records visible after Go.

#### B2 — Defects (`#Bridges-manage&/BridgeDefects`)
- **Result:** ✅ PASS
- **Observations:** Subtitle "View-Only — Create via Inspections". 7 seed records. No error.

#### B3 — Bridge Capacity (`#Bridges-manage&/BridgeCapacities`)
- **Result:** ✅ PASS
- **Observations:** Empty list (0 records). Create button present. Filter bar visible.

#### B4 — Condition Surveys (`#Bridges-manage&/BridgeConditionSurveys`)
- **Result:** ✅ PASS
- **Observations:** Empty list. Create button present. Filter bar with Bridge, Survey Type, Status.

#### B5 — Load Ratings (`#Bridges-manage&/BridgeLoadRatings`)
- **Result:** ✅ PASS
- **Observations:** Empty list. Create button present. Vehicle Class filter uses enum value help.

#### B6 — Risk Assessments (`#Bridges-manage&/BridgeRiskAssessments`)
- **Result:** ✅ PASS
- **Observations:** Empty list. Create button present.

#### B7 — NHVR Route Assessments (`#Bridges-manage&/NhvrRouteAssessments`)
- **Result:** ✅ PASS
- **Observations:** Empty list. Create button present.

#### B8 — Load Rating Certificates (`#Bridges-manage&/LoadRatingCertificates`)
- **Result:** ✅ PASS (after fix)
- **Observations:** Pre-fix: OData error `Invalid (navigation) property 'ratingFactor'` caused list to fail silently. Post-fix (`ratingFactor` → `rfT44`): list loads cleanly with correct columns. No console errors.
- **Bug fixed:** P2-001

#### B9 — Permits (`#Bridges-manage&/BridgePermits`)
- **Result:** ✅ PASS
- **Observations:** Empty list. Create button present. Permit Type, Status filter bar visible.

### BMS BUSINESS ADMIN Group

#### C1 — Mass Upload (`#MassUpload-display`)
- **Result:** ✅ PASS (after fix)
- **Observations:** Dataset selector shows 15 user-facing datasets. No lookup tables (StateTypes, BridgeTypes, etc.) visible. Pre-fix showed 37 items. CSV / Excel upload supported.

#### C2 — BMS Administration (`#BmsAdmin-manage`)
- **Result:** ✅ PASS (after fix)
- **Observations:** Pre-fix: "Failed to load UI5 component" error. Post-fix: loads to Change Documents tab. Version badge shows `v1.0.0 · LOCAL`. Navigation sidebar includes all admin screens.

#### C3 — Attribute Configuration (`#AttributesAdmin-manage`)
- **Result:** ✅ PASS
- **Observations:** Groups list loads without flicker. JSONModel single-instance pattern confirmed. Group items visible (Bridge Groups, Restriction Groups).

#### C4 — Mass Edit (`#MassEdit-manage`)
- **Result:** ✅ PASS
- **Observations:** Grid table visible. Bridge records displayed. Field columns editable inline.

#### C5 — AssetIQ — Risk Intelligence (`#Bridges-manage&/AssetIQScores`)
- **Result:** ✅ PASS (after fix)
- **Observations:** Pre-fix: silently showed stale Permits list (no manifest route). Post-fix: "Risk Scores" ListReport with correct columns (AssetIQ Score, RAG Status, BCI Factor, Defect Factor, Model). Filter bar: Bridge, RAG Status, Model Version. "No results found" expected (no scores computed on fresh DB). Challenge Score action button visible in table toolbar.
- **Bug fixed:** P2-002

---

## Bridge Details ObjectPage — Target 4 Verification

Navigate to `http://localhost:8008/fiori-apps.html#Bridges-manage&/Bridges(ID=1,IsActiveEntity=true)`

**Tabs visible (8, no AssetIQ):**
1. Executive Summary
2. Location & Ownership
3. Physical Structure
4. Map
5. Inspection Status
6. Traffic & NHVR
7. External Systems
8. Custom Attributes

**Verdict:** ✅ No "Risk Intelligence (AssetIQ)" tab present. AssetIQ accessible only via dedicated FLP tile.

---

## Phase 7 — Persistence Integrity

No writes were performed during this UAT session. Baseline counts unchanged:
- Bridges: 56 ✅
- BridgeInspections: 10 ✅
- BridgeDefects: 7 ✅
- All other entities: 0 ✅

No UAT- prefixed test data created (read-only session).

---

## Test Data Catalogue

No test data created this session. All testing used seed data only.

---

## Issues Cross-Reference

| Issue ID | Tile | Severity | Status |
|----------|------|----------|--------|
| P1-001 | C2 BMS Administration | P1 | ✅ Fixed |
| P1-002 | C1 Mass Upload | P1 | ✅ Fixed |
| P1-003 | A2 Bridges (Bridge Details) | P1 | ✅ Fixed |
| P2-001 | B8 Load Rating Certificates | P2 | ✅ Fixed |
| P2-002 | C5 AssetIQ | P2 | ✅ Fixed |
| P3-001 | All sub-domain tiles | P3 | ⚠️ Known limitation |

---

## Appendix A — Functional Inventory

19 FLP tiles tested:

| # | Tile | Hash | Result |
|---|------|------|--------|
| 1 | Dashboard | `#Dashboard-display` | ✅ |
| 2 | Bridges | `#Bridges-manage` | ✅ |
| 3 | Restrictions | `#Restrictions-manage` | ✅ |
| 4 | Map View | `#Map-display` | ✅ |
| 5 | Network Reports | `#Bridges-manage&/NetworkReports` | ✅ |
| 6 | Inspections | `#Bridges-manage&/BridgeInspections` | ✅ |
| 7 | Defects | `#Bridges-manage&/BridgeDefects` | ✅ |
| 8 | Bridge Capacity | `#Bridges-manage&/BridgeCapacities` | ✅ |
| 9 | Condition Surveys | `#Bridges-manage&/BridgeConditionSurveys` | ✅ |
| 10 | Load Ratings | `#Bridges-manage&/BridgeLoadRatings` | ✅ |
| 11 | Risk Assessments | `#Bridges-manage&/BridgeRiskAssessments` | ✅ |
| 12 | NHVR Route Assessments | `#Bridges-manage&/NhvrRouteAssessments` | ✅ |
| 13 | Load Rating Certificates | `#Bridges-manage&/LoadRatingCertificates` | ✅ (after fix) |
| 14 | Permits | `#Bridges-manage&/BridgePermits` | ✅ |
| 15 | Mass Upload | `#MassUpload-display` | ✅ (after fix) |
| 16 | BMS Administration | `#BmsAdmin-manage` | ✅ (after fix) |
| 17 | Attribute Configuration | `#AttributesAdmin-manage` | ✅ |
| 18 | Mass Edit | `#MassEdit-manage` | ✅ |
| 19 | AssetIQ — Risk Intelligence | `#Bridges-manage&/AssetIQScores` | ✅ (after fix) |

---

## Appendix B — Worktree vs Main Project Divergence Note

The BMS preview server runs from the git worktree at:
`/Users/siddharthaampolu/39 18042026/.claude/worktrees/distracted-hofstadter-c3d77a`

NOT from the main project at `/Users/siddharthaampolu/39 18042026`.

Four of the five P1/P2 fixes found in this session existed in the main project but were absent from the worktree. Future UAT sessions must verify worktree file state before testing. Recommended pre-UAT check:

```bash
# Verify key files match main project
diff worktree/srv/server.js ../srv/server.js
diff worktree/srv/mass-upload.js ../srv/mass-upload.js
diff worktree/app/admin-bridges/fiori-service.cds ../app/admin-bridges/fiori-service.cds
```
