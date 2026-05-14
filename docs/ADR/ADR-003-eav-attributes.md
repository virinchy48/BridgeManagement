# ADR-003: EAV pattern for extensible bridge attributes

**Date:** 2025-Q4  
**Status:** Accepted  
**Deciders:** CAP_ARCHITECT, DATA_ARCHITECT, PRODUCT_MANAGER

---

## Context

Bridge assets managed by different Australian state agencies have varying attribute requirements. A NSW bridge may require seismic zone classification; a VIC bridge may require flood immunity ARI; a QLD bridge may require cyclone design category. Encoding every possible attribute as a column on `bridge.management.Bridges` would produce a wide, sparse table with hundreds of columns — most null for any given bridge.

Additionally, new attribute requirements emerge from regulatory changes (AS 5100 revisions, TfNSW inspection protocol updates) without requiring a schema migration. Customer agencies need to define their own attributes for internal classification without modifying the shared data model.

Two structural patterns were evaluated:

1. **Wide table** — add every attribute as a typed column on the `Bridges` entity
2. **Entity-Attribute-Value (EAV)** — separate tables for attribute definitions, allowed values, and per-bridge values

---

## Decision

Use the **EAV pattern** via four entities: `AttributeGroups`, `AttributeDefinitions`, `AttributeAllowedValues`, and `AttributeValues`. The `AttributeValues` table stores `objectType: "Bridge"`, `objectId` (the integer bridge PK as a string), `attributeKey` (the definition's `internalKey`), and `valueText`.

---

## Rationale

**Schema stability.** New attributes can be added by inserting rows into `AttributeDefinitions` without a CDS schema change, `cds deploy`, or HDI migration. This is critical for agencies that need to onboard custom attributes between BMS releases.

**Validation at definition time.** `AttributeAllowedValues` linked to a definition restricts the set of valid values. The Custom Attributes admin UI enforces this. The FK on `AttributeAllowedValues` is `attribute_ID` (the CAP-generated association FK) — not a `definition_ID` column.

**Cross-entity reuse.** `objectType` scopes the EAV table to any entity — currently "Bridge" only, but the pattern extends to "Inspection", "Restriction", etc. without schema changes.

**Mass upload integration.** The `AllowedValues` DATASETS entry in `srv/mass-upload.js` handles bulk upload of allowed values across 26 lookup entity types using a `ALLOWED_VALUES_WHITELIST` Set as the security boundary.

---

## Consequences

**Positive:**
- Zero-downtime attribute additions for state agency customisation
- `AttributeGroups.internalKey` provides a stable machine-readable identifier for integration
- Attribute history tracked in `AttributeValueHistory`

**Negative / trade-offs:**
- All attribute values are stored as `String` (`valueText`) — no typed storage. Numeric or date comparisons require application-layer parsing.
- OData filtering on attribute values is not possible via standard `$filter` — requires custom query API or denormalisation.
- `AttributeGroups` has a NOT NULL `internalKey` field — omitting it on CREATE causes HTTP 500 from SQLite NOT NULL constraint. Callers must always provide `internalKey`.
- The `AttributeValues` entity was incorrectly marked `@readonly` in `admin-service.cds` in an early version — this was corrected. Any future service projection must not apply `@readonly` to this entity.
- EAV queries are more complex than column queries — `JOIN AttributeValues ON objectId = bridgeId AND attributeKey = 'KEY'` is required for any bridge-level attribute filter. This is a known scalability concern at >100 attributes per bridge.
