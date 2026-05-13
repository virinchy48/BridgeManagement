const cds = require('@sap/cds')
const XLSX = require('xlsx')

const { SELECT, INSERT, UPDATE } = cds.ql
const { diffRecords, writeChangeLogs, fetchCurrentRecord } = require('./audit-log')

const LOOKUP_COLUMNS = [
  column('code', 'string', { required: true }),
  column('name', 'string'),
  column('descr', 'string')
]

const ALLOWED_VALUES_COLUMNS = [
  column('entityName', 'string', { required: true }),
  column('code',       'string', { required: true }),
  column('label',      'string'),
  column('description','string')
]

const ALLOWED_VALUES_WHITELIST = new Set([
  'ConditionStates', 'ConditionTrends', 'ConditionSummaries', 'StructuralAdequacyTypes',
  'PostingStatuses', 'CapacityStatuses', 'AssetClasses', 'StructureTypes', 'DesignLoads',
  'States', 'Regions', 'InspectionTypes', 'ScourRiskLevels', 'PbsApprovalClasses',
  'RestrictionTypes', 'RestrictionStatuses', 'VehicleClasses', 'RestrictionCategories',
  'RestrictionUnits', 'RestrictionDirections', 'SurfaceTypes', 'SubstructureTypes',
  'FoundationTypes', 'WaterwayTypes', 'FatigueDetailCategories', 'DefectCodes'
])

const BRIDGE_COLUMNS = [
  column('ID', 'integer'),
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
  // ── Inspection Scheduling (TfNSW-BIM §4.1–4.2) ──────────────────────────
  column('inspectionType', 'string'),
  column('inspectionFrequencyYears', 'integer'),
  column('nextInspectionDue', 'date'),
  column('conditionTrend', 'string'),
  // ── Physical Characteristics — Standards Gaps ────────────────────────────
  column('surfaceType', 'string'),
  column('substructureType', 'string'),
  column('foundationType', 'string'),
  column('waterwayType', 'string'),
  // ── NHVR Approval Dates (NHVR-HVNL §§100–104) ───────────────────────────
  column('pbsApprovalDate', 'date'),
  column('pbsApprovalExpiry', 'date'),
  column('hmlApprovalDate', 'date'),
  column('hmlApprovalExpiry', 'date'),
  // ── Gazette & Legal (Roads Act 1993 NSW §§121–124) ───────────────────────
  column('gazetteEffectiveDate', 'date'),
  column('gazetteExpiryDate', 'date'),
  column('postingStatusReason', 'string'),
  column('closureDate', 'date'),
  column('closureEndDate', 'date'),
  column('closureReason', 'string'),
  // ── Interstate/WA dataset gap fields (May 2026) ───────────────────────────
  column('precinct', 'string'),
  column('spansOver', 'string'),
  column('locality', 'string'),
  column('facilityTypeCode', 'string'),
  column('operationalStatusCode', 'string'),
  column('structuralDeficiencyCode', 'string'),
  column('deficiencyComments', 'string'),
  column('loadLimitTruck', 'decimal'),
  column('loadLimitSemitrailer', 'decimal')
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
  column('remarks', 'string'),
  // ── AS 1742.10 Sign Management ────────────────────────────────────────────
  column('postingSignId', 'string'),
  // ── Gazette & Load Limit Order (Roads Act 1993 NSW §§121–124) ────────────
  column('gazetteNumber', 'string'),
  column('gazettePublicationDate', 'date'),
  column('gazetteExpiryDate', 'date'),
  column('loadLimitOrderRef', 'string'),
  column('loadLimitOrderDate', 'date'),
  column('loadLimitOrderExpiry', 'date'),
  // ── NHVR Escort requirements ──────────────────────────────────────────────
  column('pilotVehicleCount', 'integer')
]

const INSPECTION_COLUMNS = [
  column('ID',                           'string'),
  column('bridgeRef',                    'string',  { required: true }),
  column('inspectionDate',               'date',    { required: true }),
  column('inspectionType',               'string',  { required: true }),
  column('inspector',                    'string',  { required: true }),
  column('inspectorAccreditationNumber', 'string'),
  column('inspectorAccreditationLevel',  'string'),
  column('inspectorCompany',             'string'),
  column('inspectionScope',              'string'),
  column('inspectionStandard',           'string'),
  column('s4InspectionOrderRef',         'string'),
  column('s4NotificationRef',            'string'),
  column('inspectionNotes',              'string')
]

const ELEMENT_COLUMNS = [
  column('ID',                        'string'),
  column('bridgeRef',                 'string',  { required: true }),
  column('elementId',                 'string',  { required: true }),
  column('elementType',               'string',  { required: true }),
  column('elementName',               'string',  { required: true }),
  column('spanNumber',                'integer'),
  column('pierNumber',                'integer'),
  column('position',                  'string'),
  column('currentConditionRating',    'integer'),
  column('conditionRatingDate',       'date'),
  column('conditionTrend',            'string'),
  column('material',                  'string'),
  column('yearConstructed',           'integer'),
  column('yearLastRehabbed',          'integer'),
  column('maintenanceRequired',       'boolean'),
  column('urgencyLevel',              'string'),
  column('estimatedRepairCost',       'decimal'),
  column('s4EquipmentNumber',         'string'),
  column('notes',                     'string')
]

const BRIDGE_RESTRICTION_COLUMNS = [
  column('ID',                        'string'),
  column('bridgeRef',                 'string',  { required: true }),
  column('restrictionRef',            'string',  { required: true }),
  column('name',                      'string',  { required: true }),
  column('descr',                     'string'),
  column('restrictionCategory',       'string'),
  column('restrictionType',           'string'),
  column('restrictionValue',          'string'),
  column('restrictionUnit',           'string'),
  column('appliesToVehicleClass',     'string'),
  column('grossMassLimit',            'decimal'),
  column('axleMassLimit',             'decimal'),
  column('heightLimit',               'decimal'),
  column('widthLimit',                'decimal'),
  column('lengthLimit',               'decimal'),
  column('speedLimit',                'integer'),
  column('permitRequired',            'boolean'),
  column('active',                    'boolean'),
  column('effectiveFrom',             'date'),
  column('effectiveTo',               'date'),
  column('approvedBy',                'string'),
  column('direction',                 'string')
]

const PROVISION_COLUMNS = [
  column('ID',              'string'),
  column('restrictionRef', 'string',  { required: true }),  // natural FK — resolved to restriction_ID
  column('provisionNumber', 'integer'),
  column('provisionType',  'string'),
  column('provisionText',  'string',  { required: true }),
  column('vehicleClasses', 'string'),
  column('timeOfDay',      'string'),
  column('seasonalPeriod', 'string'),
  column('effectiveFrom',  'date'),
  column('effectiveTo',    'date'),
  column('approvedBy',     'string'),
  column('legalReference', 'string'),
  column('active',         'boolean')
]

const LRC_COLUMNS = [
  column('ID',                        'string'),
  column('bridgeRef',                 'string',  { required: true }),
  column('certificateNumber',         'string',  { required: true }),
  column('certificateVersion',        'integer'),
  column('status',                    'string'),
  column('ratingStandard',            'string',  { required: true }),
  column('ratingLevel',               'string',  { required: true }),
  column('certifyingEngineer',        'string',  { required: true }),
  column('engineerQualification',     'string',  { required: true }),
  column('engineerLicenseNumber',     'string'),
  column('engineerOrganisation',      'string'),
  column('rfT44',                     'decimal'),
  column('rfSM1600',                  'decimal'),
  column('rfHML',                     'decimal'),
  column('rfHLP400',                  'decimal'),
  column('dynamicLoadAllowance',      'decimal'),
  column('fatigueSensitive',          'boolean'),
  column('certificateIssueDate',      'date',    { required: true }),
  column('certificateExpiryDate',     'date',    { required: true }),
  column('nextReviewDate',            'date'),
  column('notes',                     'string')
]

const CONDITION_SURVEY_COLUMNS = [
  column('bridgeRef',                  'string',  { required: true }),
  column('surveyRef',                  'string'),
  column('surveyDate',                 'date',    { required: true }),
  column('surveyType',                 'string',  { required: true }),
  column('surveyedBy',                 'string',  { required: true }),
  column('conditionRating',            'integer', { required: true }),
  column('structuralRating',           'integer'),
  column('overallGrade',               'string'),
  column('inspectorAccreditationLevel','string'),
  column('accessMethod',               'string'),
  column('nextSurveyRecommended',      'date'),
  column('estimatedRehabCost',         'decimal'),
  column('actionPlan',                 'string'),
  column('linkedInspectionRef',        'string'),
  column('programmeYear',              'integer'),
  column('status',                     'string'),
  column('notes',                      'string'),
  column('remarks',                    'string'),
  column('active',                     'boolean'),
]

const LOAD_RATING_COLUMNS = [
  column('bridgeRef',              'string',  { required: true }),
  column('ratingRef',              'string'),
  column('vehicleClass',           'string',  { required: true }),
  column('ratingMethod',           'string',  { required: true }),
  column('ratingFactor',           'decimal'),
  column('grossMassLimit',         'decimal'),
  column('assessedBy',             'string',  { required: true }),
  column('assessmentDate',         'date',    { required: true }),
  column('validTo',                'date',    { required: true }),
  column('ratingEngineerNer',      'string'),
  column('governingMember',        'string'),
  column('governingFailureMode',   'string'),
  column('dynamicLoadAllowance',   'decimal'),
  column('reportRef',              'string'),
  column('status',                 'string'),
  column('remarks',                'string'),
  column('active',                 'boolean'),
]

const PERMIT_COLUMNS = [
  column('bridgeRef',             'string',  { required: true }),
  column('permitRef',             'string'),
  column('permitType',            'string',  { required: true }),
  column('applicantName',         'string',  { required: true }),
  column('nhvrPermitNumber',      'string'),
  column('nhvrApplicationNumber', 'string'),
  column('vehicleClass',          'string'),
  column('grossMass',             'decimal'),
  column('height',                'decimal'),
  column('width',                 'decimal'),
  column('length',                'decimal'),
  column('tripCount',             'integer'),
  column('axleConfiguration',     'string'),
  column('escortRequired',        'boolean'),
  column('pilotVehicleCount',     'integer'),
  column('appliedDate',           'date'),
  column('validFrom',             'date'),
  column('validTo',               'date'),
  column('status',                'string'),
  column('decisionBy',            'string'),
  column('decisionDate',          'date'),
  column('conditionsOfApproval',  'string'),
  column('remarks',               'string'),
  column('active',                'boolean'),
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
    importer: importLookupRows,
    templateOnly: true
  }
}

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
    let rows
    if (dataset.name === 'AllowedValues') {
      rows = await fetchAllLookupValues(db)
    } else {
      rows = await readDatasetRows(db, dataset)
    }
    datasetRowsByName.set(dataset.name, rows)
    const header = buildHeaderRow(dataset)
    const sheetRows = dataset.name === 'AllowedValues'
      ? rows.map((row) => [row.entityName, row.code, row.label, row.description])
      : rows.map((row) => dataset.columns.map((columnDef) => formatCellValue(row[columnDef.name || columnDef.field], columnDef.type)))
    const sheet = XLSX.utils.aoa_to_sheet([header, ...sheetRows])
    sheet['!cols'] = dataset.columns.map((columnDef) => ({ wch: Math.max((columnDef.name || columnDef.header || '').length + 4, 16) }))
    XLSX.utils.book_append_sheet(workbook, sheet, dataset.name)
  }

  // Attribute template sheets — one per object type
  for (const objectType of ['bridge', 'restriction']) {
    try {
      const attrGroups = await db.run(
        SELECT.from('bridge.management.AttributeGroups').where({ objectType, status: 'Active' }).orderBy('displayOrder')
      );
      if (!attrGroups.length) continue;
      const allDefs = await db.run(
        SELECT.from('bridge.management.AttributeDefinitions').where({ objectType, status: 'Active' }).orderBy('displayOrder')
      );
      const allConfigs = await db.run(
        SELECT.from('bridge.management.AttributeObjectTypeConfig').where({ objectType, enabled: true })
      );
      const enabledDefIds = new Set(allConfigs.map(c => c.attribute_ID));
      const activeDefs = allDefs.filter(d => enabledDefIds.has(d.ID));
      if (!activeDefs.length) continue;

      const idCol = objectType === 'bridge' ? 'bridgeId' : 'restrictionRef';
      const attrHeaders = activeDefs.map(d => `${d.name} (${d.internalKey})`);
      const requiredRow = [' ', ...activeDefs.map(d => {
        const cfg = allConfigs.find(c => c.attribute_ID === d.ID);
        return cfg?.required ? '*' : '';
      })];
      const headerRow = [idCol, ...attrHeaders];

      const sheetLabel = `${objectType.charAt(0).toUpperCase()}${objectType.slice(1)}Attributes`;
      const attrSheet = XLSX.utils.aoa_to_sheet([requiredRow, headerRow]);
      attrSheet['!cols'] = headerRow.map(h => ({ wch: Math.max(h.length + 2, 16) }));
      XLSX.utils.book_append_sheet(workbook, attrSheet, sheetLabel);
    } catch (_) {
      // Attribute tables may not exist in dev — skip gracefully
    }
  }

  const referenceSheet = XLSX.utils.aoa_to_sheet(buildReferenceExamplesRows(datasetRowsByName))
  referenceSheet['!cols'] = [{ wch: 18 }, { wch: 26 }, { wch: 16 }, { wch: 24 }, { wch: 120 }]
  XLSX.utils.book_append_sheet(workbook, referenceSheet, 'DropdownExamples')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

async function buildCsvTemplate(datasetName) {
  const dataset = requireDataset(datasetName)
  const db = await cds.connect.to('db')
  let dataRows
  if (dataset.name === 'AllowedValues') {
    const all = await fetchAllLookupValues(db)
    dataRows = all.map(row => [row.entityName, row.code, row.label, row.description])
  } else {
    const rows = await readDatasetRows(db, dataset)
    dataRows = rows.map((row) => dataset.columns.map((columnDef) => formatCellValue(row[columnDef.name], columnDef.type)))
  }
  const sheet = XLSX.utils.aoa_to_sheet([buildHeaderRow(dataset), ...dataRows])
  return Buffer.from(XLSX.utils.sheet_to_csv(sheet), 'utf8')
}

async function importUpload({ buffer, fileName, datasetName, uploadedBy }) {
  if (!buffer?.length) {
    throw new Error('Uploaded file is empty')
  }

  const lowerName = (fileName || '').toLowerCase()
  const db = await cds.connect.to('db')
  const tx = db.tx()
  const batchId = cds.utils.uuid()
  const auditContext = { db, batchId, changedBy: uploadedBy || 'system' }

  try {
    let summaries
    let skipped = []
    let warnings = []

    if (lowerName.endsWith('.xlsx')) {
      const result = await importWorkbook(tx, buffer, datasetName, auditContext)
      summaries = result.summaries
      skipped = result.skipped
      warnings = result.warnings

      // Process attribute value sheets (BridgeAttributes, RestrictionAttributes)
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
      const attrSheetMap = { BridgeAttributes: 'bridge', RestrictionAttributes: 'restriction' }
      for (const [sheetName, objectType] of Object.entries(attrSheetMap)) {
        const attrSheet = workbook.Sheets[sheetName]
        if (!attrSheet) continue
        const attrRows = XLSX.utils.sheet_to_json(attrSheet, { header: 1, defval: null })
        if (attrRows.length < 3) continue
        // Row 0 = required flags, Row 1 = headers
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

        // Map column index → attribute key
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
              // Upsert value
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
      const result = await importCsv(tx, buffer, datasetName, auditContext)
      summaries = [result.summary]
      warnings = result.warnings
    } else {
      throw new Error('Unsupported file type. Upload an .xlsx or .csv file.')
    }

    await tx.commit()

    // Write audit after commit
    if (auditContext._auditQueue) {
      for (const entry of auditContext._auditQueue) {
        await writeChangeLogs(db, entry)
      }
    }

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

async function validateUpload({ buffer, fileName, datasetName }) {
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

  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
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

function getPreviewColumns(dataset) {
  if (dataset.name === 'Bridges') {
    return [
      { name: 'bridgeId', label: 'Bridge ID' },
      { name: 'bridgeName', label: 'Name' },
      { name: 'state', label: 'State' },
      { name: 'condition', label: 'Condition' },
      { name: 'postingStatus', label: 'Posting Status' }
    ]
  }
  if (dataset.name === 'Restrictions') {
    return [
      { name: 'restrictionRef', label: 'Restriction Ref' },
      { name: 'bridgeRef', label: 'Bridge Ref' },
      { name: 'restrictionType', label: 'Type' },
      { name: 'restrictionStatus', label: 'Status' },
      { name: 'restrictionValue', label: 'Value' }
    ]
  }
  if (dataset.name === 'BridgeInspections') {
    return [
      { name: 'bridgeRef',      label: 'Bridge ID' },
      { name: 'inspectionDate', label: 'Date' },
      { name: 'inspectionType', label: 'Type' },
      { name: 'inspector',      label: 'Inspector' },
      { name: 'inspectionStandard', label: 'Standard' }
    ]
  }
  if (dataset.name === 'BridgeElements') {
    return [
      { name: 'bridgeRef',             label: 'Bridge ID' },
      { name: 'elementId',             label: 'Element ID' },
      { name: 'elementType',           label: 'Type' },
      { name: 'elementName',           label: 'Name' },
      { name: 'currentConditionRating', label: 'Condition' }
    ]
  }
  if (dataset.name === 'BridgeRestrictions') {
    return [
      { name: 'bridgeRef',        label: 'Bridge ID' },
      { name: 'restrictionRef',   label: 'Ref' },
      { name: 'restrictionType',  label: 'Type' },
      { name: 'restrictionValue', label: 'Value' },
      { name: 'active',           label: 'Active' }
    ]
  }
  if (dataset.name === 'LoadRatingCertificates') {
    return [
      { name: 'bridgeRef',            label: 'Bridge ID' },
      { name: 'certificateNumber',    label: 'Certificate #' },
      { name: 'ratingLevel',          label: 'Rating Level' },
      { name: 'certificateExpiryDate', label: 'Expiry' },
      { name: 'status',               label: 'Status' }
    ]
  }
  if (dataset.name === 'BridgeRestrictionProvisions') {
    return [
      { name: 'restrictionRef',  label: 'Restriction Ref' },
      { name: 'provisionNumber', label: '#' },
      { name: 'provisionType',   label: 'Type' },
      { name: 'provisionText',   label: 'Provision Text' },
      { name: 'active',          label: 'Active' }
    ]
  }
  if (dataset.name === 'AllowedValues') {
    return [
      { name: 'entityName',   label: 'Entity' },
      { name: 'code',         label: 'Code' },
      { name: 'label',        label: 'Label' },
      { name: 'description',  label: 'Description' },
      { name: '',             label: '' }
    ]
  }
  return [
    { name: 'code', label: 'Code' },
    { name: 'name', label: 'Name' },
    { name: 'descr', label: 'Description' },
    { name: '', label: '' },
    { name: '', label: '' }
  ]
}

function formatPreviewCell(row, column) {
  if (!column?.name) return ''
  const value = row[column.name]
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value)
}

function stripDatasetRowPrefix(message) {
  return String(message || '').replace(/^[A-Za-z]+ row \d+:\s*/g, '')
}

function buildValidationMessage(totalCount, validCount, warningCount, errorCount) {
  if (!validCount) return 'No valid rows. Fix the highlighted errors and re-upload.'
  if (errorCount) return `${validCount} valid row(s). Fix ${errorCount} error row(s) or upload only valid rows.`
  if (warningCount) return `${validCount} valid row(s) with ${warningCount} warning(s).`
  return `${totalCount} row(s) validated successfully.`
}

async function importWorkbook(tx, buffer, datasetName, auditContext) {
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
    const result = dataset.importer
      ? await dataset.importer(tx, dataset, rows, warnings, auditContext)
      : await dataset.importRows(rows, tx)
    if (result) summaries.push({ dataset: dataset.name, label: dataset.label, inserted: result.inserted ?? 0, updated: result.updated ?? 0, processed: result.processed ?? rows.length })
  }

  if (!summaries.length) {
    if (datasetName && datasetName !== 'All') {
      throw new Error(`Workbook does not contain the selected "${datasetName}" sheet.`)
    }
    throw new Error('No supported upload sheets were found in the workbook.')
  }

  return { summaries, skipped, warnings }
}

async function importCsv(tx, buffer, datasetName, auditContext) {
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
  const summary = await dataset.importer(tx, dataset, rows, warnings, auditContext)
  return { summary, warnings }
}

async function readDatasetRows(dbOrTx, dataset) {
  if (!dataset.entity) return []
  const allCols = dataset.columns.map((c) => c.name)
  try {
    return await dbOrTx.run(SELECT.from(dataset.entity).columns(...allCols).orderBy(dataset.orderBy))
  } catch (_) {
    const entityDef = cds.model?.definitions?.[dataset.entity]
    const entityCols = entityDef ? allCols.filter((c) => entityDef.elements?.[c]) : []
    if (!entityCols.length) return []
    try {
      return await dbOrTx.run(SELECT.from(dataset.entity).columns(...entityCols).orderBy(dataset.orderBy))
    } catch (_2) {
      return []
    }
  }
}

function queueAudit(auditContext, entry) {
  if (!auditContext) return
  if (!auditContext._auditQueue) auditContext._auditQueue = []
  auditContext._auditQueue.push(entry)
}

async function fetchAllLookupValues(db) {
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

async function importAllowedValueRows(tx, dataset, rows, warnings, auditContext) {
  const normalized = normalizeRows(dataset, rows, warnings)
  if (!normalized.length) return emptySummary(dataset)

  const grouped = new Map()
  for (const row of normalized) {
    if (!ALLOWED_VALUES_WHITELIST.has(row.entityName)) {
      warnings.push(`AllowedValues: skipped row with unknown entityName "${row.entityName}". Allowed entities: ${[...ALLOWED_VALUES_WHITELIST].join(', ')}.`)
      continue
    }
    if (!grouped.has(row.entityName)) grouped.set(row.entityName, [])
    grouped.get(row.entityName).push(row)
  }

  let totalInserted = 0
  let totalUpdated = 0
  let totalProcessed = 0
  const entityFieldMap = {
    DefectCodes: { labelField: 'description', descrField: null }
  }

  for (const [entityName, entityRows] of grouped) {
    const entityRef = `bridge.management.${entityName}`
    const { labelField = 'name', descrField = 'descr' } = entityFieldMap[entityName] || {}

    const codes = entityRows.map(r => r.code)
    const existingRows = await tx.run(SELECT.from(entityRef).columns('code').where({ code: { in: codes } }))
    const existingCodes = new Set(existingRows.map(r => r.code))

    const inserts = []
    const updates = []
    for (const row of entityRows) {
      if (existingCodes.has(row.code)) updates.push(row)
      else inserts.push(row)
    }

    if (inserts.length) {
      await tx.run(INSERT.into(entityRef).entries(inserts.map(r => {
        const entry = { code: r.code, [labelField]: r.label || r.code }
        if (descrField) entry[descrField] = r.description || null
        return entry
      })))
      for (const row of inserts) {
        queueAudit(auditContext, {
          objectType: 'Lookup',
          objectId:   `${entityName}:${row.code}`,
          objectName: `${entityName} / ${row.code}`,
          source:     'MassUpload',
          batchId:    auditContext?.batchId,
          changedBy:  auditContext?.changedBy || 'system',
          changes:    [{ fieldName: 'code', oldValue: '', newValue: row.code },
                       { fieldName: labelField, oldValue: '', newValue: row.label || '' }]
        })
      }
    }

    for (const row of updates) {
      const setClause = { [labelField]: row.label || row.code }
      if (descrField) setClause[descrField] = row.description || null
      const oldRow = await fetchCurrentRecord(tx, entityRef, { code: row.code })
      await tx.run(UPDATE(entityRef).set(setClause).where({ code: row.code }))
      if (oldRow) {
        const changes = diffRecords(
          Object.fromEntries(Object.keys(setClause).map(k => [k, oldRow[k]])),
          setClause
        )
        if (changes.length) {
          queueAudit(auditContext, {
            objectType: 'Lookup',
            objectId:   `${entityName}:${row.code}`,
            objectName: `${entityName} / ${row.code}`,
            source:     'MassUpload',
            batchId:    auditContext?.batchId,
            changedBy:  auditContext?.changedBy || 'system',
            changes
          })
        }
      }
    }

    totalInserted += inserts.length
    totalUpdated += updates.length
    totalProcessed += entityRows.length
  }

  return {
    dataset: dataset.name,
    label: dataset.label,
    inserted: totalInserted,
    updated: totalUpdated,
    processed: totalProcessed
  }
}

async function importLookupRows(tx, dataset, rows, warnings, auditContext) {
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
    for (const row of inserts) {
      queueAudit(auditContext, {
        objectType: 'Lookup',
        objectId:   `${dataset.name}:${row.code}`,
        objectName: `${dataset.label} / ${row.code}`,
        source:     'MassUpload',
        batchId:    auditContext?.batchId,
        changedBy:  auditContext?.changedBy || 'system',
        changes:    [{ fieldName: 'code', oldValue: '', newValue: row.code },
                     { fieldName: 'name', oldValue: '', newValue: row.name || '' }]
      })
    }
  }

  for (const row of updates) {
    const oldRow = await fetchCurrentRecord(tx, dataset.entity, { code: row.code })
    await tx.run(
      UPDATE(dataset.entity)
        .set({ name: row.name, descr: row.descr })
        .where({ code: row.code })
    )
    if (oldRow) {
      const changes = diffRecords({ name: oldRow.name, descr: oldRow.descr }, { name: row.name, descr: row.descr })
      if (changes.length) {
        queueAudit(auditContext, {
          objectType: 'Lookup',
          objectId:   `${dataset.name}:${row.code}`,
          objectName: `${dataset.label} / ${row.code}`,
          source:     'MassUpload',
          batchId:    auditContext?.batchId,
          changedBy:  auditContext?.changedBy || 'system',
          changes
        })
      }
    }
  }

  return buildSummary(dataset, normalized.length, inserts.length, updates.length)
}

async function importBridgeRows(tx, dataset, rows, warnings, auditContext) {
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
    for (const row of inserts) {
      queueAudit(auditContext, {
        objectType: 'Bridge',
        objectId:   String(row.ID),
        objectName: row.bridgeName || String(row.ID),
        source:     'MassUpload',
        batchId:    auditContext?.batchId,
        changedBy:  auditContext?.changedBy || 'system',
        changes:    Object.entries(stripMetadata(row))
          .filter(([changedBridgeField, changedBridgeData]) => !['__rowNumber'].includes(changedBridgeField) && changedBridgeData != null && changedBridgeData !== '')
          .map(([changedBridgeField, changedBridgeData]) => ({ fieldName: changedBridgeField, oldValue: '', newValue: String(changedBridgeData) }))
      })
    }
  }

  for (const row of updates) {
    const oldRecord = await fetchCurrentRecord(tx, dataset.entity, { ID: row.ID })
    const patch = stripPrimaryKey(row, ['ID'])
    await tx.run(
      UPDATE(dataset.entity)
        .set(patch)
        .where({ ID: row.ID })
    )
    if (oldRecord) {
      const changes = diffRecords(
        Object.fromEntries(Object.keys(patch).map(k => [k, oldRecord[k]])),
        patch
      )
      if (changes.length) {
        queueAudit(auditContext, {
          objectType: 'Bridge',
          objectId:   String(row.ID),
          objectName: oldRecord.bridgeName || row.bridgeName || String(row.ID),
          source:     'MassUpload',
          batchId:    auditContext?.batchId,
          changedBy:  auditContext?.changedBy || 'system',
          changes
        })
      }
    }
  }

  return buildSummary(dataset, normalized.length, inserts.length, updates.length)
}

async function importRestrictionRows(tx, dataset, rows, warnings, auditContext) {
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
    for (const row of inserts) {
      queueAudit(auditContext, {
        objectType: 'Restriction',
        objectId:   row.ID,
        objectName: row.restrictionRef || row.ID,
        source:     'MassUpload',
        batchId:    auditContext?.batchId,
        changedBy:  auditContext?.changedBy || 'system',
        changes:    Object.entries(stripMetadata(row))
          .filter(([changedRestrictionField, changedRestrictionData]) => !['__rowNumber'].includes(changedRestrictionField) && changedRestrictionData != null && changedRestrictionData !== '')
          .map(([changedRestrictionField, changedRestrictionData]) => ({ fieldName: changedRestrictionField, oldValue: '', newValue: String(changedRestrictionData) }))
      })
    }
  }

  for (const row of updates) {
    const oldRecord = await fetchCurrentRecord(tx, dataset.entity, { ID: row.ID })
    const patch = stripPrimaryKey(row, ['ID'])
    await tx.run(
      UPDATE(dataset.entity)
        .set(patch)
        .where({ ID: row.ID })
    )
    if (oldRecord) {
      const changes = diffRecords(
        Object.fromEntries(Object.keys(patch).map(k => [k, oldRecord[k]])),
        patch
      )
      if (changes.length) {
        queueAudit(auditContext, {
          objectType: 'Restriction',
          objectId:   row.ID,
          objectName: oldRecord.restrictionRef || row.restrictionRef || row.ID,
          source:     'MassUpload',
          batchId:    auditContext?.batchId,
          changedBy:  auditContext?.changedBy || 'system',
          changes
        })
      }
    }
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

async function enrichRowsWithBridgeId(tx, rows, datasetName) {
  const bridgeRefs = [...new Set(rows.map(r => r.bridgeRef).filter(Boolean))]
  if (!bridgeRefs.length) return
  const bridges = await tx.run(
    SELECT.from('bridge.management.Bridges').columns('ID', 'bridgeId').where({ bridgeId: { in: bridgeRefs } })
  )
  const bridgeMap = new Map(bridges.map(b => [b.bridgeId, b.ID]))
  for (const row of rows) {
    if (!row.bridgeRef) continue
    const id = bridgeMap.get(row.bridgeRef)
    if (!id) throw new Error(`${datasetName} row ${row.__rowNumber}: unknown bridgeRef "${row.bridgeRef}" — no bridge with that Bridge ID exists.`)
    row.bridge_ID = id
  }
}

async function batchGenerateRefs(tx, entityName, refField, prefix, rows) {
  const blanks = rows.filter(r => !r[refField])
  if (!blanks.length) return
  const existing = await tx.run(SELECT.from(entityName).columns(refField))
  const pattern = new RegExp(`^${prefix}(\\d+)$`)
  let maxSeq = 0
  for (const rec of existing) {
    const m = rec[refField]?.match(pattern)
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10))
  }
  for (const row of rows.filter(r => r[refField])) {
    const m = row[refField]?.match(pattern)
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10))
  }
  let seq = maxSeq + 1
  for (const row of blanks) {
    row[refField] = `${prefix}${String(seq).padStart(4, '0')}`
    seq++
  }
}

async function importCuidEntityRows(tx, dataset, rows, warnings, auditContext, { naturalKey, objectType, getName }) {
  const normalized = normalizeRows(dataset, rows, warnings)
  if (!normalized.length) return emptySummary(dataset)

  await enrichRowsWithBridgeId(tx, normalized, dataset.name)

  const ids = normalized.map(r => r.ID).filter(Boolean)
  const existingById = new Map()
  if (ids.length) {
    const existing = await tx.run(SELECT.from(dataset.entity).columns('ID', naturalKey).where({ ID: { in: ids } }))
    existing.forEach(r => existingById.set(r.ID, r))
  }

  const naturalKeys = normalized.map(r => r[naturalKey]).filter(Boolean)
  const existingByNaturalKey = new Map()
  if (naturalKeys.length) {
    const existing = await tx.run(SELECT.from(dataset.entity).columns('ID', naturalKey).where({ [naturalKey]: { in: naturalKeys } }))
    existing.forEach(r => existingByNaturalKey.set(r[naturalKey], r))
  }

  const inserts = []
  const updates = []

  for (const row of normalized) {
    let existing = (row.ID && existingById.get(row.ID)) || (row[naturalKey] && existingByNaturalKey.get(row[naturalKey]))
    if (existing) {
      row.ID = existing.ID
      updates.push(row)
      continue
    }
    if (!row.ID) row.ID = cds.utils.uuid()
    inserts.push(row)
    existingById.set(row.ID, row)
    if (row[naturalKey]) existingByNaturalKey.set(row[naturalKey], row)
  }

  if (inserts.length) {
    await tx.run(INSERT.into(dataset.entity).entries(inserts.map(stripMetadata)))
    for (const row of inserts) {
      queueAudit(auditContext, {
        objectType, objectId: row.ID, objectName: getName(row),
        source: 'MassUpload', batchId: auditContext?.batchId, changedBy: auditContext?.changedBy || 'system',
        changes: Object.entries(stripMetadata(row))
          .filter(([k, v]) => !['__rowNumber'].includes(k) && v != null && v !== '')
          .map(([k, v]) => ({ fieldName: k, oldValue: '', newValue: String(v) }))
      })
    }
  }

  for (const row of updates) {
    const oldRecord = await fetchCurrentRecord(tx, dataset.entity, { ID: row.ID })
    const patch = stripPrimaryKey(row, ['ID'])
    await tx.run(UPDATE(dataset.entity).set(patch).where({ ID: row.ID }))
    if (oldRecord) {
      const changes = diffRecords(Object.fromEntries(Object.keys(patch).map(k => [k, oldRecord[k]])), patch)
      if (changes.length) {
        queueAudit(auditContext, {
          objectType, objectId: row.ID, objectName: getName(oldRecord) || getName(row),
          source: 'MassUpload', batchId: auditContext?.batchId, changedBy: auditContext?.changedBy || 'system',
          changes
        })
      }
    }
  }

  return buildSummary(dataset, normalized.length, inserts.length, updates.length)
}

async function importInspectionRows(tx, dataset, rows, warnings, auditContext) {
  return importCuidEntityRows(tx, dataset, rows, warnings, auditContext, {
    naturalKey: 'inspectionDate',
    objectType: 'BridgeInspection',
    getName: r => `${r.bridgeRef || r.bridge_ID} / ${r.inspectionDate}`
  })
}

async function importElementRows(tx, dataset, rows, warnings, auditContext) {
  return importCuidEntityRows(tx, dataset, rows, warnings, auditContext, {
    naturalKey: 'elementId',
    objectType: 'BridgeElement',
    getName: r => `${r.bridgeRef || r.bridge_ID} / ${r.elementId}`
  })
}

async function importBridgeRestrictionRows(tx, dataset, rows, warnings, auditContext) {
  const normalized = normalizeRows(dataset, rows, warnings)
  if (!normalized.length) return emptySummary(dataset)

  await enrichRowsWithBridgeId(tx, normalized, dataset.name)

  for (const row of normalized) {
    if (row.active === null || row.active === undefined) row.active = true
  }

  return importCuidEntityRows(tx, dataset, normalized.map(r => ({ ...r, __alreadyNormalized: true })), warnings, auditContext, {
    naturalKey: 'restrictionRef',
    objectType: 'BridgeRestriction',
    getName: r => `${r.bridgeRef || r.bridge_ID} / ${r.restrictionRef}`
  })
}

async function importLrcRows(tx, dataset, rows, warnings, auditContext) {
  const normalized = normalizeRows(dataset, rows, warnings)
  if (!normalized.length) return emptySummary(dataset)

  await enrichRowsWithBridgeId(tx, normalized, dataset.name)

  for (const row of normalized) {
    if (!row.status) row.status = 'Current'
    if (row.certificateVersion === null || row.certificateVersion === undefined) row.certificateVersion = 1
  }

  return importCuidEntityRows(tx, dataset, normalized.map(r => ({ ...r, __alreadyNormalized: true })), warnings, auditContext, {
    naturalKey: 'certificateNumber',
    objectType: 'LoadRatingCertificate',
    getName: r => `${r.bridgeRef || r.bridge_ID} / ${r.certificateNumber}`
  })
}

async function importProvisionRows(tx, dataset, rows, warnings, auditContext) {
  const normalized = normalizeRows(dataset, rows, warnings)
  if (!normalized.length) return emptySummary(dataset)

  // Resolve restrictionRef → restriction_ID
  const restrictionRefs = [...new Set(normalized.map(r => r.restrictionRef).filter(Boolean))]
  if (restrictionRefs.length) {
    const restrictions = await tx.run(
      SELECT.from('bridge.management.BridgeRestrictions').columns('ID', 'restrictionRef').where({ restrictionRef: { in: restrictionRefs } })
    )
    const restrictionMap = new Map(restrictions.map(r => [r.restrictionRef, r.ID]))
    for (const row of normalized) {
      if (!row.restrictionRef) continue
      const id = restrictionMap.get(row.restrictionRef)
      if (!id) throw new Error(`BridgeRestrictionProvisions row ${row.__rowNumber}: unknown restrictionRef "${row.restrictionRef}" — no matching BridgeRestriction exists.`)
      row.restriction_ID = id
    }
  }

  for (const row of normalized) {
    if (row.active === null || row.active === undefined) row.active = true
  }

  return importCuidEntityRows(tx, dataset, normalized.map(r => ({ ...r, __alreadyNormalized: true })), warnings, auditContext, {
    naturalKey: 'provisionNumber',
    objectType: 'BridgeRestrictionProvision',
    getName: r => `${r.restrictionRef} / Provision ${r.provisionNumber}`
  })
}

async function importConditionSurveyRows(tx, dataset, rows, warnings, auditContext) {
  const normalized = normalizeRows(dataset, rows, warnings)
  if (!normalized.length) return emptySummary(dataset)
  await enrichRowsWithBridgeId(tx, normalized, dataset.name)
  await batchGenerateRefs(tx, 'bridge.management.BridgeConditionSurveys', 'surveyRef', 'CS-', normalized)
  for (const row of normalized) {
    if (!row.status) row.status = 'Draft'
    if (row.active === null || row.active === undefined) row.active = true
  }
  return importCuidEntityRows(tx, dataset, normalized.map(r => ({ ...r, __alreadyNormalized: true })), warnings, auditContext, {
    naturalKey: 'surveyRef',
    objectType: 'BridgeConditionSurvey',
    getName: r => `${r.bridgeRef || r.bridge_ID} / ${r.surveyRef}`
  })
}

async function importLoadRatingRows(tx, dataset, rows, warnings, auditContext) {
  const normalized = normalizeRows(dataset, rows, warnings)
  if (!normalized.length) return emptySummary(dataset)
  await enrichRowsWithBridgeId(tx, normalized, dataset.name)
  await batchGenerateRefs(tx, 'bridge.management.BridgeLoadRatings', 'ratingRef', 'LR-', normalized)
  for (const row of normalized) {
    if (!row.status) row.status = 'Active'
    if (row.active === null || row.active === undefined) row.active = true
  }
  return importCuidEntityRows(tx, dataset, normalized.map(r => ({ ...r, __alreadyNormalized: true })), warnings, auditContext, {
    naturalKey: 'ratingRef',
    objectType: 'BridgeLoadRating',
    getName: r => `${r.bridgeRef || r.bridge_ID} / ${r.ratingRef}`
  })
}

async function importPermitRows(tx, dataset, rows, warnings, auditContext) {
  const normalized = normalizeRows(dataset, rows, warnings)
  if (!normalized.length) return emptySummary(dataset)
  await enrichRowsWithBridgeId(tx, normalized, dataset.name)
  await batchGenerateRefs(tx, 'bridge.management.BridgePermits', 'permitRef', 'PM-', normalized)
  for (const row of normalized) {
    if (!row.status) row.status = 'Pending'
    if (row.active === null || row.active === undefined) row.active = true
  }
  return importCuidEntityRows(tx, dataset, normalized.map(r => ({ ...r, __alreadyNormalized: true })), warnings, auditContext, {
    naturalKey: 'permitRef',
    objectType: 'BridgePermit',
    getName: r => `${r.bridgeRef || r.bridge_ID} / ${r.permitRef}`
  })
}

function normalizeRows(dataset, rows, warnings) {
  if (rows.length && rows[0].__alreadyNormalized) return rows
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

  if (dataset.name === 'AllowedValues') {
    if (!normalized.label) normalized.label = normalized.code
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

  if (dataset.name === 'BridgeRestrictions' && !hasValue(normalized.restrictionRef)) {
    if (warnings) {
      warnings.push(`BridgeRestrictions row ${row.__rowNumber}: skipped — "restrictionRef" is required as a natural key.`)
    }
    return null
  }

  if (dataset.name === 'LoadRatingCertificates' && !hasValue(normalized.certificateNumber)) {
    if (warnings) {
      warnings.push(`LoadRatingCertificates row ${row.__rowNumber}: skipped — "certificateNumber" is required as a natural key.`)
    }
    return null
  }

  return normalized
}

function parseSheetRows(sheet, dataset) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true, cellDates: true })
  if (!rows.length) return []

  const headers = Object.keys(rows[0])
  const normalizedHeaders = new Map(headers.map((header) => [String(header).replace(/^\uFEFF/, '').replace(/\*$/, '').trim().toLowerCase(), header]))

  for (const columnDef of dataset.columns) {
    const fieldKey = (columnDef.name || columnDef.field || '').toLowerCase()
    const headerKey = (columnDef.header || columnDef.name || columnDef.field || '').replace(/\s*\*\s*$/, '').trim().toLowerCase()
    const found = normalizedHeaders.has(fieldKey) || normalizedHeaders.has(headerKey)
    if (columnDef.required && !found) {
      throw new Error(`Sheet "${dataset.name}" must contain a "${columnDef.name || columnDef.header}" column.`)
    }
  }

  return rows.map((row, index) => {
    const mappedRow = { __rowNumber: index + 2 }
    for (const columnDef of dataset.columns) {
      const outputKey = columnDef.field || columnDef.name
      const fieldKey = (columnDef.name || columnDef.field || '').toLowerCase()
      const headerKey = (columnDef.header || columnDef.name || columnDef.field || '').replace(/\s*\*\s*$/, '').trim().toLowerCase()
      const originalHeader = normalizedHeaders.get(fieldKey) || normalizedHeaders.get(headerKey)
      mappedRow[outputKey] = originalHeader ? row[originalHeader] : null
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
  if (dataset.name === 'AllowedValues') return `${row.entityName}:${row.code}`
  if (dataset.name === 'Bridges') return row.ID ?? `bridgeId:${row.bridgeId}`
  if (dataset.name === 'Restrictions') return row.ID ?? `restrictionRef:${row.restrictionRef}`
  if (dataset.name === 'BridgeInspections') return row.ID ?? `${row.bridgeRef}|${row.inspectionDate}|${row.inspectionType}`
  if (dataset.name === 'BridgeElements') return row.ID ?? `${row.bridgeRef}|${row.elementId}`
  if (dataset.name === 'BridgeRestrictions') return row.ID ?? `${row.bridgeRef}|${row.restrictionRef}`
  if (dataset.name === 'LoadRatingCertificates') return row.ID ?? `${row.bridgeRef}|${row.certificateNumber}`
  if (dataset.name === 'BridgeRestrictionProvisions') return row.ID ?? `${row.restrictionRef}|${row.provisionNumber}`
  if (dataset.name === 'BridgeConditionSurveys') return row.ID ?? (row.surveyRef ? `surveyRef:${row.surveyRef}` : `${row.bridgeRef}|${row.surveyDate}|${row.surveyType}`)
  if (dataset.name === 'BridgeLoadRatings') return row.ID ?? (row.ratingRef ? `ratingRef:${row.ratingRef}` : `${row.bridgeRef}|${row.vehicleClass}|${row.assessmentDate}`)
  if (dataset.name === 'BridgePermits') return row.ID ?? (row.permitRef ? `permitRef:${row.permitRef}` : `${row.bridgeRef}|${row.permitType}|${row.applicantName}|${row.appliedDate}`)
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
    if (key === '__rowNumber' || key === '__alreadyNormalized') continue
    cleaned[key] = value
  }
  return cleaned
}

function buildHeaderRow(dataset) {
  return dataset.columns.map((columnDef) => {
    const label = columnDef.name || columnDef.header || ''
    return `${label}${columnDef.required ? '*' : ''}`
  })
}

function buildReferenceExamplesRows(datasetRowsByName) {
  const datasetBySheetAndColumn = new Map(
    DATASETS.map((dataset) => [
      dataset.name,
      new Map(dataset.columns.map((columnDef) => [columnDef.name || columnDef.field, columnDef]))
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
  importUpload,
  validateUpload
}
