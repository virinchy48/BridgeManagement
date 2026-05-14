# Standards Compliance Matrix

Bridge Management System (BMS) — v1.7.2 | Updated: 2026-05-14

Each row represents a standard or regulatory framework. Status reflects the current codebase state from `.council/recon.json` and CLAUDE.md learnings. Owner refers to the BTP role-collection or team accountable for closure.

| Standard | Clause / Area | Status | Gap | Owner |
|---|---|---|---|---|
| **ISO 55000** | §6.2 Asset lifecycle stages | Partial | `lifecycleStage` and `replacementCostEstimate` fields present in extensions.cds, but no LCC model, degradation curves, or whole-of-life cost optimisation | BMS_BRIDGE_MANAGER |
| **ISO 55000** | §6.4 Risk and opportunity assessment | Partial | BridgeRiskAssessments covers ISO 31000 risk fields; no FMEA or AMAF criticality rating linked to maintenance scheduling | BMS_OPERATOR |
| **ISO 55000** | §6.6 Knowledge management / change of assets | None | No degradation curves, no remaining life prediction model; `remainingLifeYears` is a manual field on BridgeCapacities only | BMS_BRIDGE_MANAGER |
| **ISO 55000** | §6.8 Stakeholder requirements | Partial | BridgeContacts entity exists; no formal stakeholder requirement register or traceability to inspection plans | BMS_ADMIN |
| **AS 5100** | Part 1 — Scope and general principles | Partial | `designStandard`, `importanceLevel`, `seismicZone` on Bridges; no design category field as per AS 5100.1 §1.6 | BMS_INSPECTOR |
| **AS 5100** | Part 2 — Design loads (inspectionStandard enum) | Partial | `inspectionStandard` enum type on BridgeInspections; `inspectionMethodology` field added; no load model reference or traffic data linkage | BMS_INSPECTOR |
| **AS 5100** | Part 4/5 — Steel and concrete material grades | Partial | `concreteGrade`, `concreteDurabilityClass` on nhvr.Bridge (legacy entity); not on bridge.management.Bridges | BMS_INSPECTOR |
| **AS 5100** | Part 7 — Rating of existing bridges | Partial | `rfT44`, `rfSM1600`, `rfHLP400` per-class factors on LoadRatingCertificates; `ratingFactor` on BridgeCapacities; `ratingLevel` enum on LRC; no AS 5100.7 §6 fatigue check workflow | BMS_OPERATOR |
| **AP-G71.8** | Bridge inspection manual — condition states CS1–CS4 | Implemented | BridgeInspectionElements has CS1–CS4 qty and % fields with SIMS-aligned labels; `elementHealthRating` computed | BMS_INSPECTOR |
| **AP-G71.8** | Defect coding and reporting | Partial | `DefectCodes` lookup entity exists; `simsElementCode` field on BridgeDefects; `inspectionMethodology` field added; no automated defect escalation workflow beyond severity ≥3 alert | BMS_INSPECTOR |
| **AGAM** | Asset management framework — planning | Partial | `maintenancePriority` (P1–P4 TfNSW framework) on BridgeDefects; no asset management plan linkage or program budget fields | BMS_BRIDGE_MANAGER |
| **AGAM** | Inspection frequency requirements | Partial | `inspectionType` (Principal/Detailed/Routine) on BridgeInspections with accreditation guard; no automated scheduling or frequency-based overdue alerts beyond manual review | BMS_OPERATOR |
| **ISO 31000** | §6.4 Risk identification | Implemented | `inherentLikelihood`, `inherentConsequence` auto-computed; `riskRegisterStatus` lifecycle; TfNSW 5×5 matrix enforced server-side | BMS_OPERATOR |
| **ISO 31000** | §6.5 Risk treatment | Implemented | `treatmentActions`, `treatmentStatus`, `treatmentDeadline` on BridgeRiskAssessments | BMS_BRIDGE_MANAGER |
| **ISO 31000** | §6.7 Residual risk | Implemented | `residualLikelihood`, `residualConsequence`, `residualRiskScore` — NOT auto-defaulted from inherent score | BMS_OPERATOR |
| **TfNSW TS01501** | Bridge condition rating scale 1–10 | Implemented | `conditionRating` validated [1,10] in bridges.js handler; `conditionRatingTfnsw` [1,5] validated separately | BMS_INSPECTOR |
| **TfNSW TS01501** | Inspection accreditation levels | Implemented | `inspectionAccreditationLevel` guard in inspections.js — Principal and Detailed types require Level 3/4 | BMS_INSPECTOR |
| **HVNL** | Heavy vehicle route assessment | Implemented | `NhvrRouteAssessments` entity; `NhvrApprovedVehicleClasses` composition child; HVNL compliance rate KPI in dashboard | BMS_OPERATOR |
| **HVNL** | Permit approvals as legal instruments | Implemented | `BridgePermits.approve` restricted to `certify` or `admin` scope; permit records soft-deleted only | BMS_ADMIN |
| **SAP PAC** | PSTN namespace registration | Gap | Namespace `bridge.management` is not a registered PSTN namespace; SAP PAC requires a registered partner namespace for BTP Certified Apps | BMS_ADMIN |
| **SAP PAC** | BTP Certified App checklist — security | Partial | XSUAA 9-scope model implemented; `validateCsrfToken` middleware on all custom routers; Helmet CSP configured; missing: IAS integration, mTLS for service bindings | BMS_ADMIN |
| **SAP PAC** | BTP Certified App checklist — multi-tenancy | Gap | No tenant isolation implemented; single-tenant design only | BMS_ADMIN |
| **SAP PAC** | BTP Certified App checklist — accessibility | Partial | SAP Fiori Elements used for admin-bridges; custom apps use sap.m controls; no WCAG audit report produced | BMS_ADMIN |
| **ISO 25010** | Functional suitability | Partial | 18 FLP tiles with CRUD; 4 services; analytics views; gaps in EAM work order integration and SAP PM linkage | BMS_ADMIN |
| **ISO 25010** | Reliability / fault tolerance | Gap | 16 of 19 handler files lack try/catch — unhandled promise rejections can crash the CAP process | BMS_ADMIN |
| **ISO 25010** | Security — confidentiality | Partial | Row-level security via `@restrict`; `hereApiKey` excluded from AdminService projection; no data classification labelling | SECURITY_EXPERT |
| **ISO 25010** | Maintainability | Partial | Handler files separated by domain; CLAUDE.md conventions enforced; dual bridge entity (nhvr.Bridge / bridge.management.Bridges) creates maintenance burden | BMS_ADMIN |
| **ISO 25010** | Performance efficiency | Partial | ChangeLog indexed (6 indexes); `activeRestrictionCount` guarded by $select check; no formal load test results | BMS_ADMIN |
| **WCAG 2.1** | Level AA — perceivable | Partial | SAP Fiori Elements inherits WCAG AA from UI5 framework for admin-bridges; custom apps (map, dashboard) not audited | BMS_ADMIN |
| **WCAG 2.1** | Level AA — operable keyboard navigation | Partial | sap.m controls handle keyboard; Leaflet map has no keyboard navigation for feature selection | BMS_ADMIN |
| **WCAG 2.1** | Level AA — screen reader support | Unknown | No screen reader testing performed; camera capture uses programmatic DOM input which may not be accessible | BMS_ADMIN |
| **Privacy Act 1988** | APP 11 — security of personal information | Partial | `BridgeContacts` stores name, phone, mobile, email; no PII classification, data retention policy, or right-to-erasure workflow | COMPLIANCE |
| **Privacy Act 1988** | APP 3 — collection limitation | Partial | `UserActivity` entity exists; no data minimisation review or collection notice | COMPLIANCE |
| **IRAP / ISM** | ISM-0043 — access control | Partial | XSUAA role-collection based; no MFA enforcement at application layer; relies on BTP IAS configuration | COMPLIANCE |
| **IRAP / ISM** | ISM-1055 — audit logging | Partial | `ChangeLog` entity with 6 indexes; only upload.js and admin-service.js call writeChangeLogs — 17 of 19 handlers do not audit-log mutations | COMPLIANCE |
| **IRAP / ISM** | ISM-0109 — patching | Unknown | BTP managed runtime; `@sap/cds` v9, Node 20+ pinned; no automated dependency vulnerability scanning in CI | COMPLIANCE |
| **Essential Eight** | Patching applications (Maturity 1) | Partial | BTP handles runtime patching; npm dependency management manual; no Snyk/Dependabot configured | COMPLIANCE |
| **Essential Eight** | Application control | Partial | CSP `'unsafe-eval'` required for UI5 1.145 loader — reduces application control maturity | COMPLIANCE |
| **Essential Eight** | Restrict admin privileges | Implemented | `config_manager` scope separated from `admin`; `BMS_ADMIN` role not granted `config_manager` by default | COMPLIANCE |
