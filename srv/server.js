const cds = require('@sap/cds')
const express = require('express')

const {
  buildCsvTemplate,
  buildWorkbookTemplate,
  getDatasets,
  importUpload
} = require('./mass-upload')

const { SELECT, UPDATE } = cds.ql

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

async function saveMassEditBridges(updates) {
  const db = await cds.connect.to('db')
  const tx = db.tx()
  let updated = 0

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

      await tx.run(
        UPDATE('bridge.management.Bridges')
          .set(patch)
          .where({ ID: id })
      )
      updated += 1
    }

    await tx.commit()
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

async function saveMassEditRestrictions(updates) {
  const db = await cds.connect.to('db')
  const tx = db.tx()
  let updated = 0

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

      await tx.run(
        UPDATE('bridge.management.Restrictions')
          .set(patch)
          .where({ ID: id })
      )
      updated += 1
    }

    await tx.commit()
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

function buildBridgesCsv(bridges) {
  const FIELDS = ['ID','bridgeId','bridgeName','state','latitude','longitude','postingStatus',
    'conditionRating','yearBuilt','structureType','route','region','clearanceHeight','spanLength',
    'assetOwner','scourRisk','nhvrAssessed','freightRoute','overMassRoute','hmlApproved','bDoubleApproved'];
  const header = FIELDS.join(',');
  const rows = bridges.map(b => FIELDS.map(f => {
    const v = b[f];
    if (v == null) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g,'""') + '"' : s;
  }).join(','));
  return header + '\n' + rows.join('\n');
}

function buildRestrictionsCsv(restrictions) {
  const FIELDS = ['ID','restrictionRef','bridgeRef','bridgeName','state','restrictionType',
    'restrictionCategory','restrictionValue','restrictionUnit','restrictionStatus',
    'grossMassLimit','axleMassLimit','heightLimit','widthLimit','lengthLimit','speedLimit',
    'permitRequired','escortRequired','effectiveFrom','effectiveTo','approvedBy','direction'];
  const header = FIELDS.join(',');
  const rows = restrictions.map(r => FIELDS.map(f => {
    const v = r[f];
    if (v == null) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g,'""') + '"' : s;
  }).join(','));
  return header + '\n' + rows.join('\n');
}

cds.on('bootstrap', (app) => {
  const router = express.Router()

  router.use(express.json({ limit: '25mb' }))

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
        datasetName: dataset
      })
      res.json(result)
    } catch (error) {
      res.status(422).json({ error: { message: error.message || 'Upload failed' } })
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

      if (layer === 'restrictions') {
        const restrictions = await loadMapRestrictions({ bbox });
        if (format === 'csv') {
          const csv = buildRestrictionsCsv(restrictions);
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
      if (format === 'csv') {
        const csv = buildBridgesCsv(bridges);
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
      const result = await saveMassEditBridges(updates)
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
      const result = await saveMassEditRestrictions(updates)
      res.json(result)
    } catch (error) {
      res.status(422).json({ error: { message: error.message || 'Failed to save restriction updates' } })
    }
  })

  app.use('/mass-edit/api', massEditRouter)
})

cds.on('served', async () => {
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

module.exports = cds.server
