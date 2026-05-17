'use strict'
const cds = require('@sap/cds')

module.exports = function registerLoadRatings(svc, helpers) {
  const { fetchCurrentRecord, writeChangeLogs, diffRecords } = helpers
  const { BridgeLoadRatings } = svc.entities

  svc.on('deactivate', BridgeLoadRatings.drafts, req => req.error(409, 'Save or discard your changes before deactivating.'))
  svc.on('reactivate', BridgeLoadRatings.drafts, req => req.error(409, 'Save or discard your changes before reactivating.'))

  svc.before('NEW', BridgeLoadRatings.drafts, async (req) => {
    if (!req.data.ratingRef) {
      const { cnt } = await SELECT.one.from(BridgeLoadRatings).columns('count(1) as cnt')
      req.data.ratingRef = `LR-${String((cnt || 0) + 1).padStart(4, '0')}`
    }
    if (!req.data.status) req.data.status = 'Active'
    if (req.data.active === undefined) req.data.active = true
  })

  svc.on('deactivate', BridgeLoadRatings, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgeLoadRatings', { ID })
    await db.run(UPDATE('bridge.management.BridgeLoadRatings').set({ active: false, status: 'Superseded' }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'LoadRating', objectId: ID, objectName: old?.ratingRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [
        { fieldName: 'active', oldValue: 'true', newValue: 'false' },
        { fieldName: 'status', oldValue: old?.status || 'Active', newValue: 'Superseded' }
      ]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeLoadRatings').where({ ID }))
  })

  svc.on('reactivate', BridgeLoadRatings, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgeLoadRatings', { ID })
    await db.run(UPDATE('bridge.management.BridgeLoadRatings').set({ active: true, status: 'Active' }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'LoadRating', objectId: ID, objectName: old?.ratingRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [
        { fieldName: 'active', oldValue: 'false', newValue: 'true' },
        { fieldName: 'status', oldValue: old?.status || 'Superseded', newValue: 'Active' }
      ]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeLoadRatings').where({ ID }))
  })

  svc.before('UPDATE', BridgeLoadRatings, async (req) => {
    if (!req.data?.ID) return
    const db = await cds.connect.to('db')
    req._auditOld = await fetchCurrentRecord(db, 'bridge.management.BridgeLoadRatings', { ID: req.data.ID })
  })

  svc.after('UPDATE', BridgeLoadRatings, async (_result, req) => {
    if (!req._auditOld) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.BridgeLoadRatings', { ID: req._auditOld.ID })
    if (!fresh) return
    const changes = diffRecords(req._auditOld, fresh)
    if (!changes.length) return
    await writeChangeLogs(db, {
      objectType: 'LoadRating', objectId: req._auditOld.ID,
      objectName: fresh.ratingRef || req._auditOld.ID, source: 'OData',
      batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system', changes
    })
  })

  svc.after('CREATE', BridgeLoadRatings, async (result, req) => {
    if (!result?.ID) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.BridgeLoadRatings', { ID: result.ID })
    if (!fresh) return
    const changes = Object.entries(fresh)
      .filter(([k, v]) => !['modifiedAt','modifiedBy','createdAt','createdBy'].includes(k) && v != null && v !== '')
      .map(([k, v]) => ({ fieldName: k, oldValue: '', newValue: String(v) }))
    await writeChangeLogs(db, {
      objectType: 'LoadRating', objectId: result.ID, objectName: fresh.ratingRef || result.ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system', changes
    })
  })

  svc.before('DELETE', BridgeLoadRatings, (req) => {
    if (req.data?.IsActiveEntity !== false) req.error(405, 'Hard delete is not permitted. Use the Deactivate action instead.')
  })
}
