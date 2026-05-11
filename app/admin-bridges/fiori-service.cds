using { AdminService } from '../../srv/admin-service';
using from '../common';

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
    { Value: highPriorityAsset,  Label: 'High Priority' }
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
      // "Current Condition" = read-only snapshot set by Inspect Now workflow
      // "Inspection Schedule" = editable bridge-level manager config
      // "Environmental & Risk Flags" = editable bridge-level attributes only
      // Scour risk/depth live exclusively in the BridgeScourAssessments tile
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Inspection Status',
        ID    : 'ConditionInspection',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Current Condition',          Target: '@UI.FieldGroup#LastInspectionResults'},
          {$Type: 'UI.ReferenceFacet', Label: 'Environmental & Risk Flags', Target: '@UI.FieldGroup#EnvRisk'},
          {$Type: 'UI.ReferenceFacet', Label: 'Inspection Schedule',        Target: '@UI.FieldGroup#InspectionConfig'},
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
      // ── T6: Custom Attributes ─────────────────────────────────────────────
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Custom Attributes',
        ID    : 'CustomAttributes',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Attributes', Target: 'attributes/@UI.LineItem'},
        ]
      },
      // ── T7: Administration ────────────────────────────────────────────────
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Administration',
        ID    : 'Administration',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Source & Reference',  Target: '@UI.FieldGroup#SourceInfo'},
          {$Type: 'UI.ReferenceFacet', Label: 'System Information',  Target: '@UI.FieldGroup#AuditTrail'},
          {$Type: 'UI.ReferenceFacet', Label: 'Bridge Geometry',     Target: '@UI.FieldGroup#BridgeGeometry'},
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
        {Value: assetClass,       Label: 'Asset Class'},
        {Value: highPriorityAsset, Label: 'High Priority Asset'},
        {Value: descr,             Label: 'Executive Summary / Description'},
      ]
    },
    FieldGroup#CurrentStatus: {
      Label: 'Current Status',
      Data: [
        {Value: conditionTrend,        Label: 'Condition Trend'},
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
        {Value: importanceLevel,       Label: 'Bridge Importance Level (1=Critical–4=Ordinary)'},
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
        {Value: nhvrReferenceUrl,   Label: 'NHVR Reference URL'},
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
    // Operational closure events (separate from standing gazette/posting)
    FieldGroup#Closure: {
      Label: 'Closure',
      Data: [
        {Value: closureDate,    Label: 'Closure From'},
        {Value: closureEndDate, Label: 'Closure To'},
        {Value: closureReason,  Label: 'Closure Reason'},
      ]
    },

    // ── T7: Administration ────────────────────────────────────────────────────
    FieldGroup#SourceInfo: {
      Label: 'Source & Reference',
      Data: [
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
    FieldGroup#BridgeGeometry: {
      Label: 'Bridge Geometry (GeoJSON)',
      Data: [
        {Value: geoJson, Label: 'GeoJSON Geometry'},
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
  geoJson    @Common.FieldControl: #Optional  @UI.MultiLineText  @title: 'Bridge Geometry (GeoJSON)';
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
  latitude     @Common.FieldControl: #Mandatory  @title: 'Latitude (°)'  @Common.QuickInfo: 'Valid range: -90 to 90';
  longitude    @Common.FieldControl: #Mandatory  @title: 'Longitude (°)'  @Common.QuickInfo: 'Valid range: -180 to 180';
  postingStatus @(
    Common.FieldControl: #Mandatory,
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'PostingStatuses', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: postingStatus, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Posting Status';
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
  ) @title: 'PBS Approval Class';

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
  hmlApproved            @title: 'HML Approved';
  bDoubleApproved        @title: 'B-Double Approved';
  nhvrAssessed           @title: 'NHVR Assessed';
  nhvrAssessmentDate     @title: 'NHVR Assessment Date';
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
  pbsApprovalDate    @title: 'PBS Approval Date';
  pbsApprovalExpiry  @title: 'PBS Approval Expiry'  @Common.QuickInfo: 'Alert generated 30/60/90 days before expiry';
  hmlApprovalDate    @title: 'HML Approval Date';
  hmlApprovalExpiry  @title: 'HML Approval Expiry'  @Common.QuickInfo: 'Alert generated 30/60/90 days before expiry';

  // ── Gazette & Legal (Roads Act 1993 NSW §§121–124) ───────────────────────
  gazetteEffectiveDate  @title: 'Gazette Effective Date'  @Common.QuickInfo: 'Date gazette order came into effect — Roads Act 1993 §122';
  gazetteExpiryDate     @title: 'Gazette Expiry Date'     @Common.QuickInfo: 'Drives renewal alerts 90/60/30 days before expiry';
  postingStatusReason   @title: 'Posting Status Reason';
  closureDate           @title: 'Closure Date';
  closureEndDate        @title: 'Expected Reopening Date';
  closureReason         @title: 'Closure Reason'  @UI.MultiLineText;
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

// Hide the ID on the Restrictions VH so it doesn't appear as a column
annotate AdminService.Restrictions with {
  ID @UI.Hidden;
};

////////////////////////////////////////////////////////////////////////////
//  BridgeRestrictions — sub-entity on Bridge ObjectPage
////////////////////////////////////////////////////////////////////////////

annotate AdminService.BridgeRestrictions with {
  ID    @UI.Hidden;
  bridge @(
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    title                  : 'Bridge',
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',      LocalDataProperty: bridge_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeId' }
      ]
    }
  );
  createdAt @UI.Hidden;  createdBy @UI.Hidden;  modifiedAt @UI.Hidden;  modifiedBy @UI.Hidden;
  // Auto-generated (BR-NNNN); never user-entered
  restrictionRef        @Core.Computed  @Common.FieldControl: #ReadOnly  @title: 'Reference (auto-generated)';
  // Mandatory classification fields
  restrictionCategory @(
    Common.FieldControl: #Mandatory,
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'RestrictionCategories', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: restrictionCategory, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Category';
  restrictionType @(
    Common.FieldControl: #Mandatory,
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'RestrictionTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: restrictionType, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Restriction Type';
  restrictionValue      @Common.FieldControl: #Mandatory  @title: 'Value';
  restrictionUnit @(
    Common.FieldControl: #Mandatory,
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'RestrictionUnits', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: restrictionUnit, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Unit';
  // Status — auto-defaulted to Active on create; managed by Deactivate / Reactivate actions thereafter
  restrictionStatus @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'RestrictionStatuses', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: restrictionStatus, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Status';
  // Active flag — read-only; controlled by Deactivate / Reactivate actions only
  active                @Common.FieldControl: #ReadOnly  @title: 'Active';
  // temporary boolean auto-derived from category — not shown in form
  temporary             @UI.Hidden;
  appliesToVehicleClass @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'VehicleClasses', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: appliesToVehicleClass, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Applies to Vehicle Class';
  direction @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'RestrictionDirections', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: direction, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Direction';
  effectiveFrom         @Common.FieldControl: #Mandatory  @title: 'Effective From';
  effectiveTo           @title: 'Effective To';
  grossMassLimit        @title: 'Gross Mass Limit (t)';
  axleMassLimit         @title: 'Axle Mass Limit (t)';
  heightLimit           @title: 'Height Limit (m)';
  widthLimit            @title: 'Width Limit (m)';
  lengthLimit           @title: 'Length Limit (m)';
  speedLimit            @title: 'Speed Limit (km/h)';
  permitRequired        @title: 'Permit Required';
  escortRequired        @title: 'Escort Required';
  approvedBy            @title: 'Approved By';
  approvalReference     @title: 'Approval Reference';
  legalReference        @title: 'Gazette / Legal Reference';
  issuingAuthority      @title: 'Issuing Authority';
  enforcementAuthority  @title: 'Enforcement Authority';
  temporaryFrom         @title: 'Temporary From';
  temporaryTo           @title: 'Temporary To';
  temporaryReason       @title: 'Temporary Reason'  @UI.MultiLineText;
  remarks               @title: 'Remarks'  @UI.MultiLineText;
  name                  @UI.Hidden;
  descr                 @UI.Hidden;
  // ── AS 1742.10 Sign Management ────────────────────────────────────────────
  postingSignId         @title: 'Posting Sign ID'       @Common.QuickInfo: 'AS 1742.10 sign reference number';
  // ── Gazette & Load Limit Order (Roads Act 1993 NSW §§121–124) ────────────
  gazetteNumber         @title: 'Gazette Number'        @Common.QuickInfo: 'NSW Gazette order number (Roads Act 1993 §122)';
  gazettePublicationDate @title: 'Gazette Published';
  gazetteExpiryDate     @title: 'Gazette Expiry'        @Common.QuickInfo: 'Alert generated 90/60/30 days before expiry';
  loadLimitOrderRef     @title: 'Load Limit Order Ref'  @Common.QuickInfo: 'Roads Act 1993 LLO reference (e.g. LLO-2024-001)';
  loadLimitOrderDate    @title: 'LLO Issued Date';
  loadLimitOrderExpiry  @title: 'LLO Expiry Date';
  // ── NHVR Escort requirements ──────────────────────────────────────────────
  pilotVehicleCount     @title: 'Pilot Vehicle Count';
};

annotate AdminService.BridgeRestrictions with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  // Deletable kept true so draft-mode rows can be removed; server blocks delete on committed records
  Capabilities.DeleteRestrictions.Deletable  : true,
  UI: {
    HeaderInfo: {
      TypeName      : 'Bridge Restriction',
      TypeNamePlural: 'Bridge Restrictions',
      Title         : { $Type: 'UI.DataField', Value: restrictionType },
      Description   : { $Type: 'UI.DataField', Value: restrictionRef }
    },
    // ── Inline table actions — deactivate / reactivate committed restriction rows ──
    Identification: [
      {
        $Type       : 'UI.DataFieldForAction',
        Action      : 'AdminService.deactivate',
        Label       : 'Retire (Soft-Delete)',
        Criticality : #Negative,
        ![@UI.Hidden]: { $edmJson: { $Or: [
          { $Eq: [{ $Path: 'active' }, false] },
          { $Not: { $Path: 'IsActiveEntity' } }
        ] } }
      },
      {
        $Type       : 'UI.DataFieldForAction',
        Action      : 'AdminService.reactivate',
        Label       : 'Reactivate',
        Criticality : #Positive,
        ![@UI.Hidden]: { $edmJson: { $Or: [
          { $Ne: [{ $Path: 'active' }, false] },
          { $Not: { $Path: 'IsActiveEntity' } }
        ] } }
      }
    ],
    LineItem: [
      {Value: bridge.bridgeId,       Label: 'Bridge ID'},
      {Value: bridge.bridgeName,     Label: 'Bridge'},
      {Value: restrictionRef,        Label: 'Reference'},
      {Value: restrictionCategory,   Label: 'Category'},
      {Value: restrictionType,       Label: 'Type'},
      {Value: restrictionValue,      Label: 'Value'},
      {Value: restrictionUnit,       Label: 'Unit'},
      {Value: restrictionStatus,     Label: 'Status'},
      {Value: appliesToVehicleClass, Label: 'Vehicle Class'},
      {Value: permitRequired,        Label: 'Permit Req.'},
      {Value: effectiveFrom,         Label: 'From'},
      {Value: effectiveTo,           Label: 'To'},
      {Value: active,                Label: 'Active'},
      // Inline Retire / Reactivate action buttons per row
      {
        $Type       : 'UI.DataFieldForAction',
        Action      : 'AdminService.BridgeRestrictions/AdminService.deactivate',
        Label       : 'Retire',
        Criticality : #Negative,
        Inline      : true,
        ![@UI.Hidden]: { $edmJson: { $Or: [
          { $Eq: [{ $Path: 'active' }, false] },
          { $Not: { $Path: 'IsActiveEntity' } }
        ] } }
      },
      {
        $Type       : 'UI.DataFieldForAction',
        Action      : 'AdminService.BridgeRestrictions/AdminService.reactivate',
        Label       : 'Reactivate',
        Criticality : #Positive,
        Inline      : true,
        ![@UI.Hidden]: { $edmJson: { $Or: [
          { $Ne: [{ $Path: 'active' }, false] },
          { $Not: { $Path: 'IsActiveEntity' } }
        ] } }
      },
    ],
    Facets: [
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Classification',
        ID    : 'BRClassification',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Restriction Details', Target: '@UI.FieldGroup#BRDetails'},
          {$Type: 'UI.ReferenceFacet', Label: 'Applicability',       Target: '@UI.FieldGroup#BRApplicability'},
        ]
      },
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Physical Limits',
        ID    : 'BRPhysicalLimits',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Mass Limits (t)',    Target: '@UI.FieldGroup#BRMassLimits'},
          {$Type: 'UI.ReferenceFacet', Label: 'Dimensional Limits', Target: '@UI.FieldGroup#BRDimLimits'},
        ]
      },
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Validity & Approval',
        ID    : 'BRValidity',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Effective Period',    Target: '@UI.FieldGroup#BREffective'},
          {$Type: 'UI.ReferenceFacet', Label: 'Temporary Condition', Target: '@UI.FieldGroup#BRTemporary'},
          {$Type: 'UI.ReferenceFacet', Label: 'Approval & Legal',    Target: '@UI.FieldGroup#BRApproval'},
          {$Type: 'UI.ReferenceFacet', Label: 'Gazette & LLO',       Target: '@UI.FieldGroup#BRGazette'},
          {$Type: 'UI.ReferenceFacet', Label: 'Signage (AS 1742.10)', Target: '@UI.FieldGroup#BRSignage'},
          {$Type: 'UI.ReferenceFacet', Label: 'Enforcement',         Target: '@UI.FieldGroup#BREnforcement'},
        ]
      },
    ],
    FieldGroup#BRDetails: {
      Data: [
        {Value: bridge_ID,          Label: 'Bridge'},
        {Value: restrictionRef},    // auto-generated BR-NNNN
        {Value: restrictionCategory},
        {Value: restrictionType},
        {Value: restrictionValue},
        {Value: restrictionUnit},
        {Value: restrictionStatus},
        {Value: active},            // read-only — use Retire / Reactivate buttons
      ]
    },
    FieldGroup#BRApplicability: {
      Data: [
        {Value: appliesToVehicleClass},
        {Value: direction},
        {Value: permitRequired},
        {Value: escortRequired},
        // 'temporary' boolean auto-derived from restrictionCategory — not shown in form
      ]
    },
    FieldGroup#BRMassLimits: {
      Data: [
        {Value: grossMassLimit},
        {Value: axleMassLimit},
      ]
    },
    FieldGroup#BRDimLimits: {
      Data: [
        {Value: heightLimit},
        {Value: widthLimit},
        {Value: lengthLimit},
        {Value: speedLimit},
      ]
    },
    FieldGroup#BREffective: {
      Data: [
        {Value: effectiveFrom},   // mandatory — see field annotation
        {Value: effectiveTo},
      ]
    },
    // Temporary-only fields — hidden when restrictionCategory != 'Temporary'
    FieldGroup#BRTemporary: {
      Data: [
        {
          $Type : 'UI.DataField',
          Value : temporaryFrom,
          ![@UI.Hidden]: { $edmJson: { $Ne: [{ $Path: 'restrictionCategory' }, 'Temporary'] } }
        },
        {
          $Type : 'UI.DataField',
          Value : temporaryTo,
          ![@UI.Hidden]: { $edmJson: { $Ne: [{ $Path: 'restrictionCategory' }, 'Temporary'] } }
        },
        {
          $Type : 'UI.DataField',
          Value : temporaryReason,
          ![@UI.Hidden]: { $edmJson: { $Ne: [{ $Path: 'restrictionCategory' }, 'Temporary'] } }
        },
      ]
    },
    FieldGroup#BRApproval: {
      Data: [
        {Value: approvedBy},
        {Value: approvalReference},
        {Value: legalReference},
        {Value: issuingAuthority},
        {Value: pilotVehicleCount},
      ]
    },
    // Gazette & Load Limit Order — Roads Act 1993 NSW §§121–124
    FieldGroup#BRGazette: {
      Data: [
        {Value: gazetteNumber},
        {Value: gazettePublicationDate},
        {Value: gazetteExpiryDate},
        {Value: loadLimitOrderRef},
        {Value: loadLimitOrderDate},
        {Value: loadLimitOrderExpiry},
      ]
    },
    // Signage — AS 1742.10
    FieldGroup#BRSignage: {
      Data: [
        {Value: postingSignId},
      ]
    },
    FieldGroup#BREnforcement: {
      Data: [
        {Value: enforcementAuthority},
        {Value: remarks},
      ]
    },
  }
);

////////////////////////////////////////////////////////////////////////////
//  BridgeCapacities — sub-entity on Bridge ObjectPage
////////////////////////////////////////////////////////////////////////////

annotate AdminService.BridgeCapacities with {
  ID         @UI.Hidden;
  bridge @(
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    title                  : 'Bridge',
    Common.FieldControl    : #Mandatory,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',      LocalDataProperty: bridge_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeId' }
      ]
    }
  );
  createdAt  @UI.Hidden;  createdBy  @UI.Hidden;  modifiedAt @UI.Hidden;  modifiedBy @UI.Hidden;
  capacityType          @Common.FieldControl: #Mandatory  @title: 'Capacity Type';
  grossMassLimit        @Common.FieldControl: #Mandatory  @title: 'Gross Mass Limit (t)';
  grossCombined         @title: 'Gross Combined (t)';
  steerAxleLimit        @title: 'Steer Axle (t)';
  singleAxleLimit       @title: 'Single Axle (t)';
  tandemGroupLimit      @title: 'Tandem Axle Group (t)';
  triAxleGroupLimit     @title: 'Tri-Axle Group (t)';
  minClearancePosted    @Common.FieldControl: #Mandatory  @title: 'Min Clearance (posted)';
  lane1Clearance        @title: 'Lane 1 Clearance (m)';
  lane2Clearance        @title: 'Lane 2 Clearance (m)';
  clearanceSurveyDate   @title: 'Survey Date';
  clearanceSurveyMethod @title: 'Survey Method';
  carriagewayWidth      @title: 'Carriageway Width (m)';
  trafficableWidth      @title: 'Trafficable Width (m)';
  laneWidth             @title: 'Lane Width (m)';
  ratingStandard        @title: 'Standard';
  ratingFactor          @title: 'Rating Factor (RF)';
  ratingEngineer        @title: 'Rating Engineer (NER/CPEng)';
  ratingDate            @title: 'Rating Date';
  nextReviewDue         @title: 'Next Review Due';
  reportReference       @title: 'Report Reference';
  scourCriticalDepth    @title: 'Scour Critical Depth (m)';
  currentScourDepth     @title: 'Current Scour Depth (m)';
  floodClosureLevel     @title: 'Flood Closure Level (m AHD)';
  designLife            @title: 'Design Life (years)';
  consumedLife          @title: 'Consumed Life (%)';
  fatigueSensitive      @title: 'Fatigue-Sensitive';
  criticalElement       @title: 'Critical Element';
  effectiveFrom    @title: 'Effective From'
                   @Common.QuickInfo: 'Date this rating came into regulatory force (gazette/order date)'
                   @Common.FieldControl: #Mandatory;
  effectiveTo      @title: 'Effective To'
                   @Common.QuickInfo: 'Date this rating was superseded — blank means currently operative'
                   @Common.FieldControl: #ReadOnly;
  supersessionReason @title: 'Supersession Reason'
                   @Common.FieldControl: #ReadOnly;
  capacityStatus @(
    Common.FieldControl: #ReadOnly,
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'CapacityStatuses', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: capacityStatus, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Status';
  lastReviewedBy   @title: 'Last Reviewed By';
  statusReviewDue  @title: 'Next Review Due';
  engineeringNotes @UI.MultiLineText  @title: 'Engineering Notes';
  fatigueDetailCategory @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'FatigueDetailCategories', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: fatigueDetailCategory, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Fatigue Detail Category'  @Common.QuickInfo: 'AS 5100.6 §13.5 — A (best) to G (worst)';
};

annotate AdminService.BridgeCapacities with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : true,
  UI.SelectionFields: [bridge_ID, capacityType, capacityStatus, effectiveFrom, nextReviewDue],
  UI: {
    HeaderInfo: {
      TypeName      : 'Bridge Capacity',
      TypeNamePlural: 'Bridge Capacities',
      Title         : { $Type: 'UI.DataField', Value: capacityType },
      Description   : { $Type: 'UI.DataField', Value: effectiveFrom }
    },
    LineItem: [
      {Value: bridge.bridgeId,    Label: 'Bridge ID'},
      {Value: bridge.bridgeName,  Label: 'Bridge'},
      {Value: capacityType,       Label: 'Capacity Type'},
      {Value: effectiveFrom,      Label: 'Effective From'},
      {Value: effectiveTo,        Label: 'Effective To'},
      {Value: grossMassLimit,     Label: 'GVM (t)'},
      {Value: grossCombined,      Label: 'GCM (t)'},
      {Value: minClearancePosted, Label: 'Min Clearance (m)'},
      {Value: ratingFactor,       Label: 'RF'},
      {Value: capacityStatus,     Label: 'Status'},
    ],
    Facets: [
      {
        $Type : 'UI.CollectionFacet',
        Label : 'General',
        ID    : 'CapGeneral',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Capacity Type', Target: '@UI.FieldGroup#CapacityGeneral'},
        ]
      },
      {$Type: 'UI.ReferenceFacet', Label: 'Mass Limits (tonnes)', Target: '@UI.FieldGroup#CapacityMassLimits'},
      {$Type: 'UI.ReferenceFacet', Label: 'Vertical Clearance (metres)', Target: '@UI.FieldGroup#CapacityVerticalClearance'},
      {$Type: 'UI.ReferenceFacet', Label: 'Horizontal Geometry (metres)', Target: '@UI.FieldGroup#CapacityHorizontalGeometry'},
      {$Type: 'UI.ReferenceFacet', Label: 'Load Rating (AS 5100.7)', Target: '@UI.FieldGroup#CapacityLoadRating'},
      {$Type: 'UI.ReferenceFacet', Label: 'Scour Assessment', Target: '@UI.FieldGroup#CapacityScour'},
      {$Type: 'UI.ReferenceFacet', Label: 'Fatigue Life', Target: '@UI.FieldGroup#CapacityFatigue'},
      {$Type: 'UI.ReferenceFacet', Label: 'Validity Period', Target: '@UI.FieldGroup#CapacityValidity'},
      {$Type: 'UI.ReferenceFacet', Label: 'Capacity Status', Target: '@UI.FieldGroup#CapacityStatus'},
      {$Type: 'UI.ReferenceFacet', Label: 'Engineering Notes', Target: '@UI.FieldGroup#CapacityEngineeringNotes'},
    ],
    FieldGroup#CapacityGeneral: {
      Data: [
        {Value: bridge_ID,   Label: 'Bridge'},
        {Value: capacityType},
      ]
    },
    FieldGroup#CapacityMassLimits: {
      Data: [
        {Value: grossMassLimit},
        {Value: grossCombined},
        {Value: steerAxleLimit},
        {Value: singleAxleLimit},
        {Value: tandemGroupLimit},
        {Value: triAxleGroupLimit},
      ]
    },
    FieldGroup#CapacityVerticalClearance: {
      Data: [
        {Value: minClearancePosted},
        {Value: lane1Clearance},
        {Value: lane2Clearance},
        {Value: clearanceSurveyDate},
        {Value: clearanceSurveyMethod},
      ]
    },
    FieldGroup#CapacityHorizontalGeometry: {
      Data: [
        {Value: carriagewayWidth},
        {Value: trafficableWidth},
        {Value: laneWidth},
      ]
    },
    FieldGroup#CapacityLoadRating: {
      Data: [
        {Value: ratingStandard},
        {Value: ratingFactor},
        {Value: ratingEngineer},
        {Value: ratingDate},
        {Value: nextReviewDue},
        {Value: reportReference},
      ]
    },
    FieldGroup#CapacityScour: {
      Data: [
        {Value: scourCriticalDepth},
        {Value: currentScourDepth},
        {Value: floodClosureLevel},
      ]
    },
    FieldGroup#CapacityFatigue: {
      Data: [
        {Value: designLife},
        {Value: consumedLife},
        {Value: fatigueSensitive},
        {Value: fatigueDetailCategory},
        {Value: criticalElement},
      ]
    },
    FieldGroup#CapacityValidity: {
      Label: 'Validity Period',
      Data: [
        {Value: effectiveFrom,      Label: 'Effective From'},
        {Value: effectiveTo,        Label: 'Effective To'},
        {Value: ratingDate,         Label: 'Rating Date'},
        {Value: nextReviewDue,      Label: 'Next Review Due'},
        {Value: supersessionReason, Label: 'Supersession Reason'},
      ]
    },
    FieldGroup#CapacityStatus: {
      Data: [
        {Value: capacityStatus,  Label: 'Status'},
        {Value: lastReviewedBy,  Label: 'Reviewed By'},
        {Value: statusReviewDue, Label: 'Status Review Due'},
      ]
    },
    FieldGroup#CapacityEngineeringNotes: {
      Data: [
        {Value: engineeringNotes},
      ]
    },
  }
);

////////////////////////////////////////////////////////////////////////////
//  BridgeScourAssessments — sub-entity on Bridge ObjectPage
////////////////////////////////////////////////////////////////////////////

// ── BridgeScourAssessments — expert council redesign ─────────────────────
// Inspector priority: scour risk + measured depth first
// Manager priority: next review date prominent
// Data Steward: assessor accreditation, report reference mandatory
annotate AdminService.BridgeScourAssessments with {
  ID         @UI.Hidden;
  createdAt  @UI.Hidden;  createdBy  @UI.Hidden;
  modifiedAt @UI.Hidden;  modifiedBy @UI.Hidden;
  bridge @(
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    title                  : 'Bridge',
    Common.FieldControl    : #Mandatory,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',         LocalDataProperty: bridge_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeId' }
      ]
    }
  );
  assessmentDate        @Common.FieldControl: #Mandatory  @title: 'Assessment Date';
  assessmentType        @Common.FieldControl: #Mandatory  @title: 'Assessment Type'  @Common.QuickInfo: 'Austroads AP-G71.8 §3.1 — Routine, Detailed, or Special';
  scourRisk @(
    Common.FieldControl: #Mandatory,
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'ScourRiskLevels', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: scourRisk, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Scour Risk Level';
  measuredDepth         @title: 'Measured Scour Depth (m)'    @Common.QuickInfo: 'Depth of scour measured at bridge foundations (m)';
  floodImmunityAriYears @title: 'Flood Immunity (ARI years)'  @Common.QuickInfo: 'Average Recurrence Interval — used for design verification';
  mitigationStatus      @title: 'Mitigation Status';
  assessor              @Common.FieldControl: #Mandatory  @title: 'Assessor Name';
  inspectorAccreditationLevel @title: 'Assessor Accreditation Level'  @Common.QuickInfo: 'TfNSW-BIM §3.1 — Level 1 (visual) to Level 4 (principal)';
  nextReviewDate        @title: 'Next Review Date';
  reportReference       @title: 'Report Reference';
  waterwayType @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'WaterwayTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: waterwayType, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Waterway Type'  @Common.QuickInfo: 'Austroads AP-G71.8 §3.1 — determines scour risk methodology';
  foundationType @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'FoundationTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: foundationType, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Foundation Type'  @Common.QuickInfo: 'AS 5100.7 §6.2.5 — critical for scour vulnerability';
  scourCountermeasureType      @title: 'Countermeasure Type'       @Common.QuickInfo: 'Austroads AP-G71.8 §7.3 — e.g. rock riprap, concrete apron';
  scourCountermeasureCondition @title: 'Countermeasure Condition'  @Common.QuickInfo: 'Good / Fair / Poor / Failed';
  remarks                      @title: 'Remarks'  @UI.MultiLineText;
};

annotate AdminService.BridgeScourAssessments with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.SelectionFields: [bridge_ID, scourRisk, assessmentType, nextReviewDate, mitigationStatus],
  UI: {
    HeaderInfo: {
      TypeName      : 'Scour Assessment',
      TypeNamePlural: 'Scour Assessments',
      Title         : { Value: assessmentDate },
      Description   : { Value: assessmentType }
    },
    LineItem: [
      {Value: bridge.bridgeId,              Label: 'Bridge ID'},
      {Value: bridge.bridgeName,            Label: 'Bridge'},
      {Value: assessmentDate,               Label: 'Date'},
      {Value: assessmentType,               Label: 'Type'},
      {Value: scourRisk,                    Label: 'Scour Risk'},
      {Value: measuredDepth,                Label: 'Depth (m)'},
      {Value: waterwayType,                 Label: 'Waterway'},
      {Value: foundationType,               Label: 'Foundation'},
      {Value: scourCountermeasureType,      Label: 'Countermeasure'},
      {Value: scourCountermeasureCondition, Label: 'CM Condition'},
      {Value: mitigationStatus,             Label: 'Mitigation'},
      {Value: nextReviewDate,               Label: 'Next Review'},
    ],
    Facets: [
      {
        $Type : 'UI.CollectionFacet', Label: 'Scour Assessment', ID: 'ScourDetails',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Assessment',      Target: '@UI.FieldGroup#ScourAssessment'},
          {$Type: 'UI.ReferenceFacet', Label: 'Measurements',    Target: '@UI.FieldGroup#ScourMeasurements'},
          {$Type: 'UI.ReferenceFacet', Label: 'Countermeasures', Target: '@UI.FieldGroup#ScourCountermeasures'},
          {$Type: 'UI.ReferenceFacet', Label: 'Personnel',       Target: '@UI.FieldGroup#ScourPersonnel'},
        ]
      },
    ],
    FieldGroup#ScourAssessment: {
      Label: 'Assessment',
      Data: [
        {Value: bridge_ID,            Label: 'Bridge'},
        {Value: assessmentDate,       Label: 'Assessment Date'},
        {Value: assessmentType,       Label: 'Assessment Type'},
        {Value: scourRisk,            Label: 'Scour Risk Level'},
        {Value: waterwayType,         Label: 'Waterway Type'},
        {Value: foundationType,       Label: 'Foundation Type'},
        {Value: nextReviewDate,       Label: 'Next Review Date'},
        {Value: reportReference,      Label: 'Report Reference'},
      ]
    },
    FieldGroup#ScourMeasurements: {
      Label: 'Measurements',
      Data: [
        {Value: measuredDepth,         Label: 'Measured Scour Depth (m)'},
        {Value: floodImmunityAriYears, Label: 'Flood Immunity (ARI years)'},
        {Value: mitigationStatus,      Label: 'Mitigation Status'},
      ]
    },
    FieldGroup#ScourCountermeasures: {
      Label: 'Countermeasures (Austroads AP-G71.8)',
      Data: [
        {Value: scourCountermeasureType,      Label: 'Countermeasure Type'},
        {Value: scourCountermeasureCondition, Label: 'Countermeasure Condition'},
        {Value: remarks,                      Label: 'Remarks'},
      ]
    },
    FieldGroup#ScourPersonnel: {
      Label: 'Personnel & Accreditation',
      Data: [
        {Value: assessor,                    Label: 'Assessor Name'},
        {Value: inspectorAccreditationLevel, Label: 'Accreditation Level (TfNSW-BIM §3.1)'},
      ]
    },
  }
);

////////////////////////////////////////////////////////////////////////////
//  BridgeDocuments — managed via custom Attachments section (read-only OData)
////////////////////////////////////////////////////////////////////////////

annotate AdminService.BridgeDocuments with {
  ID         @UI.Hidden;
  bridge     @UI.Hidden;
  content    @UI.Hidden;  // blob served via /admin-bridges/api — never via OData
  createdAt  @UI.Hidden;  createdBy @UI.Hidden;  modifiedAt @UI.Hidden;  modifiedBy @UI.Hidden;
  title        @title: 'Title';
  documentType @title: 'Attachment Type';
  documentUrl  @title: 'External URL';
  documentDate @title: 'Attachment Date';
  fileName     @title: 'File Name';
  mediaType    @title: 'Media Type';
  fileSize     @title: 'File Size (bytes)';
  referenceNumber @title: 'Reference Number';
  issuedBy     @title: 'Issued By';
  expiryDate   @title: 'Expiry Date';
  remarks      @title: 'Remarks'  @UI.MultiLineText;
};

annotate AdminService.BridgeDocuments with @(
  Common.Label : 'Attachments',
  Capabilities.InsertRestrictions.Insertable : false,
  Capabilities.UpdateRestrictions.Updatable  : false,
  Capabilities.DeleteRestrictions.Deletable  : true,
  UI: {
    HeaderInfo: {
      TypeName      : 'Attachment',
      TypeNamePlural: 'Attachments',
      Title         : { Value: title },
      Description   : { Value: fileName }
    },
    LineItem: [
      {Value: title,           Label: 'Title'},
      {Value: fileName,        Label: 'File Name'},
      {Value: documentType,    Label: 'Type'},
      {Value: mediaType,       Label: 'Media Type'},
      {Value: fileSize,        Label: 'Size'},
      {Value: referenceNumber, Label: 'Reference'},
      {Value: documentDate,    Label: 'Date'},
      {Value: expiryDate,      Label: 'Expiry'},
    ],
    Facets: [
      {$Type: 'UI.ReferenceFacet', Label: 'Attachment Details', Target: '@UI.FieldGroup#AttachmentDetails'}
    ],
    FieldGroup#AttachmentDetails: {
      Data: [
        {Value: documentType},
        {Value: title},
        {Value: fileName},
        {Value: mediaType},
        {Value: fileSize},
        {Value: documentUrl},
        {Value: referenceNumber},
        {Value: issuedBy},
        {Value: documentDate},
        {Value: expiryDate},
        {Value: remarks},
      ]
    },
  }
);

////////////////////////////////////////////////////////////////////////////
//  BridgeAttributes — editable EAV sub-table on Bridge Details T6
////////////////////////////////////////////////////////////////////////////

annotate AdminService.BridgeAttributes with {
  ID            @UI.Hidden;
  bridge        @UI.Hidden;
  createdAt     @UI.Hidden;  createdBy @UI.Hidden;
  modifiedAt    @UI.Hidden;  modifiedBy @UI.Hidden;
  attributeGroup @title: 'Group';
  attributeName  @title: 'Attribute Name';
  attributeValue @title: 'Value';
  unit           @title: 'Unit';
  source         @title: 'Source';
  effectiveFrom  @title: 'Effective From';
  effectiveTo    @title: 'Effective To';
  remarks        @title: 'Remarks'  @UI.MultiLineText;
};

annotate AdminService.BridgeAttributes with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : true,
  UI.HeaderInfo: {
    TypeName      : 'Custom Attribute',
    TypeNamePlural: 'Custom Attributes',
    Title         : {Value: attributeName},
    Description   : {Value: attributeGroup},
  },
  UI.LineItem: [
    {Value: attributeGroup, Label: 'Group'},
    {Value: attributeName,  Label: 'Attribute'},
    {Value: attributeValue, Label: 'Value'},
    {Value: unit,           Label: 'Unit'},
    {Value: source,         Label: 'Source'},
    {Value: effectiveFrom,  Label: 'From'},
    {Value: effectiveTo,    Label: 'To'},
  ],
  UI.Facets: [
    { $Type: 'UI.CollectionFacet', Label: 'Attribute Detail', ID: 'AttrDetail', Facets: [
      { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#AttrGeneral' },
      { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#AttrValidity' },
    ]}
  ],
  UI.FieldGroup#AttrGeneral: {
    Label: 'Attribute',
    Data: [
      {Value: attributeGroup, Label: 'Group'},
      {Value: attributeName,  Label: 'Attribute Name'},
      {Value: attributeValue, Label: 'Value'},
      {Value: unit,           Label: 'Unit'},
      {Value: source,         Label: 'Source'},
      {Value: remarks,        Label: 'Remarks'},
    ]
  },
  UI.FieldGroup#AttrValidity: {
    Label: 'Validity',
    Data: [
      {Value: effectiveFrom, Label: 'Effective From'},
      {Value: effectiveTo,   Label: 'Effective To'},
    ]
  },
);

////////////////////////////////////////////////////////////////////////////
//  Validation constraints — numeric range & positive-value rules
////////////////////////////////////////////////////////////////////////////

annotate AdminService.Bridges with {
  inspectionFrequencyYears @assert.range: [1, 10]    @Common.QuickInfo: 'Valid range: 1 – 10 years';
  spanCount              @assert.range: [1, 500]     @Common.QuickInfo: 'Valid range: 1 – 500';
  numberOfLanes          @assert.range: [1, 20]      @Common.QuickInfo: 'Valid range: 1 – 20';
  spanLength             @assert.range: [0.1, 5000]  @Common.QuickInfo: 'Valid range: 0.1 – 5,000 m';
  totalLength            @assert.range: [0.1, 50000] @Common.QuickInfo: 'Valid range: 0.1 – 50,000 m';
  deckWidth              @assert.range: [0.5, 200]   @Common.QuickInfo: 'Valid range: 0.5 – 200 m';
  clearanceHeight        @assert.range: [0, 100]     @Common.QuickInfo: 'Valid range: 0 – 100 m';
  loadRating             @assert.range: [0, 10000]   @Common.QuickInfo: 'Valid range: 0 – 10,000 t';
  floodImmunityAriYears  @assert.range: [1, 10000]   @Common.QuickInfo: 'Valid range: 1 – 10,000 years';
  averageDailyTraffic    @assert.range: [0, 9999999] @Common.QuickInfo: 'Valid range: 0 – 9,999,999 vehicles/day';
  scourDepthLastMeasured @assert.range: [0, 500]     @Common.QuickInfo: 'Valid range: 0 – 500 m';
};

annotate AdminService.BridgeRestrictions with {
  pilotVehicleCount @assert.range: [0, 10] @Common.QuickInfo: 'Valid range: 0 – 10 escort vehicles';
  speedLimit     @assert.range: [0, 130]  @Common.QuickInfo: 'Valid range: 0 – 130 km/h';
  grossMassLimit @assert.range: [0, 1000] @Common.QuickInfo: 'Valid range: 0 – 1,000 t';
  axleMassLimit  @assert.range: [0, 500]  @Common.QuickInfo: 'Valid range: 0 – 500 t';
  heightLimit    @assert.range: [0, 30]   @Common.QuickInfo: 'Valid range: 0 – 30 m';
  widthLimit     @assert.range: [0, 100]  @Common.QuickInfo: 'Valid range: 0 – 100 m';
  lengthLimit    @assert.range: [0, 1000] @Common.QuickInfo: 'Valid range: 0 – 1,000 m';
};

annotate AdminService.BridgeCapacities with {
  grossMassLimit        @assert.range: [0, 2000]   @Common.QuickInfo: 'Valid range: 0 – 2,000 t';
  grossCombined         @assert.range: [0, 3000]   @Common.QuickInfo: 'Valid range: 0 – 3,000 t';
  steerAxleLimit        @assert.range: [0, 200]    @Common.QuickInfo: 'Valid range: 0 – 200 t';
  singleAxleLimit       @assert.range: [0, 200]    @Common.QuickInfo: 'Valid range: 0 – 200 t';
  tandemGroupLimit      @assert.range: [0, 200]    @Common.QuickInfo: 'Valid range: 0 – 200 t';
  triAxleGroupLimit     @assert.range: [0, 200]    @Common.QuickInfo: 'Valid range: 0 – 200 t';
  minClearancePosted    @assert.range: [0, 100]    @Common.QuickInfo: 'Valid range: 0 – 100 m';
  lane1Clearance        @assert.range: [0, 100]    @Common.QuickInfo: 'Valid range: 0 – 100 m';
  lane2Clearance        @assert.range: [0, 100]    @Common.QuickInfo: 'Valid range: 0 – 100 m';
  carriagewayWidth      @assert.range: [0, 200]    @Common.QuickInfo: 'Valid range: 0 – 200 m';
  trafficableWidth      @assert.range: [0, 200]    @Common.QuickInfo: 'Valid range: 0 – 200 m';
  laneWidth             @assert.range: [0, 50]     @Common.QuickInfo: 'Valid range: 0 – 50 m';
  ratingFactor          @assert.range: [0, 10]     @Common.QuickInfo: 'Valid range: 0 – 10';
  consumedLife          @assert.range: [0, 200]    @Common.QuickInfo: 'Valid range: 0 – 200%';
  designLife            @assert.range: [0, 200]    @Common.QuickInfo: 'Valid range: 0 – 200 years';
  floodClosureLevel     @assert.range: [0, 200]    @Common.QuickInfo: 'Valid range: 0 – 200 m AHD';
  scourCriticalDepth    @assert.range: [0, 500]    @Common.QuickInfo: 'Valid range: 0 – 500 m';
  currentScourDepth     @assert.range: [0, 500]    @Common.QuickInfo: 'Valid range: 0 – 500 m';
};

annotate AdminService.BridgeScourAssessments with {
  measuredDepth         @assert.range: [0, 500]   @Common.QuickInfo: 'Valid range: 0 – 500 m';
  floodImmunityAriYears @assert.range: [1, 10000] @Common.QuickInfo: 'Valid range: 1 – 10,000 years';
};

////////////////////////////////////////////////////////////////////////////
//  Draft — Bridges
////////////////////////////////////////////////////////////////////////////

annotate bridge.management.Bridges with @fiori.draft.enabled;
annotate AdminService.Bridges with @odata.draft.enabled;

// Standalone draft entities — each has its own draft root (not composition children of Bridges)
annotate bridge.management.BridgeInspections     with @fiori.draft.enabled;
annotate AdminService.BridgeInspections          with @odata.draft.enabled;
annotate bridge.management.BridgeCapacities      with @fiori.draft.enabled;
annotate AdminService.BridgeCapacities           with @odata.draft.enabled;
annotate bridge.management.BridgeRiskAssessments with @fiori.draft.enabled;
annotate AdminService.BridgeRiskAssessments      with @odata.draft.enabled;
annotate bridge.management.LoadRatingCertificates with @fiori.draft.enabled;
annotate AdminService.LoadRatingCertificates     with @odata.draft.enabled;
annotate bridge.management.NhvrRouteAssessments  with @fiori.draft.enabled;
annotate AdminService.NhvrRouteAssessments       with @odata.draft.enabled;
annotate bridge.management.BridgeConditionSurveys with @fiori.draft.enabled;
annotate AdminService.BridgeConditionSurveys     with @odata.draft.enabled;
annotate bridge.management.BridgeLoadRatings     with @fiori.draft.enabled;
annotate AdminService.BridgeLoadRatings          with @odata.draft.enabled;
annotate bridge.management.BridgePermits         with @fiori.draft.enabled;
annotate AdminService.BridgePermits              with @odata.draft.enabled;
annotate bridge.management.BridgeDefects         with @fiori.draft.enabled;
annotate AdminService.BridgeDefects              with @odata.draft.enabled;

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

////////////////////////////////////////////////////////////////////////////
//  Bridge Detail Redesign — New Entity UI Annotations (7-Section Architecture)
////////////////////////////////////////////////////////////////////////////

// ── BridgeInspections — standalone + Bridge Details Inspections tab ─────
annotate AdminService.BridgeInspections with {
  bridge @(
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    title                  : 'Bridge',
    Common.FieldControl    : #Mandatory,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',         LocalDataProperty: bridge_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeId' }
      ]
    }
  );
  inspectionRef                @title: 'Inspection Ref'  @Common.FieldControl: #ReadOnly;
  inspectionDate               @title: 'Inspection Date';
  inspectionType               @title: 'Inspection Type';
  inspector                    @title: 'Inspector';
  inspectorAccreditationNumber @title: 'Accreditation Number';
  inspectorAccreditationLevel  @title: 'Accreditation Level';
  inspectorCompany             @title: 'Inspector Company';
  qualificationExpiry          @title: 'Qualification Expiry';
  inspectionScope              @title: 'Inspection Scope';
  inspectionStandard           @title: 'Inspection Standard';
  weatherConditions            @title: 'Weather Conditions';
  accessibilityIssues          @title: 'Accessibility Issues';
  s4InspectionOrderRef         @title: 'S/4 Inspection Order';
  s4NotificationRef            @title: 'S/4 Notification';
  reportStorageRef             @title: 'Report Storage Reference';
  inspectionNotes              @title: 'Inspection Notes'  @UI.MultiLineText;
};

annotate AdminService.BridgeInspections with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.SelectionFields: [bridge_ID, inspectionType, inspectionDate, inspectionRef],
  UI.LineItem: [
    {Value: inspectionRef,          Label: 'Ref'},
    {Value: bridge.bridgeId,        Label: 'Bridge ID'},
    {Value: bridge.bridgeName,      Label: 'Bridge'},
    {Value: inspectionDate,         Label: 'Date'},
    {Value: inspectionType,         Label: 'Type'},
    {Value: inspector,              Label: 'Inspector'},
    {Value: inspectionStandard,     Label: 'Standard'},
    {Value: inspectionScope,        Label: 'Scope'},
    {Value: s4InspectionOrderRef,   Label: 'S/4 Order'},
    {Value: s4NotificationRef,      Label: 'S/4 Notification'},
  ],
  UI.HeaderInfo: {
    TypeName      : 'Inspection',
    TypeNamePlural: 'Inspections',
    Title         : {Value: inspectionRef},
    Description   : {Value: bridge.bridgeName},
  },
  UI.Facets: [
    {
      $Type : 'UI.CollectionFacet',
      Label : 'Inspection Details',
      ID    : 'InspectionDetails',
      Facets: [
        {$Type: 'UI.ReferenceFacet', Label: 'General',    Target: '@UI.FieldGroup#InspGeneral'},
        {$Type: 'UI.ReferenceFacet', Label: 'Inspector',  Target: '@UI.FieldGroup#InspInspector'},
        {$Type: 'UI.ReferenceFacet', Label: 'S/4HANA',    Target: '@UI.FieldGroup#InspS4Links'},
      ]
    },
  ],
  UI.FieldGroup#InspGeneral: {
    Label: 'General',
    Data: [
      {Value: bridge_ID,            Label: 'Bridge'},
      {Value: inspectionRef,        Label: 'Inspection Ref'},
      {Value: inspectionDate,       Label: 'Inspection Date'},
      {Value: inspectionType,       Label: 'Inspection Type'},
      {Value: inspectionStandard,   Label: 'Inspection Standard'},
      {Value: inspectionScope,      Label: 'Scope'},
      {Value: weatherConditions,    Label: 'Weather Conditions'},
      {Value: accessibilityIssues,  Label: 'Accessibility Issues'},
      {Value: inspectionNotes,      Label: 'Inspection Notes'},
    ]
  },
  UI.FieldGroup#InspInspector: {
    Label: 'Inspector',
    Data: [
      {Value: inspector,                    Label: 'Inspector'},
      {Value: inspectorAccreditationNumber, Label: 'Accreditation Number'},
      {Value: inspectorAccreditationLevel,  Label: 'Accreditation Level'},
      {Value: inspectorCompany,             Label: 'Inspector Company'},
      {Value: qualificationExpiry,          Label: 'Qualification Expiry'},
    ]
  },
  UI.FieldGroup#InspS4Links: {
    Label: 'S/4HANA Links',
    Data: [
      {Value: s4InspectionOrderRef, Label: 'S/4 Inspection Order'},
      {Value: s4NotificationRef,    Label: 'S/4 Notification'},
      {Value: reportStorageRef,     Label: 'Report Storage Reference'},
    ]
  },
);

// ── BridgeDefects — fully standalone; inspection link is optional ─────────
annotate AdminService.BridgeDefects with {
  bridge @(
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    title                  : 'Bridge',
    Common.FieldControl    : #Mandatory,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',         LocalDataProperty: bridge_ID,     ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeId' }
      ]
    }
  );
  inspection @(
    Common.Text            : inspection.inspectionRef,
    Common.TextArrangement : #TextOnly,
    title                  : 'Linked Inspection (optional)',
    Common.ValueList: {
      CollectionPath : 'BridgeInspections',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',         LocalDataProperty: inspection_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'inspectionRef' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'inspectionDate' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'inspectionType' }
      ]
    }
  );
  defectId                @title: 'Defect ID';
  defectType              @title: 'Defect Type';
  defectDescription       @title: 'Description'              @UI.MultiLineText;
  bridgeElement           @title: 'Bridge Element';
  spanNumber              @title: 'Span Number';
  pierNumber              @title: 'Pier Number';
  face                    @title: 'Face';
  position                @title: 'Position';
  severity                @title: 'Severity (1=Low, 4=Critical)';
  urgency                 @title: 'Urgency (1=Low, 4=Emergency)';
  dimensionLengthMm       @title: 'Length (mm)';
  dimensionWidthMm        @title: 'Width (mm)';
  dimensionDepthMm        @title: 'Depth (mm)';
  photoReferences         @title: 'Photo References'         @UI.MultiLineText;
  remediationStatus       @title: 'Remediation Status';
  estimatedRepairCost     @title: 'Estimated Repair Cost ($)';
  plannedRemediationDate  @title: 'Planned Remediation Date';
  actualRemediationDate   @title: 'Actual Remediation Date';
  remediationNotes        @title: 'Remediation Notes'        @UI.MultiLineText;
  s4NotificationId        @title: 'S/4 Notification ID';
  s4OrderId               @title: 'S/4 Order ID';
  s4SyncStatus            @title: 'S/4 Sync Status';
  notes                   @title: 'Notes'                    @UI.MultiLineText;
};
annotate AdminService.BridgeDefects with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.SelectionFields: [bridge_ID, inspection_ID, severity, remediationStatus, defectType],
  UI.LineItem: [
    {Value: bridge.bridgeId,           Label: 'Bridge ID'},
    {Value: bridge.bridgeName,         Label: 'Bridge'},
    {Value: inspection.inspectionRef,  Label: 'Inspection Ref'},
    {Value: defectId,                  Label: 'Defect ID'},
    {Value: defectType,                Label: 'Type'},
    {Value: bridgeElement,             Label: 'Element'},
    {Value: severity,                  Label: 'Severity (1–4)'},
    {Value: urgency,                   Label: 'Urgency (1–4)'},
    {Value: remediationStatus,         Label: 'Status'},
    {Value: estimatedRepairCost,       Label: 'Est. Cost ($)'},
    {Value: s4SyncStatus,              Label: 'S/4 Sync'},
  ],
  UI.HeaderInfo: {
    TypeName      : 'Defect',
    TypeNamePlural: 'Defects',
    Title         : {Value: defectId},
    Description   : {Value: defectType},
  },
  UI.Facets: [
    { $Type: 'UI.CollectionFacet', Label: 'Defect Details', ID: 'DefectDetails', Facets: [
      {$Type: 'UI.ReferenceFacet', Label: 'General',      Target: '@UI.FieldGroup#DefectGeneral'},
      {$Type: 'UI.ReferenceFacet', Label: 'Location',     Target: '@UI.FieldGroup#DefectLocation'},
      {$Type: 'UI.ReferenceFacet', Label: 'Remediation',  Target: '@UI.FieldGroup#DefectRemediation'},
    ]},
  ],
  UI.FieldGroup#DefectGeneral: {
    Label: 'General',
    Data: [
      {Value: bridge_ID,             Label: 'Bridge'},
      {Value: inspection_ID,         Label: 'Linked Inspection (optional)'},
      {Value: defectId,              Label: 'Defect ID'},
      {Value: defectType,            Label: 'Defect Type'},
      {Value: defectDescription,     Label: 'Description'},
      {Value: severity,              Label: 'Severity (1–4)'},
      {Value: urgency,               Label: 'Urgency (1–4)'},
      {Value: remediationStatus,     Label: 'Remediation Status'},
      {Value: photoReferences,       Label: 'Photo References'},
      {Value: notes,                 Label: 'Notes'},
    ]
  },
  UI.FieldGroup#DefectLocation: {
    Label: 'Location',
    Data: [
      {Value: bridgeElement,     Label: 'Bridge Element'},
      {Value: spanNumber,        Label: 'Span Number'},
      {Value: pierNumber,        Label: 'Pier Number'},
      {Value: face,              Label: 'Face'},
      {Value: position,          Label: 'Position'},
      {Value: dimensionLengthMm, Label: 'Length (mm)'},
      {Value: dimensionWidthMm,  Label: 'Width (mm)'},
      {Value: dimensionDepthMm,  Label: 'Depth (mm)'},
    ]
  },
  UI.FieldGroup#DefectRemediation: {
    Label: 'Remediation',
    Data: [
      {Value: estimatedRepairCost,    Label: 'Estimated Repair Cost'},
      {Value: plannedRemediationDate, Label: 'Planned Remediation Date'},
      {Value: actualRemediationDate,  Label: 'Actual Remediation Date'},
      {Value: remediationNotes,       Label: 'Remediation Notes'},
      {Value: s4NotificationId,       Label: 'S/4 Notification'},
      {Value: s4OrderId,              Label: 'S/4 Order'},
      {Value: s4SyncStatus,           Label: 'S/4 Sync Status'},
    ]
  },
);

// ── BridgeElements — expert council full treatment ────────────────────────
// Inspector priority: condition rating + trend first; maintenance flag prominent
// Manager: urgency level + estimated repair cost visible in list
// End User: elementId mandatory, mandatory fields clear
// Data Steward: rating date + next due date always populated
annotate AdminService.BridgeElements with {
  ID          @UI.Hidden;
  createdAt   @UI.Hidden;  createdBy   @UI.Hidden;
  modifiedAt  @UI.Hidden;  modifiedBy  @UI.Hidden;
  bridge @(
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    title                  : 'Bridge',
    Common.FieldControl    : #Mandatory,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',         LocalDataProperty: bridge_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeId' }
      ]
    }
  );
  elementId              @Common.FieldControl: #Mandatory  @title: 'Element ID'  @Common.QuickInfo: 'Unique element identifier (e.g. E001, SPAN-1-DECK)';
  elementType            @Common.FieldControl: #Mandatory  @title: 'Element Type'  @Common.QuickInfo: 'Structural class — e.g. Deck, Beam, Abutment, Pier';
  elementName            @Common.FieldControl: #Mandatory  @title: 'Element Name';
  spanNumber             @title: 'Span Number';
  pierNumber             @title: 'Pier Number';
  position               @title: 'Position / Location Description';
  currentConditionRating @title: 'Condition Rating (1–5)'  @Common.QuickInfo: '1=Good, 2=Satisfactory, 3=Fair, 4=Poor, 5=Failed — SIMS §4.3';
  conditionTrend         @title: 'Condition Trend'         @Common.QuickInfo: 'Improving / Stable / Deteriorating';
  conditionRatingDate    @title: 'Condition Rating Date';
  conditionRatingNotes   @title: 'Condition Rating Notes'  @UI.MultiLineText;
  lastRatedDate          @title: 'Last Rated Date';
  nextDueDate            @title: 'Next Rating Due';
  ratingFrequencyMonths  @title: 'Rating Frequency (months)';
  material               @title: 'Construction Material';
  yearConstructed        @title: 'Year Constructed';
  yearLastRehabbed       @title: 'Year Last Rehabilitated';
  maintenanceRequired    @title: 'Maintenance Required';
  urgencyLevel           @title: 'Urgency Level'  @Common.QuickInfo: 'Immediate / Short-term / Planned / Routine';
  estimatedRepairCost    @title: 'Estimated Repair Cost ($)';
  s4EquipmentNumber      @title: 'S/4HANA Equipment Number';
  notes                  @title: 'Notes'  @UI.MultiLineText;
};

annotate AdminService.BridgeElements with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.SelectionFields: [bridge_ID, elementType, currentConditionRating, maintenanceRequired, urgencyLevel],
  UI.HeaderInfo: {
    TypeName      : 'Bridge Element',
    TypeNamePlural: 'Bridge Elements',
    Title         : {Value: elementName},
    Description   : {Value: elementId},
  },
  UI.LineItem: [
    {Value: bridge.bridgeId,        Label: 'Bridge ID'},
    {Value: bridge.bridgeName,      Label: 'Bridge'},
    {Value: elementId,              Label: 'Element ID'},
    {Value: elementType,            Label: 'Type'},
    {Value: elementName,            Label: 'Name'},
    {Value: currentConditionRating, Label: 'Condition (1–5)'},
    {Value: conditionTrend,         Label: 'Trend'},
    {Value: maintenanceRequired,    Label: 'Maint. Req.'},
    {Value: urgencyLevel,           Label: 'Urgency'},
    {Value: estimatedRepairCost,    Label: 'Est. Repair ($)'},
    {Value: nextDueDate,            Label: 'Next Rating Due'},
    {Value: s4EquipmentNumber,      Label: 'S/4 Equipment'},
  ],
  UI.Facets: [
    {
      $Type : 'UI.CollectionFacet', Label: 'Element Details', ID: 'ElementDetails',
      Facets: [
        {$Type: 'UI.ReferenceFacet', Label: 'Identity & Location', Target: '@UI.FieldGroup#ElemIdentity'},
        {$Type: 'UI.ReferenceFacet', Label: 'Condition & Rating',  Target: '@UI.FieldGroup#ElemCondition'},
        {$Type: 'UI.ReferenceFacet', Label: 'Maintenance',         Target: '@UI.FieldGroup#ElemMaintenance'},
        {$Type: 'UI.ReferenceFacet', Label: 'Integration',         Target: '@UI.FieldGroup#ElemIntegration'},
      ]
    },
  ],
  UI.FieldGroup#ElemIdentity: {
    Label: 'Identity & Location',
    Data: [
      {Value: bridge_ID,         Label: 'Bridge'},
      {Value: elementId,         Label: 'Element ID'},
      {Value: elementType,       Label: 'Element Type'},
      {Value: elementName,       Label: 'Element Name'},
      {Value: material,          Label: 'Construction Material'},
      {Value: yearConstructed,   Label: 'Year Constructed'},
      {Value: yearLastRehabbed,  Label: 'Year Last Rehabilitated'},
      {Value: spanNumber,        Label: 'Span Number'},
      {Value: pierNumber,        Label: 'Pier Number'},
      {Value: position,          Label: 'Position / Location'},
    ]
  },
  UI.FieldGroup#ElemCondition: {
    Label: 'Condition & Rating (SIMS §4.3)',
    Data: [
      {Value: currentConditionRating, Label: 'Condition Rating (1–5)'},
      {Value: conditionTrend,         Label: 'Trend'},
      {Value: conditionRatingDate,    Label: 'Rating Date'},
      {Value: conditionRatingNotes,   Label: 'Rating Notes'},
      {Value: lastRatedDate,          Label: 'Last Rated Date'},
      {Value: nextDueDate,            Label: 'Next Rating Due'},
      {Value: ratingFrequencyMonths,  Label: 'Rating Frequency (months)'},
    ]
  },
  UI.FieldGroup#ElemMaintenance: {
    Label: 'Maintenance',
    Data: [
      {Value: maintenanceRequired,  Label: 'Maintenance Required'},
      {Value: urgencyLevel,         Label: 'Urgency Level'},
      {Value: estimatedRepairCost,  Label: 'Estimated Repair Cost ($)'},
      {Value: notes,                Label: 'Notes'},
    ]
  },
  UI.FieldGroup#ElemIntegration: {
    Label: 'S/4HANA Integration',
    Data: [
      {Value: s4EquipmentNumber, Label: 'S/4HANA Equipment Number'},
    ]
  },
);

// ── BridgeRiskAssessments — standalone + Bridge Details ─────────────────
annotate AdminService.BridgeRiskAssessments with {
  bridge @(
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    title                  : 'Bridge',
    Common.FieldControl    : #Mandatory,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',         LocalDataProperty: bridge_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeId' }
      ]
    }
  );
  assessmentId              @title: 'Assessment ID'                    @Common.FieldControl: #ReadOnly;
  assessmentDate            @title: 'Assessment Date';
  assessmentCycle           @title: 'Assessment Cycle';
  riskType                  @title: 'Risk Type';
  riskDescription           @title: 'Risk Description'                 @UI.MultiLineText;
  potentialConsequence      @title: 'Potential Consequence'            @UI.MultiLineText;
  likelihood                @title: 'Likelihood (1–5)';
  likelihoodJustification   @title: 'Likelihood Justification'         @UI.MultiLineText;
  consequence               @title: 'Consequence (1–5)';
  consequenceJustification  @title: 'Consequence Justification'        @UI.MultiLineText;
  inherentRiskScore         @title: 'Inherent Risk Score';
  inherentRiskLevel         @title: 'Inherent Risk Level';
  existingControls          @title: 'Existing Controls'                @UI.MultiLineText;
  controlEffectiveness      @title: 'Control Effectiveness';
  residualRiskScore         @title: 'Residual Risk Score';
  residualRiskLevel         @title: 'Residual Risk Level';
  residualRiskAcceptable    @title: 'Residual Risk Acceptable';
  riskTreatmentStrategy     @title: 'Treatment Strategy';
  treatmentActions          @title: 'Treatment Actions'                @UI.MultiLineText;
  treatmentResponsible      @title: 'Responsible Officer';
  treatmentDeadline         @title: 'Treatment Deadline';
  treatmentBudget           @title: 'Treatment Budget ($)';
  assessor                  @title: 'Assessor';
  assessorTitle             @title: 'Assessor Title';
  reviewDueDate             @title: 'Review Due Date';
  lastReviewDate            @title: 'Last Review Date';
  linkedInspectionId        @title: 'Linked Inspection';
  linkedDefectId            @title: 'Linked Defect';
  notes                     @title: 'Notes'                            @UI.MultiLineText;
};

annotate AdminService.BridgeRiskAssessments with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.SelectionFields: [bridge_ID, riskType, residualRiskLevel, treatmentDeadline],
  UI.LineItem: [
    {Value: bridge.bridgeId,    Label: 'Bridge ID'},
    {Value: bridge.bridgeName,  Label: 'Bridge'},
    {Value: assessmentDate,      Label: 'Date'},
    {Value: riskType,            Label: 'Risk Type'},
    {Value: riskDescription,     Label: 'Description'},
    {Value: inherentRiskLevel,   Label: 'Inherent Level'},
    {Value: residualRiskLevel,   Label: 'Residual Level'},
    {Value: residualRiskScore,   Label: 'Score'},
    {Value: treatmentDeadline,   Label: 'Treatment Due'},
    {Value: assessor,            Label: 'Assessor'},
  ],
  UI.HeaderInfo: {
    TypeName      : 'Risk Assessment',
    TypeNamePlural: 'Risk Assessments',
    Title         : {Value: riskType},
    Description   : {Value: residualRiskLevel},
  },
  UI.Facets: [
    { $Type: 'UI.CollectionFacet', Label: 'Risk Assessment', ID: 'RiskDetails', Facets: [
      {$Type: 'UI.ReferenceFacet', Label: 'Risk Overview',      Target: '@UI.FieldGroup#RiskOverview'},
      {$Type: 'UI.ReferenceFacet', Label: 'Risk Matrix',        Target: '@UI.FieldGroup#RiskMatrix'},
      {$Type: 'UI.ReferenceFacet', Label: 'Treatment',          Target: '@UI.FieldGroup#RiskTreatment'},
    ]},
  ],
  UI.FieldGroup#RiskOverview: {
    Label: 'Risk Overview',
    Data: [
      {Value: bridge_ID,        Label: 'Bridge'},
      {Value: assessmentId,     Label: 'Assessment ID'},
      {Value: assessmentDate,   Label: 'Assessment Date'},
      {Value: assessmentCycle,  Label: 'Assessment Cycle'},
      {Value: riskType,         Label: 'Risk Type'},
      {Value: assessor,         Label: 'Assessor'},
      {Value: assessorTitle,    Label: 'Assessor Title / Qualification'},
      {Value: lastReviewDate,   Label: 'Last Reviewed'},
      {Value: reviewDueDate,    Label: 'Next Review Due'},
    ]
  },
  UI.FieldGroup#RiskMatrix: {
    Label: 'Risk Quantification (ISO 31000)',
    Data: [
      {Value: riskDescription,          Label: 'Risk Description'},
      {Value: potentialConsequence,     Label: 'Potential Consequence'},
      {Value: likelihood,               Label: 'Likelihood (1=Rare – 5=Almost Certain)'},
      {Value: likelihoodJustification,  Label: 'Likelihood Justification'},
      {Value: consequence,              Label: 'Consequence (1=Negligible – 5=Catastrophic)'},
      {Value: consequenceJustification, Label: 'Consequence Justification'},
      {Value: inherentRiskScore,        Label: 'Inherent Risk Score (L × C)'},
      {Value: inherentRiskLevel,        Label: 'Inherent Risk Level'},
      {Value: existingControls,         Label: 'Existing Controls'},
      {Value: controlEffectiveness,     Label: 'Control Effectiveness'},
      {Value: residualRiskScore,        Label: 'Residual Risk Score'},
      {Value: residualRiskLevel,        Label: 'Residual Risk Level'},
      {Value: residualRiskAcceptable,   Label: 'Residual Risk Acceptable'},
    ]
  },
  UI.FieldGroup#RiskTreatment: {
    Label: 'Treatment Plan',
    Data: [
      {Value: riskTreatmentStrategy, Label: 'Treatment Strategy'},
      {Value: treatmentActions,      Label: 'Treatment Actions'},
      {Value: treatmentResponsible,  Label: 'Responsible Officer'},
      {Value: treatmentDeadline,     Label: 'Treatment Deadline'},
      {Value: treatmentBudget,       Label: 'Treatment Budget ($)'},
      {Value: linkedInspectionId,    Label: 'Linked Inspection ID'},
      {Value: linkedDefectId,        Label: 'Linked Defect ID'},
      {Value: notes,                 Label: 'Notes'},
    ]
  },
);

// ── LoadRatingCertificates — standalone + Bridge Details ────────────────
annotate AdminService.LoadRatingCertificates with {
  bridge @(
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    title                  : 'Bridge',
    Common.FieldControl    : #Mandatory,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',         LocalDataProperty: bridge_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeId' }
      ]
    }
  );
};

annotate AdminService.LoadRatingCertificates with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.SelectionFields: [bridge_ID, status, ratingStandard, certificateIssueDate],
  UI.LineItem: [
    {Value: bridge.bridgeId,       Label: 'Bridge ID'},
    {Value: bridge.bridgeName,     Label: 'Bridge'},
    {Value: certificateNumber,     Label: 'Certificate #'},
    {Value: status,                Label: 'Status'},
    {Value: ratingStandard,        Label: 'Standard'},
    {Value: ratingLevel,           Label: 'Rating Level'},
    {Value: certifyingEngineer,    Label: 'Engineer'},
    {Value: engineerOrganisation,  Label: 'Organisation'},
    {Value: certificateIssueDate,  Label: 'Issued'},
    {Value: certificateExpiryDate, Label: 'Expires'},
    {Value: ratingFactor,          Label: 'RF (T44)'},
  ],
  UI.HeaderInfo: {
    TypeName      : 'Load Rating Certificate',
    TypeNamePlural: 'Load Rating Certificates',
    Title         : {Value: certificateNumber},
    Description   : {Value: status},
  },
  UI.Facets: [
    {
      $Type : 'UI.CollectionFacet',
      Label : 'Certificate Details',
      ID    : 'LRCDetails',
      Facets: [
        {$Type: 'UI.ReferenceFacet', Label: 'Certificate',    Target: '@UI.FieldGroup#LRCCertificate'},
        {$Type: 'UI.ReferenceFacet', Label: 'Load Factors',  Target: '@UI.FieldGroup#LRCLoadFactors'},
        {$Type: 'UI.ReferenceFacet', Label: 'Fatigue Life',  Target: '@UI.FieldGroup#LRCFatigue'},
        {$Type: 'UI.ReferenceFacet', Label: 'Supersession & Notes', Target: '@UI.FieldGroup#LRCSupersession'},
      ]
    },
  ],
  UI.FieldGroup#LRCCertificate: {
    Label: 'Certificate',
    Data: [
      {Value: bridge_ID,             Label: 'Bridge'},
      {Value: certificateNumber,     Label: 'Certificate Number'},
      {Value: certificateVersion,    Label: 'Version'},
      {Value: status,                Label: 'Status'},
      {Value: ratingStandard,        Label: 'Rating Standard'},
      {Value: ratingLevel,           Label: 'Rating Level'},
      {Value: certifyingEngineer,    Label: 'Certifying Engineer'},
      {Value: engineerQualification, Label: 'Qualification'},
      {Value: engineerLicenseNumber, Label: 'License Number'},
      {Value: engineerOrganisation,  Label: 'Organisation'},
      {Value: certificateIssueDate,  Label: 'Issue Date'},
      {Value: certificateExpiryDate, Label: 'Expiry Date'},
      {Value: nextReviewDate,        Label: 'Next Review Date'},
      {Value: governingMember,       Label: 'Governing Member'},
      {Value: governingFailureMode,  Label: 'Governing Failure Mode'},
    ]
  },
  UI.FieldGroup#LRCLoadFactors: {
    Label: 'Load Rating Factors (AS 5100.7)',
    Data: [
      {Value: rfT44,    Label: 'T44'},
      {Value: rfSM1600, Label: 'SM1600'},
      {Value: rfHLP400, Label: 'HLP400'},
      {Value: rfW80,    Label: 'W80'},
      {Value: rfA160,   Label: 'A160'},
      {Value: rfPBS1,   Label: 'PBS 1'},
      {Value: rfPBS2,   Label: 'PBS 2'},
      {Value: rfPBS3,   Label: 'PBS 3'},
      {Value: rfPBS4,   Label: 'PBS 4'},
      {Value: rfPBS5,   Label: 'PBS 5'},
      {Value: rfHML,    Label: 'HML'},
      {Value: rfCML,    Label: 'CML'},
      {Value: dynamicLoadAllowance, Label: 'DLA'},
    ]
  },
  UI.FieldGroup#LRCFatigue: {
    Label: 'Fatigue Life (AS 5100.6 §13.5)',
    Data: [
      {Value: fatigueSensitive,     Label: 'Fatigue Sensitive'},
      {Value: consumedLifePercent,  Label: 'Consumed Life (%)'},
      {Value: remainingLifeYears,   Label: 'Remaining Life (years)'},
      {Value: detailCategory,       Label: 'Detail Category'},
      {Value: trafficSpectrumRef,   Label: 'Traffic Spectrum Reference'},
    ]
  },
  UI.FieldGroup#LRCSupersession: {
    Label: 'Supersession & Notes',
    Data: [
      {Value: governingCapacityType,  Label: 'Governing Capacity Type'},
      {Value: expiryWarningDays,      Label: 'Expiry Warning (days)'},
      {Value: previousCertId,         Label: 'Previous Certificate ID'},
      {Value: supersessionReason,     Label: 'Supersession Reason'},
      {Value: conditions,             Label: 'Conditions of Rating'},
      {Value: reportStorageRef,       Label: 'Report Storage Reference'},
      {Value: notes,                  Label: 'Notes'},
    ]
  },
);

// ── NhvrRouteAssessments — standalone + Bridge Details ──────────────────
annotate AdminService.NhvrRouteAssessments with {
  bridge @(
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    title                  : 'Bridge',
    Common.FieldControl    : #Mandatory,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',         LocalDataProperty: bridge_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeId' }
      ]
    }
  );
};

annotate AdminService.NhvrRouteAssessments with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.SelectionFields: [bridge_ID, assessmentStatus, validFrom, validTo],
  UI.LineItem: [
    {Value: bridge.bridgeId,   Label: 'Bridge ID'},
    {Value: bridge.bridgeName, Label: 'Bridge'},
    {Value: assessmentId,      Label: 'Assessment ID'},
    {Value: assessmentDate,    Label: 'Date'},
    {Value: assessmentStatus,  Label: 'Status'},
    {Value: assessorName,      Label: 'Assessor'},
    {Value: assessmentVersion, Label: 'Version'},
    {Value: validFrom,         Label: 'Valid From'},
    {Value: validTo,           Label: 'Valid To'},
    {Value: nhvrApprovalDate,  Label: 'NHVR Approval'},
    {Value: nextReviewDate,    Label: 'Next Review'},
  ],
  UI.HeaderInfo: {
    TypeName      : 'NHVR Route Assessment',
    TypeNamePlural: 'NHVR Route Assessments',
    Title         : {Value: assessmentId},
    Description   : {Value: bridge.bridgeName},
  },
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Label: 'Assessment Details',  Target: '@UI.FieldGroup#NhvrDetails' },
    { $Type: 'UI.ReferenceFacet', Label: 'NHVR Submission',     Target: '@UI.FieldGroup#NhvrSubmission' },
    { $Type: 'UI.ReferenceFacet', Label: 'Approval Conditions', Target: '@UI.FieldGroup#NhvrConditions' },
  ],
  UI.FieldGroup#NhvrDetails: {
    Label: 'Assessment',
    Data: [
      { Value: bridge_ID,              Label: 'Bridge' },
      { Value: assessmentId,           Label: 'Assessment ID' },
      { Value: assessmentDate,         Label: 'Assessment Date' },
      { Value: assessmentStatus,       Label: 'Status' },
      { Value: assessmentVersion,      Label: 'Version' },
      { Value: assessorName,           Label: 'Assessor' },
      { Value: assessorAccreditationNo, Label: 'Assessor Accreditation No.' },
      { Value: validFrom,              Label: 'Valid From' },
      { Value: validTo,                Label: 'Valid To' },
      { Value: nhvrApprovalDate,       Label: 'NHVR Approval Date' },
      { Value: nextReviewDate,         Label: 'Next Review Date' },
    ]
  },
  UI.FieldGroup#NhvrSubmission: {
    Label: 'NHVR Submission',
    Data: [
      { Value: nhvrSubmissionRef,      Label: 'NHVR Submission Reference' },
      { Value: nhvrSubmissionDate,     Label: 'Submission Date' },
      { Value: iapRequired,            Label: 'IAP Required' },
      { Value: iapRouteId,             Label: 'IAP Route ID' },
    ]
  },
  UI.FieldGroup#NhvrConditions: {
    Label: 'Approved Vehicle Classes & Conditions',
    Data: [
      { Value: approvedVehicleClasses, Label: 'Approved Vehicle Classes' },
      { Value: conditions,             Label: 'Conditions of Approval' },
      { Value: notes,                  Label: 'Notes' },
    ]
  },
);

// ── AlertsAndNotifications — expert council full treatment ────────────────
// Alerts are system-generated (Insertable: false). End users acknowledge/resolve.
// Manager: severity + due date must be prominent in list
// Inspector: entityType + entityDescription tells them what to look at
// Data Steward: resolution proof and resolution note required before closing
annotate AdminService.AlertsAndNotifications with {
  ID              @UI.Hidden;
  createdAt       @UI.Hidden;  createdBy       @UI.Hidden;
  modifiedAt      @UI.Hidden;  modifiedBy      @UI.Hidden;
  bridge @(
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    title                  : 'Bridge',
    Common.FieldControl    : #ReadOnly,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',         LocalDataProperty: bridge_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeId' }
      ]
    }
  );
  alertTitle          @title: 'Alert Title'            @Common.FieldControl: #ReadOnly;
  alertType           @title: 'Alert Type'             @Common.FieldControl: #ReadOnly;
  alertDescription    @title: 'Alert Description'      @Common.FieldControl: #ReadOnly  @UI.MultiLineText;
  entityType          @title: 'Related Record Type'    @Common.FieldControl: #ReadOnly  @Common.QuickInfo: 'Entity that triggered this alert (e.g. LoadRatingCertificate, Inspection)';
  entityId            @title: 'Related Record ID'      @Common.FieldControl: #ReadOnly;
  entityDescription   @title: 'Related Record'         @Common.FieldControl: #ReadOnly;
  severity            @title: 'Severity'               @Common.FieldControl: #ReadOnly  @Common.QuickInfo: 'Critical / Warning / Info';
  priority            @title: 'Priority (1=Highest–5=Lowest)' @Common.FieldControl: #ReadOnly;
  triggeredDate       @title: 'Triggered Date/Time'    @Common.FieldControl: #ReadOnly;
  dueDate             @title: 'Due Date';
  status              @title: 'Status';
  acknowledgedBy      @title: 'Acknowledged By'        @Common.FieldControl: #ReadOnly;
  acknowledgedDate    @title: 'Acknowledged Date/Time' @Common.FieldControl: #ReadOnly;
  acknowledgementNote @title: 'Acknowledgement Note'   @UI.MultiLineText;
  resolvedBy          @title: 'Resolved By'            @Common.FieldControl: #ReadOnly;
  resolvedDate        @title: 'Resolved Date/Time'     @Common.FieldControl: #ReadOnly;
  resolutionNote      @title: 'Resolution Note'        @UI.MultiLineText  @Common.QuickInfo: 'Describe what action was taken to resolve this alert';
  resolutionProof     @title: 'Resolution Proof (URL)' @UI.IsURL;
  escalatedToRole     @title: 'Escalated To Role'      @Common.FieldControl: #ReadOnly;
  escalatedDate       @title: 'Escalated Date/Time'    @Common.FieldControl: #ReadOnly;
  suppressedUntil     @title: 'Suppressed Until';
  suppressionReason   @title: 'Suppression Reason'     @UI.MultiLineText;
  suppressedBy        @title: 'Suppressed By'          @Common.FieldControl: #ReadOnly;
  emailNotificationSent @title: 'Email Sent'           @Common.FieldControl: #ReadOnly;
  emailSentTo         @title: 'Email Recipients'       @Common.FieldControl: #ReadOnly;
  emailSentDate       @title: 'Email Sent Date/Time'   @Common.FieldControl: #ReadOnly;
  notes               @title: 'Notes'  @UI.MultiLineText;
};

annotate AdminService.AlertsAndNotifications with @(
  Capabilities.InsertRestrictions.Insertable : false,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.SelectionFields: [bridge_ID, alertType, severity, status, dueDate, entityType],
  UI.HeaderInfo: {
    TypeName      : 'Alert',
    TypeNamePlural: 'Alerts & Notifications',
    Title         : {Value: alertTitle},
    Description   : {Value: alertType},
  },
  UI.LineItem: [
    {Value: bridge.bridgeId,    Label: 'Bridge ID'},
    {Value: bridge.bridgeName,  Label: 'Bridge'},
    {Value: alertTitle,         Label: 'Alert'},
    {Value: alertType,          Label: 'Type'},
    {Value: entityType,         Label: 'Related To'},
    {Value: entityDescription,  Label: 'Record'},
    {Value: severity,           Label: 'Severity'},
    {Value: priority,           Label: 'Priority'},
    {Value: status,             Label: 'Status'},
    {Value: triggeredDate,      Label: 'Triggered'},
    {Value: dueDate,            Label: 'Due'},
    {Value: acknowledgedBy,     Label: 'Acknowledged By'},
  ],
  UI.Facets: [
    {
      $Type : 'UI.CollectionFacet', Label: 'Alert Details', ID: 'AlertDetails',
      Facets: [
        {$Type: 'UI.ReferenceFacet', Label: 'Alert',               Target: '@UI.FieldGroup#AlertSummary'},
        {$Type: 'UI.ReferenceFacet', Label: 'Acknowledgement',     Target: '@UI.FieldGroup#AlertAcknowledgement'},
        {$Type: 'UI.ReferenceFacet', Label: 'Resolution',          Target: '@UI.FieldGroup#AlertResolution'},
        {$Type: 'UI.ReferenceFacet', Label: 'Escalation',          Target: '@UI.FieldGroup#AlertEscalation'},
        {$Type: 'UI.ReferenceFacet', Label: 'Email Notifications', Target: '@UI.FieldGroup#AlertEmail'},
      ]
    },
  ],
  UI.FieldGroup#AlertSummary: {
    Label: 'Alert',
    Data: [
      {Value: bridge_ID,          Label: 'Bridge'},
      {Value: alertTitle,         Label: 'Alert Title'},
      {Value: alertType,          Label: 'Alert Type'},
      {Value: alertDescription,   Label: 'Description'},
      {Value: severity,           Label: 'Severity'},
      {Value: priority,           Label: 'Priority (1=Highest–5=Lowest)'},
      {Value: triggeredDate,      Label: 'Triggered Date/Time'},
      {Value: dueDate,            Label: 'Due Date'},
      {Value: status,             Label: 'Status'},
      {Value: entityType,         Label: 'Related Record Type'},
      {Value: entityId,           Label: 'Related Record ID'},
      {Value: entityDescription,  Label: 'Related Record Description'},
    ]
  },
  UI.FieldGroup#AlertAcknowledgement: {
    Label: 'Acknowledgement',
    Data: [
      {Value: acknowledgedBy,       Label: 'Acknowledged By'},
      {Value: acknowledgedDate,     Label: 'Acknowledged Date/Time'},
      {Value: acknowledgementNote,  Label: 'Acknowledgement Note'},
    ]
  },
  UI.FieldGroup#AlertResolution: {
    Label: 'Resolution',
    Data: [
      {Value: resolvedBy,      Label: 'Resolved By'},
      {Value: resolvedDate,    Label: 'Resolved Date/Time'},
      {Value: resolutionNote,  Label: 'Resolution Note'},
      {Value: resolutionProof, Label: 'Resolution Proof (URL)'},
      {Value: notes,           Label: 'Notes'},
    ]
  },
  UI.FieldGroup#AlertEscalation: {
    Label: 'Escalation & Suppression',
    Data: [
      {Value: escalatedToRole,   Label: 'Escalated To Role'},
      {Value: escalatedDate,     Label: 'Escalated Date/Time'},
      {Value: suppressedUntil,   Label: 'Suppressed Until'},
      {Value: suppressionReason, Label: 'Suppression Reason'},
      {Value: suppressedBy,      Label: 'Suppressed By'},
    ]
  },
  UI.FieldGroup#AlertEmail: {
    Label: 'Email Notifications',
    Data: [
      {Value: emailNotificationSent, Label: 'Email Sent'},
      {Value: emailSentTo,           Label: 'Recipients'},
      {Value: emailSentDate,         Label: 'Sent Date/Time'},
    ]
  },
);

// ── BridgeInspectionElements — expert council full treatment ──────────────
// Inspector priority: condition states prominently displayed; health rating calculated
// End User: elementType mandatory, qty before % for natural entry flow
annotate AdminService.BridgeInspectionElements with {
  ID          @UI.Hidden;
  createdAt   @UI.Hidden;  createdBy   @UI.Hidden;
  modifiedAt  @UI.Hidden;  modifiedBy  @UI.Hidden;
  inspection @(
    Common.Text            : inspection.inspectionRef,
    Common.TextArrangement : #TextOnly,
    title                  : 'Inspection',
    Common.FieldControl    : #Mandatory,
    Common.ValueList: {
      CollectionPath : 'BridgeInspections',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',         LocalDataProperty: inspection_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'inspectionRef' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'inspectionDate' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'inspectionType' }
      ]
    }
  );
  bridge              @UI.Hidden;  // accessed via inspection.bridge
  elementType         @Common.FieldControl: #Mandatory  @title: 'Element Type'          @Common.QuickInfo: 'SIMS element type code — e.g. DEK (Deck), ABT (Abutment), BRG (Bearing)';
  unit                @title: 'Unit of Measure'         @Common.QuickInfo: 'm², m, no.';
  elementHealthRating @title: 'Element Health Rating'   @Common.QuickInfo: 'Weighted composite of condition state quantities — lower is worse; auto-calculated';
  conditionState1Qty  @title: 'CS1 Quantity (Good/New)';
  conditionState2Qty  @title: 'CS2 Quantity (Satisfactory)';
  conditionState3Qty  @title: 'CS3 Quantity (Poor)';
  conditionState4Qty  @title: 'CS4 Quantity (Failed)';
  conditionState1Pct  @title: 'CS1 % (Good/New)';
  conditionState2Pct  @title: 'CS2 % (Satisfactory)';
  conditionState3Pct  @title: 'CS3 % (Poor)';
  conditionState4Pct  @title: 'CS4 % (Failed)';
  comments            @title: 'Comments'  @UI.MultiLineText;
};

annotate AdminService.BridgeInspectionElements with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.SelectionFields: [inspection_ID, elementType, elementHealthRating],
  UI.HeaderInfo: {
    TypeName      : 'Inspection Element',
    TypeNamePlural: 'Inspection Elements',
    Title         : {Value: elementType},
    Description   : {Value: inspection.inspectionRef},
  },
  UI.LineItem: [
    {Value: inspection.inspectionRef, Label: 'Inspection'},
    {Value: elementType,              Label: 'Element Type'},
    {Value: unit,                     Label: 'Unit'},
    {Value: elementHealthRating,      Label: 'Health Rating'},
    {Value: conditionState1Pct,       Label: 'CS1 % (Good)'},
    {Value: conditionState2Pct,       Label: 'CS2 % (Satisfactory)'},
    {Value: conditionState3Pct,       Label: 'CS3 % (Poor)'},
    {Value: conditionState4Pct,       Label: 'CS4 % (Failed)'},
  ],
  UI.Facets: [
    {
      $Type : 'UI.CollectionFacet', Label: 'Inspection Element', ID: 'InspElemDetails',
      Facets: [
        {$Type: 'UI.ReferenceFacet', Label: 'Element',           Target: '@UI.FieldGroup#InspElemGeneral'},
        {$Type: 'UI.ReferenceFacet', Label: 'Condition States',  Target: '@UI.FieldGroup#InspElemCondition'},
      ]
    },
  ],
  UI.FieldGroup#InspElemGeneral: {
    Label: 'Element',
    Data: [
      {Value: inspection_ID,      Label: 'Inspection'},
      {Value: elementType,        Label: 'Element Type'},
      {Value: unit,               Label: 'Unit of Measure'},
      {Value: elementHealthRating, Label: 'Element Health Rating'},
      {Value: comments,           Label: 'Comments'},
    ]
  },
  UI.FieldGroup#InspElemCondition: {
    Label: 'Condition States (SIMS)',
    Data: [
      {Value: conditionState1Qty, Label: 'CS1 Quantity (Good/New)'},
      {Value: conditionState1Pct, Label: 'CS1 % (Good/New)'},
      {Value: conditionState2Qty, Label: 'CS2 Quantity (Satisfactory)'},
      {Value: conditionState2Pct, Label: 'CS2 % (Satisfactory)'},
      {Value: conditionState3Qty, Label: 'CS3 Quantity (Poor)'},
      {Value: conditionState3Pct, Label: 'CS3 % (Poor)'},
      {Value: conditionState4Qty, Label: 'CS4 Quantity (Failed)'},
      {Value: conditionState4Pct, Label: 'CS4 % (Failed)'},
    ]
  },
);

// ── BridgeCarriageways — expert council full treatment ────────────────────
// Manager priority: lane count + clearance first (safety limits)
// Inspector: prescribedDirFrom/To for traffic management context
// Data Steward: roadNumber + carriageCode are primary identifiers
annotate AdminService.BridgeCarriageways with {
  ID          @UI.Hidden;
  createdAt   @UI.Hidden;  createdBy   @UI.Hidden;
  modifiedAt  @UI.Hidden;  modifiedBy  @UI.Hidden;
  bridge @(
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    title                  : 'Bridge',
    Common.FieldControl    : #Mandatory,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',         LocalDataProperty: bridge_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeId' }
      ]
    }
  );
  roadNumber           @title: 'Road Number';
  roadRankCode         @title: 'Road Rank Code'            @Common.QuickInfo: 'e.g. State Highway, Regional Road, Local Road';
  roadClassCode        @title: 'Road Class Code';
  carriageCode         @title: 'Carriageway Code'          @Common.QuickInfo: 'Unique identifier for this carriageway on the bridge';
  laneCount            @title: 'Lane Count'                @Common.QuickInfo: 'Number of traffic lanes on this carriageway';
  minWidthM            @title: 'Minimum Width (m)'         @Common.QuickInfo: 'Narrowest point of carriageway — safety critical';
  maxWidthM            @title: 'Maximum Width (m)';
  verticalClearanceM   @title: 'Vertical Clearance (m)'   @Common.QuickInfo: 'Height restriction above road surface — safety critical for HVs';
  prescribedDirFrom    @title: 'Traffic Direction From';
  prescribedDirTo      @title: 'Traffic Direction To';
  distanceFromStartKm  @title: 'Distance from Route Start (km)';
  linkForInspection    @title: 'Inspection Link URL'       @UI.IsURL;
  comments             @title: 'Comments'  @UI.MultiLineText;
};

annotate AdminService.BridgeCarriageways with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.SelectionFields: [bridge_ID, roadNumber, carriageCode, laneCount],
  UI.HeaderInfo: {
    TypeName      : 'Carriageway',
    TypeNamePlural: 'Carriageways',
    Title         : {Value: carriageCode},
    Description   : {Value: bridge.bridgeName},
  },
  UI.LineItem: [
    {Value: bridge.bridgeId,      Label: 'Bridge ID'},
    {Value: bridge.bridgeName,    Label: 'Bridge'},
    {Value: roadNumber,           Label: 'Road Number'},
    {Value: carriageCode,         Label: 'Carriageway Code'},
    {Value: laneCount,            Label: 'Lanes'},
    {Value: minWidthM,            Label: 'Min Width (m)'},
    {Value: maxWidthM,            Label: 'Max Width (m)'},
    {Value: verticalClearanceM,   Label: 'Vert. Clearance (m)'},
    {Value: roadRankCode,         Label: 'Road Rank'},
    {Value: distanceFromStartKm,  Label: 'Distance (km)'},
  ],
  UI.Facets: [
    {
      $Type : 'UI.CollectionFacet', Label: 'Carriageway', ID: 'CarriagewayDetails',
      Facets: [
        {$Type: 'UI.ReferenceFacet', Label: 'Road Identity',   Target: '@UI.FieldGroup#CarrRoad'},
        {$Type: 'UI.ReferenceFacet', Label: 'Geometry',        Target: '@UI.FieldGroup#CarrGeometry'},
        {$Type: 'UI.ReferenceFacet', Label: 'Traffic & Notes', Target: '@UI.FieldGroup#CarrTraffic'},
      ]
    },
  ],
  UI.FieldGroup#CarrRoad: {
    Label: 'Road Identity',
    Data: [
      {Value: bridge_ID,          Label: 'Bridge'},
      {Value: roadNumber,         Label: 'Road Number'},
      {Value: roadRankCode,       Label: 'Road Rank Code'},
      {Value: roadClassCode,      Label: 'Road Class Code'},
      {Value: carriageCode,       Label: 'Carriageway Code'},
      {Value: distanceFromStartKm, Label: 'Distance from Route Start (km)'},
    ]
  },
  UI.FieldGroup#CarrGeometry: {
    Label: 'Geometry (Safety Critical)',
    Data: [
      {Value: laneCount,           Label: 'Lane Count'},
      {Value: minWidthM,           Label: 'Minimum Width (m)'},
      {Value: maxWidthM,           Label: 'Maximum Width (m)'},
      {Value: verticalClearanceM,  Label: 'Vertical Clearance (m)'},
    ]
  },
  UI.FieldGroup#CarrTraffic: {
    Label: 'Traffic & Inspection',
    Data: [
      {Value: prescribedDirFrom,   Label: 'Traffic Direction From'},
      {Value: prescribedDirTo,     Label: 'Traffic Direction To'},
      {Value: linkForInspection,   Label: 'Inspection Link'},
      {Value: comments,            Label: 'Comments'},
    ]
  },
);

// ── BridgeContacts — expert council full treatment ────────────────────────
// End User: phone + email first in list (quickest reference)
// Manager: contactGroup for routing notifications; organisation for escalation
annotate AdminService.BridgeContacts with {
  ID          @UI.Hidden;
  createdAt   @UI.Hidden;  createdBy   @UI.Hidden;
  modifiedAt  @UI.Hidden;  modifiedBy  @UI.Hidden;
  bridge @(
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    title                  : 'Bridge',
    Common.FieldControl    : #Mandatory,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',         LocalDataProperty: bridge_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeId' }
      ]
    }
  );
  contactGroup    @Common.FieldControl: #Mandatory  @title: 'Contact Group'  @Common.QuickInfo: 'e.g. Asset Owner, Maintaining Authority, Emergency Contact, Inspector';
  primaryContact  @Common.FieldControl: #Mandatory  @title: 'Contact Name';
  organisation    @title: 'Organisation';
  position        @title: 'Position / Role';
  phone           @title: 'Phone';
  mobile          @title: 'Mobile';
  email           @title: 'Email';
  address         @title: 'Address'  @UI.MultiLineText;
  comments        @title: 'Comments'  @UI.MultiLineText;
};

annotate AdminService.BridgeContacts with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : true,
  UI.SelectionFields: [bridge_ID, contactGroup, primaryContact, email],
  UI.HeaderInfo: {
    TypeName      : 'Contact',
    TypeNamePlural: 'Contacts',
    Title         : {Value: primaryContact},
    Description   : {Value: contactGroup},
  },
  UI.LineItem: [
    {Value: bridge.bridgeId,  Label: 'Bridge ID'},
    {Value: bridge.bridgeName, Label: 'Bridge'},
    {Value: contactGroup,     Label: 'Group'},
    {Value: primaryContact,   Label: 'Name'},
    {Value: organisation,     Label: 'Organisation'},
    {Value: position,         Label: 'Position'},
    {Value: phone,            Label: 'Phone'},
    {Value: mobile,           Label: 'Mobile'},
    {Value: email,            Label: 'Email'},
  ],
  UI.Facets: [
    {
      $Type : 'UI.CollectionFacet', Label: 'Contact', ID: 'ContactDetails',
      Facets: [
        {$Type: 'UI.ReferenceFacet', Label: 'Identity',        Target: '@UI.FieldGroup#ContactIdentity'},
        {$Type: 'UI.ReferenceFacet', Label: 'Contact Details', Target: '@UI.FieldGroup#ContactDetails'},
      ]
    },
  ],
  UI.FieldGroup#ContactIdentity: {
    Label: 'Identity',
    Data: [
      {Value: bridge_ID,      Label: 'Bridge'},
      {Value: contactGroup,   Label: 'Contact Group'},
      {Value: primaryContact, Label: 'Contact Name'},
      {Value: organisation,   Label: 'Organisation'},
      {Value: position,       Label: 'Position / Role'},
      {Value: comments,       Label: 'Comments'},
    ]
  },
  UI.FieldGroup#ContactDetails: {
    Label: 'Contact Details',
    Data: [
      {Value: phone,   Label: 'Phone'},
      {Value: mobile,  Label: 'Mobile'},
      {Value: email,   Label: 'Email'},
      {Value: address, Label: 'Address'},
    ]
  },
);

// ── BridgeMehComponents — expert council full treatment ───────────────────
// Inspector priority: componentType + inspFrequency first (what to inspect and when)
// Manager: shelfLifeYears + locationStored for procurement planning
// Data Steward: serialNumber for asset tracking; make/model for spare parts
annotate AdminService.BridgeMehComponents with {
  ID          @UI.Hidden;
  createdAt   @UI.Hidden;  createdBy   @UI.Hidden;
  modifiedAt  @UI.Hidden;  modifiedBy  @UI.Hidden;
  bridge @(
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    title                  : 'Bridge',
    Common.FieldControl    : #Mandatory,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',         LocalDataProperty: bridge_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeId' }
      ]
    }
  );
  componentType   @Common.FieldControl: #Mandatory  @title: 'Component Type'      @Common.QuickInfo: 'e.g. Moveable Joint, Drainage, Scour Protection, Electrical Panel, Hydraulic Cylinder';
  name            @Common.FieldControl: #Mandatory  @title: 'Component Name';
  make            @title: 'Make / Manufacturer';
  model           @title: 'Model';
  serialNumber    @title: 'Serial Number'            @Common.QuickInfo: 'Manufacturer serial — used for warranty and spare parts tracking';
  isElectrical    @title: 'Electrical Component';
  isMechanical    @title: 'Mechanical Component';
  isHydraulic     @title: 'Hydraulic Component';
  inspFrequency   @title: 'Inspection Frequency'     @Common.QuickInfo: 'e.g. Monthly, Quarterly, Annual, 2-Year';
  locationStored  @title: 'Location / Storage Ref'   @Common.QuickInfo: 'Physical location on bridge or warehouse storage reference';
  shelfLifeYears  @title: 'Shelf Life (years)';
  attributes      @title: 'Additional Attributes (JSON)'  @UI.MultiLineText  @Common.QuickInfo: 'Flexible JSON field for component-specific properties';
  comments        @title: 'Comments'  @UI.MultiLineText;
};

annotate AdminService.BridgeMehComponents with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.SelectionFields: [bridge_ID, componentType, name, isElectrical, isMechanical, isHydraulic],
  UI.HeaderInfo: {
    TypeName      : 'MEH Component',
    TypeNamePlural: 'MEH Components',
    Title         : {Value: name},
    Description   : {Value: componentType},
  },
  UI.LineItem: [
    {Value: bridge.bridgeId,  Label: 'Bridge ID'},
    {Value: bridge.bridgeName, Label: 'Bridge'},
    {Value: componentType,    Label: 'Type'},
    {Value: name,             Label: 'Name'},
    {Value: make,             Label: 'Make'},
    {Value: model,            Label: 'Model'},
    {Value: isElectrical,     Label: 'Electrical'},
    {Value: isMechanical,     Label: 'Mechanical'},
    {Value: isHydraulic,      Label: 'Hydraulic'},
    {Value: inspFrequency,    Label: 'Insp. Frequency'},
    {Value: locationStored,   Label: 'Location'},
    {Value: shelfLifeYears,   Label: 'Shelf Life (yrs)'},
  ],
  UI.Facets: [
    {
      $Type : 'UI.CollectionFacet', Label: 'MEH Component', ID: 'MehDetails',
      Facets: [
        {$Type: 'UI.ReferenceFacet', Label: 'Component Identity',   Target: '@UI.FieldGroup#MehIdentity'},
        {$Type: 'UI.ReferenceFacet', Label: 'Type Classification',  Target: '@UI.FieldGroup#MehType'},
        {$Type: 'UI.ReferenceFacet', Label: 'Maintenance',          Target: '@UI.FieldGroup#MehMaintenance'},
        {$Type: 'UI.ReferenceFacet', Label: 'Additional Attributes', Target: '@UI.FieldGroup#MehAttributes'},
      ]
    },
  ],
  UI.FieldGroup#MehIdentity: {
    Label: 'Component Identity',
    Data: [
      {Value: bridge_ID,    Label: 'Bridge'},
      {Value: componentType, Label: 'Component Type'},
      {Value: name,          Label: 'Component Name'},
      {Value: make,          Label: 'Make / Manufacturer'},
      {Value: model,         Label: 'Model'},
      {Value: serialNumber,  Label: 'Serial Number'},
    ]
  },
  UI.FieldGroup#MehType: {
    Label: 'Type Classification',
    Data: [
      {Value: isElectrical, Label: 'Electrical Component'},
      {Value: isMechanical, Label: 'Mechanical Component'},
      {Value: isHydraulic,  Label: 'Hydraulic Component'},
    ]
  },
  UI.FieldGroup#MehMaintenance: {
    Label: 'Maintenance & Storage',
    Data: [
      {Value: inspFrequency,  Label: 'Inspection Frequency'},
      {Value: locationStored, Label: 'Location / Storage Ref'},
      {Value: shelfLifeYears, Label: 'Shelf Life (years)'},
      {Value: comments,       Label: 'Comments'},
    ]
  },
  UI.FieldGroup#MehAttributes: {
    Label: 'Additional Attributes',
    Data: [
      {Value: attributes, Label: 'Attributes (JSON)'},
    ]
  },
);

////////////////////////////////////////////////////////////////////////////
//  Action side-effects — force FE to re-read fields after deactivate/reactivate
//  so button visibility toggling (@UI.Hidden based on status) updates immediately
////////////////////////////////////////////////////////////////////////////

annotate AdminService.Bridges with actions {
  deactivate @Common.SideEffects: { TargetProperties: ['status'] };
  reactivate @Common.SideEffects: { TargetProperties: ['status'] };
};

annotate AdminService.Restrictions with actions {
  deactivate @Common.SideEffects: { TargetProperties: ['restrictionStatus', 'active'] };
  reactivate @Common.SideEffects: { TargetProperties: ['restrictionStatus', 'active'] };
};

annotate AdminService.BridgeRestrictions with actions {
  deactivate @Common.SideEffects: { TargetProperties: ['restrictionStatus', 'active'] };
  reactivate @Common.SideEffects: { TargetProperties: ['restrictionStatus', 'active'] };
};

////////////////////////////////////////////////////////////////////////////
//  BridgeConditionSurveys (CON tile) — standalone condition survey records
////////////////////////////////////////////////////////////////////////////

annotate AdminService.BridgeConditionSurveys with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.HeaderInfo: {
    TypeName      : 'Condition Survey',
    TypeNamePlural: 'Condition Surveys',
    Title         : { Value: surveyRef },
    Description   : { Value: surveyDate }
  },
  UI.SelectionFields: [ bridgeRef, surveyRef, surveyType, overallGrade, status, active ],
  UI.LineItem: [
    { Value: bridge.bridgeId,  Label: 'Bridge ID' },
    { Value: bridge.bridgeName, Label: 'Bridge' },
    { Value: surveyRef,        Label: 'Survey Ref' },
    { Value: surveyDate,       Label: 'Survey Date' },
    { Value: surveyType,       Label: 'Type' },
    { Value: surveyedBy,       Label: 'Surveyed By' },
    { Value: conditionRating,  Label: 'Condition Rating' },
    { Value: overallGrade,     Label: 'Grade' },
    { Value: status,           Label: 'Status' },
    { Value: active,           Label: 'Active' },
  ],
  UI.Facets: [
    { $Type: 'UI.CollectionFacet', Label: 'Survey Details', ID: 'SurveyDetails', Facets: [
      { $Type: 'UI.ReferenceFacet', Label: 'General',     Target: '@UI.FieldGroup#ConSurveyGeneral' },
      { $Type: 'UI.ReferenceFacet', Label: 'Ratings',     Target: '@UI.FieldGroup#ConSurveyRatings' },
      { $Type: 'UI.ReferenceFacet', Label: 'Notes',       Target: '@UI.FieldGroup#ConSurveyNotes' },
    ]},
  ],
  UI.FieldGroup#ConSurveyGeneral: {
    Label: 'General',
    Data: [
      { Value: bridgeRef,  Label: 'Bridge' },
      { Value: surveyRef,  Label: 'Survey Ref' },
      { Value: surveyDate, Label: 'Survey Date' },
      { Value: surveyType, Label: 'Survey Type' },
      { Value: surveyedBy, Label: 'Surveyed By' },
      { Value: status,     Label: 'Status' },
      { Value: active,     Label: 'Active' },
    ]
  },
  UI.FieldGroup#ConSurveyRatings: {
    Label: 'Ratings',
    Data: [
      { Value: conditionRating,  Label: 'Condition Rating (1–10)' },
      { Value: structuralRating, Label: 'Structural Rating (1–10)' },
      { Value: overallGrade,     Label: 'Overall Grade' },
    ]
  },
  UI.FieldGroup#ConSurveyNotes: {
    Label: 'Notes',
    Data: [ { Value: notes, Label: 'Notes' }, { Value: remarks, Label: 'Remarks' } ]
  },
  UI.Identification: [
    {
      $Type      : 'UI.DataFieldForAction',
      Action     : 'AdminService.submitForReview',
      Label      : 'Submit for Review',
      Criticality: #Warning,
      ![@UI.Hidden]: { $edmJson: { $Ne: [{ $Path: 'status' }, 'Draft'] } }
    },
    {
      $Type      : 'UI.DataFieldForAction',
      Action     : 'AdminService.approveSurvey',
      Label      : 'Approve',
      Criticality: #Positive,
      ![@UI.Hidden]: { $edmJson: { $Ne: [{ $Path: 'status' }, 'Submitted'] } }
    },
    {
      $Type      : 'UI.DataFieldForAction',
      Action     : 'AdminService.deactivate',
      Label      : 'Deactivate',
      Criticality: #Negative,
      ![@UI.Hidden]: { $edmJson: { $Eq: [{ $Path: 'active' }, false] } }
    },
    {
      $Type      : 'UI.DataFieldForAction',
      Action     : 'AdminService.reactivate',
      Label      : 'Reactivate',
      Criticality: #Positive,
      ![@UI.Hidden]: { $edmJson: { $Ne: [{ $Path: 'active' }, false] } }
    }
  ]
);

annotate AdminService.BridgeConditionSurveys with {
  ID         @Core.Computed;
  createdBy  @UI.Hidden;  createdAt  @UI.Hidden;
  modifiedBy @UI.Hidden;  modifiedAt @UI.Hidden;
  bridge     @UI.Hidden;   // FK resolved via bridgeRef; navigation used for display text only
  surveyRef  @Core.Computed  @Common.FieldControl: #ReadOnly  @title: 'Survey Ref (auto-generated)';
  bridgeRef @(
    Common.FieldControl    : #Mandatory,
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterInOut',       ValueListProperty: 'bridgeId',   LocalDataProperty: bridgeRef },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' }
      ]
    }
  ) @title: 'Bridge';
  surveyDate @Common.FieldControl: #Mandatory  @title: 'Survey Date';
  surveyType @title: 'Survey Type';
  surveyedBy @title: 'Surveyed By';
  conditionRating @title: 'Condition Rating (1–10)'  @Common.QuickInfo: 'Valid range: 1 – 10';
  structuralRating @title: 'Structural Rating (1–10)' @Common.QuickInfo: 'Valid range: 1 – 10';
  overallGrade @title: 'Overall Grade';
  notes    @UI.MultiLineText  @title: 'Notes';
  remarks  @UI.MultiLineText  @title: 'Remarks';
  status   @title: 'Status'  @Common.FieldControl: #ReadOnly;
  active   @Common.FieldControl: #ReadOnly  @title: 'Active';
};

annotate AdminService.BridgeConditionSurveys with actions {
  deactivate      @Common.SideEffects: { TargetProperties: ['active'] };
  reactivate      @Common.SideEffects: { TargetProperties: ['active'] };
  submitForReview @Common.SideEffects: { TargetProperties: ['status'] };
  approveSurvey   @Common.SideEffects: { TargetProperties: ['status'] };
};

////////////////////////////////////////////////////////////////////////////
//  BridgeLoadRatings (LRT tile) — per-vehicle-class load rating assessments
////////////////////////////////////////////////////////////////////////////

annotate AdminService.BridgeLoadRatings with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.HeaderInfo: {
    TypeName      : 'Load Rating',
    TypeNamePlural: 'Load Ratings',
    Title         : { Value: ratingRef },
    Description   : { Value: vehicleClass }
  },
  UI.SelectionFields: [ bridgeRef, ratingRef, vehicleClass, ratingMethod, status, active ],
  UI.LineItem: [
    { Value: bridge.bridgeId,  Label: 'Bridge ID' },
    { Value: bridge.bridgeName, Label: 'Bridge' },
    { Value: ratingRef,       Label: 'Rating Ref' },
    { Value: vehicleClass,    Label: 'Vehicle Class' },
    { Value: ratingMethod,    Label: 'Method' },
    { Value: ratingFactor,    Label: 'Rating Factor' },
    { Value: grossMassLimit,  Label: 'Mass Limit (t)' },
    { Value: assessedBy,      Label: 'Assessed By' },
    { Value: assessmentDate,  Label: 'Assessment Date' },
    { Value: validTo,         Label: 'Valid To' },
    { Value: status,          Label: 'Status' },
    { Value: active,          Label: 'Active' },
  ],
  UI.Facets: [
    { $Type: 'UI.CollectionFacet', Label: 'Rating Details', ID: 'RatingDetails', Facets: [
      { $Type: 'UI.ReferenceFacet', Label: 'Classification', Target: '@UI.FieldGroup#LrtClass' },
      { $Type: 'UI.ReferenceFacet', Label: 'Limits',         Target: '@UI.FieldGroup#LrtLimits' },
      { $Type: 'UI.ReferenceFacet', Label: 'Assessment',     Target: '@UI.FieldGroup#LrtAssessment' },
    ]},
  ],
  UI.FieldGroup#LrtClass: {
    Label: 'Classification',
    Data: [
      { Value: bridgeRef,    Label: 'Bridge' },
      { Value: ratingRef,    Label: 'Rating Ref' },
      { Value: vehicleClass, Label: 'Vehicle Class' },
      { Value: ratingMethod, Label: 'Rating Method' },
      { Value: status,       Label: 'Status' },
      { Value: active,       Label: 'Active' },
    ]
  },
  UI.FieldGroup#LrtLimits: {
    Label: 'Limits',
    Data: [
      { Value: ratingFactor,   Label: 'Rating Factor' },
      { Value: grossMassLimit, Label: 'Gross Mass Limit (t)' },
    ]
  },
  UI.FieldGroup#LrtAssessment: {
    Label: 'Assessment',
    Data: [
      { Value: assessedBy,     Label: 'Assessed By' },
      { Value: assessmentDate, Label: 'Assessment Date' },
      { Value: validTo,        Label: 'Valid To' },
      { Value: remarks,        Label: 'Remarks' },
    ]
  },
  UI.Identification: [
    {
      $Type      : 'UI.DataFieldForAction',
      Action     : 'AdminService.deactivate',
      Label      : 'Deactivate',
      Criticality: #Negative,
      ![@UI.Hidden]: { $edmJson: { $Eq: [{ $Path: 'active' }, false] } }
    },
    {
      $Type      : 'UI.DataFieldForAction',
      Action     : 'AdminService.reactivate',
      Label      : 'Reactivate',
      Criticality: #Positive,
      ![@UI.Hidden]: { $edmJson: { $Ne: [{ $Path: 'active' }, false] } }
    }
  ]
);

annotate AdminService.BridgeLoadRatings with {
  ID            @Core.Computed;
  createdBy     @UI.Hidden;  createdAt     @UI.Hidden;
  modifiedBy    @UI.Hidden;  modifiedAt    @UI.Hidden;
  bridge        @UI.Hidden;   // FK resolved via bridgeRef; navigation used for display text only
  ratingRef     @Core.Computed  @Common.FieldControl: #ReadOnly  @title: 'Rating Ref (auto-generated)';
  bridgeRef @(
    Common.FieldControl    : #Mandatory,
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterInOut',       ValueListProperty: 'bridgeId',   LocalDataProperty: bridgeRef },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' }
      ]
    }
  ) @title: 'Bridge';
  vehicleClass  @Common.FieldControl: #Mandatory  @title: 'Vehicle Class';
  ratingMethod  @title: 'Rating Method';
  ratingFactor  @title: 'Rating Factor'  @Common.QuickInfo: 'Valid range: 0.0 – 2.0';
  grossMassLimit @title: 'Gross Mass Limit (t)'  @Common.QuickInfo: 'Valid range: 0 – 1,000 t';
  assessedBy    @title: 'Assessed By';
  assessmentDate @title: 'Assessment Date';
  validTo       @title: 'Valid To';
  remarks  @UI.MultiLineText  @title: 'Remarks';
  status   @title: 'Status'  @Common.FieldControl: #ReadOnly;
  active   @Common.FieldControl: #ReadOnly  @title: 'Active';
};

annotate AdminService.BridgeLoadRatings with actions {
  deactivate @Common.SideEffects: { TargetProperties: ['active', 'status'] };
  reactivate @Common.SideEffects: { TargetProperties: ['active', 'status'] };
};

////////////////////////////////////////////////////////////////////////////
//  BridgePermits (PRM tile) — permit applications and approvals
////////////////////////////////////////////////////////////////////////////

annotate AdminService.BridgePermits with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.HeaderInfo: {
    TypeName      : 'Permit',
    TypeNamePlural: 'Permits',
    Title         : { Value: permitRef },
    Description   : { Value: permitType }
  },
  UI.SelectionFields: [ bridgeRef, permitRef, permitType, vehicleClass, status, active ],
  UI.LineItem: [
    { Value: bridge.bridgeId,  Label: 'Bridge ID' },
    { Value: bridge.bridgeName, Label: 'Bridge' },
    { Value: permitRef,      Label: 'Permit Ref' },
    { Value: permitType,     Label: 'Type' },
    { Value: applicantName,  Label: 'Applicant' },
    { Value: vehicleClass,   Label: 'Vehicle Class' },
    { Value: grossMass,      Label: 'Gross Mass (t)' },
    { Value: appliedDate,    Label: 'Applied' },
    { Value: validFrom,      Label: 'Valid From' },
    { Value: validTo,        Label: 'Valid To' },
    { Value: status,         Label: 'Status' },
    { Value: active,         Label: 'Active' },
  ],
  UI.Facets: [
    { $Type: 'UI.CollectionFacet', Label: 'Permit Details', ID: 'PermitDetails', Facets: [
      { $Type: 'UI.ReferenceFacet', Label: 'Application',  Target: '@UI.FieldGroup#PrmApplication' },
      { $Type: 'UI.ReferenceFacet', Label: 'Vehicle',      Target: '@UI.FieldGroup#PrmVehicle' },
      { $Type: 'UI.ReferenceFacet', Label: 'Decision',     Target: '@UI.FieldGroup#PrmDecision' },
    ]},
  ],
  UI.FieldGroup#PrmApplication: {
    Label: 'Application',
    Data: [
      { Value: bridgeRef,    Label: 'Bridge' },
      { Value: permitRef,    Label: 'Permit Ref' },
      { Value: permitType,   Label: 'Permit Type' },
      { Value: applicantName,Label: 'Applicant Name' },
      { Value: appliedDate,  Label: 'Applied Date' },
      { Value: validFrom,    Label: 'Valid From' },
      { Value: validTo,      Label: 'Valid To' },
      { Value: status,       Label: 'Status' },
      { Value: active,       Label: 'Active' },
    ]
  },
  UI.FieldGroup#PrmVehicle: {
    Label: 'Vehicle Dimensions',
    Data: [
      { Value: vehicleClass, Label: 'Vehicle Class' },
      { Value: grossMass,    Label: 'Gross Mass (t)' },
      { Value: height,       Label: 'Height (m)' },
      { Value: width,        Label: 'Width (m)' },
      { Value: length,       Label: 'Length (m)' },
    ]
  },
  UI.FieldGroup#PrmDecision: {
    Label: 'Decision',
    Data: [
      { Value: decisionBy,           Label: 'Decision By' },
      { Value: decisionDate,         Label: 'Decision Date' },
      { Value: conditionsOfApproval, Label: 'Conditions of Approval' },
      { Value: remarks,              Label: 'Remarks' },
    ]
  },
  UI.Identification: [
    {
      $Type      : 'UI.DataFieldForAction',
      Action     : 'AdminService.approve',
      Label      : 'Approve',
      Criticality: #Positive,
      ![@UI.Hidden]: { $edmJson: { $Ne: [{ $Path: 'status' }, 'Pending'] } }
    },
    {
      $Type      : 'UI.DataFieldForAction',
      Action     : 'AdminService.rejectPermit',
      Label      : 'Reject',
      Criticality: #Negative,
      ![@UI.Hidden]: { $edmJson: { $Ne: [{ $Path: 'status' }, 'Pending'] } }
    },
    {
      $Type      : 'UI.DataFieldForAction',
      Action     : 'AdminService.deactivate',
      Label      : 'Deactivate',
      Criticality: #Negative,
      ![@UI.Hidden]: { $edmJson: { $Eq: [{ $Path: 'active' }, false] } }
    },
    {
      $Type      : 'UI.DataFieldForAction',
      Action     : 'AdminService.reactivate',
      Label      : 'Reactivate',
      Criticality: #Positive,
      ![@UI.Hidden]: { $edmJson: { $Ne: [{ $Path: 'active' }, false] } }
    }
  ]
);

annotate AdminService.BridgePermits with {
  ID            @Core.Computed;
  createdBy     @UI.Hidden;  createdAt     @UI.Hidden;
  modifiedBy    @UI.Hidden;  modifiedAt    @UI.Hidden;
  bridge        @UI.Hidden;   // FK resolved via bridgeRef; navigation used for display text only
  permitRef     @Core.Computed  @Common.FieldControl: #ReadOnly  @title: 'Permit Ref (auto-generated)';
  bridgeRef @(
    Common.FieldControl    : #Mandatory,
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterInOut',       ValueListProperty: 'bridgeId',   LocalDataProperty: bridgeRef },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' }
      ]
    }
  ) @title: 'Bridge';
  permitType    @Common.FieldControl: #Mandatory  @title: 'Permit Type';
  applicantName @Common.FieldControl: #Mandatory  @title: 'Applicant Name';
  vehicleClass  @title: 'Vehicle Class';
  grossMass     @title: 'Gross Mass (t)'   @Common.QuickInfo: 'Valid range: 0 – 1,000 t';
  height        @title: 'Height (m)'       @Common.QuickInfo: 'Valid range: 0 – 30 m';
  width         @title: 'Width (m)'        @Common.QuickInfo: 'Valid range: 0 – 100 m';
  length        @title: 'Length (m)'       @Common.QuickInfo: 'Valid range: 0 – 1,000 m';
  appliedDate   @title: 'Applied Date';
  validFrom     @title: 'Valid From';
  validTo       @title: 'Valid To';
  decisionBy    @title: 'Decision By'  @Common.FieldControl: #ReadOnly;
  decisionDate  @title: 'Decision Date' @Common.FieldControl: #ReadOnly;
  conditionsOfApproval @UI.MultiLineText  @title: 'Conditions of Approval';
  remarks  @UI.MultiLineText  @title: 'Remarks';
  status   @title: 'Status'  @Common.FieldControl: #ReadOnly;
  active   @Common.FieldControl: #ReadOnly  @title: 'Active';
};

annotate AdminService.BridgePermits with actions {
  deactivate @Common.SideEffects: { TargetProperties: ['active'] };
  reactivate @Common.SideEffects: { TargetProperties: ['active'] };
  approve      @Common.SideEffects: { TargetProperties: ['status', 'decisionBy', 'decisionDate'] };
  rejectPermit @Common.SideEffects: { TargetProperties: ['status', 'decisionBy', 'decisionDate'] };
};
