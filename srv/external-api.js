const cds = require('@sap/cds')
const express = require('express')
const { SELECT } = cds.ql

const IS_DEV = !process.env.VCAP_SERVICES

const CORE_FIELDS = [
  'bridgeId', 'bridgeName', 'state', 'region', 'lga', 'route', 'routeNumber',
  'structureType', 'material', 'yearBuilt', 'designLoad', 'assetOwner', 'managingAuthority',
  'conditionRating', 'condition', 'postingStatus', 'latitude', 'longitude', 'location',
  'totalLength', 'deckWidth', 'spanCount', 'numberOfLanes', 'clearanceHeight',
  'averageDailyTraffic', 'heavyVehiclePercent', 'nhvrAssessed', 'freightRoute',
  'highPriorityAsset', 'importanceLevel', 'lastInspectionDate', 'nextInspectionDue', 'isActive'
]

const ALL_BRIDGE_FIELDS = [...CORE_FIELDS,
  'assetClass', 'designStandard', 'spanLength',
  'structuralAdequacyRating', 'conditionStandard', 'seismicZone', 'floodImmunityAriYears',
  'floodImpacted', 'scourRisk', 'pbsApprovalClass', 'hmlApproved', 'bDoubleApproved',
  'overMassRoute', 'gazetteReference', 'remarks', 'status'
]

const ALL_BRIDGE_FIELDS_SET = new Set(ALL_BRIDGE_FIELDS)

const INCLUDE_MAP = {
  inspections: {
    entity: 'bridge.management.BridgeInspections',
    fk: 'bridge_ID',
    fields: [
      'inspectionRef', 'inspectionDate', 'inspectionType', 'inspector',
      'inspectorAccreditationLevel', 'overallConditionRating', 'criticalFindings',
      'recommendedActions', 'nextInspectionRecommended', 'active'
    ]
  },
  defects: {
    entity: 'bridge.management.BridgeDefects',
    fk: 'bridge_ID',
    fields: [
      'defectId', 'defectType', 'defectDescription', 'bridgeElement',
      'severity', 'urgency', 'remediationStatus', 'maintenancePriority', 'active'
    ]
  },
  risks: {
    entity: 'bridge.management.BridgeRiskAssessments',
    fk: 'bridge_ID',
    fields: [
      'assessmentId', 'assessmentDate', 'riskCategory', 'riskType', 'riskDescription',
      'likelihood', 'consequence', 'inherentRiskScore', 'inherentRiskLevel',
      'existingControls', 'residualLikelihood', 'residualConsequence',
      'residualRiskScore', 'residualRiskLevel', 'riskRegisterStatus',
      'treatmentStatus', 'reviewDueDate', 'active'
    ]
  },
  surveys: {
    entity: 'bridge.management.BridgeConditionSurveys',
    fk: 'bridge_ID',
    fields: [
      'surveyRef', 'surveyDate', 'surveyType', 'surveyedBy',
      'conditionRating', 'structuralRating', 'overallGrade', 'status', 'notes', 'active'
    ]
  },
  loadRatings: {
    entity: 'bridge.management.BridgeLoadRatings',
    fk: 'bridge_ID',
    fields: [
      'ratingRef', 'vehicleClass', 'ratingMethod', 'ratingFactor', 'grossMassLimit',
      'assessedBy', 'assessmentDate', 'validTo', 'governingMember', 'status', 'active'
    ]
  },
  nhvr: {
    entity: 'bridge.management.NhvrRouteAssessments',
    fk: 'bridge_ID',
    fields: [
      'assessmentId', 'assessorName', 'assessmentDate', 'assessmentStatus',
      'approvedVehicleClasses', 'validFrom', 'validTo', 'nextReviewDate', 'notes'
    ]
  },
  certificates: {
    entity: 'bridge.management.LoadRatingCertificates',
    fk: 'bridge_ID',
    fields: [
      'certificateNumber', 'certificateVersion', 'status', 'ratingStandard', 'ratingLevel',
      'rfT44', 'rfSM1600', 'certifyingEngineer', 'certificateIssueDate',
      'certificateExpiryDate', 'governingMember'
    ]
  },
  permits: {
    entity: 'bridge.management.BridgePermits',
    fk: 'bridge_ID',
    fields: [
      'permitRef', 'permitType', 'applicantName', 'vehicleClass', 'grossMass',
      'appliedDate', 'validFrom', 'validTo', 'status', 'decisionBy', 'active'
    ]
  },
  scour: {
    entity: 'bridge.management.BridgeScourAssessments',
    fk: 'bridge_ID',
    fields: [
      'assessmentDate', 'assessmentType', 'scourRisk', 'measuredDepth',
      'mitigationStatus', 'assessor', 'waterwayType', 'foundationType',
      'criticalScourDepthM', 'postFloodInspectionRequired'
    ]
  },
  capacities: {
    entity: 'bridge.management.BridgeCapacities',
    fk: 'bridge_ID',
    fields: [
      'capacityType', 'grossMassLimit', 'steerAxleLimit', 'singleAxleLimit',
      'tandemGroupLimit', 'triAxleGroupLimit', 'minClearancePosted',
      'ratingStandard', 'ratingFactor', 'ratingDate', 'nextReviewDue',
      'capacityStatus', 'effectiveFrom'
    ]
  },
  maintenance: {
    entity: 'bridge.management.BridgeMaintenanceActions',
    fk: 'bridge_ID',
    fields: [
      'actionRef', 'actionType', 'priority', 'status', 'actionTitle',
      'workDescription', 'estimatedCostAUD', 'scheduledDate', 'completedDate', 'active'
    ]
  },
  assetiq: {
    entity: 'bridge.management.AssetIQScores',
    fk: 'bridge_ID',
    fields: [
      'overallScore', 'ragStatus', 'bciFactor', 'ageFactor', 'trafficFactor',
      'defectFactor', 'loadFactor', 'modelVersion', 'scoredAt'
    ]
  },
  alerts: {
    entity: 'bridge.management.AlertsAndNotifications',
    fk: 'bridge_ID',
    fields: [
      'alertType', 'alertTitle', 'alertDescription', 'severity',
      'priority', 'triggeredDate', 'dueDate', 'status'
    ]
  }
}

const VALID_INCLUDES = new Set(Object.keys(INCLUDE_MAP))

const ALLOWED_STRING_FILTERS = new Set([
  'state', 'region', 'lga', 'postingStatus', 'assetOwner', 'managingAuthority',
  'structureType', 'material', 'condition', 'scourRisk', 'assetClass', 'status'
])

const SCHEMA = {
  version: '1.0',
  description: 'BMS Bridge Management System External API',
  endpoints: {
    'GET /health': 'Health check — no auth required',
    'GET /schema': 'API schema — no auth required',
    'GET /bridges': 'List bridges with optional field selection and sub-domain includes',
    'GET /bridges/:bridgeId': 'Single bridge by bridgeId',
    'GET /bridges/:bridgeId/sub/:domain': 'All records for a specific sub-domain for a bridge'
  },
  availableFields: {
    bridge: ALL_BRIDGE_FIELDS,
    ...Object.fromEntries(
      Object.entries(INCLUDE_MAP).map(([k, v]) => [k, v.fields])
    )
  },
  availableIncludes: [...VALID_INCLUDES],
  availableFilters: [
    'state', 'region', 'lga', 'postingStatus', 'assetOwner', 'managingAuthority',
    'structureType', 'material', 'condition', 'scourRisk', 'assetClass', 'status',
    'conditionRating_min', 'conditionRating_max',
    'yearBuilt_min', 'yearBuilt_max',
    'highPriorityAsset', 'nhvrAssessed', 'isActive',
    '$top (max 500)', '$skip'
  ]
}

async function validateApiKey(req, db) {
  const providedKey = req.headers['x-api-key']
  if (!providedKey) return false
  const config = await db.run(
    SELECT.one.from('bridge.management.SystemConfig')
      .where({ category: 'ExternalApiKeys', value: providedKey })
  )
  return !!config
}

function parseIncludes(raw) {
  if (!raw) return []
  return raw.split(',').map(s => s.trim()).filter(s => VALID_INCLUDES.has(s))
}

function parseFields(raw) {
  if (!raw) return CORE_FIELDS
  const requested = raw.split(',').map(s => s.trim()).filter(s => ALL_BRIDGE_FIELDS_SET.has(s))
  return requested.length ? requested : CORE_FIELDS
}

function buildBridgeFilters(query) {
  const filters = {}

  for (const key of ALLOWED_STRING_FILTERS) {
    if (query[key] !== undefined) {
      filters[key] = String(query[key]).slice(0, 255)
    }
  }

  for (const boolKey of ['highPriorityAsset', 'nhvrAssessed', 'isActive']) {
    if (query[boolKey] !== undefined) {
      const v = String(query[boolKey]).toLowerCase()
      if (v === 'true' || v === '1') filters[boolKey] = true
      else if (v === 'false' || v === '0') filters[boolKey] = false
    }
  }

  return filters
}

function applyRangeFilters(q, query) {
  for (const [paramMin, paramMax, field] of [
    ['conditionRating_min', 'conditionRating_max', 'conditionRating'],
    ['yearBuilt_min', 'yearBuilt_max', 'yearBuilt']
  ]) {
    const min = query[paramMin] !== undefined ? parseInt(query[paramMin], 10) : null
    const max = query[paramMax] !== undefined ? parseInt(query[paramMax], 10) : null
    if (min !== null && !isNaN(min)) q = q.and({ [field]: { '>=': min } })
    if (max !== null && !isNaN(max)) q = q.and({ [field]: { '<=': max } })
  }
  return q
}

async function fetchSubdomainBatch(db, includes, bridgeIds) {
  if (!includes.length || !bridgeIds.length) return {}
  const results = {}
  await Promise.all(
    includes.map(async inc => {
      const { entity, fk, fields } = INCLUDE_MAP[inc]
      const rows = await db.run(
        SELECT.from(entity).columns(...fields, fk).where({ [fk]: { in: bridgeIds } })
      )
      const byBridge = {}
      for (const row of rows) {
        const bid = row[fk]
        if (!byBridge[bid]) byBridge[bid] = []
        const clean = {}
        for (const f of fields) {
          if (row[f] !== undefined) clean[f] = row[f]
        }
        byBridge[bid].push(clean)
      }
      results[inc] = byBridge
    })
  )
  return results
}

async function fetchCustomAttributes(db, bridgeIds) {
  const rows = await db.run(
    SELECT.from('bridge.management.AttributeValues')
      .columns('objectId', 'attributeKey', 'valueText', 'valueInteger', 'valueDecimal', 'valueDate', 'valueBoolean')
      .where({ objectType: 'Bridge', objectId: { in: bridgeIds.map(String) } })
  )
  const byBridge = {}
  for (const row of rows) {
    if (!byBridge[row.objectId]) byBridge[row.objectId] = {}
    const val = row.valueText ?? row.valueInteger ?? row.valueDecimal ?? row.valueDate ?? row.valueBoolean
    byBridge[row.objectId][row.attributeKey] = val
  }
  return byBridge
}

function assembleBridgeResponse(bridges, includes, includeData, attrData, wantCustomAttrs) {
  return bridges.map(b => {
    const obj = { ...b }
    for (const inc of includes) {
      obj[inc] = (includeData[inc] && includeData[inc][b.ID]) || []
    }
    if (wantCustomAttrs) {
      obj.customAttributes = (attrData && attrData[String(b.ID)]) || {}
    }
    delete obj.ID
    return obj
  })
}

function authMiddleware(db) {
  return async (req, res, next) => {
    if (IS_DEV) {
      res.set('X-BMS-Warning', 'API key validation disabled in development mode')
      return next()
    }
    const valid = await validateApiKey(req, db)
    if (!valid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Provide a valid API key in the X-API-Key header'
      })
    }
    next()
  }
}

module.exports = function mountExternalApi(app, apiLimiter, requiresAuthentication) {
  const router = express.Router()
  const db = cds.db || cds.connect.to('db')

  const resolveDb = async () => {
    if (cds.db) return cds.db
    return cds.connect.to('db')
  }

  const withDb = fn => async (req, res) => {
    try {
      const resolvedDb = await resolveDb()
      await fn(req, res, resolvedDb)
    } catch (err) {
      res.status(500).json({ error: 'Internal server error', message: err.message })
    }
  }

  const auth = async (req, res, next) => {
    if (IS_DEV) {
      res.set('X-BMS-Warning', 'API key validation disabled in development mode')
      return next()
    }
    try {
      const resolvedDb = await resolveDb()
      const valid = await validateApiKey(req, resolvedDb)
      if (!valid) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Provide a valid API key in the X-API-Key header'
        })
      }
      next()
    } catch (err) {
      res.status(500).json({ error: 'Internal server error', message: err.message })
    }
  }

  router.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'BMS External API v1', timestamp: new Date().toISOString() })
  })

  router.get('/schema', (req, res) => {
    res.json(SCHEMA)
  })

  router.get('/bridges', auth, withDb(async (req, res, db) => {
    const fields = parseFields(req.query.fields)
    const includes = parseIncludes(req.query.include)
    const wantCustomAttrs = req.query.customAttributes === 'true'

    const top = Math.min(Math.max(parseInt(req.query['$top'] || '100', 10) || 100, 1), 500)
    const skip = Math.max(parseInt(req.query['$skip'] || '0', 10) || 0, 0)

    const staticFilters = buildBridgeFilters(req.query)

    let q = SELECT.from('bridge.management.Bridges')
      .columns(...fields, 'ID')
      .where(staticFilters)
      .limit(top, skip)
      .orderBy('bridgeId')

    q = applyRangeFilters(q, req.query)

    const bridges = await db.run(q)

    const totalQ = SELECT.from('bridge.management.Bridges').columns('count(1) as total').where(staticFilters)
    const totalResult = await db.run(applyRangeFilters(totalQ, req.query))
    const total = totalResult[0]?.total ?? bridges.length

    const bridgeIds = bridges.map(b => b.ID)
    const [includeData, attrData] = await Promise.all([
      fetchSubdomainBatch(db, includes, bridgeIds),
      wantCustomAttrs ? fetchCustomAttributes(db, bridgeIds) : Promise.resolve(null)
    ])

    const data = assembleBridgeResponse(bridges, includes, includeData, attrData, wantCustomAttrs)

    res.json({
      meta: {
        service: 'BMS External API v1',
        timestamp: new Date().toISOString(),
        total,
        returned: data.length,
        fields,
        includes,
        customAttributes: wantCustomAttrs
      },
      data
    })
  }))

  router.get('/bridges/:bridgeId', auth, withDb(async (req, res, db) => {
    const bridgeId = String(req.params.bridgeId).slice(0, 80)
    const fields = parseFields(req.query.fields)
    const includes = parseIncludes(req.query.include)
    const wantCustomAttrs = req.query.customAttributes === 'true'

    const bridges = await db.run(
      SELECT.from('bridge.management.Bridges')
        .columns(...fields, 'ID')
        .where({ bridgeId })
    )

    if (!bridges.length) {
      return res.status(404).json({ error: 'Not found', message: `No bridge found with bridgeId '${bridgeId}'` })
    }

    const bridge = bridges[0]
    const bridgeIds = [bridge.ID]

    const [includeData, attrData] = await Promise.all([
      fetchSubdomainBatch(db, includes, bridgeIds),
      wantCustomAttrs ? fetchCustomAttributes(db, bridgeIds) : Promise.resolve(null)
    ])

    const [record] = assembleBridgeResponse([bridge], includes, includeData, attrData, wantCustomAttrs)

    res.json({
      meta: {
        service: 'BMS External API v1',
        timestamp: new Date().toISOString(),
        total: 1,
        returned: 1,
        fields,
        includes,
        customAttributes: wantCustomAttrs
      },
      data: record
    })
  }))

  router.get('/bridges/:bridgeId/sub/:domain', auth, withDb(async (req, res, db) => {
    const bridgeId = String(req.params.bridgeId).slice(0, 80)
    const domain = String(req.params.domain)

    if (!VALID_INCLUDES.has(domain)) {
      return res.status(400).json({
        error: 'Invalid domain',
        message: `Unknown sub-domain '${domain}'. Valid domains: ${[...VALID_INCLUDES].join(', ')}`
      })
    }

    const bridge = await db.run(
      SELECT.one.from('bridge.management.Bridges').columns('ID', 'bridgeId', 'bridgeName').where({ bridgeId })
    )

    if (!bridge) {
      return res.status(404).json({ error: 'Not found', message: `No bridge found with bridgeId '${bridgeId}'` })
    }

    const { entity, fk, fields } = INCLUDE_MAP[domain]
    const rows = await db.run(
      SELECT.from(entity).columns(...fields).where({ [fk]: bridge.ID })
    )

    res.json({
      meta: {
        service: 'BMS External API v1',
        timestamp: new Date().toISOString(),
        bridgeId: bridge.bridgeId,
        bridgeName: bridge.bridgeName,
        domain,
        returned: rows.length
      },
      data: rows
    })
  }))

  const authMiddleware = requiresAuthentication || ((req, res, next) => next())
  app.use('/api/v1', apiLimiter, authMiddleware, router)
}
