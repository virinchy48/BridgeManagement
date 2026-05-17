'use strict'
const cds = require('@sap/cds')

module.exports = function registerInspections(svc, helpers) {
  const { fetchCurrentRecord, writeChangeLogs } = helpers
  const { BridgeInspections } = svc.entities

  svc.before('NEW', BridgeInspections.drafts, async (req) => {
    if (!req.data.inspectionRef) {
      const last = await cds.run(SELECT.one.from('bridge.management.BridgeInspections').columns('inspectionRef').orderBy('inspectionRef desc').limit(1))
      const m = last?.inspectionRef?.match(/^INS-(\d+)$/)
      const seq = m ? parseInt(m[1], 10) + 1 : 1
      req.data.inspectionRef = `INS-${String(seq).padStart(4, '0')}`
    }
    if (req.data.active === undefined) req.data.active = true
  })

  svc.on('deactivate', BridgeInspections, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgeInspections', { ID })
    await db.run(UPDATE('bridge.management.BridgeInspections').set({ active: false }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'Inspection', objectId: ID, objectName: old?.inspectionRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'active', oldValue: 'true', newValue: 'false' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeInspections').where({ ID }))
  })

  svc.on('reactivate', BridgeInspections, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgeInspections', { ID })
    await db.run(UPDATE('bridge.management.BridgeInspections').set({ active: true }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'Inspection', objectId: ID, objectName: old?.inspectionRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'active', oldValue: 'false', newValue: 'true' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeInspections').where({ ID }))
  })

  svc.on('complete', BridgeInspections, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const insp = await db.run(SELECT.one.from('bridge.management.BridgeInspections').where({ ID }))
    if (!insp) return req.error(404, 'Inspection not found')
    if (insp.overallConditionRating && insp.bridge_ID) {
      const updates = { conditionRating: insp.overallConditionRating }
      if (insp.inspectionDate) updates.lastInspectionDate = insp.inspectionDate
      await db.run(UPDATE('bridge.management.Bridges').set(updates).where({ ID: insp.bridge_ID }))
    }
    await writeChangeLogs(db, {
      objectType: 'Inspection', objectId: ID, objectName: insp.inspectionRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'status', oldValue: 'In Progress', newValue: 'Complete' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeInspections').where({ ID }))
  })

  // Resolve bridge_ID from linked inspection when creating an inspection element
  svc.before(['CREATE', 'UPDATE'], 'BridgeInspectionElements', async (req) => {
    if (!req.data.inspection_ID || req.data.bridge_ID) return
    const db = await cds.connect.to('db')
    const insp = await db.run(
      SELECT.one.from('bridge.management.BridgeInspections')
        .columns('bridge_ID').where({ ID: req.data.inspection_ID })
    )
    if (insp?.bridge_ID) req.data.bridge_ID = insp.bridge_ID
  })
}
