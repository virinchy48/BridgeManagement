# Changelog

All notable changes to the Bridge Management System are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/). Versions correspond to `mta_version` in `mta.yaml` and `.council/recon.json`.

---

## [Unreleased]

### Known gaps pending resolution
- `inspections.js` auto-ref uses `.replace('INS-','')` instead of regex match — NaN risk on malformed last record
- 16 of 19 handler files lack try/catch — unhandled promise rejections can crash the CAP process
- Missing BTP connectivity service in `mta.yaml` for outbound HTTP calls in `srv/external-api.js`
- Audit trail missing from 17 of 19 handler files (`writeChangeLogs` only called from `upload.js` and `admin-service.js`)

---

## [1.7.2] — 2026-05-14

### Added
- CI/CD pipeline configuration (`cf-deploy.yml`, structured logging with correlation IDs)
- SAC Analytics OData service and external REST API (`srv/external-api.js`)
- 10 real NSW bridges replacing 3 generic demo bridges, with full sub-domain data (inspections, defects, risk assessments, restrictions, load ratings, permits, condition surveys)
- Risk matrix ObjectPage extension (`RiskMatrixExt`) using plain-object `sap.ui.define` pattern
- Cascade deactivate/reactivate propagation from parent restrictions to child restriction provisions
- Work Orders, Restriction Provisions, Notifications, QR/PDF bridge card, Help & Info buttons (Phase 3+4)
- Network Reports expert council redesign aligned to RMS/AS5100/SAP EAM standards
- Batch element entry, upload row-level results display, inspection draft guard
- Phase 4 BHI/BSI multi-modal engine (`srv/bhi-bsi-engine.js`), AssetIQ scoring (`AssetIQScores` entity, `scoreAllBridges()` action)
- Feature flag system (`SystemConfig` category `Feature Flags`, `srv/feature-flags.js`, Feature Flags admin screen)
- `BridgeConditionSurveys`, `BridgeLoadRatings`, `BridgePermits` standalone CRUD tiles
- 21 HIGH-priority field gaps closed against AS 5100 / SIMS / AGAM / NHVR HVNL standards (7 new CDS enum types in `db/schema/enum-types.cds`)
- `BridgeDefects` promoted to standalone architecture — inspection link made optional
- `NhvrApprovedVehicleClasses` composition child of `NhvrRouteAssessments`
- Sub-domain entities: `BridgeInspectionElements`, `BridgeCarriageways`, `BridgeContacts`, `BridgeMehComponents`
- `BridgeScourAssessments` bridge value-help annotation fixed (was `@UI.Hidden`)
- `AlertsAndNotifications` system-generated entity with acknowledge/resolve/suppress actions
- `KPISnapshots` entity; `refreshKPISnapshots()` AdminService action for per-state daily snapshots
- `BnacObjectIdMap` navigation from Bridges via `extend projection` pattern
- Expert council UX review applied to Bridge Details ObjectPage (Physical Structure, Inspection Status, External Systems tabs)
- `Documents & Map` tab consolidated — attachments into Administration anchor, map into PhysicalStructure anchor
- `assessmentId` auto-generation (RSK-NNNN) in `srv/handlers/risk-assessments.js`
- `surveyRef` (CS-NNNN), `ratingRef` (LR-NNNN), `permitRef` (PM-NNNN) auto-generation with regex pattern
- `AdminService.before(['CREATE','UPDATE'], BridgeRiskAssessments)` handler to mirror BMS service risk scoring
- BHI/NBI virtual fields on Bridges — feature-flag guarded
- `initFeatureFlags(oComponent)` in Component.js; `visible=` bindings for feature-flagged tabs

### Fixed
- `conditionRating` and `lastInspectionDate` removed from AdminService `requiredFields.Bridges` — blocked new bridge creation
- FLP sample SAP apps suppressed from BMS home page via `bootstrapConfig.mergeApplications: false` and `Object.defineProperty` groups freeze
- `AttributeConfig.controller.js` flickering — replaced per-load JSONModel creation with named models updated in-place
- `LoadRatingCertificates` `ratingFactor` field reference replaced with `rfT44` — prevented LRC list from loading
- CSP `'unsafe-eval'` added to Helmet `script-src` for UI5 1.145 `requireSync` loader
- `AssetIQScores` tile showing Permits list — added `AssetIQScoresList` + `AssetIQScoresObjectPage` routes to `manifest.json`
- Trailing comma in `fioriSandboxConfig.json` line 63 — broke all FLP navigation intents
- BridgeDocuments handler using string entity name to avoid undefined ref on BTP
- Risk matrix binding context fix; document attachment sub-tables for Inspections and Defects
- Lookup values bulk upload via `AllowedValues` DATASETS entry with `ALLOWED_VALUES_WHITELIST` security boundary
- Demo data replaced with 10 real NSW bridges using `DEMO-` prefix pattern for idempotent activation

### Changed
- Demo mode (`loadDemoData`/`clearDemoData`) removed from `admin-service.cds`, `server.js`, `Shell.view.xml`, `Shell.controller.js`, `manifest.json`; `srv/demo-handler.js` deleted
- `BridgeRestrictions` and `BridgeElements` changed from `Composition of many` to `Association to many` for standalone CRUD (removes draft constraint)
- `BridgeScourAssessmentDetail` changed from Composition to Association
- `BridgeDefects.inspection` association changed from `@mandatory` to optional for standalone creation
- `defectSeverity` auto-alert threshold corrected to severity ≥ 3 (was incorrectly ≥ 1 — lowest severity)
- `residualRiskScore` removed from auto-default — is now always an explicit engineering input
- TfNSW 5×5 risk matrix thresholds corrected: Low ≤4, Medium 5–9, High 10–14, Extreme ≥15 (was using old thresholds)
- `BMS_ADMIN` role-template updated to include `executive_view` + `external_view` scopes; stale SAP-generated `"admin"` template removed from `xs-security.json`
- AGENT_DOCS technical documentation suite created (`ARCHITECTURE.md`, `COMPONENTS.md`, `DEVELOPER_GUIDE.md`, `MAINTENANCE_RUNBOOK.md`, `business-processes.md`, `CODE_QUALITY_REVIEW.md`, `crud-test-report.md`, TOGAF architecture views)

### Removed
- Orphaned app directories deleted (23,329 lines): `app/bridge-hierarchy/`, `app/bridges-public/`, `app/bms-business-admin/`, `app/operations/dashboard/`, `app/operations/map-view/`
- `app/services.cds` `using from` statements pointing to deleted paths removed
- `mta.yaml` module/artifact entries for deleted apps removed
- AssetIQ tab from `admin-bridges` manifest (now standalone FLP tile)

---

## [1.7.1] — 2026-05-12

### Fixed
- HANA HDI deploy failure — `bridge.management-BridgeInspections.csv` rows truncated to exactly 12 fields
- `bridge.management-WaterwayTypes.csv` row 8 unquoted comma in description field quoted
- Stuck CF deploy operation aborted via `printf 'y\n' | cf deploy`
- CSP `img-src` and `connect-src` updated to include OSM tile CDN and Leaflet CDN sources
- FLP trailing comma bug in `fioriSandboxConfig.json`
- Draft actions require `IsActiveEntity=true` key in OData URL — documented and curl test commands updated
- `xs-app.json` public-bridge unauthenticated route added before catch-all
- `validateCsrfToken` middleware strengthened — rejects empty, short (<3 chars), and literal "fetch" tokens

### Added
- CLAUDE.md learnings: BTP deploy patterns, CSV field count rules, MTAR operation management, demo data integer PK strategy

---

## [1.7.0] — 2026-05-11

### Added
- Expert council gap-closure: `BridgeConditionSurveys` (CS-NNNN), `BridgeLoadRatings` (LR-NNNN), `BridgePermits` (PM-NNNN) entities
- Soft-delete (`active=false`) on `BridgeInspections`, `BridgeDefects`, `BridgeRiskAssessments` with `deactivate`/`reactivate` actions
- Defect severity ≥3 auto-creates `AlertsAndNotifications` record with deduplication guard
- `requiresLoadRestriction` flag on `BridgeDefects` — auto-creates Draft Restriction
- Load rating `validTo` expiry alert (90-day window) with deduplication guard
- `inherentRiskScore` always auto-computed in `before(['CREATE','UPDATE'])` handler
- Accreditation level guard for Principal and Detailed inspection types (AS 5100-2 §3.1)
- `BridgeScourAssessments` bridge value-help and `@UI.Facets` annotations
- `BridgeInspectionElements` CS1–CS4 SIMS-aligned condition state fields
- `BridgeCarriageways`, `BridgeContacts`, `BridgeMehComponents` gap entities
- 6 indexes on `ChangeLog` entity for query performance
- `AdminService` `after('READ', Bridges)` guard on `activeRestrictionCount` — only runs COUNT when field is requested
- ResizeObserver-based Leaflet `invalidateSize()` replacing fragile setTimeout
- `adminService.js` `after(['CREATE','UPDATE'], 'BridgeInspectionElements')` — resolves `bridge_ID` from inspection link
- `srv/feature-flags.js` — `KNOWN_FLAGS`, `DEPENDENCIES`, `isFeatureEnabled()`, `requireFeature()`
- `GET /system/api/features` and `PATCH /system/api/features/:key` endpoints with `config_manager` scope guard
- `BridgePermits.approve` and `BridgeConditionSurveys.approveSurvey` restricted to `certify` or `admin` scope

### Fixed
- Auto-ref sequence extraction switched from `.replace()` to regex match across all handlers — prevents DEF-0NaN, RSK-0NaN
- `reports-api.js` switched from `nhvr.Bridge` to `bridge.management.Bridges`; `criticalDefectFlag` replaced with `conditionRating >= 4` proxy; `dataQualityScore` computed inline; state filter added to all 6 endpoints
- `AdminService` `before(['CREATE','UPDATE'], 'BridgeRiskAssessments')` handler added — mirrors BMS service risk scoring
- `AttributeValues` `@readonly` annotation removed from `admin-service.cds`
- `AttributeGroups` `internalKey` NOT NULL constraint documented and enforced in UI
- `AttributeAllowedValues` FK corrected to `attribute_ID` (not `definition_ID`)

### Changed
- `BridgeDefects` standalone: `Composition of many BridgeDefects` removed from `BridgeInspections`; `inspection` association made optional
- `BridgeElements` and `BridgeScourAssessmentDetail` changed to `Association to many` for standalone CRUD
- `importanceLevel` moved to Executive Summary FieldGroup (not Traffic & NHVR)
- `nhvrAssessed`/`nhvrAssessmentDate` consolidated in NHVRApprovals tab only (removed from External Systems duplicate)
- Lat/lon `@assert.range` tightened to Australian bounding box (−44/−10, 112/154) with GDA2020 QuickInfo

---

## [1.6.x] — 2026-05 (earlier)

### Summary
UAT round 2 fixes: CSP eval error for UI5 loader, mass-upload filter reset on dataset change, AssetIQ route manifest fix, LRC `ratingFactor`→`rfT44` field correction, FLP sandbox sample app suppression.

### Added
- CLAUDE.md UAT learnings from 2026-05-12 session (worktree parity rule, IsActiveEntity draft action pattern)
- Structured CI/CD pipeline scaffold

### Fixed
- Helmet CSP missing `'unsafe-eval'` for UI5 1.145 requireSync
- `AssetIQScores` list showing wrong entity (Permits) — manifest route added
- `LoadRatingCertificates` OData error from non-existent `ratingFactor` field reference
- FLP trailing comma syntax error in `fioriSandboxConfig.json`

---

## [1.5.x] — 2026-04

### Summary
Phase 2 feature delivery: BHI/BSI scoring engine, AssetIQ model, feature flag system, dashboard KPI deep-links to NetworkReports, bridge detail tab redesign based on expert council review.

### Added
- `srv/bhi-bsi-engine.js` multi-modal BHI formula (6 transport modes)
- `srv/bhi-bsi-api.js` REST endpoints: `POST /assess`, `GET /network-summary`, `GET /mode-params`
- `AssetIQScores` and `AssetIQModels` entities; `scoreAllBridges()` action
- Feature flag system with `SystemConfig` persistence and `FeatureFlags` admin screen
- Dashboard KPI tiles deep-link to NetworkReports via `#Bridges-manage&/NetworkReports?tab=<key>`

### Changed
- Bridge Details ObjectPage redesigned by expert council (Physical Structure, Inspection Status, External Systems, Administration tabs)
- `ChangeLog` indexes added (6 total) after 45-second query time discovered in production

---

[Unreleased]: https://github.com/example/bridge-management/compare/v1.7.2...HEAD
[1.7.2]: https://github.com/example/bridge-management/compare/v1.7.1...v1.7.2
[1.7.1]: https://github.com/example/bridge-management/compare/v1.7.0...v1.7.1
[1.7.0]: https://github.com/example/bridge-management/compare/v1.6.0...v1.7.0
