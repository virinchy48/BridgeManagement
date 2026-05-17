// Importers for lookup (CodeList) datasets and the AllowedValues multi-entity dataset.

const cds = require('@sap/cds')
const { SELECT, INSERT, UPDATE } = cds.ql
const { diffRecords, fetchCurrentRecord } = require('../audit-log')
const { ALLOWED_VALUES_WHITELIST } = require('./columns')
const {
  normalizeRows,
  stripMetadata,
  queueAudit,
  emptySummary,
  buildSummary
} = require('./upload-engine')

async function importLookupRows(tx, dataset, rows, warnings, auditContext) {
  const normalized = normalizeRows(dataset, rows, warnings)

  if (!normalized.length) {
    return emptySummary(dataset)
  }

  const codes = normalized.map((row) => row.code)
  const existingRows = await tx.run(
    SELECT.from(dataset.entity).columns('code').where({ code: { in: codes } })
  )
  const existingCodes = new Set(existingRows.map((row) => row.code))

  const inserts = []
  const updates = []

  for (const row of normalized) {
    if (existingCodes.has(row.code)) updates.push(row)
    else inserts.push(row)
  }

  if (inserts.length) {
    await tx.run(INSERT.into(dataset.entity).entries(inserts.map(stripMetadata)))
    for (const row of inserts) {
      queueAudit(auditContext, {
        objectType: 'Lookup',
        objectId:   `${dataset.name}:${row.code}`,
        objectName: `${dataset.label} / ${row.code}`,
        source:     'MassUpload',
        batchId:    auditContext?.batchId,
        changedBy:  auditContext?.changedBy || 'system',
        changes:    [{ fieldName: 'code', oldValue: '', newValue: row.code },
                     { fieldName: 'name', oldValue: '', newValue: row.name || '' }]
      })
    }
  }

  for (const row of updates) {
    const oldRow = await fetchCurrentRecord(tx, dataset.entity, { code: row.code })
    await tx.run(
      UPDATE(dataset.entity)
        .set({ name: row.name, descr: row.descr })
        .where({ code: row.code })
    )
    if (oldRow) {
      const changes = diffRecords({ name: oldRow.name, descr: oldRow.descr }, { name: row.name, descr: row.descr })
      if (changes.length) {
        queueAudit(auditContext, {
          objectType: 'Lookup',
          objectId:   `${dataset.name}:${row.code}`,
          objectName: `${dataset.label} / ${row.code}`,
          source:     'MassUpload',
          batchId:    auditContext?.batchId,
          changedBy:  auditContext?.changedBy || 'system',
          changes
        })
      }
    }
  }

  return buildSummary(dataset, normalized.length, inserts.length, updates.length)
}

async function importAllowedValueRows(tx, dataset, rows, warnings, auditContext) {
  const normalized = normalizeRows(dataset, rows, warnings)
  if (!normalized.length) return emptySummary(dataset)

  const mode = auditContext?.mode || 'upsert'
  const grouped = new Map()
  for (const row of normalized) {
    if (!ALLOWED_VALUES_WHITELIST.has(row.entityName)) {
      warnings.push(`AllowedValues: skipped row with unknown entityName "${row.entityName}". Allowed entities: ${[...ALLOWED_VALUES_WHITELIST].join(', ')}.`)
      continue
    }
    if (!grouped.has(row.entityName)) grouped.set(row.entityName, [])
    grouped.get(row.entityName).push(row)
  }

  let totalInserted = 0
  let totalUpdated = 0
  let totalProcessed = 0
  const rowResults = []
  const entityFieldMap = {
    DefectCodes: { labelField: 'description', descrField: null }
  }

  for (const [entityName, entityRows] of grouped) {
    const entityRef = `bridge.management.${entityName}`
    const { labelField = 'name', descrField = 'descr' } = entityFieldMap[entityName] || {}

    const codes = entityRows.map(r => r.code)
    const existingRows = await tx.run(SELECT.from(entityRef).columns('code').where({ code: { in: codes } }))
    const existingCodes = new Set(existingRows.map(r => r.code))

    const inserts = []
    const updates = []
    for (const row of entityRows) {
      if (existingCodes.has(row.code)) updates.push(row)
      else inserts.push(row)
    }

    if (mode !== 'update' && inserts.length) {
      await tx.run(INSERT.into(entityRef).entries(inserts.map(r => {
        const entry = { code: r.code, [labelField]: r.label || r.code }
        if (descrField) entry[descrField] = r.description || null
        entry.active = r.active !== false
        return entry
      })))
      for (const row of inserts) {
        queueAudit(auditContext, {
          objectType: 'Lookup',
          objectId:   `${entityName}:${row.code}`,
          objectName: `${entityName} / ${row.code}`,
          source:     'MassUpload',
          batchId:    auditContext?.batchId,
          changedBy:  auditContext?.changedBy || 'system',
          changes:    [{ fieldName: 'code', oldValue: '', newValue: row.code },
                       { fieldName: labelField, oldValue: '', newValue: row.label || '' }]
        })
        rowResults.push({ rowNum: row.__rowNumber, key: `${entityName}:${row.code}`, status: 'Created', action: 'insert', message: '' })
      }
      totalInserted += inserts.length
    } else if (mode === 'update') {
      for (const row of inserts) {
        const msg = `AllowedValues: skipped — ${entityName}:${row.code} not found. Use Upsert mode to create new codes.`
        warnings.push(msg)
        rowResults.push({ rowNum: row.__rowNumber, key: `${entityName}:${row.code}`, status: 'Skipped', action: 'skip', message: msg })
      }
    }

    if (mode !== 'create') {
      for (const row of updates) {
        const setClause = { [labelField]: row.label || row.code }
        if (descrField) setClause[descrField] = row.description || null
        if (row.active !== undefined) setClause.active = row.active !== false
        const oldRow = await fetchCurrentRecord(tx, entityRef, { code: row.code })
        await tx.run(UPDATE(entityRef).set(setClause).where({ code: row.code }))
        if (oldRow) {
          const changes = diffRecords(
            Object.fromEntries(Object.keys(setClause).map(k => [k, oldRow[k]])),
            setClause
          )
          if (changes.length) {
            queueAudit(auditContext, {
              objectType: 'Lookup',
              objectId:   `${entityName}:${row.code}`,
              objectName: `${entityName} / ${row.code}`,
              source:     'MassUpload',
              batchId:    auditContext?.batchId,
              changedBy:  auditContext?.changedBy || 'system',
              changes
            })
          }
        }
        rowResults.push({ rowNum: row.__rowNumber, key: `${entityName}:${row.code}`, status: 'Updated', action: 'update', message: '' })
      }
      totalUpdated += updates.length
    } else {
      for (const row of updates) {
        const msg = `AllowedValues: skipped — ${entityName}:${row.code} already exists. Use Upsert mode to update existing codes.`
        warnings.push(msg)
        rowResults.push({ rowNum: row.__rowNumber, key: `${entityName}:${row.code}`, status: 'Skipped', action: 'skip', message: msg })
      }
    }

    totalProcessed += entityRows.length
  }

  return {
    dataset: dataset.name,
    label: dataset.label,
    inserted: totalInserted,
    updated: totalUpdated,
    processed: totalProcessed,
    rowResults
  }
}

async function fetchAllLookupValues(db) {
  const results = []
  const entityFieldMap = {
    DefectCodes: { labelField: 'description', descrField: null }
  }
  for (const entityName of ALLOWED_VALUES_WHITELIST) {
    try {
      const entityRef = `bridge.management.${entityName}`
      const { labelField = 'name', descrField = 'descr' } = entityFieldMap[entityName] || {}
      const selectCols = ['code', labelField, descrField].filter(Boolean)
      const rows = await db.run(SELECT.from(entityRef).columns(...selectCols).orderBy('code'))
      for (const row of rows) {
        results.push({
          entityName,
          code:        row.code != null ? String(row.code) : '',
          label:       row[labelField] != null ? String(row[labelField]) : '',
          description: descrField && row[descrField] != null ? String(row[descrField]) : ''
        })
      }
    } catch (_) {
      // entity may not exist in dev — skip gracefully
    }
  }
  return results
}

module.exports = { importLookupRows, importAllowedValueRows, fetchAllLookupValues }
