# UAT Fix List — Bridge Management System
**Date:** 2026-04-24 | **Branch:** draftv8-btp-sid | **Environment:** LOCAL (localhost:8008)

Priority: **P1** = blocks core flow / security / data loss | **P2** = degrades UX or correctness | **P3** = polish

---

## P1 Issues

### [P1-001] Map bridge popup X button does not reliably close the dialog
- **File:** `app/map-view/webapp/fragment/FeatureDetail.fragment.xml:33` / `app/map-view/webapp/controller/Main.controller.js:851`
- **Symptom:** Clicking the Close (✕) button on the bridge feature popup does nothing — dialog persists. Programmatic `dialog.close()` works fine.
- **Expected:** Clicking ✕ closes the popup immediately.
- **Root cause:** The SAP Dialog's built-in close button (aria-label="Close") fires at the framework level but `onCloseFeaturePanel` may have `this._featureDialog` undefined if the fragment was loaded lazily and the reference not yet cached, OR a Leaflet `click` event re-opens the dialog after close. The controller code itself is correct (line 851 calls `this._featureDialog.close()`).
- **Fix:** In `onCloseFeaturePanel` add a guard: `if (this._featureDialog) this._featureDialog.close();` and log a warning if undefined. Also call `this._map.off('click')` temporarily during dialog close to prevent Leaflet re-trigger.
- **Test:** Click any bridge marker → popup opens → click ✕ → popup closes, does not reopen.
- **Persona:** All users — every bridge inspection starts here.

---

## P2 Issues

### [P2-001] PDF Bridge Card endpoint returns 404
- **File:** `srv/server.js` (admin-bridges router)
- **Symptom:** `GET /admin-bridges/api/bridges/1001/card` → 404. The "Open in Register" + card print feature is broken.
- **Expected:** Returns `text/html` with bridge details and auto-print trigger.
- **Root cause:** The `admin-bridges` Express router either isn't mounted or the route pattern doesn't match integer IDs (may expect string `bridgeId` like `BRG-NSW-SYD-001` rather than numeric `1001`).
- **Fix:** Verify the route pattern in the admin-bridges router. Check whether it expects `/bridges/:id` (integer `ID`) or `/bridges/:bridgeId` (string). Update to match the OData `ID` field.
- **Test:** `curl http://localhost:8008/admin-bridges/api/bridges/1001/card` returns 200 HTML.
- **Persona:** PO/SME — PDF card is a key deliverable for field inspectors.

### [P2-002] Missing @requires on Mass Upload service actions
- **File:** `srv/services/upload.cds:5-12`
- **Symptom:** `massUploadBridges`, `massUploadRestrictions`, `massUploadRoutes`, `massDownloadBridges` have no authorization annotation — any authenticated user can call them.
- **Expected:** Only Admin or BridgeManager role can perform mass uploads.
- **Fix:** Add `@requires: 'Admin'` (or appropriate role) to each action in `upload.cds`.
- **Test:** Call upload endpoint as a non-admin user → 403 response.
- **Persona:** Security auditor.

### [P2-003] Missing @requires on massEditBridges action
- **File:** `srv/services/mass-edit.cds:17`
- **Symptom:** The massEditBridges action lacks explicit authorization — relies solely on default entity grant.
- **Expected:** Explicit role restriction.
- **Fix:** Add `@requires: 'Admin'` or `@restrict: [{ grant: 'WRITE', to: ['Admin','BridgeManager'] }]`.
- **Test:** Non-admin user attempts mass edit → 403.
- **Persona:** Security auditor.

### [P2-004] MassUpload — No CSRF token on POST calls (will fail in BTP/XSUAA)
- **File:** `app/bms-admin/webapp/controller/MassUpload.controller.js:232,290`
- **Symptom:** Validate and Upload fetch calls POST directly without `X-CSRF-Token` header. Works in local `dummy` auth but silently fails in BTP with XSUAA enabled.
- **Expected:** All mutating calls go through `_mutate(url, method, body)` which fetches a CSRF token first.
- **Fix:** Add `_getCsrfToken()` and `_mutate()` helpers per CLAUDE.md pattern, wire all POST calls through them.
- **Test:** Enable XSUAA locally (or deploy to BTP sandbox) — upload still succeeds.
- **Persona:** Dev / Security auditor.

### [P2-005] MassEdit — No CSRF token on save POST (will fail in BTP/XSUAA)
- **File:** `app/mass-edit/webapp/controller/MassEdit.controller.js:173-176`
- **Symptom:** `onSave()` POSTs to `api/bridges/save` or `api/restrictions/save` with only `Content-Type` header — no `X-CSRF-Token`. Will 403 in production.
- **Fix:** Same `_getCsrfToken()` / `_mutate()` pattern.
- **Test:** Save in BTP env → 200, not 403.
- **Persona:** Dev / Security auditor.

### [P2-006] MassUpload — CSV + "All Datasets" not rejected client-side
- **File:** `app/bms-admin/webapp/controller/MassUpload.controller.js:239`
- **Symptom:** User can select a `.csv` file then set dataset to "All" and click Upload — the server rejects it but the error is confusing. CLAUDE.md says add client-side guard.
- **Expected:** Before calling API, check `if (file.endsWith('.csv') && dataset === 'All')` → show clear error message.
- **Fix:** Add validation in `onValidate`/`onUpload` before the fetch call.
- **Test:** Select CSV, set All → friendly inline error before any API call.
- **Persona:** New user — confused by server-side error message.

### [P2-007] NaN can be passed as lat/lng to proximity endpoint
- **File:** `srv/server.js:1317`
- **Symptom:** `Number(undefined)` = `NaN`. If `lat` or `lng` query params are missing, `NaN` is passed to `loadProximityBridges()` without a finiteness guard.
- **Expected:** Return 400 with descriptive error if lat/lng are not finite numbers.
- **Fix:** After `Number(lat)`, add `if (!isFinite(lat) || !isFinite(lng)) return res.status(400).json({error:'lat/lng required'})`.
- **Test:** `curl "/map/api/proximity?lat=abc&lng=foo"` → 400, not 500.
- **Persona:** Security auditor / Power user using API directly.

---

## P3 Issues

### [P3-001] MassUpload — Hard-coded `/mass-upload/api` BASE_URL
- **File:** `app/bms-admin/webapp/controller/MassUpload.controller.js:137,159,232,290,355`
- **Symptom:** BASE_URL is hard-coded as `/mass-upload/api`. In BTP the origin differs — routes break.
- **Fix:** Drive from `manifest.json` data source, read via `this.getOwnerComponent().getManifestEntry('/sap.app/dataSources/massUploadApi/uri')`.
- **Persona:** Dev (BTP deployment).

### [P3-002] MassUpload — "Inserted" tile label not updated to "Valid" in validate-only mode
- **File:** `app/bms-admin/webapp/controller/MassUpload.controller.js` (`_showResults`)
- **Symptom:** After Validate Only, the results tile is labelled "Inserted" — users think data was written.
- **Fix:** Dynamically set tile header: `"Valid"` during validate, `"Inserted"` during upload.
- **Persona:** New user — misleading UX.

### [P3-003] MassUpload — Upload confirm dialog text does not reflect selected dataset
- **File:** `app/bms-admin/webapp/controller/MassUpload.controller.js` (confirm dialog)
- **Symptom:** Dialog text hard-codes "bridge records / Bridge ID" — wrong for Restrictions and lookup datasets.
- **Fix:** Use `this.byId("datasetSelect").getSelectedItem().getText()` in dialog message.
- **Persona:** New user / PO/SME.

### [P3-004] ChangeLogs OData entity does not exist (404)
- **File:** `srv/services/admin-service.cds` (or equivalent)
- **Symptom:** `GET /odata/v4/admin/ChangeLogs` → 404. Change Documents screen likely uses a custom REST endpoint, not OData.
- **Note:** If Change Documents is working via a separate custom route, this is informational. Verify the actual endpoint the ChangeDocuments controller calls.
- **Test:** Open Change Documents, click Search Records, check Network tab for actual API URL.
- **Persona:** Dev — good to document the non-OData data path.

### [P3-005] BMS Admin ToolPage unusable below ~600px viewport width
- **File:** `app/bms-admin/webapp/view/BmsAdminShell.view.xml`
- **Symptom:** At 477px viewport (preview browser default), the side nav covers 100% width. Nav items are visible but clicking them doesn't show content panel — user sees blank grey screen.
- **Fix:** Either set a minimum viewport meta hint (`width=device-width, minimum-scale=1`) or add a `SplitApp`-style mobile layout. In the shell XML, set `sideExpanded="false"` by default on mobile breakpoint.
- **Persona:** Mobile user / New user on small screen.

### [P3-006] Dynamic property lookup in execRule without allowlist
- **File:** `srv/server.js:1582,1586,1590,1592`
- **Symptom:** `bridge[field]` where `field` comes from database rules — defense-in-depth improvement.
- **Fix:** Validate `field` against `ALLOWED_RULE_FIELDS` before lookup.
- **Persona:** Security auditor.
