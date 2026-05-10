# Phase A — Architecture Vision
## Bridge Management System (BMS) v1.1.0

**TOGAF ADM Phase:** A — Architecture Vision  
**Document version:** 1.1.0  
**Date:** 2026-05-10  
**Status:** Approved for UAT

---

## 1. Problem Statement

State road asset managers in NSW operate with bridge condition, restriction, and load rating data scattered across spreadsheets, legacy NHVR portals, and individual network drives. This creates:

- **Inspection latency:** Condition findings take days to reach restriction decision-makers.
- **Compliance risk:** Expired load rating certificates (LRCs) are not surfaced proactively — AS 5100.7 mandates periodic re-rating.
- **Restricted access:** External stakeholders (councils, freight carriers) have no self-service view of posting restrictions without phoning TfNSW.
- **Audit gaps:** No immutable record of who changed a restriction and when (NSW Roads Act 1993 §121–124 requirement).

---

## 2. Architecture Vision Statement

> **Bridge Management System** is a cloud-native SAP BTP application that consolidates bridge asset records, inspection findings, load rating certificates, and posting restrictions into a single source of truth — with role-gated views for each persona and a public card for external stakeholders — enabling TfNSW road asset managers to make faster, auditable decisions on bridge posting and maintenance prioritisation.

---

## 3. Goals and Drivers

| # | Goal | Driver |
|---|---|---|
| G1 | Single source of truth for bridge condition, restrictions, and LRCs | Reduce data scatter across 6 spreadsheet silos |
| G2 | Role-based access — admin, manager, inspector, executive, external | TfNSW security policy; NSW Privacy Act |
| G3 | Proactive LRC expiry alerting (configurable threshold, default 90 days) | AS 5100.7 §4.3 periodic re-rating obligation |
| G4 | Immutable change audit trail on all restrictions | NSW Roads Act 1993 §121–124; internal audit requirement |
| G5 | Mass upload for bulk bridge and restriction data migration | Migration from legacy spreadsheets at go-live |
| G6 | Public bridge card — unauthenticated, restriction-only view | External carrier/council self-service; reduce TfNSW call centre volume |
| G7 | BTP cloud deployment — HANA, XSUAA, HTML5 repo | TfNSW enterprise cloud strategy (SAP BTP mandate) |
| G8 | Future S/4HANA integration for maintenance order creation | Existing SAP investment; reduce double-entry |

---

## 4. Scope

### In Scope (v1.1.0)
- Bridge master data management (create, edit, mass upload)
- Bridge inspection event recording and history
- Bridge element inventory (structural components, condition ratings)
- Bridge posting restrictions (BridgeRestrictions entity — posting-specific)
- Load rating certificates (AS 5100.7, with expiry alerting)
- NHVR restriction registry (Restrictions entity — linked to NHVR)
- Custom attribute framework (extensible metadata per bridge/restriction)
- Bulk data upload (Excel/CSV) for all 6 major object types
- Role-gated Fiori Elements UI (6 personas, 12 HTML5 apps)
- Public bridge information card (unauthenticated external view)
- Audit trail (change log per restriction/bridge record)
- BTP deployment (Cloud Foundry, HANA HDI, XSUAA, HTML5 Repo)

### Out of Scope (v1.1.0)
- S/4HANA maintenance order creation (stub present, URL configured via SystemConfig)
- NHVR portal live data feed (planned integration, ADR-005)
- Mobile offline sync (planned, ADR-003)
- GIS/geospatial map editing (map-view app is read-only v1.1.0)
- Financial/cost tracking (bridge rehabilitation cost estimation only)

---

## 5. Stakeholder Map

| Stakeholder | Role | Primary Concern |
|---|---|---|
| TfNSW Road Asset Manager | BMS_BRIDGE_MANAGER | Bridge condition accuracy, restriction lifecycle |
| Bridge Inspector (field) | BMS_INSPECTOR | Recording inspection findings on tablet, photo capture |
| BMS System Administrator | BMS_ADMIN | User management, lookup data, system configuration |
| NSW Operations Officer | BMS_OPERATOR | Restriction management for their state region |
| Executive / Director | BMS_EXECUTIVE_VIEWER | KPI summary — open defects, expired LRCs, critical bridges |
| Freight Carrier / Council | BMS_EXTERNAL_VIEWER | What restrictions apply to this bridge, right now |
| Read-only Stakeholder | BMS_VIEWER | View bridges, restrictions, maps (no edits) |
| SAP BTP Platform Team | Infrastructure | Deployment, HANA HDI, XSUAA configuration |
| Internal Audit | Compliance | Change logs, access records |

---

## 6. Architecture Principles

| Principle | Statement |
|---|---|
| **Data model first** | CDS entities define the schema; all services and UIs derive from the canonical model |
| **Scope-gated at service layer** | `@requires` annotations and `requireScope()` middleware enforce roles; UI persona-switching is secondary |
| **No hardcoded configuration** | S/4HANA URLs, alert thresholds, and feature flags are stored in the `SystemConfig` entity, managed via BMS Admin |
| **Audit by default** | Every restriction change writes an immutable `ChangeLogs` entry; mass upload writes to `AuditLog` |
| **External access is read-only and scoped** | `PublicBridgeService` exposes only restriction-safe fields; `bridges-public` app is unauthenticated and served from a separate HTML5 route |
| **Draft-enabled editing** | All editable Fiori apps use CAP draft to prevent data loss on interrupted sessions |

---

## 7. Key Performance Indicators (Architecture-Level)

| KPI | Target | Measurement |
|---|---|---|
| Time from inspection to restriction update | < 24 hours | Audit log timestamp delta |
| LRC expiry false-negative rate | 0% | Alert config test suite |
| Mass upload throughput | 10,000 bridge rows < 60s | Load test on HANA HDI |
| Public card page load (cold) | < 2s P95 | BTP Application Logs |
| Role enforcement failures (wrong scope accessing data) | 0 | Security pen test + scope middleware coverage |
