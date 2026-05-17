// Importer for the Restrictions dataset.

const cds = require('@sap/cds')
const { INSERT, UPDATE } = cds.ql
const { diffRecords, fetchCurrentRecord } = require('../audit-log')
const {
  normalizeRows,
  readExistingRows,
  resolveExistingRestrictionRow,
  enrichRestrictionsWithBridgeKeys,
  stripPrimaryKey,
  stripMetadata,
  queueAudit,
  emptySummary,
  buildSummary
} = require('./upload-engine')

async function importRestrictionRows(tx, dataset, rows, warnings, auditContext) {
  const normalized = normalizeRows(dataset, rows, warnings)
  const mode = auditContext?.mode || 'upsert'

  if (!normalized.length) {
    return emptySummary(dataset)
  }

  await enrichRestrictionsWithBridgeKeys(tx, normalized)

  const ids = normalized.map((row) => row.ID).filter(Boolean)
  const refs = normalized.map((row) => row.restrictionRef).filter(Boolean)
  const existingRows = await readExistingRows(tx, dataset.entity, 'ID', ids, 'restrictionRef', refs)

  const existingById = new Map(existingRows.filter((row) => row.ID).map((row) => [row.ID, row]))
  const existingByRef = new Map(existingRows.filter((row) => row.restrictionRef).map((row) => [row.restrictionRef, row]))

  const inserts = []
  const updates = []
  const rowResults = []

  for (const row of normalized) {
    if (!row.name) {
      row.name = row.restrictionRef || row.restrictionType || 'Restriction'
    }
    if (row.temporary === null && row.restrictionCategory) {
      row.temporary = row.restrictionCategory === 'Temporary'
    }
    if (row.active === null) {
      row.active = true
    }

    const existing = resolveExistingRestrictionRow(row, existingById, existingByRef)
    if (existing) {
      if (mode === 'create') {
        const msg = `Restrictions row ${row.__rowNumber}: skipped — restrictionRef '${row.restrictionRef || existing.restrictionRef}' already exists. Use Update mode to modify existing records.`
        warnings.push(msg)
        rowResults.push({ rowNum: row.__rowNumber, key: row.restrictionRef || existing.restrictionRef || '(blank)', status: 'Skipped', action: 'skip', message: msg })
        continue
      }
      row.ID = existing.ID
      updates.push(row)
      rowResults.push({ rowNum: row.__rowNumber, key: row.restrictionRef || row.ID, status: 'Updated', action: 'update', message: 'Record updated successfully' })
      continue
    }

    if (mode === 'update') {
      const msg = `Restrictions row ${row.__rowNumber}: skipped — restrictionRef '${row.restrictionRef || '(blank)'}' not found in the system. Use Create mode to add new restrictions.`
      warnings.push(msg)
      rowResults.push({ rowNum: row.__rowNumber, key: row.restrictionRef || '(blank)', status: 'Skipped', action: 'skip', message: msg })
      continue
    }

    if (!row.ID) {
      row.ID = cds.utils.uuid()
    }
    inserts.push(row)
    existingById.set(row.ID, row)
    existingByRef.set(row.restrictionRef, row)
    rowResults.push({ rowNum: row.__rowNumber, key: row.restrictionRef || row.ID, status: 'Created', action: 'create', message: 'Record created successfully' })
  }

  if (inserts.length) {
    await tx.run(INSERT.into(dataset.entity).entries(inserts.map(stripMetadata)))
    for (const row of inserts) {
      queueAudit(auditContext, {
        objectType: 'Restriction',
        objectId:   row.ID,
        objectName: row.restrictionRef || row.ID,
        source:     'MassUpload',
        batchId:    auditContext?.batchId,
        changedBy:  auditContext?.changedBy || 'system',
        changes:    Object.entries(stripMetadata(row))
          .filter(([changedRestrictionField, changedRestrictionData]) => !['__rowNumber'].includes(changedRestrictionField) && changedRestrictionData != null && changedRestrictionData !== '')
          .map(([changedRestrictionField, changedRestrictionData]) => ({ fieldName: changedRestrictionField, oldValue: '', newValue: String(changedRestrictionData) }))
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
          objectType: 'Restriction',
          objectId:   row.ID,
          objectName: oldRecord.restrictionRef || row.restrictionRef || row.ID,
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

module.exports = { importRestrictionRows }
