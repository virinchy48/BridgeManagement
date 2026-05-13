const cds = require('@sap/cds')

const DEMO_BRIDGE_ID_OFFSET = 90001
const DEMO_PREFIX = 'DEMO-'

const BRIDGES = [
  {
    ID:           DEMO_BRIDGE_ID_OFFSET,
    bridgeId:     'DEMO-NSW-001',
    bridgeName:   'Demo Parramatta River Bridge',
    state:        'NSW',
    region:       'Greater Sydney',
    lga:          'Parramatta City Council',
    route:        'M4 Western Motorway',
    routeNumber:  'M4',
    latitude:     -33.8136,
    longitude:    151.0034,
    location:     'Parramatta River, Western Sydney',
    assetOwner:   'TfNSW',
    managingAuthority: 'TfNSW',
    structureType: 'Composite',
    yearBuilt:    1987,
    designLoad:   'T44',
    conditionRating: 7,
    postingStatus: 'Unrestricted',
    condition:    'Good',
    deckWidth:    12.5,
    spanLength:   45.0,
    totalLength:  135.0,
    spanCount:    3,
    numberOfLanes: 4,
    clearanceHeight: 5.8,
    averageDailyTraffic: 42000,
    heavyVehiclePercent: 12.5,
    nhvrAssessed: true,
    freightRoute: true,
    isActive:     true,
    highPriorityAsset: true,
    lastInspectionDate: '2024-11-15',
    nextInspectionDue:  '2026-11-15',
    importanceLevel: 2
  },
  {
    ID:           DEMO_BRIDGE_ID_OFFSET + 1,
    bridgeId:     'DEMO-VIC-001',
    bridgeName:   'Demo Yarra River Crossing',
    state:        'VIC',
    region:       'Metro Melbourne',
    lga:          'Melbourne City Council',
    route:        'CityLink',
    routeNumber:  'M1',
    latitude:     -37.8136,
    longitude:    144.9631,
    location:     'Yarra River, Melbourne CBD',
    assetOwner:   'VicRoads',
    managingAuthority: 'VicRoads',
    structureType: 'Steel Box Girder',
    yearBuilt:    2001,
    designLoad:   'SM1600',
    conditionRating: 8,
    postingStatus: 'Unrestricted',
    condition:    'Very Good',
    deckWidth:    14.0,
    spanLength:   60.0,
    totalLength:  180.0,
    spanCount:    3,
    numberOfLanes: 6,
    clearanceHeight: 6.2,
    averageDailyTraffic: 68000,
    heavyVehiclePercent: 8.3,
    nhvrAssessed: true,
    freightRoute: true,
    isActive:     true,
    highPriorityAsset: true,
    lastInspectionDate: '2025-02-20',
    nextInspectionDue:  '2027-02-20',
    importanceLevel: 1
  },
  {
    ID:           DEMO_BRIDGE_ID_OFFSET + 2,
    bridgeId:     'DEMO-QLD-001',
    bridgeName:   'Demo Brisbane River Overpass',
    state:        'QLD',
    region:       'South East Queensland',
    lga:          'Brisbane City Council',
    route:        'Pacific Motorway',
    routeNumber:  'M3',
    latitude:     -27.4698,
    longitude:    153.0251,
    location:     'Brisbane River, South Brisbane',
    assetOwner:   'TMR Queensland',
    managingAuthority: 'TMR Queensland',
    structureType: 'Prestressed Concrete',
    yearBuilt:    1993,
    designLoad:   'T44',
    conditionRating: 5,
    postingStatus: 'Posted',
    condition:    'Fair',
    deckWidth:    10.5,
    spanLength:   38.0,
    totalLength:  114.0,
    spanCount:    3,
    numberOfLanes: 2,
    clearanceHeight: 4.9,
    averageDailyTraffic: 21000,
    heavyVehiclePercent: 18.7,
    nhvrAssessed: false,
    freightRoute: true,
    isActive:     true,
    highPriorityAsset: false,
    lastInspectionDate: '2021-08-10',
    nextInspectionDue:  '2023-08-10',
    importanceLevel: 3
  }
]

async function activateDemoData(db) {
  const now = new Date().toISOString()
  const today = now.slice(0, 10)
  let loaded = 0

  // ── 1. Bridges ────────────────────────────────────────────────────────────
  for (const bridge of BRIDGES) {
    const existing = await db.run(
      SELECT.one.from('bridge.management.Bridges').where({ bridgeId: bridge.bridgeId })
    )
    if (!existing) {
      await db.run(INSERT.into('bridge.management.Bridges').entries(bridge))
      loaded++
    }
  }

  // Re-fetch to get the UUIDs assigned by CAP (Bridges has integer PK so we use that)
  const demoBridges = await db.run(
    SELECT.from('bridge.management.Bridges').where({ bridgeId: { like: 'DEMO-%' } })
  )

  for (const bridge of demoBridges) {
    const bID = bridge.ID
    const bUUID = cds.utils.uuid()

    // ── 2. BridgeCapacities ─────────────────────────────────────────────────
    const capExisting = await db.run(
      SELECT.one.from('bridge.management.BridgeCapacities').where({ bridge_ID: bID })
    )
    if (!capExisting) {
      await db.run(INSERT.into('bridge.management.BridgeCapacities').entries({
        ID:                 cds.utils.uuid(),
        bridge_ID:          bID,
        capacityType:       'AS 5100.7:2017',
        grossMassLimit:     42.5,
        grossCombined:      68.0,
        steerAxleLimit:     6.5,
        singleAxleLimit:    9.0,
        tandemGroupLimit:   16.5,
        triAxleGroupLimit:  22.5,
        minClearancePosted: bridge.clearanceHeight || 5.0,
        lane1Clearance:     bridge.clearanceHeight || 5.0,
        carriagewayWidth:   bridge.deckWidth || 10.0,
        trafficableWidth:   (bridge.deckWidth || 10.0) - 0.5,
        ratingStandard:     'AS 5100.7:2017',
        ratingFactor:       0.9500,
        ratingDate:         '2023-06-15',
        nextReviewDue:      '2028-06-15',
        capacityStatus:     'Current',
        effectiveFrom:      '2023-06-15',
        engineeringNotes:   'Demo capacity record — for demonstration purposes only.'
      }))
      loaded++
    }

    // ── 3. BridgeInspections (2 per bridge) ─────────────────────────────────
    const inspExisting = await db.run(
      SELECT.from('bridge.management.BridgeInspections').where({ bridge_ID: bID })
    )
    if (inspExisting.length === 0) {
      const insp1Id = cds.utils.uuid()
      const insp2Id = cds.utils.uuid()
      const seq1 = (bID - DEMO_BRIDGE_ID_OFFSET) * 2 + 1
      const seq2 = seq1 + 1
      await db.run(INSERT.into('bridge.management.BridgeInspections').entries([
        {
          ID:                     insp1Id,
          bridge_ID:              bID,
          inspectionRef:          `INS-DEMO-${String(seq1).padStart(4,'0')}`,
          inspectionDate:         '2024-03-10',
          inspectionType:         'Routine',
          inspector:              'Demo Inspector A',
          inspectorAccreditationLevel: 'Level 2',
          overallConditionRating: 7,
          criticalFindings:       false,
          recommendedActions:     'Continue routine monitoring. No immediate action required.',
          nextInspectionRecommended: '2026-03-10',
          active:                 true
        },
        {
          ID:                     insp2Id,
          bridge_ID:              bID,
          inspectionRef:          `INS-DEMO-${String(seq2).padStart(4,'0')}`,
          inspectionDate:         '2022-09-05',
          inspectionType:         'Detailed',
          inspector:              'Demo Inspector B',
          inspectorAccreditationLevel: 'Level 3',
          overallConditionRating: 6,
          criticalFindings:       false,
          recommendedActions:     'Monitor cracking in deck slab. Schedule maintenance within 12 months.',
          nextInspectionRecommended: '2024-09-05',
          active:                 true
        }
      ]))
      loaded += 2

      // ── 4. BridgeDefects (2 per bridge, linked to first inspection) ────────
      const defExisting = await db.run(
        SELECT.one.from('bridge.management.BridgeDefects').where({ bridge_ID: bID })
      )
      if (!defExisting) {
        const dseq1 = (bID - DEMO_BRIDGE_ID_OFFSET) * 2 + 1
        const dseq2 = dseq1 + 1
        await db.run(INSERT.into('bridge.management.BridgeDefects').entries([
          {
            ID:                 cds.utils.uuid(),
            bridge_ID:          bID,
            inspection_ID:      insp1Id,
            defectId:           `DEF-DEMO-${String(dseq1).padStart(4,'0')}`,
            defectType:         'Cracking',
            defectDescription:  'Longitudinal cracking in deck slab — demo record for demonstration purposes.',
            bridgeElement:      'Deck Slab',
            severity:           2,
            urgency:            2,
            remediationStatus:  'Open',
            maintenancePriority: 'P3',
            active:             true
          },
          {
            ID:                 cds.utils.uuid(),
            bridge_ID:          bID,
            inspection_ID:      insp2Id,
            defectId:           `DEF-DEMO-${String(dseq2).padStart(4,'0')}`,
            defectType:         'Corrosion',
            defectDescription:  'Surface corrosion on steel handrail posts — demo record for demonstration purposes.',
            bridgeElement:      'Handrail',
            severity:           1,
            urgency:            2,
            remediationStatus:  'Open',
            maintenancePriority: 'P4',
            active:             true
          }
        ]))
        loaded += 2
      }
    }

    // ── 5. BridgeConditionSurveys ────────────────────────────────────────────
    const surveyExisting = await db.run(
      SELECT.one.from('bridge.management.BridgeConditionSurveys').where({ bridge_ID: bID })
    )
    if (!surveyExisting) {
      const sseq = bID - DEMO_BRIDGE_ID_OFFSET + 1
      await db.run(INSERT.into('bridge.management.BridgeConditionSurveys').entries({
        ID:              cds.utils.uuid(),
        bridge_ID:       bID,
        surveyRef:       `CS-DEMO-${String(sseq).padStart(4,'0')}`,
        bridgeRef:       bridge.bridgeId,
        surveyDate:      '2024-06-20',
        surveyType:      'Routine',
        surveyedBy:      'Demo Survey Team',
        conditionRating: bridge.conditionRating || 7,
        structuralRating: bridge.conditionRating || 7,
        overallGrade:    bridge.conditionRating >= 8 ? 'Good' : bridge.conditionRating >= 6 ? 'Satisfactory' : 'Poor',
        status:          'Approved',
        active:          true,
        notes:           'Demo condition survey — for demonstration purposes only.'
      }))
      loaded++
    }

    // ── 6. BridgeLoadRatings ─────────────────────────────────────────────────
    const lrExisting = await db.run(
      SELECT.one.from('bridge.management.BridgeLoadRatings').where({ bridge_ID: bID })
    )
    if (!lrExisting) {
      const lseq = bID - DEMO_BRIDGE_ID_OFFSET + 1
      await db.run(INSERT.into('bridge.management.BridgeLoadRatings').entries({
        ID:            cds.utils.uuid(),
        bridge_ID:     bID,
        ratingRef:     `LR-DEMO-${String(lseq).padStart(4,'0')}`,
        bridgeRef:     bridge.bridgeId,
        vehicleClass:  'T44',
        ratingMethod:  'AS5100',
        ratingFactor:  0.9500,
        grossMassLimit: 42.5,
        assessedBy:    'Demo Load Rating Engineer',
        assessmentDate: '2023-06-15',
        validTo:       '2028-06-15',
        governingMember: 'Main span mid-deck (demo)',
        status:        'Active',
        active:        true
      }))
      loaded++
    }

    // ── 7. BridgeRiskAssessments ─────────────────────────────────────────────
    const riskExisting = await db.run(
      SELECT.one.from('bridge.management.BridgeRiskAssessments').where({ bridge_ID: bID })
    )
    if (!riskExisting) {
      const rseq = bID - DEMO_BRIDGE_ID_OFFSET + 1
      const likelihood = 2
      const consequence = 3
      await db.run(INSERT.into('bridge.management.BridgeRiskAssessments').entries({
        ID:                   cds.utils.uuid(),
        bridge_ID:            bID,
        assessmentId:         `RSK-DEMO-${String(rseq).padStart(4,'0')}`,
        assessmentDate:       '2024-07-01',
        assessmentCycle:      'Annual',
        riskCategory:         'Structural',
        riskType:             'Deterioration',
        riskDescription:      'Progressive deterioration of deck slab due to traffic loading and environmental exposure — demo record.',
        likelihood:           likelihood,
        consequence:          consequence,
        inherentRiskScore:    likelihood * consequence,
        inherentRiskLevel:    'Medium',
        existingControls:     'Regular inspection programme, reactive maintenance budget allocated.',
        residualLikelihood:   2,
        residualConsequence:  2,
        residualRiskScore:    4,
        residualRiskLevel:    'Low',
        assessor:             'Demo Risk Assessor',
        reviewDueDate:        '2025-07-01',
        riskRegisterStatus:   'Open',
        treatmentStatus:      'Not Started',
        active:               true
      }))
      loaded++
    }

    // ── 8. NhvrRouteAssessments ──────────────────────────────────────────────
    const nhvrExisting = await db.run(
      SELECT.one.from('bridge.management.NhvrRouteAssessments').where({ bridge_ID: bID })
    )
    if (!nhvrExisting) {
      const nseq = bID - DEMO_BRIDGE_ID_OFFSET + 1
      await db.run(INSERT.into('bridge.management.NhvrRouteAssessments').entries({
        ID:                     cds.utils.uuid(),
        bridge_ID:              bID,
        assessmentId:           `NHRA-DEMO-${String(nseq).padStart(4,'0')}`,
        assessorName:           'Demo NHVR Assessor',
        assessorAccreditationNo: 'DEMO-ACC-001',
        assessmentDate:         '2023-09-01',
        assessmentVersion:      '1.0',
        assessmentStatus:       'Current',
        approvedVehicleClasses: 'B-Double, PBS Level 2',
        validFrom:              '2023-09-01',
        validTo:                '2028-09-01',
        nextReviewDate:         '2028-09-01',
        notes:                  'Demo NHVR route assessment — for demonstration purposes only.'
      }))
      loaded++
    }

    // ── 9. LoadRatingCertificates ────────────────────────────────────────────
    const lrcExisting = await db.run(
      SELECT.one.from('bridge.management.LoadRatingCertificates').where({ bridge_ID: bID })
    )
    if (!lrcExisting) {
      const lrcseq = bID - DEMO_BRIDGE_ID_OFFSET + 1
      await db.run(INSERT.into('bridge.management.LoadRatingCertificates').entries({
        ID:                    cds.utils.uuid(),
        bridge_ID:             bID,
        certificateNumber:     `LRC-DEMO-${String(lrcseq).padStart(4,'0')}`,
        certificateVersion:    1,
        status:                'Current',
        ratingStandard:        'AS 5100.7:2017',
        ratingLevel:           'T44',
        certifyingEngineer:    'Demo Certifying Engineer',
        engineerQualification: 'CPEng',
        rfT44:                 0.9500,
        rfSM1600:              0.8800,
        dynamicLoadAllowance:  1.4,
        governingMember:       'Main span deck slab (demo)',
        certificateIssueDate:  '2023-06-15',
        certificateExpiryDate: '2028-06-15',
        nextReviewDate:        '2028-06-15',
        notes:                 'Demo load rating certificate — for demonstration purposes only.'
      }))
      loaded++
    }

    // ── 10. BridgePermits ────────────────────────────────────────────────────
    const permExisting = await db.run(
      SELECT.one.from('bridge.management.BridgePermits').where({ bridge_ID: bID })
    )
    if (!permExisting) {
      const pseq = bID - DEMO_BRIDGE_ID_OFFSET + 1
      await db.run(INSERT.into('bridge.management.BridgePermits').entries({
        ID:            cds.utils.uuid(),
        bridge_ID:     bID,
        permitRef:     `PM-DEMO-${String(pseq).padStart(4,'0')}`,
        bridgeRef:     bridge.bridgeId,
        permitType:    'Overmass',
        applicantName: 'Demo Haulage Pty Ltd',
        vehicleClass:  'PBS Level 2',
        grossMass:     62.5,
        height:        4.3,
        width:         3.5,
        length:        25.0,
        appliedDate:   '2024-10-01',
        validFrom:     '2024-10-15',
        validTo:       '2025-10-15',
        status:        'Approved',
        decisionBy:    'Demo Permit Officer',
        decisionDate:  '2024-10-10',
        active:        true
      }))
      loaded++
    }

    // ── 11. BridgeScourAssessments ───────────────────────────────────────────
    const scourExisting = await db.run(
      SELECT.one.from('bridge.management.BridgeScourAssessments').where({ bridge_ID: bID })
    )
    if (!scourExisting) {
      await db.run(INSERT.into('bridge.management.BridgeScourAssessments').entries({
        ID:                     cds.utils.uuid(),
        bridge_ID:              bID,
        assessmentDate:         '2024-05-10',
        assessmentType:         'Desktop',
        scourRisk:              'Low',
        measuredDepth:          0.35,
        mitigationStatus:       'No Action Required',
        assessor:               'Demo Scour Assessor',
        waterwayType:           'River',
        foundationType:         'Concrete Piers',
        criticalScourDepthM:    1.20,
        postFloodInspectionRequired: false,
        remarks:                'Demo scour assessment — for demonstration purposes only.'
      }))
      loaded++
    }

    // ── 12. BridgeMaintenanceActions ─────────────────────────────────────────
    try {
      const maExisting = await db.run(
        SELECT.one.from('bridge.management.BridgeMaintenanceActions').where({ bridge_ID: bID })
      )
      if (!maExisting) {
        const maseq = bID - DEMO_BRIDGE_ID_OFFSET + 1
        await db.run(INSERT.into('bridge.management.BridgeMaintenanceActions').entries({
          ID:                cds.utils.uuid(),
          bridge_ID:         bID,
          actionRef:         `MA-DEMO-${String(maseq).padStart(4,'0')}`,
          bridgeRef:         bridge.bridgeId,
          actionType:        'Repair',
          priority:          'P2',
          status:            'Planned',
          actionTitle:       'Demo — Deck joint replacement',
          actionDescription: 'Replacement of expansion joints in deck slab — demo maintenance action for demonstration purposes.',
          estimatedCostAUD:  45000,
          scheduledDate:     '2026-09-01',
          active:            true
        }))
        loaded++
      }
    } catch (_) {}

    // ── 13. AssetIQScores ────────────────────────────────────────────────────
    const aiqExisting = await db.run(
      SELECT.one.from('bridge.management.AssetIQScores').where({ bridge_ID: bID })
    )
    if (!aiqExisting) {
      const cr = bridge.conditionRating || 7
      const bciFactor = Math.round((cr / 10) * 35 * 100) / 100
      const ageFactor = Math.round(Math.max(0, 15 - (2024 - (bridge.yearBuilt || 2000)) * 0.15) * 100) / 100
      const trafficFactor = Math.round(Math.min(20, ((bridge.averageDailyTraffic || 20000) / 100000) * 20) * 100) / 100
      const defectFactor  = 15.0
      const loadFactor    = 9.0
      const overallScore  = bciFactor + ageFactor + trafficFactor + defectFactor + loadFactor
      const ragStatus     = overallScore >= 60 ? 'GREEN' : overallScore >= 40 ? 'AMBER' : 'RED'
      await db.run(INSERT.into('bridge.management.AssetIQScores').entries({
        ID:           cds.utils.uuid(),
        bridge_ID:    bID,
        overallScore,
        ragStatus,
        bciFactor,
        ageFactor,
        trafficFactor,
        defectFactor,
        loadFactor,
        modelVersion: '1.0.0',
        scoredAt:     now
      }))
      loaded++
    }
  }

  // ── 13. AlertsAndNotifications (2 total, linked to first two demo bridges) ─
  const alertExisting = await db.run(
    SELECT.from('bridge.management.AlertsAndNotifications').where({ entityType: 'DemoAlert' })
  )
  if (alertExisting.length === 0 && demoBridges.length >= 2) {
    const b1 = demoBridges[0]
    const b2 = demoBridges[1]
    await db.run(INSERT.into('bridge.management.AlertsAndNotifications').entries([
      {
        ID:               cds.utils.uuid(),
        bridge_ID:        b1.ID,
        alertType:        'LoadRatingExpiry',
        entityType:       'DemoAlert',
        entityId:         'DEMO-LRC-001',
        entityDescription: 'Load Rating Certificate LRC-DEMO-0001',
        alertTitle:       'Load Rating Certificate Expiring — Demo Bridge NSW',
        alertDescription: 'Load Rating Certificate LRC-DEMO-0001 for Demo Parramatta River Bridge expires within 90 days. This is a demonstration alert.',
        severity:         'Warning',
        priority:         2,
        triggeredDate:    now,
        dueDate:          new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        status:           'Open'
      },
      {
        ID:               cds.utils.uuid(),
        bridge_ID:        b2.ID,
        alertType:        'InspectionOverdue',
        entityType:       'DemoAlert',
        entityId:         'DEMO-INSP-002',
        entityDescription: 'Overdue inspection for Demo Yarra River Crossing',
        alertTitle:       'Inspection Overdue — Demo Bridge VIC',
        alertDescription: 'Demo Yarra River Crossing last inspection was more than 2 years ago. This is a demonstration alert.',
        severity:         'Critical',
        priority:         1,
        triggeredDate:    now,
        dueDate:          today,
        status:           'Open'
      }
    ]))
    loaded += 2
  }

  return loaded
}

async function clearDemoData(db) {
  let cleared = 0

  const demoBridges = await db.run(
    SELECT.from('bridge.management.Bridges').columns('ID').where({ bridgeId: { like: 'DEMO-%' } })
  )
  if (demoBridges.length === 0) return 0

  const bIDs = demoBridges.map(b => b.ID)

  const deleteFrom = async (entity) => {
    const result = await db.run(DELETE.from(entity).where({ bridge_ID: { in: bIDs } }))
    const count = typeof result === 'number' ? result : (result?.affectedRows || 0)
    cleared += count
  }

  await deleteFrom('bridge.management.AlertsAndNotifications')
  await deleteFrom('bridge.management.AssetIQScores')
  await deleteFrom('bridge.management.BridgePermits')
  await deleteFrom('bridge.management.LoadRatingCertificates')
  await deleteFrom('bridge.management.NhvrRouteAssessments')
  await deleteFrom('bridge.management.BridgeRiskAssessments')
  await deleteFrom('bridge.management.BridgeLoadRatings')
  await deleteFrom('bridge.management.BridgeConditionSurveys')
  await deleteFrom('bridge.management.BridgeScourAssessments')
  await deleteFrom('bridge.management.BridgeCapacities')
  await deleteFrom('bridge.management.BridgeMaintenanceActions')
  await deleteFrom('bridge.management.BridgeDefects')
  await deleteFrom('bridge.management.BridgeInspections')
  await deleteFrom('bridge.management.BridgeRestrictions')
  await deleteFrom('bridge.management.BridgeAttributes')
  await deleteFrom('bridge.management.BridgeDocuments')
  await deleteFrom('bridge.management.BridgeMehComponents')
  await deleteFrom('bridge.management.BridgeContacts')
  await deleteFrom('bridge.management.BridgeCarriageways')

  const bridgeResult = await db.run(
    DELETE.from('bridge.management.Bridges').where({ ID: { in: bIDs } })
  )
  cleared += typeof bridgeResult === 'number' ? bridgeResult : bIDs.length

  return cleared
}

module.exports = { activateDemoData, clearDemoData }
