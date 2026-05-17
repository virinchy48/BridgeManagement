'use strict'
const cds = require('@sap/cds')

module.exports = function registerNhvr(svc, helpers) {
  const { fetchCurrentRecord, writeChangeLogs } = helpers
  const { NhvrRouteAssessments } = svc.entities

  svc.before('NEW', NhvrRouteAssessments.drafts, async (req) => {
    if (!req.data.assessmentId) {
      const last = await cds.run(SELECT.one.from('bridge.management.NhvrRouteAssessments').columns('assessmentId').orderBy('assessmentId desc').limit(1))
      const m = last?.assessmentId?.match(/^NRA-(\d+)$/)
      const seq = m ? parseInt(m[1], 10) + 1 : 1
      req.data.assessmentId = `NRA-${String(seq).padStart(4, '0')}`
    }
    if (req.data.active === undefined) req.data.active = true
  })

  svc.on('deactivate', NhvrRouteAssessments, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.NhvrRouteAssessments', { ID })
    await db.run(UPDATE('bridge.management.NhvrRouteAssessments').set({ assessmentStatus: 'Superseded' }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'NhvrAssessment', objectId: ID, objectName: old?.assessmentId || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'assessmentStatus', oldValue: old?.assessmentStatus || 'Current', newValue: 'Superseded' }]
    })
    // Roll back Bridge.nhvrAssessed to most recent remaining Current assessment, or clear if none
    if (old?.bridge_ID) {
      const remaining = await db.run(
        SELECT.one.from('bridge.management.NhvrRouteAssessments')
          .columns('assessmentDate')
          .where({ bridge_ID: old.bridge_ID, assessmentStatus: 'Current' })
          .orderBy('assessmentDate desc')
      )
      await db.run(UPDATE('bridge.management.Bridges')
        .set({ nhvrAssessed: !!remaining, nhvrAssessmentDate: remaining?.assessmentDate ?? null })
        .where({ ID: old.bridge_ID }))
    }
    return db.run(SELECT.one.from('bridge.management.NhvrRouteAssessments').where({ ID }))
  })

  svc.on('reactivate', NhvrRouteAssessments, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.NhvrRouteAssessments', { ID })
    await db.run(UPDATE('bridge.management.NhvrRouteAssessments').set({ assessmentStatus: 'Current' }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'NhvrAssessment', objectId: ID, objectName: old?.assessmentId || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'assessmentStatus', oldValue: old?.assessmentStatus || 'Superseded', newValue: 'Current' }]
    })
    // Re-sync Bridge.nhvrAssessed to reflect newly Current assessment
    if (old?.bridge_ID && old?.assessmentDate) {
      await db.run(UPDATE('bridge.management.Bridges')
        .set({ nhvrAssessed: true, nhvrAssessmentDate: old.assessmentDate })
        .where({ ID: old.bridge_ID }))
    }
    return db.run(SELECT.one.from('bridge.management.NhvrRouteAssessments').where({ ID }))
  })

  // Forward-sync: when an assessment is created/updated with status Current, update the bridge
  svc.after(['CREATE', 'UPDATE'], NhvrRouteAssessments, async (data) => {
    if (!data?.bridge_ID || data?.assessmentStatus !== 'Current') return
    const db = await cds.connect.to('db')
    await db.run(UPDATE('bridge.management.Bridges')
      .set({ nhvrAssessed: true, nhvrAssessmentDate: data.assessmentDate })
      .where({ ID: data.bridge_ID }))
  })
}
