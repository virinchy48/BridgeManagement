// Workbook and CSV template builders.
// buildWorkbookTemplate and buildCsvTemplate accept DATASETS + REFERENCE_EXAMPLES
// as parameters so this file has no dependency on mass-upload.js (no circular import).

const cds = require('@sap/cds')
const XLSX = require('xlsx')
const { SELECT } = cds.ql
const { readDatasetRows, formatCellValue, formatReferenceValue, hasValue } = require('./upload-engine')

const SAMPLE_ROWS = {
  Bridges: [
    { bridgeId: 'NSW-SAMPLE-001', bridgeName: 'Sample Creek Bridge', state: 'NSW', region: 'Hunter', lga: 'Maitland', suburb: 'Lochinvar', latitude: -32.6833, longitude: 151.5167, assetClass: 'State Road Bridge', structureType: 'Simply Supported', yearBuilt: 1985, deckWidth: 8.2, totalLength: 24.0, spanCount: 1, importanceLevel: 3, conditionRating: 7, postingStatus: 'No Posting', hmlApproved: true, bDoubleApproved: true, isActive: true }
  ],
  Restrictions: [
    { restrictionRef: 'RST-SAMPLE-001', bridgeRef: 'NSW-SAMPLE-001', restrictionType: 'Mass Limit', restrictionCategory: 'Permanent', name: 'GML Restriction', grossMassLimit: 42.5, appliesToVehicleClass: 'HML', active: true }
  ],
  BridgeInspections: [
    { bridgeRef: 'NSW-SAMPLE-001', inspectionDate: '2024-06-15', inspectionType: 'Routine', inspectedBy: 'J. Smith', overallConditionRating: 7, active: true }
  ],
  BridgeDefects: [
    { bridgeRef: 'NSW-SAMPLE-001', inspectionRef: 'INS-0001', defectType: 'Cracking', location: 'Deck surface, west lane', severity: 2, repairMethod: 'Surface sealing', maintenancePriority: 'P3', active: true }
  ],
  BridgeCapacities: [
    { bridgeRef: 'NSW-SAMPLE-001', capacityType: 'GML', grossMassLimit: 42.5, axleGroupLimit: 16.5, effectiveFrom: '2024-01-01', active: true }
  ],
  BridgeScourAssessments: [
    { bridgeRef: 'NSW-SAMPLE-001', assessmentDate: '2024-03-20', scourRisk: 'Low', assessedBy: 'B. Jones', floodImmunityAri: 100, active: true }
  ],
  BridgeConditionSurveys: [
    { bridgeRef: 'NSW-SAMPLE-001', surveyDate: '2024-05-10', surveyType: 'Routine', surveyedBy: 'A. Kumar', conditionRating: 7, overallGrade: 'Good', status: 'Draft', active: true }
  ],
  BridgeLoadRatings: [
    { bridgeRef: 'NSW-SAMPLE-001', vehicleClass: 'T44', ratingMethod: 'AS5100', ratingFactor: 1.0, grossMassLimit: 42.5, assessedBy: 'C. Lee', assessmentDate: '2023-11-01', status: 'Active', active: true }
  ],
  BridgePermits: [
    { bridgeRef: 'NSW-SAMPLE-001', permitType: 'Overmass', applicantName: 'Acme Haulage Pty Ltd', vehicleClass: 'HML', grossMass: 68.5, appliedDate: '2024-07-01', validFrom: '2024-07-15', validTo: '2025-07-14', status: 'Pending', active: true }
  ]
}

function getSampleRows(dataset) {
  const rows = SAMPLE_ROWS[dataset.name] || []
  return rows.map((sampleObj) =>
    dataset.columns.map((col) => formatCellValue(sampleObj[col.name], col.type))
  )
}

function buildHeaderRow(dataset) {
  return dataset.columns.map((columnDef) => {
    const label = columnDef.name || columnDef.header || ''
    if (columnDef.required && !label.endsWith('*')) return `${label}*`
    return label
  })
}

function getRequiredColumns(dataset) {
  return dataset.columns.filter((columnDef) => columnDef.required).map((columnDef) => columnDef.name)
}

function buildReferenceExamplesRows(datasets, referenceExamples, datasetRowsByName) {
  const datasetBySheetAndColumn = new Map(
    datasets.map((dataset) => [
      dataset.name,
      new Map(dataset.columns.map((columnDef) => [columnDef.name || columnDef.field, columnDef]))
    ])
  )

  return [
    ['sheet', 'column', 'mandatory', 'sourceDataset', 'allowedValuesInSequence'],
    ...referenceExamples.map((entry) => {
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

async function fetchAllLookupValues(db) {
  const { ALLOWED_VALUES_WHITELIST } = require('./columns')
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

async function buildWorkbookTemplate(datasets, referenceExamples) {
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
    ...datasets.map((dataset) => [
      dataset.name,
      dataset.label,
      dataset.description,
      getRequiredColumns(dataset).join(', ')
    ])
  ]

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(instructions), 'Instructions')

  for (const dataset of datasets) {
    let rows
    if (dataset.name === 'AllowedValues') {
      rows = await fetchAllLookupValues(db)
    } else {
      rows = await readDatasetRows(db, dataset)
    }
    datasetRowsByName.set(dataset.name, rows)
    const header = buildHeaderRow(dataset)
    let sheetRows = dataset.name === 'AllowedValues'
      ? rows.map((row) => [row.entityName, row.code, row.label, row.description])
      : rows.map((row) => dataset.columns.map((columnDef) => formatCellValue(row[columnDef.name || columnDef.field], columnDef.type)))
    if (!sheetRows.length && dataset.name !== 'AllowedValues') {
      sheetRows = getSampleRows(dataset)
    }
    const sheet = XLSX.utils.aoa_to_sheet([header, ...sheetRows])
    sheet['!cols'] = dataset.columns.map((columnDef) => ({ wch: Math.max((columnDef.name || columnDef.header || '').length + 4, 16) }))
    XLSX.utils.book_append_sheet(workbook, sheet, dataset.name)
  }

  // Attribute template sheets — one per object type
  for (const objectType of ['bridge', 'restriction']) {
    try {
      const attrGroups = await db.run(
        SELECT.from('bridge.management.AttributeGroups').where({ objectType, status: 'Active' }).orderBy('displayOrder')
      )
      if (!attrGroups.length) continue
      const allDefs = await db.run(
        SELECT.from('bridge.management.AttributeDefinitions').where({ objectType, status: 'Active' }).orderBy('displayOrder')
      )
      const allConfigs = await db.run(
        SELECT.from('bridge.management.AttributeObjectTypeConfig').where({ objectType, enabled: true })
      )
      const enabledDefIds = new Set(allConfigs.map(c => c.attribute_ID))
      const activeDefs = allDefs.filter(d => enabledDefIds.has(d.ID))
      if (!activeDefs.length) continue

      const idCol = objectType === 'bridge' ? 'bridgeId' : 'restrictionRef'
      const attrHeaders = activeDefs.map(d => `${d.name} (${d.internalKey})`)
      const requiredRow = [' ', ...activeDefs.map(d => {
        const cfg = allConfigs.find(c => c.attribute_ID === d.ID)
        return cfg?.required ? '*' : ''
      })]
      const headerRow = [idCol, ...attrHeaders]

      const sheetLabel = `${objectType.charAt(0).toUpperCase()}${objectType.slice(1)}Attributes`
      const attrSheet = XLSX.utils.aoa_to_sheet([requiredRow, headerRow])
      attrSheet['!cols'] = headerRow.map(h => ({ wch: Math.max(h.length + 2, 16) }))
      XLSX.utils.book_append_sheet(workbook, attrSheet, sheetLabel)
    } catch (_) {
      // Attribute tables may not exist in dev — skip gracefully
    }
  }

  const referenceSheet = XLSX.utils.aoa_to_sheet(buildReferenceExamplesRows(datasets, referenceExamples, datasetRowsByName))
  referenceSheet['!cols'] = [{ wch: 18 }, { wch: 26 }, { wch: 16 }, { wch: 24 }, { wch: 120 }]
  XLSX.utils.book_append_sheet(workbook, referenceSheet, 'DropdownExamples')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

async function buildCsvTemplate(datasetName, withSamples, datasets, referenceExamples) {
  const dataset = datasets.find(d => d.name === datasetName)
  if (!dataset) throw new Error(`Unknown dataset: ${datasetName}`)
  const db = await cds.connect.to('db')
  let dataRows
  if (dataset.name === 'AllowedValues') {
    const all = await fetchAllLookupValues(db)
    dataRows = all.map(row => [row.entityName, row.code, row.label, row.description])
  } else {
    const rows = await readDatasetRows(db, dataset)
    dataRows = rows.map((row) => dataset.columns.map((columnDef) => formatCellValue(row[columnDef.name], columnDef.type)))
  }
  if (!dataRows.length && withSamples) {
    dataRows = getSampleRows(dataset)
  }
  const sheet = XLSX.utils.aoa_to_sheet([buildHeaderRow(dataset), ...dataRows])
  return Buffer.from(XLSX.utils.sheet_to_csv(sheet), 'utf8')
}

module.exports = {
  buildWorkbookTemplate,
  buildCsvTemplate,
  buildHeaderRow,
  buildReferenceExamplesRows,
  getRequiredColumns,
  getSampleRows,
  fetchAllLookupValues
}
