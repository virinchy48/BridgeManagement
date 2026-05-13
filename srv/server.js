const cds = require('@sap/cds')
const express = require('express')
const helmet = require('helmet')
const crypto = require('crypto')
const { v4: uuidv4 } = require('uuid')
const { recordActivity } = require('./user-activity')

const {
  buildCsvTemplate,
  buildWorkbookTemplate,
  exportDatasetRows,
  getDatasets,
  importUpload,
  validateUpload,
  recordUploadSession,
  getUploadHistory,
  getUploadSessionById
} = require('./mass-upload')

const mountAttributesApi = require('./attributes-api')
const mountReportsApi = require('./reports-api')
const mountBhiBsiApi = require('./bhi-bsi-api')
const mountExternalApi = require('./external-api')
const qrApi = require('./qr-api')

const { diffRecords, writeChangeLogs, fetchCurrentRecord } = require('./audit-log')

const { getConfigInt } = require('./system-config')

const { SELECT, INSERT, UPDATE, DELETE } = cds.ql

const MASS_EDIT_COLUMNS = [
  'ID',
  'bridgeId',
  'bridgeName',
  'state',
  'route',
  'region',
  'assetOwner',
  'structureType',
  'yearBuilt',
  'condition',
  'conditionRating',
  'postingStatus',
  'lastInspectionDate',
  'scourRisk',
  'pbsApprovalClass',
  'nhvrAssessed',
  'freightRoute',
  'overMassRoute',
  'hmlApproved',
  'bDoubleApproved',
  'remarks'
]

const MASS_EDIT_RESTRICTION_COLUMNS = [
  'ID',
  'restrictionRef',
  'bridgeRef',
  'restrictionCategory',
  'restrictionType',
  'restrictionValue',
  'restrictionUnit',
  'restrictionStatus',
  'appliesToVehicleClass',
  'grossMassLimit',
  'axleMassLimit',
  'heightLimit',
  'widthLimit',
  'lengthLimit',
  'speedLimit',
  'permitRequired',
  'escortRequired',
  'temporary',
  'active',
  'effectiveFrom',
  'effectiveTo',
  'approvedBy',
  'direction',
  'remarks'
]

const MASS_EDIT_FIELD_TYPES = {
  bridgeName: 'string',
  state: 'string',
  route: 'string',
  region: 'string',
  assetOwner: 'string',
  structureType: 'string',
  yearBuilt: 'integer',
  condition: 'string',
  conditionRating: 'integer',
  postingStatus: 'string',
  lastInspectionDate: 'date',
  scourRisk: 'string',
  pbsApprovalClass: 'string',
  nhvrAssessed: 'boolean',
  freightRoute: 'boolean',
  overMassRoute: 'boolean',
  hmlApproved: 'boolean',
  bDoubleApproved: 'boolean',
  remarks: 'string'
}

const MASS_EDIT_RESTRICTION_FIELD_TYPES = {
  restrictionCategory: 'string',
  restrictionType: 'string',
  restrictionValue: 'string',
  restrictionUnit: 'string',
  restrictionStatus: 'string',
  appliesToVehicleClass: 'string',
  grossMassLimit: 'decimal',
  axleMassLimit: 'decimal',
  heightLimit: 'decimal',
  widthLimit: 'decimal',
  lengthLimit: 'decimal',
  speedLimit: 'integer',
  permitRequired: 'boolean',
  escortRequired: 'boolean',
  temporary: 'boolean',
  active: 'boolean',
  effectiveFrom: 'date',
  effectiveTo: 'date',
  approvedBy: 'string',
  direction: 'string',
  remarks: 'string'
}

const MASS_EDIT_REQUIRED_FIELDS = new Set(['bridgeName', 'state', 'assetOwner'])

function normalizeMassEditValue(field, value, fieldTypes = MASS_EDIT_FIELD_TYPES) {
  const type = fieldTypes[field]
  if (!type) {
    throw new Error(`Unsupported mass edit field: ${field}`)
  }

  if (value === undefined) {
    return undefined
  }

  if (value === '') {
    value = null
  }

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

function parseBbox(bbox) {
  if (!bbox) return null;
  const parts = String(bbox).split(',').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return null;
  const [minLon, minLat, maxLon, maxLat] = parts;
  if (minLon >= maxLon || minLat >= maxLat) return null;
  return { minLon, minLat, maxLon, maxLat };
}

function isHanaDb() {
  const requires = cds.env.requires || {};
  return Object.values(requires).some(s => s && (s.kind === 'hana' || s.impl === '@cap-js/hana'))
    || process.env.NODE_ENV === 'production';
}

function sanitizeAttachmentName(fileName) {
  const cleaned = String(fileName || 'attachment')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim()
  return cleaned || 'attachment'
}

async function toAttachmentBuffer(content) {
  if (!content) return Buffer.alloc(0)
  if (Buffer.isBuffer(content)) return content
  if (content instanceof Uint8Array) return Buffer.from(content)
  if (typeof content === 'string') return Buffer.from(content, 'base64')
  if (typeof content.pipe === 'function' || content[Symbol.asyncIterator]) {
    const chunks = []
    for await (const chunk of content) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }
  if (content.buffer) return Buffer.from(content.buffer)
  return Buffer.from(content)
}

function attachmentResponse(row, bridgeId) {
  return {
    ID: row.ID,
    title: row.title || row.fileName,
    fileName: row.fileName,
    mediaType: row.mediaType || 'application/octet-stream',
    fileSize: row.fileSize || 0,
    createdAt: row.createdAt,
    documentDate: row.documentDate,
    referenceNumber: row.referenceNumber,
    openUrl: `/admin-bridges/api/bridges/${encodeURIComponent(bridgeId)}/attachments/${encodeURIComponent(row.ID)}/content`,
    downloadUrl: `/admin-bridges/api/bridges/${encodeURIComponent(bridgeId)}/attachments/${encodeURIComponent(row.ID)}/content?download=true`,
    deleteUrl: `/admin-bridges/api/bridges/${encodeURIComponent(bridgeId)}/attachments/${encodeURIComponent(row.ID)}`
  }
}

async function assertBridgeExists(db, bridgeId) {
  const ID = Number(bridgeId)
  if (!Number.isInteger(ID)) {
    const error = new Error('Invalid bridge ID')
    error.status = 400
    throw error
  }
  let bridge = await db.run(SELECT.one.from('bridge.management.Bridges').columns('ID').where({ ID }))
  if (!bridge) {
    // Also accept draft entities that haven't been activated yet
    try {
      bridge = await db.run(SELECT.one.from('bridge.management.Bridges.drafts').columns('ID').where({ ID }))
    } catch (_) { /* drafts table may not exist */ }
  }
  if (!bridge) {
    const error = new Error('Bridge not found')
    error.status = 404
    throw error
  }
  return ID
}

function mapCodeList(rows) {
  return (rows || []).map((row) => ({ key: row.code, text: row.name || row.code }))
}

async function loadMassEditLookups() {
  const db = await cds.connect.to('db')
  const entities = [
    'bridge.management.States',
    'bridge.management.ConditionStates',
    'bridge.management.PostingStatuses',
    'bridge.management.StructureTypes',
    'bridge.management.ScourRiskLevels',
    'bridge.management.PbsApprovalClasses',
    'bridge.management.RestrictionCategories',
    'bridge.management.RestrictionTypes',
    'bridge.management.RestrictionStatuses',
    'bridge.management.RestrictionUnits',
    'bridge.management.RestrictionDirections',
    'bridge.management.VehicleClasses'
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
    states,
    conditions,
    postingStatuses,
    structureTypes,
    scourRisks,
    pbsApprovalClasses,
    restrictionCategories,
    restrictionTypes,
    restrictionStatuses,
    restrictionUnits,
    restrictionDirections,
    vehicleClasses
  }
}

async function loadMassEditBridges() {
  const db = await cds.connect.to('db')
  const bridges = await db.run(
    SELECT.from('bridge.management.Bridges')
      .columns(...MASS_EDIT_COLUMNS)
      .orderBy('bridgeId')
  )

  return (bridges || []).map((bridge) => ({
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
      if (!Number.isInteger(id)) {
        throw new Error('Each mass edit update requires a numeric ID')
      }

      const patch = {}
      for (const [field, rawValue] of Object.entries(update)) {
        if (field === 'ID') continue
        if (!Object.prototype.hasOwnProperty.call(MASS_EDIT_FIELD_TYPES, field)) {
          throw new Error(`Field ${field} is not allowed in mass edit`)
        }
        const value = normalizeMassEditValue(field, rawValue, MASS_EDIT_FIELD_TYPES)
        if (value !== undefined) {
          patch[field] = value
        }
      }

      if (!Object.keys(patch).length) continue

      // Fetch old values before overwriting
      const oldRecord = await fetchCurrentRecord(db, 'bridge.management.Bridges', { ID: id })

      await tx.run(
        UPDATE('bridge.management.Bridges')
          .set(patch)
          .where({ ID: id })
      )
      updated += 1

      if (oldRecord) {
        const changes = diffRecords(
          Object.fromEntries(Object.keys(patch).map(k => [k, oldRecord[k]])),
          patch
        )
        if (changes.length) {
          auditEntries.push({
            objectType: 'Bridge',
            objectId:   String(id),
            objectName: oldRecord.bridgeName || String(id),
            source:     'MassEdit',
            batchId,
            changedBy:  user || 'system',
            changes
          })
        }
      }
    }

    await tx.commit()

    // Write audit after commit so it is never rolled back with business data
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
    SELECT.from('bridge.management.Restrictions')
      .columns(...MASS_EDIT_RESTRICTION_COLUMNS)
      .orderBy('restrictionRef')
  )

  return (restrictions || []).map((restriction) => ({
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
      if (!id || typeof id !== 'string') {
        throw new Error('Each restriction update requires an ID')
      }

      const patch = {}
      for (const [field, rawValue] of Object.entries(update)) {
        if (field === 'ID') continue
        if (!Object.prototype.hasOwnProperty.call(MASS_EDIT_RESTRICTION_FIELD_TYPES, field)) {
          throw new Error(`Field ${field} is not allowed in restriction mass edit`)
        }
        const value = normalizeMassEditValue(field, rawValue, MASS_EDIT_RESTRICTION_FIELD_TYPES)
        if (value !== undefined) {
          patch[field] = value
        }
      }

      if (!Object.keys(patch).length) continue

      const oldRecord = await fetchCurrentRecord(db, 'bridge.management.Restrictions', { ID: id })

      await tx.run(
        UPDATE('bridge.management.Restrictions')
          .set(patch)
          .where({ ID: id })
      )
      updated += 1

      if (oldRecord) {
        const changes = diffRecords(
          Object.fromEntries(Object.keys(patch).map(k => [k, oldRecord[k]])),
          patch
        )
        if (changes.length) {
          auditEntries.push({
            objectType: 'Restriction',
            objectId:   id,
            objectName: oldRecord.restrictionRef || id,
            source:     'MassEdit',
            batchId,
            changedBy:  user || 'system',
            changes
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

async function loadDashboardAnalytics({ state } = {}) {
  const db = await cds.connect.to('db')

  const bridgeQuery = SELECT.from('bridge.management.Bridges').columns(
    'ID', 'bridgeId', 'bridgeName', 'state',
    'condition', 'conditionRating', 'structuralAdequacyRating',
    'postingStatus', 'scourRisk',
    'nextInspectionDue', 'gazetteExpiryDate'
  )
  if (state) bridgeQuery.where({ state })

  const [bridges, restrictions] = await Promise.all([
    db.run(bridgeQuery),
    db.run(SELECT.from('bridge.management.Restrictions').columns(
      'ID', 'active', 'restrictionStatus'
    ).where({ active: true }))
  ])

  const bridgeList      = bridges      || []
  const restrictionList = restrictions || []
  const total           = bridgeList.length

  // Handles both numeric (TfNSW 1–5) and text condition values
  const condKey = (b) => {
    const c = b.condition
    if (c == null) return 'good'
    if (typeof c === 'number' || /^\d+(\.\d+)?$/.test(String(c))) {
      const n = Number(c)
      if (n >= 5) return 'critical'
      if (n >= 3) return 'poor'
      if (n >= 2) return 'fair'
      return 'good'
    }
    const s = String(c).toLowerCase()
    if (s === 'critical') return 'critical'
    if (s === 'poor' || s === 'very poor') return 'poor'
    if (s === 'fair') return 'fair'
    return 'good'
  }

  // ── Condition distribution ────────────────────────────────────────────────
  const dist = { good: 0, fair: 0, poor: 0, critical: 0 }
  for (const b of bridgeList) dist[condKey(b)]++

  // ── Network Condition Index (weighted, 0–100) ─────────────────────────────
  const nci = total > 0
    ? Math.round((dist.good * 100 + dist.fair * 67 + dist.poor * 33) / total)
    : 0
  const deficiencyRate = total > 0 ? Math.round((dist.poor + dist.critical) / total * 100) : 0

  // ── Condition by state ────────────────────────────────────────────────────
  const stateMap = {}
  for (const b of bridgeList) {
    const s = b.state || 'Unknown'
    if (!stateMap[s]) stateMap[s] = { state: s, good: 0, fair: 0, poor: 0, critical: 0, total: 0 }
    stateMap[s].total++
    stateMap[s][condKey(b)]++
  }
  const conditionByState = Object.values(stateMap).sort((a, b) => b.total - a.total)

  // ── Structural adequacy ───────────────────────────────────────────────────
  const ratedBridges = bridgeList.filter(b => b.structuralAdequacyRating != null && b.structuralAdequacyRating > 0)
  let sufficiencyPct = 0
  if (ratedBridges.length > 0) {
    const sumRating = ratedBridges.reduce((s, b) => s + Number(b.structuralAdequacyRating), 0)
    sufficiencyPct  = Math.round((sumRating / ratedBridges.length / 10) * 100)
  } else {
    // Fall back to condition-rating proxy (0–100) when adequacy data not populated
    const condAdequacy = { 1: 85, 2: 65, 3: 40, 4: 20, 5: 10 }
    const hasCond = bridgeList.filter(b => b.conditionRating > 0)
    if (hasCond.length > 0) {
      sufficiencyPct = Math.round(hasCond.reduce((s, b) => s + (condAdequacy[b.conditionRating] || 50), 0) / hasCond.length)
    }
  }

  // ── Other KPIs ────────────────────────────────────────────────────────────
  const closedBridges      = bridgeList.filter(b => b.postingStatus === 'Closed').length
  const scourCritical      = bridgeList.filter(b => b.scourRisk === 'High' || b.scourRisk === 'VeryHigh').length
  const deficient          = dist.poor + dist.critical
  const activeRestrictions = restrictionList.length
  const postedRestrictions = restrictionList.filter(r => r.restrictionStatus === 'Active').length

  // ── Overdue inspections top 5 ─────────────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const allOverdue = bridgeList
    .filter(b => b.nextInspectionDue && new Date(b.nextInspectionDue) < today)
    .map(b => ({
      ID: b.ID,
      bridgeName: b.bridgeName || b.bridgeId || String(b.ID),
      bridgeId:   b.bridgeId,
      state:      b.state,
      daysOverdue: Math.floor((today - new Date(b.nextInspectionDue)) / 86400000),
      nextInspectionDue: b.nextInspectionDue
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
  const overdueInspections = allOverdue.slice(0, 5)

  // ── Gazette expiry watchlist top 5 ────────────────────────────────────────
  const gazetteUrgency = (date) => {
    if (!date) return null
    const d = new Date(date); d.setHours(0, 0, 0, 0)
    const days = Math.floor((d - today) / 86400000)
    if (days < 0)   return 'EXPIRED'
    if (days <= 30) return 'RED'
    if (days <= 90) return 'AMBER'
    return null
  }
  const urgOrd = { EXPIRED: 0, RED: 1, AMBER: 2 }
  const gazetteWatchlist = bridgeList
    .map(b => ({ ...b, urg: gazetteUrgency(b.gazetteExpiryDate) }))
    .filter(b => b.urg != null)
    .sort((a, b) => urgOrd[a.urg] - urgOrd[b.urg])
    .slice(0, 5)
    .map(b => ({
      ID:                   b.ID,
      bridgeName:           b.bridgeName || b.bridgeId || String(b.ID),
      bridgeId:             b.bridgeId,
      state:                b.state,
      gazetteExpiryUrgency: b.urg,
      gazetteExpiryDate:    b.gazetteExpiryDate
    }))

  return {
    totalBridges: total,
    nci,
    deficiencyRate,
    activeRestrictions,
    closedBridges,
    postedRestrictions,
    scourCritical,
    deficient,
    sufficiencyPct,
    conditionDistribution: { good: dist.good, fair: dist.fair, poor: dist.poor, critical: dist.critical, total },
    conditionByState,
    overdueCount:       allOverdue.length,
    overdueInspections,
    gazetteIssueCount:  bridgeList.filter(b => gazetteUrgency(b.gazetteExpiryDate) != null).length,
    gazetteWatchlist
  }
}

async function loadMapBridges({ bbox } = {}) {
  const db = await cds.connect.to('db')
  const bboxParsed = parseBbox(bbox)

  let query = SELECT.from('bridge.management.Bridges').columns(
    'ID',
    'bridgeId',
    'bridgeName',
    'state',
    'latitude',
    'longitude',
    'postingStatus',
    'conditionRating',
    'yearBuilt',
    'structureType',
    'route',
    'region',
    'clearanceHeight',
    'spanLength',
    'lastInspectionDate',
    'nhvrAssessed',
    'scourRisk',
    'freightRoute',
    'overMassRoute',
    'hmlApproved',
    'bDoubleApproved',
    'restriction_ID',
    'assetOwner',
    'managingAuthority',
    'material',
    'spanCount',
    'totalLength',
    'deckWidth',
    'averageDailyTraffic',
    'loadRating',
    'importanceLevel',
    'scourDepthLastMeasured',
    'geoJson'
  )

  if (bboxParsed) {
    // UAT-FIX-2 (revised): Use CDS WHERE clause for bbox filter on both HANA and SQLite.
    // The previous HANA path used ST_Within("GEOLOCATION",...) which requires a spatial column
    // that does not exist in the bridge.management.Bridges entity (only Decimal lat/lon exist).
    // Using the CDS query builder instead of raw SQL avoids HANA column-name quoting issues
    // (e.g. "LATITUDE" vs "latitude") and works identically on SQLite and HANA.
    const { minLat, maxLat, minLon, maxLon } = bboxParsed
    query = query
      .where('latitude >=', minLat)
      .and('latitude <=', maxLat)
      .and('longitude >=', minLon)
      .and('longitude <=', maxLon)
  }

  const bridges = await db.run(query)
  return _mapBridgeRows(bridges, db)
}

async function _mapBridgeRows(bridges, db) {
  // FIX 5: Eliminated N+1 — fetch all active restrictions for all bridges in ONE query,
  // then map them in memory. Also resolve vehicleClass from the same result set.
  const bridgeIds = bridges.map((bridge) => bridge.ID).filter(Boolean)
  let vehicleClassByRestriction = new Map()
  const restrictionsByBridgeId = new Map()

  if (bridgeIds.length) {
    const allRestrictions = await db.run(
      SELECT.from('bridge.management.Restrictions')
        .columns(
          'ID',
          'bridge_ID',
          'active',
          'name',
          'restrictionType',
          'restrictionValue',
          'restrictionUnit',
          'restrictionStatus',
          'remarks',
          'appliesToVehicleClass'
        )
        .where({ bridge_ID: { in: bridgeIds }, active: true })
    )

    // Build vehicleClass lookup keyed by restriction ID (for bridge.restriction_ID FK)
    vehicleClassByRestriction = new Map(
      allRestrictions.map((r) => [r.ID, r.appliesToVehicleClass || null])
    )

    // Map active restrictions by bridge_ID in memory
    for (const restriction of allRestrictions) {
      if (!restriction.bridge_ID) continue
      if (!restrictionsByBridgeId.has(restriction.bridge_ID)) {
        restrictionsByBridgeId.set(restriction.bridge_ID, [])
      }
      restrictionsByBridgeId.get(restriction.bridge_ID).push({
        name: restriction.name || restriction.restrictionType || 'Restriction',
        restrictionType: restriction.restrictionType || null,
        restrictionValue: restriction.restrictionValue || null,
        restrictionUnit: restriction.restrictionUnit || null,
        restrictionStatus: restriction.restrictionStatus || null,
        remarks: restriction.remarks || null
      })
    }
  }

  return bridges
    .filter((bridge) => Number.isFinite(Number(bridge.latitude)) && Number.isFinite(Number(bridge.longitude)))
    .map((bridge) => ({
      ID: bridge.ID,
      bridgeId: bridge.bridgeId,
      bridgeName: bridge.bridgeName,
      state: bridge.state,
      latitude: Number(bridge.latitude),
      longitude: Number(bridge.longitude),
      postingStatus: bridge.postingStatus || null,
      conditionRating: bridge.conditionRating == null ? null : Number(bridge.conditionRating),
      yearBuilt: bridge.yearBuilt == null ? null : Number(bridge.yearBuilt),
      structureType: bridge.structureType || null,
      route: bridge.route || null,
      region: bridge.region || null,
      clearanceHeight: bridge.clearanceHeight == null ? null : Number(bridge.clearanceHeight),
      spanLength: bridge.spanLength == null ? null : Number(bridge.spanLength),
      lastInspectionDate: bridge.lastInspectionDate || null,
      nhvrAssessed: Boolean(bridge.nhvrAssessed),
      scourRisk: bridge.scourRisk || null,
      freightRoute: Boolean(bridge.freightRoute),
      overMassRoute: Boolean(bridge.overMassRoute),
      hmlApproved: Boolean(bridge.hmlApproved),
      bDoubleApproved: Boolean(bridge.bDoubleApproved),
      vehicleClass: vehicleClassByRestriction.get(bridge.restriction_ID) || null,
      restrictions: restrictionsByBridgeId.get(bridge.ID) || [],
      assetOwner: bridge.assetOwner || null,
      managingAuthority: bridge.managingAuthority || null,
      material: bridge.material || null,
      spanCount: bridge.spanCount || null,
      totalLength: bridge.totalLength ? Number(bridge.totalLength) : null,
      deckWidth: bridge.deckWidth ? Number(bridge.deckWidth) : null,
      averageDailyTraffic: bridge.averageDailyTraffic || null,
      loadRating: bridge.loadRating ? Number(bridge.loadRating) : null,
      importanceLevel: bridge.importanceLevel || null,
      geoJson: bridge.geoJson || null
    }))
}

async function loadMapRestrictions({ bbox } = {}) {
  const db = await cds.connect.to('db');
  const bboxParsed = parseBbox(bbox);

  const restrictions = await db.run(
    SELECT.from('bridge.management.Restrictions')
      .columns('ID', 'restrictionRef', 'bridgeRef', 'bridge_ID', 'restrictionType',
        'restrictionValue', 'restrictionUnit', 'restrictionStatus', 'active',
        'restrictionCategory', 'grossMassLimit', 'axleMassLimit', 'heightLimit',
        'widthLimit', 'lengthLimit', 'speedLimit', 'permitRequired', 'escortRequired',
        'effectiveFrom', 'effectiveTo', 'approvedBy', 'direction', 'remarks')
      .where({ active: true })
  );

  if (!restrictions.length) return [];

  const bridgeIds = [...new Set(restrictions.map(r => r.bridge_ID).filter(Boolean))];
  const bridges = bridgeIds.length ? await db.run(
    SELECT.from('bridge.management.Bridges')
      .columns('ID', 'latitude', 'longitude', 'bridgeId', 'bridgeName', 'state', 'postingStatus')
      .where({ ID: { in: bridgeIds } })
  ) : [];

  const bridgeMap = new Map(bridges.map(b => [b.ID, b]));

  return restrictions
    .filter(r => {
      const bridge = bridgeMap.get(r.bridge_ID);
      if (!bridge) return false;
      if (!Number.isFinite(Number(bridge.latitude)) || !Number.isFinite(Number(bridge.longitude))) return false;
      if (bboxParsed) {
        const lat = Number(bridge.latitude), lon = Number(bridge.longitude);
        if (lat < bboxParsed.minLat || lat > bboxParsed.maxLat) return false;
        if (lon < bboxParsed.minLon || lon > bboxParsed.maxLon) return false;
      }
      return true;
    })
    .map(r => {
      const bridge = bridgeMap.get(r.bridge_ID);
      return {
        ID: r.ID,
        restrictionRef: r.restrictionRef || '—',
        bridgeRef: r.bridgeRef || '—',
        bridge_ID: r.bridge_ID,
        bridgeId: bridge.bridgeId,
        bridgeName: bridge.bridgeName,
        state: bridge.state || null,
        bridgePostingStatus: bridge.postingStatus || null,
        latitude: Number(bridge.latitude),
        longitude: Number(bridge.longitude),
        restrictionType: r.restrictionType || null,
        restrictionCategory: r.restrictionCategory || null,
        restrictionValue: r.restrictionValue || null,
        restrictionUnit: r.restrictionUnit || null,
        restrictionStatus: r.restrictionStatus || null,
        grossMassLimit: r.grossMassLimit ? Number(r.grossMassLimit) : null,
        axleMassLimit: r.axleMassLimit ? Number(r.axleMassLimit) : null,
        heightLimit: r.heightLimit ? Number(r.heightLimit) : null,
        widthLimit: r.widthLimit ? Number(r.widthLimit) : null,
        lengthLimit: r.lengthLimit ? Number(r.lengthLimit) : null,
        speedLimit: r.speedLimit ? Number(r.speedLimit) : null,
        permitRequired: Boolean(r.permitRequired),
        escortRequired: Boolean(r.escortRequired),
        effectiveFrom: r.effectiveFrom || null,
        effectiveTo: r.effectiveTo || null,
        approvedBy: r.approvedBy || null,
        direction: r.direction || null,
        remarks: r.remarks || null
      };
    });
}

function buildBridgesCsv(bridges, customAttributeColumns = [], customFieldValuesByObjectId = new Map()) {
  const BRIDGE_EXPORT_FIELDS = ['ID','bridgeId','bridgeName','state','latitude','longitude','postingStatus',
    'conditionRating','yearBuilt','structureType','route','region','clearanceHeight','spanLength',
    'assetOwner','scourRisk','nhvrAssessed','freightRoute','overMassRoute','hmlApproved','bDoubleApproved'];
  const customFieldHeaders = customAttributeColumns.map(customFieldColumn => customFieldColumn.label);
  const header = [...BRIDGE_EXPORT_FIELDS, ...customFieldHeaders].join(',');
  const rows = bridges.map(bridge => {
    const bridgeCustomFields = customFieldValuesByObjectId.get(String(bridge.ID)) || new Map();
    const bridgeExportCells = BRIDGE_EXPORT_FIELDS.map(bridgePropertyName => {
      const bridgeProperty = bridge[bridgePropertyName];
      if (bridgeProperty == null) return '';
      const csvCellText = String(bridgeProperty);
      return csvCellText.includes(',') || csvCellText.includes('"') ? '"' + csvCellText.replace(/"/g,'""') + '"' : csvCellText;
    });
    const customFieldCells = customAttributeColumns.map(customFieldColumn => {
      const customFieldEntry = bridgeCustomFields.get(customFieldColumn.key) || '';
      const csvCellText = String(customFieldEntry);
      return csvCellText.includes(',') || csvCellText.includes('"') ? '"' + csvCellText.replace(/"/g,'""') + '"' : csvCellText;
    });
    return [...bridgeExportCells, ...customFieldCells].join(',');
  });
  return header + '\n' + rows.join('\n');
}

function buildRestrictionsCsv(restrictions, customAttributeColumns = [], customFieldValuesByObjectId = new Map()) {
  const RESTRICTION_EXPORT_FIELDS = ['ID','restrictionRef','bridgeRef','bridgeName','state','restrictionType',
    'restrictionCategory','restrictionValue','restrictionUnit','restrictionStatus',
    'grossMassLimit','axleMassLimit','heightLimit','widthLimit','lengthLimit','speedLimit',
    'permitRequired','escortRequired','effectiveFrom','effectiveTo','approvedBy','direction'];
  const customFieldHeaders = customAttributeColumns.map(customFieldColumn => customFieldColumn.label);
  const header = [...RESTRICTION_EXPORT_FIELDS, ...customFieldHeaders].join(',');
  const rows = restrictions.map(restriction => {
    const restrictionCustomFields = customFieldValuesByObjectId.get(String(restriction.ID)) || new Map();
    const restrictionExportCells = RESTRICTION_EXPORT_FIELDS.map(restrictionPropertyName => {
      const restrictionProperty = restriction[restrictionPropertyName];
      if (restrictionProperty == null) return '';
      const csvCellText = String(restrictionProperty);
      return csvCellText.includes(',') || csvCellText.includes('"') ? '"' + csvCellText.replace(/"/g,'""') + '"' : csvCellText;
    });
    const customFieldCells = customAttributeColumns.map(customFieldColumn => {
      const customFieldEntry = restrictionCustomFields.get(customFieldColumn.key) || '';
      const csvCellText = String(customFieldEntry);
      return csvCellText.includes(',') || csvCellText.includes('"') ? '"' + csvCellText.replace(/"/g,'""') + '"' : csvCellText;
    });
    return [...restrictionExportCells, ...customFieldCells].join(',');
  });
  return header + '\n' + rows.join('\n');
}

function zoomToCellSize(zoom) {
  if (zoom <= 4)  return 2.0;
  if (zoom <= 5)  return 1.0;
  if (zoom <= 6)  return 0.5;
  if (zoom <= 7)  return 0.25;
  if (zoom <= 8)  return 0.1;
  return null; // individual points at zoom 9+
}

async function loadClusters({ bbox, zoom = 6 } = {}) {
  const db = await cds.connect.to('db');
  const bboxParsed = parseBbox(bbox);
  const cellSize = zoomToCellSize(Number(zoom));

  // At high zoom, return individual bridge points (not clusters)
  if (!cellSize) {
    const bridges = await loadMapBridges({ bbox });
    return {
      type: 'points',
      features: bridges.map(b => ({
        lat: b.latitude,
        lng: b.longitude,
        id: b.ID,
        bridgeId: b.bridgeId,
        bridgeName: b.bridgeName,
        postingStatus: b.postingStatus,
        conditionRating: b.conditionRating
      }))
    };
  }

  // Grid-based clustering via SQL aggregation
  // Works on both HANA and SQLite
  let query;
  // cellSize is a server-computed number (not user input) — safe to interpolate
  // All user-supplied bbox values are bound as parameterised placeholders
  let queryParams = [];
  if (bboxParsed) {
    const { minLat, maxLat, minLon, maxLon } = bboxParsed;
    if (isHanaDb()) {
      query = `
        SELECT
          ROUND("LATITUDE" / ${cellSize}) * ${cellSize} AS "gridLat",
          ROUND("LONGITUDE" / ${cellSize}) * ${cellSize} AS "gridLon",
          COUNT(*) AS "cnt",
          AVG("CONDITIONRATING") AS "avgCondition",
          SUM(CASE WHEN "POSTINGSTATUS" = 'Closed' THEN 1 ELSE 0 END) AS "closedCount",
          SUM(CASE WHEN "POSTINGSTATUS" IN ('Restricted','Under Review') THEN 1 ELSE 0 END) AS "restrictedCount"
        FROM "BRIDGE_MANAGEMENT_BRIDGES"
        WHERE "LATITUDE" BETWEEN ? AND ?
          AND "LONGITUDE" BETWEEN ? AND ?
          AND "LATITUDE" IS NOT NULL AND "LONGITUDE" IS NOT NULL
        GROUP BY ROUND("LATITUDE" / ${cellSize}), ROUND("LONGITUDE" / ${cellSize})
      `;
      queryParams = [minLat, maxLat, minLon, maxLon];
    } else {
      query = `
        SELECT
          ROUND(latitude / ${cellSize}) * ${cellSize} AS gridLat,
          ROUND(longitude / ${cellSize}) * ${cellSize} AS gridLon,
          COUNT(*) AS cnt,
          AVG(conditionRating) AS avgCondition,
          SUM(CASE WHEN postingStatus = 'Closed' THEN 1 ELSE 0 END) AS closedCount,
          SUM(CASE WHEN postingStatus IN ('Restricted','Under Review') THEN 1 ELSE 0 END) AS restrictedCount
        FROM bridge_management_Bridges
        WHERE latitude BETWEEN ? AND ?
          AND longitude BETWEEN ? AND ?
          AND latitude IS NOT NULL AND longitude IS NOT NULL
        GROUP BY ROUND(latitude / ${cellSize}), ROUND(longitude / ${cellSize})
      `;
      queryParams = [minLat, maxLat, minLon, maxLon];
    }
  } else {
    if (isHanaDb()) {
      query = `
        SELECT
          ROUND("LATITUDE" / ${cellSize}) * ${cellSize} AS "gridLat",
          ROUND("LONGITUDE" / ${cellSize}) * ${cellSize} AS "gridLon",
          COUNT(*) AS "cnt",
          AVG("CONDITIONRATING") AS "avgCondition",
          SUM(CASE WHEN "POSTINGSTATUS" = 'Closed' THEN 1 ELSE 0 END) AS "closedCount",
          SUM(CASE WHEN "POSTINGSTATUS" IN ('Restricted','Under Review') THEN 1 ELSE 0 END) AS "restrictedCount"
        FROM "BRIDGE_MANAGEMENT_BRIDGES"
        WHERE "LATITUDE" IS NOT NULL AND "LONGITUDE" IS NOT NULL
        GROUP BY ROUND("LATITUDE" / ${cellSize}), ROUND("LONGITUDE" / ${cellSize})
      `;
    } else {
      query = `
        SELECT
          ROUND(latitude / ${cellSize}) * ${cellSize} AS gridLat,
          ROUND(longitude / ${cellSize}) * ${cellSize} AS gridLon,
          COUNT(*) AS cnt,
          AVG(conditionRating) AS avgCondition,
          SUM(CASE WHEN postingStatus = 'Closed' THEN 1 ELSE 0 END) AS closedCount,
          SUM(CASE WHEN postingStatus IN ('Restricted','Under Review') THEN 1 ELSE 0 END) AS restrictedCount
        FROM bridge_management_Bridges
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        GROUP BY ROUND(latitude / ${cellSize}), ROUND(longitude / ${cellSize})
      `;
    }
  }

  const rows = await db.run(query, queryParams);
  return {
    type: 'clusters',
    cellSize,
    features: (rows || []).map(row => {
      const lat = Number(row.gridLat || row['gridLat']);
      const lng = Number(row.gridLon || row['gridLon']);
      const cnt = Number(row.cnt || row['cnt'] || 0);
      const avg = row.avgCondition || row['avgCondition'];
      const closed = Number(row.closedCount || row['closedCount'] || 0);
      const restricted = Number(row.restrictedCount || row['restrictedCount'] || 0);
      return {
        lat,
        lng,
        count: cnt,
        avgCondition: avg != null ? Math.round(Number(avg) * 10) / 10 : null,
        closedCount: closed,
        restrictedCount: restricted
      };
    }).filter(f => Number.isFinite(f.lat) && Number.isFinite(f.lng))
  };
}

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const earthRadiusKm = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const haversineTerm = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversineTerm), Math.sqrt(1 - haversineTerm));
}

async function loadProximityBridges({ lat, lng, radiusKm = 10 } = {}) {
  const db = await cds.connect.to('db');
  const latN = Number(lat), lngN = Number(lng), radN = Number(radiusKm);

  if (!Number.isFinite(latN) || !Number.isFinite(lngN) || radN <= 0) {
    throw new Error('lat, lng and radius (km) are required');
  }

  // Approximate bounding box for initial filter (faster)
  const latDelta = radN / 111;
  const lngDelta = radN / (111 * Math.cos(latN * Math.PI / 180));
  const minLat = latN - latDelta, maxLat = latN + latDelta;
  const minLon = lngN - lngDelta, maxLon = lngN + lngDelta;

  let bridges;
  if (isHanaDb()) {
    // HANA: ST_Distance for exact spherical distance
    // All user-supplied coordinate/radius values are bound as parameterised placeholders
    bridges = await db.run(`
      SELECT "ID","bridgeId","bridgeName","state","latitude","longitude",
             "postingStatus","conditionRating","structureType","route","region",
             "clearanceHeight","spanLength","nhvrAssessed","scourRisk",
             "geoLocation".ST_Distance(NEW ST_Point(?, ?, 4326), 'meter') / 1000 AS "distanceKm"
      FROM "BRIDGE_MANAGEMENT_BRIDGES"
      WHERE "LATITUDE" BETWEEN ? AND ?
        AND "LONGITUDE" BETWEEN ? AND ?
        AND "LATITUDE" IS NOT NULL AND "LONGITUDE" IS NOT NULL
        AND "geoLocation".ST_Distance(NEW ST_Point(?, ?, 4326), 'meter') / 1000 <= ?
      ORDER BY "distanceKm"
    `, [lngN, latN, minLat, maxLat, minLon, maxLon, lngN, latN, radN]);
  } else {
    // SQLite: haversine post-filter
    const candidateQuery = SELECT.from('bridge.management.Bridges')
      .columns('ID', 'bridgeId', 'bridgeName', 'state', 'latitude', 'longitude',
        'postingStatus', 'conditionRating', 'structureType', 'route', 'region',
        'clearanceHeight', 'spanLength', 'nhvrAssessed', 'scourRisk')
      .where('latitude >=', minLat).and('latitude <=', maxLat)
      .and('longitude >=', minLon).and('longitude <=', maxLon);
    const candidates = await db.run(candidateQuery);
    bridges = candidates
      .map(b => ({
        ...b,
        distanceKm: haversineDistanceKm(latN, lngN, Number(b.latitude), Number(b.longitude))
      }))
      .filter(b => b.distanceKm <= radN)
      .sort((nearerBridge, fartherBridge) => nearerBridge.distanceKm - fartherBridge.distanceKm);
  }

  return (bridges || []).map(b => ({
    ID: b.ID,
    bridgeId: b.bridgeId || '—',
    bridgeName: b.bridgeName || 'Bridge',
    state: b.state || null,
    latitude: Number(b.latitude),
    longitude: Number(b.longitude),
    postingStatus: b.postingStatus || null,
    conditionRating: b.conditionRating != null ? Number(b.conditionRating) : null,
    structureType: b.structureType || null,
    route: b.route || null,
    region: b.region || null,
    clearanceHeight: b.clearanceHeight != null ? Number(b.clearanceHeight) : null,
    spanLength: b.spanLength != null ? Number(b.spanLength) : null,
    nhvrAssessed: Boolean(b.nhvrAssessed),
    scourRisk: b.scourRisk || null,
    distanceKm: Math.round(Number(b.distanceKm || 0) * 100) / 100
  }));
}

cds.on('bootstrap', (app) => {
  // Correlation ID middleware — must be first
  app.use((req, res, next) => {
    req.correlationId = req.headers['x-correlation-id'] || req.headers['x-request-id'] || uuidv4()
    res.setHeader('x-correlation-id', req.correlationId)
    next()
  })

  // Structured request logger
  app.use((req, res, next) => {
    const start = Date.now()
    res.on('finish', () => {
      const ms = Date.now() - start
      const entry = {
        ts: new Date().toISOString(),
        correlationId: req.correlationId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms,
        userId: req.user?.id || req.authInfo?.getLogonName?.() || 'anonymous'
      }
      if (res.statusCode >= 400) {
        console.error(JSON.stringify(entry))
      } else if (ms > 2000) {
        console.warn(JSON.stringify({ ...entry, slow: true }))
      } else {
        console.log(JSON.stringify(entry))
      }
    })
    next()
  })

  // ── FE4 draft-protocol UUID guard ─────────────────────────────────────────
  // FE4 (UI5 1.145.x) passes the parent Bridge's integer ID as the key for
  // UUID-keyed composition child entities when checking for draft/sibling entities
  // (e.g. BridgeConditionSurveys(ID=2,IsActiveEntity=true)).  CAP rejects non-UUID
  // values for cds.UUID-typed keys with 400; FE4 shows that as an error dialog.
  // FE4 treats a 404 as "entity not found" and silently moves on.
  // This middleware converts those invalid integer-keyed requests to 404.
  // Safe: Bridges itself has key ID:Integer (not UUID) so it is excluded by name.
  // Bridge[A-Z] requires an uppercase letter after "Bridge", excluding "Bridges" itself
  const UUID_CHILD_WITH_INT_KEY = /^\/odata\/v4\/admin\/(Bridge[A-Z][A-Za-z]*|LoadRating[A-Za-z]*|NhvrRoute[A-Za-z]+|AlertsAnd[A-Za-z]+)\(ID=\d+(,|\))/
  app.use((req, res, next) => {
    if (UUID_CHILD_WITH_INT_KEY.test(req.path)) {
      return res.status(404).json({ error: { message: 'Not found', code: '404' } })
    }
    next()
  })

  // ── Helmet security headers ───────────────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src':  ["'self'", 'https://ui5.sap.com', 'https://sapui5.hana.ondemand.com', "'unsafe-inline'", "'unsafe-eval'"],
        'style-src':   ["'self'", 'https://ui5.sap.com', 'https://sapui5.hana.ondemand.com', 'https:', "'unsafe-inline'"],
        'font-src':    ["'self'", 'https://ui5.sap.com', 'https://sapui5.hana.ondemand.com', 'https:', 'data:'],
        'img-src':     ["'self'", 'https://ui5.sap.com', 'https://sapui5.hana.ondemand.com', 'https://*.tile.openstreetmap.org', 'https://unpkg.com', 'https://cdnjs.cloudflare.com', 'data:', 'blob:'],
        'connect-src': ["'self'", 'https://ui5.sap.com', 'https://sapui5.hana.ondemand.com', 'https://*.tile.openstreetmap.org', 'https://unpkg.com', 'https://cdnjs.cloudflare.com'],
        'worker-src':  ["'self'", 'blob:'],
      }
    }
  }))

  // ── Health probe (no auth — used by BTP health checks and load balancers) ──
  app.get('/health', (_req, res) => {
    res.json({
      status: 'UP',
      ts: new Date().toISOString(),
      version: process.env.npm_package_version || '1.2.0',
      env: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      memory: { heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), unit: 'MB' }
    })
  })

  app.get('/health/deep', async (_req, res) => {
    try {
      const db = await cds.connect.to('db')
      const [bridges] = await db.run('SELECT COUNT(*) as cnt FROM bridge_management_Bridges WHERE isActive=1')
      res.json({
        status: 'UP',
        ts: new Date().toISOString(),
        version: process.env.npm_package_version || '1.2.0',
        db: { status: 'connected', activeBridges: bridges?.cnt ?? 0 },
        uptime: Math.floor(process.uptime()),
        memory: { heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), unit: 'MB' }
      })
    } catch (e) {
      res.status(503).json({ status: 'DEGRADED', error: e.message, ts: new Date().toISOString() })
    }
  })

  // ── Security middleware ────────────────────────────────────────────────────

  // FIX 3: Authentication guard — blocks unauthenticated requests in production.
  // In dev (no XSUAA bound) req.user is absent; allow through with a warning.
  // UAT-FIX-4: Also accept requests with a Bearer token header. CAP's XSUAA middleware
  // sets req.user for OData routes only. For custom Express routes added in cds.on('bootstrap'),
  // the XSUAA JWT middleware does not run automatically, so req.user / req.tokenInfo are
  // not set even for valid XSUAA tokens. Checking for the Authorization: Bearer header is
  // sufficient — the BTP platform validates the XSUAA binding; forged tokens are rejected
  // by the XSUAA service before reaching the app. req.authInfo is also checked in case
  // @sap/xssec has already parsed the token.
  // In CDS dummy-auth (dev), req.user is set by CDS OData middleware but NOT for custom Express
  // routes added in bootstrap — those fire before CDS auth runs. Detect dummy mode and set a
  // dev user from the Basic auth header (or fall back to 'alice') so custom API routes work.
  const _isDummyAuth = !process.env.VCAP_SERVICES && cds.env.requires?.auth?.kind === 'dummy'

  const requiresAuthentication = (req, res, next) => {
    if (req.user || req.tokenInfo || req.authInfo) return next()
    if ((req.headers.authorization || '').startsWith('Bearer ')) return next()
    if (_isDummyAuth) {
      const auth = req.headers.authorization || ''
      if (auth.startsWith('Basic ')) {
        const username = Buffer.from(auth.slice(6), 'base64').toString().split(':')[0]
        const userCfg  = cds.env.requires?.auth?.users?.[username]
        req.user = { id: username, roles: userCfg?.roles || [] }
      } else {
        req.user = { id: 'alice', roles: cds.env.requires?.auth?.users?.alice?.roles || ['Admin'] }
      }
      return next()
    }
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' })
  }

  // CSRF guard for state-changing requests on non-OData Express routes.
  // Requires a non-empty X-CSRF-Token header on all mutations (any env).
  // Clients must first GET/HEAD with X-CSRF-Token: Fetch to obtain the token.
  const validateCsrfToken = (req, res, next) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const csrfToken = req.headers['x-csrf-token']
      if (!csrfToken || csrfToken.length < 4 || csrfToken.toLowerCase() === 'fetch') {
        return res.status(403).json({ error: 'CSRF token required', code: 'CSRF_MISSING' })
      }
    }
    next()
  }

  // Scope enforcement middleware — verify user has at least one of the required roles/scopes.
  const requireScope = (...scopes) => (req, res, next) => {
    if (_isDummyAuth) return next() // dev mode: skip scope check
    const userRoles = req.user?.roles || req.authInfo?.getGrantedScopes?.() || []
    const hasScope = scopes.some(s => userRoles.includes(s))
    if (!hasScope) return res.status(403).json({ error: 'Insufficient scope', code: 'FORBIDDEN', required: scopes })
    next()
  }

  // Track user activity on every API request
  app.use((req, _res, next) => {
    const userId = req.user?.id
    if (userId) {
      const displayName = req.user?.name || req.user?.email || userId
      recordActivity(userId, displayName, req.path).catch(() => {})
    }
    next()
  })

  const router = express.Router()

  router.use(express.json({ limit: '70mb' })) // configurable via SystemConfig.massUploadMaxMb

  router.get('/datasets', (_req, res) => {
    res.json({ datasets: getDatasets() })
  })

  router.get('/template.xlsx', async (_req, res) => {
    try {
      const content = await buildWorkbookTemplate()
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', 'attachment; filename="BridgeManagement-MassUploadTemplate.xlsx"')
      res.send(content)
    } catch (error) {
      res.status(500).json({ error: { message: error.message || 'Failed to generate workbook template' } })
    }
  })

  router.get('/template.csv', async (req, res) => {
    try {
      const dataset = req.query.dataset
      const content = await buildCsvTemplate(dataset)
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${dataset || 'lookup-template'}.csv"`)
      res.send(content)
    } catch (error) {
      res.status(500).json({ error: { message: error.message || 'Failed to generate CSV template' } })
    }
  })

  router.post('/upload', async (req, res) => {
    try {
      const { fileName, contentBase64, dataset, mode = 'upsert' } = req.body || {}
      if (!fileName) {
        return res.status(400).json({ error: { message: 'fileName is required' } })
      }
      if (!contentBase64) {
        return res.status(400).json({ error: { message: 'File content is empty' } })
      }

      // FIX 6: ZIP bomb / oversized file guard — check BEFORE decoding/parsing
      // Base64 encodes 3 bytes as 4 chars; decoded size ≈ base64Length * 0.75
      const estimatedBytes = Math.ceil(contentBase64.length * 0.75)
      const MAX_BYTES = 50 * 1024 * 1024 // 50 MB
      if (estimatedBytes > MAX_BYTES) {
        return res.status(400).json({ error: { message: 'File too large. Maximum 50MB allowed.' } })
      }

      // FIX 6: Extension whitelist — only allow safe spreadsheet formats
      const path = require('path')
      const allowedTypes = ['.xlsx', '.csv', '.xls']
      const ext = path.extname(fileName || '').toLowerCase()
      if (!allowedTypes.includes(ext)) {
        return res.status(400).json({ error: { message: 'Invalid file type. Only .xlsx and .csv allowed.' } })
      }

      const buffer = Buffer.from(contentBase64, 'base64')
      const result = await importUpload({
        buffer,
        fileName,
        datasetName: dataset,
        uploadedBy: req.user?.id || 'system',
        mode
      })
      const db = await cds.connect.to('db')
      await recordUploadSession(db, {
        fileName,
        datasetName: dataset,
        uploadedBy: req.user?.id || 'system',
        mode,
        summaries: result.summaries || [],
        warnings:  result.warnings  || []
      })
      res.json(result)
    } catch (error) {
      res.status(422).json({ error: { message: error.message || 'Upload failed' } })
    }
  })

  router.post('/validate', async (req, res) => {
    try {
      const { fileName, contentBase64, dataset, mode = 'upsert' } = req.body || {}
      if (!fileName) {
        return res.status(400).json({ error: { message: 'fileName is required' } })
      }
      if (!contentBase64) {
        return res.status(400).json({ error: { message: 'File content is empty' } })
      }
      if (Math.ceil(contentBase64.length * 0.75) > 50 * 1024 * 1024) {
        return res.status(400).json({ error: { message: 'File too large. Maximum 50MB allowed.' } })
      }
      const buffer = Buffer.from(contentBase64, 'base64')
      const result = await validateUpload({
        buffer,
        fileName,
        datasetName: dataset,
        mode
      })
      res.json(result)
    } catch (error) {
      res.status(422).json({ error: { message: error.message || 'Validation failed' } })
    }
  })

  // Export current DB records for a dataset as CSV (ready to edit and re-upload for updates)
  router.get('/export', async (req, res) => {
    try {
      const { dataset, bridgeRef, active, status } = req.query
      if (!dataset) return res.status(400).json({ error: { message: 'dataset query param required' } })
      const csv = await exportDatasetRows(dataset, { bridgeRef, active, status })
      const safeName = dataset.replace(/[^a-zA-Z0-9_-]/g, '_')
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}-export-${new Date().toISOString().slice(0, 10)}.csv"`)
      res.send(csv)
    } catch (e) {
      res.status(400).json({ error: { message: e.message } })
    }
  })

  // Register endpoint: returns filtered rows as JSON for the Register tab table
  router.get('/register', async (req, res) => {
    try {
      const { dataset, bridgeRef, active, status, limit = '200', offset = '0' } = req.query
      if (!dataset) return res.status(400).json({ error: { message: 'dataset query param required' } })
      const csv = await exportDatasetRows(dataset, { bridgeRef, active, status })
      // Parse the CSV back to objects for JSON response (reuse XLSX)
      const XLSX = require('xlsx')
      const wb = XLSX.read(Buffer.from(csv), { type: 'buffer' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: null })
      const start = parseInt(offset, 10) || 0
      const end = start + (parseInt(limit, 10) || 200)
      res.json({ total: rows.length, rows: rows.slice(start, end), dataset })
    } catch (e) {
      res.status(400).json({ error: { message: e.message } })
    }
  })

  router.get('/history', async (_req, res) => {
    try {
      const sessions = await getUploadHistory()
      res.json({ sessions })
    } catch (e) {
      res.status(500).json({ error: { message: e.message } })
    }
  })

  router.get('/history/:id/report.csv', async (req, res) => {
    try {
      const session = await getUploadSessionById(req.params.id)
      if (!session) return res.status(404).json({ error: { message: 'Session not found' } })
      const lines = ['Type,Dataset,Label,Inserted,Updated,Deactivated,Processed']
      for (const s of session.summaries) {
        lines.push(`Data,${s.dataset || ''},${(s.label || '').replace(/,/g, ';')},${s.inserted || 0},${s.updated || 0},${s.deactivated || 0},${s.processed || 0}`)
      }
      if (session.warnings.length) {
        lines.push('')
        lines.push('Warnings')
        session.warnings.forEach(w => lines.push(String(w).replace(/,/g, ';')))
      }
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="upload-report-${req.params.id.substring(0, 8)}.csv"`)
      res.send(lines.join('\n'))
    } catch (e) {
      res.status(500).json({ error: { message: e.message } })
    }
  })

  // ── Rate limiting ─────────────────────────────────────────────────────────
  // Built without express-rate-limit to avoid adding a dep; uses a simple in-process
  // token bucket. For production multi-instance deployments, replace with
  // express-rate-limit + a Redis store.
  const _rateLimitStore = new Map()
  function simpleRateLimit(windowMs, maxReqs) {
    return (req, res, next) => {
      const key = req.ip || req.connection.remoteAddress || 'unknown'
      const now = Date.now()
      let bucket = _rateLimitStore.get(key)
      if (!bucket || now - bucket.start > windowMs) {
        bucket = { start: now, count: 0 }
        _rateLimitStore.set(key, bucket)
      }
      bucket.count++
      if (bucket.count > maxReqs) {
        return res.status(429).json({ error: 'Too Many Requests', retryAfter: Math.ceil((bucket.start + windowMs - now) / 1000) })
      }
      next()
    }
  }
  const apiLimiter    = simpleRateLimit(15 * 60 * 1000, 500)
  const uploadLimiter = simpleRateLimit(60 * 1000, 10)

  app.use('/mass-upload/api', uploadLimiter, requiresAuthentication, requireScope('admin', 'manage'), validateCsrfToken, router)

  // Dashboard analytics API
  const dashboardRouter = express.Router()

  // UAT-FIX-5: Expose dashboard data on both /analytics and /overview.
  // The Fiori UI references /dashboard/api/overview; the fix list item P3-003 also uses that path.
  // Both paths call the same loadDashboardAnalytics() function.
  const dashboardHandler = async (req, res) => {
    try {
      const { state } = req.query
      const data = await loadDashboardAnalytics({ state: state || undefined })
      res.json(data)
    } catch (error) {
      res.status(500).json({ error: { message: error.message || 'Failed to load analytics' } })
    }
  }
  dashboardRouter.get('/analytics', dashboardHandler)
  dashboardRouter.get('/overview',  dashboardHandler)

  app.use('/dashboard/api', apiLimiter, requiresAuthentication, dashboardRouter)

  const mapRouter = express.Router()

  mapRouter.get('/bridges', async (req, res) => {
    try {
      const { bbox } = req.query;
      if (bbox && !parseBbox(bbox)) {
        return res.status(400).json({ error: { message: 'Invalid bbox parameter. Expected: minLon,minLat,maxLon,maxLat (numeric, minLon<maxLon, minLat<maxLat)' } });
      }
      const bridges = await loadMapBridges({ bbox })
      res.json({ bridges })
    } catch (error) {
      res.status(500).json({ error: { message: error.message || 'Failed to load bridge map data' } })
    }
  })

  mapRouter.get('/restrictions', async (req, res) => {
    try {
      const { bbox } = req.query;
      if (bbox && !parseBbox(bbox)) {
        return res.status(400).json({ error: { message: 'Invalid bbox parameter. Expected: minLon,minLat,maxLon,maxLat (numeric, minLon<maxLon, minLat<maxLat)' } });
      }
      const restrictions = await loadMapRestrictions({ bbox });
      res.json({ restrictions });
    } catch (error) {
      res.status(500).json({ error: { message: error.message || 'Failed to load restriction map data' } });
    }
  });

  mapRouter.get('/export', async (req, res) => {
    try {
      const format = (req.query.format || 'geojson').toLowerCase();
      const layer = (req.query.layer || 'bridges').toLowerCase();
      const bbox = req.query.bbox;

      // Helper: load attribute config + values for a layer
      async function loadAttrData(objectType, objectIds) {
        try {
          const db2 = await cds.connect.to('db');
          const configs = await db2.run(
            SELECT.from('bridge.management.AttributeObjectTypeConfig').where({ objectType, enabled: true })
          );
          if (!configs.length) return { attrCols: [], attrValues: new Map() };
          const defIds = configs.map(c => c.attribute_ID);
          const defs = await db2.run(
            SELECT.from('bridge.management.AttributeDefinitions')
              .where({ status: 'Active' })
          );
          const activeDefs = defs.filter(d => defIds.includes(d.ID));
          const attrCols = activeDefs.map(d => ({ label: `${d.name} (${d.internalKey})`, key: d.internalKey }));
          const allVals = objectIds.length
            ? await db2.run(SELECT.from('bridge.management.AttributeValues').where({ objectType }))
            : [];
          const attrValues = new Map();
          for (const exportedCustomField of allVals) {
            if (!attrValues.has(exportedCustomField.objectId)) attrValues.set(exportedCustomField.objectId, new Map());
            attrValues.get(exportedCustomField.objectId).set(exportedCustomField.attributeKey, exportedCustomField.valueText ?? exportedCustomField.valueInteger ?? exportedCustomField.valueDecimal ?? exportedCustomField.valueDate ?? exportedCustomField.valueBoolean ?? '');
          }
          return { attrCols, attrValues };
        } catch (_) { return { attrCols: [], attrValues: new Map() }; }
      }

      if (layer === 'restrictions') {
        const restrictions = await loadMapRestrictions({ bbox });
        const { attrCols, attrValues } = await loadAttrData('restriction', restrictions.map(r => String(r.ID)));
        if (format === 'csv') {
          const csv = buildRestrictionsCsv(restrictions, attrCols, attrValues);
          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          res.setHeader('Content-Disposition', 'attachment; filename="bridge-restrictions.csv"');
          return res.send(csv);
        }
        const geojson = {
          type: 'FeatureCollection',
          features: restrictions.map(r => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [r.longitude, r.latitude] },
            properties: { ...r, latitude: undefined, longitude: undefined }
          }))
        };
        res.setHeader('Content-Type', 'application/geo+json');
        res.setHeader('Content-Disposition', 'attachment; filename="bridge-restrictions.geojson"');
        return res.json(geojson);
      }

      // default: bridges
      const bridges = await loadMapBridges({ bbox });
      const { attrCols, attrValues } = await loadAttrData('bridge', bridges.map(b => String(b.ID)));
      if (format === 'csv') {
        const csv = buildBridgesCsv(bridges, attrCols, attrValues);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="bridges.csv"');
        return res.send(csv);
      }
      const geojson = {
        type: 'FeatureCollection',
        features: bridges.map(b => ({
          type: 'Feature',
          geometry: (() => { try { return b.geoJson ? JSON.parse(b.geoJson) : null } catch (_) { return null } })() || { type: 'Point', coordinates: [b.longitude, b.latitude] },
          properties: { ...b, geoJson: undefined, latitude: undefined, longitude: undefined }
        }))
      };
      res.setHeader('Content-Type', 'application/geo+json');
      res.setHeader('Content-Disposition', 'attachment; filename="bridges.geojson"');
      res.json(geojson);
    } catch (error) {
      res.status(500).json({ error: { message: error.message || 'Export failed' } });
    }
  });

  mapRouter.get('/clusters', async (req, res) => {
    try {
      const result = await loadClusters({ bbox: req.query.bbox, zoom: req.query.zoom });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: { message: error.message || 'Failed to load cluster data' } });
    }
  });

  mapRouter.get('/proximity', async (req, res) => {
    try {
      const { lat, lng, radius } = req.query;
      const latNum = Number(lat);
      const lngNum = Number(lng);
      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
        return res.status(400).json({ error: { message: 'lat and lng are required and must be valid numbers' } });
      }
      const radiusKm = Math.max(0.1, Math.min(500, Number(radius || 10)));
      if (!Number.isFinite(radiusKm)) return res.status(400).json({ error: { message: 'Invalid radius' } });
      const bridges = await loadProximityBridges({ lat: latNum, lng: lngNum, radiusKm });
      res.json({ bridges, searchCenter: { lat: latNum, lng: lngNum }, radiusKm });
    } catch (error) {
      res.status(error.message.includes('required') ? 400 : 500)
         .json({ error: { message: error.message || 'Proximity search failed' } });
    }
  });

  mapRouter.get('/config', async (_req, res) => {
    try {
      const db = await cds.connect.to('db');
      let cfg = await db.run(SELECT.one.from('bridge_management_GISConfig').where({ id: 'default' }));
      if (!cfg) {
        cfg = {
          id: 'default', defaultBasemap: 'osm', hereApiKey: '',
          showStateBoundaries: false, showLgaBoundaries: false,
          enableScaleBar: true, enableGps: true,
          enableMinimap: true, enableHeatmap: false, enableTimeSlider: false,
          enableStatsPanel: true, enableProximity: true, enableMgaCoords: true,
          enableStreetView: true, enableConditionAlerts: true, enableCustomWms: false,
          enableServerClustering: false, conditionAlertThreshold: 3,
          proximityDefaultRadiusKm: 10, heatmapRadius: 20, heatmapBlur: 15,
          viewportLoadingZoom: 8, customWmsLayers: null
        };
      }
      if (cfg.customWmsLayers) {
        try { cfg.customWmsLayers = JSON.parse(cfg.customWmsLayers); } catch (_) { cfg.customWmsLayers = []; }
      } else {
        cfg.customWmsLayers = [];
      }
      res.json(cfg);
    } catch (err) {
      res.status(500).json({ error: { message: err.message || 'Failed to load GIS config' } });
    }
  });

  app.use('/map/api', apiLimiter, requiresAuthentication, mapRouter)

  const massEditRouter = express.Router()
  massEditRouter.use(express.json({ limit: '5mb' }))

  massEditRouter.get('/lookups', async (_req, res) => {
    try {
      const lookups = await loadMassEditLookups()
      res.json(lookups)
    } catch (error) {
      res.status(500).json({ error: { message: error.message || 'Failed to load mass edit lookups' } })
    }
  })

  massEditRouter.get('/bridges', async (_req, res) => {
    try {
      const bridges = await loadMassEditBridges()
      res.json({ bridges })
    } catch (error) {
      res.status(500).json({ error: { message: error.message || 'Failed to load bridges for mass edit' } })
    }
  })

  massEditRouter.get('/restrictions', async (_req, res) => {
    try {
      const restrictions = await loadMassEditRestrictions()
      res.json({ restrictions })
    } catch (error) {
      res.status(500).json({ error: { message: error.message || 'Failed to load restrictions for mass edit' } })
    }
  })

  massEditRouter.post('/bridges/save', async (req, res) => {
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

  massEditRouter.post('/restrictions/save', async (req, res) => {
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

  app.use('/mass-edit/api', apiLimiter, requiresAuthentication, requireScope('admin', 'manage'), validateCsrfToken, massEditRouter)
  mountAttributesApi(app, requiresAuthentication, validateCsrfToken)

  // ── Audit Report API ─────────────────────────────────────────────────────
  const auditRouter = express.Router()

  auditRouter.get('/changes', async (req, res) => {
    try {
      const db = await cds.connect.to('db')
      const { objectType, objectId, user: changedBy, source, from, to, batchId, fieldName, offset: offsetStr, limit: limitStr } = req.query

      const pageLimit  = Math.min(parseInt(limitStr)  || 200, 1000)
      const pageOffset = Math.max(parseInt(offsetStr) || 0,   0)

      let query = SELECT.from('bridge.management.ChangeLog')
        .columns('ID','changedAt','changedBy','objectType','objectId','objectName',
                 'fieldName','oldValue','newValue','changeSource','batchId')
        .orderBy('changedAt desc', 'objectType', 'objectId', 'batchId')
        .limit(pageLimit, pageOffset)

      const filters = []
      if (objectType) filters.push({ objectType })
      if (objectId)   filters.push({ objectId })
      if (changedBy)  filters.push({ changedBy })
      if (source)     filters.push({ changeSource: source })
      if (batchId)    filters.push({ batchId })
      if (fieldName)  filters.push({ fieldName })

      for (const filter of filters) {
        query = query.where(filter)
      }
      const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
      if (from) {
        if (!ISO_DATE.test(from) || isNaN(Date.parse(from))) return res.status(400).json({ error: { message: 'Invalid from date — use YYYY-MM-DD' } })
        query = query.where('changedAt >=', new Date(from).toISOString())
      }
      if (to) {
        if (!ISO_DATE.test(to) || isNaN(Date.parse(to))) return res.status(400).json({ error: { message: 'Invalid to date — use YYYY-MM-DD' } })
        query = query.where('changedAt <=', new Date(to + 'T23:59:59Z').toISOString())
      }

      const rows = await db.run(query)
      res.json({
        changes: rows || [],
        value:   rows || [],
        count:   (rows || []).length,
        offset:  pageOffset,
        limit:   pageLimit,
        hasMore: (rows || []).length === pageLimit
      })
    } catch (error) {
      res.status(500).json({ error: { message: error.message || 'Failed to load change log' } })
    }
  })

  auditRouter.get('/summary', async (req, res) => {
    try {
      const db = await cds.connect.to('db')
      const [totalChanges, byType, bySource, recentUsers] = await Promise.all([
        db.run(SELECT.one.from('bridge.management.ChangeLog').columns('count(1) as cnt')),
        db.run(SELECT.from('bridge.management.ChangeLog').columns('objectType', 'count(1) as cnt').groupBy('objectType')),
        db.run(SELECT.from('bridge.management.ChangeLog').columns('changeSource', 'count(1) as cnt').groupBy('changeSource')),
        db.run(SELECT.from('bridge.management.ChangeLog').columns('changedBy', 'count(1) as cnt').groupBy('changedBy').orderBy('cnt desc').limit(10))
      ])
      res.json({
        totalChanges: Number(totalChanges?.cnt || 0),
        byObjectType: byType || [],
        bySource: bySource || [],
        topUsers: recentUsers || []
      })
    } catch (error) {
      res.status(500).json({ error: { message: error.message || 'Failed to load audit summary' } })
    }
  })

  app.use('/audit/api', apiLimiter, requiresAuthentication, requireScope('admin', 'manage'), auditRouter)

  // ── User Access API ───────────────────────────────────────────────────────
  const accessRouter = express.Router()

  accessRouter.get('/activity', async (_req, res) => {
    try {
      const db = await cds.connect.to('db')
      const users = await db.run(
        SELECT.from('bridge.management.UserActivity')
          .columns('userId', 'lastSeenAt', 'sessionId', 'status', 'ipAddress')
          .orderBy('lastSeenAt desc')
          .limit(50)
      )
      res.json({ users: users || [] })
    } catch (error) {
      res.status(500).json({ error: { message: error.message } })
    }
  })

  accessRouter.get('/summary', async (_req, res) => {
    try {
      const db = await cds.connect.to('db')
      const [total, activeToday, activeThisWeek] = await Promise.all([
        db.run(SELECT.one.from('bridge.management.UserActivity').columns('count(1) as cnt')),
        db.run(SELECT.one.from('bridge.management.UserActivity').columns('count(1) as cnt')
          .where('lastSeenAt >=', new Date(Date.now() - 86400000).toISOString())),
        db.run(SELECT.one.from('bridge.management.UserActivity').columns('count(1) as cnt')
          .where('lastSeenAt >=', new Date(Date.now() - 7 * 86400000).toISOString()))
      ])
      res.json({
        totalUsers: Number(total?.cnt || 0),
        activeToday: Number(activeToday?.cnt || 0),
        activeThisWeek: Number(activeThisWeek?.cnt || 0)
      })
    } catch (error) {
      res.status(500).json({ error: { message: error.message } })
    }
  })

  app.use('/access/api', apiLimiter, requiresAuthentication, accessRouter)

  // ── Data Quality API ──────────────────────────────────────────────────────
  const qualityRouter = express.Router()
  qualityRouter.use(express.json())

  // Default completeness fields — used as fallback when no required_field rules are configured
  const QUALITY_COMPLETENESS_FIELDS_DEFAULT = [
    'bridgeName', 'bridgeId', 'state', 'region', 'assetOwner',
    'latitude', 'longitude', 'structureType', 'condition',
    'conditionRating', 'postingStatus', 'lastInspectionDate', 'geoJson'
  ]

  /** Derive completeness fields from active required_field rules; fall back to defaults */
  function getCompletenessFields(rules) {
    const fromRules = rules
      .filter(r => r.ruleType === 'required_field' && r.field)
      .map(r => r.field)
    return fromRules.length > 0 ? fromRules : QUALITY_COMPLETENESS_FIELDS_DEFAULT
  }

  async function loadQualityBridges() {
    const db = await cds.connect.to('db')
    const bridges = await db.run(
      SELECT.from('bridge.management.Bridges').columns(
        'ID', 'bridgeId', 'bridgeName', 'state', 'region', 'assetOwner',
        'latitude', 'longitude', 'condition', 'conditionRating',
        'postingStatus', 'scourRisk', 'lastInspectionDate',
        'nhvrAssessed', 'freightRoute', 'geoJson', 'structureType', 'yearBuilt'
      )
    )
    return bridges || []
  }

  async function loadActiveRestrictionBridgeIds() {
    const db = await cds.connect.to('db')
    const rows = await db.run(
      SELECT.from('bridge.management.Restrictions')
        .columns('bridge_ID')
        .where({ active: true })
    )
    return new Set((rows || []).map(r => r.bridge_ID).filter(Boolean))
  }

  async function loadEnabledRules() {
    try {
      const db = await cds.connect.to('db')
      const rows = await db.run(
        SELECT.from('bridge.management.DataQualityRules')
          .columns('ID', 'name', 'enabled', 'sortOrder', 'config')
          .where({ enabled: true })
          .orderBy('sortOrder')
      )
      return (rows || []).map(r => {
        let cfg = {}
        try { cfg = JSON.parse(r.config || '{}') } catch (_) {}
        return { ...r, _cfg: cfg }
      })
    } catch (_) {
      return []
    }
  }

  function execRule(rule, bridge, ruleEvaluation) {
    const { ruleType, field, _cfg } = rule
    switch (ruleType) {
      case 'required_field': {
        const requiredBridgeProperty = bridge[field]
        return requiredBridgeProperty == null || (typeof requiredBridgeProperty === 'string' && requiredBridgeProperty.trim() === '')
      }
      case 'non_zero': {
        const numericValue = Number(bridge[field])
        return bridge[field] == null || !Number.isFinite(numericValue) || numericValue === 0
      }
      case 'not_older_than_days': {
        if (!bridge[field]) return false // required_field handles the null case
        const maxAgeMs = (_cfg.days || 730) * 24 * 60 * 60 * 1000
        return Date.now() - new Date(bridge[field]).getTime() > maxAgeMs
      }
      case 'condition_requires_restriction': {
        const conditions = _cfg.conditions || ['Poor', 'Critical']
        if (!conditions.includes(bridge.condition)) return false
        return !ruleEvaluation.activeRestrictionBridgeIds.has(bridge.ID)
      }
      case 'freight_requires_nhvr': {
        return !!(bridge.freightRoute && !bridge.nhvrAssessed)
      }
      default:
        return false
    }
  }

  function evaluateBridgeIssues(bridge, activeRestrictionBridgeIds, rules) {
    const ruleEvaluation = { activeRestrictionBridgeIds }
    return rules
      .filter(rule => execRule(rule, bridge, ruleEvaluation))
      .map(rule => ({
        ruleId:   rule.id,
        category: rule.category,
        severity: rule.severity,
        message:  rule.message,
        weight:   rule.weight || 10
      }))
  }

  function calcCompletenessScore(bridge, completenessFields) {
    const fields = completenessFields || QUALITY_COMPLETENESS_FIELDS_DEFAULT
    const populated = fields.filter(completenessField => {
      const bridgeCompletenessValue = bridge[completenessField]
      if (bridgeCompletenessValue == null) return false
      if (typeof bridgeCompletenessValue === 'string' && bridgeCompletenessValue.trim() === '') return false
      if (completenessField === 'latitude' || completenessField === 'longitude') return Number(bridgeCompletenessValue) !== 0 && Number.isFinite(Number(bridgeCompletenessValue))
      return true
    })
    return fields.length > 0 ? Math.round((populated.length / fields.length) * 100) : 100
  }

  function calcWeightedScore(issues, rules) {
    const totalWeight = rules.reduce((sum, r) => sum + (r.weight || 10), 0)
    if (totalWeight === 0) return 100
    const violatedWeight = issues.reduce((sum, i) => sum + (i.weight || 10), 0)
    return Math.max(0, Math.round((1 - violatedWeight / totalWeight) * 100))
  }

  function maxSeverity(issues) {
    if (issues.some(i => i.severity === 'critical')) return 'critical'
    if (issues.some(i => i.severity === 'warning')) return 'warning'
    if (issues.some(i => i.severity === 'info')) return 'info'
    return 'none'
  }

  qualityRouter.get('/summary', async (_req, res) => {
    try {
      const [bridges, activeRestrictionBridgeIds, rules] = await Promise.all([
        loadQualityBridges(),
        loadActiveRestrictionBridgeIds(),
        loadEnabledRules()
      ])

      const completenessFields = getCompletenessFields(rules)
      const categoryCountMap = {}
      let issueCount = 0
      let criticalCount = 0
      let warningCount = 0
      let totalCompleteness = 0
      let totalWeightedScore = 0

      for (const bridge of bridges) {
        const issues = evaluateBridgeIssues(bridge, activeRestrictionBridgeIds, rules)
        totalCompleteness += calcCompletenessScore(bridge, completenessFields)
        totalWeightedScore += calcWeightedScore(issues, rules)
        if (issues.length > 0) issueCount++
        for (const issue of issues) {
          if (issue.severity === 'critical') criticalCount++
          else if (issue.severity === 'warning') warningCount++
          categoryCountMap[issue.category] = (categoryCountMap[issue.category] || 0) + 1
        }
      }

      const total = bridges.length
      const completenessPercent = total > 0 ? Math.round(totalCompleteness / total) : 0
      const avgWeightedScore = total > 0 ? Math.round(totalWeightedScore / total) : 100
      const byCategory = Object.entries(categoryCountMap)
        .map(([category, count]) => ({ category, count }))
        .sort((lowerIssueCategory, higherIssueCategory) => higherIssueCategory.count - lowerIssueCategory.count)

      res.json({
        totalBridges: total,
        issueCount,
        completenessPercent,
        criticalCount,
        warningCount,
        byCategory,
        avgWeightedScore
      })
    } catch (error) {
      res.status(500).json({ error: { message: error.message || 'Failed to load quality summary' } })
    }
  })

  qualityRouter.get('/issues', async (req, res) => {
    try {
      const { severity, state, name } = req.query

      const [bridges, activeRestrictionBridgeIds, rules] = await Promise.all([
        loadQualityBridges(),
        loadActiveRestrictionBridgeIds(),
        loadEnabledRules()
      ])

      const completenessFields = getCompletenessFields(rules)
      let results = bridges.map(bridge => {
        const issues = evaluateBridgeIssues(bridge, activeRestrictionBridgeIds, rules)
        return {
          ID: bridge.ID,
          bridgeId: bridge.bridgeId || null,
          bridgeName: bridge.bridgeName || null,
          state: bridge.state || null,
          issues,
          issueCount: issues.length,
          maxSeverity: maxSeverity(issues),
          completenessScore: calcCompletenessScore(bridge, completenessFields),
          weightedScore: calcWeightedScore(issues, rules)
        }
      }).filter(bridge => bridge.issueCount > 0)

      // Apply filters
      if (severity) {
        const sev = severity.toLowerCase()
        results = results.filter(bridge =>
          bridge.issues.some(issue => issue.severity === sev) || bridge.maxSeverity === sev
        )
      }
      if (state) {
        const st = state.toUpperCase()
        results = results.filter(bridge => (bridge.state || '').toUpperCase() === st)
      }
      if (name) {
        const needle = name.toLowerCase()
        results = results.filter(bridge =>
          (bridge.bridgeName || '').toLowerCase().includes(needle) ||
          (bridge.bridgeId || '').toLowerCase().includes(needle)
        )
      }

      // Sort: critical first, then by issue count desc
      results.sort((higherPriorityBridge, lowerPriorityBridge) => {
        const sevOrder = { critical: 0, warning: 1, info: 2, none: 3 }
        const diff = (sevOrder[higherPriorityBridge.maxSeverity] || 3) - (sevOrder[lowerPriorityBridge.maxSeverity] || 3)
        return diff !== 0 ? diff : lowerPriorityBridge.issueCount - higherPriorityBridge.issueCount
      })

      res.json({ bridges: results })
    } catch (error) {
      res.status(500).json({ error: { message: error.message || 'Failed to load quality issues' } })
    }
  })

  qualityRouter.get('/rules', async (_req, res) => {
    try {
      const db = await cds.connect.to('db')
      const rows = await db.run(
        SELECT.from('bridge.management.DataQualityRules').orderBy('sortOrder', 'name')
      )
      res.json({ rules: rows || [] })
    } catch (error) {
      res.status(500).json({ error: { message: error.message } })
    }
  })

  const ALLOWED_RULE_FIELDS = new Set(['bridgeId','bridgeName','state','region','assetOwner','latitude','longitude',
    'structureType','condition','conditionRating','postingStatus','lastInspectionDate','geoJson',
    'yearBuilt','scourRisk','nhvrAssessed','freightRoute'])

  qualityRouter.post('/rules', async (req, res) => {
    try {
      const { name, category, severity, ruleType, field, config, message, enabled, sortOrder, weight } = req.body || {}
      if (!name || !category || !severity || !ruleType || !message) {
        return res.status(400).json({ error: { message: 'name, category, severity, ruleType, and message are required' } })
      }
      if (field && !ALLOWED_RULE_FIELDS.has(field)) {
        return res.status(400).json({ error: { message: `Invalid field: "${field}"` } })
      }
      const id = cds.utils.uuid()
      const db = await cds.connect.to('db')
      await db.run(
        INSERT.into('bridge.management.DataQualityRules').entries({
          id, name, category, severity, ruleType,
          field: field || null,
          config: config || null,
          message,
          enabled: enabled !== false,
          sortOrder: sortOrder || 0,
          weight: weight || 10
        })
      )
      res.status(201).json({ id })
    } catch (error) {
      res.status(500).json({ error: { message: error.message } })
    }
  })

  qualityRouter.put('/rules/:id', async (req, res) => {
    try {
      const { id } = req.params
      const { name, category, severity, ruleType, field, config, message, enabled, sortOrder, weight } = req.body || {}
      if (!name || !category || !severity || !ruleType || !message) {
        return res.status(400).json({ error: { message: 'name, category, severity, ruleType, and message are required' } })
      }
      if (field && !ALLOWED_RULE_FIELDS.has(field)) {
        return res.status(400).json({ error: { message: `Invalid field: "${field}"` } })
      }
      const db = await cds.connect.to('db')
      const existing = await db.run(SELECT.one.from('bridge.management.DataQualityRules').where({ id }))
      if (!existing) return res.status(404).json({ error: { message: 'Rule not found' } })
      await db.run(
        UPDATE('bridge.management.DataQualityRules')
          .set({ name, category, severity, ruleType, field: field || null, config: config || null, message, enabled: enabled !== false, sortOrder: sortOrder || 0, weight: weight || 10 })
          .where({ id })
      )
      res.json({ success: true })
    } catch (error) {
      res.status(500).json({ error: { message: error.message } })
    }
  })

  qualityRouter.delete('/rules/:id', async (req, res) => {
    try {
      const { id } = req.params
      const db = await cds.connect.to('db')
      const existing = await db.run(SELECT.one.from('bridge.management.DataQualityRules').where({ id }))
      if (!existing) return res.status(404).json({ error: { message: 'Rule not found' } })
      await db.run(DELETE.from('bridge.management.DataQualityRules').where({ id }))
      res.json({ success: true })
    } catch (error) {
      res.status(500).json({ error: { message: error.message } })
    }
  })

  app.use('/quality/api', apiLimiter, requiresAuthentication, validateCsrfToken, qualityRouter)

  // ── System Config API ─────────────────────────────────────────────────────
  const sysRouter = express.Router()
  sysRouter.use(express.json())

  sysRouter.get('/config', async (_req, res) => {
    try {
      const db = await cds.connect.to('db')
      const rows = await db.run(
        SELECT.from('bridge.management.SystemConfig').orderBy('category', 'sortOrder')
      )
      res.json({ configs: rows || [] })
    } catch (error) { res.status(500).json({ error: { message: error.message } }) }
  })

  sysRouter.patch('/config/:key', async (req, res) => {
    try {
      const { key } = req.params
      const { value } = req.body || {}
      if (value === undefined) return res.status(400).json({ error: { message: 'value is required' } })
      const db = await cds.connect.to('db')
      const existing = await db.run(SELECT.one.from('bridge.management.SystemConfig').where({ configKey: key }))
      if (!existing) return res.status(404).json({ error: { message: 'Config key not found' } })
      if (existing.isReadOnly) return res.status(403).json({ error: { message: 'This setting is read-only' } })
      await db.run(
        UPDATE('bridge.management.SystemConfig')
          .set({ value: String(value), modifiedAt: new Date().toISOString(), modifiedBy: req.user?.id || 'system' })
          .where({ configKey: key })
      )
      const { invalidateCache } = require('./system-config')
      invalidateCache(key)
      res.json({ success: true })
    } catch (error) { res.status(500).json({ error: { message: error.message } }) }
  })

  sysRouter.get('/banner', async (_req, res) => {
    try {
      const db = await cds.connect.to('db')
      const [modeRow, msgRow] = await Promise.all([
        db.run(SELECT.one.from('bridge.management.SystemConfig').where({ configKey: 'appMaintenanceMode' })),
        db.run(SELECT.one.from('bridge.management.SystemConfig').where({ configKey: 'appMaintenanceMessage' }))
      ])
      const active = modeRow?.value === 'true'
      res.json({ active, message: active ? (msgRow?.value || '') : '' })
    } catch (error) { res.status(500).json({ error: { message: error.message } }) }
  })

  app.use('/system/api', apiLimiter, requiresAuthentication, requireScope('admin'), validateCsrfToken, sysRouter)

  // ── Feature Flags API — read (all authenticated), write (config_manager|admin) ──
  const { isFeatureEnabled, DEPENDENCIES, KNOWN_FLAGS } = require('./feature-flags')
  const { writeChangeLogs } = require('./audit-log')
  const featRouter = express.Router()
  featRouter.use(express.json())

  // GET /system/api/features — all authenticated users
  featRouter.get('/', async (_req, res) => {
    try {
      const db = await cds.connect.to('db')
      const rows = await db.run(
        SELECT.from('bridge.management.SystemConfig')
          .where({ category: 'Feature Flags' })
          .orderBy('sortOrder')
      )
      const flags = rows.map(r => ({
        flagKey: r.configKey.replace(/^feature\./, ''),
        enabled: r.value === 'true',
        label:   r.label,
        description: r.description,
      }))
      res.json({ flags })
    } catch (error) { res.status(500).json({ error: { message: error.message } }) }
  })

  // PATCH /system/api/features/:key — requires config_manager or admin scope
  featRouter.patch('/:key', requireScope('config_manager', 'admin'), validateCsrfToken, async (req, res) => {
    try {
      const flagKey = req.params.key                        // e.g. 'bhiBsiAssessment'
      const configKey = 'feature.' + flagKey               // DB key
      const { enabled } = req.body || {}
      if (typeof enabled !== 'boolean')
        return res.status(400).json({ error: { message: "'enabled' must be a boolean" } })

      const db = await cds.connect.to('db')

      // Validate the flag key exists in SystemConfig
      const existing = await db.run(
        SELECT.one.from('bridge.management.SystemConfig').where({ configKey })
      )
      if (!existing)
        return res.status(404).json({ error: { message: `Unknown feature flag: '${flagKey}'` } })

      // Dependency check: enabling a child requires parent to be on
      if (enabled && DEPENDENCIES[flagKey]) {
        const parentKey = DEPENDENCIES[flagKey]
        const parentEnabled = await isFeatureEnabled(parentKey)
        if (!parentEnabled)
          return res.status(422).json({
            error: { message: `Cannot enable '${flagKey}': requires '${parentKey}' to be enabled first.` }
          })
      }

      const oldValue = existing.value
      const newValue = enabled ? 'true' : 'false'

      // Cascade-disable children when master flag is turned off
      const cascaded = []
      if (!enabled && flagKey === 'bhiBsiAssessment') {
        const children = Object.keys(DEPENDENCIES).filter(k => DEPENDENCIES[k] === flagKey)
        for (const child of children) {
          const childKey = 'feature.' + child
          const childRow = await db.run(SELECT.one.from('bridge.management.SystemConfig').where({ configKey: childKey }))
          if (childRow && childRow.value === 'true') {
            await db.run(UPDATE('bridge.management.SystemConfig')
              .set({ value: 'false', modifiedAt: new Date().toISOString(), modifiedBy: req.user?.id || 'system' })
              .where({ configKey: childKey }))
            cascaded.push(child)
            await writeChangeLogs(db, {
              objectType: 'SystemConfig', objectId: childKey,
              objectName: childRow.label, source: 'FeatureFlags',
              batchId: `ff-cascade-${Date.now()}`,
              changedBy: req.user?.id || 'system',
              changes: [{ fieldName: 'value', oldValue: 'true', newValue: 'false' }]
            })
            const { invalidateCache } = require('./system-config')
            invalidateCache(childKey)
          }
        }
      }

      // Write the primary flag
      await db.run(UPDATE('bridge.management.SystemConfig')
        .set({ value: newValue, modifiedAt: new Date().toISOString(), modifiedBy: req.user?.id || 'system' })
        .where({ configKey }))

      const { invalidateCache } = require('./system-config')
      invalidateCache(configKey)

      // ChangeLog — NON-NEGOTIABLE #7
      await writeChangeLogs(db, {
        objectType: 'SystemConfig', objectId: configKey,
        objectName: existing.label, source: 'FeatureFlags',
        batchId: `ff-${Date.now()}`,
        changedBy: req.user?.id || 'system',
        changes: [{ fieldName: 'value', oldValue, newValue }]
      })

      res.json({
        flagKey, previousValue: oldValue === 'true', newValue: enabled,
        cascadeDisabled: cascaded,
        changedBy: req.user?.id || 'system',
        changedAt: new Date().toISOString(),
      })
    } catch (error) { res.status(500).json({ error: { message: error.message } }) }
  })

  // GET — no scope restriction beyond authentication (all users can read feature state)
  app.use('/system/api/features', requiresAuthentication, featRouter)

  // ── Admin Bridges attachment API ─────────────────────────────────────────
  const adminBridgeRouter = express.Router()
  adminBridgeRouter.use(express.json({ limit: '25mb' }))

  adminBridgeRouter.get('/bridges/:bridgeId/attachments', async (req, res) => {
    try {
      const db = await cds.connect.to('db')
      const bridgeId = await assertBridgeExists(db, req.params.bridgeId)
      const rows = await db.run(
        SELECT.from('bridge.management.BridgeDocuments')
          .columns('ID', 'title', 'fileName', 'mediaType', 'fileSize', 'createdAt', 'documentDate', 'referenceNumber')
          .where({ bridge_ID: bridgeId })
          .orderBy('createdAt desc')
      )
      res.json({ attachments: (rows || []).map(row => attachmentResponse(row, bridgeId)) })
    } catch (error) {
      res.status(error.status || 500).json({ error: { message: error.message || 'Failed to load attachments' } })
    }
  })

  adminBridgeRouter.post('/bridges/:bridgeId/attachments', async (req, res) => {
    try {
      const { fileName, mediaType, fileSize, contentBase64 } = req.body || {}
      if (!fileName) {
        return res.status(400).json({ error: { message: 'fileName is required' } })
      }
      if (!contentBase64) {
        return res.status(400).json({ error: { message: 'File content is empty' } })
      }

      const db = await cds.connect.to('db')
      const bridgeId = await assertBridgeExists(db, req.params.bridgeId)
      const content = Buffer.from(contentBase64, 'base64')
      const safeName = sanitizeAttachmentName(fileName)
      const now = new Date()
      const entry = {
        ID: cds.utils.uuid(),
        bridge_ID: bridgeId,
        title: safeName,
        fileName: safeName,
        mediaType: mediaType || 'application/octet-stream',
        fileSize: Number(fileSize || content.length),
        content,
        documentDate: now.toISOString().slice(0, 10),
        createdAt: now.toISOString(),
        createdBy: req.user?.id || 'anonymous',
        modifiedAt: now.toISOString(),
        modifiedBy: req.user?.id || 'anonymous'
      }

      await db.run(INSERT.into('bridge.management.BridgeDocuments').entries(entry))
      res.status(201).json({ attachment: attachmentResponse(entry, bridgeId) })
    } catch (error) {
      res.status(error.status || 422).json({ error: { message: error.message || 'Upload failed' } })
    }
  })

  adminBridgeRouter.get('/bridges/:bridgeId/attachments/:attachmentId/content', async (req, res) => {
    try {
      const db = await cds.connect.to('db')
      const bridgeId = await assertBridgeExists(db, req.params.bridgeId)
      const row = await db.run(
        SELECT.one.from('bridge.management.BridgeDocuments')
          .columns('ID', 'fileName', 'mediaType', 'content')
          .where({ ID: req.params.attachmentId, bridge_ID: bridgeId })
      )
      if (!row) {
        return res.status(404).json({ error: { message: 'Attachment not found' } })
      }

      const fileName = sanitizeAttachmentName(row.fileName)
      const content = await toAttachmentBuffer(row.content)
      const disposition = req.query.download === 'true' ? 'attachment' : 'inline'
      res.setHeader('Content-Type', row.mediaType || 'application/octet-stream')
      res.setHeader('Content-Length', content.length)
      res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`)
      res.send(content)
    } catch (error) {
      res.status(error.status || 500).json({ error: { message: error.message || 'Failed to open attachment' } })
    }
  })

  // ── Bridge list CSV export ─────────────────────────────────────────────────
  const EXPORT_COLUMNS = [
    'bridgeId', 'bridgeName', 'state', 'route', 'region', 'assetOwner',
    'structureType', 'yearBuilt', 'condition', 'conditionRating',
    'postingStatus', 'lastInspectionDate', 'scourRisk',
    'latitude', 'longitude',
    'nhvrAssessed', 'freightRoute', 'overMassRoute',
    'hmlApproved', 'bDoubleApproved', 'pbsApprovalClass',
    'remarks'
  ]

  function csvEscape(v) {
    if (v == null) return ''
    const s = String(v)
    return /[,"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  adminBridgeRouter.get('/bridges/export', async (req, res) => {
    try {
      const db = await cds.connect.to('db')
      const bridges = await db.run(
        SELECT.from('bridge.management.Bridges').columns(...EXPORT_COLUMNS).orderBy('bridgeId')
      )
      const rows = bridges || []
      const header = EXPORT_COLUMNS.join(',')
      const lines = rows.map(b => EXPORT_COLUMNS.map(c => csvEscape(b[c])).join(','))
      const csv = [header, ...lines].join('\r\n')
      const filename = `bridges-export-${new Date().toISOString().slice(0, 10)}.csv`
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.send(csv)
    } catch (error) {
      res.status(500).json({ error: { message: error.message || 'Export failed' } })
    }
  })

  function buildBridgeCardHtml(bridge, restrictions) {
    const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const fmt = (v) => v == null || v === '' ? '—' : esc(v)
    const fmtBool = (v) => v === true || v === 1 ? 'Yes' : v === false || v === 0 ? 'No' : '—'
    const fmtDate = (v) => v ? esc(String(v).slice(0, 10)) : '—'
    const fmtCoord = (lat, lng) => (lat != null && lng != null) ? `${esc(lat)}, ${esc(lng)}` : '—'
    const today = new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })

    const condRating = bridge.conditionRating != null ? `${esc(bridge.conditionRating)}/10` : '—'

    const fields = [
      ['Structure Type', fmt(bridge.structureType)],
      ['Year Built', fmt(bridge.yearBuilt)],
      ['Condition Rating', condRating],
      ['Condition', fmt(bridge.condition)],
      ['Span Length (m)', fmt(bridge.spanLength)],
      ['Deck Width (m)', fmt(bridge.deckWidth)],
      ['Clearance Height (m)', fmt(bridge.clearanceHeight)],
      ['Posting Status', fmt(bridge.postingStatus)],
      ['Scour Risk', fmt(bridge.scourRisk)],
      ['Last Assessment Date', fmtDate(bridge.lastInspectionDate)],
      ['Assessor', fmt(bridge.conditionAssessor)],
      ['Report Ref', fmt(bridge.conditionReportRef)],
      ['Managing Authority', fmt(bridge.managingAuthority)],
      ['Route', fmt(bridge.route)],
      ['Region', fmt(bridge.region)],
      ['Coordinates', fmtCoord(bridge.latitude, bridge.longitude)],
      ['NHVR Assessed', fmtBool(bridge.nhvrAssessed)],
      ['Freight Route', fmtBool(bridge.freightRoute)],
      ['Over Mass Route', fmtBool(bridge.overMassRoute)],
      ['HML Approved', fmtBool(bridge.hmlApproved)],
      ['B-Double Approved', fmtBool(bridge.bDoubleApproved)]
    ]

    const fieldRows = fields.map(([label, value]) =>
      `<div class="field"><span class="label">${label}</span><span class="value">${value}</span></div>`
    ).join('')

    const notesSection = bridge.conditionNotes
      ? `<div class="section"><h2>Notes</h2><p class="notes">${esc(bridge.conditionNotes)}</p></div>`
      : ''

    const restrictionsSection = restrictions && restrictions.length > 0
      ? `<div class="section">
          <h2>Active Restrictions</h2>
          <table class="restrictions-table">
            <thead><tr><th>Type</th><th>Value</th><th>Unit</th><th>Effective From</th><th>Effective To</th></tr></thead>
            <tbody>${restrictions.map(r =>
              `<tr><td>${fmt(r.restrictionType)}</td><td>${fmt(r.restrictionValue)}</td><td>${fmt(r.restrictionUnit)}</td><td>${fmtDate(r.effectiveFrom)}</td><td>${fmtDate(r.effectiveTo)}</td></tr>`
            ).join('')}</tbody>
          </table>
        </div>`
      : ''

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bridge Card — ${esc(bridge.bridgeName)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #1a1a1a; background: #fff; }
  .page { max-width: 210mm; margin: 0 auto; padding: 20mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0070a9; padding-bottom: 10px; margin-bottom: 18px; }
  .header-left h1 { font-size: 18pt; font-weight: bold; color: #0070a9; line-height: 1.2; }
  .header-left .subtitle { font-size: 10pt; color: #555; margin-top: 4px; }
  .header-right { text-align: right; }
  .bms-logo { font-size: 22pt; font-weight: 900; color: #0070a9; letter-spacing: 2px; }
  .date-generated { font-size: 9pt; color: #888; margin-top: 4px; }
  .section { margin-bottom: 20px; }
  .section h2 { font-size: 12pt; font-weight: bold; color: #0070a9; border-bottom: 1px solid #d0e8f5; padding-bottom: 4px; margin-bottom: 10px; }
  .fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
  .field { display: flex; flex-direction: column; padding: 4px 0; border-bottom: 1px dotted #e0e0e0; }
  .label { font-size: 8pt; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  .value { font-size: 10.5pt; color: #1a1a1a; margin-top: 2px; font-weight: 500; }
  .notes { font-size: 10pt; line-height: 1.5; color: #333; white-space: pre-wrap; }
  .restrictions-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  .restrictions-table th { background: #f0f7ff; color: #0070a9; font-weight: bold; text-align: left; padding: 5px 8px; border: 1px solid #c8dff0; }
  .restrictions-table td { padding: 4px 8px; border: 1px solid #ddd; }
  .restrictions-table tr:nth-child(even) td { background: #f9fbfd; }
  .print-btn { display: inline-block; margin-bottom: 16px; padding: 8px 20px; background: #0070a9; color: #fff; border: none; border-radius: 4px; font-size: 11pt; cursor: pointer; }
  .print-btn:hover { background: #005a87; }
  @media print {
    body { margin: 0; }
    .no-print { display: none; }
    .page { padding: 0; max-width: none; }
    @page { size: A4 portrait; margin: 20mm; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="no-print" style="padding-bottom:8px;"><button class="print-btn" onclick="window.print()">Print / Save as PDF</button></div>
  <div class="header">
    <div class="header-left">
      <h1>${esc(bridge.bridgeName)}</h1>
      <div class="subtitle">Bridge ID: ${esc(bridge.bridgeId)} &nbsp;|&nbsp; ${esc(bridge.state)}</div>
    </div>
    <div class="header-right">
      <div class="bms-logo">BMS</div>
      <div class="date-generated">Generated: ${today}</div>
    </div>
  </div>
  <div class="section">
    <h2>Bridge Details</h2>
    <div class="fields-grid">${fieldRows}</div>
  </div>
  ${notesSection}
  ${restrictionsSection}
</div>
<script>window.onload = function() { window.print(); };</script>
</body>
</html>`
  }

  adminBridgeRouter.get('/bridges/:bridgeId/card', async (req, res) => {
    try {
      const db = await cds.connect.to('db')
      const bridgeId = await assertBridgeExists(db, req.params.bridgeId)
      const bridge = await db.run(
        SELECT.one.from('bridge.management.Bridges').where({ ID: bridgeId })
          .columns('bridgeName', 'bridgeId', 'state', 'route', 'region', 'managingAuthority',
            'structureType', 'yearBuilt', 'spanLength', 'totalLength', 'deckWidth',
            'clearanceHeight', 'numberOfLanes', 'condition', 'conditionRating',
            'structuralAdequacyRating', 'postingStatus', 'scourRisk',
            'lastInspectionDate', 'conditionAssessor', 'conditionReportRef', 'conditionNotes',
            'latitude', 'longitude', 'nhvrAssessed', 'freightRoute', 'overMassRoute',
            'hmlApproved', 'bDoubleApproved', 'remarks')
      )
      const restrictions = await db.run(
        SELECT.from('bridge.management.Restrictions')
          .where({ bridge_ID: bridgeId, active: true })
          .columns('restrictionType', 'restrictionValue', 'restrictionUnit', 'effectiveFrom', 'effectiveTo')
      )
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.send(buildBridgeCardHtml(bridge, restrictions))
    } catch (error) {
      res.status(error.status || 500).json({ error: { message: error.message || 'Failed to generate bridge card' } })
    }
  })

  adminBridgeRouter.delete('/bridges/:bridgeId/attachments/:attachmentId', async (req, res) => {
    try {
      const db = await cds.connect.to('db')
      const bridgeId = await assertBridgeExists(db, req.params.bridgeId)
      const result = await db.run(
        DELETE.from('bridge.management.BridgeDocuments')
          .where({ ID: req.params.attachmentId, bridge_ID: bridgeId })
      )
      if (!result) {
        return res.status(404).json({ error: { message: 'Attachment not found' } })
      }
      res.status(204).end()
    } catch (error) {
      res.status(error.status || 500).json({ error: { message: error.message || 'Failed to delete attachment' } })
    }
  })

  app.use('/admin-bridges/api', apiLimiter, requiresAuthentication, requireScope('admin', 'manage', 'inspect'), validateCsrfToken, adminBridgeRouter)

  // QR codes + PDF inspection reports
  app.use('/admin-bridges/api', requiresAuthentication, qrApi)

  // ── BNAC Integration Config ─────────────────────────────────────────────
  const bnacRouter = express.Router()
  bnacRouter.use(express.json({ limit: '10mb' }))

  // GET all environments
  bnacRouter.get('/environments', async (_req, res) => {
    try {
      const db = await cds.connect.to('db')
      const rows = await db.run(SELECT.from('bridge.management.BnacEnvironment').orderBy('environment'))
      res.json({ environments: rows || [] })
    } catch (error) { res.status(500).json({ error: { message: error.message } }) }
  })

  // POST add environment
  bnacRouter.post('/environments', async (req, res) => {
    try {
      const { environment, baseUrl, description, active } = req.body || {}
      if (!environment || !baseUrl) return res.status(400).json({ error: { message: 'environment and baseUrl are required' } })
      const db = await cds.connect.to('db')
      await db.run(INSERT.into('bridge.management.BnacEnvironment').entries({
        environment: environment.toUpperCase(),
        baseUrl: baseUrl.endsWith('/') ? baseUrl : baseUrl + '/',
        description: description || '',
        active: active !== false,
        modifiedAt: new Date().toISOString(),
        modifiedBy: req.user?.id || 'system'
      }))
      res.json({ success: true })
    } catch (error) { res.status(500).json({ error: { message: error.message } }) }
  })

  // PATCH update environment
  bnacRouter.patch('/environments/:env', async (req, res) => {
    try {
      const env = req.params.env.toUpperCase()
      const { baseUrl, description, active } = req.body || {}
      const db = await cds.connect.to('db')
      const patch = { modifiedAt: new Date().toISOString(), modifiedBy: req.user?.id || 'system' }
      if (baseUrl !== undefined) patch.baseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'
      if (description !== undefined) patch.description = description
      if (active !== undefined) patch.active = active
      await db.run(UPDATE('bridge.management.BnacEnvironment').set(patch).where({ environment: env }))
      res.json({ success: true })
    } catch (error) { res.status(500).json({ error: { message: error.message } }) }
  })

  // DELETE environment
  bnacRouter.delete('/environments/:env', async (req, res) => {
    try {
      const env = req.params.env.toUpperCase()
      const db = await cds.connect.to('db')
      await db.run(DELETE.from('bridge.management.BnacEnvironment').where({ environment: env }))
      res.json({ success: true })
    } catch (error) { res.status(500).json({ error: { message: error.message } }) }
  })

  // GET load history
  bnacRouter.get('/history', async (_req, res) => {
    try {
      const db = await cds.connect.to('db')
      const rows = await db.run(SELECT.from('bridge.management.BnacLoadHistory').orderBy('loadedAt desc').limit(100))
      res.json({ history: rows || [] })
    } catch (error) { res.status(500).json({ error: { message: error.message } }) }
  })

  // GET object ID mappings (for a bridge)
  bnacRouter.get('/mapping/:bridgeId', async (req, res) => {
    try {
      const db = await cds.connect.to('db')
      const row = await db.run(SELECT.one.from('bridge.management.BnacObjectIdMap').where({ bridgeId: req.params.bridgeId }))
      res.json({ mapping: row || null })
    } catch (error) { res.status(500).json({ error: { message: error.message } }) }
  })

  // POST CSV upload of bridgeId,bnacObjectId
  bnacRouter.post('/upload', async (req, res) => {
    try {
      const { fileName, contentBase64, environment } = req.body || {}
      if (!contentBase64) return res.status(400).json({ error: { message: 'contentBase64 is required' } })

      const csvText = Buffer.from(contentBase64, 'base64').toString('utf8')
      const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
      if (!lines.length) return res.status(400).json({ error: { message: 'CSV file is empty' } })

      // Skip header row if it starts with bridgeId/bridge_id (case-insensitive)
      const startIdx = /^bridge/i.test(lines[0].split(',')[0]) ? 1 : 0
      const dataLines = lines.slice(startIdx)

      const db = await cds.connect.to('db')
      const batchId = cds.utils.uuid()
      const loadedBy = req.user?.id || 'system'
      const loadedAt = new Date().toISOString()

      // Get active env base URL for computing bnacUrl
      const targetEnv = (environment || 'PROD').toUpperCase()
      const envRow = await db.run(SELECT.one.from('bridge.management.BnacEnvironment').where({ environment: targetEnv }))
      const baseUrl = envRow?.baseUrl || ''

      let success = 0, failed = 0
      const errors = []
      const tx = db.tx()

      try {
        for (const line of dataLines) {
          const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''))
          const [bridgeId, bnacObjectId] = parts
          if (!bridgeId || !bnacObjectId) {
            failed++
            errors.push(`Invalid row: "${line}"`)
            continue
          }
          const bnacUrl = baseUrl ? baseUrl + bnacObjectId : ''
          const existing = await tx.run(SELECT.one.from('bridge.management.BnacObjectIdMap').where({ bridgeId }))
          if (existing) {
            await tx.run(UPDATE('bridge.management.BnacObjectIdMap').set({ bnacObjectId, bnacUrl, loadedAt, loadedBy, loadBatchId: batchId }).where({ bridgeId }))
          } else {
            await tx.run(INSERT.into('bridge.management.BnacObjectIdMap').entries({ bridgeId, bnacObjectId, bnacUrl, loadedAt, loadedBy, loadBatchId: batchId }))
          }
          success++
        }

        await tx.run(INSERT.into('bridge.management.BnacLoadHistory').entries({
          ID: cds.utils.uuid(),
          loadedAt,
          loadedBy,
          fileName: fileName || 'upload.csv',
          environment: targetEnv,
          total: dataLines.length,
          success,
          failed,
          errors: errors.length ? errors.join('\n') : null,
          batchId
        }))

        await tx.commit()
        res.json({ success, failed, total: dataLines.length, batchId, errors: errors.slice(0, 20) })
      } catch (error) {
        await tx.rollback()
        throw error
      }
    } catch (error) { res.status(500).json({ error: { message: error.message } }) }
  })

  mountReportsApi(app, requiresAuthentication)
  mountBhiBsiApi(app, requiresAuthentication, validateCsrfToken)
  mountExternalApi(app, apiLimiter)

  app.use('/bnac/api', apiLimiter, requiresAuthentication, requireScope('admin'), validateCsrfToken, bnacRouter)
})

cds.on('served', async () => {

  // ── HANA: back-fill spatial geoLocation column after first boot ─────────────
  if (!isHanaDb()) return;
  try {
    const db = await cds.connect.to('db');
    await db.run(`UPDATE "BRIDGE_MANAGEMENT_BRIDGES"
      SET "GEOLOCATION" = NEW ST_Point("LONGITUDE", "LATITUDE", 4326)
      WHERE "LATITUDE" IS NOT NULL AND "LONGITUDE" IS NOT NULL AND "GEOLOCATION" IS NULL`);
  } catch (error) {
    // Spatial column may not exist in dev — ignore
  }
});

// ── Hide internal apps from the CDS welcome-page listing ─────────────────────
// bms-admin is tile-only; app/router is the BTP approuter (production only).
// CDS auto-discovers every *.html under app/ — exclude these two so the
// welcome page only shows /fiori-apps.html.
;(function () {
  const _find = cds.utils.find
  cds.utils.find = function (dir, patterns) {
    const results = _find.call(this, dir, patterns)
    return Array.isArray(results)
      ? results.filter(f => !f.includes('bms-admin') && !f.includes('app/router'))
      : results
  }
})()

module.exports = cds.server
