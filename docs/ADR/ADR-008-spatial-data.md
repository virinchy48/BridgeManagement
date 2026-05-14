# ADR-008: Lat/lng as Decimal fields instead of HANA ST_Point

**Date:** 2025-Q4  
**Status:** Accepted (with migration path)  
**Deciders:** SPATIAL_GIS_EXPERT, DATA_ARCHITECT, CAP_ARCHITECT

---

## Context

Bridge locations must be stored and queried geospatially. BMS uses Leaflet maps with OpenStreetMap tiles to display bridge locations on a map. Spatial queries (bounding-box filter, radius search, nearest-bridge lookups) are required for the map viewport mode.

Two storage approaches were evaluated:

1. **HANA ST_Point** — native HANA spatial type, enables `ST_Within`, `ST_Distance`, `ST_Intersects` operations in HANA; requires spatial engine licence component
2. **Decimal lat/lng** — store latitude and longitude as separate `Decimal` fields; implement bounding-box and radius queries in application code using Haversine formula

---

## Decision

Store coordinates as **`latitude: Decimal(15,6)`** and **`longitude: Decimal(15,6)`** on `bridge.management.Bridges`, and **`latitude: Decimal(11,8)`** / **`longitude: Decimal(11,8)`** on `nhvr.Bridge`. Implement spatial queries in `srv/server.js` using the Haversine formula for radius search and simple min/max comparisons for bounding-box queries.

GeoJSON geometry for complex polygon shapes is stored as **`geoJson: LargeString`** — a JSON string parsed in application code.

---

## Rationale

**SQLite compatibility.** `@cap-js/sqlite` (local dev) has no spatial type support. Using ST_Point would require a different code path for local dev and production — violating the "one codebase, two databases" principle established in ADR-002.

**CDS type system.** CDS does not expose HANA ST_Point as a first-class type that can be annotated with `@UI.*` or serialised cleanly in OData V4. Adding ST_Point would require raw SQL in handler files and custom OData serialisation.

**Australian bounding box is sufficient for Haversine.** The Australian bounding box (lat: −44 to −10, lon: 112 to 154) covers all bridge records. Haversine calculations at these distances are accurate to within 0.01% — acceptable for bridge proximity queries.

**Coordinate reference system.** All coordinates are GDA2020 (SRID 7844) — `@assert.range` applied: latitude −44 to −10, longitude 112 to 154. `@Common.QuickInfo` documents the CRS on both fields.

---

## Migration path to ST_Point

When HANA spatial queries become a functional requirement (e.g. `ST_Within(polygon)` for local government boundary queries, or network-wide isochrone analysis):

1. Add `location: hana.ST_Point` to `db/schema/bridge-entity.cds` as an additional field (do not remove lat/lon — Leaflet and OData clients use Decimal)
2. Populate `location` from lat/lon via an HDI migration procedure: `UPDATE Bridges SET location = NEW ST_Point(longitude, latitude, 7844)`
3. Update spatial query endpoints in `srv/server.js` to use `ST_Within` / `ST_DWithin` instead of Haversine
4. Add `@cap-js/hana` spatial adapter reference in `package.json` (replaces `@cap-js/sqlite` for production)
5. Test locally using `cds deploy --to hana` against a trial HANA Cloud instance

---

## Consequences

**Positive:**
- Identical code path for local SQLite and production HANA
- Decimal lat/lon serialises cleanly in OData JSON responses — no custom type handler required
- Leaflet consumes lat/lon directly — no coordinate extraction from ST_Point WKT

**Negative / trade-offs:**
- Haversine bounding-box queries are O(n) full-table scans — acceptable at 5,000 bridges but will degrade at 50,000+. A spatial index on lat/lon (composite B-tree index) can partially mitigate this.
- No polygon containment queries — "all bridges within a local government area boundary" requires either ST_Point or a pre-computed LGA-to-bridge mapping table
- `geoJson` as `LargeString` requires `JSON.parse()` in application code with try/catch — malformed GeoJSON in the DB will silently return null (the `try { return JSON.parse(v) } catch(_) { return null }` pattern is required per CLAUDE.md security rules)
- Viewport mode bbox queries are guarded by zoom < 8 to prevent full-table scans at national zoom levels
