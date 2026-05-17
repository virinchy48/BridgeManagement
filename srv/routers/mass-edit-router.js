const cds = require('@sap/cds')
const express = require('express')
const { SELECT, UPDATE } = cds.ql
const { diffRecords, writeChangeLogs, fetchCurrentRecord } = require('../audit-log')

const MASS_EDIT_COLUMNS = [
  'ID', 'bridgeId', 'bridgeName', 'state', 'route', 'region', 'assetOwner',
  'structureType', 'yearBuilt', 'condition', 'conditionRating', 'postingStatus',
  'lastInspectionDate', 'scourRisk', 'pbsApprovalClass', 'nhvrAssessed',
  'freightRoute', 'overMassRoute', 'hmlApproved', 'bDoubleApproved', 'remarks'
]

const MASS_EDIT_RESTRICTION_COLUMNS = [
  'ID', 'restrictionRef', 'bridgeRef', 'restrictionCategory', 'restrictionType',
  'restrictionValue', 'restrictionUnit', 'restrictionStatus', 'appliesToVehicleClass',
  'grossMassLimit', 'axleMassLimit', 'heightLimit', 'widthLimit', 'lengthLimit',
  'speedLimit', 'permitRequired', 'escortRequired', 'temporary', 'active',
  'effectiveFrom', 'effectiveTo', 'approvedBy', 'direction', 'remarks'
]

const MASS_EDIT_FIELD_TYPES = {
  bridgeName: 'string', state: 'string', route: 'string', region: 'string',
  assetOwner: 'string', structureType: 'string', yearBuilt: 'integer',
  condition: 'string', conditionRating: 'integer', postingStatus: 'string',
  lastInspectionDate: 'date', scourRisk: 'string', pbsApprovalClass: 'string',
  nhvrAssessed: 'boolean', freightRoute: 'boolean', overMassRoute: 'boolean',
  hmlApproved: 'boolean', bDoubleApproved: 'boolean', remarks: 'string'
}

const MASS_EDIT_RESTRICTION_FIELD_TYPES = {
  restrictionCategory: 'string', restrictionType: 'string', restrictionValue: 'string',
  restrictionUnit: 'string', restrictionStatus: 'string', appliesToVehicleClass: 'string',
  grossMassLimit: 'decimal', axleMassLimit: 'decimal', heightLimit: 'decimal',
  widthLimit: 'decimal', lengthLimit: 'decimal', speedLimit: 'integer',
  permitRequired: 'boolean', escortRequired: 'boolean', temporary: 'boolean',
  active: 'boolean', effectiveFrom: 'date', effectiveTo: 'date',
  approvedBy: 'string', direction: 'string', remarks: 'string'
}

const MASS_EDIT_REQUIRED_FIELDS = new Set(['bridgeName', 'state', 'assetOwner'])

function mapCodeList(rows) {
  return (rows || []).map(row => ({ key: row.code, text: row.name || row.code }))
}

function normalizeMassEditValue(field, value, fieldTypes = MASS_EDIT_FIELD_TYPES) {
  const type = fieldTypes[field]
  if (!type) throw new Error(`Unsupported mass edit field: ${field}`)

  if (value === undefined) return undefined

  if (value === '') value = null

  if (MASS_EDIT_REQUIRED_FIELDS.has(field) && (value === null || value === undefined)) {
    throw new Error(`${field} cannot be empty`)
  }

  switch (type) {
    case 'string':
      return value == null ? null : String(value).trim()
    case 'integer':
      if (value == null) return null
      if (typeof value === 'number' && Number.isInteger(value)) return value
      if (/^-?\d+$/.test(String(value).trim())) return Number.parseInt(value, 10)
      throw new Error(`${field} must be a whole number`)
    case 'decimal':
      if (value == null) return null
      if (typeof value === 'number' && Number.isFinite(value)) return value
      if (/^-?\d+(\.\d+)?$/.test(String(value).trim())) return Number.parseFloat(value)
      throw new Error(`${field} must be a number`)
    case 'boolean':
      if (value == null) return false
      if (typeof value === 'boolean') return value
      if (value === 'true' || value === 'X' || value === 1 || value === '1') return true
      if (value === 'false' || value === 0 || value === '0') return false
      throw new Error(`${field} must be true or false`)
    case 'date':
      if (value == null) return null
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value)
      throw new Error(`${field} must be in YYYY-MM-DD format`)
    default:
      return value
  }
}

async function loadMassEditLookups() {
  const db = await cds.connect.to('db')
  const entities = [
    'bridge.management.States', 'bridge.management.ConditionStates',
    'bridge.management.PostingStatuses', 'bridge.management.StructureTypes',
    'bridge.management.ScourRiskLevels', 'bridge.management.PbsApprovalClasses',
    'bridge.management.RestrictionCategories', 'bridge.management.RestrictionTypes',
    'bridge.management.RestrictionStatuses', 'bridge.management.RestrictionUnits',
    'bridge.management.RestrictionDirections', 'bridge.management.VehicleClasses'
  ]
  const results = await Promise.all(
    entities.map(e => db.run(SELECT.from(e).columns('code', 'name').orderBy('code')))
  )
  const [
    states, conditions, postingStatuses, structureTypes, scourRisks,
    pbsApprovalClasses, restrictionCategories, restrictionTypes,
    restrictionStatuses, restrictionUnits, restrictionDirections, vehicleClasses
  ] = results.map(mapCodeList)

  return {
    states, conditions, postingStatuses, structureTypes, scourRisks,
    pbsApprovalClasses, restrictionCategories, restrictionTypes,
    restrictionStatuses, restrictionUnits, restrictionDirections, vehicleClasses
  }
}

async function loadMassEditBridges() {
  const db = await cds.connect.to('db')
  const bridges = await db.run(
    SELECT.from('bridge.management.Bridges').columns(...MASS_EDIT_COLUMNS).orderBy('bridgeId')
  )
  return (bridges || []).map(bridge => ({
    ...bridge,
    yearBuilt: bridge.yearBuilt == null ? null : Number(bridge.yearBuilt),
    conditionRating: bridge.conditionRating == null ? null : Number(bridge.conditionRating),
    nhvrAssessed: Boolean(bridge.nhvrAssessed),
    freightRoute: Boolean(bridge.freightRoute),
    overMassRoute: Boolean(bridge.overMassRoute),
    hmlApproved: Boolean(bridge.hmlApproved),
    bDoubleApproved: Boolean(bridge.bDoubleApproved)
  }))
}

async function saveMassEditBridges(updates, { user } = {}) {
  const db = await cds.connect.to('db')
  const tx = db.tx()
  let updated = 0
  const batchId = cds.utils.uuid()
  const auditEntries = []

  try {
    for (const update of updates || []) {
      const id = Number(update?.ID)
      if (!Number.isInteger(id)) throw new Error('Each mass edit update requires a numeric ID')

      const patch = {}
      for (const [field, rawValue] of Object.entries(update)) {
        if (field === 'ID') continue
        if (!Object.prototype.hasOwnProperty.call(MASS_EDIT_FIELD_TYPES, field)) {
          throw new Error(`Field ${field} is not allowed in mass edit`)
        }
        const value = normalizeMassEditValue(field, rawValue, MASS_EDIT_FIELD_TYPES)
        if (value !== undefined) patch[field] = value
      }

      if (!Object.keys(patch).length) continue

      const oldRecord = await fetchCurrentRecord(db, 'bridge.management.Bridges', { ID: id })

      await tx.run(UPDATE('bridge.management.Bridges').set(patch).where({ ID: id }))
      updated += 1

      if (oldRecord) {
        const changes = diffRecords(
          Object.fromEntries(Object.keys(patch).map(k => [k, oldRecord[k]])),
          patch
        )
        if (changes.length) {
          auditEntries.push({
            objectType: 'Bridge', objectId: String(id),
            objectName: oldRecord.bridgeName || String(id),
            source: 'MassEdit', batchId, changedBy: user || 'system', changes
          })
        }
      }
    }

    await tx.commit()

    for (const entry of auditEntries) {
      await writeChangeLogs(db, entry)
    }

    return { updated }
  } catch (error) {
    await tx.rollback(error)
    throw error
  }
}

async function loadMassEditRestrictions() {
  const db = await cds.connect.to('db')
  const restrictions = await db.run(
    SELECT.from('bridge.management.Restrictions').columns(...MASS_EDIT_RESTRICTION_COLUMNS).orderBy('restrictionRef')
  )
  return (restrictions || []).map(restriction => ({
    ...restriction,
    grossMassLimit: restriction.grossMassLimit == null ? null : Number(restriction.grossMassLimit),
    axleMassLimit: restriction.axleMassLimit == null ? null : Number(restriction.axleMassLimit),
    heightLimit: restriction.heightLimit == null ? null : Number(restriction.heightLimit),
    widthLimit: restriction.widthLimit == null ? null : Number(restriction.widthLimit),
    lengthLimit: restriction.lengthLimit == null ? null : Number(restriction.lengthLimit),
    speedLimit: restriction.speedLimit == null ? null : Number(restriction.speedLimit),
    permitRequired: Boolean(restriction.permitRequired),
    escortRequired: Boolean(restriction.escortRequired),
    temporary: Boolean(restriction.temporary),
    active: Boolean(restriction.active)
  }))
}

async function saveMassEditRestrictions(updates, { user } = {}) {
  const db = await cds.connect.to('db')
  const tx = db.tx()
  let updated = 0
  const batchId = cds.utils.uuid()
  const auditEntries = []

  try {
    for (const update of updates || []) {
      const id = update?.ID
      if (!id || typeof id !== 'string') throw new Error('Each restriction update requires an ID')

      const patch = {}
      for (const [field, rawValue] of Object.entries(update)) {
        if (field === 'ID') continue
        if (!Object.prototype.hasOwnProperty.call(MASS_EDIT_RESTRICTION_FIELD_TYPES, field)) {
          throw new Error(`Field ${field} is not allowed in restriction mass edit`)
        }
        const value = normalizeMassEditValue(field, rawValue, MASS_EDIT_RESTRICTION_FIELD_TYPES)
        if (value !== undefined) patch[field] = value
      }

      if (!Object.keys(patch).length) continue

      const oldRecord = await fetchCurrentRecord(db, 'bridge.management.Restrictions', { ID: id })

      await tx.run(UPDATE('bridge.management.Restrictions').set(patch).where({ ID: id }))
      updated += 1

      if (oldRecord) {
        const changes = diffRecords(
          Object.fromEntries(Object.keys(patch).map(k => [k, oldRecord[k]])),
          patch
        )
        if (changes.length) {
          auditEntries.push({
            objectType: 'Restriction', objectId: id,
            objectName: oldRecord.restrictionRef || id,
            source: 'MassEdit', batchId, changedBy: user || 'system', changes
          })
        }
      }
    }

    await tx.commit()

    for (const entry of auditEntries) {
      await writeChangeLogs(db, entry)
    }

    return { updated }
  } catch (error) {
    await tx.rollback(error)
    throw error
  }
}

const router = express.Router()
router.use(express.json({ limit: '5mb' }))

router.get('/lookups', async (_req, res) => {
  try {
    const lookups = await loadMassEditLookups()
    res.json(lookups)
  } catch (error) {
    res.status(500).json({ error: { message: error.message || 'Failed to load mass edit lookups' } })
  }
})

router.get('/bridges', async (_req, res) => {
  try {
    const bridges = await loadMassEditBridges()
    res.json({ bridges })
  } catch (error) {
    res.status(500).json({ error: { message: error.message || 'Failed to load bridges for mass edit' } })
  }
})

router.get('/restrictions', async (_req, res) => {
  try {
    const restrictions = await loadMassEditRestrictions()
    res.json({ restrictions })
  } catch (error) {
    res.status(500).json({ error: { message: error.message || 'Failed to load restrictions for mass edit' } })
  }
})

router.post('/bridges/save', async (req, res) => {
  try {
    const updates = req.body?.updates
    if (!Array.isArray(updates) || !updates.length) {
      return res.status(400).json({ error: { message: 'updates must be a non-empty array' } })
    }
    const user = req.user?.id || 'system'
    const result = await saveMassEditBridges(updates, { user })
    res.json(result)
  } catch (error) {
    res.status(422).json({ error: { message: error.message || 'Failed to save bridge updates' } })
  }
})

router.post('/restrictions/save', async (req, res) => {
  try {
    const updates = req.body?.updates
    if (!Array.isArray(updates) || !updates.length) {
      return res.status(400).json({ error: { message: 'updates must be a non-empty array' } })
    }
    const user = req.user?.id || 'system'
    const result = await saveMassEditRestrictions(updates, { user })
    res.json(result)
  } catch (error) {
    res.status(422).json({ error: { message: error.message || 'Failed to save restriction updates' } })
  }
})

module.exports = router
