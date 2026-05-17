// Mass upload orchestrator.
// DATASETS array is the only extension point — add new datasets here.
// Column definitions live in srv/importers/columns.js.
// Core pipeline lives in srv/importers/upload-engine.js.
// Individual importers live in srv/importers/*.js.

const cds = require('@sap/cds')
const XLSX = require('xlsx')
const { SELECT, INSERT, UPDATE } = cds.ql
const { writeChangeLogs } = require('./audit-log')

const {
  lookupDataset,
  ALLOWED_VALUES_COLUMNS,
  BRIDGE_COLUMNS,
  RESTRICTION_COLUMNS,
  INSPECTION_COLUMNS,
  ELEMENT_COLUMNS,
  BRIDGE_RESTRICTION_COLUMNS,
  RST_PROVISION_COLUMNS,
  PROVISION_COLUMNS,
  LRC_COLUMNS,
  CONDITION_SURVEY_COLUMNS,
  LOAD_RATING_COLUMNS,
  PERMIT_COLUMNS,
  DEFECT_COLUMNS,
  CAPACITY_COLUMNS,
  SCOUR_COLUMNS
} = require('./importers/columns')

const {
  parseSheetRows,
  normalizeRow,
  normalizeRows,
  readDatasetRows,
  formatPreviewCell,
  stripDatasetRowPrefix,
  getPreviewColumns,
  buildValidationMessage,
  formatCellValue
} = require('./importers/upload-engine')

const {
  buildWorkbookTemplate: _buildWorkbookTemplate,
  buildCsvTemplate: _buildCsvTemplate,
  buildHeaderRow,
  fetchAllLookupValues
} = require('./importers/upload-template')

const { recordUploadSession, getUploadHistory, getUploadSessionById } = require('./importers/upload-session')

const { importBridgeRows } = require('./importers/bridges-importer')
const { importRestrictionRows } = require('./importers/restrictions-importer')
const { importLookupRows, importAllowedValueRows } = require('./importers/lookup-importer')
const {
  importInspectionRows,
  importElementRows,
  importBridgeRestrictionRows,
  importLrcRows,
  importProvisionRows,
  importRstProvisionRows,
  importConditionSurveyRows,
  importLoadRatingRows,
  importPermitRows,
  importDefectRows,
  importCapacityRows,
  importScourRows
} = require('./importers/gap-importers')

// ── DATASETS ─────────────────────────────────────────────────────────────────
// Extension point: add new entity datasets here.
// Lookup datasets (templateOnly: true) supply dropdowns for the workbook but
// are not shown in the upload dropdown.
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
  lookupDataset('InspectionTypes', 'Inspection Types', 'Bridge inspection type dropdown values (TfNSW-BIM §4.1)'),
  lookupDataset('ConditionTrends', 'Condition Trends', 'Condition trend dropdown values (AP-G71)'),
  lookupDataset('SurfaceTypes', 'Surface Types', 'Bridge deck surface type dropdown values (Austroads)'),
  lookupDataset('SubstructureTypes', 'Substructure Types', 'Bridge substructure type dropdown values (TfNSW-BAIS)'),
  lookupDataset('FoundationTypes', 'Foundation Types', 'Bridge foundation type dropdown values (AS 5100.7 §6.2.5)'),
  lookupDataset('WaterwayTypes', 'Waterway Types', 'Waterway type dropdown values (Austroads AP-G71.8 §3.1)'),
  lookupDataset('FatigueDetailCategories', 'Fatigue Detail Categories', 'AS 5100.6 §13.5 fatigue detail category dropdown values'),
  {
    name: 'AllowedValues',
    label: 'Allowed Values (Lookups)',
    description: 'Maintain lookup values for all dropdown fields — upload rows with entityName, code, label, description',
    entity: null,
    columns: ALLOWED_VALUES_COLUMNS,
    orderBy: 'entityName',
    importer: importAllowedValueRows
  },
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
  },
  {
    name: 'BridgeInspections',
    label: 'Bridge Inspections',
    description: 'Inspection event records — date, type, inspector, and scope per bridge',
    entity: 'bridge.management.BridgeInspections',
    columns: INSPECTION_COLUMNS,
    orderBy: 'inspectionDate',
    importer: importInspectionRows
  },
  {
    name: 'BridgeElements',
    label: 'Bridge Elements',
    description: 'Structural element inventory — element type, condition rating, and S/4 equipment number',
    entity: 'bridge.management.BridgeElements',
    columns: ELEMENT_COLUMNS,
    orderBy: 'elementId',
    importer: importElementRows
  },
  {
    name: 'BridgeRestrictions',
    label: 'Bridge Restrictions',
    description: 'Bridge-level posting restrictions — mass, height, width, and speed limits',
    entity: 'bridge.management.BridgeRestrictions',
    columns: BRIDGE_RESTRICTION_COLUMNS,
    orderBy: 'restrictionRef',
    importer: importBridgeRestrictionRows
  },
  {
    name: 'LoadRatingCertificates',
    label: 'Load Rating Certificates',
    description: 'AS 5100.7 load rating certificates — rating factors, certifying engineer, and expiry dates',
    entity: 'bridge.management.LoadRatingCertificates',
    columns: LRC_COLUMNS,
    orderBy: 'certificateNumber',
    importer: importLrcRows
  },
  {
    name: 'BridgeRestrictionProvisions',
    label: 'Restriction Provisions',
    description: 'Legal/permit provisions attached to bridge restrictions — one restriction can have many provisions',
    entity: 'bridge.management.BridgeRestrictionProvisions',
    columns: PROVISION_COLUMNS,
    orderBy: 'provisionNumber',
    importer: importProvisionRows
  },
  {
    name: 'RestrictionProvisions',
    label: 'Standalone Restriction Provisions',
    description: 'Temporary provision codes attached to standalone Restrictions (CWRS, DETR, SUBB, etc.)',
    entity: 'bridge.management.RestrictionProvisions',
    columns: RST_PROVISION_COLUMNS,
    orderBy: 'sortOrder',
    importer: importRstProvisionRows
  },
  {
    name: 'BridgeInspectionElements',
    label: 'Bridge Inspection Elements',
    description: 'Element-level condition state quantities per inspection',
    columns: [
      { header: 'Inspection ID *',      field: 'inspectionId',       required: true },
      { header: 'Bridge ID *',          field: 'bridgeId',           required: true },
      { header: 'Element Type *',       field: 'elementType',        required: true },
      { header: 'Condition State 1 Qty',field: 'conditionState1Qty', type: 'decimal' },
      { header: 'Condition State 2 Qty',field: 'conditionState2Qty', type: 'decimal' },
      { header: 'Condition State 3 Qty',field: 'conditionState3Qty', type: 'decimal' },
      { header: 'Condition State 4 Qty',field: 'conditionState4Qty', type: 'decimal' },
      { header: 'CS1 %',               field: 'conditionState1Pct', type: 'decimal' },
      { header: 'CS2 %',               field: 'conditionState2Pct', type: 'decimal' },
      { header: 'CS3 %',               field: 'conditionState3Pct', type: 'decimal' },
      { header: 'CS4 %',               field: 'conditionState4Pct', type: 'decimal' },
      { header: 'Health Rating',       field: 'elementHealthRating', type: 'decimal' },
      { header: 'Unit',                field: 'unit' },
      { header: 'Comments',            field: 'comments' }
    ],
    async importRows(rows, tx) {
      const valid = rows.filter(r => r.bridgeId && r.elementType)
      if (!valid.length) return { inserted: 0, updated: 0, processed: rows.length }
      const bridgeIds = [...new Set(valid.map(r => r.bridgeId))]
      const bridges = await tx.run(SELECT.from('bridge.management.Bridges').columns('ID', 'bridgeId').where({ bridgeId: { in: bridgeIds } }))
      const bm = new Map(bridges.map(b => [b.bridgeId, b.ID]))
      const entries = valid.map(row => {
        const bridge_ID = bm.get(row.bridgeId)
        if (!bridge_ID) return null
        return {
          ID: cds.utils.uuid(), bridge_ID,
          elementType: row.elementType,
          conditionState1Qty: row.conditionState1Qty ? parseFloat(row.conditionState1Qty) : null,
          conditionState2Qty: row.conditionState2Qty ? parseFloat(row.conditionState2Qty) : null,
          conditionState3Qty: row.conditionState3Qty ? parseFloat(row.conditionState3Qty) : null,
          conditionState4Qty: row.conditionState4Qty ? parseFloat(row.conditionState4Qty) : null,
          conditionState1Pct: row.conditionState1Pct ? parseFloat(row.conditionState1Pct) : null,
          conditionState2Pct: row.conditionState2Pct ? parseFloat(row.conditionState2Pct) : null,
          conditionState3Pct: row.conditionState3Pct ? parseFloat(row.conditionState3Pct) : null,
          conditionState4Pct: row.conditionState4Pct ? parseFloat(row.conditionState4Pct) : null,
          elementHealthRating: row.elementHealthRating ? parseFloat(row.elementHealthRating) : null,
          unit: row.unit, comments: row.comments
        }
      }).filter(Boolean)
      if (entries.length) await tx.run(INSERT.into('bridge.management.BridgeInspectionElements').entries(entries))
      return { inserted: entries.length, updated: 0, processed: rows.length }
    }
  },
  {
    name: 'BridgeCarriageways',
    label: 'Bridge Carriageways',
    description: 'Carriageway geometry per bridge',
    columns: [
      { header: 'Bridge ID *',           field: 'bridgeId',            required: true },
      { header: 'Road Number',           field: 'roadNumber' },
      { header: 'Road Rank Code',        field: 'roadRankCode' },
      { header: 'Road Class Code',       field: 'roadClassCode' },
      { header: 'Carriage Code',         field: 'carriageCode' },
      { header: 'Min Width (m)',         field: 'minWidthM',           type: 'decimal' },
      { header: 'Max Width (m)',         field: 'maxWidthM',           type: 'decimal' },
      { header: 'Lane Count',            field: 'laneCount',           type: 'integer' },
      { header: 'Vertical Clearance (m)',field: 'verticalClearanceM',  type: 'decimal' },
      { header: 'Prescribed Dir From',   field: 'prescribedDirFrom' },
      { header: 'Prescribed Dir To',     field: 'prescribedDirTo' },
      { header: 'Distance From Start km',field: 'distanceFromStartKm', type: 'decimal' },
      { header: 'Link For Inspection',   field: 'linkForInspection' },
      { header: 'Comments',              field: 'comments' }
    ],
    async importRows(rows, tx) {
      const valid = rows.filter(r => r.bridgeId)
      if (!valid.length) return { inserted: 0, updated: 0, processed: rows.length }
      const bridgeIds = [...new Set(valid.map(r => r.bridgeId))]
      const bridges = await tx.run(SELECT.from('bridge.management.Bridges').columns('ID', 'bridgeId').where({ bridgeId: { in: bridgeIds } }))
      const bm = new Map(bridges.map(b => [b.bridgeId, b.ID]))
      const entries = valid.map(row => {
        const bridge_ID = bm.get(row.bridgeId)
        if (!bridge_ID) return null
        return {
          ID: cds.utils.uuid(), bridge_ID,
          roadNumber: row.roadNumber, roadRankCode: row.roadRankCode, roadClassCode: row.roadClassCode,
          carriageCode: row.carriageCode,
          minWidthM: row.minWidthM ? parseFloat(row.minWidthM) : null,
          maxWidthM: row.maxWidthM ? parseFloat(row.maxWidthM) : null,
          laneCount: row.laneCount ? parseInt(row.laneCount, 10) : null,
          verticalClearanceM: row.verticalClearanceM ? parseFloat(row.verticalClearanceM) : null,
          prescribedDirFrom: row.prescribedDirFrom, prescribedDirTo: row.prescribedDirTo,
          distanceFromStartKm: row.distanceFromStartKm ? parseFloat(row.distanceFromStartKm) : null,
          linkForInspection: row.linkForInspection, comments: row.comments
        }
      }).filter(Boolean)
      if (entries.length) await tx.run(INSERT.into('bridge.management.BridgeCarriageways').entries(entries))
      return { inserted: entries.length, updated: 0, processed: rows.length }
    }
  },
  {
    name: 'BridgeContacts',
    label: 'Bridge Contacts',
    description: 'Contact persons per bridge',
    columns: [
      { header: 'Bridge ID *',   field: 'bridgeId',      required: true },
      { header: 'Contact Group', field: 'contactGroup' },
      { header: 'Primary Contact',field: 'primaryContact' },
      { header: 'Organisation',  field: 'organisation' },
      { header: 'Position',      field: 'position' },
      { header: 'Phone',         field: 'phone' },
      { header: 'Mobile',        field: 'mobile' },
      { header: 'Address',       field: 'address' },
      { header: 'Email',         field: 'email' },
      { header: 'Comments',      field: 'comments' }
    ],
    async importRows(rows, tx) {
      const valid = rows.filter(r => r.bridgeId)
      if (!valid.length) return { inserted: 0, updated: 0, processed: rows.length }
      const bridgeIds = [...new Set(valid.map(r => r.bridgeId))]
      const bridges = await tx.run(SELECT.from('bridge.management.Bridges').columns('ID', 'bridgeId').where({ bridgeId: { in: bridgeIds } }))
      const bm = new Map(bridges.map(b => [b.bridgeId, b.ID]))
      const entries = valid.map(row => {
        const bridge_ID = bm.get(row.bridgeId)
        if (!bridge_ID) return null
        return {
          ID: cds.utils.uuid(), bridge_ID,
          contactGroup: row.contactGroup, primaryContact: row.primaryContact,
          organisation: row.organisation, position: row.position,
          phone: row.phone, mobile: row.mobile, address: row.address,
          email: row.email, comments: row.comments
        }
      }).filter(Boolean)
      if (entries.length) await tx.run(INSERT.into('bridge.management.BridgeContacts').entries(entries))
      return { inserted: entries.length, updated: 0, processed: rows.length }
    }
  },
  {
    name: 'BridgeMehComponents',
    label: 'MEH Components',
    description: 'Mechanical/Electrical/Hydraulic bridge components',
    columns: [
      { header: 'Bridge ID *',      field: 'bridgeId',       required: true },
      { header: 'Component Type',   field: 'componentType' },
      { header: 'Name',             field: 'name' },
      { header: 'Make',             field: 'make' },
      { header: 'Model',            field: 'model' },
      { header: 'Serial Number',    field: 'serialNumber' },
      { header: 'Is Electrical',    field: 'isElectrical',   type: 'boolean' },
      { header: 'Is Mechanical',    field: 'isMechanical',   type: 'boolean' },
      { header: 'Is Hydraulic',     field: 'isHydraulic',    type: 'boolean' },
      { header: 'Insp Frequency',   field: 'inspFrequency' },
      { header: 'Location Stored',  field: 'locationStored' },
      { header: 'Shelf Life (yrs)', field: 'shelfLifeYears', type: 'integer' },
      { header: 'Comments',         field: 'comments' }
    ],
    async importRows(rows, tx) {
      const valid = rows.filter(r => r.bridgeId)
      if (!valid.length) return { inserted: 0, updated: 0, processed: rows.length }
      const bridgeIds = [...new Set(valid.map(r => r.bridgeId))]
      const bridges = await tx.run(SELECT.from('bridge.management.Bridges').columns('ID', 'bridgeId').where({ bridgeId: { in: bridgeIds } }))
      const bm = new Map(bridges.map(b => [b.bridgeId, b.ID]))
      const entries = valid.map(row => {
        const bridge_ID = bm.get(row.bridgeId)
        if (!bridge_ID) return null
        return {
          ID: cds.utils.uuid(), bridge_ID,
          componentType: row.componentType, name: row.name, make: row.make,
          model: row.model, serialNumber: row.serialNumber,
          isElectrical: row.isElectrical === true || row.isElectrical === 'true' || row.isElectrical === '1',
          isMechanical: row.isMechanical === true || row.isMechanical === 'true' || row.isMechanical === '1',
          isHydraulic:  row.isHydraulic  === true || row.isHydraulic  === 'true' || row.isHydraulic  === '1',
          inspFrequency: row.inspFrequency, locationStored: row.locationStored,
          shelfLifeYears: row.shelfLifeYears ? parseInt(row.shelfLifeYears, 10) : null,
          comments: row.comments
        }
      }).filter(Boolean)
      if (entries.length) await tx.run(INSERT.into('bridge.management.BridgeMehComponents').entries(entries))
      return { inserted: entries.length, updated: 0, processed: rows.length }
    }
  },
  {
    name: 'BridgeConditionSurveys',
    label: 'Condition Surveys',
    description: 'Condition survey records. Leave surveyRef blank for new records (auto-assigned CS-0001…); provide surveyRef to update existing records.',
    entity: 'bridge.management.BridgeConditionSurveys',
    columns: CONDITION_SURVEY_COLUMNS,
    orderBy: 'surveyRef',
    importer: importConditionSurveyRows
  },
  {
    name: 'BridgeLoadRatings',
    label: 'Load Ratings',
    description: 'Per-vehicle-class load rating assessments. Leave ratingRef blank for new records (auto-assigned LR-0001…); provide ratingRef to update existing records.',
    entity: 'bridge.management.BridgeLoadRatings',
    columns: LOAD_RATING_COLUMNS,
    orderBy: 'ratingRef',
    importer: importLoadRatingRows
  },
  {
    name: 'BridgePermits',
    label: 'Permits',
    description: 'Permit applications and approvals. Leave permitRef blank for new records (auto-assigned PM-0001…); provide permitRef to update existing records.',
    entity: 'bridge.management.BridgePermits',
    columns: PERMIT_COLUMNS,
    orderBy: 'permitRef',
    importer: importPermitRows
  },
  {
    name: 'BridgeDefects',
    label: 'Bridge Defects',
    description: 'Defect records per bridge. Leave defectId blank for new records (auto-assigned DEF-0001…); provide defectId to update. Set active=false to soft-deactivate.',
    entity: 'bridge.management.BridgeDefects',
    columns: DEFECT_COLUMNS,
    orderBy: 'defectId',
    importer: importDefectRows
  },
  {
    name: 'BridgeCapacities',
    label: 'Bridge Capacities',
    description: 'AS 5100.7 load capacity, clearance and rating records. effectiveFrom is required. Set active=false to supersede old records.',
    entity: 'bridge.management.BridgeCapacities',
    columns: CAPACITY_COLUMNS,
    orderBy: 'effectiveFrom',
    importer: importCapacityRows
  },
  {
    name: 'BridgeScourAssessments',
    label: 'Scour Assessments',
    description: 'AP-G71.8 scour risk assessments per bridge.',
    entity: 'bridge.management.BridgeScourAssessments',
    columns: SCOUR_COLUMNS,
    orderBy: 'assessmentDate',
    importer: importScourRows
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
  { sheet: 'Bridges', column: 'inspectionType', dataset: 'InspectionTypes' },
  { sheet: 'Bridges', column: 'conditionTrend', dataset: 'ConditionTrends' },
  { sheet: 'Bridges', column: 'surfaceType', dataset: 'SurfaceTypes' },
  { sheet: 'Bridges', column: 'substructureType', dataset: 'SubstructureTypes' },
  { sheet: 'Bridges', column: 'foundationType', dataset: 'FoundationTypes' },
  { sheet: 'Bridges', column: 'waterwayType', dataset: 'WaterwayTypes' },
  { sheet: 'Restrictions', column: 'restrictionCategory', dataset: 'RestrictionCategories' },
  { sheet: 'Restrictions', column: 'restrictionType', dataset: 'RestrictionTypes' },
  { sheet: 'Restrictions', column: 'restrictionUnit', dataset: 'RestrictionUnits' },
  { sheet: 'Restrictions', column: 'restrictionStatus', dataset: 'RestrictionStatuses' },
  { sheet: 'Restrictions', column: 'appliesToVehicleClass', dataset: 'VehicleClasses' },
  { sheet: 'Restrictions', column: 'direction', dataset: 'RestrictionDirections' }
])

// ── Public API functions ──────────────────────────────────────────────────────

function getDatasets() {
  return DATASETS
    .filter((dataset) => !dataset.templateOnly)
    .map((dataset) => ({
      name: dataset.name,
      label: dataset.label,
      description: dataset.description,
      csvFileName: `${dataset.name}.csv`
    }))
}

async function buildWorkbookTemplate() {
  return _buildWorkbookTemplate(DATASETS, REFERENCE_EXAMPLES)
}

async function buildCsvTemplate(datasetName, withSamples = false) {
  return _buildCsvTemplate(datasetName, withSamples, DATASETS, REFERENCE_EXAMPLES)
}

async function exportDatasetRows(datasetName, filters = {}) {
  const dataset = DATASETS.find(d => d.name === datasetName && !d.templateOnly)
  if (!dataset || !dataset.entity) throw new Error(`Dataset '${datasetName}' not found or not exportable`)
  const db = await cds.connect.to('db')
  const allCols = dataset.columns.map((c) => c.name || c.field).filter(Boolean)
  const needsBridgeRef = allCols.includes('bridgeRef')
  const readCols = needsBridgeRef ? [...allCols.filter(c => c !== 'bridge_ID'), 'bridge_ID'] : allCols

  let query = SELECT.from(dataset.entity).columns(...readCols).orderBy(dataset.orderBy)
  const where = {}
  if (filters.bridgeRef) {
    if (needsBridgeRef) {
      const bridge = await db.run(SELECT.one.from('bridge.management.Bridges').columns('ID').where({ bridgeId: filters.bridgeRef }))
      if (bridge) where.bridge_ID = bridge.ID
    } else if (allCols.includes('bridgeId')) {
      where.bridgeId = filters.bridgeRef
    }
  }
  if (filters.active !== undefined && filters.active !== '') where.active = filters.active === 'true' || filters.active === true
  if (filters.status) where.status = filters.status
  if (Object.keys(where).length) query = query.where(where)

  let rows = await db.run(query)

  if (needsBridgeRef) {
    const unresolved = rows.filter(r => (r.bridgeRef == null || r.bridgeRef === '') && r.bridge_ID != null)
    if (unresolved.length) {
      const bridgeIds = [...new Set(unresolved.map(r => r.bridge_ID))]
      const bridges = await db.run(SELECT.from('bridge.management.Bridges').columns('ID', 'bridgeId').where({ ID: { in: bridgeIds } }))
      const bridgeMap = new Map(bridges.map(b => [String(b.ID), b.bridgeId]))
      for (const row of unresolved) row.bridgeRef = bridgeMap.get(String(row.bridge_ID)) ?? null
    }
    for (const row of rows) delete row.bridge_ID
  }

  const header = buildHeaderRow(dataset)
  const dataRowArrays = rows.map(row => dataset.columns.map(col => formatCellValue(row[col.name], col.type)))
  const sheet = XLSX.utils.aoa_to_sheet([header, ...dataRowArrays])
  return Buffer.from(XLSX.utils.sheet_to_csv(sheet), 'utf8')
}

async function importUpload({ buffer, fileName, datasetName, uploadedBy, mode = 'upsert' }) {
  if (!buffer?.length) {
    throw new Error('Uploaded file is empty')
  }
  if (!['create', 'update', 'upsert'].includes(mode)) {
    throw new Error(`Invalid mode '${mode}'. Must be create, update, or upsert.`)
  }

  const lowerName = (fileName || '').toLowerCase()
  const db = await cds.connect.to('db')
  const tx = db.tx()
  const batchId = cds.utils.uuid()
  const auditContext = { db, batchId, changedBy: uploadedBy || 'system', mode }

  try {
    let summaries
    let skipped = []
    let warnings = []
    let allRowResults = []

    if (lowerName.endsWith('.xlsx')) {
      const result = await importWorkbook(tx, buffer, datasetName, auditContext, mode)
      summaries = result.summaries
      skipped = result.skipped
      warnings = result.warnings
      allRowResults = result.rowResults || []

      // Process attribute value sheets (BridgeAttributes, RestrictionAttributes)
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, codepage: 65001 })
      const attrSheetMap = { BridgeAttributes: 'bridge', RestrictionAttributes: 'restriction' }
      for (const [sheetName, objectType] of Object.entries(attrSheetMap)) {
        const attrSheet = workbook.Sheets[sheetName]
        if (!attrSheet) continue
        const attrRows = XLSX.utils.sheet_to_json(attrSheet, { header: 1, defval: null })
        if (attrRows.length < 3) continue
        const headerRow = attrRows[1] || []
        const idCol = objectType === 'bridge' ? 'bridgeId' : 'restrictionRef'
        const idColIdx = headerRow.findIndex(h => h === idCol)
        if (idColIdx === -1) continue

        const idLookupEntity = objectType === 'bridge' ? 'bridge.management.Bridges' : 'bridge.management.Restrictions'
        const refField = objectType === 'bridge' ? 'bridgeId' : 'restrictionRef'
        const allObjs = await db.run(SELECT.from(idLookupEntity).columns('ID', refField))
        const idByRef = new Map(allObjs.map(o => [o[refField], String(o['ID'])]))

        const allDefs = await db.run(
          SELECT.from('bridge.management.AttributeDefinitions').where({ objectType, status: 'Active' })
        )
        const defByKey = new Map(allDefs.map(d => [d.internalKey, d]))

        const colAttrMap = headerRow.map(spreadsheetHeader => {
          const attributeKeyMatch = String(spreadsheetHeader || '').match(/\(([^)]+)\)$/)
          return attributeKeyMatch ? defByKey.get(attributeKeyMatch[1]) || null : null
        })

        for (let ri = 2; ri < attrRows.length; ri++) {
          const row = attrRows[ri]
          const refVal = row[idColIdx] != null ? String(row[idColIdx]).trim() : ''
          if (!refVal) continue
          const objectId = idByRef.get(refVal)
          if (!objectId) continue

          for (let ci = 0; ci < colAttrMap.length; ci++) {
            const def = colAttrMap[ci]
            if (!def) continue
            const rawVal = row[ci]
            if (rawVal === null || rawVal === undefined) continue
            try {
              const existing = await db.run(
                SELECT.one.from('bridge.management.AttributeValues')
                  .where({ objectType, objectId, attributeKey: def.internalKey })
              )
              const typedEntry = {
                objectType, objectId, attributeKey: def.internalKey,
                valueText: ['Text','SingleSelect','MultiSelect'].includes(def.dataType) ? String(rawVal) : null,
                valueInteger: def.dataType === 'Integer' ? parseInt(rawVal, 10) : null,
                valueDecimal: def.dataType === 'Decimal' ? parseFloat(rawVal) : null,
                valueDate: def.dataType === 'Date' ? String(rawVal) : null,
                valueBoolean: def.dataType === 'Boolean' ? Boolean(rawVal) : null,
                modifiedBy: 'import', modifiedAt: new Date().toISOString()
              }
              if (existing) {
                await db.run(UPDATE('bridge.management.AttributeValues').set(typedEntry).where({ ID: existing.ID }))
              } else {
                await db.run(INSERT.into('bridge.management.AttributeValues').entries({ ID: cds.utils.uuid(), ...typedEntry, createdBy: 'import', createdAt: new Date().toISOString() }))
              }
            } catch (_) { /* skip bad rows */ }
          }
        }
      }
    } else if (lowerName.endsWith('.csv')) {
      const result = await importCsv(tx, buffer, datasetName, auditContext, mode)
      summaries = [result.summary]
      warnings = result.warnings
      allRowResults = result.rowResults || []
    } else {
      throw new Error('Unsupported file type. Upload an .xlsx or .csv file.')
    }

    await tx.commit()

    if (auditContext._auditQueue) {
      for (const entry of auditContext._auditQueue) {
        await writeChangeLogs(db, entry)
      }
    }

    const processed = summaries.reduce((total, summary) => total + summary.processed, 0)
    const modeLabel = mode === 'create' ? 'Create' : mode === 'update' ? 'Update' : 'Upsert'
    return {
      message: `Mass upload completed (${modeLabel} mode). ${processed} rows processed across ${summaries.length} dataset(s).`,
      mode,
      summaries,
      skipped,
      warnings,
      rowResults: allRowResults
    }
  } catch (error) {
    await tx.rollback()
    throw error
  }
}

async function validateUpload({ buffer, fileName, datasetName, mode = 'upsert' }) {
  if (!buffer?.length) {
    throw new Error('Uploaded file is empty')
  }

  const lowerName = (fileName || '').toLowerCase()
  if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.csv')) {
    throw new Error('Unsupported file type. Upload an .xlsx or .csv file.')
  }
  if (lowerName.endsWith('.csv') && (!datasetName || datasetName === 'All')) {
    throw new Error('Select a specific dataset for CSV uploads, or use the Excel template for All.')
  }

  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, codepage: 65001 })
  const datasets = lowerName.endsWith('.xlsx') ? resolveWorkbookDatasets(datasetName) : [requireDataset(datasetName)]
  const previewRows = []
  let totalCount = 0
  let validCount = 0
  let warningCount = 0
  let errorCount = 0
  let previewColumns = []

  for (const dataset of datasets) {
    const sheet = lowerName.endsWith('.xlsx') ? workbook.Sheets[dataset.name] : workbook.Sheets[workbook.SheetNames[0]]
    if (!sheet) continue
    const rows = parseSheetRows(sheet, dataset)
    if (!previewColumns.length) {
      previewColumns = getPreviewColumns(dataset)
    }

    for (const row of rows) {
      const messages = []
      let status = 'Success'
      try {
        const normalized = normalizeRow(dataset, row, messages)
        if (!normalized) {
          status = 'Error'
        } else if (messages.length) {
          status = 'Warning'
        }
      } catch (error) {
        messages.push(error.message || String(error))
        status = 'Error'
      }

      totalCount += 1
      if (status === 'Error') errorCount += 1
      else validCount += 1
      if (status === 'Warning') warningCount += 1

      previewRows.push({
        rowNum: row.__rowNumber,
        _c1: formatPreviewCell(row, previewColumns[0]),
        _c2: formatPreviewCell(row, previewColumns[1]),
        _c3: formatPreviewCell(row, previewColumns[2]),
        _c4: formatPreviewCell(row, previewColumns[3]),
        _c5: formatPreviewCell(row, previewColumns[4]),
        validText: status === 'Error' ? 'Errors' : status === 'Warning' ? 'Warnings' : 'Valid',
        statusState: status === 'Error' ? 'Error' : status === 'Warning' ? 'Warning' : 'Success',
        message: stripDatasetRowPrefix(messages.join('; '))
      })
    }
  }

  if (!totalCount) {
    throw new Error('No supported upload rows were found in the file.')
  }

  return {
    fileName,
    totalCount,
    validCount,
    warningCount,
    errorCount,
    previewTitle: `Parsed ${totalCount} row(s) - showing the first ${Math.min(totalCount, 10)}.`,
    previewColumns: previewColumns.map((column) => column.label),
    previewRows: previewRows.slice(0, 10),
    previewTruncated: errorCount > 10,
    message: buildValidationMessage(totalCount, validCount, warningCount, errorCount)
  }
}

async function importWorkbook(tx, buffer, datasetName, auditContext) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, codepage: 65001 })
  const summaries = []
  const skipped = []
  const warnings = []
  const allRowResults = []
  const datasets = resolveWorkbookDatasets(datasetName)

  for (const dataset of datasets) {
    const sheet = workbook.Sheets[dataset.name]
    if (!sheet) {
      skipped.push({ name: dataset.name, label: dataset.label })
      continue
    }
    const rows = parseSheetRows(sheet, dataset)
    const result = dataset.importer
      ? await dataset.importer(tx, dataset, rows, warnings, auditContext)
      : await dataset.importRows(rows, tx)
    if (result) {
      summaries.push({ dataset: dataset.name, label: dataset.label, inserted: result.inserted ?? 0, updated: result.updated ?? 0, processed: result.processed ?? rows.length, deleted: result.deleted ?? 0, errors: result.errors ?? 0 })
      if (result.rowResults) {
        allRowResults.push(...result.rowResults.map(r => ({ ...r, datasetLabel: result.label || result.dataset })))
      }
    }
  }

  if (!summaries.length) {
    if (datasetName && datasetName !== 'All') {
      throw new Error(`Workbook does not contain the selected "${datasetName}" sheet.`)
    }
    throw new Error('No supported upload sheets were found in the workbook.')
  }

  return { summaries, skipped, warnings, rowResults: allRowResults }
}

async function importCsv(tx, buffer, datasetName, auditContext) {
  if (!datasetName || datasetName === 'All') {
    throw new Error('Select a specific dataset for CSV uploads, or use the Excel template for All.')
  }

  const dataset = requireDataset(datasetName)
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, codepage: 65001 })
  const [firstSheetName] = workbook.SheetNames
  const sheet = workbook.Sheets[firstSheetName]

  if (!sheet) {
    throw new Error('CSV file does not contain any rows.')
  }

  const warnings = []
  const rows = parseSheetRows(sheet, dataset)
  const result = await (dataset.importer
    ? dataset.importer(tx, dataset, rows, warnings, auditContext)
    : dataset.importRows(rows, tx))
  const rowResults = (result?.rowResults || []).map(r => ({ ...r, datasetLabel: result.label || result.dataset }))
  return { summary: result, warnings, rowResults }
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
  exportDatasetRows,
  getDatasets,
  importUpload,
  validateUpload,
  recordUploadSession,
  getUploadHistory,
  getUploadSessionById
}
