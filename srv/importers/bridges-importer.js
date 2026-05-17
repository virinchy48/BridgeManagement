// Importer for the Bridges dataset.

const cds = require('@sap/cds')
const { INSERT, UPDATE } = cds.ql
const { diffRecords, fetchCurrentRecord } = require('../audit-log')
const {
  normalizeRows,
  readExistingRows,
  getNextIntegerKey,
  resolveExistingBridgeRow,
  stripPrimaryKey,
  stripMetadata,
  queueAudit,
  emptySummary,
  buildSummary
} = require('./upload-engine')

async function importBridgeRows(tx, dataset, rows, warnings, auditContext) {
  const normalized = normalizeRows(dataset, rows, warnings)
  const mode = auditContext?.mode || 'upsert'

  if (!normalized.length) {
    return emptySummary(dataset)
  }

  const ids = normalized.map((row) => row.ID).filter((value) => value !== null && value !== undefined)
  const bridgeIds = normalized.map((row) => row.bridgeId).filter(Boolean)
  const existingRows = await readExistingRows(tx, dataset.entity, 'ID', ids, 'bridgeId', bridgeIds)

  const existingById = new Map(existingRows.filter((row) => row.ID !== null && row.ID !== undefined).map((row) => [row.ID, row]))
  const existingByBridgeId = new Map(existingRows.filter((row) => row.bridgeId).map((row) => [row.bridgeId, row]))
  let nextId = await getNextIntegerKey(tx, dataset.entity, 'ID')

  const inserts = []
  const updates = []
  const rowResults = []

  for (const row of normalized) {
    const existing = resolveExistingBridgeRow(row, existingById, existingByBridgeId)

    if (existing) {
      if (mode === 'create') {
        const msg = `Bridges row ${row.__rowNumber}: skipped — bridgeId '${row.bridgeId || existing.bridgeId}' already exists. Use Update mode to modify existing records.`
        warnings.push(msg)
        rowResults.push({ rowNum: row.__rowNumber, key: row.bridgeId || existing.bridgeId || '(blank)', status: 'Skipped', action: 'skip', message: msg })
        continue
      }
      row.ID = existing.ID
      if (!row.bridgeId) row.bridgeId = existing.bridgeId
      updates.push(row)
      rowResults.push({ rowNum: row.__rowNumber, key: row.bridgeId || String(row.ID), status: 'Updated', action: 'update', message: 'Record updated successfully' })
      continue
    }

    if (mode === 'update') {
      const msg = `Bridges row ${row.__rowNumber}: skipped — bridgeId '${row.bridgeId || '(blank)'}' not found in the system. Use Create mode to add new bridges.`
      warnings.push(msg)
      rowResults.push({ rowNum: row.__rowNumber, key: row.bridgeId || '(blank)', status: 'Skipped', action: 'skip', message: msg })
      continue
    }

    if (row.ID === null || row.ID === undefined) {
      row.ID = nextId++
    }
    inserts.push(row)
    existingById.set(row.ID, row)
    if (row.bridgeId) existingByBridgeId.set(row.bridgeId, row)
    rowResults.push({ rowNum: row.__rowNumber, key: row.bridgeId || String(row.ID), status: 'Created', action: 'create', message: 'Record created successfully' })
  }

  if (inserts.length) {
    await tx.run(INSERT.into(dataset.entity).entries(inserts.map(stripMetadata)))
    for (const row of inserts) {
      queueAudit(auditContext, {
        objectType: 'Bridge',
        objectId:   String(row.ID),
        objectName: row.bridgeName || String(row.ID),
        source:     'MassUpload',
        batchId:    auditContext?.batchId,
        changedBy:  auditContext?.changedBy || 'system',
        changes:    Object.entries(stripMetadata(row))
          .filter(([changedBridgeField, changedBridgeData]) => !['__rowNumber'].includes(changedBridgeField) && changedBridgeData != null && changedBridgeData !== '')
          .map(([changedBridgeField, changedBridgeData]) => ({ fieldName: changedBridgeField, oldValue: '', newValue: String(changedBridgeData) }))
      })
    }
  }

  for (const row of updates) {
    const oldRecord = await fetchCurrentRecord(tx, dataset.entity, { ID: row.ID })
    const patch = stripPrimaryKey(row, ['ID'])
    await tx.run(
      UPDATE(dataset.entity)
        .set(patch)
        .where({ ID: row.ID })
    )
    if (oldRecord) {
      const changes = diffRecords(
        Object.fromEntries(Object.keys(patch).map(k => [k, oldRecord[k]])),
        patch
      )
      if (changes.length) {
        queueAudit(auditContext, {
          objectType: 'Bridge',
          objectId:   String(row.ID),
          objectName: oldRecord.bridgeName || row.bridgeName || String(row.ID),
          source:     'MassUpload',
          batchId:    auditContext?.batchId,
          changedBy:  auditContext?.changedBy || 'system',
          changes
        })
      }
    }
  }

  return buildSummary(dataset, normalized.length, inserts.length, updates.length, 0, 0, rowResults)
}

module.exports = { importBridgeRows }
