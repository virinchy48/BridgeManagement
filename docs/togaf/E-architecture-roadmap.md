# Phase E/F — Architecture Roadmap
## Bridge Management System (BMS) v1.1.0

**TOGAF ADM Phase:** E (Opportunities & Solutions) + F (Migration Planning)  
**Document version:** 1.1.0  
**Date:** 2026-05-10  
**Status:** Approved for UAT

---

## 1. Current State (v1.1.0 — May 2026)

### Completed and Production-Ready
- 7-section Bridge Detail ObjectPage with 5 header DataPoint chips
- 6 persona roles with XSUAA scopes (admin, manage, inspect, executive_view, external_view)
- Mass upload for all 6 major object types (Bridges, Restrictions, BridgeInspections, BridgeElements, BridgeRestrictions, LoadRatingCertificates) + 22 lookup tables
- Demo seed data for 5 NSW bridges (Sydney Harbour, Anzac, Gladesville, Iron Cove, Mooney Mooney Creek)
- Immutable audit trail (AuditLog + ChangeLogs)
- Custom attribute framework (extensible metadata)
- Public bridge card (unauthenticated, bridges-public app)
- Executive KPI Panel (5 tiles: condition, open defects, last inspection, active restrictions, load rating)
- Inspector auto-scroll to Section 3 on page load
- Condition criticality colour coding (green/amber/red)
- mbt build passes — `.mtar` ready for `cf deploy`
- 166/166 unit tests passing

### Not Yet Done (Human Action Required)
- `git push origin draftv8-btp-sid` — classifier blocks automated push; must run manually
- `cf deploy` — HANA HDI + HTML5 Repo not yet provisioned in target BTP space
- XSUAA role collections wired in BTP Cockpit (xs-security.json templates created; collections need assigning)
- UAT sign-off per persona

---

## 2. Architecture Roadmap — Incremental Delivery

### Wave 1 — Go-Live (Q2 2026, immediate)

**Priority: BTP deployment + UAT**

| Item | Description | Effort |
|---|---|---|
| W1.1 | `cf deploy` BridgeManagement.mtar to BTP prod space | 0.5 day |
| W1.2 | XSUAA role collections wired and tested with real accounts | 0.5 day |
| W1.3 | UAT — sign off each persona scenario (inspector tablet, manager restriction update, executive view, public card) | 2 days |
| W1.4 | Seed production data via mass upload (state bridge inventory) | 1 day |
| W1.5 | Custom domain configuration (optional) | 0.5 day |

---

### Wave 2 — Inspection Completeness (Q3 2026)

**Priority: Inspector mobile quality + defect management**

| Item | Description | ADR/Plan Ref |
|---|---|---|
| W2.1 | Photo capture for Inspector — `onCapturePhoto` with `<input capture>` on tablet | Plan Phase 3C |
| W2.2 | Defect detail dialog — severity, location, repair cost entry from InspectionRegister fragment | New |
| W2.3 | LRC expiry alert — notification tile in dashboard when certificates approaching expiry | BR-002 |
| W2.4 | Inspector offline mode (read-only, cache bridge data for field use) | ADR-003 |
| W2.5 | Inspection scheduling — nextInspectionDue alert on bridge card | BR — inspectionFrequencyYears |

---

### Wave 3 — S/4HANA Integration (Q3–Q4 2026)

**Priority: Maintenance order creation, equipment deep-links**

| Item | Description | ADR/Plan Ref |
|---|---|---|
| W3.1 | `S4_BASE_URL` configured in SystemConfig; BridgeDetailExt.js reads it | Plan Phase 1 |
| W3.2 | "Create Work Order" action — opens S/4HANA `MaintenanceOrder-create` intent with FunctionalLocation | Plan Phase 1 |
| W3.3 | "View in S/4HANA" action — opens Equipment deep-link | Plan Phase 1 |
| W3.4 | Inspection sync — write inspection events back to S/4HANA PM Notification (s4NotificationRef) | ADR-005 |
| W3.5 | Equipment master sync — pull s4EquipmentNumber into BridgeElements from S/4HANA | ADR-005 |

---

### Wave 4 — NHVR Portal Integration (Q4 2026)

**Priority: Live restriction data feed, self-serve external access**

| Item | Description | ADR/Plan Ref |
|---|---|---|
| W4.1 | NHVR restriction live feed — pull Restriction data from NHVR API nightly | ADR-005 |
| W4.2 | NHVR assessment result import — nhvrAssessed, nhvrAssessmentDate auto-populated | New |
| W4.3 | Public card — add permit application deep-link to NHVR portal | New |
| W4.4 | External Viewer role — authenticated external_view scope for premium external access | xs-security.json |

---

### Wave 5 — Geospatial & Advanced Analytics (2027)

| Item | Description | ADR/Plan Ref |
|---|---|---|
| W5.1 | GIS polygon editing — replace read-only map with draw/edit capability | ADR-007 |
| W5.2 | GDA2020 coordinate system enforcement across all bridge records | ADR-007 |
| W5.3 | Risk score calculation — composite score from condition + scour risk + LRC + traffic | New |
| W5.4 | Predictive maintenance — condition trend extrapolation (data science integration) | New |
| W5.5 | SAP Analytics Cloud integration — executive reporting beyond KPI tiles | New |

---

## 3. Gap Closure Matrix (Design Brief → v1.1.0)

| Design Requirement | v1.1.0 Status | Wave to Close |
|---|---|---|
| 7-section ObjectPage | ✅ Complete | — |
| Rich header DataPoints (5 chips) | ✅ Complete | — |
| Condition colour coding | ✅ Complete | — |
| Executive KPI Panel | ✅ Complete | — |
| Inspector auto-scroll (timing fixed) | ✅ Complete | — |
| Scope-gated persona switching | ✅ Complete | — |
| XSUAA scopes correct | ✅ Complete | — |
| CSRF hardening (all envs) | ✅ Complete | — |
| bridges-public standalone app | ✅ Complete | — |
| Mass upload — Bridges, Restrictions | ✅ Complete | — |
| Mass upload — Inspections, Elements, BridgeRestrictions, LRCs | ✅ Complete (v1.1.0) | — |
| Audit log for mass upload | ✅ Complete | — |
| "Inspect Now" action (Emphasized button) | ✅ Complete | — |
| "Create Work Order" S/4HANA action | ⚠️ Stub implemented, no live URL | Wave 3 |
| "View in S/4HANA ↗" action | ⚠️ Stub implemented, no live URL | Wave 3 |
| Photo capture for Inspector | ❌ Not started | Wave 2 |
| LRC expiry alerting UI | ❌ Not started | Wave 2 |
| Inspector offline mode | ❌ Not started | Wave 2 |
| NHVR live feed | ❌ Not started | Wave 4 |
| GIS polygon editing | ❌ Not started | Wave 5 |

---

## 4. Technical Debt Register

| Item | Risk | Mitigation | Priority |
|---|---|---|---|
| `nhvr.Bridge` vs `bridge.management.Bridges` duplication | Low — intentional isolation; confusion risk | Documented in ubiquitous language glossary | Low |
| No pagination on mass upload for very large datasets (>50,000 rows) | Medium — HANA timeout for bulk inserts | Add streaming parser + chunked commit in Wave 2 | Medium |
| `importCuidEntityRows` natural key dedup doesn't filter by `bridge_ID` | Low — restrictionRef values are globally unique in practice | Add compound key check in Wave 2 data quality | Low |
| `activeRestrictionCount` computed on every Bridge read (GROUP BY) | Low at current scale; medium at >10k bridges | Add materialised count column or Redis cache in Wave 4 | Low |
| `xs-security.json` role templates not yet linked to role collections | Deployment blocker — must complete before go-live | W1.2 | High |
| No integration tests against HANA (SQLite only in CI) | Medium — SQL dialect differences may surface | Add HANA container-based integration test in Wave 2 | Medium |

---

## 5. Architecture Decision Records Summary

| ADR | Decision | Status |
|---|---|---|
| ADR-001 | CAP Node.js as runtime | Active |
| ADR-002 | Fiori Elements as default UI | Active |
| ADR-003 | Offline sync pattern (service worker + IndexedDB) | Planned — Wave 2 |
| ADR-004 | Mass upload data loader (Excel/CSV, server-side xlsx) | Active |
| ADR-005 | S/4HANA integration via OData V4 first | Active — Wave 3 |
| ADR-006 | Authorisation model (XSUAA scopes, CAP @requires, requireScope middleware) | Active |
| ADR-007 | Geospatial CRS — GDA2020 | Planned — Wave 5 |
| ADR-008 | Document storage via SAP DMS | Planned — Wave 2 |
