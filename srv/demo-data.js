const cds = require('@sap/cds')

const DEMO_BRIDGE_ID_OFFSET = 90001

// ── 10 real NSW bridges from TfNSW / Wikipedia open data ─────────────────────
// Sources: NSW Open Data Portal, Wikipedia List of Bridges in NSW, TfNSW Bridge Register
const BRIDGES = [
  {
    ID: DEMO_BRIDGE_ID_OFFSET,
    bridgeId:     'DEMO-NSW-001',
    bridgeName:   'Lennox Bridge (Glenbrook)',
    assetClass:   'Road Bridge',
    state:        'NSW',
    region:       'Blue Mountains',
    lga:          'Blue Mountains City',
    route:        'Great Western Highway',
    routeNumber:  'A32',
    latitude:     -33.754222,
    longitude:    150.632389,
    location:     'Glenbrook Lagoon, Blue Mountains',
    assetOwner:   'Transport for NSW',
    managingAuthority: 'Transport for NSW',
    structureType: 'Masonry Arch',
    material:     'Sandstone',
    yearBuilt:    1833,
    designLoad:   'T44',
    designStandard: 'Pre-standard',
    conditionRating: 5,
    structuralAdequacyRating: 4,
    condition:    'Fair',
    postingStatus: 'Restricted',
    deckWidth:    4.3,
    spanLength:   15.0,
    totalLength:  30.0,
    spanCount:    1,
    numberOfLanes: 1,
    clearanceHeight: 4.2,
    averageDailyTraffic: 2500,
    heavyVehiclePercent: 3.0,
    nhvrAssessed: true,
    freightRoute: false,
    highPriorityAsset: true,
    seismicZone:  'Zone 1',
    floodImmunityAriYears: 100,
    scourRisk:    'Low',
    importanceLevel: 2,
    isActive:     true,
    lastInspectionDate: '2024-04-10',
    nextInspectionDue:  '2026-04-10',
    remarks: 'Oldest stone arch bridge on mainland Australia (1833). Heritage listed — sandstone masonry in fair condition with surface spalling. Load-posted to 5t due to masonry age.'
  },
  {
    ID: DEMO_BRIDGE_ID_OFFSET + 1,
    bridgeId:     'DEMO-NSW-002',
    bridgeName:   'Sydney Harbour Bridge',
    assetClass:   'Road Bridge',
    state:        'NSW',
    region:       'Sydney Metro',
    lga:          'North Sydney',
    route:        'Pacific Highway / Bradfield Highway',
    routeNumber:  'A8',
    latitude:     -33.852056,
    longitude:    151.210750,
    location:     'Sydney Harbour, between Dawes Point and Milsons Point',
    assetOwner:   'Transport for NSW',
    managingAuthority: 'Transport for NSW',
    structureType: 'Arch Bridge',
    material:     'Steel',
    yearBuilt:    1932,
    designLoad:   'SM1600',
    designStandard: 'AS 5100.7:2017',
    conditionRating: 8,
    structuralAdequacyRating: 9,
    condition:    'Very Good',
    postingStatus: 'Unrestricted',
    deckWidth:    48.8,
    spanLength:   503.0,
    totalLength:  1149.0,
    spanCount:    1,
    numberOfLanes: 8,
    clearanceHeight: 49.0,
    averageDailyTraffic: 183000,
    heavyVehiclePercent: 9.5,
    nhvrAssessed: true,
    freightRoute: true,
    highPriorityAsset: true,
    seismicZone:  'Zone 1',
    floodImmunityAriYears: 500,
    scourRisk:    'Low',
    importanceLevel: 1,
    isActive:     true,
    lastInspectionDate: '2025-01-20',
    nextInspectionDue:  '2027-01-20',
    remarks: 'Iconic single-span arch bridge opened 19 March 1932. Carries 8 road lanes, 2 rail tracks, pedestrian and cycle paths. Maintained under a dedicated bridge maintenance programme.'
  },
  {
    ID: DEMO_BRIDGE_ID_OFFSET + 2,
    bridgeId:     'DEMO-NSW-003',
    bridgeName:   'Anzac Bridge',
    assetClass:   'Road Bridge',
    state:        'NSW',
    region:       'Sydney Metro',
    lga:          'City of Sydney',
    route:        'Western Distributor',
    routeNumber:  'A3',
    latitude:     -33.869111,
    longitude:    151.185722,
    location:     'Johnstons Bay, Pyrmont',
    assetOwner:   'Transport for NSW',
    managingAuthority: 'Transport for NSW',
    structureType: 'Cable-stayed',
    material:     'Concrete',
    yearBuilt:    1995,
    designLoad:   'SM1600',
    designStandard: 'AS 5100.7:2017',
    conditionRating: 9,
    structuralAdequacyRating: 9,
    condition:    'Excellent',
    postingStatus: 'Unrestricted',
    deckWidth:    22.5,
    spanLength:   345.0,
    totalLength:  805.0,
    spanCount:    1,
    numberOfLanes: 6,
    clearanceHeight: 40.0,
    averageDailyTraffic: 94000,
    heavyVehiclePercent: 7.2,
    nhvrAssessed: true,
    freightRoute: true,
    highPriorityAsset: true,
    seismicZone:  'Zone 1',
    floodImmunityAriYears: 500,
    scourRisk:    'Low',
    importanceLevel: 1,
    isActive:     true,
    lastInspectionDate: '2025-03-05',
    nextInspectionDue:  '2027-03-05',
    remarks: 'Australia\'s longest cable-stayed bridge (345m main span). Twin 120m concrete pylons. Carries 6 traffic lanes and pedestrian/cycle paths over Johnstons Bay.'
  },
  {
    ID: DEMO_BRIDGE_ID_OFFSET + 3,
    bridgeId:     'DEMO-NSW-004',
    bridgeName:   'Mooney Mooney Creek Bridge',
    assetClass:   'Road Bridge',
    state:        'NSW',
    region:       'Central Coast',
    lga:          'Gosford',
    route:        'F3 Sydney-Newcastle Freeway',
    routeNumber:  'M1',
    latitude:     -33.432444,
    longitude:    151.253639,
    location:     'Mooney Mooney Creek, Central Coast',
    assetOwner:   'Transport for NSW',
    managingAuthority: 'Transport for NSW',
    structureType: 'Box Girder',
    material:     'Prestressed Concrete',
    yearBuilt:    1986,
    designLoad:   'T44',
    designStandard: 'AS 1418',
    conditionRating: 7,
    structuralAdequacyRating: 8,
    condition:    'Good',
    postingStatus: 'Unrestricted',
    deckWidth:    11.8,
    spanLength:   89.0,
    totalLength:  292.0,
    spanCount:    4,
    numberOfLanes: 4,
    clearanceHeight: 56.0,
    averageDailyTraffic: 51000,
    heavyVehiclePercent: 14.8,
    nhvrAssessed: true,
    freightRoute: true,
    highPriorityAsset: true,
    seismicZone:  'Zone 1',
    floodImmunityAriYears: 200,
    scourRisk:    'Medium',
    importanceLevel: 2,
    isActive:     true,
    lastInspectionDate: '2024-08-15',
    nextInspectionDue:  '2026-08-15',
    remarks: 'One of the tallest bridges in NSW (56m clearance). Prestressed concrete box girder on the M1 Pacific Motorway. High freight corridor usage.'
  },
  {
    ID: DEMO_BRIDGE_ID_OFFSET + 4,
    bridgeId:     'DEMO-NSW-005',
    bridgeName:   'Sea Cliff Bridge',
    assetClass:   'Road Bridge',
    state:        'NSW',
    region:       'Illawarra',
    lga:          'Wollongong',
    route:        'Lawrence Hargrave Drive',
    routeNumber:  'B54',
    latitude:     -34.254111,
    longitude:    150.973472,
    location:     'Clifton, Wollongong',
    assetOwner:   'Transport for NSW',
    managingAuthority: 'Transport for NSW',
    structureType: 'Box Girder',
    material:     'Steel',
    yearBuilt:    2005,
    designLoad:   'SM1600',
    designStandard: 'AS 5100.7:2004',
    conditionRating: 9,
    structuralAdequacyRating: 9,
    condition:    'Excellent',
    postingStatus: 'Unrestricted',
    deckWidth:    10.5,
    spanLength:   45.0,
    totalLength:  665.0,
    spanCount:    16,
    numberOfLanes: 2,
    clearanceHeight: 18.0,
    averageDailyTraffic: 8500,
    heavyVehiclePercent: 4.1,
    nhvrAssessed: false,
    freightRoute: false,
    highPriorityAsset: false,
    seismicZone:  'Zone 1',
    floodImmunityAriYears: 200,
    scourRisk:    'Low',
    importanceLevel: 3,
    isActive:     true,
    lastInspectionDate: '2024-11-01',
    nextInspectionDue:  '2026-11-01',
    remarks: 'Cantilevered steel box girder bridge over the Pacific Ocean. Highly susceptible to marine corrosion; annual anti-corrosion maintenance programme in place.'
  },
  {
    ID: DEMO_BRIDGE_ID_OFFSET + 5,
    bridgeId:     'DEMO-NSW-006',
    bridgeName:   'Pheasants Nest Bridge',
    assetClass:   'Road Bridge',
    state:        'NSW',
    region:       'South West NSW',
    lga:          'Wollondilly',
    route:        'Hume Motorway',
    routeNumber:  'M31',
    latitude:     -34.236917,
    longitude:    150.662306,
    location:     'Nepean River, Pheasants Nest',
    assetOwner:   'Transport for NSW',
    managingAuthority: 'Transport for NSW',
    structureType: 'Box Girder',
    material:     'Prestressed Concrete',
    yearBuilt:    1980,
    designLoad:   'T44',
    designStandard: 'AS 1418',
    conditionRating: 6,
    structuralAdequacyRating: 7,
    condition:    'Satisfactory',
    postingStatus: 'Unrestricted',
    deckWidth:    13.4,
    spanLength:   80.0,
    totalLength:  320.0,
    spanCount:    4,
    numberOfLanes: 4,
    clearanceHeight: 35.0,
    averageDailyTraffic: 37000,
    heavyVehiclePercent: 18.2,
    nhvrAssessed: true,
    freightRoute: true,
    highPriorityAsset: true,
    seismicZone:  'Zone 1',
    floodImmunityAriYears: 100,
    scourRisk:    'Medium',
    importanceLevel: 2,
    isActive:     true,
    lastInspectionDate: '2023-06-20',
    nextInspectionDue:  '2025-06-20',
    remarks: 'Prestressed concrete box girder on the Hume Motorway (M31). High heavy vehicle utilisation. Deck joint deterioration noted in last inspection — remediation scheduled.'
  },
  {
    ID: DEMO_BRIDGE_ID_OFFSET + 6,
    bridgeId:     'DEMO-NSW-007',
    bridgeName:   'Hawkesbury River Railway Bridge',
    assetClass:   'Rail Bridge',
    state:        'NSW',
    region:       'Hunter',
    lga:          'Hawkesbury',
    route:        'Main North Line',
    routeNumber:  'MNL',
    latitude:     -33.533750,
    longitude:    151.228583,
    location:     'Hawkesbury River, between Gosford and Cowan',
    assetOwner:   'Transport for NSW',
    managingAuthority: 'Sydney Trains / Transport for NSW',
    structureType: 'Truss',
    material:     'Steel',
    yearBuilt:    1946,
    designLoad:   'HML',
    designStandard: 'Pre-AS 5100',
    conditionRating: 5,
    structuralAdequacyRating: 5,
    condition:    'Fair',
    postingStatus: 'Restricted',
    deckWidth:    7.2,
    spanLength:   151.0,
    totalLength:  755.0,
    spanCount:    5,
    numberOfLanes: 1,
    clearanceHeight: 7.5,
    averageDailyTraffic: 0,
    heavyVehiclePercent: 0,
    nhvrAssessed: false,
    freightRoute: false,
    highPriorityAsset: true,
    seismicZone:  'Zone 1',
    floodImmunityAriYears: 200,
    scourRisk:    'High',
    importanceLevel: 2,
    isActive:     true,
    lastInspectionDate: '2023-10-12',
    nextInspectionDue:  '2025-10-12',
    remarks: 'Critical single-track rail bridge on the Main North Line. Steel truss showing significant fatigue and corrosion. Scour risk elevated — tide and river flow monitoring in place.'
  },
  {
    ID: DEMO_BRIDGE_ID_OFFSET + 7,
    bridgeId:     'DEMO-NSW-008',
    bridgeName:   'Nowra Bridge',
    assetClass:   'Road Bridge',
    state:        'NSW',
    region:       'Illawarra',
    lga:          'Shoalhaven',
    route:        'Princes Highway',
    routeNumber:  'A1',
    latitude:     -34.882361,
    longitude:    150.600556,
    location:     'Shoalhaven River, Nowra',
    assetOwner:   'Transport for NSW',
    managingAuthority: 'Transport for NSW',
    structureType: 'Box Girder',
    material:     'Prestressed Concrete',
    yearBuilt:    1999,
    designLoad:   'SM1600',
    designStandard: 'AS 5100.7:1993',
    conditionRating: 8,
    structuralAdequacyRating: 8,
    condition:    'Good',
    postingStatus: 'Unrestricted',
    deckWidth:    13.0,
    spanLength:   70.0,
    totalLength:  280.0,
    spanCount:    4,
    numberOfLanes: 4,
    clearanceHeight: 9.0,
    averageDailyTraffic: 22000,
    heavyVehiclePercent: 15.6,
    nhvrAssessed: true,
    freightRoute: true,
    highPriorityAsset: false,
    seismicZone:  'Zone 1',
    floodImmunityAriYears: 100,
    scourRisk:    'Medium',
    importanceLevel: 3,
    isActive:     true,
    lastInspectionDate: '2024-09-25',
    nextInspectionDue:  '2026-09-25',
    remarks: 'Prestressed concrete box girder crossing of the Shoalhaven River on the Princes Highway. Replacement for the 1881 heritage bridge. Good overall condition.'
  },
  {
    ID: DEMO_BRIDGE_ID_OFFSET + 8,
    bridgeId:     'DEMO-NSW-009',
    bridgeName:   'Spit Bridge',
    assetClass:   'Road Bridge',
    state:        'NSW',
    region:       'Sydney Metro',
    lga:          'Northern Beaches',
    route:        'Spit Road',
    routeNumber:  '',
    latitude:     -33.797778,
    longitude:    151.235000,
    location:     'Middle Harbour, Mosman / Manly',
    assetOwner:   'Transport for NSW',
    managingAuthority: 'Transport for NSW',
    structureType: 'Bascule Bridge',
    material:     'Steel',
    yearBuilt:    1958,
    designLoad:   'T44',
    designStandard: 'Pre-AS 5100',
    conditionRating: 5,
    structuralAdequacyRating: 5,
    condition:    'Fair',
    postingStatus: 'Restricted',
    deckWidth:    9.1,
    spanLength:   54.0,
    totalLength:  172.0,
    spanCount:    3,
    numberOfLanes: 2,
    clearanceHeight: 3.0,
    averageDailyTraffic: 35000,
    heavyVehiclePercent: 3.5,
    nhvrAssessed: false,
    freightRoute: false,
    highPriorityAsset: true,
    seismicZone:  'Zone 1',
    floodImmunityAriYears: 50,
    scourRisk:    'Low',
    importanceLevel: 2,
    isActive:     true,
    lastInspectionDate: '2023-07-18',
    nextInspectionDue:  '2025-07-18',
    remarks: 'Electrically operated bascule (drawbridge) over Middle Harbour. Significant traffic congestion when open for marine traffic. Ageing mechanical and electrical components.'
  },
  {
    ID: DEMO_BRIDGE_ID_OFFSET + 9,
    bridgeId:     'DEMO-NSW-010',
    bridgeName:   'Darling River Bridge (Wilcannia)',
    assetClass:   'Road Bridge',
    state:        'NSW',
    region:       'Western NSW',
    lga:          'Central Darling',
    route:        'Barrier Highway',
    routeNumber:  'B79',
    latitude:     -31.560000,
    longitude:    143.371667,
    location:     'Darling River, Wilcannia',
    assetOwner:   'Transport for NSW',
    managingAuthority: 'Transport for NSW',
    structureType: 'Truss',
    material:     'Steel',
    yearBuilt:    1904,
    designLoad:   'T44',
    designStandard: 'Pre-standard',
    conditionRating: 3,
    structuralAdequacyRating: 3,
    condition:    'Poor',
    postingStatus: 'Posted',
    deckWidth:    6.1,
    spanLength:   50.0,
    totalLength:  150.0,
    spanCount:    3,
    numberOfLanes: 1,
    clearanceHeight: 4.5,
    averageDailyTraffic: 400,
    heavyVehiclePercent: 22.0,
    nhvrAssessed: true,
    freightRoute: true,
    highPriorityAsset: false,
    seismicZone:  'Zone 1',
    floodImmunityAriYears: 50,
    scourRisk:    'High',
    importanceLevel: 3,
    isActive:     true,
    lastInspectionDate: '2022-03-08',
    nextInspectionDue:  '2024-03-08',
    remarks: 'Heritage steel truss bridge over the Darling River in far western NSW. Posted to 8t. Significant corrosion and fatigue cracking in steel members. Flood and scour events have accelerated deterioration. Overdue for major rehabilitation.'
  }
]

// Per-bridge inspection programme: type, date, rating, findings, accreditation
const INSPECTION_DATA = [
  // DEMO-NSW-001 Lennox Bridge (heritage, fair)
  [
    { type: 'Detailed', date: '2024-04-10', rating: 5, accredLevel: 3, critical: false,
      recommendations: 'Sandstone spalling on western abutment requires repointing. Restrict to single-lane traffic and 5t mass limit. Next detailed inspection 2026.',
      nextRecommended: '2026-04-10', inspector: 'Sarah Chen PE CPEng' },
    { type: 'Routine', date: '2022-09-14', rating: 6, accredLevel: 2, critical: false,
      recommendations: 'Minor surface spalling observed. Continue monitoring. Heritage consultant review recommended before any repair works.',
      nextRecommended: '2024-09-14', inspector: 'James Patel' }
  ],
  // DEMO-NSW-002 Sydney Harbour Bridge (excellent)
  [
    { type: 'Detailed', date: '2025-01-20', rating: 8, accredLevel: 4, critical: false,
      recommendations: 'All structural members within acceptable limits. Ongoing anti-corrosion programme continuing per 5-year maintenance plan. No immediate actions required.',
      nextRecommended: '2027-01-20', inspector: 'Dr Marcus Webb PE' },
    { type: 'Routine', date: '2023-07-12', rating: 8, accredLevel: 3, critical: false,
      recommendations: 'Routine inspection — no defects of concern. Handrail painting programme on schedule.',
      nextRecommended: '2025-07-12', inspector: 'Angela Torres' },
    { type: 'Special', date: '2024-09-03', rating: 8, accredLevel: 4, critical: false,
      recommendations: 'Post-storm special inspection. No storm damage to structural elements. Minor debris accumulation on chord members — cleared.',
      nextRecommended: 'N/A', inspector: 'Dr Marcus Webb PE' }
  ],
  // DEMO-NSW-003 Anzac Bridge (excellent)
  [
    { type: 'Detailed', date: '2025-03-05', rating: 9, accredLevel: 4, critical: false,
      recommendations: 'Cable-stay system in excellent condition. Vibration dampers operating correctly. No corrective action required.',
      nextRecommended: '2027-03-05', inspector: 'Dr Priya Singh CPEng' },
    { type: 'Routine', date: '2023-09-20', rating: 9, accredLevel: 3, critical: false,
      recommendations: 'Excellent condition. Pylon access hatches serviceable. All drainage outlets clear.',
      nextRecommended: '2025-09-20', inspector: 'Leon Fraser' }
  ],
  // DEMO-NSW-004 Mooney Mooney (good)
  [
    { type: 'Detailed', date: '2024-08-15', rating: 7, accredLevel: 3, critical: false,
      recommendations: 'Minor efflorescence on pier caps. Expansion joint seals require replacement at next maintenance cycle. No structural concerns.',
      nextRecommended: '2026-08-15', inspector: 'Rachel Kim CPEng' },
    { type: 'Routine', date: '2022-11-03', rating: 7, accredLevel: 2, critical: false,
      recommendations: 'General wear consistent with age and traffic loading. No immediate action required.',
      nextRecommended: '2024-11-03', inspector: 'Tom Nguyen' }
  ],
  // DEMO-NSW-005 Sea Cliff Bridge (excellent)
  [
    { type: 'Detailed', date: '2024-11-01', rating: 9, accredLevel: 3, critical: false,
      recommendations: 'Excellent condition. Marine environment anti-corrosion coating holding up well. Inspect coating integrity annually.',
      nextRecommended: '2026-11-01', inspector: 'Fiona Clarke CPEng' },
    { type: 'Routine', date: '2023-05-18', rating: 9, accredLevel: 2, critical: false,
      recommendations: 'No defects of note. Continue annual anti-corrosion programme.',
      nextRecommended: '2025-05-18', inspector: 'Jake Wilson' }
  ],
  // DEMO-NSW-006 Pheasants Nest Bridge (satisfactory, deck joint issues)
  [
    { type: 'Detailed', date: '2023-06-20', rating: 6, accredLevel: 3, critical: false,
      recommendations: 'Deck joint deterioration in spans 2 and 3. Recommend replacement within 18 months. Surface cracking in deck slab over pier 2 — monitor closely.',
      nextRecommended: '2025-06-20', inspector: 'Michael Park CPEng' },
    { type: 'Routine', date: '2021-10-08', rating: 7, accredLevel: 2, critical: false,
      recommendations: 'Early signs of joint deterioration. Flag for inclusion in maintenance programme.',
      nextRecommended: '2023-10-08', inspector: 'Donna Lee' }
  ],
  // DEMO-NSW-007 Hawkesbury River Rail Bridge (fair, critical)
  [
    { type: 'Detailed', date: '2023-10-12', rating: 5, accredLevel: 4, critical: true,
      recommendations: 'Elevated fatigue cracking in truss verticals at mid-span. Corrosion Class C4 on lower chord in tidal zone. URGENT: commission fatigue life assessment before next scheduled major maintenance. Reduce permitted train speeds to 80km/h pending assessment.',
      nextRecommended: '2025-10-12', inspector: 'Dr Andrew Cameron PE' },
    { type: 'Special', date: '2024-03-22', rating: 5, accredLevel: 4, critical: true,
      recommendations: 'Follow-up fatigue assessment confirms cracking has not propagated. Speed restriction to 80km/h maintained. Repair programme to commence Q3 2025.',
      nextRecommended: 'N/A', inspector: 'Dr Andrew Cameron PE' }
  ],
  // DEMO-NSW-008 Nowra Bridge (good)
  [
    { type: 'Detailed', date: '2024-09-25', rating: 8, accredLevel: 3, critical: false,
      recommendations: 'Good condition. Minor efflorescence on pier 3. Waterproofing membrane in good condition. No action required.',
      nextRecommended: '2026-09-25', inspector: 'Claire Murphy CPEng' },
    { type: 'Routine', date: '2022-12-07', rating: 8, accredLevel: 2, critical: false,
      recommendations: 'Satisfactory. Clean and serviceable drainage outlets on all piers.',
      nextRecommended: '2024-12-07', inspector: 'Ben Taylor' }
  ],
  // DEMO-NSW-009 Spit Bridge (fair, ageing mechanical)
  [
    { type: 'Detailed', date: '2023-07-18', rating: 5, accredLevel: 3, critical: false,
      recommendations: 'Bascule mechanism requires overhaul — hydraulic seals leaking. Main span steel showing surface corrosion on soffits. Restrict to 5t and 2-lane operation until mechanical overhaul completed.',
      nextRecommended: '2025-07-18', inspector: 'Steven Park CPEng' },
    { type: 'Routine', date: '2021-11-25', rating: 6, accredLevel: 2, critical: false,
      recommendations: 'Mechanical operation within acceptable limits. Monitor hydraulic system for leaks at next service.',
      nextRecommended: '2023-11-25', inspector: 'Maria Santos' }
  ],
  // DEMO-NSW-010 Darling River Bridge Wilcannia (poor, critical)
  [
    { type: 'Detailed', date: '2022-03-08', rating: 3, accredLevel: 4, critical: true,
      recommendations: 'CRITICAL: Significant section loss in truss lower chord members P2-P3. Post bridge to 8 tonnes immediately. Scour protection at pier 2 requires urgent repair after 2021 flood event. Commission structural adequacy review before any load above 8t is permitted.',
      nextRecommended: '2024-03-08', inspector: 'Dr Hugh Robertson PE' },
    { type: 'Routine', date: '2020-08-14', rating: 5, accredLevel: 2, critical: false,
      recommendations: 'Corrosion noted on lower chord. Monitor. Post to 15t as precaution.',
      nextRecommended: '2022-08-14', inspector: 'Paul Christie' }
  ]
]

// Per-bridge defects: severity 1=Low, 2=Medium, 3=High, 4=Critical
const DEFECT_DATA = [
  // Lennox Bridge (heritage sandstone)
  [
    { type: 'Spalling', element: 'Western Abutment', severity: 3, urgency: 2, status: 'Open', priority: 'P2',
      desc: 'Sandstone spalling 300mm×200mm on western abutment face. Mortar joint deterioration noted. Heritage significance requires specialist repair approach.' },
    { type: 'Cracking', element: 'Arch Barrel', severity: 2, urgency: 3, status: 'In Progress', priority: 'P3',
      desc: 'Hairline longitudinal cracks in arch barrel soffit. Consistent with thermal cycling. Monitor for progression.' },
    { type: 'Vegetation', element: 'Parapet', severity: 1, urgency: 4, status: 'Open', priority: 'P4',
      desc: 'Moss and lichen growth on parapet walls. Minor root penetration beginning. Schedule herbicide treatment.' }
  ],
  // Sydney Harbour Bridge
  [
    { type: 'Corrosion', element: 'Hanger Rods', severity: 2, urgency: 3, status: 'In Progress', priority: 'P3',
      desc: 'Surface corrosion (Class C3) on hanger rods in western approach. Anti-corrosion paint applied — monitor for reblast trigger.' },
    { type: 'Fatigue', element: 'Upper Chord', severity: 2, urgency: 3, status: 'Open', priority: 'P3',
      desc: 'Micro-crack indication at upper chord splice plate, panel 14. Strain gauge monitoring installed.' }
  ],
  // Anzac Bridge (cable-stayed — minimal)
  [
    { type: 'Corrosion', element: 'Cable Anchorage', severity: 1, urgency: 4, status: 'Open', priority: 'P4',
      desc: 'Very minor surface corrosion on north pylon cable anchorage cap plates. No structural concern — schedule protective coating at next maintenance shutdown.' },
    { type: 'Cracking', element: 'Deck Surface', severity: 1, urgency: 4, status: 'Closed', priority: 'P4',
      desc: 'Minor transverse hairline crack in deck surface, westbound lane 2. Sealed with bituminous filler. Monitor.' }
  ],
  // Mooney Mooney
  [
    { type: 'Efflorescence', element: 'Pier Caps', severity: 2, urgency: 3, status: 'Open', priority: 'P3',
      desc: 'White efflorescence deposits on pier caps 1 and 3. Indicative of water ingress through expansion joint. Investigate and repair joint seal.' },
    { type: 'Deterioration', element: 'Expansion Joints', severity: 2, urgency: 2, status: 'Open', priority: 'P2',
      desc: 'Expansion joint seals deteriorated in spans 3 and 4. Water ingress onto pier caps. Replace at next maintenance window.' },
    { type: 'Spalling', element: 'Deck Soffit', severity: 1, urgency: 4, status: 'Open', priority: 'P4',
      desc: 'Isolated concrete spalling <100mm diameter on deck soffit near span 2 midpoint. No rebar exposure. Monitor.' }
  ],
  // Sea Cliff Bridge (marine)
  [
    { type: 'Corrosion', element: 'Steel Box Girder', severity: 2, urgency: 3, status: 'In Progress', priority: 'P3',
      desc: 'Marine corrosion (Class C5M) on lower flange of steel box girder, spans 4-7. Anti-corrosion recoat underway as part of annual programme.' },
    { type: 'Corrosion', element: 'Barrier Posts', severity: 1, urgency: 4, status: 'Open', priority: 'P4',
      desc: 'Surface rust on steel barrier post bases, spans 11-14. Treat and repaint.' }
  ],
  // Pheasants Nest Bridge (joint deterioration)
  [
    { type: 'Deterioration', element: 'Expansion Joints', severity: 3, urgency: 2, status: 'Open', priority: 'P2',
      desc: 'Expansion joint seals in spans 2 and 3 failed — water and debris penetrating to pier tops. Pier cap staining and concrete breakdown visible. Replacement required within 12 months.' },
    { type: 'Cracking', element: 'Deck Slab', severity: 3, urgency: 2, status: 'Open', priority: 'P2',
      desc: 'Transverse cracking in deck slab over pier 2. Cracks 0.3mm width, 2.5m length. Monitor for progression; crack injection if width exceeds 0.5mm.' },
    { type: 'Corrosion', element: 'Post-tension Ducts', severity: 2, urgency: 2, status: 'Open', priority: 'P2',
      desc: 'GPR scan indicates potential void in post-tension duct at span 3. Investigate with destructive opening to confirm before load assessment.' }
  ],
  // Hawkesbury Rail Bridge (critical fatigue)
  [
    { type: 'Fatigue', element: 'Truss Verticals', severity: 4, urgency: 1, status: 'In Progress', priority: 'P1',
      desc: 'CRITICAL: Fatigue cracks in truss vertical members VP3 and VP4 at rivet holes. Section loss 15-20%. Speed restriction imposed. Repair programme in progress.' },
    { type: 'Corrosion', element: 'Lower Chord (Tidal Zone)', severity: 3, urgency: 1, status: 'Open', priority: 'P1',
      desc: 'Corrosion Class C4 on lower chord members in tidal zone. Pitting corrosion up to 4mm depth. Section loss to be quantified in repair programme.' },
    { type: 'Scour', element: 'Pier 2 Footing', severity: 3, urgency: 2, status: 'In Progress', priority: 'P2',
      desc: 'Post-flood scour at pier 2 footing. Scour protection rock blanket partially displaced. Reinstatement works in progress.' }
  ],
  // Nowra Bridge (good, minor)
  [
    { type: 'Efflorescence', element: 'Pier 3', severity: 1, urgency: 4, status: 'Open', priority: 'P4',
      desc: 'Efflorescence deposits on pier 3 cap. Minor. Monitor — clean at next routine maintenance.' },
    { type: 'Cracking', element: 'Wingwall', severity: 1, urgency: 4, status: 'Closed', priority: 'P4',
      desc: 'Minor crack in south wingwall. Sealed 2023. No progression in follow-up inspection.' }
  ],
  // Spit Bridge (mechanical)
  [
    { type: 'Mechanical', element: 'Bascule Hydraulic System', severity: 3, urgency: 2, status: 'In Progress', priority: 'P2',
      desc: 'Hydraulic seal leaking on port-side actuator. Temporary seal repair applied. Full replacement required at next planned maintenance shutdown.' },
    { type: 'Corrosion', element: 'Main Span Soffit', severity: 2, urgency: 3, status: 'Open', priority: 'P3',
      desc: 'Surface corrosion on steel soffit plates of main span. Photograph and treat at next maintenance access opportunity.' },
    { type: 'Deterioration', element: 'Electrical Conduit', severity: 2, urgency: 2, status: 'Open', priority: 'P2',
      desc: 'Conduit housing bascule control cabling showing cracking. Risk of water ingress. Replace conduit section — refer to electrical maintenance team.' }
  ],
  // Darling River Bridge Wilcannia (critical poor)
  [
    { type: 'Section Loss', element: 'Lower Chord P2-P3', severity: 4, urgency: 1, status: 'In Progress', priority: 'P1',
      desc: 'CRITICAL: Section loss 25-30% in lower chord members between pier 2 and pier 3. Caused by long-term corrosion and 2021 flood exposure. Bridge posted 8t. Rehabilitation design underway.' },
    { type: 'Scour', element: 'Pier 2 Foundation', severity: 4, urgency: 1, status: 'Open', priority: 'P1',
      desc: 'CRITICAL: Scour exposure of pier 2 foundation following 2021 flood. Foundation now 0.8m below original scour protection level. Emergency rock mattress placed. Permanent repair required.' },
    { type: 'Corrosion', element: 'All Steel Members', severity: 3, urgency: 2, status: 'Open', priority: 'P2',
      desc: 'General Class C4 atmospheric corrosion across all steel members. Last painted 1998. Full blast and recoat required as part of rehabilitation.' },
    { type: 'Cracking', element: 'Timber Deck', severity: 2, urgency: 3, status: 'Open', priority: 'P3',
      desc: 'Transverse cracking and splitting in timber deck planks. Multiple sections require replacement.' }
  ]
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

  const demoBridges = await db.run(
    SELECT.from('bridge.management.Bridges').where({ bridgeId: { like: 'DEMO-NSW-%' } })
  )

  for (let bi = 0; bi < demoBridges.length; bi++) {
    const bridge = demoBridges[bi]
    const bID = bridge.ID
    const bridgeDef = BRIDGES.find(b => b.bridgeId === bridge.bridgeId)
    if (!bridgeDef) continue

    // ── 2. BridgeCapacities ──────────────────────────────────────────────────
    const capExisting = await db.run(
      SELECT.one.from('bridge.management.BridgeCapacities').where({ bridge_ID: bID })
    )
    if (!capExisting) {
      const isRail = bridge.bridgeId === 'DEMO-NSW-007'
      const isHeritage = ['DEMO-NSW-001', 'DEMO-NSW-010'].includes(bridge.bridgeId)
      await db.run(INSERT.into('bridge.management.BridgeCapacities').entries({
        ID:                 cds.utils.uuid(),
        bridge_ID:          bID,
        capacityType:       isRail ? 'Rail Loading AS 7636' : isHeritage ? 'Restricted Load Assessment' : 'AS 5100.7:2017',
        grossMassLimit:     isHeritage ? 5.0 : bridge.bridgeId === 'DEMO-NSW-010' ? 8.0 : 42.5,
        grossCombined:      isHeritage ? 5.0 : bridge.bridgeId === 'DEMO-NSW-010' ? 8.0 : 68.0,
        steerAxleLimit:     isHeritage ? 2.5 : 6.5,
        singleAxleLimit:    isHeritage ? 3.0 : 9.0,
        tandemGroupLimit:   isHeritage ? 4.5 : 16.5,
        triAxleGroupLimit:  isHeritage ? 5.0 : 22.5,
        minClearancePosted: bridge.clearanceHeight || 5.0,
        lane1Clearance:     bridge.clearanceHeight || 5.0,
        carriagewayWidth:   bridge.deckWidth || 10.0,
        trafficableWidth:   (bridge.deckWidth || 10.0) - 0.5,
        ratingStandard:     isRail ? 'AS 7636:2013' : 'AS 5100.7:2017',
        ratingFactor:       isHeritage ? 0.6000 : bridge.bridgeId === 'DEMO-NSW-010' ? 0.7500 : 0.9500,
        ratingDate:         '2023-06-15',
        nextReviewDue:      '2028-06-15',
        capacityStatus:     'Current',
        effectiveFrom:      '2023-06-15',
        engineeringNotes:   isHeritage
          ? 'Heritage asset — load capacity restricted by masonry condition and heritage preservation requirements. Assessment per AGBT07/04.'
          : bridge.bridgeId === 'DEMO-NSW-010'
            ? 'Emergency restriction applied following 2022 structural assessment. Reduced from 42.5t to 8t pending rehabilitation. Review every 12 months.'
            : 'Standard T44/SM1600 rating per AS 5100.7:2017.'
      }))
      loaded++
    }

    // ── 3. BridgeInspections ─────────────────────────────────────────────────
    const inspExisting = await db.run(
      SELECT.from('bridge.management.BridgeInspections').where({ bridge_ID: bID })
    )
    if (inspExisting.length === 0) {
      const inspDefs = INSPECTION_DATA[bi] || []
      const inspIds = []
      for (let ii = 0; ii < inspDefs.length; ii++) {
        const insp = inspDefs[ii]
        const inspId = cds.utils.uuid()
        inspIds.push(inspId)
        const seq = bi * 3 + ii + 1
        await db.run(INSERT.into('bridge.management.BridgeInspections').entries({
          ID:                     inspId,
          bridge_ID:              bID,
          inspectionRef:          `INS-DEMO-${String(seq).padStart(4,'0')}`,
          inspectionDate:         insp.date,
          inspectionType:         insp.type,
          inspector:              insp.inspector,
          inspectorAccreditationLevel: `Level ${insp.accredLevel}`,
          overallConditionRating: insp.rating,
          criticalFindings:       insp.critical,
          recommendedActions:     insp.recommendations,
          nextInspectionRecommended: insp.nextRecommended !== 'N/A' ? insp.nextRecommended : null,
          active:                 true
        }))
        loaded++
      }

      // ── 4. BridgeDefects (linked to first inspection of this bridge) ───────
      const defExisting = await db.run(
        SELECT.one.from('bridge.management.BridgeDefects').where({ bridge_ID: bID })
      )
      if (!defExisting) {
        const defDefs = DEFECT_DATA[bi] || []
        for (let di = 0; di < defDefs.length; di++) {
          const def = defDefs[di]
          const dseq = bi * 4 + di + 1
          await db.run(INSERT.into('bridge.management.BridgeDefects').entries({
            ID:                 cds.utils.uuid(),
            bridge_ID:          bID,
            inspection_ID:      inspIds[0] || null,
            defectId:           `DEF-DEMO-${String(dseq).padStart(4,'0')}`,
            defectType:         def.type,
            defectDescription:  def.desc,
            bridgeElement:      def.element,
            severity:           def.severity,
            urgency:            def.urgency,
            remediationStatus:  def.status,
            maintenancePriority: def.priority,
            active:             true
          }))
          loaded++
        }
      }
    }

    // ── 5. BridgeConditionSurveys ────────────────────────────────────────────
    const surveyExisting = await db.run(
      SELECT.one.from('bridge.management.BridgeConditionSurveys').where({ bridge_ID: bID })
    )
    if (!surveyExisting) {
      const cr = bridgeDef.conditionRating
      const gradeMap = { 9: 'Excellent', 8: 'Good', 7: 'Good', 6: 'Satisfactory', 5: 'Fair', 4: 'Fair', 3: 'Poor', 2: 'Critical', 1: 'Critical' }
      await db.run(INSERT.into('bridge.management.BridgeConditionSurveys').entries({
        ID:              cds.utils.uuid(),
        bridge_ID:       bID,
        surveyRef:       `CS-DEMO-${String(bi + 1).padStart(4,'0')}`,
        bridgeRef:       bridge.bridgeId,
        surveyDate:      bridgeDef.lastInspectionDate,
        surveyType:      'Detailed',
        surveyedBy:      INSPECTION_DATA[bi]?.[0]?.inspector || 'Demo Survey Team',
        conditionRating: cr,
        structuralRating: bridgeDef.structuralAdequacyRating || cr,
        overallGrade:    gradeMap[cr] || 'Fair',
        status:          'Approved',
        active:          true,
        notes:           `Condition survey based on ${INSPECTION_DATA[bi]?.[0]?.type || 'Detailed'} inspection. ${INSPECTION_DATA[bi]?.[0]?.recommendations?.slice(0, 120) || ''}`
      }))
      loaded++
    }

    // ── 6. BridgeLoadRatings ─────────────────────────────────────────────────
    const lrExisting = await db.run(
      SELECT.one.from('bridge.management.BridgeLoadRatings').where({ bridge_ID: bID })
    )
    if (!lrExisting) {
      const isOld = bridgeDef.yearBuilt < 1960
      const isCritical = bridgeDef.conditionRating <= 4
      const rf = isCritical ? 0.65 : isOld ? 0.75 : 0.95
      const gml = isCritical ? 8.0 : isOld ? 15.0 : 42.5
      await db.run(INSERT.into('bridge.management.BridgeLoadRatings').entries({
        ID:            cds.utils.uuid(),
        bridge_ID:     bID,
        ratingRef:     `LR-DEMO-${String(bi + 1).padStart(4,'0')}`,
        bridgeRef:     bridge.bridgeId,
        vehicleClass:  bridgeDef.designLoad || 'T44',
        ratingMethod:  'AS5100',
        ratingFactor:  rf,
        grossMassLimit: gml,
        assessedBy:    INSPECTION_DATA[bi]?.[0]?.inspector || 'Demo Load Rating Engineer',
        assessmentDate: bridgeDef.lastInspectionDate,
        validTo:       isCritical ? '2025-12-31' : '2028-12-31',
        governingMember: isCritical ? 'Lower chord — section loss critical' : 'Main span mid-deck',
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
      const cr = bridgeDef.conditionRating
      const isCritical = cr <= 3
      const isHigh = cr <= 5
      const L = isCritical ? 4 : isHigh ? 3 : 2
      const C = bridgeDef.highPriorityAsset ? 4 : isHigh ? 3 : 2
      const rL = isCritical ? 3 : 2
      const rC = isCritical ? 3 : 2
      const scoreLevel = (s) => s >= 15 ? 'Extreme' : s >= 10 ? 'High' : s >= 5 ? 'Medium' : 'Low'
      const riskDesc = isCritical
        ? 'Significant structural deterioration poses risk of partial failure under design loading. Emergency load restriction in place.'
        : isHigh
          ? 'Progressive deterioration with identified defects. Risk of accelerated deterioration if remediation delayed.'
          : 'Normal deterioration within expected range for structure age and type. Managed through routine inspection programme.'
      await db.run(INSERT.into('bridge.management.BridgeRiskAssessments').entries({
        ID:                   cds.utils.uuid(),
        bridge_ID:            bID,
        assessmentId:         `RSK-DEMO-${String(bi + 1).padStart(4,'0')}`,
        assessmentDate:       bridgeDef.lastInspectionDate,
        assessmentCycle:      isCritical ? 'Semi-Annual' : 'Annual',
        riskCategory:         isCritical ? 'Structural' : isHigh ? 'Structural' : 'Operational',
        riskType:             isCritical ? 'Structural Failure' : 'Deterioration',
        riskDescription:      riskDesc,
        likelihood:           L,
        consequence:          C,
        inherentRiskScore:    L * C,
        inherentRiskLevel:    scoreLevel(L * C),
        existingControls:     isCritical
          ? 'Load restriction 8t. Speed restriction (rail). Monthly monitoring inspections. Rehabilitation design underway.'
          : 'Regular inspection programme. Reactive maintenance budget allocated. Annual condition survey.',
        residualLikelihood:   rL,
        residualConsequence:  rC,
        residualRiskScore:    rL * rC,
        residualRiskLevel:    scoreLevel(rL * rC),
        treatmentActions:     isCritical
          ? 'Detailed rehabilitation design — tender Q2 2026. Emergency scour protection — complete. Load and speed restrictions maintained.'
          : 'Include identified defects in maintenance programme. Schedule remediation at next maintenance window.',
        assessor:             INSPECTION_DATA[bi]?.[0]?.inspector || 'Demo Risk Assessor',
        reviewDueDate:        isCritical ? '2025-06-01' : '2026-01-01',
        riskRegisterStatus:   isCritical ? 'Escalated' : isHigh ? 'Open' : 'Open',
        treatmentStatus:      isCritical ? 'In Progress' : 'Not Started',
        active:               true
      }))
      loaded++
    }

    // ── 8. NhvrRouteAssessments ──────────────────────────────────────────────
    if (bridgeDef.nhvrAssessed) {
      const nhvrExisting = await db.run(
        SELECT.one.from('bridge.management.NhvrRouteAssessments').where({ bridge_ID: bID })
      )
      if (!nhvrExisting) {
        const isRestricted = bridgeDef.conditionRating <= 4
        await db.run(INSERT.into('bridge.management.NhvrRouteAssessments').entries({
          ID:                     cds.utils.uuid(),
          bridge_ID:              bID,
          assessmentId:           `NHRA-DEMO-${String(bi + 1).padStart(4,'0')}`,
          assessorName:           INSPECTION_DATA[bi]?.[0]?.inspector || 'Demo NHVR Assessor',
          assessorAccreditationNo: `TFNSW-ACC-DEMO-${String(bi + 1).padStart(3,'0')}`,
          assessmentDate:         bridgeDef.lastInspectionDate,
          assessmentVersion:      '2.0',
          assessmentStatus:       isRestricted ? 'Conditional' : 'Current',
          approvedVehicleClasses: isRestricted ? 'General Access only — under restriction' : 'B-Double, PBS Level 2, HML',
          validFrom:              bridgeDef.lastInspectionDate,
          validTo:                isRestricted ? '2025-12-31' : '2029-12-31',
          nextReviewDate:         isRestricted ? '2025-06-01' : '2029-12-31',
          notes:                  isRestricted
            ? 'Conditional approval — load restriction in force. Reassessment required following rehabilitation completion.'
            : `Assessment confirms structure suitable for heavy vehicle route. ${bridgeDef.bridgeName} on ${bridgeDef.route}.`
        }))
        loaded++
      }
    }

    // ── 9. LoadRatingCertificates ────────────────────────────────────────────
    const lrcExisting = await db.run(
      SELECT.one.from('bridge.management.LoadRatingCertificates').where({ bridge_ID: bID })
    )
    if (!lrcExisting) {
      const isCritical = bridgeDef.conditionRating <= 4
      const rf = isCritical ? 0.65 : bridgeDef.yearBuilt < 1960 ? 0.75 : 0.95
      await db.run(INSERT.into('bridge.management.LoadRatingCertificates').entries({
        ID:                    cds.utils.uuid(),
        bridge_ID:             bID,
        certificateNumber:     `LRC-DEMO-${String(bi + 1).padStart(4,'0')}`,
        certificateVersion:    isCritical ? 3 : 1,
        status:                'Current',
        ratingStandard:        'AS 5100.7:2017',
        ratingLevel:           bridgeDef.designLoad || 'T44',
        certifyingEngineer:    INSPECTION_DATA[bi]?.[0]?.inspector || 'Demo Certifying Engineer',
        engineerQualification: 'CPEng NER MIEAust',
        rfT44:                 rf,
        rfSM1600:              rf - 0.07,
        dynamicLoadAllowance:  1.4,
        governingMember:       isCritical ? 'Lower chord members — section loss' : 'Main span centre — critical bending moment',
        certificateIssueDate:  bridgeDef.lastInspectionDate,
        certificateExpiryDate: isCritical ? '2025-12-31' : '2028-12-31',
        nextReviewDate:        isCritical ? '2025-06-01' : '2028-12-31',
        notes:                 isCritical
          ? 'RESTRICTED CERTIFICATE: Load posting 8t applied. Certificate valid only while restriction in force. Requires recertification post-rehabilitation.'
          : 'Standard load rating certificate. Valid for nominated vehicle classes at TfNSW regulatory loads.'
      }))
      loaded++
    }

    // ── 10. BridgePermits ────────────────────────────────────────────────────
    if (bridgeDef.freightRoute && bridgeDef.conditionRating > 4) {
      const permExisting = await db.run(
        SELECT.one.from('bridge.management.BridgePermits').where({ bridge_ID: bID })
      )
      if (!permExisting) {
        await db.run(INSERT.into('bridge.management.BridgePermits').entries({
          ID:            cds.utils.uuid(),
          bridge_ID:     bID,
          permitRef:     `PM-DEMO-${String(bi + 1).padStart(4,'0')}`,
          bridgeRef:     bridge.bridgeId,
          permitType:    'Overmass',
          applicantName: 'Linfox Logistics Pty Ltd',
          vehicleClass:  'PBS Level 2',
          grossMass:     68.5,
          height:        4.3,
          width:         2.9,
          length:        26.0,
          appliedDate:   '2024-10-01',
          validFrom:     '2024-10-20',
          validTo:       '2025-10-20',
          status:        'Approved',
          decisionBy:    'TfNSW Permit Office',
          decisionDate:  '2024-10-15',
          conditionsOfApproval: 'Single movement only. Pilot vehicle required front and rear. Bridge crossing time 0600-0800 AEST or 2000-2200 AEST (off-peak). No concurrent heavy vehicles on bridge.',
          active:        true
        }))
        loaded++
      }
    }

    // ── 11. BridgeScourAssessments ───────────────────────────────────────────
    const scourExisting = await db.run(
      SELECT.one.from('bridge.management.BridgeScourAssessments').where({ bridge_ID: bID })
    )
    if (!scourExisting) {
      const scourRiskLevel = bridgeDef.scourRisk || 'Low'
      const isCritical = scourRiskLevel === 'High'
      await db.run(INSERT.into('bridge.management.BridgeScourAssessments').entries({
        ID:                     cds.utils.uuid(),
        bridge_ID:              bID,
        assessmentDate:         bridgeDef.lastInspectionDate,
        assessmentType:         isCritical ? 'Field' : 'Desktop',
        scourRisk:              scourRiskLevel,
        measuredDepth:          isCritical ? 0.8 : 0.2,
        mitigationStatus:       isCritical ? 'Remediation In Progress' : 'No Action Required',
        assessor:               INSPECTION_DATA[bi]?.[0]?.inspector || 'Demo Scour Assessor',
        waterwayType:           bridgeDef.bridgeId === 'DEMO-NSW-002' ? 'Tidal Harbour' : 'River',
        foundationType:         bridgeDef.yearBuilt < 1940 ? 'Timber Pile' : 'Concrete Pile',
        criticalScourDepthM:    isCritical ? 1.5 : 2.5,
        postFloodInspectionRequired: isCritical,
        remarks:                isCritical
          ? `High scour risk — ${scourRiskLevel} classification. Post-flood inspections mandatory. Scour protection works in programme.`
          : `Low-medium scour risk. Standard monitoring interval. Annual post-flood check if major rain event.`
      }))
      loaded++
    }

    // ── 12. BridgeMaintenanceActions ─────────────────────────────────────────
    try {
      const maExisting = await db.run(
        SELECT.one.from('bridge.management.BridgeMaintenanceActions').where({ bridge_ID: bID })
      )
      if (!maExisting) {
        const cr = bridgeDef.conditionRating
        const isCritical = cr <= 3
        const isHigh = cr <= 5
        await db.run(INSERT.into('bridge.management.BridgeMaintenanceActions').entries({
          ID:                cds.utils.uuid(),
          bridge_ID:         bID,
          actionRef:         `MA-DEMO-${String(bi + 1).padStart(4,'0')}`,
          bridgeRef:         bridge.bridgeId,
          actionType:        isCritical ? 'Rehabilitation' : isHigh ? 'Repair' : 'Preventive',
          priority:          isCritical ? 'P1' : isHigh ? 'P2' : 'P3',
          status:            isCritical ? 'In Progress' : 'Planned',
          actionTitle:       isCritical
            ? 'Emergency Structural Rehabilitation'
            : isHigh
              ? 'Defect Remediation — Priority Repairs'
              : 'Preventive Maintenance Programme',
          actionDescription: isCritical
            ? `Emergency rehabilitation of ${bridge.bridgeName}. Scope: replace lower chord members, scour protection reinstatement, blast and recoat all steel, timber deck replacement.`
            : isHigh
              ? `Targeted repair programme for priority defects identified in ${INSPECTION_DATA[bi]?.[0]?.date} inspection.`
              : `Scheduled preventive maintenance per 5-year bridge maintenance programme. Anti-corrosion recoat, joint seal replacement, drainage clearing.`,
          estimatedCostAUD:  isCritical ? 2800000 : isHigh ? 380000 : 45000,
          actualCostAUD:     isCritical ? 650000 : null,
          scheduledDate:     isCritical ? '2025-07-01' : isHigh ? '2026-03-01' : '2026-09-01',
          completedDate:     null,
          standardsReference: 'AS 5100.7:2017; TfNSW Bridge Maintenance Guidelines',
          safetyRequirements: 'Traffic management plan required. Lane closures as per TfNSW Code of Practice. Confined space entry procedures for box girder access.',
          active:             true
        }))
        loaded++
      }
    } catch (_) {}

    // ── 13. AssetIQScores ────────────────────────────────────────────────────
    const aiqExisting = await db.run(
      SELECT.one.from('bridge.management.AssetIQScores').where({ bridge_ID: bID })
    )
    if (!aiqExisting) {
      const cr = bridgeDef.conditionRating
      const age = 2026 - (bridgeDef.yearBuilt || 1980)
      const bciFactor = Math.round((cr / 10) * 35 * 100) / 100
      const ageFactor = Math.round(Math.max(0, 15 - age * 0.12) * 100) / 100
      const aadt = bridgeDef.averageDailyTraffic || 20000
      const trafficFactor = Math.round(Math.min(20, (aadt / 200000) * 20) * 100) / 100
      const defectCount = (DEFECT_DATA[bi] || []).filter(d => d.severity >= 3).length
      const defectFactor = Math.round(Math.max(5, 20 - defectCount * 4) * 100) / 100
      const loadFactor = bridgeDef.freightRoute ? 7.0 : 9.0
      const overallScore = Math.round((bciFactor + ageFactor + trafficFactor + defectFactor + loadFactor) * 100) / 100
      const ragStatus = overallScore >= 65 ? 'GREEN' : overallScore >= 45 ? 'AMBER' : 'RED'
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

  // ── 14. AlertsAndNotifications ───────────────────────────────────────────
  const alertExisting = await db.run(
    SELECT.from('bridge.management.AlertsAndNotifications').where({ entityType: 'DemoAlert' })
  )
  if (alertExisting.length === 0 && demoBridges.length >= 4) {
    const critical = demoBridges.find(b => b.bridgeId === 'DEMO-NSW-010') // Darling River
    const rail = demoBridges.find(b => b.bridgeId === 'DEMO-NSW-007')     // Hawkesbury Rail
    const spit = demoBridges.find(b => b.bridgeId === 'DEMO-NSW-009')     // Spit Bridge
    const pheasant = demoBridges.find(b => b.bridgeId === 'DEMO-NSW-006') // Pheasants Nest

    const alerts = []
    if (critical) alerts.push({
      ID:               cds.utils.uuid(),
      bridge_ID:        critical.ID,
      alertType:        'StructuralCritical',
      entityType:       'DemoAlert',
      entityId:         'RSK-DEMO-010',
      entityDescription: 'Critical structural defect — Darling River Bridge Wilcannia',
      alertTitle:       'CRITICAL: Structural Defects — Darling River Bridge (Wilcannia)',
      alertDescription: 'Section loss 25-30% in lower chord P2-P3. Bridge posted 8t. Rehabilitation design underway. Monthly monitoring required.',
      severity:         'Critical',
      priority:         1,
      triggeredDate:    now,
      dueDate:          '2025-06-01',
      status:           'Open'
    })
    if (rail) alerts.push({
      ID:               cds.utils.uuid(),
      bridge_ID:        rail.ID,
      alertType:        'InspectionOverdue',
      entityType:       'DemoAlert',
      entityId:         'INS-DEMO-022',
      entityDescription: 'Overdue inspection — Hawkesbury River Railway Bridge',
      alertTitle:       'Inspection Overdue: Hawkesbury River Railway Bridge',
      alertDescription: 'Last inspection 2023-10-12. Fatigue cracks previously identified — follow-up inspection overdue. Speed restriction 80km/h maintained.',
      severity:         'High',
      priority:         1,
      triggeredDate:    now,
      dueDate:          today,
      status:           'Open'
    })
    if (spit) alerts.push({
      ID:               cds.utils.uuid(),
      bridge_ID:        spit.ID,
      alertType:        'MaintenanceDue',
      entityType:       'DemoAlert',
      entityId:         'MA-DEMO-009',
      entityDescription: 'Bascule hydraulic overhaul due — Spit Bridge',
      alertTitle:       'Maintenance Due: Spit Bridge Bascule Hydraulic Overhaul',
      alertDescription: 'Hydraulic seal replacement deferred from 2024 maintenance window. Overhaul required before 2025 peak summer period.',
      severity:         'Warning',
      priority:         2,
      triggeredDate:    now,
      dueDate:          '2025-09-01',
      status:           'Open'
    })
    if (pheasant) alerts.push({
      ID:               cds.utils.uuid(),
      bridge_ID:        pheasant.ID,
      alertType:        'DefectEscalation',
      entityType:       'DemoAlert',
      entityId:         'DEF-DEMO-016',
      entityDescription: 'Expansion joint failure — Pheasants Nest Bridge (M31)',
      alertTitle:       'Defect Alert: Expansion Joint Failure — Pheasants Nest Bridge',
      alertDescription: 'Both spans 2-3 expansion joints failed. Water ingress onto pier caps causing concrete breakdown. Remediation required within 12 months.',
      severity:         'Warning',
      priority:         2,
      triggeredDate:    now,
      dueDate:          '2025-12-01',
      status:           'Open'
    })
    if (alerts.length > 0) {
      await db.run(INSERT.into('bridge.management.AlertsAndNotifications').entries(alerts))
      loaded += alerts.length
    }
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
    try {
      const result = await db.run(DELETE.from(entity).where({ bridge_ID: { in: bIDs } }))
      cleared += typeof result === 'number' ? result : (result?.affectedRows || 0)
    } catch (_) {}
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
  try { await deleteFrom('bridge.management.BridgeDocuments') } catch (_) {}
  try { await deleteFrom('bridge.management.BridgeMehComponents') } catch (_) {}
  try { await deleteFrom('bridge.management.BridgeContacts') } catch (_) {}
  try { await deleteFrom('bridge.management.BridgeCarriageways') } catch (_) {}

  try {
    const result = await db.run(
      DELETE.from('bridge.management.Bridges').where({ ID: { in: bIDs } })
    )
    cleared += typeof result === 'number' ? result : bIDs.length
  } catch (_) {}

  return cleared
}

module.exports = { activateDemoData, clearDemoData }
