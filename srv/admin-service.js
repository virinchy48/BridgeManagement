const cds = require('@sap/cds')
const { diffRecords, writeChangeLogs, fetchCurrentRecord } = require('./audit-log')

module.exports = class AdminService extends cds.ApplicationService { init() {

  const { Bridges, Restrictions, BridgeRestrictions, BridgeCapacities, BridgeScourAssessments } = this.entities

  /**
   * Generate IDs for new Bridges drafts
   */
  this.before ('NEW', Bridges.drafts, async (req) => {
    if (req.data.ID) return
    const { ID:id1 } = await SELECT.one.from(Bridges).columns('max(ID) as ID')
    const { ID:id2 } = await SELECT.one.from(Bridges.drafts).columns('max(ID) as ID')
    req.data.ID = Math.max(id1||0, id2||0) + 1
    if (!req.data.bridgeId) {
      const stateMap = { NSW:'NSW', VIC:'VIC', QLD:'QLD', WA:'WA', SA:'SA', TAS:'TAS', ACT:'ACT', NT:'NT' }
      const stateCode = stateMap[req.data.state] || 'AUS'
      req.data.bridgeId = `BRG-${stateCode}-${String(req.data.ID).padStart(3, '0')}`
    }
  })

  const { GISConfig } = this.entities

  // Auto-seed the singleton GIS config record on first access
  this.before('READ', GISConfig, async () => {
    const existing = await SELECT.one.from(GISConfig).where({ id: 'default' })
    if (!existing) {
      await INSERT.into(GISConfig).entries({ id: 'default' })
    }
  })

  // Block hard deletes on active entities — drafts may still be discarded normally
  this.before('DELETE', Bridges, req => {
    if (req.data?.IsActiveEntity !== false) req.error(405, 'Hard delete is not permitted. Use the Deactivate action instead.')
  })
  this.before('DELETE', Restrictions, req => {
    if (req.data?.IsActiveEntity !== false) req.error(405, 'Hard delete is not permitted. Use the Deactivate action instead.')
  })
  this.before('DELETE', BridgeRestrictions, req => {
    if (req.data?.IsActiveEntity !== false) req.error(405, 'Hard delete is not permitted. Use the Deactivate action to retire this restriction.')
  })

  // Soft-delete: deactivate / reactivate Bridges (use db directly to bypass draft flow)
  // Block actions on draft entities — user must save/discard first
  this.on('deactivate', Bridges.drafts, req => req.error(409, 'Save or discard your changes before deactivating.'))
  this.on('reactivate', Bridges.drafts, req => req.error(409, 'Save or discard your changes before reactivating.'))

  this.on('deactivate', Bridges, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    await db.run(UPDATE('bridge.management.Bridges').set({ status: 'Inactive' }).where({ ID }))
    return db.run(SELECT.one.from('bridge.management.Bridges').where({ ID }))
  })
  this.on('reactivate', Bridges, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    await db.run(UPDATE('bridge.management.Bridges').set({ status: 'Active' }).where({ ID }))
    return db.run(SELECT.one.from('bridge.management.Bridges').where({ ID }))
  })

  // Soft-delete: deactivate / reactivate Restrictions (use db directly to bypass draft flow)
  this.on('deactivate', Restrictions.drafts, req => req.error(409, 'Save or discard your changes before deactivating.'))
  this.on('reactivate', Restrictions.drafts, req => req.error(409, 'Save or discard your changes before reactivating.'))

  this.on('deactivate', Restrictions, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    await db.run(UPDATE('bridge.management.Restrictions').set({ active: false, restrictionStatus: 'Retired' }).where({ ID }))
    return db.run(SELECT.one.from('bridge.management.Restrictions').where({ ID }))
  })
  this.on('reactivate', Restrictions, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    await db.run(UPDATE('bridge.management.Restrictions').set({ active: true, restrictionStatus: 'Active' }).where({ ID }))
    return db.run(SELECT.one.from('bridge.management.Restrictions').where({ ID }))
  })

  this.before ('NEW', Restrictions.drafts, async (req) => {
    if (!req.data.restrictionRef) {
      const { cnt } = await SELECT.one.from(Restrictions).columns('count(1) as cnt')
      req.data.restrictionRef = `RST-${String((cnt || 0) + 1).padStart(4, '0')}`
    }
    // Default status to Active so newly created restrictions are immediately enforceable
    if (!req.data.restrictionStatus) req.data.restrictionStatus = 'Active'
  })

  // ── BridgeRestrictions lifecycle — auto-ref, defaults, soft-delete ──────
  this.before('NEW', BridgeRestrictions.drafts, async (req) => {
    if (!req.data.restrictionRef) {
      const { cnt } = await SELECT.one.from(BridgeRestrictions).columns('count(1) as cnt')
      req.data.restrictionRef = `BR-${String((cnt || 0) + 1).padStart(4, '0')}`
    }
    if (!req.data.restrictionStatus) req.data.restrictionStatus = 'Active'
    if (req.data.active === undefined) req.data.active = true
  })

  // Sync the `temporary` flag from category; also applies on update
  this.before(['CREATE', 'UPDATE'], BridgeRestrictions, req => {
    if (req.data.restrictionCategory !== undefined) {
      req.data.temporary = req.data.restrictionCategory === 'Temporary'
    }
    if (!req.data.name && (req.data.restrictionRef || req.data.restrictionType)) {
      req.data.name = req.data.restrictionRef || req.data.restrictionType
    }
  })

  // Soft-delete: deactivate / reactivate BridgeRestrictions
  this.on('deactivate', BridgeRestrictions, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgeRestrictions', { ID })
    await db.run(UPDATE('bridge.management.BridgeRestrictions').set({ active: false, restrictionStatus: 'Retired' }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'BridgeRestriction',
      objectId:   ID,
      objectName: old?.restrictionRef || ID,
      source:     'OData',
      batchId:    cds.utils.uuid(),
      changedBy:  req.user?.id || 'system',
      changes: [
        { fieldName: 'active',            oldValue: String(old?.active ?? true),               newValue: 'false' },
        { fieldName: 'restrictionStatus', oldValue: old?.restrictionStatus || '',              newValue: 'Retired' }
      ]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeRestrictions').where({ ID }))
  })

  this.on('reactivate', BridgeRestrictions, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgeRestrictions', { ID })
    await db.run(UPDATE('bridge.management.BridgeRestrictions').set({ active: true, restrictionStatus: 'Active' }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'BridgeRestriction',
      objectId:   ID,
      objectName: old?.restrictionRef || ID,
      source:     'OData',
      batchId:    cds.utils.uuid(),
      changedBy:  req.user?.id || 'system',
      changes: [
        { fieldName: 'active',            oldValue: String(old?.active ?? false),              newValue: 'true' },
        { fieldName: 'restrictionStatus', oldValue: old?.restrictionStatus || 'Retired',       newValue: 'Active' }
      ]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeRestrictions').where({ ID }))
  })

  this.before (['CREATE', 'UPDATE'], Restrictions, req => {
    if (req.data.restrictionCategory) {
      req.data.temporary = req.data.restrictionCategory === 'Temporary'
    }
    if (req.data.bridgeRef) {
      const bridge = SELECT.one.from(Bridges).where({ bridgeId: req.data.bridgeRef })
      return bridge.then(found => {
        if (!found) req.error(400, `Unknown bridge reference: ${req.data.bridgeRef}`)
        else req.data.bridge_ID = found.ID
        if (!req.data.name) {
          req.data.name = req.data.restrictionRef || req.data.restrictionType || 'Restriction'
        }
      })
    }
    if (!req.data.name) {
      req.data.name = req.data.restrictionRef || req.data.restrictionType || 'Restriction'
    }
  })

  // ── Audit: Bridges (draft activation = UPDATE on active entity) ──────────
  this.before('UPDATE', Bridges, async (req) => {
    if (!req.data?.ID) return
    const db = await cds.connect.to('db')
    req._auditOld = await fetchCurrentRecord(db, 'bridge.management.Bridges', { ID: req.data.ID })
  })

  this.after('UPDATE', Bridges, async (_result, req) => {
    if (!req._auditOld) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.Bridges', { ID: req._auditOld.ID })
    if (!fresh) return
    const changes = diffRecords(req._auditOld, fresh)
    if (!changes.length) return
    await writeChangeLogs(db, {
      objectType:  'Bridge',
      objectId:    String(req._auditOld.ID),
      objectName:  fresh.bridgeName || req._auditOld.bridgeName || String(req._auditOld.ID),
      source:      'OData',
      batchId:     cds.utils.uuid(),
      changedBy:   req.user?.id || 'system',
      changes
    })
  })

  this.after('CREATE', Bridges, async (result, req) => {
    if (!result?.ID) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.Bridges', { ID: result.ID })
    if (!fresh) return
    // For creates, oldValue is empty for all fields that have a value
    const changes = Object.entries(fresh)
      .filter(([k, v]) => !['modifiedAt','modifiedBy','createdAt','createdBy'].includes(k) && v != null && v !== '')
      .map(([k, v]) => ({ fieldName: k, oldValue: '', newValue: String(v) }))
    await writeChangeLogs(db, {
      objectType:  'Bridge',
      objectId:    String(result.ID),
      objectName:  fresh.bridgeName || String(result.ID),
      source:      'OData',
      batchId:     cds.utils.uuid(),
      changedBy:   req.user?.id || 'system',
      changes
    })
  })

  // ── Audit: Restrictions ───────────────────────────────────────────────────
  this.before('UPDATE', Restrictions, async (req) => {
    if (!req.data?.ID) return
    const db = await cds.connect.to('db')
    req._auditOld = await fetchCurrentRecord(db, 'bridge.management.Restrictions', { ID: req.data.ID })
  })

  this.after('UPDATE', Restrictions, async (_result, req) => {
    if (!req._auditOld) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.Restrictions', { ID: req._auditOld.ID })
    if (!fresh) return
    const changes = diffRecords(req._auditOld, fresh)
    if (!changes.length) return
    await writeChangeLogs(db, {
      objectType:  'Restriction',
      objectId:    req._auditOld.ID,
      objectName:  fresh.restrictionRef || req._auditOld.restrictionRef || req._auditOld.ID,
      source:      'OData',
      batchId:     cds.utils.uuid(),
      changedBy:   req.user?.id || 'system',
      changes
    })
  })

  this.after('CREATE', Restrictions, async (result, req) => {
    if (!result?.ID) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.Restrictions', { ID: result.ID })
    if (!fresh) return
    const changes = Object.entries(fresh)
      .filter(([k, v]) => !['modifiedAt','modifiedBy','createdAt','createdBy'].includes(k) && v != null && v !== '')
      .map(([k, v]) => ({ fieldName: k, oldValue: '', newValue: String(v) }))
    await writeChangeLogs(db, {
      objectType:  'Restriction',
      objectId:    result.ID,
      objectName:  fresh.restrictionRef || result.ID,
      source:      'OData',
      batchId:     cds.utils.uuid(),
      changedBy:   req.user?.id || 'system',
      changes
    })
  })

  // ── Audit: BridgeRestrictions ─────────────────────────────────────────────
  this.before('UPDATE', BridgeRestrictions, async (req) => {
    if (!req.data?.ID) return
    const db = await cds.connect.to('db')
    req._auditOld = await fetchCurrentRecord(db, 'bridge.management.BridgeRestrictions', { ID: req.data.ID })
  })

  this.after('UPDATE', BridgeRestrictions, async (_result, req) => {
    if (!req._auditOld) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.BridgeRestrictions', { ID: req._auditOld.ID })
    if (!fresh) return
    const changes = diffRecords(req._auditOld, fresh)
    if (!changes.length) return
    await writeChangeLogs(db, {
      objectType:  'BridgeRestriction',
      objectId:    req._auditOld.ID,
      objectName:  fresh.restrictionRef || req._auditOld.restrictionRef || req._auditOld.ID,
      source:      'OData',
      batchId:     cds.utils.uuid(),
      changedBy:   req.user?.id || 'system',
      changes
    })
  })

  this.after('CREATE', BridgeRestrictions, async (result, req) => {
    if (!result?.ID) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.BridgeRestrictions', { ID: result.ID })
    if (!fresh) return
    const changes = Object.entries(fresh)
      .filter(([k, v]) => !['modifiedAt','modifiedBy','createdAt','createdBy'].includes(k) && v != null && v !== '')
      .map(([k, v]) => ({ fieldName: k, oldValue: '', newValue: String(v) }))
    await writeChangeLogs(db, {
      objectType:  'BridgeRestriction',
      objectId:    result.ID,
      objectName:  fresh.restrictionRef || result.ID,
      source:      'OData',
      batchId:     cds.utils.uuid(),
      changedBy:   req.user?.id || 'system',
      changes
    })
  })

  // ── Audit: BridgeCapacities ───────────────────────────────────────────────
  this.before('UPDATE', BridgeCapacities, async (req) => {
    if (!req.data?.ID) return
    const db = await cds.connect.to('db')
    req._auditOld = await fetchCurrentRecord(db, 'bridge.management.BridgeCapacities', { ID: req.data.ID })
  })

  this.after('UPDATE', BridgeCapacities, async (_result, req) => {
    if (!req._auditOld) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.BridgeCapacities', { ID: req._auditOld.ID })
    if (!fresh) return
    const changes = diffRecords(req._auditOld, fresh)
    if (!changes.length) return
    await writeChangeLogs(db, {
      objectType:  'BridgeCapacity',
      objectId:    req._auditOld.ID,
      objectName:  fresh.capacityType || req._auditOld.capacityType || req._auditOld.ID,
      source:      'OData',
      batchId:     cds.utils.uuid(),
      changedBy:   req.user?.id || 'system',
      changes
    })
  })

  this.after('CREATE', BridgeCapacities, async (result, req) => {
    if (!result?.ID) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.BridgeCapacities', { ID: result.ID })
    if (!fresh) return
    const changes = Object.entries(fresh)
      .filter(([k, v]) => !['modifiedAt','modifiedBy','createdAt','createdBy'].includes(k) && v != null && v !== '')
      .map(([k, v]) => ({ fieldName: k, oldValue: '', newValue: String(v) }))
    await writeChangeLogs(db, {
      objectType:  'BridgeCapacity',
      objectId:    result.ID,
      objectName:  fresh.capacityType || result.ID,
      source:      'OData',
      batchId:     cds.utils.uuid(),
      changedBy:   req.user?.id || 'system',
      changes
    })
  })

  this.before('DELETE', BridgeCapacities, async (req) => {
    // Log deletion before it happens so the audit trail is preserved
    const id = req.data?.ID
    if (!id) return
    const db = await cds.connect.to('db')
    const record = await fetchCurrentRecord(db, 'bridge.management.BridgeCapacities', { ID: id })
    if (!record) return
    await writeChangeLogs(db, {
      objectType: 'BridgeCapacity',
      objectId:   id,
      objectName: record.capacityType || id,
      source:     'OData',
      batchId:    cds.utils.uuid(),
      changedBy:  req.user?.id || 'system',
      changes:    [{ fieldName: '_record', oldValue: JSON.stringify(record), newValue: 'DELETED' }]
    })
  })

  // ── Audit: BridgeScourAssessments ─────────────────────────────────────────
  this.before('UPDATE', BridgeScourAssessments, async (req) => {
    if (!req.data?.ID) return
    const db = await cds.connect.to('db')
    req._auditOld = await fetchCurrentRecord(db, 'bridge.management.BridgeScourAssessments', { ID: req.data.ID })
  })

  this.after('UPDATE', BridgeScourAssessments, async (_result, req) => {
    if (!req._auditOld) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.BridgeScourAssessments', { ID: req._auditOld.ID })
    if (!fresh) return
    const changes = diffRecords(req._auditOld, fresh)
    if (!changes.length) return
    await writeChangeLogs(db, {
      objectType:  'ScourAssessment',
      objectId:    req._auditOld.ID,
      objectName:  fresh.assessmentType || req._auditOld.assessmentType || req._auditOld.ID,
      source:      'OData',
      batchId:     cds.utils.uuid(),
      changedBy:   req.user?.id || 'system',
      changes
    })
  })

  this.after('CREATE', BridgeScourAssessments, async (result, req) => {
    if (!result?.ID) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.BridgeScourAssessments', { ID: result.ID })
    if (!fresh) return
    const changes = Object.entries(fresh)
      .filter(([k, v]) => !['modifiedAt','modifiedBy','createdAt','createdBy'].includes(k) && v != null && v !== '')
      .map(([k, v]) => ({ fieldName: k, oldValue: '', newValue: String(v) }))
    await writeChangeLogs(db, {
      objectType:  'ScourAssessment',
      objectId:    result.ID,
      objectName:  fresh.assessmentType || result.ID,
      source:      'OData',
      batchId:     cds.utils.uuid(),
      changedBy:   req.user?.id || 'system',
      changes
    })
  })

  this.before('DELETE', BridgeScourAssessments, async (req) => {
    const id = req.data?.ID
    if (!id) return
    const db = await cds.connect.to('db')
    const record = await fetchCurrentRecord(db, 'bridge.management.BridgeScourAssessments', { ID: id })
    if (!record) return
    await writeChangeLogs(db, {
      objectType: 'ScourAssessment',
      objectId:   id,
      objectName: record.assessmentType || id,
      source:     'OData',
      batchId:    cds.utils.uuid(),
      changedBy:  req.user?.id || 'system',
      changes:    [{ fieldName: '_record', oldValue: JSON.stringify(record), newValue: 'DELETED' }]
    })
  })

  // ── Configurable Attributes — integrity guards ───────────────────────────

  const { AttributeDefinitions, AttributeAllowedValues, AttributeValues } = this.entities

  // Block DELETE on AttributeDefinition if any values exist for its internalKey
  this.before('DELETE', AttributeDefinitions, async (req) => {
    const id = req.data?.ID
    if (!id) return
    const defn = await SELECT.one.from(AttributeDefinitions).where({ ID: id })
    if (!defn) return
    const db = await cds.connect.to('db')
    const used = await SELECT.one.from('bridge.management.AttributeValues')
      .where({ attributeKey: defn.internalKey })
    if (used) {
      req.error(409, `Cannot delete attribute "${defn.name}" — ${defn.internalKey} has saved values. Deactivate it instead.`)
    }
  })

  // Block dataType change on AttributeDefinition if any values exist
  this.before('UPDATE', AttributeDefinitions, async (req) => {
    if (!req.data?.dataType || !req.data?.ID) return
    const existing = await SELECT.one.from(AttributeDefinitions).where({ ID: req.data.ID })
    if (!existing || existing.dataType === req.data.dataType) return
    const db = await cds.connect.to('db')
    const used = await SELECT.one.from('bridge.management.AttributeValues')
      .where({ attributeKey: existing.internalKey })
    if (used) {
      req.error(409, `Cannot change data type of "${existing.name}" — values already exist. Create a new attribute instead.`)
    }
  })

  // Block internalKey change after values exist
  this.before('UPDATE', AttributeDefinitions, async (req) => {
    if (!req.data?.internalKey || !req.data?.ID) return
    const existing = await SELECT.one.from(AttributeDefinitions).where({ ID: req.data.ID })
    if (!existing || existing.internalKey === req.data.internalKey) return
    const db = await cds.connect.to('db')
    const used = await SELECT.one.from('bridge.management.AttributeValues')
      .where({ attributeKey: existing.internalKey })
    if (used) {
      req.error(409, `Cannot change internal key of "${existing.name}" — values already exist.`)
    }
  })

  // Block DELETE on AllowedValue if any AttributeValue references it
  this.before('DELETE', AttributeAllowedValues, async (req) => {
    const id = req.data?.ID
    if (!id) return
    const av = await SELECT.one.from(AttributeAllowedValues).where({ ID: id })
    if (!av) return
    const defn = await SELECT.one.from(AttributeDefinitions).where({ ID: av.attribute_ID })
    if (!defn) return
    const db = await cds.connect.to('db')
    const used = await SELECT.one.from('bridge.management.AttributeValues')
      .where({ attributeKey: defn.internalKey, valueText: av.value })
    if (used) {
      req.error(409, `Cannot delete allowed value "${av.value}" — it is in use by saved records.`)
    }
  })

  // ── Audit: GIS Config ────────────────────────────────────────────────────
  this.before('UPDATE', GISConfig, async (req) => {
    const db = await cds.connect.to('db')
    req._auditOld = await fetchCurrentRecord(db, 'bridge.management.GISConfig', { id: 'default' })
  })

  this.after('UPDATE', GISConfig, async (_result, req) => {
    if (!req._auditOld) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.GISConfig', { id: 'default' })
    if (!fresh) return
    const changes = diffRecords(req._auditOld, fresh)
    if (!changes.length) return
    await writeChangeLogs(db, {
      objectType:  'GISConfig',
      objectId:    'default',
      objectName:  'GIS Configuration',
      source:      'OData',
      batchId:     cds.utils.uuid(),
      changedBy:   req.user?.id || 'system',
      changes
    })
  })

  return super.init()
}}
