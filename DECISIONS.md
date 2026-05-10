# BMS Architecture Decision Log

Format: [DATE] [PHASE] DECISION / RATIONALE / ALTERNATIVES

---

[2026-05-10] [Phase 2] DECISION: Navigation hub uses Option A — ReferenceFacet LinkedTables within a single "Sub-domains" CollectionFacet on the Bridge Details Object Page.
RATIONALE: Sub-entities are CAP composition children; Fiori Elements `ReferenceFacet + Target: 'entity/@UI.LineItem'` already renders as a drillable table with full Object Page navigation. All sub-entity routes already existed in manifest.json. No custom XML/controller needed.
ALTERNATIVES: Option B (IconTabBar) rejected — requires custom XML controller and loses Fiori Elements draft support. Option C (OVP) rejected — overkill for internal admin, requires separate app module.

[2026-05-10] [Phase 1] DECISION: Soft-delete uses `active: Boolean default true` + bound actions `deactivate()` / `reactivate()` — NOT `isDeleted`.
RATIONALE: Matches Restrictions gold standard exactly. `@Capabilities.DeleteRestrictions.Deletable: false` blocks hard-delete at protocol level. Pattern is consistent across Bridges, Restrictions, BridgeRestrictions.
ALTERNATIVES: `isDeleted: Boolean default false` rejected — diverges from Restrictions canonical pattern and requires filter changes across all queries.

[2026-05-10] [Phase 4] DECISION: Add single `certify` scope for LRC/PRM approval actions. All other new tiles reuse existing `manage` / `admin` scopes.
RATIONALE: Existing scope matrix (`admin`, `manage`, `operate`, `inspect`, `view`) covers 95% of use cases. `certify` is the only genuinely new permission — approval/rejection of permits and certificates requires a distinct role that is separate from day-to-day editing.
ALTERNATIVES: Per-tile scopes (e.g. `manage_permits`, `manage_load_ratings`) rejected — over-engineering; XSUAA role explosion with no operational benefit at current user scale.

[2026-05-10] [Phase 5] DECISION: ChangeLog uses existing `writeChangeLogs()` + `diffRecords()` from `srv/audit-log.js` — no new mixin entity.
RATIONALE: The `bridge.management.ChangeLog` table and helper functions already implement field-level diff logging. All new entity handlers follow the identical `before('UPDATE') → save snapshot` + `after('UPDATE') → diffRecords → writeChangeLogs` pattern used by BridgeRestrictions and BridgeCapacities.
ALTERNATIVES: Separate per-entity change log tables rejected — already solved generically; duplication has no benefit.

[2026-05-10] [Phase 6] DECISION: Bridge Details hub strips all 7 inline data sections, retaining only: Identity (3 field groups), Sub-domains (10 LinkedTables), Documents & Map (custom fragments), Administration.
RATIONALE: The monolithic view mixed bridge attributes with sub-entity data. Separating concerns makes each domain independently navigable and reduces Object Page rendering time. Structural/condition/NHVR/risk data is now owned by its respective tile Object Page.
ALTERNATIVES: Keeping all existing sections + adding sub-domain section rejected — would make the Object Page even heavier and defeat the hub purpose.

[2026-05-10] [Phase 7] DECISION: New entity handlers added inline to `srv/admin-service.js` (not separate handler files).
RATIONALE: AdminService owns all admin entity lifecycle; `admin-service.js` already has the `fetchCurrentRecord` + `writeChangeLogs` imports and the `this.entities` destructuring pattern. Separate files would require new require() + registration calls for no architectural benefit at current scale.
ALTERNATIVES: Separate `srv/handlers/conditions.js` etc. rejected — those are for BridgeManagementService handlers; AdminService handlers belong in admin-service.js.
