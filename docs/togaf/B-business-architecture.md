# Phase B — Business Architecture
## Bridge Management System (BMS) v1.1.0

**TOGAF ADM Phase:** B — Business Architecture  
**Document version:** 1.1.0  
**Date:** 2026-05-10  
**Status:** Approved for UAT

---

## 1. Business Capability Map

```
BMS Business Capabilities
│
├── 1. Asset Registry Management
│   ├── 1.1 Bridge Master Data (create, update, mass import)
│   ├── 1.2 Structural Element Inventory
│   └── 1.3 Custom Attribute Framework (extensible metadata)
│
├── 2. Inspection & Condition Management
│   ├── 2.1 Inspection Event Recording
│   ├── 2.2 Defect Documentation
│   ├── 2.3 Condition Rating & Trend Tracking
│   └── 2.4 Inspector Mobile Workflow (tablet, photo capture)
│
├── 3. Load Rating & Certification
│   ├── 3.1 Load Rating Certificate (LRC) Management
│   ├── 3.2 Rating Factor Recording (T44, SM1600, HML)
│   └── 3.3 Expiry Alerting (90-day configurable threshold)
│
├── 4. Restriction Lifecycle Management
│   ├── 4.1 Bridge Posting Restriction (BridgeRestrictions)
│   ├── 4.2 NHVR Restriction Registry (Restrictions)
│   ├── 4.3 Restriction Activation / Deactivation
│   └── 4.4 Gazette & Legal Reference Tracking
│
├── 5. External & Executive Stakeholder Access
│   ├── 5.1 Public Bridge Card (unauthenticated, restriction summary)
│   ├── 5.2 Executive KPI Dashboard (condition, open defects, LRC expiry)
│   └── 5.3 Operations Dashboard (restriction map, region summary)
│
├── 6. Bulk Data Management
│   ├── 6.1 Mass Upload (Excel/CSV — 6 object types)
│   ├── 6.2 Mass Edit (batch field update across bridge set)
│   └── 6.3 Data Quality Checks (required field validation, duplicate detection)
│
├── 7. Compliance & Audit
│   ├── 7.1 Change Audit Log (immutable, per-record)
│   ├── 7.2 Access Log
│   └── 7.3 Role & Scope Administration
│
└── 8. System Configuration
    ├── 8.1 Lookup Data Management (dropdowns, code lists)
    ├── 8.2 System Parameter Management (alert thresholds, S/4HANA URL)
    └── 8.3 XSUAA Role Assignment (BTP Cockpit)
```

---

## 2. Persona Profiles

### BMS_ADMIN — System Administrator
**Typical user:** IT/SAP BTP Administrator or Senior Asset Data Manager  
**Scope:** `admin`  
**Can:** Full create/edit/delete on all entities; manage lookup data; manage system config; view all audit logs; mass upload all datasets; assign access entries  
**Cannot:** Direct BTP IAM changes (done in cockpit)

### BMS_BRIDGE_MANAGER — Bridge Manager
**Typical user:** TfNSW Road Asset Manager, Principal Engineer  
**Scope:** `manage`  
**Can:** Create/edit bridges; manage restrictions; approve restriction changes; view inspection history; download LRC reports  
**Cannot:** Delete system configuration; manage user roles

### BMS_OPERATOR — Operations Officer
**Typical user:** TfNSW District Operations Officer (state-specific)  
**Scope:** `manage` (scoped to state/region in future)  
**Can:** Manage restrictions; record condition ratings; mass upload bridge data  
**Cannot:** Delete bridge records; manage system config

### BMS_INSPECTOR — Bridge Inspector
**Typical user:** Accredited bridge inspector (field, on tablet)  
**Scope:** `inspect`  
**Can:** Record inspection events; document defects; attach photos; view bridge detail  
**Cannot:** Edit bridge master data; change restrictions; view executive/financial sections  
**UI behaviour:** Bridge Detail opens directly to Section 3 (Condition & Inspections); S6 and S7 hidden

### BMS_VIEWER — Read-Only Stakeholder
**Typical user:** Policy analyst, consultant with read-only access  
**Scope:** *(read-only, no write scopes)*  
**Can:** View all bridges, restrictions, maps, inspection history  
**Cannot:** Create or edit any data

### BMS_EXECUTIVE_VIEWER — Executive
**Typical user:** Director of Infrastructure, General Manager  
**Scope:** `executive_view`  
**Can:** View Executive KPI Panel (condition score, open defects, last inspection, active restrictions, load rating); bridge list summary  
**Cannot:** See inspection detail tabs, edit anything

### BMS_EXTERNAL_VIEWER — External Stakeholder
**Typical user:** Local government officer, freight carrier operator  
**Scope:** `external_view` (or unauthenticated via bridges-public)  
**Can:** View public bridge card — bridge name, restrictions summary, permit status  
**Cannot:** See condition scores, inspection history, defect details, financials

---

## 3. Key Business Processes

### 3.1 Bridge Inspection Workflow

```
Inspector arrives on site
    │
    ▼
Open Bridge Detail on tablet (BMS_INSPECTOR scope)
    │  → App auto-scrolls to Section 3: Condition & Inspections
    ▼
Record inspection event (date, type, inspector, standard)
    │
    ▼
Document defects (if any) — severity, location, photo
    │  → "Capture Photo" button triggers device camera
    ▼
Submit — draft activates, changes committed to HANA
    │
    ▼
Bridge Manager notified (future: workflow notification)
    │
    ▼
Bridge Manager reviews condition rating
    │
    ▼
If rating < 5: initiate restriction review workflow
```

### 3.2 Restriction Lifecycle

```
Trigger: inspection finding, LRC expiry, gazette authority
    │
    ▼
Bridge Manager creates/updates BridgeRestriction record
    │  → Required: restrictionRef, name, bridgeRef
    │  → Defaults: active = true
    ▼
Restriction record saved — audit log entry written
    │
    ▼
External stakeholders see updated restriction on public card
    │  (bridges-public app, unauthenticated)
    ▼
Periodically: Operations Officer reviews active restrictions
    │  → deactivate() action when restriction lifted
    ▼
Audit log records deactivation with timestamp and user
```

### 3.3 Load Rating Certificate (LRC) Expiry Management

```
Certificate imported (mass upload or manual entry)
    │  → certificateExpiryDate, expiryWarningDays (default 90)
    ▼
System calculates days to expiry on every read
    │
    ▼
Alert condition: expiryDate - today ≤ expiryWarningDays
    │  → UI shows warning state on LRC record
    │  → Bridge header chip shows amber condition
    ▼
AS 5100.7 §4.3: Asset manager commissions re-rating
    │
    ▼
New LRC uploaded — previous set to "Superseded"
```

### 3.4 Mass Upload Workflow

```
Prepare Excel workbook (download template from BMS)
    │  → Template includes all datasets as sheets
    │  → Dropdown examples sheet shows valid values
    ▼
Upload workbook via Mass Upload screen
    │
    ▼
Preview validation (required fields, date formats, duplicates)
    │  → Errors highlighted per row
    ▼
Confirm import — transaction committed
    │  → Audit log entries written per changed record
    ▼
Summary: N inserted, M updated, K skipped (with reasons)
```

---

## 4. Business Rules

| Rule ID | Rule | Entity | Regulatory Basis |
|---|---|---|---|
| BR-001 | Every bridge restriction must have a `restrictionRef` as natural key | BridgeRestrictions | Internal naming standard |
| BR-002 | LRC expiry warning fires at `expiryWarningDays` before `certificateExpiryDate` | LoadRatingCertificates | AS 5100.7 §4.3 |
| BR-003 | Every restriction change generates an immutable audit log entry | BridgeRestrictions, Restrictions | NSW Roads Act 1993 §121 |
| BR-004 | `active = true` is the default for all new BridgeRestrictions records | BridgeRestrictions | Operational default |
| BR-005 | LRC `certificateVersion` defaults to 1 for new certificates | LoadRatingCertificates | AS 5100.7 versioning |
| BR-006 | Inspector role cannot see S6 (Documents) or S7 (Financials) sections | UI routing | TfNSW data separation policy |
| BR-007 | Public bridge card exposes only: bridge name, location, active restrictions, permit status | PublicBridgeService | NSW Privacy Act; carrier need-to-know |
| BR-008 | Condition criticality: ≥8 = green (Good), 5–7 = amber (Fair), <5 = red (Poor/Critical) | Bridges.conditionRating | TfNSW-BIM §3.2 |
| BR-009 | Mass upload deduplication: rows with identical natural key overwrite rather than duplicate | All entities | Data quality |
| BR-010 | CSRF token is required for all state-changing API calls in all environments | All custom routers | OWASP CSRF prevention |

---

## 5. Gap Analysis (Business Architecture vs Legacy State)

| Capability | Legacy State | BMS v1.1.0 |
|---|---|---|
| Bridge master data | Multiple Excel workbooks, no single owner | Single HANA table, versioned, audited |
| Inspection records | Inspector's paper forms, scanned PDFs | Structured `BridgeInspections` entity, searchable |
| LRC tracking | Spreadsheet with manual expiry flag | `LoadRatingCertificates` entity, automated expiry warning |
| Restriction notifications | Email chain | Active `BridgeRestrictions` with public card exposure |
| External stakeholder access | Phone TfNSW | `bridges-public` app, unauthenticated, available 24/7 |
| Audit trail | None | Immutable `ChangeLogs` per restriction; `AuditLog` per bulk import |
| Executive reporting | Weekly manual PDF | Real-time Executive KPI Panel in Bridge Detail |
