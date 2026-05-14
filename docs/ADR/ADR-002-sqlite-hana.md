# ADR-002: SQLite for local development, HANA Cloud for production

**Date:** 2025-Q3  
**Status:** Accepted  
**Deciders:** CAP_ARCHITECT, BTP_ARCHITECT, DATA_ARCHITECT

---

## Context

BMS developers need a local development environment that faithfully represents production OData behaviour without requiring a live HANA Cloud instance. The team works across different networks and offline; a HANA dependency would block development during connectivity issues and incur BTP resource costs for each developer.

Production requires HANA Cloud for column-store performance on 5,000+ bridge records, HDI container lifecycle management, and HANA-native full-text search if introduced in future.

---

## Decision

Use **SQLite** (via `@cap-js/sqlite`) for local development and test runs. Use **SAP HANA Cloud** (HDI container, `hana` service plan) for the production Cloud Foundry environment. The adapter switch is entirely configuration-driven — no code changes required between environments.

---

## Rationale

**Parity for OData semantics.** `@cap-js/sqlite` replicates CAP's OData V4 layer over SQLite, including draft tables, managed fields (`createdAt`, `modifiedAt`), `@assert.range`, and association-based navigation. Integration tests in Jest run against real SQLite — no mocking required.

**Zero-cost local dev.** A HANA Cloud instance costs BTP service units even when idle. SQLite is an embedded library — no BTP credentials or network required.

**HDI artefact generation.** `cds build --production` generates `.hdbtable`, `.hdbview`, `.hdbtabledata`, `.hdbgrants`, and `.hdbsequence` files for HANA HDI deployment. The same CDS source is used for both targets.

**Known limitations accepted.** SQLite does not support HANA-specific features: ST_Point spatial types (mitigated by ADR-008), full-text search (not currently used), or column-store optimisation hints. These are accepted trade-offs for local dev speed.

---

## Consequences

**Positive:**
- Developers can run `npm start` and `npm test` without BTP credentials
- Jest integration tests are fast (in-memory SQLite, no network latency)
- `cds deploy --to sqlite:db.sqlite` is the local smoke test for schema changes

**Negative / trade-offs:**
- CSV field count must exactly match `import_columns` in `.hdbtabledata` — SQLite is lenient with trailing commas; HANA HDI is not. This has caused two deploy failures (see CLAUDE.md 2026-05-12 learning on trailing commas and unquoted commas).
- SQLite WAL/journal sidecar files (`-wal`, `-shm`, `-journal`) left by a failed deploy cause `cannot rollback — no transaction is active` on the next deploy run. Fix: `rm -f db.sqlite*` before re-running.
- `cds deploy` with Node 16 fails silently with "Node.js version 20 or higher required". All developers must use `nvm use 20` before schema deploy.
- HANA spatial types (`ST_Point`) cannot be tested locally — see ADR-008.
- Any schema change must be validated with both `npx cds deploy --to sqlite:db.sqlite` (local) and `cds build --production && mbt build` (HANA artefacts) before commit.
