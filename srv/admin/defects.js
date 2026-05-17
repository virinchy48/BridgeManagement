'use strict'
const cds = require('@sap/cds')

module.exports = function registerDefects(svc, helpers) {
  const { fetchCurrentRecord, writeChangeLogs } = helpers
  const { BridgeDefects } = svc.entities

  svc.before('NEW', BridgeDefects.drafts, async (req) => {
    if (!req.data.defectId) {
      const last = await SELECT.one.from(BridgeDefects).columns('defectId').orderBy('defectId desc').limit(1)
      const m = last?.defectId?.match(/^DEF-(\d+)$/)
      const seq = m ? parseInt(m[1], 10) + 1 : 1
      req.data.defectId = `DEF-${String(seq).padStart(4, '0')}`
    }
    if (req.data.active === undefined) req.data.active = true
  })

  svc.on('deactivate', BridgeDefects, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgeDefects', { ID })
    await db.run(UPDATE('bridge.management.BridgeDefects').set({ active: false }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'Defect', objectId: ID, objectName: old?.defectId || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'active', oldValue: 'true', newValue: 'false' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeDefects').where({ ID }))
  })

  svc.on('reactivate', BridgeDefects, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgeDefects', { ID })
    await db.run(UPDATE('bridge.management.BridgeDefects').set({ active: true }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'Defect', objectId: ID, objectName: old?.defectId || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'active', oldValue: 'false', newValue: 'true' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeDefects').where({ ID }))
  })
}
