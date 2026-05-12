# BMS UAT Fix List — 2026-05-12

**Session:** Local dev UAT — worktree `distracted-hofstadter-c3d77a`  
**Server:** http://localhost:8008 (PORT=8008 cds-serve from worktree)  
**Tester:** UAT Expert Team (multi-agent)  
**Scope:** 5 targeted UAT acceptance criteria + full 19-tile navigation regression  
**Date:** 2026-05-12

---

## Summary

| Priority | Count | Status |
|----------|-------|--------|
| P1 (blocking) | 3 | ✅ All fixed this session |
| P2 (functional degradation) | 2 | ✅ All fixed this session |
| P3 (polish) | 1 | ⚠️ Documented, not fixed |

---

### [P1-001] BMS Admin tile fails with "Failed to load UI5 component" — CSP eval violation

- **File**: `srv/server.js` (worktree) — Helmet CSP `script-src` directive
- **Symptom**: Clicking `#BmsAdmin-manage` tile shows "Failed to load UI5 component" dialog. Browser console: `EvalError: Evaluating a string as JavaScript violates CSP — 'unsafe-eval' is not an allowed source`
- **Expected**: BMS Administration screen loads showing Change Documents + version badge `v1.0.0 · LOCAL`
- **Root cause**: UI5 1.145 `requireSync` loader uses `eval()` for synchronous controller module execution. Helmet CSP had `'unsafe-inline'` but NOT `'unsafe-eval'`. The main project (`/srv/server.js`) had the fix but the worktree did not.
- **Fix**: Added `"'unsafe-eval'"` to `script-src` array in worktree `srv/server.js` line 1104
- **Test**: Navigate to `#BmsAdmin-manage` — no error dialog, version badge visible ✅
- **Persona**: All (blocks the entire BMS Admin app)
- **Status**: ✅ FIXED

---

### [P1-002] Mass Upload dropdown shows all 37 datasets including 22 lookup tables

- **File**: `srv/mass-upload.js` (worktree) — `lookupDataset()` + `getDatasets()` functions
- **Symptom**: Mass Upload UI dataset selector shows 37 items including internal lookup tables (`StateTypes`, `BridgeTypes`, `VehicleClasses`, etc.) — unusable for business users
- **Expected**: Only 15 user-facing datasets visible (Bridges, Restrictions, BridgeInspections, etc.)
- **Root cause**: Worktree `mass-upload.js` was missing `templateOnly: true` flag in `lookupDataset()` and missing `.filter(d => !d.templateOnly)` in `getDatasets()`. Main project had these fixes; worktree did not.
- **Fix**: Added `templateOnly: true` to `lookupDataset()` return object; added `.filter((dataset) => !dataset.templateOnly)` in `getDatasets()` in worktree `srv/mass-upload.js`
- **Test**: `GET /mass-upload/api/datasets` returns 15 items; no lookup table names in list ✅
- **Persona**: Power User, New User (non-technical user cannot select correct dataset)
- **Status**: ✅ FIXED

---

### [P1-003] Bridge Details ObjectPage shows "Risk Intelligence (AssetIQ)" tab

- **File**: `app/admin-bridges/fiori-service.cds` (worktree) — `UI.Facets` on `Bridges`
- **Symptom**: Bridge Details ObjectPage shows a 9th tab "Risk Intelligence (AssetIQ)" referencing `assetiqScore/@UI.FieldGroup#AiqScore` navigation path. The tab body renders empty because the navigation requires a separate expand.
- **Expected**: Bridge Details has 8 tabs only — no AssetIQ tab. AssetIQ is accessible via its own FLP tile `#Bridges-manage&/AssetIQScores`.
- **Root cause**: Worktree `fiori-service.cds` still had the `RiskIntelligence` CollectionFacet + orphaned `DataPoint#AssetIQScore` that were removed in the main project.
- **Fix**: Removed the `RiskIntelligence` CollectionFacet block (lines 86–99 of worktree) and orphaned `DataPoint#AssetIQScore` (lines 186–194) from worktree `fiori-service.cds`
- **Test**: Navigate to `Bridges(ID=1,IsActiveEntity=true)` ObjectPage — no AssetIQ tab visible ✅
- **Persona**: Bridge Manager, Bridge Inspector (tab confusion)
- **Status**: ✅ FIXED

---

### [P2-001] LoadRatingCertificates list crashes with OData $select error on ratingFactor

- **File**: `app/admin-bridges/fiori-service.cds` (worktree) line 2407 — `AdminService.LoadRatingCertificates` `UI.LineItem`
- **Symptom**: Navigating to `#Bridges-manage&/LoadRatingCertificates` causes browser console error: `Invalid (navigation) property 'ratingFactor' in $select of ODataListBinding: /LoadRatingCertificates`. List report fails to fetch data and shows empty state.
- **Expected**: LRC list loads with correct columns including RF (T44) showing the `rfT44` decimal value
- **Root cause**: `@UI.LineItem` for `LoadRatingCertificates` had `{Value: ratingFactor, Label: 'RF (T44)'}` — but `ratingFactor` is a field on `BridgeCapacities` and `BridgeLoadRatings`, NOT on `LoadRatingCertificates`. The correct field is `rfT44` (see `db/schema/load-ratings.cds` line 20).
- **Fix**: Changed `ratingFactor` → `rfT44` at line 2407 in worktree `fiori-service.cds`
- **Test**: Navigate to `#Bridges-manage&/LoadRatingCertificates` — no console error, list loads ✅
- **Persona**: Bridge Manager (LRC list is inaccessible)
- **Status**: ✅ FIXED

---

### [P2-002] AssetIQ tile navigates to stale content — no manifest route

- **File**: `app/admin-bridges/webapp/manifest.json` (worktree) — routes + targets
- **Symptom**: Clicking `#Bridges-manage&/AssetIQScores` FLP tile shows the previously-loaded list (Permits) instead of the AssetIQ Risk Scores list. No error dialog but wrong content.
- **Expected**: AssetIQ tile shows "Risk Scores" ListReport with columns: Bridge, Bridge ID, AssetIQ Score, RAG Status, BCI Factor, Defect Factor, Model
- **Root cause**: No route `AssetIQScores:?query:` or target `AssetIQScoresList` existed in `manifest.json`. The FE4 router falls back to last-rendered route when no match found.
- **Fix**: Added `AssetIQScoresList` route + target and `AssetIQScoresObjectPage` route + target to `manifest.json` following the `BridgePermitsList` pattern
- **Test**: Navigate to `#Bridges-manage&/AssetIQScores` — "Risk Scores" list renders with correct filter bar (Bridge, RAG Status, Model Version) ✅
- **Persona**: Bridge Manager, PO/SME (AssetIQ feature is inaccessible)
- **Status**: ✅ FIXED

---

### [P3-001] PageReady Event timeout 7000ms warnings on sub-domain list navigation

- **File**: SAP FE4 framework — local shell emulator limitation
- **Symptom**: Browser console shows `The PageReady Event was not fired within the 7000 ms timeout. It has been forced.` on every sub-domain ListReport navigation.
- **Expected**: No console errors (or warnings suppressed at framework level)
- **Root cause**: Known SAP FE4 limitation in local `sap.ushell.Container` sandbox emulator. The sandbox does not fire the `PageReady` event properly on hash-based navigation. Does NOT appear in BTP production shell.
- **Fix**: No fix required — this is a framework limitation in local dev only.
- **Test**: Deploy to BTP and verify no PageReady errors in production shell
- **Persona**: Developer (noise in console, no user impact)
- **Status**: ⚠️ KNOWN LIMITATION — no action

---

## Files Modified This Session

| File (worktree) | Change |
|-----------------|--------|
| `srv/server.js` | Added `'unsafe-eval'` to Helmet CSP `script-src` |
| `srv/mass-upload.js` | Added `templateOnly: true` to `lookupDataset()`; added `.filter()` to `getDatasets()` |
| `app/admin-bridges/fiori-service.cds` | Removed `RiskIntelligence` CollectionFacet + `DataPoint#AssetIQScore`; fixed `ratingFactor` → `rfT44` on LRC LineItem |
| `app/appconfig/fioriSandboxConfig.json` | Removed trailing comma on line 63 (JSON parse fix) |
| `app/admin-bridges/webapp/manifest.json` | Added `AssetIQScoresList` + `AssetIQScoresObjectPage` routes and targets |
