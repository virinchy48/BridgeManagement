# Changelog

All notable changes to the Bridge Management System are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub Actions CI/CD pipeline (cds compile → npm test → mbt build)
- DB indexes on Bridges, BridgeDefects, BridgeInspections, AlertsAndNotifications
- Rate limiting on all Express API routers (500 req/15 min general; 10 req/min upload)
- Structured logging with correlation IDs on all requests
- SAP BTP Application Autoscaler and Alert Notification services in MTA
- Expert council validation script (`scripts/expert-council-validate.js`)
- Self-healing test runner (`scripts/self-test-and-heal.js`)
- 10 new integration test files covering all 18 mass-upload entities

## [1.2.0] - 2026-05-13

### Added
- All 18 mass-upload datasets verified: create / update / soft-delete
- LookupValues admin screen for enabling/disabling allowed values
- `UploadSessions.mode` field (create/update/upsert) for upload session tracking
- 3 new sub-domain entities: BridgeConditionSurveys, BridgeLoadRatings, BridgePermits
- BHI/BSI multi-modal scoring engine (feature-flagged: `feature.bhiBsiAssessment`)
- AssetIQ persisted scoring with 5-factor BCI model
- Feature flags system with cascade-disable and UI toggle screen
- Demo data with 3 DEMO bridges (NSW, VIC, QLD) and full sub-domain records
- Custom attributes EAV system with group/definition/value hierarchy

### Fixed
- `buildHeaderRow` double-asterisk bug on display-name columns (BridgeCarriageways, Contacts, MEH, InspectionElements)
- CSV importer dispatch for 4 datasets using inline `importRows` method syntax
- `fioriSandboxConfig.json` trailing comma breaking all FLP navigation intents
- UI5 `xmlns:data` missing from FeatureFlags.view.xml causing component load failure

## [1.1.0] - 2026-05-11

### Added
- 9 new standalone CRUD sub-domain tiles: Inspections, Defects, Capacities, Condition Surveys, Load Ratings, Permits, Risk Assessments, Scour Assessments, NHVR Route Assessments
- Bridge Details redesigned as navigation hub (removed inline 7-section monolith)
- Expert council UX review across 6 personas (PO/SME, Power user, New user, Mobile, Accessibility, Security)
- AS 5100 / HVNL / Austroads AGBM standard references on key fields
- CDS enum types for InspectionStandard, RatingLevel, LoadRatingVehicleClass, LoadRatingMethod
- Soft-delete (deactivate/reactivate) on BridgeInspections, BridgeDefects, BridgeRiskAssessments
- Severity-4 defect auto-creates AlertsAndNotifications (deduplication guard)
- Load rating expiry auto-alert (90-day warning)
- TfNSW 5×5 risk matrix with correct thresholds (Low ≤4, Medium 5–9, High 10–14, Extreme ≥15)
- `inherentRiskScore` auto-computed in AdminService handler (was only in BridgeManagementService)
- BSI virtual field formula (structural + width + barrier + route alt components, capped 100)
- `activeRestrictionCount` batch GROUP BY for list report (was single-record, always returned 0)

### Fixed
- Reports API querying wrong entity (`nhvr.Bridge` → `bridge.management.Bridges`)
- `criticalDefectFlag` not on `bridge.management.Bridges` — replaced with `conditionRating >= 4` proxy
- Stale FLP intents for removed BridgeHierarchy and bridges-public tiles

## [1.0.0] - 2026-05-09

### Added
- Initial BMS deployment to SAP BTP trial (us10-001)
- Bridge Master Record CRUD with Fiori Elements OData draft
- Restrictions Register with standalone tile
- NHVR Route Assessments
- Load Rating Certificates (supersede lifecycle)
- 56 real Australian bridges + 5,152 synthetic NSW bridges seed data
- Mass Upload (Bridges, Restrictions, 8 lookup datasets)
- Mass Edit (Bridge fields, grid-based)
- Dashboard KPIs and Network Reports
- Map View (Leaflet with OpenStreetMap + reference layers)
- Change Documents (ChangeLog audit trail)
- Custom Attributes (EAV) for bridge extensibility
- XSUAA auth with 9 scopes + 8 role templates
- CSP headers via Helmet; CSRF token middleware

[Unreleased]: https://github.com/your-org/BridgeManagement/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/your-org/BridgeManagement/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/your-org/BridgeManagement/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/your-org/BridgeManagement/releases/tag/v1.0.0
