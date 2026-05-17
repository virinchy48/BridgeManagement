// Upload session recording and history queries.

const cds = require('@sap/cds')
const { SELECT, INSERT } = cds.ql

async function recordUploadSession(db, { fileName, datasetName, uploadedBy, mode, summaries, warnings }) {
  const totalRows       = summaries.reduce((s, x) => s + (x.processed || 0), 0)
  const insertedRows    = summaries.reduce((s, x) => s + (x.inserted  || 0), 0)
  const updatedRows     = summaries.reduce((s, x) => s + (x.updated   || 0), 0)
  const deactivatedRows = summaries.reduce((s, x) => s + (x.deactivated || 0), 0)
  const hasErrors       = warnings.some(w => /error|Error|failed|Failed/.test(w))
  const session = {
    ID:             cds.utils.uuid(),
    fileName,
    datasetName:    datasetName || 'All',
    mode:           mode || 'upsert',
    status:         hasErrors ? 'PartialSuccess' : 'Completed',
    totalRows,
    insertedRows,
    updatedRows,
    deactivatedRows,
    warningCount:   warnings.length,
    errorCount:     0,
    summaryJson:    JSON.stringify(summaries),
    warningsJson:   JSON.stringify(warnings.slice(0, 100))
  }
  try {
    await db.run(INSERT.into('bridge.management.UploadSessions').entries([session]))
  } catch (_) {
    // never let session recording break an otherwise successful upload
  }
  return session
}

async function getUploadHistory(limit = 50) {
  const db = await cds.connect.to('db')
  return db.run(
    SELECT.from('bridge.management.UploadSessions')
      .columns('ID', 'fileName', 'datasetName', 'mode', 'status', 'totalRows', 'insertedRows', 'updatedRows',
               'deactivatedRows', 'warningCount', 'errorCount', 'summaryJson', 'createdAt', 'createdBy')
      .orderBy('createdAt desc')
      .limit(limit)
  )
}

async function getUploadSessionById(id) {
  const db = await cds.connect.to('db')
  const session = await db.run(SELECT.one.from('bridge.management.UploadSessions').where({ ID: id }))
  if (!session) return null
  return {
    ...session,
    summaries: JSON.parse(session.summaryJson  || '[]'),
    warnings:  JSON.parse(session.warningsJson || '[]')
  }
}

module.exports = { recordUploadSession, getUploadHistory, getUploadSessionById }
