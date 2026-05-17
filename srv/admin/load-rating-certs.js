'use strict'
const cds = require('@sap/cds')

module.exports = function registerLoadRatingCerts(svc, helpers) {
  const { fetchCurrentRecord, writeChangeLogs } = helpers
  const { LoadRatingCertificates } = svc.entities

  svc.before('NEW', LoadRatingCertificates.drafts, async (req) => {
    if (req.data.active === undefined) req.data.active = true
    if (!req.data.certificateNumber) {
      const last = await SELECT.one.from(LoadRatingCertificates).columns('certificateNumber').orderBy('createdAt desc')
      const m = last?.certificateNumber?.match(/^LRC-(\d+)$/)
      const seq = m ? parseInt(m[1], 10) + 1 : 1
      req.data.certificateNumber = 'LRC-' + String(seq).padStart(4, '0')
    }
  })

  svc.on('deactivate', LoadRatingCertificates, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.LoadRatingCertificates', { ID })
    await db.run(UPDATE('bridge.management.LoadRatingCertificates').set({ status: 'Superseded' }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'LoadRatingCert', objectId: ID, objectName: old?.certificateNumber || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'status', oldValue: old?.status || 'Current', newValue: 'Superseded' }]
    })
    return db.run(SELECT.one.from('bridge.management.LoadRatingCertificates').where({ ID }))
  })

  svc.on('reactivate', LoadRatingCertificates, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.LoadRatingCertificates', { ID })
    await db.run(UPDATE('bridge.management.LoadRatingCertificates').set({ status: 'Current' }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'LoadRatingCert', objectId: ID, objectName: old?.certificateNumber || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'status', oldValue: old?.status || 'Superseded', newValue: 'Current' }]
    })
    return db.run(SELECT.one.from('bridge.management.LoadRatingCertificates').where({ ID }))
  })
}
