'use strict'
const cds = require('@sap/cds')

module.exports = function registerConditions(svc, helpers) {
  const { fetchCurrentRecord, writeChangeLogs, diffRecords } = helpers
  const { BridgeConditionSurveys } = svc.entities

  svc.on('deactivate', BridgeConditionSurveys.drafts, req => req.error(409, 'Save or discard your changes before deactivating.'))
  svc.on('reactivate', BridgeConditionSurveys.drafts, req => req.error(409, 'Save or discard your changes before reactivating.'))

  svc.before('NEW', BridgeConditionSurveys.drafts, async (req) => {
    if (!req.data.surveyRef) {
      const last = await cds.run(SELECT.one.from('bridge.management.BridgeConditionSurveys').columns('surveyRef').orderBy('surveyRef desc').limit(1))
      const m = last?.surveyRef?.match(/^CS-(\d+)$/)
      const seq = m ? parseInt(m[1], 10) + 1 : 1
      req.data.surveyRef = `CS-${String(seq).padStart(4, '0')}`
    }
    if (req.data.active === undefined) req.data.active = true
  })

  svc.on('deactivate', BridgeConditionSurveys, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgeConditionSurveys', { ID })
    await db.run(UPDATE('bridge.management.BridgeConditionSurveys').set({ active: false }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'ConditionSurvey', objectId: ID, objectName: old?.surveyRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'active', oldValue: 'true', newValue: 'false' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeConditionSurveys').where({ ID }))
  })

  svc.on('reactivate', BridgeConditionSurveys, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgeConditionSurveys', { ID })
    await db.run(UPDATE('bridge.management.BridgeConditionSurveys').set({ active: true }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'ConditionSurvey', objectId: ID, objectName: old?.surveyRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'active', oldValue: 'false', newValue: 'true' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeConditionSurveys').where({ ID }))
  })

  svc.before('UPDATE', BridgeConditionSurveys, async (req) => {
    if (!req.data?.ID) return
    const db = await cds.connect.to('db')
    req._auditOld = await fetchCurrentRecord(db, 'bridge.management.BridgeConditionSurveys', { ID: req.data.ID })
  })

  svc.after('UPDATE', BridgeConditionSurveys, async (_result, req) => {
    if (!req._auditOld) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.BridgeConditionSurveys', { ID: req._auditOld.ID })
    if (!fresh) return
    const changes = diffRecords(req._auditOld, fresh)
    if (!changes.length) return
    await writeChangeLogs(db, {
      objectType: 'ConditionSurvey', objectId: req._auditOld.ID,
      objectName: fresh.surveyRef || req._auditOld.ID, source: 'OData',
      batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system', changes
    })
  })

  svc.after('CREATE', BridgeConditionSurveys, async (result, req) => {
    if (!result?.ID) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.BridgeConditionSurveys', { ID: result.ID })
    if (!fresh) return
    const changes = Object.entries(fresh)
      .filter(([k, v]) => !['modifiedAt','modifiedBy','createdAt','createdBy'].includes(k) && v != null && v !== '')
      .map(([k, v]) => ({ fieldName: k, oldValue: '', newValue: String(v) }))
    await writeChangeLogs(db, {
      objectType: 'ConditionSurvey', objectId: result.ID, objectName: fresh.surveyRef || result.ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system', changes
    })
  })

  svc.on('submitForReview', BridgeConditionSurveys, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const survey = await db.run(SELECT.one.from('bridge.management.BridgeConditionSurveys').where({ ID }))
    if (!survey) return req.error(404, 'Condition survey not found')
    if (survey.status !== 'Draft')
      return req.error(422, `Cannot submit survey in status "${survey.status}" — only Draft surveys can be submitted`)
    await db.run(UPDATE('bridge.management.BridgeConditionSurveys').set({ status: 'Submitted' }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'ConditionSurvey', objectId: ID, objectName: survey.surveyRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'status', oldValue: 'Draft', newValue: 'Submitted' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeConditionSurveys').where({ ID }))
  })

  svc.on('approveSurvey', BridgeConditionSurveys, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const survey = await db.run(SELECT.one.from('bridge.management.BridgeConditionSurveys').where({ ID }))
    if (!survey) return req.error(404, 'Condition survey not found')
    if (survey.status !== 'Submitted')
      return req.error(422, `Cannot approve survey in status "${survey.status}" — only Submitted surveys can be approved`)
    await db.run(UPDATE('bridge.management.BridgeConditionSurveys').set({ status: 'Approved' }).where({ ID }))
    if (survey.conditionRating && survey.bridge_ID) {
      await db.run(UPDATE('bridge.management.Bridges')
        .set({ conditionRating: survey.conditionRating })
        .where({ ID: survey.bridge_ID }))
    }
    await writeChangeLogs(db, {
      objectType: 'ConditionSurvey', objectId: ID, objectName: survey.surveyRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'status', oldValue: 'Submitted', newValue: 'Approved' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeConditionSurveys').where({ ID }))
  })

  svc.on('rejectSurvey', BridgeConditionSurveys, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const survey = await db.run(SELECT.one.from('bridge.management.BridgeConditionSurveys').where({ ID }))
    if (!survey) return req.error(404, 'Condition survey not found')
    if (survey.status !== 'Submitted')
      return req.error(422, `Cannot reject survey in status "${survey.status}" — only Submitted surveys can be rejected`)
    await db.run(UPDATE('bridge.management.BridgeConditionSurveys').set({ status: 'Rejected' }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'ConditionSurvey', objectId: ID, objectName: survey.surveyRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'status', oldValue: 'Submitted', newValue: 'Rejected' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeConditionSurveys').where({ ID }))
  })

  svc.before('DELETE', BridgeConditionSurveys, (req) => {
    if (req.data?.IsActiveEntity !== false) req.error(405, 'Hard delete is not permitted. Use the Deactivate action instead.')
  })
}
