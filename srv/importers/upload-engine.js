// Core upload pipeline — parsing, normalisation, enrichment, and upsert helpers.
// Imported by all importer files. Does NOT import from importers (no circular deps).

const cds = require('@sap/cds')
const XLSX = require('xlsx')
const { SELECT, INSERT, UPDATE } = cds.ql
const { diffRecords, writeChangeLogs, fetchCurrentRecord } = require('../audit-log')
const { LOOKUP_COLUMNS } = require('./columns')

function parseSheetRows(sheet, dataset) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true, cellDates: true })
  if (!rows.length) return []

  const headers = Object.keys(rows[0])
  const normalizedHeaders = new Map(headers.map((header) => [String(header).replace(/^﻿/, '').replace(/\*$/, '').trim().toLowerCase(), header]))

  for (const columnDef of dataset.columns) {
    const fieldKey = (columnDef.name || columnDef.field || '').toLowerCase()
    const headerKey = (columnDef.header || columnDef.name || columnDef.field || '').replace(/\s*\*\s*$/, '').trim().toLowerCase()
    const found = normalizedHeaders.has(fieldKey) || normalizedHeaders.has(headerKey)
    if (columnDef.required && !found) {
      throw new Error(`Sheet "${dataset.name}" must contain a "${columnDef.name || columnDef.header}" column.`)
    }
  }

  return rows.map((row, index) => {
    const mappedRow = { __rowNumber: index + 2 }
    for (const columnDef of dataset.columns) {
      const outputKey = columnDef.field || columnDef.name
      const fieldKey = (columnDef.name || columnDef.field || '').toLowerCase()
      const headerKey = (columnDef.header || columnDef.name || columnDef.field || '').replace(/\s*\*\s*$/, '').trim().toLowerCase()
      const originalHeader = normalizedHeaders.get(fieldKey) || normalizedHeaders.get(headerKey)
      mappedRow[outputKey] = originalHeader ? row[originalHeader] : null
    }
    return mappedRow
  })
}

function normalizeRows(dataset, rows, warnings) {
  if (rows.length && rows[0].__alreadyNormalized) return rows
  const deduped = new Map()

  for (const row of rows) {
    const normalized = normalizeRow(dataset, row, warnings)
    if (!normalized) continue

    const dedupeKey = getDedupeKey(dataset, normalized)
    deduped.set(dedupeKey, normalized)
  }

  return [...deduped.values()]
}

function normalizeRow(dataset, row, warnings) {
  const normalized = {}

  for (const columnDef of dataset.columns) {
    normalized[columnDef.name] = convertCellValue(row[columnDef.name], columnDef, dataset.name, row.__rowNumber, warnings)
  }

  normalized.__rowNumber = row.__rowNumber

  const hasData = dataset.columns.some((columnDef) => hasValue(normalized[columnDef.name]))
  if (!hasData) return null

  const missingRequired = dataset.columns
    .filter((columnDef) => columnDef.required && !hasValue(normalized[columnDef.name]))
    .map((columnDef) => columnDef.name)

  if (missingRequired.length) {
    if (warnings) {
      warnings.push(
        `${dataset.name} row ${row.__rowNumber}: skipped — required field(s) missing: ${missingRequired.join(', ')}. ` +
        'Fill in the missing values and re-upload this row.'
      )
    }
    return null
  }

  if (dataset.columns === LOOKUP_COLUMNS) {
    if (!normalized.name) normalized.name = normalized.code
    return normalized
  }

  if (dataset.name === 'AllowedValues') {
    if (!normalized.label) normalized.label = normalized.code
    return normalized
  }

  if (dataset.name === 'Bridges' && !hasValue(normalized.ID) && !hasValue(normalized.bridgeId)) {
    if (warnings) {
      warnings.push(
        `Bridges row ${row.__rowNumber}: skipped — provide either "ID" or "bridgeId" so the row can be matched or inserted.`
      )
    }
    return null
  }

  if (dataset.name === 'Restrictions' && !hasValue(normalized.ID) && !hasValue(normalized.restrictionRef)) {
    if (warnings) {
      warnings.push(
        `Restrictions row ${row.__rowNumber}: skipped — provide either "ID" or "restrictionRef" so the row can be matched or inserted.`
      )
    }
    return null
  }

  if (dataset.name === 'BridgeRestrictions' && !hasValue(normalized.restrictionRef)) {
    if (warnings) {
      warnings.push(`BridgeRestrictions row ${row.__rowNumber}: skipped — "restrictionRef" is required as a natural key.`)
    }
    return null
  }

  if (dataset.name === 'LoadRatingCertificates' && !hasValue(normalized.certificateNumber)) {
    if (warnings) {
      warnings.push(`LoadRatingCertificates row ${row.__rowNumber}: skipped — "certificateNumber" is required as a natural key.`)
    }
    return null
  }

  return normalized
}

function convertCellValue(value, columnDef, datasetName, rowNumber, warnings) {
  if (!hasValue(value)) return null

  switch (columnDef.type) {
    case 'string':
      return String(value).trim()
    case 'integer': {
      if (typeof value === 'number') {
        if (!Number.isInteger(value)) {
          return handleBadNumeric(columnDef, datasetName, rowNumber, value, warnings,
            `must be a whole number (got ${value})`)
        }
        return value
      }
      const intStr = String(value).trim().replace(/,(?=\d{3}(\D|$))/g, '')
      const intVal = Number(intStr)
      if (!Number.isInteger(intVal)) {
        return handleBadNumeric(columnDef, datasetName, rowNumber, String(value).trim(), warnings,
          `must be a whole number (got "${String(value).trim()}")`)
      }
      return intVal
    }
    case 'decimal': {
      if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
          return handleBadNumeric(columnDef, datasetName, rowNumber, value, warnings,
            `must be a number (got ${value})`)
        }
        return value
      }
      let decStr = String(value).trim()
      if (decStr.includes(',') && !decStr.includes('.')) {
        const afterComma = decStr.slice(decStr.lastIndexOf(',') + 1)
        decStr = afterComma.length <= 2
          ? decStr.replace(',', '.')
          : decStr.replace(/,/g, '')
      } else {
        decStr = decStr.replace(/,(?=\d{3}(\.|$))/g, '')
      }
      const decVal = Number(decStr)
      if (!Number.isFinite(decVal)) {
        return handleBadNumeric(columnDef, datasetName, rowNumber, String(value).trim(), warnings,
          `must be a number (got "${String(value).trim()}")`)
      }
      return decVal
    }
    case 'boolean':
      return parseBoolean(value, datasetName, rowNumber, columnDef.name)
    case 'date':
      return parseDate(value, datasetName, rowNumber, columnDef.name)
    default:
      return value
  }
}

function handleBadNumeric(columnDef, datasetName, rowNumber, displayValue, warnings, hint) {
  if (columnDef.required) {
    throw new Error(`${datasetName} row ${rowNumber}: "${columnDef.name}" is required and ${hint}. Correct the value or leave it empty only if the field is not mandatory.`)
  }
  if (warnings) {
    warnings.push(`${datasetName} row ${rowNumber}: "${columnDef.name}" ${hint} — cleared to empty.`)
  }
  return null
}

function parseBoolean(value, datasetName, rowNumber, columnName) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (value === 1) return true
    if (value === 0) return false
  }

  const normalized = String(value).trim().toLowerCase()
  if (['true', 'yes', 'y', '1'].includes(normalized)) return true
  if (['false', 'no', 'n', '0'].includes(normalized)) return false

  throw new Error(`${datasetName} row ${rowNumber}: "${columnName}" must be true or false.`)
}

function parseDate(value, datasetName, rowNumber, columnName) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) {
      const month = String(parsed.m).padStart(2, '0')
      const day = String(parsed.d).padStart(2, '0')
      return `${parsed.y}-${month}-${day}`
    }
  }

  const normalized = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized

  const parsedDate = new Date(normalized)
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 10)
  }

  throw new Error(`${datasetName} row ${rowNumber}: "${columnName}" must be a valid date.`)
}

function parsePrimaryLookupRowKey(row) {
  return row.code
}

function getDedupeKey(dataset, row) {
  if (dataset.columns === LOOKUP_COLUMNS) return parsePrimaryLookupRowKey(row)
  if (dataset.name === 'AllowedValues') return `${row.entityName}:${row.code}`
  if (dataset.name === 'Bridges') return row.ID ?? `bridgeId:${row.bridgeId}`
  if (dataset.name === 'Restrictions') return row.ID ?? `restrictionRef:${row.restrictionRef}`
  if (dataset.name === 'BridgeInspections') return row.ID ?? `${row.bridgeRef}|${row.inspectionDate}|${row.inspectionType}`
  if (dataset.name === 'BridgeElements') return row.ID ?? `${row.bridgeRef}|${row.elementId}`
  if (dataset.name === 'BridgeRestrictions') return row.ID ?? `${row.bridgeRef}|${row.restrictionRef}`
  if (dataset.name === 'LoadRatingCertificates') return row.ID ?? `${row.bridgeRef}|${row.certificateNumber}`
  if (dataset.name === 'BridgeRestrictionProvisions') return row.ID ?? `${row.restrictionRef}|${row.provisionNumber}`
  if (dataset.name === 'RestrictionProvisions') return row.ID ?? `${row.restrictionRef}|${row.provisionCode}`
  if (dataset.name === 'BridgeConditionSurveys') return row.ID ?? (row.surveyRef ? `surveyRef:${row.surveyRef}` : `${row.bridgeRef}|${row.surveyDate}|${row.surveyType}`)
  if (dataset.name === 'BridgeLoadRatings') return row.ID ?? (row.ratingRef ? `ratingRef:${row.ratingRef}` : `${row.bridgeRef}|${row.vehicleClass}|${row.assessmentDate}`)
  if (dataset.name === 'BridgePermits') return row.ID ?? (row.permitRef ? `permitRef:${row.permitRef}` : `${row.bridgeRef}|${row.permitType}|${row.applicantName}|${row.appliedDate}`)
  return JSON.stringify(row)
}

function resolveExistingBridgeRow(row, existingById, existingByBridgeId) {
  if (row.ID !== null && row.ID !== undefined && existingById.has(row.ID)) {
    return existingById.get(row.ID)
  }
  if (row.bridgeId && existingByBridgeId.has(row.bridgeId)) {
    return existingByBridgeId.get(row.bridgeId)
  }
  return null
}

function resolveExistingRestrictionRow(row, existingById, existingByRef) {
  if (row.ID && existingById.has(row.ID)) {
    return existingById.get(row.ID)
  }
  if (row.restrictionRef && existingByRef.has(row.restrictionRef)) {
    return existingByRef.get(row.restrictionRef)
  }
  return null
}

async function getNextIntegerKey(tx, entity, keyName) {
  const result = await tx.run(
    SELECT.one.from(entity).columns(`max(${keyName}) as value`)
  )
  return Number(result?.value || 0) + 1
}

async function readExistingRows(tx, entity, primaryKey, primaryValues, alternateKey, alternateValues) {
  const [byPrimary, byAlternate] = await Promise.all([
    primaryValues.length
      ? tx.run(SELECT.from(entity).columns(primaryKey, alternateKey).where({ [primaryKey]: { in: primaryValues } }))
      : Promise.resolve([]),
    alternateValues.length
      ? tx.run(SELECT.from(entity).columns(primaryKey, alternateKey).where({ [alternateKey]: { in: alternateValues } }))
      : Promise.resolve([])
  ])

  const merged = new Map()
  for (const row of [...byPrimary, ...byAlternate]) {
    merged.set(String(row[primaryKey]), row)
  }
  return [...merged.values()]
}

function stripPrimaryKey(row, keyNames) {
  const cleaned = {}
  for (const [key, value] of Object.entries(row)) {
    if (keyNames.includes(key) || key === '__rowNumber') continue
    cleaned[key] = value
  }
  return cleaned
}

function stripMetadata(row) {
  const cleaned = {}
  for (const [key, value] of Object.entries(row)) {
    if (key === '__rowNumber' || key === '__alreadyNormalized') continue
    cleaned[key] = value
  }
  return cleaned
}

function queueAudit(auditContext, entry) {
  if (!auditContext) return
  if (!auditContext._auditQueue) auditContext._auditQueue = []
  auditContext._auditQueue.push(entry)
}

async function enrichRestrictionsWithBridgeKeys(tx, rows) {
  const bridgeRefs = [...new Set(rows.map((row) => row.bridgeRef).filter(Boolean))]
  if (!bridgeRefs.length) return

  const bridges = await tx.run(
    SELECT.from('bridge.management.Bridges').columns('ID', 'bridgeId').where({ bridgeId: { in: bridgeRefs } })
  )
  const bridgeByRef = new Map(bridges.map((bridge) => [bridge.bridgeId, bridge.ID]))

  for (const row of rows) {
    if (!row.bridgeRef) continue
    const bridgeId = bridgeByRef.get(row.bridgeRef)
    if (!bridgeId) {
      throw new Error(`Restrictions row ${row.__rowNumber}: unknown bridgeRef "${row.bridgeRef}".`)
    }
    row.bridge_ID = bridgeId
  }
}

async function enrichRowsWithBridgeId(tx, rows, datasetName) {
  const bridgeRefs = [...new Set(rows.map(r => r.bridgeRef).filter(Boolean))]
  if (!bridgeRefs.length) return
  const bridges = await tx.run(
    SELECT.from('bridge.management.Bridges').columns('ID', 'bridgeId').where({ bridgeId: { in: bridgeRefs } })
  )
  const bridgeMap = new Map(bridges.map(b => [b.bridgeId, b.ID]))
  for (const row of rows) {
    if (!row.bridgeRef) continue
    const id = bridgeMap.get(row.bridgeRef)
    if (!id) throw new Error(`${datasetName} row ${row.__rowNumber}: unknown bridgeRef "${row.bridgeRef}" — no bridge with that Bridge ID exists.`)
    row.bridge_ID = id
  }
}

async function batchGenerateRefs(tx, entityName, refField, prefix, rows) {
  const blanks = rows.filter(r => !r[refField])
  if (!blanks.length) return
  const existing = await tx.run(SELECT.from(entityName).columns(refField))
  const pattern = new RegExp(`^${prefix}(\\d+)$`)
  let maxSeq = 0
  for (const rec of existing) {
    const m = rec[refField]?.match(pattern)
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10))
  }
  for (const row of rows.filter(r => r[refField])) {
    const m = row[refField]?.match(pattern)
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10))
  }
  let seq = maxSeq + 1
  for (const row of blanks) {
    row[refField] = `${prefix}${String(seq).padStart(4, '0')}`
    seq++
  }
}

async function importCuidEntityRows(tx, dataset, rows, warnings, auditContext, { naturalKey, objectType, getName, extraEnrich = null }) {
  const normalized = normalizeRows(dataset, rows, warnings)
  const mode = auditContext?.mode || 'upsert'
  if (!normalized.length) return emptySummary(dataset)

  await enrichRowsWithBridgeId(tx, normalized, dataset.name)
  if (extraEnrich) await extraEnrich(tx, normalized, warnings)

  const ids = normalized.map(r => r.ID).filter(Boolean)
  const existingById = new Map()
  if (ids.length) {
    const existing = await tx.run(SELECT.from(dataset.entity).columns('ID', naturalKey).where({ ID: { in: ids } }))
    existing.forEach(r => existingById.set(r.ID, r))
  }

  const naturalKeys = normalized.map(r => r[naturalKey]).filter(Boolean)
  const existingByNaturalKey = new Map()
  if (naturalKeys.length) {
    const existing = await tx.run(SELECT.from(dataset.entity).columns('ID', naturalKey).where({ [naturalKey]: { in: naturalKeys } }))
    existing.forEach(r => existingByNaturalKey.set(r[naturalKey], r))
  }

  const inserts = []
  const updates = []
  const rowResults = []

  for (const row of normalized) {
    const existing = (row.ID && existingById.get(row.ID)) || (row[naturalKey] && existingByNaturalKey.get(row[naturalKey]))
    if (existing) {
      if (mode === 'create') {
        const msg = `${dataset.name} row ${row.__rowNumber}: skipped — ${naturalKey} '${row[naturalKey] || existing[naturalKey]}' already exists. Use Update mode to modify existing records.`
        warnings.push(msg)
        rowResults.push({ rowNum: row.__rowNumber, key: row[naturalKey] || existing[naturalKey] || '(blank)', status: 'Skipped', action: 'skip', message: msg })
        continue
      }
      row.ID = existing.ID
      updates.push(row)
      rowResults.push({ rowNum: row.__rowNumber, key: row[naturalKey] || row.ID, status: 'Updated', action: 'update', message: 'Record updated successfully' })
      continue
    }
    if (mode === 'update') {
      const msg = `${dataset.name} row ${row.__rowNumber}: skipped — ${naturalKey} '${row[naturalKey] || '(blank)'}' not found in the system. Use Create mode to add new records.`
      warnings.push(msg)
      rowResults.push({ rowNum: row.__rowNumber, key: row[naturalKey] || '(blank)', status: 'Skipped', action: 'skip', message: msg })
      continue
    }
    if (!row.ID) row.ID = cds.utils.uuid()
    inserts.push(row)
    existingById.set(row.ID, row)
    if (row[naturalKey]) existingByNaturalKey.set(row[naturalKey], row)
    rowResults.push({ rowNum: row.__rowNumber, key: row[naturalKey] || '(new)', status: 'Created', action: 'create', message: 'Record created successfully' })
  }

  if (inserts.length) {
    await tx.run(INSERT.into(dataset.entity).entries(inserts.map(stripMetadata)))
    for (const row of inserts) {
      queueAudit(auditContext, {
        objectType, objectId: row.ID, objectName: getName(row),
        source: 'MassUpload', batchId: auditContext?.batchId, changedBy: auditContext?.changedBy || 'system',
        changes: Object.entries(stripMetadata(row))
          .filter(([k, v]) => !['__rowNumber'].includes(k) && v != null && v !== '')
          .map(([k, v]) => ({ fieldName: k, oldValue: '', newValue: String(v) }))
      })
    }
  }

  for (const row of updates) {
    const oldRecord = await fetchCurrentRecord(tx, dataset.entity, { ID: row.ID })
    const patch = stripPrimaryKey(row, ['ID'])
    await tx.run(UPDATE(dataset.entity).set(patch).where({ ID: row.ID }))
    if (oldRecord) {
      const changes = diffRecords(Object.fromEntries(Object.keys(patch).map(k => [k, oldRecord[k]])), patch)
      if (changes.length) {
        queueAudit(auditContext, {
          objectType, objectId: row.ID, objectName: getName(oldRecord) || getName(row),
          source: 'MassUpload', batchId: auditContext?.batchId, changedBy: auditContext?.changedBy || 'system',
          changes
        })
      }
    }
  }

  return buildSummary(dataset, normalized.length, inserts.length, updates.length, 0, 0, rowResults)
}

async function readDatasetRows(dbOrTx, dataset) {
  if (!dataset.entity) return []
  const allCols = dataset.columns.map((c) => c.name || c.field).filter(Boolean)
  const needsBridgeRef = allCols.includes('bridgeRef')

  const readCols = needsBridgeRef
    ? [...allCols.filter((c) => c !== 'bridge_ID'), 'bridge_ID']
    : allCols

  let rows
  try {
    rows = await dbOrTx.run(SELECT.from(dataset.entity).columns(...readCols).orderBy(dataset.orderBy))
  } catch (_) {
    try {
      rows = await dbOrTx.run(SELECT.from(dataset.entity).orderBy(dataset.orderBy))
    } catch (_2) {
      return []
    }
  }

  if (needsBridgeRef) {
    const unresolved = rows.filter((r) => (r.bridgeRef == null || r.bridgeRef === '') && r.bridge_ID != null)
    if (unresolved.length) {
      const bridgeIds = [...new Set(unresolved.map((r) => r.bridge_ID))]
      const bridges = await dbOrTx.run(
        SELECT.from('bridge.management.Bridges').columns('ID', 'bridgeId').where({ ID: { in: bridgeIds } })
      )
      const bridgeMap = new Map()
      bridges.forEach((b) => bridgeMap.set(String(b.ID), b.bridgeId))
      for (const row of unresolved) {
        row.bridgeRef = bridgeMap.get(String(row.bridge_ID)) ?? null
      }
    }
    for (const row of rows) delete row.bridge_ID
  }

  return rows
}

function formatPreviewCell(row, column) {
  if (!column?.name) return ''
  const value = row[column.name]
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value)
}

function stripDatasetRowPrefix(message) {
  return String(message || '').replace(/^[A-Za-z]+ row \d+:\s*/g, '')
}

function getPreviewColumns(dataset) {
  if (dataset.name === 'Bridges') {
    return [
      { name: 'bridgeId', label: 'Bridge ID' },
      { name: 'bridgeName', label: 'Name' },
      { name: 'state', label: 'State' },
      { name: 'condition', label: 'Condition' },
      { name: 'postingStatus', label: 'Posting Status' }
    ]
  }
  if (dataset.name === 'Restrictions') {
    return [
      { name: 'restrictionRef', label: 'Restriction Ref' },
      { name: 'bridgeRef', label: 'Bridge Ref' },
      { name: 'restrictionType', label: 'Type' },
      { name: 'restrictionStatus', label: 'Status' },
      { name: 'restrictionValue', label: 'Value' }
    ]
  }
  if (dataset.name === 'BridgeInspections') {
    return [
      { name: 'bridgeRef',      label: 'Bridge ID' },
      { name: 'inspectionDate', label: 'Date' },
      { name: 'inspectionType', label: 'Type' },
      { name: 'inspector',      label: 'Inspector' },
      { name: 'inspectionStandard', label: 'Standard' }
    ]
  }
  if (dataset.name === 'BridgeElements') {
    return [
      { name: 'bridgeRef',             label: 'Bridge ID' },
      { name: 'elementId',             label: 'Element ID' },
      { name: 'elementType',           label: 'Type' },
      { name: 'elementName',           label: 'Name' },
      { name: 'currentConditionRating', label: 'Condition' }
    ]
  }
  if (dataset.name === 'BridgeRestrictions') {
    return [
      { name: 'bridgeRef',        label: 'Bridge ID' },
      { name: 'restrictionRef',   label: 'Ref' },
      { name: 'restrictionType',  label: 'Type' },
      { name: 'restrictionValue', label: 'Value' },
      { name: 'active',           label: 'Active' }
    ]
  }
  if (dataset.name === 'LoadRatingCertificates') {
    return [
      { name: 'bridgeRef',            label: 'Bridge ID' },
      { name: 'certificateNumber',    label: 'Certificate #' },
      { name: 'ratingLevel',          label: 'Rating Level' },
      { name: 'certificateExpiryDate', label: 'Expiry' },
      { name: 'status',               label: 'Status' }
    ]
  }
  if (dataset.name === 'BridgeRestrictionProvisions') {
    return [
      { name: 'restrictionRef',  label: 'Restriction Ref' },
      { name: 'provisionNumber', label: '#' },
      { name: 'provisionType',   label: 'Type' },
      { name: 'provisionText',   label: 'Provision Text' },
      { name: 'active',          label: 'Active' }
    ]
  }
  if (dataset.name === 'AllowedValues') {
    return [
      { name: 'entityName',   label: 'Entity' },
      { name: 'code',         label: 'Code' },
      { name: 'label',        label: 'Label' },
      { name: 'description',  label: 'Description' },
      { name: '',             label: '' }
    ]
  }
  return [
    { name: 'code', label: 'Code' },
    { name: 'name', label: 'Name' },
    { name: 'descr', label: 'Description' },
    { name: '', label: '' },
    { name: '', label: '' }
  ]
}

function buildValidationMessage(totalCount, validCount, warningCount, errorCount) {
  if (!validCount) return 'No valid rows. Fix the highlighted errors and re-upload.'
  if (errorCount) return `${validCount} valid row(s). Fix ${errorCount} error row(s) or upload only valid rows.`
  if (warningCount) return `${validCount} valid row(s) with ${warningCount} warning(s).`
  return `${totalCount} row(s) validated successfully.`
}

function formatCellValue(value, type) {
  if (value === null || value === undefined) return ''
  if (type === 'date' && value instanceof Date) return value.toISOString().slice(0, 10)
  return value
}

function formatReferenceValue(row) {
  if (hasValue(row.code) && hasValue(row.name) && row.code !== row.name) {
    return `${row.code} (${row.name})`
  }
  if (hasValue(row.code)) return String(row.code)
  if (hasValue(row.name)) return String(row.name)
  return ''
}

function hasValue(value) {
  return value !== null && value !== undefined && !(typeof value === 'string' && value.trim() === '')
}

function emptySummary(dataset) {
  return buildSummary(dataset, 0, 0, 0)
}

function buildSummary(dataset, processed, inserted, updated, deleted = 0, errors = 0, rowResults = []) {
  return {
    dataset: dataset.name,
    label: dataset.label,
    inserted,
    updated,
    processed,
    deleted,
    errors,
    rowResults
  }
}

module.exports = {
  parseSheetRows,
  normalizeRows,
  normalizeRow,
  convertCellValue,
  handleBadNumeric,
  parseBoolean,
  parseDate,
  parsePrimaryLookupRowKey,
  getDedupeKey,
  resolveExistingBridgeRow,
  resolveExistingRestrictionRow,
  getNextIntegerKey,
  readExistingRows,
  stripPrimaryKey,
  stripMetadata,
  queueAudit,
  enrichRestrictionsWithBridgeKeys,
  enrichRowsWithBridgeId,
  batchGenerateRefs,
  importCuidEntityRows,
  readDatasetRows,
  formatPreviewCell,
  stripDatasetRowPrefix,
  getPreviewColumns,
  buildValidationMessage,
  formatCellValue,
  formatReferenceValue,
  hasValue,
  emptySummary,
  buildSummary
}
