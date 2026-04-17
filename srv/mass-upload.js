const cds = require('@sap/cds')
const XLSX = require('xlsx')

const { SELECT, INSERT, UPDATE } = cds.ql

const LOOKUP_COLUMNS = [
  column('code', 'string', { required: true }),
  column('name', 'string'),
  column('descr', 'string')
]

const BRIDGE_COLUMNS = [
  column('ID', 'integer'),
  column('title', 'string'),
  column('descr', 'string'),
  column('bridgeId', 'string'),
  column('bridgeName', 'string', { required: true }),
  column('assetClass', 'string'),
  column('route', 'string'),
  column('routeNumber', 'string'),
  column('state', 'string', { required: true }),
  column('region', 'string'),
  column('lga', 'string'),
  column('latitude', 'decimal', { required: true }),
  column('longitude', 'decimal', { required: true }),
  column('location', 'string'),
  column('assetOwner', 'string', { required: true }),
  column('managingAuthority', 'string'),
  column('structureType', 'string'),
  column('yearBuilt', 'integer'),
  column('designLoad', 'string'),
  column('designStandard', 'string'),
  column('clearanceHeight', 'decimal'),
  column('spanLength', 'decimal'),
  column('material', 'string'),
  column('spanCount', 'integer'),
  column('totalLength', 'decimal'),
  column('deckWidth', 'decimal'),
  column('numberOfLanes', 'integer'),
  column('condition', 'string'),
  column('conditionRating', 'integer'),
  column('structuralAdequacyRating', 'integer'),
  column('postingStatus', 'string'),
  column('conditionStandard', 'string'),
  column('seismicZone', 'string'),
  column('asBuiltDrawingReference', 'string'),
  column('scourDepthLastMeasured', 'decimal'),
  column('floodImmunityAriYears', 'integer'),
  column('floodImpacted', 'boolean'),
  column('highPriorityAsset', 'boolean'),
  column('remarks', 'string'),
  column('status', 'string'),
  column('scourRisk', 'string'),
  column('lastInspectionDate', 'date'),
  column('nhvrAssessed', 'boolean'),
  column('nhvrAssessmentDate', 'date'),
  column('loadRating', 'decimal'),
  column('pbsApprovalClass', 'string'),
  column('importanceLevel', 'integer'),
  column('averageDailyTraffic', 'integer'),
  column('heavyVehiclePercent', 'decimal'),
  column('gazetteReference', 'string'),
  column('nhvrReferenceUrl', 'string'),
  column('freightRoute', 'boolean'),
  column('overMassRoute', 'boolean'),
  column('hmlApproved', 'boolean'),
  column('bDoubleApproved', 'boolean'),
  column('dataSource', 'string'),
  column('sourceReferenceUrl', 'string'),
  column('openDataReference', 'string'),
  column('sourceRecordId', 'string'),
  column('restriction_ID', 'string'),
  column('geoJson', 'string'),
  column('stock', 'integer'),
  column('price', 'decimal'),
  column('currency_code', 'string')
]

const RESTRICTION_COLUMNS = [
  column('ID', 'string'),
  column('parent_ID', 'string'),
  column('restrictionRef', 'string', { required: true }),
  column('bridgeRef', 'string'),
  column('bridge_ID', 'integer'),
  column('name', 'string'),
  column('descr', 'string'),
  column('restrictionCategory', 'string', { required: true }),
  column('restrictionType', 'string', { required: true }),
  column('restrictionValue', 'string'),
  column('restrictionUnit', 'string'),
  column('restrictionStatus', 'string', { required: true }),
  column('appliesToVehicleClass', 'string'),
  column('grossMassLimit', 'decimal'),
  column('axleMassLimit', 'decimal'),
  column('heightLimit', 'decimal'),
  column('widthLimit', 'decimal'),
  column('lengthLimit', 'decimal'),
  column('speedLimit', 'integer'),
  column('permitRequired', 'boolean'),
  column('escortRequired', 'boolean'),
  column('temporary', 'boolean'),
  column('active', 'boolean'),
  column('effectiveFrom', 'date'),
  column('effectiveTo', 'date'),
  column('approvedBy', 'string'),
  column('direction', 'string'),
  column('enforcementAuthority', 'string'),
  column('temporaryFrom', 'date'),
  column('temporaryTo', 'date'),
  column('temporaryReason', 'string'),
  column('approvalReference', 'string'),
  column('issuingAuthority', 'string'),
  column('legalReference', 'string'),
  column('remarks', 'string')
]

const DATASETS = Object.freeze([
  lookupDataset('AssetClasses', 'Asset Classes', 'Bridge asset class dropdown values'),
  lookupDataset('States', 'States', 'Bridge state dropdown values'),
  lookupDataset('Regions', 'Regions', 'Bridge region dropdown values'),
  lookupDataset('StructureTypes', 'Structure Types', 'Bridge structure type dropdown values'),
  lookupDataset('DesignLoads', 'Design Loads', 'Bridge design load dropdown values'),
  lookupDataset('PostingStatuses', 'Posting Statuses', 'Bridge posting status dropdown values'),
  lookupDataset('ConditionStates', 'Condition States', 'Bridge condition state dropdown values'),
  lookupDataset('ScourRiskLevels', 'Scour Risk Levels', 'Bridge scour risk dropdown values'),
  lookupDataset('PbsApprovalClasses', 'PBS Approval Classes', 'Bridge PBS approval class dropdown values'),
  lookupDataset('RestrictionTypes', 'Restriction Types', 'Restriction type dropdown values'),
  lookupDataset('RestrictionStatuses', 'Restriction Statuses', 'Restriction status dropdown values'),
  lookupDataset('VehicleClasses', 'Vehicle Classes', 'Restriction vehicle class dropdown values'),
  lookupDataset('RestrictionCategories', 'Restriction Categories', 'Restriction category dropdown values'),
  lookupDataset('RestrictionUnits', 'Restriction Units', 'Restriction unit dropdown values'),
  lookupDataset('RestrictionDirections', 'Restriction Directions', 'Restriction direction dropdown values'),
  {
    name: 'Bridges',
    label: 'Bridges',
    description: 'Bridge master data with required fields enforced during upload',
    entity: 'bridge.management.Bridges',
    columns: BRIDGE_COLUMNS,
    orderBy: 'ID',
    importer: importBridgeRows
  },
  {
    name: 'Restrictions',
    label: 'Restrictions',
    description: 'Restriction registry data with required fields enforced during upload',
    entity: 'bridge.management.Restrictions',
    columns: RESTRICTION_COLUMNS,
    orderBy: 'restrictionRef',
    importer: importRestrictionRows
  }
])

const DATASET_BY_NAME = new Map(DATASETS.map((dataset) => [dataset.name, dataset]))

const REFERENCE_EXAMPLES = Object.freeze([
  { sheet: 'Bridges', column: 'assetClass', dataset: 'AssetClasses' },
  { sheet: 'Bridges', column: 'state', dataset: 'States' },
  { sheet: 'Bridges', column: 'region', dataset: 'Regions' },
  { sheet: 'Bridges', column: 'structureType', dataset: 'StructureTypes' },
  { sheet: 'Bridges', column: 'designLoad', dataset: 'DesignLoads' },
  { sheet: 'Bridges', column: 'postingStatus', dataset: 'PostingStatuses' },
  { sheet: 'Bridges', column: 'condition', dataset: 'ConditionStates' },
  { sheet: 'Bridges', column: 'scourRisk', dataset: 'ScourRiskLevels' },
  { sheet: 'Bridges', column: 'pbsApprovalClass', dataset: 'PbsApprovalClasses' },
  { sheet: 'Restrictions', column: 'restrictionCategory', dataset: 'RestrictionCategories' },
  { sheet: 'Restrictions', column: 'restrictionType', dataset: 'RestrictionTypes' },
  { sheet: 'Restrictions', column: 'restrictionUnit', dataset: 'RestrictionUnits' },
  { sheet: 'Restrictions', column: 'restrictionStatus', dataset: 'RestrictionStatuses' },
  { sheet: 'Restrictions', column: 'appliesToVehicleClass', dataset: 'VehicleClasses' },
  { sheet: 'Restrictions', column: 'direction', dataset: 'RestrictionDirections' }
])

function column(name, type, options = {}) {
  return {
    name,
    type,
    required: Boolean(options.required)
  }
}

function lookupDataset(name, label, description) {
  return {
    name,
    label,
    description,
    entity: `bridge.management.${name}`,
    columns: LOOKUP_COLUMNS,
    orderBy: 'code',
    importer: importLookupRows
  }
}

function getDatasets() {
  return DATASETS.map((dataset) => ({
    name: dataset.name,
    label: dataset.label,
    description: dataset.description,
    csvFileName: `${dataset.name}.csv`
  }))
}

async function buildWorkbookTemplate() {
  const db = await cds.connect.to('db')
  const workbook = XLSX.utils.book_new()
  const datasetRowsByName = new Map()

  const instructions = [
    ['Mass Upload Template'],
    [''],
    ['How to use'],
    ['1. This workbook can update all dropdown sheets together and can also update Bridges and Restrictions.'],
    ['2. Keep every sheet name and header row exactly as generated.'],
    ['3. Fields marked with * in the header are required for upload.'],
    ['4. Excel uploads process every supported sheet present in the workbook.'],
    ['5. Use the DropdownExamples sheet to see all dropdown-backed fields, whether they are mandatory, and the allowed values in sequence.'],
    ['6. Keep dropdown values in the same sequence shown in the dropdown source sheets when maintaining those lists.'],
    ['7. CSV uploads still apply to one selected dataset at a time.'],
    [''],
    ['Datasets'],
    ...DATASETS.map((dataset) => [
      dataset.name,
      dataset.label,
      dataset.description,
      getRequiredColumns(dataset).join(', ')
    ])
  ]

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(instructions), 'Instructions')

  for (const dataset of DATASETS) {
    const rows = await readDatasetRows(db, dataset)
    datasetRowsByName.set(dataset.name, rows)
    const header = buildHeaderRow(dataset)
    const sheet = XLSX.utils.aoa_to_sheet([
      header,
      ...rows.map((row) => dataset.columns.map((columnDef) => formatCellValue(row[columnDef.name], columnDef.type)))
    ])
    sheet['!cols'] = dataset.columns.map((columnDef) => ({ wch: Math.max(columnDef.name.length + 4, 16) }))
    XLSX.utils.book_append_sheet(workbook, sheet, dataset.name)
  }

  const referenceSheet = XLSX.utils.aoa_to_sheet(buildReferenceExamplesRows(datasetRowsByName))
  referenceSheet['!cols'] = [{ wch: 18 }, { wch: 26 }, { wch: 16 }, { wch: 24 }, { wch: 120 }]
  XLSX.utils.book_append_sheet(workbook, referenceSheet, 'DropdownExamples')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

async function buildCsvTemplate(datasetName) {
  const dataset = requireDataset(datasetName)
  const db = await cds.connect.to('db')
  const rows = await readDatasetRows(db, dataset)
  const sheet = XLSX.utils.aoa_to_sheet([
    buildHeaderRow(dataset),
    ...rows.map((row) => dataset.columns.map((columnDef) => formatCellValue(row[columnDef.name], columnDef.type)))
  ])
  return Buffer.from(XLSX.utils.sheet_to_csv(sheet), 'utf8')
}

async function importUpload({ buffer, fileName, datasetName }) {
  if (!buffer?.length) {
    throw new Error('Uploaded file is empty')
  }

  const lowerName = (fileName || '').toLowerCase()
  const db = await cds.connect.to('db')
  const tx = db.tx()

  try {
    let summaries
    let skipped = []
    let warnings = []

    if (lowerName.endsWith('.xlsx')) {
      const result = await importWorkbook(tx, buffer, datasetName)
      summaries = result.summaries
      skipped = result.skipped
      warnings = result.warnings
    } else if (lowerName.endsWith('.csv')) {
      const result = await importCsv(tx, buffer, datasetName)
      summaries = [result.summary]
      warnings = result.warnings
    } else {
      throw new Error('Unsupported file type. Upload an .xlsx or .csv file.')
    }

    await tx.commit()

    const processed = summaries.reduce((total, summary) => total + summary.processed, 0)
    return {
      message: `Mass upload completed. ${processed} rows processed across ${summaries.length} dataset(s).`,
      summaries,
      skipped,
      warnings
    }
  } catch (error) {
    await tx.rollback()
    throw error
  }
}

async function importWorkbook(tx, buffer, datasetName) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const summaries = []
  const skipped = []
  const warnings = []
  const datasets = resolveWorkbookDatasets(datasetName)

  for (const dataset of datasets) {
    const sheet = workbook.Sheets[dataset.name]
    if (!sheet) {
      skipped.push({ name: dataset.name, label: dataset.label })
      continue
    }
    const rows = parseSheetRows(sheet, dataset)
    summaries.push(await dataset.importer(tx, dataset, rows, warnings))
  }

  if (!summaries.length) {
    if (datasetName && datasetName !== 'All') {
      throw new Error(`Workbook does not contain the selected "${datasetName}" sheet.`)
    }
    throw new Error('No supported upload sheets were found in the workbook.')
  }

  return { summaries, skipped, warnings }
}

async function importCsv(tx, buffer, datasetName) {
  if (!datasetName || datasetName === 'All') {
    throw new Error('Select a specific dataset for CSV uploads, or use the Excel template for All.')
  }

  const dataset = requireDataset(datasetName)
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const [firstSheetName] = workbook.SheetNames
  const sheet = workbook.Sheets[firstSheetName]

  if (!sheet) {
    throw new Error('CSV file does not contain any rows.')
  }

  const warnings = []
  const rows = parseSheetRows(sheet, dataset)
  const summary = await dataset.importer(tx, dataset, rows, warnings)
  return { summary, warnings }
}

async function readDatasetRows(dbOrTx, dataset) {
  return dbOrTx.run(
    SELECT.from(dataset.entity).columns(...dataset.columns.map((columnDef) => columnDef.name)).orderBy(dataset.orderBy)
  )
}

async function importLookupRows(tx, dataset, rows, warnings) {
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
  }

  for (const row of updates) {
    await tx.run(
      UPDATE(dataset.entity)
        .set({ name: row.name, descr: row.descr })
        .where({ code: row.code })
    )
  }

  return buildSummary(dataset, normalized.length, inserts.length, updates.length)
}

async function importBridgeRows(tx, dataset, rows, warnings) {
  const normalized = normalizeRows(dataset, rows, warnings)

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

  for (const row of normalized) {
    const existing = resolveExistingBridgeRow(row, existingById, existingByBridgeId)

    if (existing) {
      row.ID = existing.ID
      if (!row.bridgeId) row.bridgeId = existing.bridgeId
      updates.push(row)
      continue
    }

    if (row.ID === null || row.ID === undefined) {
      row.ID = nextId++
    }
    inserts.push(row)
    existingById.set(row.ID, row)
    if (row.bridgeId) existingByBridgeId.set(row.bridgeId, row)
  }

  if (inserts.length) {
    await tx.run(INSERT.into(dataset.entity).entries(inserts.map(stripMetadata)))
  }

  for (const row of updates) {
    await tx.run(
      UPDATE(dataset.entity)
        .set(stripPrimaryKey(row, ['ID']))
        .where({ ID: row.ID })
    )
  }

  return buildSummary(dataset, normalized.length, inserts.length, updates.length)
}

async function importRestrictionRows(tx, dataset, rows, warnings) {
  const normalized = normalizeRows(dataset, rows, warnings)

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
      row.ID = existing.ID
      updates.push(row)
      continue
    }

    if (!row.ID) {
      row.ID = cds.utils.uuid()
    }
    inserts.push(row)
    existingById.set(row.ID, row)
    existingByRef.set(row.restrictionRef, row)
  }

  if (inserts.length) {
    await tx.run(INSERT.into(dataset.entity).entries(inserts.map(stripMetadata)))
  }

  for (const row of updates) {
    await tx.run(
      UPDATE(dataset.entity)
        .set(stripPrimaryKey(row, ['ID']))
        .where({ ID: row.ID })
    )
  }

  return buildSummary(dataset, normalized.length, inserts.length, updates.length)
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

function normalizeRows(dataset, rows, warnings) {
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

  return normalized
}

function parseSheetRows(sheet, dataset) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true, cellDates: true })
  if (!rows.length) return []

  const headers = Object.keys(rows[0])
  const normalizedHeaders = new Map(headers.map((header) => [String(header).replace(/\*$/, '').trim().toLowerCase(), header]))

  for (const columnDef of dataset.columns) {
    if (!normalizedHeaders.has(columnDef.name.toLowerCase())) {
      throw new Error(`Sheet "${dataset.name}" must contain a "${columnDef.name}" column.`)
    }
  }

  return rows.map((row, index) => {
    const mappedRow = { __rowNumber: index + 2 }
    for (const columnDef of dataset.columns) {
      const originalHeader = normalizedHeaders.get(columnDef.name.toLowerCase())
      mappedRow[columnDef.name] = originalHeader ? row[originalHeader] : null
    }
    return mappedRow
  })
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
  if (dataset.name === 'Bridges') return row.ID ?? `bridgeId:${row.bridgeId}`
  if (dataset.name === 'Restrictions') return row.ID ?? `restrictionRef:${row.restrictionRef}`
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
    if (key === '__rowNumber') continue
    cleaned[key] = value
  }
  return cleaned
}

function buildHeaderRow(dataset) {
  return dataset.columns.map((columnDef) => `${columnDef.name}${columnDef.required ? '*' : ''}`)
}

function buildReferenceExamplesRows(datasetRowsByName) {
  const datasetBySheetAndColumn = new Map(
    DATASETS.map((dataset) => [
      dataset.name,
      new Map(dataset.columns.map((columnDef) => [columnDef.name, columnDef]))
    ])
  )

  return [
    ['sheet', 'column', 'mandatory', 'sourceDataset', 'allowedValuesInSequence'],
    ...REFERENCE_EXAMPLES.map((entry) => {
      const rows = datasetRowsByName.get(entry.dataset) || []
      const columnDef = datasetBySheetAndColumn.get(entry.sheet)?.get(entry.column)
      const values = rows
        .map((row) => formatReferenceValue(row))
        .filter(Boolean)
        .join(' | ')

      return [
        entry.sheet,
        entry.column,
        columnDef?.required ? 'Yes' : 'No',
        entry.dataset,
        values
      ]
    })
  ]
}

function getRequiredColumns(dataset) {
  return dataset.columns.filter((columnDef) => columnDef.required).map((columnDef) => columnDef.name)
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

function buildSummary(dataset, processed, inserted, updated) {
  return {
    dataset: dataset.name,
    label: dataset.label,
    inserted,
    updated,
    processed
  }
}

function requireDataset(datasetName) {
  const dataset = DATASET_BY_NAME.get(datasetName)
  if (!dataset) {
    throw new Error(`Unknown dataset: ${datasetName}`)
  }
  return dataset
}

function resolveWorkbookDatasets(datasetName) {
  if (!datasetName || datasetName === 'All') {
    return DATASETS
  }
  return [requireDataset(datasetName)]
}

module.exports = {
  buildCsvTemplate,
  buildWorkbookTemplate,
  getDatasets,
  importUpload
}
