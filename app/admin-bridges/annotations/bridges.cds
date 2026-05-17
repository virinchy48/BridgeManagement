using { AdminService } from '../../../srv/admin-service';
using from '../../common';

////////////////////////////////////////////////////////////////////////////
//  List Report — Bridges
////////////////////////////////////////////////////////////////////////////

annotate AdminService.Bridges with @(
  UI.HeaderInfo: {
    TypeName      : 'Bridge',
    TypeNamePlural: 'Bridges',
    Title         : { $Type: 'UI.DataField', Value: bridgeName },
    Description   : { $Type: 'UI.DataField', Value: bridgeId }
  },
  UI.SelectionFields: [
    bridgeId, bridgeName, state, region,
    condition, postingStatus, status,
    highPriorityAsset, assetClass
  ],
  UI.LineItem: [
    { Value: bridgeId,           Label: 'Bridge ID' },
    { Value: bridgeName,         Label: 'Bridge Name' },
    { Value: state,              Label: 'State' },
    { Value: region,             Label: 'Region' },
    { Value: condition,          Label: 'Condition' },
    { $Type: 'UI.DataFieldForAnnotation', Target: '@UI.DataPoint#ConditionRating', Label: 'Condition Rating' },
    { Value: postingStatus,      Label: 'Posting Status' },
    { Value: status,             Label: 'Status' },
    { Value: lastInspectionDate, Label: 'Last Inspected' },
    { Value: highPriorityAsset,  Label: 'High Priority' },
    { Value: nextInspectionDue,  Label: 'Next Inspection Due' },
    { Value: managingAuthority,  Label: 'Managing Authority' }
  ]
);

////////////////////////////////////////////////////////////////////////////
//  Object Page — Bridges
////////////////////////////////////////////////////////////////////////////

annotate AdminService.Bridges with @(
  Capabilities.InsertRestrictions.Insertable  : true,
  Capabilities.UpdateRestrictions.Updatable   : true,
  Capabilities.DeleteRestrictions.Deletable   : false,
  UI: {
    CreateHidden: false,
    UpdateHidden: false,
    DeleteHidden: true,

    // ── ObjectPage Dynamic Header — KPI chips ───────────────────────────────
    DataPoint#ConditionRating: {
      Value: conditionRating,
      Title: 'Condition Rating',
      CriticalityCalculation: {
        ImprovementDirection: #Maximize,
        ToleranceRangeLowValue:  8,
        DeviationRangeLowValue:  5
      }
    },
    DataPoint#BSI: {
      Value: bsiScore,
      Title: 'Bridge Sufficiency Index',
      CriticalityCalculation: {
        ImprovementDirection: #Maximize,
        ToleranceRangeLowValue:  50,
        DeviationRangeLowValue:  25
      }
    },
    DataPoint#BHI: {
      Value: bhi,
      Title: 'Bridge Health Index (BHI)',
      CriticalityCalculation: {
        ImprovementDirection: #Maximize,
        ToleranceRangeLowValue:  50,
        DeviationRangeLowValue:  30
      }
    },
    DataPoint#NBI: {
      Value: nbi,
      Title: 'National Bridge Index (NBI)',
      CriticalityCalculation: {
        ImprovementDirection: #Maximize,
        ToleranceRangeLowValue:  50,
        DeviationRangeLowValue:  30
      }
    },
    DataPoint#PostingStatus: {
      Value: postingStatus,
      Title: 'Posting Status',
      Criticality: postingStatusCriticality
    },
    DataPoint#LastInspection: {
      Value: lastInspectionDate,
      Title: 'Last Inspected'
    },
    DataPoint#ActiveRestrictions: {
      Value: activeRestrictionCount,
      Title: 'Active Restrictions',
      Criticality: { $edmJson: { $If: [{ $Gt: [{ $Path: 'activeRestrictionCount' }, 0] }, 2, 3] } }
    },
    HeaderFacets: [
      { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#ConditionRating',   Label: 'Condition' },
      { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#BSI', Label: 'BSI Score' },
      { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#PostingStatus',      Label: 'Status' },
      { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#ActiveRestrictions', Label: 'Restrictions' },
      { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#LastInspection',     Label: 'Last Inspected' },
      { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#HeaderAssessor',    Label: 'Assessor' },
    ],
    FieldGroup#HeaderAssessor: {
      Data: [
        { $Type: 'UI.DataField', Value: conditionAssessor, Label: 'Last Inspector' },
        { $Type: 'UI.DataField', Value: conditionTrend,    Label: 'Trend' }
      ]
    },

    Facets: [
      // ── T1: Executive Summary ─────────────────────────────────────────────
      // Narrative + editable manager-set fields only — header KPI chips already
      // show conditionRating / postingStatus / BSI / restrictions / lastInspected
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Executive Summary',
        ID    : 'ExecutiveSummary',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Bridge Narrative',  Target: '@UI.FieldGroup#ExecutiveOverview'},
          {$Type: 'UI.ReferenceFacet', Label: 'Current Status',    Target: '@UI.FieldGroup#CurrentStatus'},
        ]
      },
      // ── T2: Location & Ownership ─────────────────────────────────────────
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Location & Ownership',
        ID    : 'BridgeIdentity',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Geographic Location', Target: '@UI.FieldGroup#GeoLocation'},
          {$Type: 'UI.ReferenceFacet', Label: 'Ownership',           Target: '@UI.FieldGroup#Ownership'},
        ]
      },
      // ── T3: Physical Structure ────────────────────────────────────────────
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Physical Structure',
        ID    : 'PhysicalStructure',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Structure',            Target: '@UI.FieldGroup#Structure'},
          {$Type: 'UI.ReferenceFacet', Label: 'Dimensions',           Target: '@UI.FieldGroup#Dimensions'},
          {$Type: 'UI.ReferenceFacet', Label: 'Environmental Context', Target: '@UI.FieldGroup#SiteContext'},
        ]
      },
      // ── T4: Inspection Status ─────────────────────────────────────────────
      // "Current Condition" = read-only snapshot updated by New Inspection workflow
      // "Inspection Schedule" = editable bridge-level manager config
      // "Environmental & Risk Flags" = editable bridge-level attributes only
      // "Inspection History" = live sub-table of BridgeInspections for this bridge
      // Scour risk/depth live exclusively in the BridgeScourAssessments tile
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Inspection Status',
        ID    : 'ConditionInspection',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Current Condition',          Target: '@UI.FieldGroup#LastInspectionResults'},
          {$Type: 'UI.ReferenceFacet', Label: 'Environmental & Risk Flags', Target: '@UI.FieldGroup#EnvRisk'},
          {$Type: 'UI.ReferenceFacet', Label: 'Inspection Schedule',        Target: '@UI.FieldGroup#InspectionConfig'},
          {$Type: 'UI.ReferenceFacet', Label: 'Inspection History',         Target: 'inspections/@UI.LineItem'},
        ]
      },
      // ── T5: Traffic & NHVR ───────────────────────────────────────────────
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Traffic & NHVR',
        ID    : 'TrafficNHVR',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Traffic Data',         Target: '@UI.FieldGroup#TrafficData'},
          {$Type: 'UI.ReferenceFacet', Label: 'Route Classification',  Target: '@UI.FieldGroup#RouteClass'},
          {$Type: 'UI.ReferenceFacet', Label: 'NHVR Approvals',       Target: '@UI.FieldGroup#NHVRApprovals'},
          {$Type: 'UI.ReferenceFacet', Label: 'Posting & Gazette',    Target: '@UI.FieldGroup#PostingGazette'},
          {$Type: 'UI.ReferenceFacet', Label: 'Closure',              Target: '@UI.FieldGroup#Closure'},
        ]
      },
      // ── T6: External System References ───────────────────────────────────
      {
        $Type : 'UI.CollectionFacet',
        Label : 'External Systems',
        ID    : 'ExternalSystems',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'NHVR Portal',       Target: '@UI.FieldGroup#ExtNHVR'},
          {$Type: 'UI.ReferenceFacet', Label: 'BNAC Integration',  Target: '@UI.FieldGroup#ExtBNAC'},
        ]
      },
      // ── T7: Administration ────────────────────────────────────────────────
      // Bridge Geometry (GeoJSON) removed — raw coordinate fields are in Location & Ownership;
      // the Map section provides the visual; geoJson blob is import-only, not user-editable.
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Administration',
        ID    : 'Administration',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Source & Reference',  Target: '@UI.FieldGroup#SourceInfo'},
          {$Type: 'UI.ReferenceFacet', Label: 'System Information',  Target: '@UI.FieldGroup#AuditTrail'},
        ]
      },
    ],

    // ── FieldGroups ─────────────────────────────────────────────────────────

    // ── T1: Executive Summary ────────────────────────────────────────────────
    // Header KPI chips already show conditionRating/BSI/postingStatus/restrictions/lastInspected
    // T1 focuses on the narrative and manager-set status signals only
    FieldGroup#ExecutiveOverview: {
      Label: 'Bridge Narrative',
      Data: [
        {Value: assetClass,        Label: 'Asset Class'},
        {Value: importanceLevel,   Label: 'Importance Level (1=Critical–4=Ordinary)'},
        {Value: highPriorityAsset, Label: 'High Priority Asset'},
        {Value: bhi,               Label: 'Bridge Health Index (BHI)'},
        {Value: nbi,               Label: 'National Bridge Index (NBI)'},
        {Value: descr,             Label: 'Executive Summary / Description'},
      ]
    },
    FieldGroup#CurrentStatus: {
      Label: 'Current Status',
      Data: [
        {Value: nextInspectionDue,     Label: 'Next Inspection Due'},
        {Value: postingStatus,         Label: 'Posting Status'},
        {Value: postingStatusReason,   Label: 'Posting Status Reason'},
        {Value: operationalStatusCode, Label: 'Operational Status Code'},
      ]
    },

    // ── T2: Location & Ownership ─────────────────────────────────────────────
    // AssetIdentity sub-group removed — bridgeId/bridgeName already in ObjectPage title
    FieldGroup#GeoLocation: {
      Label: 'Geographic Location',
      Data: [
        {Value: route,        Label: 'Route'},
        {Value: routeNumber,  Label: 'Route Number'},
        {Value: state,        Label: 'State'},
        {Value: region,       Label: 'Region'},
        {Value: lga,          Label: 'Local Government Area (LGA)'},
        {Value: precinct,     Label: 'Precinct / Zone'},
        {Value: locality,     Label: 'Locality / Suburb'},
        {Value: location,     Label: 'Location Description (free text)'},
        {Value: latitude,     Label: 'Latitude (decimal degrees)'},
        {Value: longitude,    Label: 'Longitude (decimal degrees)'},
      ]
    },
    FieldGroup#Ownership: {
      Label: 'Ownership',
      Data: [
        {Value: assetOwner,        Label: 'Legal Owner'},
        {Value: managingAuthority, Label: 'Maintaining Authority'},
        {Value: status,            Label: 'Asset Status'},
      ]
    },

    // ── T3: Physical Structure ────────────────────────────────────────────────
    FieldGroup#Structure: {
      Label: 'Structure',
      Data: [
        {Value: designLoad,              Label: 'Design Load (AS 5100 class)'},
        {Value: designStandard,          Label: 'Design Standard'},
        {Value: structureType,           Label: 'Structure Type'},
        {Value: material,                Label: 'Construction Material'},
        {Value: yearBuilt,               Label: 'Year Built'},
        {Value: seismicZone,             Label: 'Seismic Zone'},
        {Value: structuralDeficiencyCode, Label: 'Structural Deficiency Code'},
      ]
    },
    FieldGroup#Dimensions: {
      Label: 'Dimensions',
      Data: [
        {Value: clearanceHeight, Label: 'Clearance Height (m)'},
        {Value: numberOfLanes,   Label: 'Number of Lanes (no.)'},
        {Value: deckWidth,       Label: 'Deck Width (m)'},
        {Value: spanCount,       Label: 'Span Count (no.)'},
        {Value: spanLength,      Label: 'Span Length (m)'},
        {Value: totalLength,     Label: 'Total Length (m)'},
      ]
    },
    // Environmental Context = former Site Context + spansOver/facilityTypeCode from T2
    FieldGroup#SiteContext: {
      Label: 'Environmental Context',
      Data: [
        {Value: spansOver,        Label: 'Spans Over (crossing)'},
        {Value: waterwayType,     Label: 'Waterway Type'},
        {Value: facilityTypeCode, Label: 'Facility Type'},
        {Value: surfaceType,      Label: 'Road Surface Type'},
        {Value: substructureType, Label: 'Substructure Type (e.g. Abutment, Pier)'},
        {Value: foundationType,   Label: 'Foundation Type (e.g. Pile, Spread Footing)'},
      ]
    },

    // ── T4: Condition & Inspection ────────────────────────────────────────────
    // IMPORTANT: "Last Inspection Results" fields are READ-ONLY here.
    // They are populated exclusively by the "Inspect Now" (CaptureCondition) workflow.
    // @Core.Computed annotations applied via field-level annotate block below.
    FieldGroup#LastInspectionResults: {
      Label: 'Current Condition',
      Data: [
        {Value: conditionRating,          Label: 'Condition Rating (1–10)'},
        {Value: condition,                Label: 'Condition Grade'},
        {Value: conditionTrend,           Label: 'Condition Trend'},
        {Value: conditionSummary,         Label: 'Condition Summary'},
        {Value: structuralAdequacy,       Label: 'Structural Adequacy'},
        {Value: structuralAdequacyRating, Label: 'Structural Adequacy Rating (1–10)'},
        {Value: conditionAssessor,        Label: 'Assessor / Inspector'},
        {Value: lastInspectionDate,       Label: 'Date of Last Inspection'},
        {Value: conditionReportRef,       Label: 'Condition Report Reference'},
        {Value: conditionNotes,           Label: 'Condition Notes'},
      ]
    },
    // scourRisk + scourDepthLastMeasured removed — authoritative source is BridgeScourAssessments tile
    FieldGroup#EnvRisk: {
      Label: 'Environmental & Risk Flags',
      Data: [
        {Value: floodImmunityAriYears,  Label: 'Flood Immunity ARI (years)'},
        {Value: floodImpacted,          Label: 'Flood Impacted'},
        {Value: deficiencyComments,     Label: 'Deficiency Comments'},
        {Value: remarks,                Label: 'Field Remarks'},
      ]
    },
    // Editable — manager-set inspection schedule configuration
    FieldGroup#InspectionConfig: {
      Label: 'Inspection Schedule',
      Data: [
        {Value: inspectionType,           Label: 'Required Inspection Type'},
        {Value: inspectionFrequencyYears, Label: 'Inspection Frequency (years)'},
        {Value: nextInspectionDue,        Label: 'Next Inspection Due'},
        {Value: conditionStandard,        Label: 'Condition Rating Standard'},
      ]
    },

    // ── T5: Traffic & NHVR ────────────────────────────────────────────────────
    FieldGroup#TrafficData: {
      Label: 'Traffic Data',
      Data: [
        {Value: loadLimitTruck,        Label: 'Truck Load Limit (t)'},
        {Value: loadLimitSemitrailer,  Label: 'Semi-Trailer Load Limit (t)'},
        {Value: averageDailyTraffic,   Label: 'Average Daily Traffic (vehicles/day)'},
        {Value: heavyVehiclePercent,   Label: 'Heavy Vehicle Proportion (%)'},
      ]
    },
    // hmlApproved moved here from RouteClass to sit next to its date fields
    FieldGroup#RouteClass: {
      Label: 'Route Classification',
      Data: [
        {Value: loadRating,      Label: 'Published Load Rating (t)'},
        {Value: freightRoute,    Label: 'Freight Route'},
        {Value: overMassRoute,   Label: 'Over Mass Route'},
        {Value: bDoubleApproved, Label: 'B-Double Approved (Performance-Based Standards)'},
      ]
    },
    FieldGroup#NHVRApprovals: {
      Label: 'NHVR Approvals',
      Data: [
        {Value: nhvrAssessed,       Label: 'NHVR Assessed'},
        {Value: nhvrAssessmentDate, Label: 'NHVR Assessment Date'},
        {Value: pbsApprovalClass,   Label: 'PBS Approval Class (Performance-Based Standards)'},
        {Value: pbsApprovalDate,    Label: 'PBS Approval Date'},
        {Value: pbsApprovalExpiry,  Label: 'PBS Approval Expiry'},
        {Value: hmlApproved,        Label: 'HML Approved (Higher Mass Limits)'},
        {Value: hmlApprovalDate,    Label: 'HML Approval Date'},
        {Value: hmlApprovalExpiry,  Label: 'HML Approval Expiry'},
      ]
    },
    // Split from GazetteLegal — Posting + gazette publication details
    FieldGroup#PostingGazette: {
      Label: 'Posting & Gazette',
      Data: [
        {Value: postingStatus,        Label: 'Posting Status'},
        {Value: postingStatusReason,  Label: 'Posting Status Reason'},
        {Value: gazetteReference,     Label: 'Gazette Reference Number'},
        {Value: gazetteEffectiveDate, Label: 'Gazette Effective Date'},
        {Value: gazetteExpiryDate,    Label: 'Gazette Expiry Date'},
      ]
    },
    // Closure status — derived from active closure-type Restrictions (read-only snapshot)
    FieldGroup#Closure: {
      Label: 'Closure Status',
      Data: [
        {Value: postingStatus,       Label: 'Posting Status'},
        {Value: activeClosureCount,  Label: 'Active Closure Restrictions'},
        {Value: postingStatusReason, Label: 'Status Reason'},
      ]
    },

    // ── T6: External System References ───────────────────────────────────────
    FieldGroup#ExtNHVR: {
      Label: 'NHVR Portal',
      Data: [
        {Value: nhvrReferenceUrl, Label: 'NHVR Portal Reference URL'},
      ]
    },
    FieldGroup#ExtBNAC: {
      Label: 'BNAC Integration',
      Data: [
        {$Type: 'UI.DataFieldWithUrl', Label: 'BNAC Deep Link',
         Value: bnacMapping.bnacObjectId, Url: bnacMapping.bnacUrl},
      ]
    },

    // ── T8: Administration ────────────────────────────────────────────────────
    FieldGroup#SourceInfo: {
      Label: 'Source & Reference',
      Data: [
        {Value: maintenanceClass,         Label: 'Maintenance Class'},
        {Value: lifecycleStage,           Label: 'Lifecycle Stage'},
        {Value: dataSource,               Label: 'Data Source'},
        {Value: sourceReferenceUrl,       Label: 'Source Reference URL'},
        {Value: openDataReference,        Label: 'Open Data Reference'},
        {Value: sourceRecordId,           Label: 'Source Record ID'},
        {Value: asBuiltDrawingReference,  Label: 'As-Built Drawing Reference'},
      ]
    },
    FieldGroup#AuditTrail: {
      Label: 'System Information — read only',
      Data: [
        {Value: createdBy,  Label: 'Created By'},
        {Value: createdAt,  Label: 'Created At'},
        {Value: modifiedBy, Label: 'Last Modified By'},
        {Value: modifiedAt, Label: 'Last Modified At'},
      ]
    },
    // ── ObjectPage Header Actions ─────────────────────────────────────────
    Identification: [
      {
        $Type       : 'UI.DataFieldForAction',
        Action      : 'AdminService.deactivate',
        Label       : 'Deactivate',
        Criticality : #Negative,
        ![@UI.Hidden]: { $edmJson: { $Or: [
          { $Eq: [{ $Path: 'status' }, 'Inactive'] },
          { $Not: { $Path: 'IsActiveEntity' } }
        ] } }
      },
      {
        $Type       : 'UI.DataFieldForAction',
        Action      : 'AdminService.reactivate',
        Label       : 'Reactivate',
        Criticality : #Positive,
        ![@UI.Hidden]: { $edmJson: { $Or: [
          { $Ne: [{ $Path: 'status' }, 'Inactive'] },
          { $Not: { $Path: 'IsActiveEntity' } }
        ] } }
      }
    ]
  }
);

////////////////////////////////////////////////////////////////////////////
//  Field-level annotations — Bridges
////////////////////////////////////////////////////////////////////////////

annotate AdminService.Bridges with {
  // System-managed — never editable
  ID         @Core.Computed;
  createdBy  @Core.Computed  @title: 'Created By';
  createdAt  @Core.Computed  @title: 'Created At';
  modifiedBy @Core.Computed  @title: 'Last Modified By';
  modifiedAt @Core.Computed  @title: 'Last Modified At';
  // Bridge status is managed exclusively by Deactivate / Reactivate actions
  status     @Common.FieldControl: #ReadOnly  @title: 'Bridge Status';
  // GeoJSON is maintained on the object page, not in the create dialog
  geoJson    @UI.Hidden  @title: 'Bridge Geometry (GeoJSON)';  // import-only; not surfaced in UI
  // Bridge ID auto-generated on create; never user-entered
  bridgeId   @Core.Computed  @Common.FieldControl: #ReadOnly  @title: 'Bridge ID (auto-generated)';
};

annotate AdminService.Bridges with {
  // Mandatory fields
  bridgeName   @Common.FieldControl: #Mandatory  @title: 'Bridge Name';
  state @(
    Common.FieldControl: #Mandatory,
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'States', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: state, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'State';
  assetOwner   @Common.FieldControl: #Mandatory  @title: 'Asset Owner';
  latitude     @Common.FieldControl: #Mandatory  @assert.range: [-44, -10]   @title: 'Latitude (°)'   @Common.QuickInfo: 'GDA2020 decimal degrees — valid Australian range: -44 to -10';
  longitude    @Common.FieldControl: #Mandatory  @assert.range: [112, 154]   @title: 'Longitude (°)'  @Common.QuickInfo: 'GDA2020 decimal degrees — valid Australian range: 112 to 154';
  postingStatus @(
    Common.FieldControl: #Mandatory,
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'PostingStatuses', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: postingStatus, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Posting Status'
    @Common.QuickInfo: 'Auto-computed from active Restrictions — set closure-type Restrictions in the Restrictions tile to change this status';
  conditionRating @Common.FieldControl: #ReadOnly  @title: 'Condition Rating (1–10)'  @Common.QuickInfo: 'Set by Inspect Now workflow — not directly editable';

  // Value lists
  assetClass @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'AssetClasses', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: assetClass, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Asset Class';
  region @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'Regions', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: region, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Region';
  structureType @(
    Common.FieldControl: #Mandatory,
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'StructureTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: structureType, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Structure Type';
  designLoad @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'DesignLoads', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: designLoad, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Design Load';
  condition @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'ConditionStates', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: condition, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Condition State';
  // scourRisk is set by the BridgeScourAssessments workflow — read-only on the Bridge form
  scourRisk @(
    Common.FieldControl: #ReadOnly,
    Common.QuickInfo: 'Derived from the latest BridgeScourAssessment — edit via the Scour Assessments tile',
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'ScourRiskLevels', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: scourRisk, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Scour Risk Level';
  pbsApprovalClass @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'PbsApprovalClasses', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: pbsApprovalClass, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'PBS Approval Class'  @Common.FieldControl: #ReadOnly  @Common.QuickInfo: 'Maintained via NHVR Route Assessments tile';

  // Restriction value help
  restriction @(Common: {
    Label    : 'Linked Restriction',
    ValueList: {
      CollectionPath: 'Restrictions',
      Parameters    : [
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' },
        { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: restriction_ID, ValueListProperty: 'ID' }
      ],
    }
  });

  // All remaining field labels
  managingAuthority      @title: 'Managing Authority';
  lga                    @title: 'Local Government Area (LGA)';
  location               @title: 'Location Description';
  route                  @title: 'Route';
  routeNumber            @title: 'Route Number';
  descr                  @title: 'Description'  @UI.MultiLineText;
  material               @title: 'Material';
  yearBuilt              @title: 'Year Built';
  designStandard         @title: 'Design Standard';
  clearanceHeight        @title: 'Clearance Height (m)';
  spanLength             @title: 'Span Length (m)';
  totalLength            @title: 'Total Length (m)';
  deckWidth              @title: 'Deck Width (m)';
  spanCount              @title: 'Number of Spans';
  numberOfLanes          @title: 'Number of Lanes';
  conditionStandard      @title: 'Condition Rating Standard';
  structuralAdequacyRating @title: 'Structural Adequacy Rating (1–10)';
  lastInspectionDate     @Common.FieldControl: #ReadOnly  @title: 'Last Inspection Date'  @Common.QuickInfo: 'Set by Inspect Now workflow — not directly editable';
  highPriorityAsset      @title: 'High Priority Asset';
  asBuiltDrawingReference @title: 'As-Built Drawing Reference';
  seismicZone            @title: 'Seismic Zone';
  scourDepthLastMeasured @title: 'Scour Depth Last Measured (m)';
  floodImmunityAriYears  @title: 'Flood Immunity (ARI years)';
  floodImpacted          @title: 'Flood Impacted';
  remarks                @title: 'Remarks'  @UI.MultiLineText;
  loadRating             @title: 'Load Rating (t)';
  importanceLevel        @title: 'Importance Level (1–4)';
  averageDailyTraffic    @title: 'Average Daily Traffic (ADT)';
  heavyVehiclePercent    @title: 'Heavy Vehicle Percentage (%)';
  freightRoute           @title: 'Freight Route';
  overMassRoute          @title: 'Over Mass Route';
  hmlApproved            @Common.FieldControl: #ReadOnly  @title: 'HML Approved'           @Common.QuickInfo: 'Maintained via NHVR Route Assessments tile';
  bDoubleApproved        @title: 'B-Double Approved';
  nhvrAssessed           @Common.FieldControl: #ReadOnly  @title: 'NHVR Assessed'          @Common.QuickInfo: 'Maintained via NHVR Route Assessments tile';
  nhvrAssessmentDate     @Common.FieldControl: #ReadOnly  @title: 'NHVR Assessment Date'   @Common.QuickInfo: 'Maintained via NHVR Route Assessments tile';
  gazetteReference       @title: 'Gazette Reference';
  nhvrReferenceUrl       @title: 'NHVR Reference URL'  @UI.IsURL;
  dataSource             @title: 'Data Source';
  sourceReferenceUrl     @title: 'Source Reference URL';
  openDataReference      @title: 'Open Data Reference';
  sourceRecordId         @title: 'Source Record ID';
  conditionSummary @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'ConditionSummaries', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: conditionSummary, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Condition Summary';
  conditionAssessor      @title: 'Assessed By';
  conditionReportRef     @title: 'Report Reference';
  structuralAdequacy @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'StructuralAdequacyTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: structuralAdequacy, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Structural Adequacy';
  conditionNotes         @title: 'Condition Notes'  @UI.MultiLineText;

  // ── Inspection Scheduling (TfNSW-BIM §4.1–4.2) ──────────────────────────
  inspectionType @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'InspectionTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: inspectionType, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Inspection Type';
  inspectionFrequencyYears @title: 'Inspection Frequency (years)';
  nextInspectionDue        @title: 'Next Inspection Due'           @Common.QuickInfo: 'TfNSW-BIM §4.2 — maximum 5-year interval';
  conditionTrend @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'ConditionTrends', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: conditionTrend, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Condition Trend';

  // ── Physical Characteristics — Site Context ──────────────────────────────
  surfaceType @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'SurfaceTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: surfaceType, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Deck Surface Type';
  substructureType @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'SubstructureTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: substructureType, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Substructure Type';
  foundationType @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'FoundationTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: foundationType, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Foundation Type'  @Common.QuickInfo: 'AS 5100.7 §6.2.5 — critical for scour risk assessment';
  waterwayType @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'WaterwayTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: waterwayType, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Waterway Type'  @Common.QuickInfo: 'Austroads AP-G71.8 §3.1 — determines scour risk methodology';

  // ── NHVR Approval Dates (NHVR-HVNL §§100–104) ───────────────────────────
  pbsApprovalDate    @Common.FieldControl: #ReadOnly  @title: 'PBS Approval Date'    @Common.QuickInfo: 'Maintained via NHVR Route Assessments tile';
  pbsApprovalExpiry  @Common.FieldControl: #ReadOnly  @title: 'PBS Approval Expiry'  @Common.QuickInfo: 'Alert generated 30/60/90 days before expiry — maintained via NHVR Route Assessments tile';
  hmlApprovalDate    @Common.FieldControl: #ReadOnly  @title: 'HML Approval Date'    @Common.QuickInfo: 'Maintained via NHVR Route Assessments tile';
  hmlApprovalExpiry  @Common.FieldControl: #ReadOnly  @title: 'HML Approval Expiry'  @Common.QuickInfo: 'Alert generated 30/60/90 days before expiry — maintained via NHVR Route Assessments tile';

  // ── Gazette & Legal (Roads Act 1993 NSW §§121–124) ───────────────────────
  gazetteEffectiveDate  @title: 'Gazette Effective Date'  @Common.QuickInfo: 'Date gazette order came into effect — Roads Act 1993 §122';
  gazetteExpiryDate     @title: 'Gazette Expiry Date'     @Common.QuickInfo: 'Drives renewal alerts 90/60/30 days before expiry';
  postingStatusReason   @title: 'Posting Status Reason'
    @Common.QuickInfo: 'Free-text annotation — your note about WHY this bridge is posted/closed. The Posting Status itself is auto-computed from active Restrictions; this field is your manual context note and is not auto-cleared when status changes.';
  activeClosureCount    @title: 'Active Closure Restrictions'  @Common.FieldControl: #ReadOnly  @Common.QuickInfo: 'Count of current active closure-type Restrictions for this bridge — auto-computed';
  maintenanceClass      @title: 'Maintenance Class';
  lifecycleStage        @title: 'Lifecycle Stage';
};

// ── Inspection workflow output fields — READ ONLY ──────────────────────────
// These fields are exclusively populated by the "Inspect Now" / CaptureCondition
// workflow action. Making them read-only here prevents managers bypassing the
// inspection record lifecycle by directly patching Bridge fields.
annotate AdminService.Bridges with {
  condition                @Common.FieldControl: #ReadOnly  @Common.QuickInfo: 'Derived from conditionRating via Inspect Now workflow';
  conditionTrend           @Common.FieldControl: #ReadOnly  @Common.QuickInfo: 'Set by Inspect Now workflow — not directly editable';
  conditionSummary         @Common.FieldControl: #ReadOnly  @Common.QuickInfo: 'Set by Inspect Now workflow — not directly editable';
  structuralAdequacy       @Common.FieldControl: #ReadOnly  @Common.QuickInfo: 'Set by Inspect Now workflow — not directly editable';
  structuralAdequacyRating @Common.FieldControl: #ReadOnly  @Common.QuickInfo: 'Set by Inspect Now workflow — not directly editable';
  conditionAssessor        @Common.FieldControl: #ReadOnly  @Common.QuickInfo: 'Recorded by Inspect Now workflow';
  conditionReportRef       @Common.FieldControl: #ReadOnly  @Common.QuickInfo: 'Linked to inspection record — set by Inspect Now workflow';
  conditionNotes           @Common.FieldControl: #ReadOnly  @Common.QuickInfo: 'Recorded by Inspect Now workflow';
};

// Virtual fields are internal — hide from all form layouts
annotate AdminService.Bridges with {
  postingStatusCriticality @UI.Hidden;
  activeRestrictionCount   @UI.Hidden;
};

annotate AdminService.Bridges with {
  bsiScore         @UI.Hidden;
  bsiWidthRating   @UI.Hidden;
  bsiBarrierRating @UI.Hidden;
  bsiRouteAltRating @UI.Hidden;
};

annotate AdminService.Bridges with actions {
  deactivate @Common.SideEffects: { TargetProperties: ['status'] };
  reactivate @Common.SideEffects: { TargetProperties: ['status'] };
};

