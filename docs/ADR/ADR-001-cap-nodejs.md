# ADR-001: SAP CAP Node.js as the application framework

**Date:** 2025-Q3  
**Status:** Accepted  
**Deciders:** BTP_ARCHITECT, CAP_ARCHITECT, PRODUCT_MANAGER

---

## Context

BMS needs to manage bridge assets, inspections, defects, risk assessments, restrictions, and NHVR compliance across Australian states. The system integrates with SAP BTP (XSUAA, HANA Cloud, HTML5 App Repository, Destination), uses Fiori Elements for structured CRUD, and must be deployable via MTA. Three technology stacks were evaluated:

1. **SAP CAP Node.js** — SAP Cloud Application Programming Model with Node.js runtime
2. **ABAP + Fiori** — Backend on ABAP Platform (BTP or S/4 HANA); frontend as Fiori apps
3. **Spring Boot + SAP BTP** — Java microservice with OData V4 adapter, Fiori frontend

The project team had existing expertise in JavaScript/Node.js and SAP Fiori UI5. The timeline required rapid prototyping of domain entities with frequent schema changes.

---

## Decision

Use **SAP CAP Node.js** (`@sap/cds` v9, Node 20+) as the sole application framework for all backend services and OData V4 endpoints.

---

## Rationale

CAP Node.js was chosen for the following reasons:

**Speed of schema-driven development.** CDS entity definitions in `.cds` files generate OData V4 services, SQLite local dev DB, and HANA HDI artefacts from a single source of truth. Adding a new entity (e.g. `BridgeConditionSurveys`) with full CRUD, draft support, and Fiori annotations took under a day. ABAP development cycles for equivalent objects would have required multiple transports and ABAP Dictionary objects.

**Native BTP integration.** CAP provides built-in XSUAA authentication, `@restrict` annotations for scope-based authorisation, HANA Cloud deployment via `cds deploy --to hana`, and MTA-compatible `cds build --production` output. Spring Boot would have required manual SAP Security Client Library integration and custom HDI deploy steps.

**SQLite for local development.** `@cap-js/sqlite` provides an in-memory SQLite runtime with identical OData semantics to HANA Cloud, enabling fast Jest integration tests without a HANA instance. This is not available in the ABAP stack.

**Draft editing out of the box.** Fiori Elements draft workflow (`@odata.draft.enabled`) is a CAP annotation — no custom implementation required. ABAP requires explicit draft infrastructure (BOPF or RAP).

**JavaScript/Node.js team capability.** All team members were proficient in JavaScript. An ABAP stack would have required significant reskilling or external ABAP developers.

---

## Consequences

**Positive:**
- Rapid entity modelling and service generation
- Single language stack (JavaScript) across backend handlers and build scripts
- SQLite local dev enables fast, dependency-free test runs
- BTP-native: MTA, XSUAA, HANA HDI, HTML5 repo all first-class citizens

**Negative / trade-offs:**
- Node.js is single-threaded; CPU-intensive operations (bulk scoring, BHI calculation) can block the event loop. Mitigated by keeping batch operations bounded (200 bridges per `/bhi-bsi/api/network-summary` call).
- No ABAP-based S/4 HANA integration without additional iFlow or REST adapter. The five S/4 placeholder fields (`s4FunctionalLocationId`, `s4AssetNumber`, etc.) remain stubs until an integration layer is built.
- SAP PAC certification requires a registered PSTN namespace, which `bridge.management` is not. A namespace migration would be required before PAC submission.
- `@sap/cds` v9 requires Node 20+ — the deployment environment must pin this version explicitly (`.nvmrc`, `engines` in `package.json`, Cloud Foundry buildpack version).
