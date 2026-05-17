'use strict'
const cds = require('@sap/cds')

module.exports = function registerRiskAssessments(svc, helpers) {
  const { fetchCurrentRecord, writeChangeLogs } = helpers
  const { BridgeRiskAssessments } = svc.entities

  svc.on('deactivate', BridgeRiskAssessments.drafts, req => req.error(409, 'Save or discard your changes before deactivating.'))
  svc.on('reactivate', BridgeRiskAssessments.drafts, req => req.error(409, 'Save or discard your changes before reactivating.'))

  svc.before('NEW', BridgeRiskAssessments.drafts, async (req) => {
    if (!req.data.assessmentId) {
      const last = await SELECT.one.from(BridgeRiskAssessments).columns('assessmentId').orderBy('assessmentId desc').limit(1)
      const m = last?.assessmentId?.match(/^RSK-(\d+)$/)
      const seq = m ? parseInt(m[1], 10) + 1 : 1
      req.data.assessmentId = `RSK-${String(seq).padStart(4, '0')}`
    }
    if (req.data.active === undefined) req.data.active = true
  })

  const _computeRiskScore = async (req, db) => {
    const d = req.data
    let likelihood = d.likelihood ?? null
    let consequence = d.consequence ?? null
    if ((likelihood === null || consequence === null) && d.ID) {
      const draft = await db.run(
        SELECT.one.from('bridge.management.BridgeRiskAssessments.drafts').columns('likelihood', 'consequence').where({ ID: d.ID })
      ).catch(() => null)
      likelihood = likelihood ?? draft?.likelihood ?? null
      consequence = consequence ?? draft?.consequence ?? null
    }
    if (likelihood !== null && consequence !== null) {
      d.inherentRiskScore = likelihood * consequence
      const score = d.inherentRiskScore
      d.inherentRiskLevel = score >= 15 ? 'Extreme' : score >= 10 ? 'High' : score >= 5 ? 'Medium' : 'Low'
    }

    let residualL = d.residualLikelihood ?? null
    let residualC = d.residualConsequence ?? null
    if ((residualL === null || residualC === null) && d.ID) {
      const draft = await db.run(
        SELECT.one.from('bridge.management.BridgeRiskAssessments.drafts')
          .columns('residualLikelihood', 'residualConsequence').where({ ID: d.ID })
      ).catch(() => null)
      residualL = residualL ?? draft?.residualLikelihood ?? null
      residualC = residualC ?? draft?.residualConsequence ?? null
    }
    if (residualL !== null && residualC !== null) {
      d.residualRiskScore = residualL * residualC
      const rs = d.residualRiskScore
      d.residualRiskLevel = rs >= 15 ? 'Extreme' : rs >= 10 ? 'High' : rs >= 5 ? 'Medium' : 'Low'
    }
  }

  svc.before(['CREATE', 'UPDATE'], BridgeRiskAssessments, async (req) => {
    await _computeRiskScore(req, await cds.connect.to('db'))
  })

  if (BridgeRiskAssessments?.drafts) {
    svc.before('UPDATE', BridgeRiskAssessments.drafts, async (req) => {
      await _computeRiskScore(req, await cds.connect.to('db'))
    })
  }

  svc.on('deactivate', BridgeRiskAssessments, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgeRiskAssessments', { ID })
    await db.run(UPDATE('bridge.management.BridgeRiskAssessments').set({ active: false }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'RiskAssessment', objectId: ID, objectName: old?.assessmentId || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'active', oldValue: 'true', newValue: 'false' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeRiskAssessments').where({ ID }))
  })

  svc.on('reactivate', BridgeRiskAssessments, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgeRiskAssessments', { ID })
    await db.run(UPDATE('bridge.management.BridgeRiskAssessments').set({ active: true }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'RiskAssessment', objectId: ID, objectName: old?.assessmentId || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'active', oldValue: 'false', newValue: 'true' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeRiskAssessments').where({ ID }))
  })
}
