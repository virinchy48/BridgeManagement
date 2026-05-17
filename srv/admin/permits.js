'use strict'
const cds = require('@sap/cds')

module.exports = function registerPermits(svc, helpers) {
  const { fetchCurrentRecord, writeChangeLogs, diffRecords } = helpers
  const { BridgePermits } = svc.entities

  svc.on('deactivate',   BridgePermits.drafts, req => req.error(409, 'Save or discard your changes before deactivating.'))
  svc.on('reactivate',   BridgePermits.drafts, req => req.error(409, 'Save or discard your changes before reactivating.'))
  svc.on('approve',      BridgePermits.drafts, req => req.error(409, 'Save or discard your changes before approving.'))
  svc.on('rejectPermit', BridgePermits.drafts, req => req.error(409, 'Save or discard your changes before rejecting.'))

  svc.before('NEW', BridgePermits.drafts, async (req) => {
    if (!req.data.permitRef) {
      const { cnt } = await SELECT.one.from(BridgePermits).columns('count(1) as cnt')
      req.data.permitRef = `PM-${String((cnt || 0) + 1).padStart(4, '0')}`
    }
    if (!req.data.status) req.data.status = 'Pending'
    if (req.data.active === undefined) req.data.active = true
  })

  svc.on('approve', BridgePermits, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgePermits', { ID })
    const now = new Date().toISOString().split('T')[0]
    await db.run(UPDATE('bridge.management.BridgePermits').set({
      status: 'Approved', decisionBy: req.user?.id || 'system', decisionDate: now
    }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'Permit', objectId: ID, objectName: old?.permitRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'status', oldValue: old?.status || 'Pending', newValue: 'Approved' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgePermits').where({ ID }))
  })

  svc.on('rejectPermit', BridgePermits, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgePermits', { ID })
    const now = new Date().toISOString().split('T')[0]
    await db.run(UPDATE('bridge.management.BridgePermits').set({
      status: 'Rejected', decisionBy: req.user?.id || 'system', decisionDate: now
    }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'Permit', objectId: ID, objectName: old?.permitRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'status', oldValue: old?.status || 'Pending', newValue: 'Rejected' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgePermits').where({ ID }))
  })

  svc.on('deactivate', BridgePermits, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgePermits', { ID })
    await db.run(UPDATE('bridge.management.BridgePermits').set({ active: false }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'Permit', objectId: ID, objectName: old?.permitRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'active', oldValue: 'true', newValue: 'false' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgePermits').where({ ID }))
  })

  svc.on('reactivate', BridgePermits, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgePermits', { ID })
    await db.run(UPDATE('bridge.management.BridgePermits').set({ active: true }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'Permit', objectId: ID, objectName: old?.permitRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'active', oldValue: 'false', newValue: 'true' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgePermits').where({ ID }))
  })

  svc.before('UPDATE', BridgePermits, async (req) => {
    if (!req.data?.ID) return
    const db = await cds.connect.to('db')
    req._auditOld = await fetchCurrentRecord(db, 'bridge.management.BridgePermits', { ID: req.data.ID })
  })

  svc.after('UPDATE', BridgePermits, async (_result, req) => {
    if (!req._auditOld) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.BridgePermits', { ID: req._auditOld.ID })
    if (!fresh) return
    const changes = diffRecords(req._auditOld, fresh)
    if (!changes.length) return
    await writeChangeLogs(db, {
      objectType: 'Permit', objectId: req._auditOld.ID,
      objectName: fresh.permitRef || req._auditOld.ID, source: 'OData',
      batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system', changes
    })
  })

  svc.after('CREATE', BridgePermits, async (result, req) => {
    if (!result?.ID) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.BridgePermits', { ID: result.ID })
    if (!fresh) return
    const changes = Object.entries(fresh)
      .filter(([k, v]) => !['modifiedAt','modifiedBy','createdAt','createdBy'].includes(k) && v != null && v !== '')
      .map(([k, v]) => ({ fieldName: k, oldValue: '', newValue: String(v) }))
    await writeChangeLogs(db, {
      objectType: 'Permit', objectId: result.ID, objectName: fresh.permitRef || result.ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system', changes
    })
  })

  svc.before('DELETE', BridgePermits, (req) => {
    if (req.data?.IsActiveEntity !== false) req.error(405, 'Hard delete is not permitted. Use the Deactivate action instead.')
  })
}
