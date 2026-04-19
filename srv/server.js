const cds = require('@sap/cds')
const express = require('express')
const { recordActivity } = require('./user-activity')

const {
  buildCsvTemplate,
  buildWorkbookTemplate,
  getDatasets,
  importUpload,
  validateUpload
} = require('./mass-upload')

const mountAttributesApi = require('./attributes-api')

const { diffRecords, writeChangeLogs, fetchCurrentRecord } = require('./audit-log')

const { getConfigInt } = require('./system-config')
const demoHandler = require('./demo-handler')

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
  const bridge = await db.run(SELECT.one.from('bridge.management.Bridges').columns('ID').where({ ID }))
  if (!bridge) {
    const error = new Error('Bridge not found')
    error.status = 404
    throw error
  }
  return ID
}

async function loadCodeList(entityName) {
  const db = await cds.connect.to('db')
  const rows = await db.run(
    SELECT.from(entityName)
      .columns('code', 'name')
      .orderBy('code')
  )

  return (rows || []).map((row) => ({
    key: row.code,
    text: row.name || row.code
  }))
}

async function loadMassEditLookups() {
  const [
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
  ] = await Promise.all([
    loadCodeList('bridge.management.States'),
    loadCodeList('bridge.management.ConditionStates'),
    loadCodeList('bridge.management.PostingStatuses'),
    loadCodeList('bridge.management.StructureTypes'),
    loadCodeList('bridge.management.ScourRiskLevels'),
    loadCodeList('bridge.management.PbsApprovalClasses'),
    loadCodeList('bridge.management.RestrictionCategories'),
    loadCodeList('bridge.management.RestrictionTypes'),
    loadCodeList('bridge.management.RestrictionStatuses'),
    loadCodeList('bridge.management.RestrictionUnits'),
    loadCodeList('bridge.management.RestrictionDirections'),
    loadCodeList('bridge.management.VehicleClasses')
  ])

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

async function loadDashboardAnalytics() {
  const db = await cds.connect.to('db')

  const [
    totalBridges,
    activeRestrictions,
    closedBridges,
    postedRestrictions,
    scourCritical,
    deficient,
    avgAdequacy,
    conditionDist
  ] = await Promise.all([
    db.run(SELECT.one.from('bridge.management.Bridges').columns('count(1) as cnt')),
    db.run(SELECT.one.from('bridge.management.Restrictions').columns('count(1) as cnt').where({ active: true })),
    db.run(SELECT.one.from('bridge.management.Bridges').columns('count(1) as cnt').where({ postingStatus: 'Closed' })),
    db.run(SELECT.one.from('bridge.management.Restrictions').columns('count(1) as cnt').where({ restrictionStatus: 'Active' })),
    db.run(SELECT.one.from('bridge.management.Bridges').columns('count(1) as cnt').where({ scourRisk: 'High' })),
    db.run(SELECT.one.from('bridge.management.Bridges').columns('count(1) as cnt').where({ condition: { in: ['Poor', 'Critical'] } })),
    db.run(SELECT.one.from('bridge.management.Bridges').columns('avg(structuralAdequacyRating) as avg').where('structuralAdequacyRating is not null')),
    db.run(SELECT.from('bridge.management.Bridges').columns('condition', 'count(1) as cnt').groupBy('condition'))
  ])

  const total = Number(totalBridges?.cnt || 0)

  const conditionMap = {}
  for (const row of (conditionDist || [])) {
    const key = (row.condition || 'Unknown').toLowerCase()
    conditionMap[key] = Number(row.cnt || 0)
  }

  const avgRating = avgAdequacy?.avg ? Number(avgAdequacy.avg) : null
  const sufficiencyPct = avgRating !== null ? Math.round((avgRating / 10) * 100) : 0

  return {
    totalBridges: total,
    activeRestrictions: Number(activeRestrictions?.cnt || 0),
    closedBridges: Number(closedBridges?.cnt || 0),
    postedRestrictions: Number(postedRestrictions?.cnt || 0),
    scourCritical: Number(scourCritical?.cnt || 0),
    deficient: Number(deficient?.cnt || 0),
    sufficiencyPct,
    conditionDistribution: {
      good: conditionMap['good'] || 0,
      fair: conditionMap['fair'] || 0,
      poor: conditionMap['poor'] || 0,
      critical: conditionMap['critical'] || 0,
      total
    }
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
    if (isHanaDb()) {
      const { minLon, minLat, maxLon, maxLat } = bboxParsed
      const bridges = await db.run(
        `SELECT * FROM "BRIDGE_MANAGEMENT_BRIDGES"
         WHERE ST_Within("GEOLOCATION", NEW ST_Rectangle(${minLon}, ${minLat}, ${maxLon}, ${maxLat})) = 1`
      )
      return _mapBridgeRows(bridges, db)
    } else {
      const { minLat, maxLat, minLon, maxLon } = bboxParsed
      query = query
        .where('latitude >=', minLat)
        .and('latitude <=', maxLat)
        .and('longitude >=', minLon)
        .and('longitude <=', maxLon)
    }
  }

  const bridges = await db.run(query)
  return _mapBridgeRows(bridges, db)
}

async function _mapBridgeRows(bridges, db) {
  const restrictionIds = [...new Set(bridges.map((bridge) => bridge.restriction_ID).filter(Boolean))]
  let vehicleClassByRestriction = new Map()

  if (restrictionIds.length) {
    const restrictions = await db.run(
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
        .where({ ID: { in: restrictionIds } })
    )

    vehicleClassByRestriction = new Map(
      restrictions.map((restriction) => [restriction.ID, restriction.appliesToVehicleClass || null])
    )

    var activeRestrictionsByBridgeId = new Map()
    restrictions.forEach((restriction) => {
      if (!restriction.active || !restriction.bridge_ID) return
      if (!activeRestrictionsByBridgeId.has(restriction.bridge_ID)) {
        activeRestrictionsByBridgeId.set(restriction.bridge_ID, [])
      }
      activeRestrictionsByBridgeId.get(restriction.bridge_ID).push({
        name: restriction.name || restriction.restrictionType || 'Restriction',
        restrictionType: restriction.restrictionType || null,
        restrictionValue: restriction.restrictionValue || null,
        restrictionUnit: restriction.restrictionUnit || null,
        restrictionStatus: restriction.restrictionStatus || null,
        remarks: restriction.remarks || null
      })
    })
  }

  const restrictionsByBridgeId = typeof activeRestrictionsByBridgeId === 'undefined'
    ? new Map()
    : activeRestrictionsByBridgeId

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

function buildBridgesCsv(bridges, attrCols = [], attrValues = new Map()) {
  const FIELDS = ['ID','bridgeId','bridgeName','state','latitude','longitude','postingStatus',
    'conditionRating','yearBuilt','structureType','route','region','clearanceHeight','spanLength',
    'assetOwner','scourRisk','nhvrAssessed','freightRoute','overMassRoute','hmlApproved','bDoubleApproved'];
  const attrHeaders = attrCols.map(c => c.label);
  const header = [...FIELDS, ...attrHeaders].join(',');
  const rows = bridges.map(b => {
    const objVals = attrValues.get(String(b.ID)) || new Map();
    const coreVals = FIELDS.map(f => {
      const v = b[f];
      if (v == null) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g,'""') + '"' : s;
    });
    const attrVals = attrCols.map(c => {
      const v = objVals.get(c.key) || '';
      const s = String(v);
      return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g,'""') + '"' : s;
    });
    return [...coreVals, ...attrVals].join(',');
  });
  return header + '\n' + rows.join('\n');
}

function buildRestrictionsCsv(restrictions, attrCols = [], attrValues = new Map()) {
  const FIELDS = ['ID','restrictionRef','bridgeRef','bridgeName','state','restrictionType',
    'restrictionCategory','restrictionValue','restrictionUnit','restrictionStatus',
    'grossMassLimit','axleMassLimit','heightLimit','widthLimit','lengthLimit','speedLimit',
    'permitRequired','escortRequired','effectiveFrom','effectiveTo','approvedBy','direction'];
  const attrHeaders = attrCols.map(c => c.label);
  const header = [...FIELDS, ...attrHeaders].join(',');
  const rows = restrictions.map(r => {
    const objVals = attrValues.get(String(r.ID)) || new Map();
    const coreVals = FIELDS.map(f => {
      const v = r[f];
      if (v == null) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g,'""') + '"' : s;
    });
    const attrVals = attrCols.map(c => {
      const v = objVals.get(c.key) || '';
      const s = String(v);
      return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g,'""') + '"' : s;
    });
    return [...coreVals, ...attrVals].join(',');
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
        WHERE "LATITUDE" BETWEEN ${minLat} AND ${maxLat}
          AND "LONGITUDE" BETWEEN ${minLon} AND ${maxLon}
          AND "LATITUDE" IS NOT NULL AND "LONGITUDE" IS NOT NULL
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
        WHERE latitude BETWEEN ${minLat} AND ${maxLat}
          AND longitude BETWEEN ${minLon} AND ${maxLon}
          AND latitude IS NOT NULL AND longitude IS NOT NULL
        GROUP BY ROUND(latitude / ${cellSize}), ROUND(longitude / ${cellSize})
      `;
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

  const rows = await db.run(query);
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
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
    bridges = await db.run(`
      SELECT "ID","bridgeId","bridgeName","state","latitude","longitude",
             "postingStatus","conditionRating","structureType","route","region",
             "clearanceHeight","spanLength","nhvrAssessed","scourRisk",
             "geoLocation".ST_Distance(NEW ST_Point(${lngN}, ${latN}, 4326), 'meter') / 1000 AS "distanceKm"
      FROM "BRIDGE_MANAGEMENT_BRIDGES"
      WHERE "LATITUDE" BETWEEN ${minLat} AND ${maxLat}
        AND "LONGITUDE" BETWEEN ${minLon} AND ${maxLon}
        AND "LATITUDE" IS NOT NULL AND "LONGITUDE" IS NOT NULL
        AND "geoLocation".ST_Distance(NEW ST_Point(${lngN}, ${latN}, 4326), 'meter') / 1000 <= ${radN}
      ORDER BY "distanceKm"
    `);
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
      .sort((a, b) => a.distanceKm - b.distanceKm);
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

  router.use(express.json({ limit: '25mb' })) // configurable via SystemConfig.massUploadMaxMb

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
      const { fileName, contentBase64, dataset } = req.body || {}
      if (!fileName) {
        return res.status(400).json({ error: { message: 'fileName is required' } })
      }
      if (!contentBase64) {
        return res.status(400).json({ error: { message: 'File content is empty' } })
      }
      const buffer = Buffer.from(contentBase64, 'base64')
      const result = await importUpload({
        buffer,
        fileName,
        datasetName: dataset,
        uploadedBy: req.user?.id || req.headers['x-user-name'] || 'system'
      })
      res.json(result)
    } catch (error) {
      res.status(422).json({ error: { message: error.message || 'Upload failed' } })
    }
  })

  router.post('/validate', async (req, res) => {
    try {
      const { fileName, contentBase64, dataset } = req.body || {}
      if (!fileName) {
        return res.status(400).json({ error: { message: 'fileName is required' } })
      }
      if (!contentBase64) {
        return res.status(400).json({ error: { message: 'File content is empty' } })
      }
      const buffer = Buffer.from(contentBase64, 'base64')
      const result = await validateUpload({
        buffer,
        fileName,
        datasetName: dataset
      })
      res.json(result)
    } catch (error) {
      res.status(422).json({ error: { message: error.message || 'Validation failed' } })
    }
  })

  app.use('/mass-upload/api', router)

  // Dashboard analytics API
  const dashboardRouter = express.Router()

  dashboardRouter.get('/analytics', async (_req, res) => {
    try {
      const data = await loadDashboardAnalytics()
      res.json(data)
    } catch (error) {
      res.status(500).json({ error: { message: error.message || 'Failed to load analytics' } })
    }
  })

  app.use('/dashboard/api', dashboardRouter)

  const mapRouter = express.Router()

  mapRouter.get('/bridges', async (req, res) => {
    try {
      const bridges = await loadMapBridges({ bbox: req.query.bbox })
      res.json({ bridges })
    } catch (error) {
      res.status(500).json({ error: { message: error.message || 'Failed to load bridge map data' } })
    }
  })

  mapRouter.get('/restrictions', async (req, res) => {
    try {
      const restrictions = await loadMapRestrictions({ bbox: req.query.bbox });
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
          for (const v of allVals) {
            if (!attrValues.has(v.objectId)) attrValues.set(v.objectId, new Map());
            attrValues.get(v.objectId).set(v.attributeKey, v.valueText ?? v.valueInteger ?? v.valueDecimal ?? v.valueDate ?? v.valueBoolean ?? '');
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
          geometry: b.geoJson ? JSON.parse(b.geoJson) : { type: 'Point', coordinates: [b.longitude, b.latitude] },
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
      const bridges = await loadProximityBridges({ lat, lng, radiusKm: radius || 10 });
      res.json({ bridges, searchCenter: { lat: Number(lat), lng: Number(lng) }, radiusKm: Number(radius || 10) });
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
          enableScaleBar: true, enableNorthArrow: true, enableGps: true,
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

  app.use('/map/api', mapRouter)

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
      const user = req.user?.id || req.headers['x-user-name'] || 'system'
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
      const user = req.user?.id || req.headers['x-user-name'] || 'system'
      const result = await saveMassEditRestrictions(updates, { user })
      res.json(result)
    } catch (error) {
      res.status(422).json({ error: { message: error.message || 'Failed to save restriction updates' } })
    }
  })

  app.use('/mass-edit/api', massEditRouter)
  mountAttributesApi(app)

  // ── Audit Report API ─────────────────────────────────────────────────────
  const auditRouter = express.Router()

  auditRouter.get('/changes', async (req, res) => {
    try {
      const db = await cds.connect.to('db')
      const { objectType, objectId, user: changedBy, source, from, to, batchId } = req.query

      const maxRows = await getConfigInt('maxExportRows', 5000)
      let query = SELECT.from('bridge.management.ChangeLog')
        .columns('ID','changedAt','changedBy','objectType','objectId','objectName',
                 'fieldName','oldValue','newValue','changeSource','batchId')
        .orderBy('changedAt desc', 'objectType', 'objectId', 'batchId')
        .limit(maxRows)

      const filters = []
      if (objectType) filters.push({ objectType })
      if (objectId)   filters.push({ objectId })
      if (changedBy)  filters.push({ changedBy })
      if (source)     filters.push({ changeSource: source })
      if (batchId)    filters.push({ batchId })

      for (const filter of filters) {
        query = query.where(filter)
      }
      if (from) query = query.where('changedAt >=', new Date(from).toISOString())
      if (to)   query = query.where('changedAt <=', new Date(to + 'T23:59:59Z').toISOString())

      const rows = await db.run(query)
      res.json({ changes: rows || [] })
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

  app.use('/audit/api', auditRouter)

  // ── User Access API ───────────────────────────────────────────────────────
  const accessRouter = express.Router()

  accessRouter.get('/activity', async (_req, res) => {
    try {
      const db = await cds.connect.to('db')
      const users = await db.run(
        SELECT.from('bridge.management.UserActivity')
          .orderBy('lastSeenAt desc')
          .limit(200)
      )
      res.json({ users: users || [] })
    } catch (e) {
      res.status(500).json({ error: { message: e.message } })
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
    } catch (e) {
      res.status(500).json({ error: { message: e.message } })
    }
  })

  app.use('/access/api', accessRouter)

  // ── Data Quality API ──────────────────────────────────────────────────────
  const qualityRouter = express.Router()

  // Fields used for completeness scoring (13 key fields)
  const QUALITY_COMPLETENESS_FIELDS = [
    'bridgeName', 'bridgeId', 'state', 'region', 'assetOwner',
    'latitude', 'longitude', 'structureType', 'condition',
    'conditionRating', 'postingStatus', 'lastInspectionDate', 'geoJson'
  ]

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

  function execRule(rule, bridge, ctx) {
    const { ruleType, field, _cfg } = rule
    switch (ruleType) {
      case 'required_field': {
        const v = bridge[field]
        return v == null || (typeof v === 'string' && v.trim() === '')
      }
      case 'non_zero': {
        const v = Number(bridge[field])
        return bridge[field] == null || !Number.isFinite(v) || v === 0
      }
      case 'not_older_than_days': {
        if (!bridge[field]) return false // required_field handles the null case
        const ms = (_cfg.days || 730) * 24 * 60 * 60 * 1000
        return Date.now() - new Date(bridge[field]).getTime() > ms
      }
      case 'condition_requires_restriction': {
        const conditions = _cfg.conditions || ['Poor', 'Critical']
        if (!conditions.includes(bridge.condition)) return false
        return !ctx.activeRestrictionBridgeIds.has(bridge.ID)
      }
      case 'freight_requires_nhvr': {
        return !!(bridge.freightRoute && !bridge.nhvrAssessed)
      }
      default:
        return false
    }
  }

  function evaluateBridgeIssues(bridge, activeRestrictionBridgeIds, rules) {
    const ctx = { activeRestrictionBridgeIds }
    return rules
      .filter(rule => execRule(rule, bridge, ctx))
      .map(rule => ({
        category: rule.category,
        severity: rule.severity,
        message:  rule.message
      }))
  }

  function calcCompletenessScore(bridge) {
    const populated = QUALITY_COMPLETENESS_FIELDS.filter(f => {
      const v = bridge[f]
      if (v == null) return false
      if (typeof v === 'string' && v.trim() === '') return false
      if (f === 'latitude' || f === 'longitude') return Number(v) !== 0 && Number.isFinite(Number(v))
      return true
    })
    return Math.round((populated.length / QUALITY_COMPLETENESS_FIELDS.length) * 100)
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

      const categoryCountMap = {}
      let issueCount = 0
      let criticalCount = 0
      let warningCount = 0
      let totalCompleteness = 0

      for (const bridge of bridges) {
        const issues = evaluateBridgeIssues(bridge, activeRestrictionBridgeIds, rules)
        totalCompleteness += calcCompletenessScore(bridge)
        if (issues.length > 0) issueCount++
        for (const issue of issues) {
          if (issue.severity === 'critical') criticalCount++
          else if (issue.severity === 'warning') warningCount++
          categoryCountMap[issue.category] = (categoryCountMap[issue.category] || 0) + 1
        }
      }

      const total = bridges.length
      const completenessPercent = total > 0 ? Math.round(totalCompleteness / total) : 0
      const byCategory = Object.entries(categoryCountMap)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)

      res.json({
        totalBridges: total,
        issueCount,
        completenessPercent,
        criticalCount,
        warningCount,
        byCategory
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
          completenessScore: calcCompletenessScore(bridge)
        }
      }).filter(b => b.issueCount > 0)

      // Apply filters
      if (severity) {
        const sev = severity.toLowerCase()
        results = results.filter(b =>
          b.issues.some(i => i.severity === sev) || b.maxSeverity === sev
        )
      }
      if (state) {
        const st = state.toUpperCase()
        results = results.filter(b => (b.state || '').toUpperCase() === st)
      }
      if (name) {
        const needle = name.toLowerCase()
        results = results.filter(b =>
          (b.bridgeName || '').toLowerCase().includes(needle) ||
          (b.bridgeId || '').toLowerCase().includes(needle)
        )
      }

      // Sort: critical first, then by issue count desc
      results.sort((a, b) => {
        const sevOrder = { critical: 0, warning: 1, info: 2, none: 3 }
        const diff = (sevOrder[a.maxSeverity] || 3) - (sevOrder[b.maxSeverity] || 3)
        return diff !== 0 ? diff : b.issueCount - a.issueCount
      })

      res.json({ bridges: results })
    } catch (error) {
      res.status(500).json({ error: { message: error.message || 'Failed to load quality issues' } })
    }
  })

  app.use('/quality/api', qualityRouter)

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
    } catch (e) { res.status(500).json({ error: { message: e.message } }) }
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
    } catch (e) { res.status(500).json({ error: { message: e.message } }) }
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
    } catch (e) { res.status(500).json({ error: { message: e.message } }) }
  })

  app.use('/system/api', sysRouter)

  // ── Admin Bridges attachment API ─────────────────────────────────────────
  const adminBridgeRouter = express.Router()
  adminBridgeRouter.use(express.json({ limit: '100mb' }))

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

  app.use('/admin-bridges/api', adminBridgeRouter)

  // ── BNAC Integration Config ─────────────────────────────────────────────
  const bnacRouter = express.Router()
  bnacRouter.use(express.json({ limit: '10mb' }))

  // GET all environments
  bnacRouter.get('/environments', async (_req, res) => {
    try {
      const db = await cds.connect.to('db')
      const rows = await db.run(SELECT.from('bridge.management.BnacEnvironment').orderBy('environment'))
      res.json({ environments: rows || [] })
    } catch (e) { res.status(500).json({ error: { message: e.message } }) }
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
    } catch (e) { res.status(500).json({ error: { message: e.message } }) }
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
    } catch (e) { res.status(500).json({ error: { message: e.message } }) }
  })

  // DELETE environment
  bnacRouter.delete('/environments/:env', async (req, res) => {
    try {
      const env = req.params.env.toUpperCase()
      const db = await cds.connect.to('db')
      await db.run(DELETE.from('bridge.management.BnacEnvironment').where({ environment: env }))
      res.json({ success: true })
    } catch (e) { res.status(500).json({ error: { message: e.message } }) }
  })

  // GET load history
  bnacRouter.get('/history', async (_req, res) => {
    try {
      const db = await cds.connect.to('db')
      const rows = await db.run(SELECT.from('bridge.management.BnacLoadHistory').orderBy('loadedAt desc').limit(100))
      res.json({ history: rows || [] })
    } catch (e) { res.status(500).json({ error: { message: e.message } }) }
  })

  // GET object ID mappings (for a bridge)
  bnacRouter.get('/mapping/:bridgeId', async (req, res) => {
    try {
      const db = await cds.connect.to('db')
      const row = await db.run(SELECT.one.from('bridge.management.BnacObjectIdMap').where({ bridgeId: req.params.bridgeId }))
      res.json({ mapping: row || null })
    } catch (e) { res.status(500).json({ error: { message: e.message } }) }
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
      } catch (e) {
        await tx.rollback()
        throw e
      }
    } catch (e) { res.status(500).json({ error: { message: e.message } }) }
  })

  app.use('/bnac/api', bnacRouter)
})

cds.on('served', async () => {
  // ── Register demo mode action handlers on AdminService ──────────────────────
  // cds.services is populated once all OData services are fully served.
  // Using 'served' (not 'connect') ensures the service object exists.
  const adminSrv = cds.services['AdminService'];
  if (adminSrv) demoHandler(adminSrv);

  // ── HANA: back-fill spatial geoLocation column after first boot ─────────────
  if (!isHanaDb()) return;
  try {
    const db = await cds.connect.to('db');
    await db.run(`UPDATE "BRIDGE_MANAGEMENT_BRIDGES"
      SET "GEOLOCATION" = NEW ST_Point("LONGITUDE", "LATITUDE", 4326)
      WHERE "LATITUDE" IS NOT NULL AND "LONGITUDE" IS NOT NULL AND "GEOLOCATION" IS NULL`);
  } catch (e) {
    // Spatial column may not exist in dev — ignore
  }
});

// ── Hide /bms-admin/webapp from the CDS welcome-page listing ────────────────
// bms-admin is accessed via its Fiori tile only.  CDS auto-discovers it
// because index.html exists on disk.  Patch cds.utils.find once so it is
// excluded from the web-app link scan in @sap/cds/app/index.js.
;(function () {
  const _find = cds.utils.find
  cds.utils.find = function (dir, patterns) {
    const results = _find.call(this, dir, patterns)
    return Array.isArray(results)
      ? results.filter(f => !f.includes('bms-admin'))
      : results
  }
})()

module.exports = cds.server
