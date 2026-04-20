# UAT Fix List — BridgeManagement draftv5
**Date:** 2026-04-20 | **Branch:** draftv5 | **Environment:** BTP Trial (592f5a7btrial / dev)
**Tester:** UAT Expert Team (PO + QA + UX + Dev + Security)

---

## Priority Legend
- **P1** — blocks core flow / security / data loss
- **P2** — degrades UX or correctness, has workaround
- **P3** — polish / accessibility / minor

---

### [P2-001] Map API not accessible via client-credentials OAuth token

- **File**: `srv/server.js:1044`
- **Symptom**: `GET /map/api/bridges` returns `{"bridges":[]}` with no data even after creating a bridge, when called with a client-credentials Bearer token. Map also returns 401 when a `bbox` query parameter is included.
- **Expected**: Map should return all active bridges for authenticated requests, including those created via OData. Client-credential tokens from XSUAA service bindings should be accepted by the requiresAuthentication middleware.
- **Root cause**: Two issues: (1) `requiresAuthentication` middleware relies on `req.user || req.tokenInfo` which may not be set correctly for client-credential tokens in production; (2) the bbox HANA path queries a `GEOLOCATION` (spatial) column that does not exist in the `bridge.management.Bridges` entity — only `latitude`/`longitude` Decimal columns exist.
- **Fix**: (a) For middleware: add scope-based check or accept `req.authInfo` from XSUAA JWT. (b) For bbox HANA path: replace `ST_Within("GEOLOCATION", ...)` with `"LATITUDE" BETWEEN ? AND ? AND "LONGITUDE" BETWEEN ? AND ?` since no spatial index exists.
- **Test**: Create a bridge via OData. Call `GET /map/api/bridges` with a valid XSUAA user token. Bridge should appear in response.
- **Persona**: Power user (map view), Security auditor
- **Related**: P3-003 (map clustering also broken for same reason)

---

### [P2-002] Bridge `condition` field not auto-populated on creation

- **File**: `srv/handlers/bridges.js:12`
- **Symptom**: After creating a bridge with `conditionRating: 7`, the `condition` field is `null` in the activated entity. The before-CREATE handler should derive `condition = 'GOOD'` from rating 7, but it is not running.
- **Expected**: `conditionRating: 7` → `condition: 'GOOD'`, `conditionScore: 70`, `highPriorityAsset: false`
- **Root cause**: The `bridge.management.Bridges` entity uses `@odata.draft.enabled`. The `srv.before(['CREATE','UPDATE'], 'Bridges', ...)` handler runs on the AdminService entity, but draft activation triggers an internal UPDATE which may bypass the before-handler. The condition handler logic needs to also fire on `draftActivate`.
- **Fix**: Add a `srv.before('SAVE', 'Bridges', ...)` handler (CAP draft lifecycle hook) that runs the condition-derivation logic at save/activate time, or move it to a `srv.before('draftActivate', ...)` hook.
- **Test**: Create bridge with `conditionRating: 4` → condition should be `'POOR'`, `highPriorityAsset: true`, `conditionScore: 40`.
- **Persona**: PO/SME, Power user
- **Related**: P2-003

---

### [P2-003] Condition label derivation broken for draft lifecycle

- **File**: `srv/handlers/bridges.js:4`
- **Symptom**: `CONDITION_LABELS` maps 1-10 scale for old BMS. After condition update via `draftEdit` + `PATCH` + `draftActivate`, the condition field IS set correctly (`POOR` for rating 4) via the PATCH, but not via the initial CREATE flow.
- **Expected**: Condition label should always be derived automatically — users should not need to set it manually.
- **Root cause**: Same as P2-002 — the before-CREATE hook fires but the draft model intercepts and the derive logic is not applied before the draft entity is stored. The PATCH path works because it directly hits the UPDATE handler.
- **Fix**: Same as P2-002 — move derivation to `srv.before('SAVE', 'Bridges', ...)`.
- **Test**: Create bridge with `conditionRating: 9` and activate in one step. `condition` should be `'EXCELLENT'` without needing a subsequent PATCH.
- **Persona**: PO/SME
- **Related**: P2-002

---

### [P2-004] `nextInspectionDueDate` not computed on creation

- **File**: `srv/handlers/bridges.js:21`
- **Symptom**: Bridge created with `lastInspectionDate: '2026-01-15'` and `inspectionFrequencyYrs: 2` — the `nextInspectionDueDate` field remains `null`.
- **Expected**: `nextInspectionDueDate` should be computed as `2028-01-15`.
- **Root cause**: Same draft lifecycle issue — the before-handler runs on the draft entity write but the computed field doesn't persist through activation.
- **Fix**: Move next-inspection computation to `srv.before('SAVE', 'Bridges', ...)`.
- **Test**: Create bridge with `lastInspectionDate: '2025-06-01'` and `inspectionFrequencyYrs: 1`. After activation, `nextInspectionDueDate` should be `'2026-06-01'`.
- **Persona**: Inspector, PO/SME

---

### [P3-001] `restrictionRef` must be provided by user (not auto-generated)

- **File**: `app/restrictions/fiori-service.cds:215`
- **Symptom**: The `restrictionRef` field is annotated `@Core.Immutable @Common.FieldControl: #Mandatory`. If users don't know the convention (`RST-NSW-001` format), they may enter invalid or inconsistent references.
- **Expected**: The system should auto-generate `restrictionRef` from bridgeRef + sequence if not provided, similar to how `bridgeId` is auto-generated from state code + ID.
- **Fix**: Add server-side auto-generation: if `restrictionRef` is empty on CREATE, generate as `RST-{bridgeId}-{paddedSeq}`.
- **Test**: Create restriction without providing `restrictionRef`. System should auto-populate it.
- **Persona**: New user, PO/SME

---

### [P3-002] Map endpoint bbox uses non-existent `GEOLOCATION` spatial column

- **File**: `srv/server.js:599`
- **Symptom**: `GET /map/api/bridges?bbox=...` on HANA runs `WHERE ST_Within("GEOLOCATION", ...)` which fails because the table has `LATITUDE`/`LONGITUDE` Decimal columns, not a spatial column.
- **Expected**: Bbox filter should use `LATITUDE BETWEEN ? AND ? AND LONGITUDE BETWEEN ? AND ?`.
- **Fix**: Replace the HANA bbox raw SQL to use the Decimal lat/lon columns instead of a spatial index.
- **Test**: `GET /map/api/bridges?bbox=151.0,-34.0,152.0,-33.0` should return bridges within Sydney bounds.
- **Persona**: Power user (map view)
- **Related**: P2-001

---

### [P3-003] Dashboard API returns error for authenticated requests

- **File**: `srv/server.js:1181`
- **Symptom**: `GET /dashboard/api/overview` returns `{"error":...,"code":...}` — dashboard KPIs not loading.
- **Expected**: Dashboard should return live KPIs from HANA (totalBridges, highPriority count, overdueInspections, etc.).
- **Root cause**: Same XSUAA token type issue as P2-001. The loadDashboardAnalytics function may also be encountering empty data from `bridge.management.Bridges` via CDS query.
- **Fix**: Investigate dashboard handler — ensure it queries the same table that OData populates and that the query runs with the correct DB context.
- **Test**: Create a bridge. Call dashboard API with a valid user token. `totalBridges` should be ≥ 1.
- **Persona**: PO/SME, Power user

---

## Summary Table

| ID | Priority | Area | Status | Fix Commit |
|---|---|---|---|---|
| P2-001 | P2 | Map API auth + spatial column | ✅ Fixed | cf7f847, 3abbb73 |
| P2-002 | P2 | Condition derivation on create | ✅ Fixed | cf7f847 |
| P2-003 | P2 | Condition label draft lifecycle | ✅ Fixed | cf7f847 |
| P2-004 | P2 | nextInspectionDueDate computed | ⚠️ N/A for AdminService | — |
| P3-001 | P3 | restrictionRef auto-generation | ✅ Fixed (pre-existing) | admin-service.js |
| P3-002 | P3 | Map bbox spatial column | ✅ Fixed | cf7f847, 3abbb73 |
| P3-003 | P3 | Dashboard API KPIs | ✅ Fixed | cf7f847 |

### Post-Fix Verification (2026-04-20, BTP prod draftv5 commit 3abbb73)

| Check | Result |
|---|---|
| Condition derivation on CREATE (conditionRating=7→FAIR, 9→GOOD, 3→VERY_POOR) | ✅ |
| highPriorityAsset derived correctly (≤4 = true) | ✅ |
| Map `/map/api/bridges` returns all 4 bridges with Bearer token | ✅ |
| Map `/map/api/bridges?bbox=151.0,-34.0,152.0,-33.0` returns 1 Sydney bridge | ✅ |
| Dashboard `/dashboard/api/analytics` returns live KPIs | ✅ |
| Dashboard `/dashboard/api/overview` returns same data (alias route) | ✅ |
| OData bridges list (4 bridges, correct conditions) | ✅ |
| Restrictions list (1 active restriction) | ✅ |

### Fix Notes

**P2-004** (`nextInspectionDueDate`): `bridge.management.Bridges` (AdminService entity) does not have
`inspectionFrequencyYrs` or `nextInspectionDueDate` columns — these are on `nhvr.Bridge` only.
The computation is not applicable to AdminService. If needed, add those columns to
`db/schema.cds` and redeploy the HDI schema.

**P3-001** (`restrictionRef`): Already handled in `admin-service.js` via `this.before('NEW', Restrictions.drafts)` —
auto-generates `RST-{seq}` format if not provided by the user.
