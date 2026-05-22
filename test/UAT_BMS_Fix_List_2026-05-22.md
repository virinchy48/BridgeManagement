# UAT BMS Fix List — 2026-05-22
**App:** Bridge Management System v2.0.8  
**Environment:** Local dev — http://localhost:8008  
**Auth:** dummy (all scopes)  
**Tester:** UAT Expert Team (PO/SME + QA + UX + Dev + Security)  
**Scope:** All 20 tiles — A1–A5, B1–B10, C1–C3  

---

## Priority Legend
- **P1** — blocks core flow / security / data loss
- **P2** — degrades UX or correctness, has workaround
- **P3** — polish / accessibility / minor

---

## P1 Issues

*None found — no blocking defects in this UAT pass.*

---

## P2 Issues

*None found — all initially suspected P2 issues were resolved during the UAT session:*

- **Work Orders bridge column** (initially suspected P2): OData navigation resolves correctly — `bridge.bridgeName = "Lennox Bridge"` for all records. Annotation `{Value: bridge.bridgeName}` is correct. List shows bridge name. ✅ Not a defect.
- **Condition Surveys bridge_ID null** (CS-0001): Fixed during UAT by applying a draftEdit + draftActivate PATCH setting `bridge_ID` to bridge 1 (Lennox Bridge). ✅ Fixed.
- **Load Ratings bridge_ID null** (LR-0001): Fixed during UAT by same draftEdit + draftActivate PATCH. ✅ Fixed.

---

## P3 Issues

### [P3-001] Load Rating Certificates — filter bar uses raw OData property names

- **File**: `app/admin-bridges/annotations/load-ratings.cds` — field-level `@title` annotations
- **Symptom**: The B8 Load Rating Certs filter bar shows field labels `status`, `ratingStandard`, `certificateIssueDate` (raw OData names) instead of human-readable labels.
- **Expected**: Filter bar shows "Status", "Rating Standard", "Issue Date".
- **Root cause**: `status`, `ratingStandard`, `certificateIssueDate`, `certificateExpiryDate` fields lacked `@title` annotations.
- **Fix applied**: Added `@title` annotations to all four fields in `app/admin-bridges/annotations/load-ratings.cds`. ✅ Fixed.
- **Test**: Navigate to `#Bridges-manage&/LoadRatingCertificates` → filter bar shows labelled fields.
- **Persona**: New user (raw property names are confusing)

---

### [P3-002] BMS Admin — "Demo Data" navigation item still present

- **File**: `app/bms-admin/webapp/view/Shell.view.xml`, `app/bms-admin/webapp/controller/Shell.controller.js`
- **Symptom**: The BMS Admin (C2) left nav bar showed a "Demo Data" menu item. Per CLAUDE.md May 2026 cleanup, the demo handler was removed but the nav item was not.
- **Expected**: No "Demo Data" item in the nav.
- **Fix applied**: Removed `<tnt:NavigationListItem text="Demo Data" ...>` from Shell.view.xml and the `demoData` key from Shell.controller.js. ✅ Fixed.
- **Test**: Navigate to `#BmsAdmin-manage` → left nav has no "Demo Data" item.
- **Persona**: End user (dead nav item erodes trust)

---

### [P3-003] ProvisionTypes seed data — `name` and `descr` fields null

- **File**: `db/data/bridge.management-ProvisionTypes.csv`
- **Symptom**: All 9 ProvisionTypes have `name=null` and `descr=null`. The `description` (custom field) is populated. SAP FE4 value-help may render blank name entries.
- **Expected**: `name` field populated with the human-readable provision description.
- **Fix applied**: Added `name` column to `bridge.management-ProvisionTypes.csv` with values matching `description`. ✅ Fixed (requires `npx cds deploy` to reload).
- **Test**: Open Restrictions ObjectPage → Provisions & Detour tab → add row → Code dropdown shows codes WITH names.
- **Persona**: New user (blank name in dropdown is confusing)

---

## Special Checks

| Check | Result |
|-------|--------|
| P0-ATT: Attachments on Inspection ObjectPage | ✅ PASS — Documents sub-panel visible, upload/download/delete work |
| P0-CA: Custom Attributes EAV panel on Bridge Details | ✅ PASS — Group/key/value form renders correctly |
| P0-PROV: Provision codes on Restriction Provisions tab | ✅ PASS — Tab present, 9 codes seeded; P3-003 fixed |
| Risk Matrix 5×5 (B6) | ✅ PASS — L×C auto-compute; TfNSW thresholds correct |
| nhvrAssessed rollback on NHVR deactivate (B7) | ✅ PASS — Bridge.nhvrAssessed: true→false, nhvrAssessmentDate: value→null |

---

## Fixes Applied in This Session

| ID | File | Change |
|----|------|--------|
| P3-001 | `app/admin-bridges/annotations/load-ratings.cds` | Added `@title` for status, ratingStandard, certificateIssueDate, certificateExpiryDate |
| P3-002 | `app/bms-admin/webapp/view/Shell.view.xml` | Removed Demo Data nav item |
| P3-002 | `app/bms-admin/webapp/controller/Shell.controller.js` | Removed demoData key |
| P3-003 | `db/data/bridge.management-ProvisionTypes.csv` | Added `name` column |
| Data | CS-0001, LR-0001 | Set bridge_ID via draftEdit → draftActivate |
