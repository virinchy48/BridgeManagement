# BMS UAT Fix List — Pre-Seeded Known Issues

Generated: 2026-05-22
Project: Bridge Management System (BMS)
Scope: Admin Bridges Application & Configuration

---

## Known Issues (Pre-seeded)

### [PRE-001] Missing Manifest Routing Titles
- **Component:** app/admin-bridges/webapp/manifest.json
- **Severity:** P2 — Navigation context clarity
- **Description:** 6 routing targets are missing the required `title` property. This can cause breadcrumb/navigation text to be empty or fallback to defaults.
- **Affected Targets:**
  - `GISConfig` (XML View custom)
  - `NetworkReports` (XML View custom)
  - `BridgesList` (ListReport component)
  - `BridgesDetails` (ObjectPage component)
  - `WorkOrdersList` (ListReport component)
  - `WorkOrdersObjectPage` (ObjectPage component)
- **Fix:** Add `"title"` property to each routing target definition in manifest.json
  - Example for BridgesList: `"title": "Bridges",`
  - Example for GISConfig: `"title": "GIS Configuration",`
- **Priority:** P2
- **UAT Check:** Verify breadcrumb/page titles display correctly when navigating to each route via deep links or tile clicks

---

### [PRE-002] Draft Handlers Not Configured for BridgeRestrictions
- **Component:** srv/admin-service.js
- **Severity:** P2 — Draft lifecycle management
- **Description:** `BridgeRestrictions.drafts` has a `before('NEW')` handler defined (line 619) to generate sequential IDs, but no `before('NEW', BridgeRestrictions.drafts)` hook documented in comments. Compare to Bridges and BridgeScourAssessments which both have clear before-NEW handlers logged at init.
- **Current State:**
  - `Bridges.drafts` ✓ has before('NEW') at line 380
  - `Restrictions.drafts` ✓ has before('NEW') at line 609
  - `BridgeRestrictions.drafts` ✓ has before('NEW') at line 619
  - `BridgeScourAssessments.drafts` ✓ has before('NEW') at line 970
- **Fix:** Verify all draft-enabled entities in the schema have corresponding before('NEW') handlers in admin-service.js
- **Priority:** P2
- **UAT Check:** Create a new BridgeRestriction in draft mode, verify ID generation works correctly

---

### [PRE-003] Tile Icon "sap-icon://quality-issue" Validation
- **Component:** app/appconfig/fioriSandboxConfig.json (Line 89)
- **Severity:** P3 — Visual presentation
- **Description:** The Defects tile uses `sap-icon://quality-issue`. Confirm this icon renders correctly in SAP Icon fonts (SAPUI5 v1.136.0+).
- **Current Value:** `"icon": "sap-icon://quality-issue"`
- **Tile:** Defects (BRIDGE SUB-DOMAINS group)
- **Alternative Icons (if needed):** 
  - `sap-icon://error` (red X — deprecated in favor of quality-issue)
  - `sap-icon://alert` (yellow triangle)
  - `sap-icon://warning` (alternative warning icon)
- **Priority:** P3
- **UAT Check:** Visually inspect Defects tile on Fiori Launchpad; verify icon renders without placeholder

---

### [PRE-004] All Routing Targets — Title Completeness Audit
- **Component:** app/admin-bridges/webapp/manifest.json
- **Severity:** P2 — Completeness check
- **Description:** 44 routing targets exist; only 38 have explicit `"title"` property. All targets should have descriptive titles for accessibility and UX consistency.
- **Status:** 6 targets missing (see PRE-001 for list)
- **Fix:** Complete title inventory and populate missing targets
- **Priority:** P2
- **UAT Check:** Audit all 44 routes; verify each route definition includes a meaningful title

---

### [PRE-005] ProvisionTypes Reference Data Verification
- **Component:** db/data/bridge.management-ProvisionTypes.csv
- **Severity:** P1 — Data completeness (blocking operational functionality)
- **Description:** The ProvisionTypes lookup table contains 9 codes used by the restriction provisioning engine. These must all be active and correctly defined.
- **Current Data:**
  | Code | Description | Active |
  |------|-------------|--------|
  | CWRS | Carriageway Width Restricted & Signed Detour | true |
  | DETR | Detour Route | true |
  | SUBB | Substitution Bridge | true |
  | HMLL | Height & Mass Load Limit | true |
  | CLTT | Clearance / Tolerance | true |
  | RPBL | Repair / Bridge Load Limit | true |
  | TEMP | Temporary Provision | true |
  | MNTR | Monitoring Required | true |
  | SPDI | Special Dispensation | true |
- **Row Count:** 9 records (plus header)
- **Fix:** Verify all codes are correctly mapped in the data model; ensure no typos or missing codes that restrictions depend on
- **Priority:** P1
- **UAT Check:** Create a restriction using each provision code; verify lookups resolve correctly

---

### [PRE-006] Icon Validation — All Tiles (Completeness Check)
- **Component:** app/appconfig/fioriSandboxConfig.json
- **Severity:** P3 — Visual consistency
- **Description:** All 21 tiles have been assigned SAP icons. Verify all icons are valid and render correctly in SAPUI5 v1.136.0+.
- **Icons Assigned:**
  - ✓ sap-icon://home (Dashboard)
  - ✓ sap-icon://functional-location (Bridges)
  - ✓ sap-icon://alert (Restrictions)
  - ✓ sap-icon://map-2 (Map View)
  - ✓ sap-icon://bar-chart (Network Reports)
  - ✓ sap-icon://inspection (Inspections)
  - ✓ sap-icon://quality-issue (Defects) ← *See PRE-003*
  - ✓ sap-icon://simulate (Bridge Capacity)
  - ✓ sap-icon://survey (Condition Surveys)
  - ✓ sap-icon://vehicle-repair (Load Ratings)
  - ✓ sap-icon://business-objects-experience (Risk Assessments)
  - ✓ sap-icon://map (NHVR Route Assessments)
  - ✓ sap-icon://document-text (Load Rating Certificates)
  - ✓ sap-icon://to-be-reviewed (Permits)
  - ✓ sap-icon://area-chart (Scour Assessments)
  - ✓ sap-icon://tools-opportunity (Work Orders)
  - ✓ sap-icon://upload-to-cloud (Mass Upload)
  - ✓ sap-icon://action-settings (BMS Administration)
  - ✓ sap-icon://customize (Attribute Configuration)
  - ✓ sap-icon://edit (Mass Edit)
  - ✓ sap-icon://ai (AssetIQ — Risk Intelligence)
- **Priority:** P3
- **UAT Check:** Render Fiori Launchpad and visually verify all 21 tiles display correct icons without placeholders

---

## Summary Table

| Issue ID | Component | Severity | Type | Status |
|----------|-----------|----------|------|--------|
| PRE-001 | manifest.json | P2 | Configuration | Identified |
| PRE-002 | admin-service.js | P2 | Code/Draft Lifecycle | Identified |
| PRE-003 | fioriSandboxConfig.json | P3 | Icon Validation | Identified |
| PRE-004 | manifest.json | P2 | Completeness Audit | Identified |
| PRE-005 | ProvisionTypes.csv | P1 | Reference Data | Identified |
| PRE-006 | fioriSandboxConfig.json | P3 | Icon Completeness | Identified |

---

## Notes for UAT Testers

1. **Priority P1 Issues:** Must be resolved before UAT go-live. These affect core functionality.
2. **Priority P2 Issues:** Should be resolved before UAT. These affect user experience and navigation integrity.
3. **Priority P3 Issues:** Can be addressed as polish items post-UAT or in parallel if resources permit.
4. **Reference Data:** All ProvisionTypes must be loaded before users can create restrictions. Verify data migration is complete.
5. **Draft Lifecycle:** Test all draft creation, edit, save, and activation workflows for each draft-enabled entity.

