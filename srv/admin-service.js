const cds = require('@sap/cds')
const { diffRecords, writeChangeLogs, fetchCurrentRecord } = require('./audit-log')

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
      ['conditionRating', 'Condition Rating'],
      ['structureType', 'Structure Type'],
      ['lastInspectionDate', 'Last Inspection Date']
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
        ['latitude', 'Latitude', -90, 90],
        ['longitude', 'Longitude', -180, 180],
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
  this.before(['CREATE', 'UPDATE'], BridgeScourAssessments, req => validateRequiredFieldsWithExisting(BridgeScourAssessments, 'BridgeScourAssessments', req))
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
  const POSTING_CRITICALITY = { 'Unrestricted': 3, 'Under Review': 2, 'Restricted': 2, 'Closed': 1 }

  this.after('READ', Bridges, async (results) => {
    const list = Array.isArray(results) ? results : (results ? [results] : [])
    for (const b of list) {
      if (!b) continue
      b.postingStatusCriticality = POSTING_CRITICALITY[b.postingStatus] ?? 2
      b.activeRestrictionCount   = 0
    }
    // Batch COUNT active restrictions for all records in one query
    const ids = list.map(b => b.ID).filter(Boolean)
    if (ids.length > 0) {
      const counts = await SELECT.from('bridge.management.BridgeRestrictions')
        .columns('bridge_ID', 'count(1) as cnt')
        .where({ bridge_ID: { in: ids }, active: true })
        .groupBy('bridge_ID')
      const countMap = Object.fromEntries(counts.map(r => [r.bridge_ID, Number(r.cnt)]))
      for (const b of list) b.activeRestrictionCount = countMap[b.ID] ?? 0
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
  this.before('DELETE', BridgeRestrictions, req => {
    if (req.data?.IsActiveEntity !== false) req.error(405, 'Hard delete is not permitted. Use the Deactivate action to retire this restriction.')
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
    await db.run(UPDATE('bridge.management.Restrictions').set({ active: false, restrictionStatus: 'Retired' }).where({ ID }))
    return db.run(SELECT.one.from('bridge.management.Restrictions').where({ ID }))
  })
  this.on('reactivate', Restrictions, async (req) => {
    const { ID } = req.params[0]
    const db = await cds.connect.to('db')
    await db.run(UPDATE('bridge.management.Restrictions').set({ active: true, restrictionStatus: 'Active' }).where({ ID }))
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

  // ── BridgeConditionSurveys (CON tile) ───────────────────────────────────
  const { BridgeConditionSurveys, BridgeLoadRatings, BridgePermits } = this.entities

  this.before('NEW', BridgeConditionSurveys.drafts, async (req) => {
    if (!req.data.surveyRef) {
      const { cnt } = await SELECT.one.from(BridgeConditionSurveys).columns('count(1) as cnt')
      req.data.surveyRef = `CS-${String((cnt || 0) + 1).padStart(4, '0')}`
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

  return super.init()
}}
