# ADR-004: Consolidate on lib/bhi-calculator.js; retire bhi-bsi-engine.js

**Date:** 2026-05-14  
**Status:** Proposed  
**Deciders:** CAP_ARCHITECT, BRIDGE_DOMAIN_SME, PRODUCT_MANAGER

---

## Context

BMS currently contains two BHI/BSI scoring engines:

1. **`lib/bhi-calculator.js`** (v2.1) — standalone pure-function library with unit tests at `test/unit/bhi-calculator.test.js`. Produces Bridge Health Index (BHI) and National Bridge Index (NBI) values. Designed as a reusable module.

2. **`srv/bhi-bsi-engine.js`** — multi-modal BHI/BSI formula with 6 transport modes (Road, Rail, Metro, LightRail, Ferry, Port). Exposed via `srv/bhi-bsi-api.js` at `/bhi-bsi/api`. Guarded by feature flag `feature.bhiBsiAssessment`. Populates virtual `bhi` and `nbi` fields on `bridge.management.Bridges` via `after('READ', Bridges)` in `admin-service.js`.

Maintaining two engines with different inputs, weights, and transport modes creates:
- Inconsistent BHI values depending on which code path is used
- Duplicate test maintenance burden
- Risk of silent divergence as the scoring formula evolves

---

## Decision

**Consolidate on `lib/bhi-calculator.js`** as the single BHI/BSI computation library. Retire `srv/bhi-bsi-engine.js` by migrating its multi-modal transport mode parameters into `lib/bhi-calculator.js` as a mode-specific configuration object.

The `/bhi-bsi/api` REST endpoints (`srv/bhi-bsi-api.js`) will be retained but refactored to call `lib/bhi-calculator.js` instead of the internal engine. The `mode-params` endpoint will return the consolidated mode configuration.

---

## Migration plan

1. Extend `lib/bhi-calculator.js` to accept an optional `transportMode` parameter (default: `"Road"`) with per-mode weight overrides matching the current `bhi-bsi-engine.js` mode table.
2. Update `srv/bhi-bsi-api.js` to `require('../lib/bhi-calculator')` instead of `./bhi-bsi-engine`.
3. Update `srv/admin-service.js` `after('READ', Bridges)` BHI population to call `lib/bhi-calculator.js`.
4. Update `test/unit/bhi-calculator.test.js` to cover multi-modal inputs.
5. Delete `srv/bhi-bsi-engine.js`.

---

## Consequences

**Positive:**
- Single source of truth for BHI/BSI scoring formula
- One test suite covers all scoring paths
- `lib/` module is independently versionable and extractable to an npm package for reuse in future asset management systems

**Negative / trade-offs:**
- Migration requires careful weight reconciliation — the two engines may use different normalisation bases. A side-by-side comparison of outputs on the 10 demo bridge records must be performed before deletion.
- The feature flag `feature.bhiBsiAssessment` gates the API but not `lib/bhi-calculator.js` usage. After consolidation, the flag must also gate the `after('READ')` virtual field computation (already the case — no change required).
- Until migration is complete, both engines must be kept consistent when the scoring formula changes.
