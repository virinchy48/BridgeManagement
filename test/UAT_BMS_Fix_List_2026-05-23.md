# BMS UAT Fix List — 2026-05-23

**App:** Bridge Management System v1.x (local dev, port 8008)  
**Tester:** UAT Expert Team (PO/SME · QA · UX · Dev · Security)  
**Date:** 2026-05-23  
**Baseline:** 56 Bridges · 10 Inspections · 7 Defects · 5 LRCerts  

---

## Summary

| Priority | Count |
|---|---|
| P1 | 0 |
| P2 | 1 |
| P3 | 4 |
| **Total** | **5** |

**Deployment Readiness: ✅ READY** — No P1 blockers. All 19 tiles load. All 13 entity types support CREATE + EDIT. All records persist in list reports. UAT bridge appears on Map View.

---

## P2 Issues

### [P2-001] Work Orders list — Bridge ID column blank
- **File**: `app/admin-bridges/fiori-service.cds` (WorkOrdersList UI.LineItem)
- **Symptom**: B10 Work Orders list report shows MA-0001 with blank Bridge ID column, even though the record has `bridge_ID=1` correctly set in the DB.
- **Expected**: Bridge ID column shows "BRG-NSW-001" (resolved via `bridge.bridgeId` navigation path).
- **Root cause**: The `@UI.LineItem` annotation for `BridgeMaintenanceActions` likely references `bridge.bridgeId` but the `bridge` association navigation path is not expanding correctly, OR the annotation uses `bridge_ID` (integer) instead of `bridge.bridgeId` (string).
- **Fix**: In `app/admin-bridges/fiori-service.cds`, check the `WorkOrdersList` LineItem annotation. Replace `{ Value: bridge_ID }` with `{ Value: bridge.bridgeId, Label: 'Bridge ID' }`. Ensure `bridge` association is included in `$expand` or annotated with `@Common.Text`.
- **Test**: Navigate to `#Bridges-manage&/WorkOrdersList`, verify MA-0001 row shows "BRG-NSW-001" in Bridge ID column.
- **Persona**: End User, Bridge Manager
- **Related**: P3-003 (bridge ID column pattern)

---

## P3 Issues

### [P3-001] SystemConfig demoModeActive 404 on BMS Admin load
- **File**: `app/bms-admin/webapp/controller/*.js` (likely Shell.controller.js)
- **Symptom**: On navigating to `#BmsAdmin-manage`, network shows `GET /odata/v4/admin/SystemConfig('demoModeActive') → 404`. Console shows a "not found" warning.
- **Expected**: No 404. Demo mode was removed — the query should have been removed with it.
- **Root cause**: BMS Admin controller still has a `_checkDemoMode()` or similar call that queries `SystemConfig('demoModeActive')` after the demo feature was removed.
- **Fix**: Grep `bms-admin/webapp` for `demoModeActive` and remove the SystemConfig fetch. Or add a seed row `bridge.management-SystemConfig.csv` with `key=demoModeActive, value=false` to satisfy the query.
- **Test**: Navigate to `#BmsAdmin-manage`, verify no 404 for demoModeActive in network tab.
- **Persona**: Dev, OPS Engineer

### [P3-002] i18n en_GB locale files missing — 404 on every app load
- **File**: `app/*/webapp/i18n/` (all 10 UI5 apps)
- **Symptom**: Every app navigation produces multiple `GET .../i18n/i18n_en_GB.properties → 404`. Benign but pollutes network log and may slow initial load with unnecessary fallback requests.
- **Expected**: Either `i18n_en_GB.properties` exists (even as an empty file) or the UI5 supportedLocales config excludes `en_GB`.
- **Root cause**: UI5 automatically tries `en_GB` and `en` locale files. Only `i18n.properties` (default) exists.
- **Fix**: Add `"supportedLocales": [""]` to each app's `manifest.json` under `sap.ui5.models.i18n` config to suppress locale variant lookups. Or create empty `i18n_en.properties` and `i18n_en_GB.properties` stubs in each app.
- **Test**: Navigate to each app, verify no i18n 404s in network tab.
- **Persona**: Dev, OPS Engineer

### [P3-003] BridgeDefects list — 7 seed records show blank Bridge ID
- **File**: `db/data/bridge.management-BridgeDefects.csv`
- **Symptom**: B2 Defects list shows 7 legacy seed defects with blank Bridge ID column. These have `bridge_ID=1001` which does not exist in the Bridges table (max ID=57).
- **Expected**: All defect rows show a resolved bridge ID, or orphan seed data is cleaned up.
- **Root cause**: Seed defects reference `bridge_ID=1001` (old seed data) but the Bridges table uses IDs 1-57.
- **Fix**: Update `db/data/bridge.management-BridgeDefects.csv` to use valid `bridge_ID` values (1-5). Or delete the orphan seed rows.
- **Test**: After fix and `cds deploy`, navigate to B2 Defects — all rows show valid Bridge ID.
- **Persona**: Data Steward, End User

### [P3-004] C3 Attribute Config (#AttributesAdmin-manage) — requires full page reload from FLP hash navigation
- **File**: `app/appconfig/fioriSandboxConfig.json` (local dev) — inbound URL for AttributesAdmin-manage
- **Symptom**: Navigating via `window.location.hash = '#AttributesAdmin-manage'` from within BMS Admin app context loads the BMS Admin shell instead of the Attributes Admin app. Requires a full `window.location.href` assignment to load correctly.
- **Expected**: Hash navigation `#AttributesAdmin-manage` from any FLP context opens the standalone Attributes Admin app.
- **Root cause**: Known FLP sandbox limitation — cross-app intent navigation from within an already-loaded app doesn't always trigger a full component switch when the target is a different FLP app registered under a different sap.app.id.
- **Fix**: This is a known FLP sandbox behaviour, not a code bug. In production BTP, the real FLP shell handles this correctly. No fix required in code; document as a local dev limitation.
- **Test**: Open `fiori-apps.html` fresh, click Attribute Config tile directly — it opens correctly.
- **Persona**: End User (local dev limitation only)

---

## No-Issue Areas (confirmed clean)

| Area | Result |
|---|---|
| OData 403 errors (any tile) | ✅ None |
| OData 500 errors (any tile) | ✅ None |
| Missing Create button on any tile | ✅ All tiles have Create |
| Draft activation failures (all 13 entities) | ✅ All succeed after mandatory field population |
| Map View bridge count | ✅ Shows 57 (includes UAT bridge) |
| Network Reports KPIs | ✅ 57 bridges, state breakdown correct |
| Mass Upload wizard loads | ✅ All 4 tabs, dataset selector, upload modes |
| BMS Admin loads | ✅ Change Documents, Attribute Changes tabs |
| Attribute Config loads | ✅ Bridge + Restriction groups, all Active |

---

*Generated by UAT Expert Team · 2026-05-23*
