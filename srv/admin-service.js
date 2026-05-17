const cds = require('@sap/cds')
const { diffRecords, writeChangeLogs, fetchCurrentRecord } = require('./audit-log')
const { computeBhiBsi } = require('./bhi-bsi-engine')
const { isFeatureEnabled } = require('./feature-flags')

module.exports = class AdminService extends cds.ApplicationService { init() {

  const { Bridges, Restrictions, BridgeRestrictions, BridgeCapacities, BridgeScourAssessments } = this.entities

  const bridgeIdFor = (ID, state) => {
    const stateMap = { NSW:'NSW', VIC:'VIC', QLD:'QLD', WA:'WA', SA:'SA', TAS:'TAS', ACT:'ACT', NT:'NT' }
    const stateCode = stateMap[state] || 'AUS'
    return `BRG-${stateCode}-${String(ID).padStart(3, '0')}`
  }

  const requiredFields = {
    Bridges: [
      ['bridgeName', 'Bridge Name'],
      ['state', 'State'],
      ['assetOwner', 'Asset Owner'],
      ['latitude', 'Latitude'],
      ['longitude', 'Longitude'],
      ['postingStatus', 'Posting Status'],
      ['structureType', 'Structure Type']
      // conditionRating and lastInspectionDate are set via the Inspect Now workflow
      // and must not block initial bridge creation (they are ReadOnly in the UI form)
    ],
    Restrictions: [
      ['bridgeRef', 'Bridge'],
      ['restrictionCategory', 'Category'],
      ['restrictionType', 'Restriction Type'],
      ['restrictionValue', 'Value'],
      ['restrictionUnit', 'Unit'],
      ['effectiveFrom', 'Effective From']
    ],
    BridgeRestrictions: [
      ['restrictionCategory', 'Category'],
      ['restrictionType', 'Restriction Type'],
      ['restrictionValue', 'Value'],
      ['restrictionUnit', 'Unit'],
      ['effectiveFrom', 'Effective From']
    ],
    BridgeCapacities: [
      ['capacityType', 'Capacity Type'],
      ['capacityStatus', 'Capacity Status'],
      ['grossMassLimit', 'Gross Mass Limit'],
      ['minClearancePosted', 'Min Clearance Posted']
    ],
    BridgeScourAssessments: [
      ['assessmentDate', 'Assessment Date'],
      ['assessmentType', 'Assessment Type'],
      ['scourRisk', 'Scour Risk Level'],
      ['assessor', 'Assessor']
    ]
  }

  const numericFields = {
    Bridges: {
      integer: [
        ['yearBuilt', 'Year Built'],
        ['spanCount', 'Number of Spans'],
        ['numberOfLanes', 'Number of Lanes'],
        ['conditionRating', 'Condition Rating'],
        ['structuralAdequacyRating', 'Structural Adequacy Rating'],
        ['floodImmunityAriYears', 'Flood Immunity'],
        ['importanceLevel', 'Importance Level'],
        ['averageDailyTraffic', 'Average Daily Traffic']
      ],
      decimal: [
        ['latitude', 'Latitude'],
        ['longitude', 'Longitude'],
        ['clearanceHeight', 'Clearance Height'],
        ['spanLength', 'Span Length'],
        ['totalLength', 'Total Length'],
        ['deckWidth', 'Deck Width'],
        ['scourDepthLastMeasured', 'Scour Depth Last Measured'],
        ['loadRating', 'Load Rating'],
        ['heavyVehiclePercent', 'Heavy Vehicle Percentage']
      ],
      range: [
        ['latitude', 'Latitude', -44, -10],
        ['longitude', 'Longitude', 112, 154],
        ['yearBuilt', 'Year Built', 1800, 2100],
        ['spanCount', 'Number of Spans', 1, 999],
        ['numberOfLanes', 'Number of Lanes', 1, 20],
        ['conditionRating', 'Condition Rating', 1, 10],
        ['structuralAdequacyRating', 'Structural Adequacy Rating', 1, 10],
        ['clearanceHeight', 'Clearance Height', 0, 9999999.99],
        ['spanLength', 'Span Length', 0, 9999999.99],
        ['totalLength', 'Total Length', 0, 9999999.99],
        ['deckWidth', 'Deck Width', 0, 9999999.99],
        ['scourDepthLastMeasured', 'Scour Depth Last Measured', 0, 9999999.99],
        ['floodImmunityAriYears', 'Flood Immunity', 0, 10000],
        ['loadRating', 'Load Rating', 0, 9999999.99],
        ['importanceLevel', 'Importance Level', 1, 4],
        ['averageDailyTraffic', 'Average Daily Traffic', 0, 1000000],
        ['heavyVehiclePercent', 'Heavy Vehicle Percentage', 0, 100]
      ]
    },
    Restrictions: {
      integer: [
        ['speedLimit', 'Speed Limit']
      ],
      decimal: [
        ['grossMassLimit', 'Gross Mass Limit'],
        ['axleMassLimit', 'Axle Mass Limit'],
        ['heightLimit', 'Height Limit'],
        ['widthLimit', 'Width Limit'],
        ['lengthLimit', 'Length Limit']
      ],
      range: [
        ['grossMassLimit', 'Gross Mass Limit', 0, 9999999.99],
        ['axleMassLimit', 'Axle Mass Limit', 0, 9999999.99],
        ['heightLimit', 'Height Limit', 0, 9999999.99],
        ['widthLimit', 'Width Limit', 0, 9999999.99],
        ['lengthLimit', 'Length Limit', 0, 9999999.99],
        ['speedLimit', 'Speed Limit', 0, 130]
      ]
    },
    BridgeRestrictions: {
      integer: [
        ['speedLimit', 'Speed Limit']
      ],
      decimal: [
        ['grossMassLimit', 'Gross Mass Limit'],
        ['axleMassLimit', 'Axle Mass Limit'],
        ['heightLimit', 'Height Limit'],
        ['widthLimit', 'Width Limit'],
        ['lengthLimit', 'Length Limit']
      ],
      range: [
        ['grossMassLimit', 'Gross Mass Limit', 0, 9999999.99],
        ['axleMassLimit', 'Axle Mass Limit', 0, 9999999.99],
        ['heightLimit', 'Height Limit', 0, 9999999.99],
        ['widthLimit', 'Width Limit', 0, 9999999.99],
        ['lengthLimit', 'Length Limit', 0, 9999999.99],
        ['speedLimit', 'Speed Limit', 0, 130]
      ]
    },
    BridgeCapacities: {
      integer: [
        ['designLife', 'Design Fatigue Life']
      ],
      decimal: [
        ['grossMassLimit', 'Gross Mass Limit'],
        ['grossCombined', 'Gross Combined'],
        ['steerAxleLimit', 'Steer Axle'],
        ['singleAxleLimit', 'Single Axle'],
        ['tandemGroupLimit', 'Tandem Axle Group'],
        ['triAxleGroupLimit', 'Tri-Axle Group'],
        ['minClearancePosted', 'Min Clearance Posted'],
        ['lane1Clearance', 'Lane 1 Clearance'],
        ['lane2Clearance', 'Lane 2 Clearance'],
        ['carriagewayWidth', 'Carriageway Width'],
        ['trafficableWidth', 'Trafficable Width'],
        ['laneWidth', 'Lane Width'],
        ['ratingFactor', 'Rating Factor'],
        ['scourCriticalDepth', 'Scour Critical Depth'],
        ['currentScourDepth', 'Current Scour Depth'],
        ['floodClosureLevel', 'Flood Closure Level'],
        ['consumedLife', 'Consumed Life']
      ],
      range: [
        ['grossMassLimit', 'Gross Mass Limit', 0, 9999999.99],
        ['grossCombined', 'Gross Combined', 0, 9999999.99],
        ['steerAxleLimit', 'Steer Axle', 0, 9999999.99],
        ['singleAxleLimit', 'Single Axle', 0, 9999999.99],
        ['tandemGroupLimit', 'Tandem Axle Group', 0, 9999999.99],
        ['triAxleGroupLimit', 'Tri-Axle Group', 0, 9999999.99],
        ['minClearancePosted', 'Min Clearance Posted', 0, 9999999.99],
        ['lane1Clearance', 'Lane 1 Clearance', 0, 9999999.99],
        ['lane2Clearance', 'Lane 2 Clearance', 0, 9999999.99],
        ['carriagewayWidth', 'Carriageway Width', 0, 9999999.99],
        ['trafficableWidth', 'Trafficable Width', 0, 9999999.99],
        ['laneWidth', 'Lane Width', 0, 9999999.99],
        ['ratingFactor', 'Rating Factor', 0, 9999999.9999],
        ['scourCriticalDepth', 'Scour Critical Depth', 0, 9999999.99],
        ['currentScourDepth', 'Current Scour Depth', 0, 9999999.99],
        ['floodClosureLevel', 'Flood Closure Level', 0, 9999999.99],
        ['designLife', 'Design Fatigue Life', 0, 200],
        ['consumedLife', 'Consumed Life', 0, 100]
      ]
    },
    BridgeScourAssessments: {
      integer: [
        ['floodImmunityAriYears', 'Flood Immunity']
      ],
      decimal: [
        ['measuredDepth', 'Measured Scour Depth']
      ],
      range: [
        ['measuredDepth', 'Measured Scour Depth', 0, 9999999.99],
        ['floodImmunityAriYears', 'Flood Immunity', 0, 10000]
      ]
    }
  }

  const isBlank = value => value === null || value === undefined || (typeof value === 'string' && value.trim() === '')

  const validationHints = {
    latitude: 'Use decimal degrees, for example -33.852300.',
    longitude: 'Use decimal degrees, for example 151.210800.',
    conditionRating: 'Use a whole number from 1 to 10.',
    structuralAdequacyRating: 'Use a whole number from 1 to 10.',
    importanceLevel: 'Use a whole number from 1 to 4.',
    heavyVehiclePercent: 'Enter a percentage from 0 to 100.',
    consumedLife: 'Enter a percentage from 0 to 100.'
  }

  const message = (key, req, args = {}) => cds.i18n.messages.at(key, req.locale || cds.context?.locale, args) || key

  const rangeByField = rules => new Map((rules.range || []).map(([field, label, min, max]) => [field, { label, min, max }]))

  const validateRequiredFields = (entityName, req, data = req.data) => {
    for (const [field, label] of requiredFields[entityName] || []) {
      if (!isBlank(data[field])) continue
      req.error({
        code: 'MANDATORY_FIELD_MISSING',
        message: message('MANDATORY_FIELD_MISSING', req, { label }),
        target: field,
        status: 400
      })
    }
  }

  const isIntegerValue = value => {
    if (typeof value === 'number') return Number.isInteger(value)
    if (typeof value === 'string') return /^-?\d+$/.test(value.trim())
    return false
  }

  const isDecimalValue = value => {
    if (typeof value === 'number') return Number.isFinite(value)
    if (typeof value === 'string') return /^-?(?:\d+|\d*\.\d+)$/.test(value.trim())
    return false
  }

  const validateNumericFields = (entityName, req, data = req.data) => {
    const rules = numericFields[entityName] || {}
    const ranges = rangeByField(rules)

    for (const [field, label] of rules.integer || []) {
      if (!(field in data) || isBlank(data[field])) continue
      if (isIntegerValue(data[field])) continue
      const range = ranges.get(field)
      req.error({
        code: range ? 'INVALID_INTEGER_WITH_RANGE' : 'INVALID_INTEGER',
        message: range
          ? message('INVALID_INTEGER_WITH_RANGE', req, { label, min: range.min, max: range.max })
          : message('INVALID_INTEGER', req, { label }),
        target: field,
        status: 400
      })
    }

    for (const [field, label] of rules.decimal || []) {
      if (!(field in data) || isBlank(data[field])) continue
      if (isDecimalValue(data[field])) continue
      const range = ranges.get(field)
      req.error({
        code: range ? 'INVALID_NUMBER_WITH_RANGE' : 'INVALID_NUMBER',
        message: range
          ? message('INVALID_NUMBER_WITH_RANGE', req, {
              label,
              min: range.min,
              max: range.max,
              hint: validationHints[field] || ''
            })
          : message('INVALID_NUMBER', req, { label }),
        target: field,
        status: 400
      })
    }

    for (const [field, label, min, max] of rules.range || []) {
      if (!(field in data) || isBlank(data[field]) || !isDecimalValue(data[field])) continue
      const value = Number(data[field])
      if (value >= min && value <= max) continue
      req.error({
        code: 'VALUE_OUT_OF_RANGE',
        message: message('VALUE_OUT_OF_RANGE', req, {
          label,
          min,
          max,
          hint: validationHints[field] || ''
        }),
        target: field,
        status: 400
      })
    }
  }

  const validateEntityFields = (entityName, req, data = req.data) => {
    validateRequiredFields(entityName, req, data)
    validateNumericFields(entityName, req, data)
  }

  const validateRequiredFieldsWithExisting = async (entity, entityName, req) => {
    if (req.event !== 'UPDATE') return validateEntityFields(entityName, req)

    const ID = req.data?.ID || req.params?.[0]?.ID
    if (!ID) return validateEntityFields(entityName, req)

    const existing = await SELECT.one.from(entity).where({ ID })
    validateEntityFields(entityName, req, { ...existing, ...req.data })
  }

  this.before('SAVE', Bridges, req => validateEntityFields('Bridges', req))
  const TYPE_UNIT_MAP = {
    'Speed Restriction': ['km/h'],
    'Mass Limit':        ['t'],
    'Dimension Limit':  ['m'],
    'Access Restriction': ['approval']
  }
  const NUMERIC_TYPES = ['Mass Limit', 'Speed Restriction', 'Dimension Limit']
  const NUMERIC_UNITS  = ['km/h', 'm', 't']

  const validateRestrictionTypeUnit = (data, req) => {
    const type  = data.restrictionType || ''
    const unit  = data.restrictionUnit || ''
    const value = data.restrictionValue

    const allowedUnits = TYPE_UNIT_MAP[type]
    if (type && unit && allowedUnits && !allowedUnits.includes(unit)) {
      req.error({
        code:    'INVALID_RESTRICTION_UNIT',
        message: `Unit "${unit}" is not valid for "${type}". Allowed: ${allowedUnits.join(', ')}.`,
        target:  'restrictionUnit',
        status:  400
      })
      return false
    }

    if (!isBlank(value) && (NUMERIC_TYPES.includes(type) || NUMERIC_UNITS.includes(unit))) {
      if (!isDecimalValue(value)) {
        req.error({
          code:    'INVALID_RESTRICTION_VALUE',
          message: `Value must be a number for "${type || unit}" restrictions.`,
          target:  'restrictionValue',
          status:  400
        })
        return false
      }
      const numVal = parseFloat(value)
      if (type === 'Mass Limit' && data.grossMassLimit == null) data.grossMassLimit = numVal
      if (type === 'Speed Restriction' && data.speedLimit == null) data.speedLimit = Math.round(numVal)
    }
    return true
  }

  this.before('SAVE', BridgeRestrictions, req => {
    validateEntityFields('BridgeRestrictions', req)
    validateRestrictionTypeUnit(req.data, req)
  })
  this.before(['CREATE', 'UPDATE'], BridgeRestrictions, async req => {
    validateRestrictionTypeUnit(req.data, req)
  })
  this.before('SAVE', BridgeCapacities, req => validateEntityFields('BridgeCapacities', req))
  this.before('SAVE', BridgeScourAssessments, req => validateEntityFields('BridgeScourAssessments', req))
  this.before(['CREATE', 'UPDATE'], Bridges, req => validateRequiredFieldsWithExisting(Bridges, 'Bridges', req))
  this.before(['CREATE', 'UPDATE'], BridgeRestrictions, req => validateRequiredFieldsWithExisting(BridgeRestrictions, 'BridgeRestrictions', req))
  this.before(['CREATE', 'UPDATE'], BridgeCapacities, req => validateRequiredFieldsWithExisting(BridgeCapacities, 'BridgeCapacities', req))
  this.before(['CREATE', 'UPDATE'], BridgeScourAssessments, async req => {
    if (req.event === 'CREATE' && !req.data.assessmentRef) {
      const last = await SELECT.one.from(BridgeScourAssessments).columns('assessmentRef').orderBy('createdAt desc')
      const m = last?.assessmentRef?.match(/^SAR-(\d+)$/)
      const seq = m ? parseInt(m[1], 10) + 1 : 1
      req.data.assessmentRef = 'SAR-' + String(seq).padStart(4, '0')
    }
    return validateRequiredFieldsWithExisting(BridgeScourAssessments, 'BridgeScourAssessments', req)
  })
  this.before('CREATE', Restrictions, req => validateEntityFields('Restrictions', req))
  this.before('UPDATE', Restrictions, async req => {
    await validateRequiredFieldsWithExisting(Restrictions, 'Restrictions', req)
  })

  /**
   * Generate IDs for new Bridges drafts
   */
  this.before ('NEW', Bridges.drafts, async (req) => {
    if (req.data.ID) return
    const { ID:id1 } = await SELECT.one.from(Bridges).columns('max(ID) as ID')
    const { ID:id2 } = await SELECT.one.from(Bridges.drafts).columns('max(ID) as ID')
    req.data.ID = Math.max(id1||0, id2||0) + 1
    if (!req.data.bridgeId) req.data.bridgeId = bridgeIdFor(req.data.ID, req.data.state)
  })

  // UAT-FIX-1 (AdminService): Derive condition + highPriorityAsset from conditionRating on SAVE.
  // The SAVE event fires at draftActivate time, ensuring computed fields are persisted to the
  // active entity. The before-CREATE handler fires on the draft entity but computed values
  // are lost through activation — SAVE is the reliable hook for draft-enabled entities.
  // Reference: TfNSW Bridge Inspection Manual 1-5 scale (mapped from legacy 1-10 BMS scale).
  const CONDITION_LABELS_ADMIN = { 1:'GOOD', 2:'FAIR', 3:'POOR', 4:'VERY_POOR', 5:'CRITICAL' }
  const LEGACY_TO_TFNSW_ADMIN  = { 10:1,9:1, 8:2,7:2, 6:3,5:3, 4:4,3:4, 2:5,1:5 }

  this.before('SAVE', Bridges, req => {
    const data = req.data
    if (data.ID && (!data.bridgeId || /^BRG-AUS-/.test(data.bridgeId))) {
      data.bridgeId = bridgeIdFor(data.ID, data.state)
    }
    if (data.conditionRating != null) {
      const r      = Number(data.conditionRating)
      const tfnsw  = LEGACY_TO_TFNSW_ADMIN[r] || (r >= 1 && r <= 5 ? r : null)
      if (tfnsw) {
        data.condition         = CONDITION_LABELS_ADMIN[tfnsw]
        data.highPriorityAsset = r <= 4   // legacy scale ≤4 flags the bridge
      }
    }
  })

  // ── Virtual fields for ObjectPage header KPI chips ───────────────────────
  // postingStatusCriticality: Integer (1=Error/red, 2=Warning/amber, 3=Success/green)
  // activeRestrictionCount: count of active BridgeRestrictions (detail page only)
  // activeClosureCount: count of current active closure-type Restrictions
  const POSTING_CRITICALITY = { 'Unrestricted': 3, 'Under Review': 2, 'Restricted': 2, 'Posted': 2, 'Closed': 1 }

  // Syncs bridge postingStatus based on active closure/restriction Restrictions records
  const syncBridgeClosureStatus = async (bridgeId) => {
    if (!bridgeId) return
    const today = new Date().toISOString().slice(0, 10)
    const active = await SELECT.from('bridge.management.Restrictions')
      .columns('ID', 'closureType', 'closureStartDate', 'closureEndDate', 'active')
      .where({ bridge_ID: bridgeId, active: true })
    // Only count closures that are current (start <= today AND (no end OR end >= today))
    const closures = active.filter(r =>
      r.closureType &&
      (!r.closureStartDate || r.closureStartDate <= today) &&
      (!r.closureEndDate   || r.closureEndDate   >= today)
    )
    let newStatus
    if (closures.length > 0)   newStatus = 'Closed'
    else if (active.length > 0) newStatus = 'Posted'
    else                        newStatus = 'Unrestricted'
    await UPDATE('bridge.management.Bridges').set({ postingStatus: newStatus }).where({ ID: bridgeId })
  }

  this.after('READ', Bridges, async (results, req) => {
    const list = Array.isArray(results) ? results : (results ? [results] : [])
    for (const b of list) {
      if (!b) continue
      b.postingStatusCriticality = POSTING_CRITICALITY[b.postingStatus] ?? 2
      b.activeRestrictionCount   = 0
      b.activeClosureCount       = 0
    }
    const ids = list.map(b => b.ID).filter(Boolean)
    const isSingleRecord = list.length === 1 && req.params?.[0]
    // Batch COUNT active restrictions for all records in one query
    const wantCount = !req.query?.$select || req.query.$select.split(',').map(f => f.trim()).includes('activeRestrictionCount')
    if (wantCount && ids.length > 0 && !isSingleRecord) {
      const counts = await SELECT.from('bridge.management.BridgeRestrictions')
        .columns('bridge_ID', 'count(1) as cnt')
        .where({ bridge_ID: { in: ids }, active: true })
        .groupBy('bridge_ID')
      const countMap = Object.fromEntries(counts.map(r => [r.bridge_ID, Number(r.cnt)]))
      for (const b of list) b.activeRestrictionCount = countMap[b.ID] ?? 0
    }
    // Batch COUNT active closure-type Restrictions
    if (ids.length > 0) {
      const today = new Date().toISOString().slice(0, 10)
      const closureCounts = await SELECT.from('bridge.management.Restrictions')
        .columns('bridge_ID', 'count(1) as cnt')
        .where({ bridge_ID: { in: ids }, active: true })
        .where(`closureType IS NOT NULL AND (closureStartDate IS NULL OR closureStartDate <= '${today}') AND (closureEndDate IS NULL OR closureEndDate >= '${today}')`)
        .groupBy('bridge_ID')
      const closureMap = Object.fromEntries(closureCounts.map(r => [r.bridge_ID, Number(r.cnt)]))
      for (const b of list) b.activeClosureCount = closureMap[b.ID] ?? 0
    }
    // BSI composite score (simplified)
    for (const b of list) {
      if (b.deckWidth != null) {
        b.bsiWidthRating = b.deckWidth >= 7.3 ? 9 : b.deckWidth >= 4.5 ? 5 : 2
      }
      b.bsiBarrierRating  = b.bsiBarrierRating  ?? 5
      b.bsiRouteAltRating = b.bsiRouteAltRating ?? 5
      if (b.conditionRating != null) {
        const structural = (b.conditionRating / 10) * 55
        const width      = ((b.bsiWidthRating  ?? 5) / 10) * 15
        const barrier    = ((b.bsiBarrierRating ?? 5) / 10) * 15
        const route      = ((b.bsiRouteAltRating ?? 5) / 10) * 15
        b.bsiScore = Math.min(100, Math.round((structural + width + barrier + route) * 10) / 10)
      }
    }
    // AssetIQ RAG status — look up from AssetIQScores by bridge_ID
    if (ids.length > 0) {
      const aiqScores = await SELECT.from('bridge.management.AssetIQScores')
        .columns('bridge_ID', 'ragStatus')
        .where({ bridge_ID: { in: ids } })
      const aiqMap = Object.fromEntries((aiqScores || []).map(r => [r.bridge_ID, r.ragStatus]))
      for (const b of list) b.ragStatus = aiqMap[b.ID] ?? null
    }
    // BHI/NBI — always initialise to null so FE4 $select drill-down never fails
    for (const b of list) { b.bhi = null; b.nbi = null }
    const bhiEnabled = await isFeatureEnabled('bhiBsiAssessment')
    if (bhiEnabled) {
      for (const b of list) {
        if (b.conditionRating != null) {
          const elementRatings = [
            { element: 'Deck',           rating: b.conditionRating, weight: 25 },
            { element: 'Substructure',   rating: b.conditionRating, weight: 30 },
            { element: 'Superstructure', rating: b.conditionRating, weight: 30 },
            { element: 'Approach',       rating: b.conditionRating, weight: 15 },
          ]
          const result = computeBhiBsi({
            structureMode: 'Road',
            elementRatings,
            importanceClass: b.importanceLevel || 2,
            envPenalty: 0,
            yearBuilt: b.yearBuilt
          })
          b.bhi = result.bhi
          b.nbi = result.nbi
        }
      }
    }
  })

  const { GISConfig } = this.entities

  // Auto-seed the singleton GIS config record on first access
  this.before('READ', GISConfig, async () => {
    const existing = await SELECT.one.from(GISConfig).where({ id: 'default' })
    if (!existing) {
      await INSERT.into(GISConfig).entries({ id: 'default' })
    }
  })

  // Block hard deletes on active entities — drafts may still be discarded normally
  this.before('DELETE', Bridges, req => {
    if (req.data?.IsActiveEntity !== false) req.error(405, 'Hard delete is not permitted. Use the Deactivate action instead.')
  })
  this.before('DELETE', Restrictions, req => {
    if (req.data?.IsActiveEntity !== false) req.error(405, 'Hard delete is not permitted. Use the Deactivate action instead.')
  })

  this.after('READ', Restrictions, (data) => {
    const results = Array.isArray(data) ? data : [data]
    const today = new Date()
    const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    results.forEach(r => {
      if (!r || !r.reviewDueDate) { if (r) r.reviewCriticality = null; return }
      const due = new Date(r.reviewDueDate)
      r.reviewCriticality = due < today ? 1 : due <= in30 ? 2 : 3
    })
  })
  this.before('DELETE', BridgeRestrictions, req => {
    return req.error(405, 'BridgeRestrictions cannot be deleted — use deactivate instead.')
  })

  // Soft-delete: deactivate / reactivate Bridges (use db directly to bypass draft flow)
  // Block actions on draft entities — user must save/discard first
  this.on('deactivate',   Bridges.drafts, req => req.error(409, 'Save or discard your changes before deactivating.'))
  this.on('reactivate',   Bridges.drafts, req => req.error(409, 'Save or discard your changes before reactivating.'))

  this.on('deactivate', Bridges, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    await db.run(UPDATE('bridge.management.Bridges').set({ status: 'Inactive' }).where({ ID }))
    return db.run(SELECT.one.from('bridge.management.Bridges').where({ ID }))
  })
  this.on('reactivate', Bridges, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    await db.run(UPDATE('bridge.management.Bridges').set({ status: 'Active' }).where({ ID }))
    return db.run(SELECT.one.from('bridge.management.Bridges').where({ ID }))
  })


  // Soft-delete: deactivate / reactivate Restrictions (use db directly to bypass draft flow)
  this.on('deactivate', Restrictions.drafts, req => req.error(409, 'Save or discard your changes before deactivating.'))
  this.on('reactivate', Restrictions.drafts, req => req.error(409, 'Save or discard your changes before reactivating.'))

  this.on('deactivate', Restrictions, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const r = await db.run(SELECT.one.from('bridge.management.Restrictions').columns('bridge_ID').where({ ID }))
    await db.run(UPDATE('bridge.management.Restrictions').set({ active: false, restrictionStatus: 'Retired' }).where({ ID }))
    if (r?.bridge_ID) await syncBridgeClosureStatus(r.bridge_ID)
    return db.run(SELECT.one.from('bridge.management.Restrictions').where({ ID }))
  })
  this.on('reactivate', Restrictions, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const r = await db.run(SELECT.one.from('bridge.management.Restrictions').columns('bridge_ID').where({ ID }))
    await db.run(UPDATE('bridge.management.Restrictions').set({ active: true, restrictionStatus: 'Active' }).where({ ID }))
    if (r?.bridge_ID) await syncBridgeClosureStatus(r.bridge_ID)
    return db.run(SELECT.one.from('bridge.management.Restrictions').where({ ID }))
  })

  this.before ('NEW', Restrictions.drafts, async (req) => {
    if (!req.data.restrictionRef) {
      const { cnt } = await SELECT.one.from(Restrictions).columns('count(1) as cnt')
      req.data.restrictionRef = `RST-${String((cnt || 0) + 1).padStart(4, '0')}`
    }
    // Default status to Active so newly created restrictions are immediately enforceable
    if (!req.data.restrictionStatus) req.data.restrictionStatus = 'Active'
  })

  // ── BridgeRestrictions lifecycle — auto-ref, defaults, soft-delete ──────
  this.before('NEW', BridgeRestrictions.drafts, async (req) => {
    if (!req.data.restrictionRef) {
      const { cnt } = await SELECT.one.from(BridgeRestrictions).columns('count(1) as cnt')
      req.data.restrictionRef = `BR-${String((cnt || 0) + 1).padStart(4, '0')}`
    }
    if (!req.data.restrictionStatus) req.data.restrictionStatus = 'Active'
    if (req.data.active === undefined) req.data.active = true
  })

  // Sync the `temporary` flag from category; also applies on update
  this.before(['CREATE', 'UPDATE'], BridgeRestrictions, req => {
    if (req.data.restrictionCategory !== undefined) {
      req.data.temporary = req.data.restrictionCategory === 'Temporary'
    }
    if (!req.data.name && (req.data.restrictionRef || req.data.restrictionType)) {
      req.data.name = req.data.restrictionRef || req.data.restrictionType
    }
  })

  // Soft-delete: deactivate / reactivate BridgeRestrictions
  this.on('deactivate', BridgeRestrictions, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgeRestrictions', { ID })
    await db.run(UPDATE('bridge.management.BridgeRestrictions').set({ active: false, restrictionStatus: 'Retired' }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'BridgeRestriction',
      objectId:   ID,
      objectName: old?.restrictionRef || ID,
      source:     'OData',
      batchId:    cds.utils.uuid(),
      changedBy:  req.user?.id || 'system',
      changes: [
        { fieldName: 'active',            oldValue: String(old?.active ?? true),               newValue: 'false' },
        { fieldName: 'restrictionStatus', oldValue: old?.restrictionStatus || '',              newValue: 'Retired' }
      ]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeRestrictions').where({ ID }))
  })

  this.on('reactivate', BridgeRestrictions, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgeRestrictions', { ID })
    await db.run(UPDATE('bridge.management.BridgeRestrictions').set({ active: true, restrictionStatus: 'Active' }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'BridgeRestriction',
      objectId:   ID,
      objectName: old?.restrictionRef || ID,
      source:     'OData',
      batchId:    cds.utils.uuid(),
      changedBy:  req.user?.id || 'system',
      changes: [
        { fieldName: 'active',            oldValue: String(old?.active ?? false),              newValue: 'true' },
        { fieldName: 'restrictionStatus', oldValue: old?.restrictionStatus || 'Retired',       newValue: 'Active' }
      ]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeRestrictions').where({ ID }))
  })

  this.before (['CREATE', 'UPDATE'], Restrictions, req => {
    if (req.data.restrictionCategory) {
      req.data.temporary = req.data.restrictionCategory === 'Temporary'
    }
    if (req.data.bridgeRef) {
      const bridge = SELECT.one.from(Bridges).where({ bridgeId: req.data.bridgeRef })
      return bridge.then(found => {
        if (!found) req.error(400, `Unknown bridge reference: ${req.data.bridgeRef}`)
        else req.data.bridge_ID = found.ID
        if (!req.data.name) {
          req.data.name = req.data.restrictionRef || req.data.restrictionType || 'Restriction'
        }
      })
    }
    if (!req.data.name) {
      req.data.name = req.data.restrictionRef || req.data.restrictionType || 'Restriction'
    }
  })

  // Sync bridge posting status when a Restriction is created/updated
  this.after(['CREATE', 'UPDATE'], Restrictions, async (result) => {
    const bridgeId = result?.bridge_ID
    if (bridgeId) await syncBridgeClosureStatus(bridgeId)
  })

  // ── Audit: Bridges (draft activation = UPDATE on active entity) ──────────
  this.before('UPDATE', Bridges, async (req) => {
    if (!req.data?.ID) return
    const db = await cds.connect.to('db')
    req._auditOld = await fetchCurrentRecord(db, 'bridge.management.Bridges', { ID: req.data.ID })
  })

  this.after('UPDATE', Bridges, async (_result, req) => {
    if (!req._auditOld) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.Bridges', { ID: req._auditOld.ID })
    if (!fresh) return
    const changes = diffRecords(req._auditOld, fresh)
    if (!changes.length) return
    await writeChangeLogs(db, {
      objectType:  'Bridge',
      objectId:    String(req._auditOld.ID),
      objectName:  fresh.bridgeName || req._auditOld.bridgeName || String(req._auditOld.ID),
      source:      'OData',
      batchId:     cds.utils.uuid(),
      changedBy:   req.user?.id || 'system',
      changes
    })
  })

  this.after('CREATE', Bridges, async (result, req) => {
    if (!result?.ID) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.Bridges', { ID: result.ID })
    if (!fresh) return
    // For creates, oldValue is empty for all fields that have a value
    const changes = Object.entries(fresh)
      .filter(([bridgePropertyName, bridgePropertyData]) => !['modifiedAt','modifiedBy','createdAt','createdBy'].includes(bridgePropertyName) && bridgePropertyData != null && bridgePropertyData !== '')
      .map(([bridgePropertyName, bridgePropertyData]) => ({ fieldName: bridgePropertyName, oldValue: '', newValue: String(bridgePropertyData) }))
    await writeChangeLogs(db, {
      objectType:  'Bridge',
      objectId:    String(result.ID),
      objectName:  fresh.bridgeName || String(result.ID),
      source:      'OData',
      batchId:     cds.utils.uuid(),
      changedBy:   req.user?.id || 'system',
      changes
    })
  })

  // ── Audit: Restrictions ───────────────────────────────────────────────────
  this.before('UPDATE', Restrictions, async (req) => {
    if (!req.data?.ID) return
    const db = await cds.connect.to('db')
    req._auditOld = await fetchCurrentRecord(db, 'bridge.management.Restrictions', { ID: req.data.ID })
  })

  this.after('UPDATE', Restrictions, async (_result, req) => {
    if (!req._auditOld) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.Restrictions', { ID: req._auditOld.ID })
    if (!fresh) return
    const changes = diffRecords(req._auditOld, fresh)
    if (!changes.length) return
    await writeChangeLogs(db, {
      objectType:  'Restriction',
      objectId:    req._auditOld.ID,
      objectName:  fresh.restrictionRef || req._auditOld.restrictionRef || req._auditOld.ID,
      source:      'OData',
      batchId:     cds.utils.uuid(),
      changedBy:   req.user?.id || 'system',
      changes
    })
  })

  this.after('CREATE', Restrictions, async (result, req) => {
    if (!result?.ID) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.Restrictions', { ID: result.ID })
    if (!fresh) return
    const changes = Object.entries(fresh)
      .filter(([restrictionPropertyName, restrictionPropertyData]) => !['modifiedAt','modifiedBy','createdAt','createdBy'].includes(restrictionPropertyName) && restrictionPropertyData != null && restrictionPropertyData !== '')
      .map(([restrictionPropertyName, restrictionPropertyData]) => ({ fieldName: restrictionPropertyName, oldValue: '', newValue: String(restrictionPropertyData) }))
    await writeChangeLogs(db, {
      objectType:  'Restriction',
      objectId:    result.ID,
      objectName:  fresh.restrictionRef || result.ID,
      source:      'OData',
      batchId:     cds.utils.uuid(),
      changedBy:   req.user?.id || 'system',
      changes
    })
  })

  // ── Audit: BridgeRestrictions ─────────────────────────────────────────────
  this.before('UPDATE', BridgeRestrictions, async (req) => {
    if (!req.data?.ID) return
    const db = await cds.connect.to('db')
    req._auditOld = await fetchCurrentRecord(db, 'bridge.management.BridgeRestrictions', { ID: req.data.ID })
  })

  this.after('UPDATE', BridgeRestrictions, async (_result, req) => {
    if (!req._auditOld) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.BridgeRestrictions', { ID: req._auditOld.ID })
    if (!fresh) return
    const changes = diffRecords(req._auditOld, fresh)
    if (!changes.length) return
    await writeChangeLogs(db, {
      objectType:  'BridgeRestriction',
      objectId:    req._auditOld.ID,
      objectName:  fresh.restrictionRef || req._auditOld.restrictionRef || req._auditOld.ID,
      source:      'OData',
      batchId:     cds.utils.uuid(),
      changedBy:   req.user?.id || 'system',
      changes
    })
  })

  this.after('CREATE', BridgeRestrictions, async (result, req) => {
    if (!result?.ID) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.BridgeRestrictions', { ID: result.ID })
    if (!fresh) return
    const changes = Object.entries(fresh)
      .filter(([k, v]) => !['modifiedAt','modifiedBy','createdAt','createdBy'].includes(k) && v != null && v !== '')
      .map(([k, v]) => ({ fieldName: k, oldValue: '', newValue: String(v) }))
    await writeChangeLogs(db, {
      objectType:  'BridgeRestriction',
      objectId:    result.ID,
      objectName:  fresh.restrictionRef || result.ID,
      source:      'OData',
      batchId:     cds.utils.uuid(),
      changedBy:   req.user?.id || 'system',
      changes
    })
  })

  // ── Audit: BridgeCapacities ───────────────────────────────────────────────
  this.before('UPDATE', BridgeCapacities, async (req) => {
    if (!req.data?.ID) return
    const db = await cds.connect.to('db')
    req._auditOld = await fetchCurrentRecord(db, 'bridge.management.BridgeCapacities', { ID: req.data.ID })
  })

  this.after('UPDATE', BridgeCapacities, async (_result, req) => {
    if (!req._auditOld) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.BridgeCapacities', { ID: req._auditOld.ID })
    if (!fresh) return
    const changes = diffRecords(req._auditOld, fresh)
    if (!changes.length) return
    await writeChangeLogs(db, {
      objectType:  'BridgeCapacity',
      objectId:    req._auditOld.ID,
      objectName:  fresh.capacityType || req._auditOld.capacityType || req._auditOld.ID,
      source:      'OData',
      batchId:     cds.utils.uuid(),
      changedBy:   req.user?.id || 'system',
      changes
    })
  })

  this.after('CREATE', BridgeCapacities, async (result, req) => {
    if (!result?.ID) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.BridgeCapacities', { ID: result.ID })
    if (!fresh) return
    const changes = Object.entries(fresh)
      .filter(([k, v]) => !['modifiedAt','modifiedBy','createdAt','createdBy'].includes(k) && v != null && v !== '')
      .map(([k, v]) => ({ fieldName: k, oldValue: '', newValue: String(v) }))
    await writeChangeLogs(db, {
      objectType:  'BridgeCapacity',
      objectId:    result.ID,
      objectName:  fresh.capacityType || result.ID,
      source:      'OData',
      batchId:     cds.utils.uuid(),
      changedBy:   req.user?.id || 'system',
      changes
    })
  })

  this.on('deactivate', BridgeCapacities, async (req) => {
    const { ID } = req.params[0]
    await cds.run(UPDATE('bridge.management.BridgeCapacities').set({ capacityStatus: 'Superseded' }).where({ ID }))
    return cds.run(SELECT.one.from('bridge.management.BridgeCapacities').where({ ID }))
  })

  this.on('reactivate', BridgeCapacities, async (req) => {
    const { ID } = req.params[0]
    await cds.run(UPDATE('bridge.management.BridgeCapacities').set({ capacityStatus: 'Current' }).where({ ID }))
    return cds.run(SELECT.one.from('bridge.management.BridgeCapacities').where({ ID }))
  })

  this.before('DELETE', BridgeCapacities, async (req) => {
    // Log deletion before it happens so the audit trail is preserved
    const id = req.data?.ID
    if (!id) return
    const db = await cds.connect.to('db')
    const record = await fetchCurrentRecord(db, 'bridge.management.BridgeCapacities', { ID: id })
    if (!record) return
    await writeChangeLogs(db, {
      objectType: 'BridgeCapacity',
      objectId:   id,
      objectName: record.capacityType || id,
      source:     'OData',
      batchId:    cds.utils.uuid(),
      changedBy:  req.user?.id || 'system',
      changes:    [{ fieldName: '_record', oldValue: JSON.stringify(record), newValue: 'DELETED' }]
    })
  })

  // ── Audit: BridgeScourAssessments ─────────────────────────────────────────
  this.before('UPDATE', BridgeScourAssessments, async (req) => {
    if (!req.data?.ID) return
    const db = await cds.connect.to('db')
    req._auditOld = await fetchCurrentRecord(db, 'bridge.management.BridgeScourAssessments', { ID: req.data.ID })
  })

  this.after('UPDATE', BridgeScourAssessments, async (_result, req) => {
    if (!req._auditOld) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.BridgeScourAssessments', { ID: req._auditOld.ID })
    if (!fresh) return
    const changes = diffRecords(req._auditOld, fresh)
    if (!changes.length) return
    await writeChangeLogs(db, {
      objectType:  'ScourAssessment',
      objectId:    req._auditOld.ID,
      objectName:  fresh.assessmentType || req._auditOld.assessmentType || req._auditOld.ID,
      source:      'OData',
      batchId:     cds.utils.uuid(),
      changedBy:   req.user?.id || 'system',
      changes
    })
  })

  this.after('CREATE', BridgeScourAssessments, async (result, req) => {
    if (!result?.ID) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.BridgeScourAssessments', { ID: result.ID })
    if (!fresh) return
    const changes = Object.entries(fresh)
      .filter(([k, v]) => !['modifiedAt','modifiedBy','createdAt','createdBy'].includes(k) && v != null && v !== '')
      .map(([k, v]) => ({ fieldName: k, oldValue: '', newValue: String(v) }))
    await writeChangeLogs(db, {
      objectType:  'ScourAssessment',
      objectId:    result.ID,
      objectName:  fresh.assessmentType || result.ID,
      source:      'OData',
      batchId:     cds.utils.uuid(),
      changedBy:   req.user?.id || 'system',
      changes
    })
  })

  this.on('deactivate', BridgeScourAssessments, async (req) => {
    const { ID } = req.params[0]
    await cds.run(UPDATE('bridge.management.BridgeScourAssessments').set({ mitigationStatus: 'Superseded' }).where({ ID }))
    return cds.run(SELECT.one.from('bridge.management.BridgeScourAssessments').where({ ID }))
  })

  this.on('reactivate', BridgeScourAssessments, async (req) => {
    const { ID } = req.params[0]
    await cds.run(UPDATE('bridge.management.BridgeScourAssessments').set({ mitigationStatus: 'Active' }).where({ ID }))
    return cds.run(SELECT.one.from('bridge.management.BridgeScourAssessments').where({ ID }))
  })

  if (BridgeScourAssessments?.drafts) {
    this.on('deactivate', BridgeScourAssessments.drafts, req => req.error(409, 'Save or discard changes before deactivating.'))
    this.on('reactivate', BridgeScourAssessments.drafts, req => req.error(409, 'Save or discard changes before reactivating.'))
    this.before('NEW', BridgeScourAssessments.drafts, async req => {
      if (req.data.active === undefined) req.data.active = true
      if (!req.data.assessmentRef) {
        const last = await SELECT.one.from(BridgeScourAssessments).columns('assessmentRef').orderBy('createdAt desc')
        const m = last?.assessmentRef?.match(/^SAR-(\d+)$/)
        const seq = m ? parseInt(m[1], 10) + 1 : 1
        req.data.assessmentRef = 'SAR-' + String(seq).padStart(4, '0')
      }
    })
  }

  this.before('DELETE', BridgeScourAssessments, async (req) => {
    const id = req.data?.ID
    if (!id) return
    const db = await cds.connect.to('db')
    const record = await fetchCurrentRecord(db, 'bridge.management.BridgeScourAssessments', { ID: id })
    if (!record) return
    await writeChangeLogs(db, {
      objectType: 'ScourAssessment',
      objectId:   id,
      objectName: record.assessmentType || id,
      source:     'OData',
      batchId:    cds.utils.uuid(),
      changedBy:  req.user?.id || 'system',
      changes:    [{ fieldName: '_record', oldValue: JSON.stringify(record), newValue: 'DELETED' }]
    })
  })

  // ── Configurable Attributes — integrity guards ───────────────────────────

  const { AttributeDefinitions, AttributeAllowedValues, AttributeValues } = this.entities

  // Block DELETE on AttributeDefinition if any values exist for its internalKey
  this.before('DELETE', AttributeDefinitions, async (req) => {
    const id = req.data?.ID
    if (!id) return
    const defn = await SELECT.one.from(AttributeDefinitions).where({ ID: id })
    if (!defn) return
    const db = await cds.connect.to('db')
    const used = await SELECT.one.from('bridge.management.AttributeValues')
      .where({ attributeKey: defn.internalKey })
    if (used) {
      req.error(409, `Cannot delete attribute "${defn.name}" — ${defn.internalKey} has saved values. Deactivate it instead.`)
    }
  })

  // Block dataType change on AttributeDefinition if any values exist
  this.before('UPDATE', AttributeDefinitions, async (req) => {
    if (!req.data?.dataType || !req.data?.ID) return
    const existing = await SELECT.one.from(AttributeDefinitions).where({ ID: req.data.ID })
    if (!existing || existing.dataType === req.data.dataType) return
    const db = await cds.connect.to('db')
    const used = await SELECT.one.from('bridge.management.AttributeValues')
      .where({ attributeKey: existing.internalKey })
    if (used) {
      req.error(409, `Cannot change data type of "${existing.name}" — values already exist. Create a new attribute instead.`)
    }
  })

  // Block internalKey change after values exist
  this.before('UPDATE', AttributeDefinitions, async (req) => {
    if (!req.data?.internalKey || !req.data?.ID) return
    const existing = await SELECT.one.from(AttributeDefinitions).where({ ID: req.data.ID })
    if (!existing || existing.internalKey === req.data.internalKey) return
    const db = await cds.connect.to('db')
    const used = await SELECT.one.from('bridge.management.AttributeValues')
      .where({ attributeKey: existing.internalKey })
    if (used) {
      req.error(409, `Cannot change internal key of "${existing.name}" — values already exist.`)
    }
  })

  // Block DELETE on AllowedValue if any AttributeValue references it
  this.before('DELETE', AttributeAllowedValues, async (req) => {
    const id = req.data?.ID
    if (!id) return
    const av = await SELECT.one.from(AttributeAllowedValues).where({ ID: id })
    if (!av) return
    const defn = await SELECT.one.from(AttributeDefinitions).where({ ID: av.attribute_ID })
    if (!defn) return
    const db = await cds.connect.to('db')
    const used = await SELECT.one.from('bridge.management.AttributeValues')
      .where({ attributeKey: defn.internalKey, valueText: av.value })
    if (used) {
      req.error(409, `Cannot delete allowed value "${av.value}" — it is in use by saved records.`)
    }
  })

  // ── BridgeInspections ────────────────────────────────────────────────────
  const { BridgeInspections, BridgeDefects, BridgeRiskAssessments,
          LoadRatingCertificates, NhvrRouteAssessments,
          BridgeConditionSurveys, BridgeLoadRatings, BridgePermits } = this.entities

  this.before('NEW', BridgeInspections.drafts, async (req) => {
    if (!req.data.inspectionRef) {
      const last = await cds.run(SELECT.one.from('bridge.management.BridgeInspections').columns('inspectionRef').orderBy('inspectionRef desc').limit(1))
      const m = last?.inspectionRef?.match(/^INS-(\d+)$/)
      const seq = m ? parseInt(m[1], 10) + 1 : 1
      req.data.inspectionRef = `INS-${String(seq).padStart(4, '0')}`
    }
    if (req.data.active === undefined) req.data.active = true
  })

  this.on('deactivate', BridgeInspections, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgeInspections', { ID })
    await db.run(UPDATE('bridge.management.BridgeInspections').set({ active: false }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'Inspection', objectId: ID, objectName: old?.inspectionRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'active', oldValue: 'true', newValue: 'false' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeInspections').where({ ID }))
  })

  this.on('reactivate', BridgeInspections, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgeInspections', { ID })
    await db.run(UPDATE('bridge.management.BridgeInspections').set({ active: true }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'Inspection', objectId: ID, objectName: old?.inspectionRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'active', oldValue: 'false', newValue: 'true' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeInspections').where({ ID }))
  })

  this.on('complete', BridgeInspections, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const insp = await db.run(SELECT.one.from('bridge.management.BridgeInspections').where({ ID }))
    if (!insp) return req.error(404, 'Inspection not found')
    if (insp.overallConditionRating && insp.bridge_ID) {
      const updates = { conditionRating: insp.overallConditionRating }
      if (insp.inspectionDate) updates.lastInspectionDate = insp.inspectionDate
      await db.run(UPDATE('bridge.management.Bridges').set(updates).where({ ID: insp.bridge_ID }))
    }
    await writeChangeLogs(db, {
      objectType: 'Inspection', objectId: ID, objectName: insp.inspectionRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'status', oldValue: 'In Progress', newValue: 'Complete' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeInspections').where({ ID }))
  })

  // ── BridgeInspectionElements — resolve bridge_ID from linked inspection ──
  this.before(['CREATE', 'UPDATE'], 'BridgeInspectionElements', async (req) => {
    if (!req.data.inspection_ID || req.data.bridge_ID) return
    const db = await cds.connect.to('db')
    const insp = await db.run(
      SELECT.one.from('bridge.management.BridgeInspections')
        .columns('bridge_ID').where({ ID: req.data.inspection_ID })
    )
    if (insp?.bridge_ID) req.data.bridge_ID = insp.bridge_ID
  })

  // ── BridgeDefects ─────────────────────────────────────────────────────────
  this.before('NEW', BridgeDefects.drafts, async (req) => {
    if (!req.data.defectId) {
      const last = await SELECT.one.from(BridgeDefects).columns('defectId').orderBy('defectId desc').limit(1)
      const m = last?.defectId?.match(/^DEF-(\d+)$/)
      const seq = m ? parseInt(m[1], 10) + 1 : 1
      req.data.defectId = `DEF-${String(seq).padStart(4, '0')}`
    }
    if (req.data.active === undefined) req.data.active = true
  })

  this.on('deactivate', BridgeDefects, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgeDefects', { ID })
    await db.run(UPDATE('bridge.management.BridgeDefects').set({ active: false }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'Defect', objectId: ID, objectName: old?.defectId || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'active', oldValue: 'true', newValue: 'false' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeDefects').where({ ID }))
  })

  this.on('reactivate', BridgeDefects, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgeDefects', { ID })
    await db.run(UPDATE('bridge.management.BridgeDefects').set({ active: true }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'Defect', objectId: ID, objectName: old?.defectId || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'active', oldValue: 'false', newValue: 'true' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeDefects').where({ ID }))
  })

  // ── BridgeRiskAssessments ────────────────────────────────────────────────
  this.on('deactivate',  BridgeRiskAssessments.drafts, req => req.error(409, 'Save or discard your changes before deactivating.'))
  this.on('reactivate',  BridgeRiskAssessments.drafts, req => req.error(409, 'Save or discard your changes before reactivating.'))

  this.before('NEW', BridgeRiskAssessments.drafts, async (req) => {
    if (!req.data.assessmentId) {
      const last = await SELECT.one.from(BridgeRiskAssessments).columns('assessmentId').orderBy('assessmentId desc').limit(1)
      const m = last?.assessmentId?.match(/^RSK-(\d+)$/)
      const seq = m ? parseInt(m[1], 10) + 1 : 1
      req.data.assessmentId = `RSK-${String(seq).padStart(4, '0')}`
    }
    if (req.data.active === undefined) req.data.active = true
  })

  const _computeRiskScore = async (req, db) => {
    const d = req.data
    let likelihood = d.likelihood ?? null
    let consequence = d.consequence ?? null
    // During draftActivate, req.data only has {IsActiveEntity:true} — fetch from draft
    if ((likelihood === null || consequence === null) && d.ID) {
      const table = req.target?.name?.includes('.drafts')
        ? 'bridge.management.BridgeRiskAssessments.drafts'
        : 'bridge.management.BridgeRiskAssessments.drafts'
      const draft = await db.run(
        SELECT.one.from(table).columns('likelihood', 'consequence').where({ ID: d.ID })
      ).catch(() => null)
      likelihood = likelihood ?? draft?.likelihood ?? null
      consequence = consequence ?? draft?.consequence ?? null
    }
    if (likelihood !== null && consequence !== null) {
      d.inherentRiskScore = likelihood * consequence
      const score = d.inherentRiskScore
      d.inherentRiskLevel = score >= 15 ? 'Extreme' : score >= 10 ? 'High' : score >= 5 ? 'Medium' : 'Low'
    }

    let residualL = d.residualLikelihood ?? null
    let residualC = d.residualConsequence ?? null
    if ((residualL === null || residualC === null) && d.ID) {
      const draft = await db.run(
        SELECT.one.from('bridge.management.BridgeRiskAssessments.drafts')
          .columns('residualLikelihood', 'residualConsequence').where({ ID: d.ID })
      ).catch(() => null)
      residualL = residualL ?? draft?.residualLikelihood ?? null
      residualC = residualC ?? draft?.residualConsequence ?? null
    }
    if (residualL !== null && residualC !== null) {
      d.residualRiskScore = residualL * residualC
      const rs = d.residualRiskScore
      d.residualRiskLevel = rs >= 15 ? 'Extreme' : rs >= 10 ? 'High' : rs >= 5 ? 'Medium' : 'Low'
    }
  }

  this.before(['CREATE', 'UPDATE'], BridgeRiskAssessments, async (req) => {
    await _computeRiskScore(req, await cds.connect.to('db'))
  })

  if (BridgeRiskAssessments?.drafts) {
    this.before('UPDATE', BridgeRiskAssessments.drafts, async (req) => {
      await _computeRiskScore(req, await cds.connect.to('db'))
    })
  }

  this.on('deactivate', BridgeRiskAssessments, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgeRiskAssessments', { ID })
    await db.run(UPDATE('bridge.management.BridgeRiskAssessments').set({ active: false }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'RiskAssessment', objectId: ID, objectName: old?.assessmentId || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'active', oldValue: 'true', newValue: 'false' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeRiskAssessments').where({ ID }))
  })

  this.on('reactivate', BridgeRiskAssessments, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgeRiskAssessments', { ID })
    await db.run(UPDATE('bridge.management.BridgeRiskAssessments').set({ active: true }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'RiskAssessment', objectId: ID, objectName: old?.assessmentId || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'active', oldValue: 'false', newValue: 'true' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeRiskAssessments').where({ ID }))
  })

  if (BridgeRiskAssessments?.drafts) {
    this.on('deactivate', BridgeRiskAssessments.drafts, req => req.error(409, 'Save or discard changes before deactivating.'))
    this.on('reactivate', BridgeRiskAssessments.drafts, req => req.error(409, 'Save or discard changes before deactivating.'))
  }

  // ── LoadRatingCertificates ───────────────────────────────────────────────
  this.before('NEW', LoadRatingCertificates.drafts, async (req) => {
    if (req.data.active === undefined) req.data.active = true
    if (!req.data.certificateNumber) {
      const last = await SELECT.one.from(LoadRatingCertificates).columns('certificateNumber').orderBy('createdAt desc')
      const m = last?.certificateNumber?.match(/^LRC-(\d+)$/)
      const seq = m ? parseInt(m[1], 10) + 1 : 1
      req.data.certificateNumber = 'LRC-' + String(seq).padStart(4, '0')
    }
  })

  this.on('deactivate', LoadRatingCertificates, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.LoadRatingCertificates', { ID })
    await db.run(UPDATE('bridge.management.LoadRatingCertificates').set({ status: 'Superseded' }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'LoadRatingCert', objectId: ID, objectName: old?.certificateNumber || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'status', oldValue: old?.status || 'Current', newValue: 'Superseded' }]
    })
    return db.run(SELECT.one.from('bridge.management.LoadRatingCertificates').where({ ID }))
  })

  this.on('reactivate', LoadRatingCertificates, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.LoadRatingCertificates', { ID })
    await db.run(UPDATE('bridge.management.LoadRatingCertificates').set({ status: 'Current' }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'LoadRatingCert', objectId: ID, objectName: old?.certificateNumber || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'status', oldValue: old?.status || 'Superseded', newValue: 'Current' }]
    })
    return db.run(SELECT.one.from('bridge.management.LoadRatingCertificates').where({ ID }))
  })

  // ── NhvrRouteAssessments ─────────────────────────────────────────────────
  this.before('NEW', NhvrRouteAssessments.drafts, async (req) => {
    if (!req.data.assessmentId) {
      const last = await cds.run(SELECT.one.from('bridge.management.NhvrRouteAssessments').columns('assessmentId').orderBy('assessmentId desc').limit(1))
      const m = last?.assessmentId?.match(/^NRA-(\d+)$/)
      const seq = m ? parseInt(m[1], 10) + 1 : 1
      req.data.assessmentId = `NRA-${String(seq).padStart(4, '0')}`
    }
    if (req.data.active === undefined) req.data.active = true
  })

  this.on('deactivate', NhvrRouteAssessments, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.NhvrRouteAssessments', { ID })
    await db.run(UPDATE('bridge.management.NhvrRouteAssessments').set({ assessmentStatus: 'Superseded' }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'NhvrAssessment', objectId: ID, objectName: old?.assessmentId || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'assessmentStatus', oldValue: old?.assessmentStatus || 'Current', newValue: 'Superseded' }]
    })
    // Re-sync Bridge.nhvrAssessed — roll back to most recent remaining Current assessment,
    // or clear to false/null if no Current assessment remains for this bridge.
    if (old?.bridge_ID) {
      const remaining = await db.run(
        SELECT.one.from('bridge.management.NhvrRouteAssessments')
          .columns('assessmentDate')
          .where({ bridge_ID: old.bridge_ID, assessmentStatus: 'Current' })
          .orderBy('assessmentDate desc')
      )
      await db.run(UPDATE('bridge.management.Bridges')
        .set({ nhvrAssessed: !!remaining, nhvrAssessmentDate: remaining?.assessmentDate ?? null })
        .where({ ID: old.bridge_ID }))
    }
    return db.run(SELECT.one.from('bridge.management.NhvrRouteAssessments').where({ ID }))
  })

  this.on('reactivate', NhvrRouteAssessments, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.NhvrRouteAssessments', { ID })
    await db.run(UPDATE('bridge.management.NhvrRouteAssessments').set({ assessmentStatus: 'Current' }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'NhvrAssessment', objectId: ID, objectName: old?.assessmentId || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'assessmentStatus', oldValue: old?.assessmentStatus || 'Superseded', newValue: 'Current' }]
    })
    // Re-sync Bridge.nhvrAssessed to reflect newly Current assessment
    if (old?.bridge_ID && old?.assessmentDate) {
      await db.run(UPDATE('bridge.management.Bridges')
        .set({ nhvrAssessed: true, nhvrAssessmentDate: old.assessmentDate })
        .where({ ID: old.bridge_ID }))
    }
    return db.run(SELECT.one.from('bridge.management.NhvrRouteAssessments').where({ ID }))
  })

  // ── BridgeConditionSurveys (CON tile) ───────────────────────────────────

  // Draft guards — block deactivate/reactivate/approve/rejectPermit on unsaved drafts
  this.on('deactivate',   BridgeConditionSurveys.drafts, req => req.error(409, 'Save or discard your changes before deactivating.'))
  this.on('reactivate',   BridgeConditionSurveys.drafts, req => req.error(409, 'Save or discard your changes before reactivating.'))
  this.on('deactivate',   BridgeLoadRatings.drafts,      req => req.error(409, 'Save or discard your changes before deactivating.'))
  this.on('reactivate',   BridgeLoadRatings.drafts,      req => req.error(409, 'Save or discard your changes before reactivating.'))
  this.on('deactivate',   BridgePermits.drafts,          req => req.error(409, 'Save or discard your changes before deactivating.'))
  this.on('reactivate',   BridgePermits.drafts,          req => req.error(409, 'Save or discard your changes before reactivating.'))
  this.on('approve',      BridgePermits.drafts,          req => req.error(409, 'Save or discard your changes before approving.'))
  this.on('rejectPermit', BridgePermits.drafts,          req => req.error(409, 'Save or discard your changes before rejecting.'))

  this.before('NEW', BridgeConditionSurveys.drafts, async (req) => {
    if (!req.data.surveyRef) {
      const last = await cds.run(SELECT.one.from('bridge.management.BridgeConditionSurveys').columns('surveyRef').orderBy('surveyRef desc').limit(1))
      const m = last?.surveyRef?.match(/^CS-(\d+)$/)
      const seq = m ? parseInt(m[1], 10) + 1 : 1
      req.data.surveyRef = `CS-${String(seq).padStart(4, '0')}`
    }
    if (req.data.active === undefined) req.data.active = true
  })

  this.on('deactivate', BridgeConditionSurveys, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgeConditionSurveys', { ID })
    await db.run(UPDATE('bridge.management.BridgeConditionSurveys').set({ active: false }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'ConditionSurvey', objectId: ID, objectName: old?.surveyRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'active', oldValue: 'true', newValue: 'false' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeConditionSurveys').where({ ID }))
  })

  this.on('reactivate', BridgeConditionSurveys, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgeConditionSurveys', { ID })
    await db.run(UPDATE('bridge.management.BridgeConditionSurveys').set({ active: true }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'ConditionSurvey', objectId: ID, objectName: old?.surveyRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'active', oldValue: 'false', newValue: 'true' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeConditionSurveys').where({ ID }))
  })

  this.before('UPDATE', BridgeConditionSurveys, async (req) => {
    if (!req.data?.ID) return
    const db = await cds.connect.to('db')
    req._auditOld = await fetchCurrentRecord(db, 'bridge.management.BridgeConditionSurveys', { ID: req.data.ID })
  })

  this.after('UPDATE', BridgeConditionSurveys, async (_result, req) => {
    if (!req._auditOld) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.BridgeConditionSurveys', { ID: req._auditOld.ID })
    if (!fresh) return
    const changes = diffRecords(req._auditOld, fresh)
    if (!changes.length) return
    await writeChangeLogs(db, {
      objectType: 'ConditionSurvey', objectId: req._auditOld.ID,
      objectName: fresh.surveyRef || req._auditOld.ID, source: 'OData',
      batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system', changes
    })
  })

  this.after('CREATE', BridgeConditionSurveys, async (result, req) => {
    if (!result?.ID) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.BridgeConditionSurveys', { ID: result.ID })
    if (!fresh) return
    const changes = Object.entries(fresh)
      .filter(([k, v]) => !['modifiedAt','modifiedBy','createdAt','createdBy'].includes(k) && v != null && v !== '')
      .map(([k, v]) => ({ fieldName: k, oldValue: '', newValue: String(v) }))
    await writeChangeLogs(db, {
      objectType: 'ConditionSurvey', objectId: result.ID, objectName: fresh.surveyRef || result.ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system', changes
    })
  })

  this.on('submitForReview', BridgeConditionSurveys, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const survey = await db.run(SELECT.one.from('bridge.management.BridgeConditionSurveys').where({ ID }))
    if (!survey) return req.error(404, 'Condition survey not found')
    if (survey.status !== 'Draft')
      return req.error(422, `Cannot submit survey in status "${survey.status}" — only Draft surveys can be submitted`)
    await db.run(UPDATE('bridge.management.BridgeConditionSurveys').set({ status: 'Submitted' }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'ConditionSurvey', objectId: ID, objectName: survey.surveyRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'status', oldValue: 'Draft', newValue: 'Submitted' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeConditionSurveys').where({ ID }))
  })

  this.on('approveSurvey', BridgeConditionSurveys, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const survey = await db.run(SELECT.one.from('bridge.management.BridgeConditionSurveys').where({ ID }))
    if (!survey) return req.error(404, 'Condition survey not found')
    if (survey.status !== 'Submitted')
      return req.error(422, `Cannot approve survey in status "${survey.status}" — only Submitted surveys can be approved`)
    await db.run(UPDATE('bridge.management.BridgeConditionSurveys').set({ status: 'Approved' }).where({ ID }))
    if (survey.conditionRating && survey.bridge_ID) {
      await db.run(UPDATE('bridge.management.Bridges')
        .set({ conditionRating: survey.conditionRating })
        .where({ ID: survey.bridge_ID }))
    }
    await writeChangeLogs(db, {
      objectType: 'ConditionSurvey', objectId: ID, objectName: survey.surveyRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'status', oldValue: 'Submitted', newValue: 'Approved' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeConditionSurveys').where({ ID }))
  })

  this.on('rejectSurvey', BridgeConditionSurveys, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const survey = await db.run(SELECT.one.from('bridge.management.BridgeConditionSurveys').where({ ID }))
    if (!survey) return req.error(404, 'Condition survey not found')
    if (survey.status !== 'Submitted')
      return req.error(422, `Cannot reject survey in status "${survey.status}" — only Submitted surveys can be rejected`)
    await db.run(UPDATE('bridge.management.BridgeConditionSurveys').set({ status: 'Rejected' }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'ConditionSurvey', objectId: ID, objectName: survey.surveyRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'status', oldValue: 'Submitted', newValue: 'Rejected' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeConditionSurveys').where({ ID }))
  })

  this.before('DELETE', BridgeConditionSurveys, (req) => {
    if (req.data?.IsActiveEntity !== false) req.error(405, 'Hard delete is not permitted. Use the Deactivate action instead.')
  })

  // ── BridgeLoadRatings (LRT tile) ─────────────────────────────────────────
  this.before('NEW', BridgeLoadRatings.drafts, async (req) => {
    if (!req.data.ratingRef) {
      const { cnt } = await SELECT.one.from(BridgeLoadRatings).columns('count(1) as cnt')
      req.data.ratingRef = `LR-${String((cnt || 0) + 1).padStart(4, '0')}`
    }
    if (!req.data.status) req.data.status = 'Active'
    if (req.data.active === undefined) req.data.active = true
  })

  this.on('deactivate', BridgeLoadRatings, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgeLoadRatings', { ID })
    await db.run(UPDATE('bridge.management.BridgeLoadRatings').set({ active: false, status: 'Superseded' }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'LoadRating', objectId: ID, objectName: old?.ratingRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [
        { fieldName: 'active', oldValue: 'true', newValue: 'false' },
        { fieldName: 'status', oldValue: old?.status || 'Active', newValue: 'Superseded' }
      ]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeLoadRatings').where({ ID }))
  })

  this.on('reactivate', BridgeLoadRatings, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgeLoadRatings', { ID })
    await db.run(UPDATE('bridge.management.BridgeLoadRatings').set({ active: true, status: 'Active' }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'LoadRating', objectId: ID, objectName: old?.ratingRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [
        { fieldName: 'active', oldValue: 'false', newValue: 'true' },
        { fieldName: 'status', oldValue: old?.status || 'Superseded', newValue: 'Active' }
      ]
    })
    return db.run(SELECT.one.from('bridge.management.BridgeLoadRatings').where({ ID }))
  })

  this.before('UPDATE', BridgeLoadRatings, async (req) => {
    if (!req.data?.ID) return
    const db = await cds.connect.to('db')
    req._auditOld = await fetchCurrentRecord(db, 'bridge.management.BridgeLoadRatings', { ID: req.data.ID })
  })

  this.after('UPDATE', BridgeLoadRatings, async (_result, req) => {
    if (!req._auditOld) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.BridgeLoadRatings', { ID: req._auditOld.ID })
    if (!fresh) return
    const changes = diffRecords(req._auditOld, fresh)
    if (!changes.length) return
    await writeChangeLogs(db, {
      objectType: 'LoadRating', objectId: req._auditOld.ID,
      objectName: fresh.ratingRef || req._auditOld.ID, source: 'OData',
      batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system', changes
    })
  })

  this.after('CREATE', BridgeLoadRatings, async (result, req) => {
    if (!result?.ID) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.BridgeLoadRatings', { ID: result.ID })
    if (!fresh) return
    const changes = Object.entries(fresh)
      .filter(([k, v]) => !['modifiedAt','modifiedBy','createdAt','createdBy'].includes(k) && v != null && v !== '')
      .map(([k, v]) => ({ fieldName: k, oldValue: '', newValue: String(v) }))
    await writeChangeLogs(db, {
      objectType: 'LoadRating', objectId: result.ID, objectName: fresh.ratingRef || result.ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system', changes
    })
  })

  this.before('DELETE', BridgeLoadRatings, (req) => {
    if (req.data?.IsActiveEntity !== false) req.error(405, 'Hard delete is not permitted. Use the Deactivate action instead.')
  })

  // ── BridgePermits (PRM tile) ─────────────────────────────────────────────
  this.before('NEW', BridgePermits.drafts, async (req) => {
    if (!req.data.permitRef) {
      const { cnt } = await SELECT.one.from(BridgePermits).columns('count(1) as cnt')
      req.data.permitRef = `PM-${String((cnt || 0) + 1).padStart(4, '0')}`
    }
    if (!req.data.status) req.data.status = 'Pending'
    if (req.data.active === undefined) req.data.active = true
  })

  this.on('approve', BridgePermits, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgePermits', { ID })
    const now = new Date().toISOString().split('T')[0]
    await db.run(UPDATE('bridge.management.BridgePermits').set({
      status: 'Approved', decisionBy: req.user?.id || 'system', decisionDate: now
    }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'Permit', objectId: ID, objectName: old?.permitRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'status', oldValue: old?.status || 'Pending', newValue: 'Approved' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgePermits').where({ ID }))
  })

  this.on('rejectPermit', BridgePermits, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgePermits', { ID })
    const now = new Date().toISOString().split('T')[0]
    await db.run(UPDATE('bridge.management.BridgePermits').set({
      status: 'Rejected', decisionBy: req.user?.id || 'system', decisionDate: now
    }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'Permit', objectId: ID, objectName: old?.permitRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'status', oldValue: old?.status || 'Pending', newValue: 'Rejected' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgePermits').where({ ID }))
  })

  this.on('deactivate', BridgePermits, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgePermits', { ID })
    await db.run(UPDATE('bridge.management.BridgePermits').set({ active: false }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'Permit', objectId: ID, objectName: old?.permitRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'active', oldValue: 'true', newValue: 'false' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgePermits').where({ ID }))
  })

  this.on('reactivate', BridgePermits, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    const old = await fetchCurrentRecord(db, 'bridge.management.BridgePermits', { ID })
    await db.run(UPDATE('bridge.management.BridgePermits').set({ active: true }).where({ ID }))
    await writeChangeLogs(db, {
      objectType: 'Permit', objectId: ID, objectName: old?.permitRef || ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system',
      changes: [{ fieldName: 'active', oldValue: 'false', newValue: 'true' }]
    })
    return db.run(SELECT.one.from('bridge.management.BridgePermits').where({ ID }))
  })

  this.before('UPDATE', BridgePermits, async (req) => {
    if (!req.data?.ID) return
    const db = await cds.connect.to('db')
    req._auditOld = await fetchCurrentRecord(db, 'bridge.management.BridgePermits', { ID: req.data.ID })
  })

  this.after('UPDATE', BridgePermits, async (_result, req) => {
    if (!req._auditOld) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.BridgePermits', { ID: req._auditOld.ID })
    if (!fresh) return
    const changes = diffRecords(req._auditOld, fresh)
    if (!changes.length) return
    await writeChangeLogs(db, {
      objectType: 'Permit', objectId: req._auditOld.ID,
      objectName: fresh.permitRef || req._auditOld.ID, source: 'OData',
      batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system', changes
    })
  })

  this.after('CREATE', BridgePermits, async (result, req) => {
    if (!result?.ID) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.BridgePermits', { ID: result.ID })
    if (!fresh) return
    const changes = Object.entries(fresh)
      .filter(([k, v]) => !['modifiedAt','modifiedBy','createdAt','createdBy'].includes(k) && v != null && v !== '')
      .map(([k, v]) => ({ fieldName: k, oldValue: '', newValue: String(v) }))
    await writeChangeLogs(db, {
      objectType: 'Permit', objectId: result.ID, objectName: fresh.permitRef || result.ID,
      source: 'OData', batchId: cds.utils.uuid(), changedBy: req.user?.id || 'system', changes
    })
  })

  this.before('DELETE', BridgePermits, (req) => {
    if (req.data?.IsActiveEntity !== false) req.error(405, 'Hard delete is not permitted. Use the Deactivate action instead.')
  })

  // ── Audit: GIS Config ────────────────────────────────────────────────────
  this.before('UPDATE', GISConfig, async (req) => {
    const db = await cds.connect.to('db')
    req._auditOld = await fetchCurrentRecord(db, 'bridge.management.GISConfig', { id: 'default' })
  })

  this.after('UPDATE', GISConfig, async (_result, req) => {
    if (!req._auditOld) return
    const db = await cds.connect.to('db')
    const fresh = await fetchCurrentRecord(db, 'bridge.management.GISConfig', { id: 'default' })
    if (!fresh) return
    const changes = diffRecords(req._auditOld, fresh)
    if (!changes.length) return
    await writeChangeLogs(db, {
      objectType:  'GISConfig',
      objectId:    'default',
      objectName:  'GIS Configuration',
      source:      'OData',
      batchId:     cds.utils.uuid(),
      changedBy:   req.user?.id || 'system',
      changes
    })
  })

  this.after(['CREATE', 'UPDATE'], BridgeScourAssessments, async (data, req) => {
    if (!data?.bridge_ID || !data?.scourRisk) return
    const db = await cds.connect.to('db')
    await db.run(UPDATE('bridge.management.Bridges')
      .set({ scourRisk: data.scourRisk })
      .where({ ID: data.bridge_ID }))
  })

  this.after(['CREATE', 'UPDATE'], NhvrRouteAssessments, async (data, req) => {
    if (!data?.bridge_ID || data?.assessmentStatus !== 'Current') return
    const db = await cds.connect.to('db')
    await db.run(UPDATE('bridge.management.Bridges')
      .set({ nhvrAssessed: true, nhvrAssessmentDate: data.assessmentDate })
      .where({ ID: data.bridge_ID }))
  })

  // ── AssetIQ Risk Scoring Engine ──────────────────────────────────────────────

  const computeAssetIQScore = (bridge, defectCount, model) => {
    const bciNorm = bridge.conditionRating ? (bridge.conditionRating / 10) : 0.5
    const bciFactor = (1 - bciNorm) * 100 * model.bciWeight

    const age = bridge.yearBuilt ? (new Date().getFullYear() - bridge.yearBuilt) : 40
    const ageFactor = Math.min(1, age / 120) * 100 * model.ageWeight

    const hvPct = bridge.heavyVehiclePercent || 10
    const trafficFactor = Math.min(1, hvPct / 30) * 100 * model.trafficWeight

    const defectFactor = Math.min(1, defectCount / 5) * 100 * model.defectWeight

    const loadFactor = (bridge.postingStatus === 'Posted' || bridge.postingStatus === 'Closed')
      ? 100 * model.loadWeight
      : 20 * model.loadWeight

    const overall = bciFactor + ageFactor + trafficFactor + defectFactor + loadFactor
    const ragStatus = overall >= 60 ? 'RED' : overall >= 35 ? 'AMBER' : 'GREEN'

    return {
      bciFactor: Math.round(bciFactor * 100) / 100,
      ageFactor: Math.round(ageFactor * 100) / 100,
      trafficFactor: Math.round(trafficFactor * 100) / 100,
      defectFactor: Math.round(defectFactor * 100) / 100,
      loadFactor: Math.round(loadFactor * 100) / 100,
      overall: Math.round(overall * 100) / 100,
      ragStatus
    }
  }

  const DEFAULT_MODEL = { bciWeight: 0.350, ageWeight: 0.150, trafficWeight: 0.200, defectWeight: 0.200, loadWeight: 0.100 }

  this.on('scoreAllBridges', async req => {
    const db = await cds.connect.to('db')
    const now = new Date().toISOString()

    const activeModel = await db.run(
      SELECT.one.from('bridge.management.AssetIQModels').where({ isActive: true })
    )
    const model = activeModel || { version: '1.0.0', ...DEFAULT_MODEL }

    const BATCH_SIZE = 500
    let skip = 0
    let scored = 0
    let skipped = 0

    while (true) {
      const bridges = await db.run(
        SELECT.from('bridge.management.Bridges')
          .columns('ID', 'conditionRating', 'yearBuilt', 'heavyVehiclePercent', 'postingStatus')
          .where({ isActive: true })
          .limit(BATCH_SIZE, skip)
      )

      if (!bridges.length) break

      const bridgeIds = bridges.map(b => b.ID)

      const defectCounts = await db.run(
        SELECT.from('bridge.management.BridgeDefects')
          .columns('bridge_ID', 'count(1) as cnt')
          .where({ bridge_ID: { in: bridgeIds }, severity: { '>=': 3 }, remediationStatus: 'Open' })
          .groupBy('bridge_ID')
      )
      const defectMap = Object.fromEntries((defectCounts || []).map(r => [r.bridge_ID, Number(r.cnt)]))

      const existingScores = await db.run(
        SELECT.from('bridge.management.AssetIQScores')
          .columns('ID', 'bridge_ID')
          .where({ bridge_ID: { in: bridgeIds } })
      )
      const existingMap = Object.fromEntries((existingScores || []).map(r => [r.bridge_ID, r.ID]))

      for (const bridge of bridges) {
        try {
          const defectCount = defectMap[bridge.ID] || 0
          const computed = computeAssetIQScore(bridge, defectCount, model)
          const scoreRecord = {
            overallScore:   computed.overall,
            ragStatus:      computed.ragStatus,
            bciFactor:      computed.bciFactor,
            ageFactor:      computed.ageFactor,
            trafficFactor:  computed.trafficFactor,
            defectFactor:   computed.defectFactor,
            loadFactor:     computed.loadFactor,
            modelVersion:   model.version || '1.0.0',
            scoredAt:       now
          }
          const existingId = existingMap[bridge.ID]
          if (existingId) {
            await db.run(UPDATE('bridge.management.AssetIQScores').set(scoreRecord).where({ ID: existingId }))
          } else {
            await db.run(INSERT.into('bridge.management.AssetIQScores').entries({
              ID: cds.utils.uuid(),
              bridge_ID: bridge.ID,
              overrideFlag: false,
              ...scoreRecord
            }))
          }
          scored++
        } catch (_) {
          skipped++
        }
      }

      skip += bridges.length
      if (bridges.length < BATCH_SIZE) break
    }

    if (scored === 0 && skipped === 0) return { scored: 0, skipped: 0, message: 'No active bridges found' }
    return { scored, skipped, message: `AssetIQ scored ${scored} bridges (${skipped} skipped)` }
  })

  this.on('override', 'AssetIQScores', async req => {
    const { ID } = req.params[0]
    const reason = req.data?.reason
    if (!reason) return req.error(400, 'Override reason is required')
    const db = await cds.connect.to('db')
    await db.run(UPDATE('bridge.management.AssetIQScores').set({
      overrideFlag:   true,
      overrideBy:     req.user?.id || 'system',
      overrideReason: reason,
      overrideAt:     new Date().toISOString()
    }).where({ ID }))
    return db.run(SELECT.one.from('bridge.management.AssetIQScores').where({ ID }))
  })

  this.on('dismissOverride', 'AssetIQScores', async req => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    await db.run(UPDATE('bridge.management.AssetIQScores').set({
      overrideFlag:   false,
      overrideBy:     null,
      overrideReason: null,
      overrideAt:     null
    }).where({ ID }))
    return db.run(SELECT.one.from('bridge.management.AssetIQScores').where({ ID }))
  })

  this.on('activate', 'AssetIQModels', async req => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    await db.run(UPDATE('bridge.management.AssetIQModels').set({ isActive: false }))
    await db.run(UPDATE('bridge.management.AssetIQModels').set({
      isActive:    true,
      activatedAt: new Date().toISOString(),
      activatedBy: req.user?.id || 'system'
    }).where({ ID }))
    return db.run(SELECT.one.from('bridge.management.AssetIQModels').where({ ID }))
  })

  this.on('refreshKPISnapshots', async req => {
    const db = await cds.connect.to('db')
    const today = new Date().toISOString().slice(0, 10)
    const ninetyDaysOut = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    // Read configurable overdue threshold (default 5 years if not set)
    let overdueYears = 5
    try {
      const cfg = await db.run(SELECT.one.from('bridge.management.SystemConfig').where({ configKey: 'kpi.overdueInspectionYears' }))
      if (cfg?.value) overdueYears = parseInt(cfg.value) || 5
    } catch (_) {}
    const now = new Date()
    const overdueThreshold = new Date(now.getFullYear() - overdueYears, now.getMonth(), now.getDate()).toISOString().slice(0, 10)

    // Run 5 GROUP BY queries once for all states — eliminates N×5 per-state query loop
    const [
      totalsByState,
      overdueByState,
      restrictionsByState,
      alertsByState,
      lrcByState
    ] = await Promise.all([
      // 1. Bridge totals + averages by state
      db.run(
        SELECT.from('bridge.management.Bridges')
          .columns(
            'state',
            'count(1) as totalBridges',
            'sum(case when conditionRating <= 3 then 1 else 0 end) as criticalCondition',
            'sum(case when highPriorityAsset = true then 1 else 0 end) as highPriority',
            'avg(conditionRating) as avgConditionRating'
          )
          .where({ isActive: true })
          .groupBy('state')
      ),
      // 2. Overdue inspections by state (lastInspectionDate older than threshold)
      db.run(
        SELECT.from('bridge.management.Bridges')
          .columns('state', 'count(1) as cnt')
          .where({ isActive: true })
          .and(`lastInspectionDate <= '${overdueThreshold}'`)
          .groupBy('state')
      ),
      // 3. Active restrictions by state via bridge join
      db.run(
        SELECT.from('bridge.management.Restrictions as r')
          .join('bridge.management.Bridges as b').on('r.bridge_ID = b.ID')
          .columns('b.state', 'count(1) as cnt')
          .where({ 'r.active': true })
          .groupBy('b.state')
      ),
      // 4. Open alerts by state via bridge join
      db.run(
        SELECT.from('bridge.management.AlertsAndNotifications as a')
          .join('bridge.management.Bridges as b').on('a.bridge_ID = b.ID')
          .columns('b.state', 'count(1) as cnt')
          .where({ 'a.status': 'Open' })
          .groupBy('b.state')
      ),
      // 5. LRC expiring within 90 days by state via bridge join
      db.run(
        SELECT.from('bridge.management.LoadRatingCertificates as l')
          .join('bridge.management.Bridges as b').on('l.bridge_ID = b.ID')
          .columns('b.state', 'count(1) as cnt')
          .where({ 'l.active': true })
          .and(`l.certificateExpiryDate <= '${ninetyDaysOut}'`)
          .groupBy('b.state')
      )
    ])

    // Build helper maps: state → value
    const toMap = (rows, key = 'cnt') => Object.fromEntries(rows.map(r => [r.state, parseInt(r[key] || 0)]))
    const totalMap   = toMap(totalsByState, 'totalBridges')
    const critMap    = toMap(totalsByState, 'criticalCondition')
    const hpMap      = toMap(totalsByState, 'highPriority')
    const avgMap     = Object.fromEntries(totalsByState.map(r => [r.state, parseFloat(r.avgConditionRating || 0)]))
    const overdueMap = toMap(overdueByState)
    const restrictMap= toMap(restrictionsByState)
    const alertMap   = toMap(alertsByState)
    const lrcMap     = toMap(lrcByState)

    // Compute ALL-state aggregates
    const sumAll = map => Object.values(map).reduce((a, b) => a + b, 0)
    const allTotal = sumAll(totalMap)
    const allAvgCond = Object.values(avgMap).length
      ? Object.values(avgMap).reduce((a, b) => a + b, 0) / Object.values(avgMap).length
      : 0

    const statesToProcess = [...new Set([...Object.keys(totalMap), 'ALL'])]
    let statesProcessed = 0

    for (const state of statesToProcess) {
      const isAll = state === 'ALL'
      const snapshot = {
        snapshotDate:       today,
        snapshotType:       'Daily',
        state,
        totalBridges:       isAll ? allTotal : (totalMap[state] || 0),
        activeBridges:      isAll ? allTotal : (totalMap[state] || 0),
        criticalCondition:  isAll ? sumAll(critMap) : (critMap[state] || 0),
        highPriority:       isAll ? sumAll(hpMap) : (hpMap[state] || 0),
        overdueInspections: isAll ? sumAll(overdueMap) : (overdueMap[state] || 0),
        activeRestrictions: isAll ? sumAll(restrictMap) : (restrictMap[state] || 0),
        openAlerts:         isAll ? sumAll(alertMap) : (alertMap[state] || 0),
        avgConditionRating: Math.round((isAll ? allAvgCond : (avgMap[state] || 0)) * 100) / 100 || null,
        highRiskCount:      0,
        lrcExpiringCount:   isAll ? sumAll(lrcMap) : (lrcMap[state] || 0),
        nhvrExpiringCount:  0
      }

      const existing = await db.run(
        SELECT.one.from('bridge.management.KPISnapshots')
          .where({ snapshotDate: today, snapshotType: 'Daily', state })
      )
      if (existing) {
        await db.run(UPDATE('bridge.management.KPISnapshots').set(snapshot)
          .where({ snapshotDate: today, snapshotType: 'Daily', state }))
      } else {
        await db.run(INSERT.into('bridge.management.KPISnapshots').entries(snapshot))
      }
      statesProcessed++
    }

    return { snapshotDate: today, statesProcessed, message: `KPI snapshot refreshed for ${statesProcessed} states` }
  })

  // ── BridgeMaintenanceActions — work orders ──────────────────────────────────
  const BridgeMaintenanceActions = this.entities.BridgeMaintenanceActions

  this.before(['CREATE', 'UPDATE'], BridgeMaintenanceActions, async req => {
    const d = req.data
    if (req.event === 'CREATE' && !d.actionRef) {
      const last = await SELECT.one.from(BridgeMaintenanceActions).columns('actionRef').orderBy('createdAt desc')
      const m = last?.actionRef?.match(/^MA-(\d+)$/)
      const seq = m ? parseInt(m[1], 10) + 1 : 1
      d.actionRef = 'MA-' + String(seq).padStart(4, '0')
    }
    if (d.bridgeRef) {
      const bridge = await SELECT.one.from(this.entities.Bridges).columns('ID').where({ bridgeId: d.bridgeRef })
      if (bridge) d.bridge_ID = bridge.ID
      else req.error(404, `Bridge '${d.bridgeRef}' not found`)
    }
  })

  this.on('deactivate', BridgeMaintenanceActions, async req => {
    const { ID } = req.params[0]
    await UPDATE(BridgeMaintenanceActions).set({ active: false }).where({ ID })
    return SELECT.one.from(BridgeMaintenanceActions).where({ ID })
  })

  this.on('reactivate', BridgeMaintenanceActions, async req => {
    const { ID } = req.params[0]
    await UPDATE(BridgeMaintenanceActions).set({ active: true }).where({ ID })
    return SELECT.one.from(BridgeMaintenanceActions).where({ ID })
  })

  if (BridgeMaintenanceActions?.drafts) {
    this.on('deactivate', BridgeMaintenanceActions.drafts, req => req.error(409, 'Save or discard changes before deactivating.'))
    this.on('reactivate', BridgeMaintenanceActions.drafts, req => req.error(409, 'Save or discard changes before reactivating.'))
    this.before('NEW', BridgeMaintenanceActions.drafts, async req => {
      if (req.data.active === undefined) req.data.active = true
      if (!req.data.actionRef) {
        const last = await SELECT.one.from(BridgeMaintenanceActions).columns('actionRef').orderBy('createdAt desc')
        const m = last?.actionRef?.match(/^MA-(\d+)$/)
        const seq = m ? parseInt(m[1], 10) + 1 : 1
        req.data.actionRef = 'MA-' + String(seq).padStart(4, '0')
      }
    })
  }

  return super.init()
}}
