# Phase D — Technology Architecture
## Bridge Management System (BMS) v1.1.0

**TOGAF ADM Phase:** D — Technology Architecture  
**Document version:** 1.1.0  
**Date:** 2026-05-10  
**Status:** Approved for UAT

---

## 1. Platform Overview

BMS is deployed on **SAP Business Technology Platform (BTP) — Cloud Foundry environment**, using the following managed services:

| BTP Service | Plan | Purpose |
|---|---|---|
| XSUAA (Authorization & Trust Mgmt) | `application` | OAuth 2.0 JWT tokens, role templates, role collections |
| SAP HANA Cloud (HDI) | `hdi-shared` | Primary persistence; CDS-generated schema via `@sap/hdi-deploy` |
| HTML5 Application Repository | `app-host` | Hosts all 13 HTML5 Fiori apps (built `.zip` artifacts) |
| HTML5 Application Repository | `app-runtime` | Serves HTML5 apps at runtime via AppRouter |
| Destination Service | `lite` | S/4HANA system URL (future) and external API destinations |
| SAP Application Logging | `lite` | Structured log forwarding from Node.js runtime |

---

## 2. Deployment Topology

```
Internet / Corporate VPN
        │
        ▼
┌─────────────────────────────────────────────────┐
│  SAP BTP Cloud Foundry (ap10 — Sydney region)  │
│                                                  │
│  ┌──────────────────────────────────────┐        │
│  │  AppRouter (approuter.nodejs)         │        │
│  │  Path: app/router                     │        │
│  │  • XSUAA token validation             │        │
│  │  • xs-app.json route forwarding       │        │
│  │  • Serves HTML5 apps from HTML5 Repo │        │
│  └───────────┬──────────────────────────┘        │
│              │                                    │
│      ┌───────┴────────┐                          │
│      │                │                          │
│      ▼                ▼                          │
│  ┌──────────┐   ┌─────────────────────────┐     │
│  │ HTML5    │   │  CAP Node.js Server      │     │
│  │ Repo RT  │   │  (BridgeManagement-srv)  │     │
│  │          │   │                          │     │
│  │ 13 apps  │   │  OData V4 services:      │     │
│  │ as .zip  │   │  • AdminService          │     │
│  │ artifacts│   │  • BridgesService        │     │
│  └──────────┘   │  • PublicBridgeService   │     │
│                 │                          │     │
│                 │  Express routers:        │     │
│                 │  • /mass-upload          │     │
│                 │  • /mass-edit            │     │
│                 │  • /audit                │     │
│                 │  • /access               │     │
│                 │  • /quality              │     │
│                 │  • /system               │     │
│                 │  • /admin-bridges        │     │
│                 │  • /bnac                 │     │
│                 │  • /public-bridge        │     │
│                 └────────────┬─────────────┘     │
│                              │                   │
│                              ▼                   │
│                   ┌─────────────────┐            │
│                   │  HANA Cloud HDI │            │
│                   │  (hdi-shared)   │            │
│                   │                 │            │
│                   │  bridge.mgmt.*  │            │
│                   │  nhvr.*         │            │
│                   └─────────────────┘            │
└─────────────────────────────────────────────────┘

Future:
        └── Destination Service → S/4HANA (via OData / RFC)
```

---

## 3. MTA Module Inventory

| MTA Module | Type | Path | Notes |
|---|---|---|---|
| `BridgeManagement-srv` | `nodejs` | `/` (root) | CAP Node.js server; bound to XSUAA, HANA, Destination |
| `BridgeManagement-db-deployer` | `hdb` | `db/` | HDI deployer; runs `@sap/hdi-deploy` on deploy |
| `BridgeManagement` (AppRouter) | `approuter.nodejs` | `app/router` | Central OAuth proxy |
| `BridgeManagement-app-deployer` | `com.sap.application.content` | — | Deploys 13 HTML5 `.zip` artifacts to HTML5 Repo |
| `BridgeManagementadminbridges` | `html5` | `app/admin-bridges` | Bridge detail Fiori app |
| `BridgeManagementmapview` | `html5` | `app/map-view` | Geospatial map |
| `BridgeManagementmassedit` | `html5` | `app/mass-edit` | Batch edit |
| `BridgeManagementrestrictions` | `html5` | `app/restrictions` | NHVR restrictions |
| `BridgeManagementbmsadmin` | `html5` | `app/bms-admin` | System admin |
| `BridgeManagementattributesadmin` | `html5` | `app/attributes-admin` | Attribute management |
| `BridgeManagementdashboard` | `html5` | `app/dashboard` | KPI dashboard |
| `BridgeManagementmassupload` | `html5` | `app/mass-upload` | Bulk upload |
| `BridgeManagementoperationsbridges` | `html5` | `app/operations/bridges` | Operations bridges |
| `BridgeManagementoperationsdashboard` | `html5` | `app/operations/dashboard` | Operations dashboard |
| `BridgeManagementoperationsrestrictions` | `html5` | `app/operations/restrictions` | Operations restrictions |
| `BridgeManagementbridgehierarchy` | `html5` | `app/bridge-hierarchy` | Hierarchy tree |
| `BridgeManagementbridgespublic` | `html5` | `app/bridges-public` | Public card (unauthenticated) |

---

## 4. Security Architecture

### 4.1 Authentication & Authorisation

```
User → AppRouter → XSUAA JWT validation → CAP @requires annotation check
                                        → requireScope() Express middleware check
```

All non-public routes use XSUAA OAuth 2.0. JWT tokens contain scope claims in the form `{xsappname}.{scope}` (e.g., `BridgeManagement-prod-...admin`).

**CAP service-level enforcement:** `@requires: 'admin'` in `.cds` files maps to the XSUAA scope name (lowercase, no prefix).

**Custom router enforcement:** All 8 Express routers call `requireScope(req, ['admin'] | ['manage'] | ['inspect'])` before executing any handler. This is belt-and-braces — CAP annotations alone are insufficient for Express routes.

### 4.2 XSUAA Role Templates and Role Collections

| Role Template | XSUAA Scopes Granted | BTP Role Collection |
|---|---|---|
| `BMS_ADMIN` | admin, manage, inspect, executive_view | BMS Administrators |
| `BMS_BRIDGE_MANAGER` | manage, inspect, executive_view | BMS Bridge Managers |
| `BMS_OPERATOR` | manage, inspect | BMS Operators |
| `BMS_INSPECTOR` | inspect | BMS Inspectors |
| `BMS_VIEWER` | *(read-only, no write scopes)* | BMS Viewers |
| `BMS_EXECUTIVE_VIEWER` | executive_view | BMS Executive Viewers |
| `BMS_EXTERNAL_VIEWER` | external_view | BMS External Viewers |

Note: `external_view` scope is also served unauthenticated via the `bridges-public` HTML5 app and `public-bridge` OData route.

### 4.3 CSRF Protection

All state-changing API calls (POST/PUT/PATCH/DELETE) require a valid CSRF token, enforced in all environments (not just production). Client apps fetch the token via `GET /odata/v4/admin?sap-client=...` with `x-csrf-token: fetch` header.

### 4.4 Network Routes (xs-app.json)

```
AppRouter (app/router/xs-app.json):
  /public-bridge/*  → srv-api  (authenticationType: none)
  /map /dashboard /health /mass-upload /mass-edit /audit
  /access /quality /system /admin-bridges /bnac
                    → srv-api  (authenticationType: xsuaa)
  /*                → html5-apps-repo-rt  (authenticationType: xsuaa)
```

---

## 5. Technology Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Runtime | Node.js | 20 LTS | SAP BTP `nodejs_buildpack` |
| CAP Framework | `@sap/cds` | ^9 | OData V4; draft; HDI deploy |
| UI Framework | SAPUI5 / OpenUI5 | 1.120+ | Fiori Elements; UI5 CLI v4 |
| Build tool | UI5 CLI | ^4 | `ui5 build --clean-dest`; `ui5-task-zipper` for BTP zips |
| MTA Build | `mbt` | latest | `mbt build` → `mta_archives/*.mtar` |
| Database | SAP HANA Cloud | — | HDI containers; CDS-generated DDL |
| Local dev DB | SQLite | — | `cds watch` uses `db/sqlite/index.cds` for in-memory |
| Auth | XSUAA | — | OAuth 2.0 JWT |
| Excel processing | `xlsx` (SheetJS) | ^0.18 | Server-side workbook parsing |
| Audit diff | `srv/audit-log.js` | internal | `diffRecords()` generates field-level change arrays |

---

## 6. Local Development Environment

```bash
# Start CAP server (SQLite, mock XSUAA)
cds watch                        # http://localhost:4004

# Run Fiori sandbox (HTML5 apps)
# Each app has its own npm start / ui5 serve

# Run test suite
npm test                         # Jest; 166 tests

# Build MTA archive for BTP
mbt build -t gen --mtar BridgeManagement.mtar

# Deploy to BTP Cloud Foundry
cf login -a https://api.cf.ap10.hana.ondemand.com
cf deploy mta_archives/BridgeManagement.mtar
```

---

## 7. Observability

| Signal | Tool | Notes |
|---|---|---|
| Application logs | SAP Application Logging (ELK) | `console.log` / `cds.log` forwarded via `application-logs` service |
| Database query plans | HANA SQL Analyzer | Accessible via BTP Cockpit |
| Change audit | `bridge.management.AuditLog` entity | Queryable via `/audit/api/logs` (admin scope) |
| XSUAA token events | BTP Security Audit Log | Automatic; retention per BTP plan |
| Build artefacts | `mta_archives/` directory | `mbt build` output; not committed to git |

---

## 8. Disaster Recovery & Data Retention

| Concern | Approach |
|---|---|
| HANA backups | Managed by SAP HANA Cloud (daily automated snapshots) |
| Code backup | Git repository `github.com/virinchy48/BridgeManagement` |
| Config backup | `SystemConfig` entity exported via BMS Admin CSV export |
| Audit log retention | Not yet configured — to be set in `SystemConfig` as `AUDIT_RETENTION_DAYS` |
| RPO | 24 hours (HANA snapshot frequency) |
| RTO | ~2 hours (re-deploy from `.mtar` to fresh BTP space) |
